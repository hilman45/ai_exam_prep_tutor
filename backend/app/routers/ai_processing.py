import uuid
import os
import json
import re
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import JSONResponse
import httpx
from app.deps import get_current_user, User
from app.config import settings

router = APIRouter()

# Chunk size for text processing (characters) - increased for better context
CHUNK_SIZE = 4000

def chunk_text(text: str, max_chars: int = CHUNK_SIZE) -> List[str]:
    """
    Split text into chunks to avoid model token limits with improved boundary detection.
    
    Args:
        text: The text to chunk
        max_chars: Maximum characters per chunk
        
    Returns:
        List of text chunks
    """
    if len(text) <= max_chars:
        return [text]
    
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + max_chars
        
        # If we're not at the end of the text, try to break at a sentence boundary
        if end < len(text):
            # Look for sentence endings within the last 300 characters for better context
            search_start = max(start, end - 300)
            sentence_endings = ['. ', '! ', '? ', '\n\n', '\n', '.', '!', '?']
            
            best_break = end
            for ending in sentence_endings:
                last_ending = text.rfind(ending, search_start, end)
                if last_ending > start:
                    # For punctuation with space, include the space
                    if ending.endswith(' '):
                        best_break = last_ending + len(ending)
                    else:
                        best_break = last_ending + 1
                    break
            
            # If no good break found, try paragraph breaks
            if best_break == end:
                paragraph_breaks = ['\n\n', '\n']
                for break_char in paragraph_breaks:
                    last_break = text.rfind(break_char, search_start, end)
                    if last_break > start:
                        best_break = last_break + len(break_char)
                        break
            
            end = best_break
        
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        
        start = end
    
    return chunks

def get_summary_prompt(text: str, format_type: str) -> str:
    """
    Generate format-specific prompt for summarization.
    
    Args:
        text: The text to summarize
        format_type: "normal" or "bullet_points"
        
    Returns:
        Formatted prompt for the model
    """
    # Always use the same prompt for BART - we'll format the output later
    return f"Summarize the following text:\n\n{text}"

def format_summary_as_bullets(summary_text: str) -> str:
    """
    Convert a summary text into bullet point format.
    
    Args:
        summary_text: The summary text to convert
        
    Returns:
        Bullet point formatted text
    """
    # Split by sentences and create bullet points
    sentences = summary_text.split('. ')
    
    # Clean up and filter empty sentences
    bullet_points = []
    for sentence in sentences:
        sentence = sentence.strip()
        if sentence and len(sentence) > 10:  # Only include substantial sentences
            # Remove trailing period if present
            if sentence.endswith('.'):
                sentence = sentence[:-1]
            bullet_points.append(f"• {sentence}")
    
    return '\n'.join(bullet_points)

async def call_model_for_summarization(chunked_texts: List[str], format_type: str = "normal") -> str:
    """
    Call AI model for summarization with Groq API, local transformers, or Hugging Face API fallback.
    
    Args:
        chunked_texts: List of text chunks to summarize
        format_type: Summary format - "normal" or "bullet_points"
        
    Returns:
        Combined summary text
    """
    try:
        # Try Groq API first (fastest and most reliable)
        if settings.GROQ_API_KEY:
            return await _summarize_with_groq_api(chunked_texts, format_type)
    except Exception as groq_error:
        print(f"Groq API failed: {groq_error}")
    
    try:
        # Fallback to local transformers
        return await _summarize_with_local_model(chunked_texts, format_type)
    except Exception as local_error:
        print(f"Local model failed: {local_error}")
        
        # Fallback to Hugging Face API if available
        if settings.HUGGINGFACE_API_KEY:
            try:
                return await _summarize_with_hf_api(chunked_texts, format_type)
            except Exception as api_error:
                print(f"HF API failed: {api_error}")
                raise Exception(f"All AI services failed. Groq: {groq_error if 'groq_error' in locals() else 'N/A'}, Local: {local_error}, HF API: {api_error}")
        else:
            raise Exception(f"All AI services failed. Groq: {groq_error if 'groq_error' in locals() else 'N/A'}, Local: {local_error}, No HF API key available")

def check_gpu_memory() -> tuple[bool, str]:
    """
    Check GPU memory availability and return status.
    
    Returns:
        tuple: (can_use_gpu, status_message)
    """
    try:
        import torch
        if not torch.cuda.is_available():
            return False, "CUDA not available"
        
        # Get GPU memory info
        total_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
        allocated_memory = torch.cuda.memory_allocated(0) / 1024**3
        cached_memory = torch.cuda.memory_reserved(0) / 1024**3
        free_memory = total_memory - allocated_memory
        
        # Check if we have enough free memory (at least 1GB free)
        if free_memory < 1.0:
            return False, f"Insufficient GPU memory (free: {free_memory:.1f}GB)"
        
        return True, f"GPU available (free: {free_memory:.1f}GB, total: {total_memory:.1f}GB)"
        
    except Exception as e:
        return False, f"GPU check failed: {str(e)}"

async def _summarize_with_local_model(chunked_texts: List[str], format_type: str = "normal") -> str:
    """Summarize using local transformers pipeline with optimized BART-large-CNN."""
    try:
        print("AI: Attempting to import transformers...")
        from transformers import pipeline
        import torch
        print("SUCCESS: Transformers imported successfully!")
        
        # Check GPU availability and memory
        can_use_gpu, gpu_status = check_gpu_memory()
        device = 0 if can_use_gpu else -1
        device_name = "GPU" if device == 0 else "CPU"
        
        if device == 0:
            # GPU memory management
            torch.cuda.empty_cache()  # Clear GPU cache before processing
            print(f"AI: Using {device_name} for processing - {gpu_status}")
        else:
            print(f"AI: Using {device_name} for processing - {gpu_status}")
        
        print("AI: Initializing BART-large-CNN summarization pipeline...")
        # Initialize summarization pipeline with optimized parameters for better paraphrasing
        summarizer = pipeline(
            "summarization",
            model="facebook/bart-large-cnn",
            device=device,  # Use GPU if available, otherwise CPU
            max_length=200,  # Increased for more comprehensive summaries
            min_length=50,   # Increased minimum for better paraphrasing
            do_sample=True,   # Enable sampling for more natural paraphrasing
            temperature=0.7,  # Add some creativity to avoid exact copying
            top_p=0.9,        # Nucleus sampling for better quality
            repetition_penalty=1.1,  # Reduce repetition
            no_repeat_ngram_size=3    # Avoid repeating 3-grams
        )
        print(f"SUCCESS: BART-large-CNN pipeline initialized on {device_name}!")
        
        chunk_summaries = []
        
        for i, chunk in enumerate(chunked_texts):
            try:
                print(f"AI: Summarizing chunk {i+1}/{len(chunked_texts)} (length: {len(chunk)} chars) in {format_type} format")
                # Create format-specific prompt
                prompt = get_summary_prompt(chunk, format_type)
                
                # Summarize each chunk with optimized parameters for better paraphrasing
                result = summarizer(
                    prompt, 
                    max_length=200,  # Increased for more comprehensive summaries
                    min_length=50,   # Increased minimum for better paraphrasing
                    do_sample=True,   # Enable sampling for natural paraphrasing
                    temperature=0.7,  # Add creativity
                    top_p=0.9,        # Nucleus sampling
                    repetition_penalty=1.1,  # Reduce repetition
                    no_repeat_ngram_size=3   # Avoid repeating phrases
                )
                chunk_summary = result[0]['summary_text']
                # Apply formatting if needed
                if format_type == "bullet_points":
                    chunk_summary = format_summary_as_bullets(chunk_summary)
                chunk_summaries.append(chunk_summary)
                print(f"SUCCESS: Chunk {i+1} summarized successfully (length: {len(chunk_summary)} chars)")
            except Exception as e:
                print(f"ERROR: Failed to summarize chunk {i+1}: {e}")
                print(f"ERROR: Chunk content preview: {chunk[:100]}...")
                # If chunk summarization fails, use first 200 chars as fallback
                chunk_summaries.append(chunk[:200] + "...")
        
        # If we have multiple chunks, combine their summaries
        if len(chunk_summaries) > 1:
            print(f"AI: Combining {len(chunk_summaries)} chunk summaries...")
            combined_text = " ".join(chunk_summaries)
            if len(combined_text) > 1000:  # If combined is still long, summarize again
                print(f"AI: Final summarization of combined text in {format_type} format...")
                final_prompt = get_summary_prompt(combined_text, format_type)
                final_result = summarizer(
                    final_prompt, 
                    max_length=250,  # Slightly longer for final summary
                    min_length=60,   # Minimum for comprehensive final summary
                    do_sample=True,   # Enable sampling for natural paraphrasing
                    temperature=0.7,  # Add creativity
                    top_p=0.9,        # Nucleus sampling
                    repetition_penalty=1.1,  # Reduce repetition
                    no_repeat_ngram_size=3   # Avoid repeating phrases
                )
                final_summary = final_result[0]['summary_text']
                # Apply formatting if needed
                if format_type == "bullet_points":
                    final_summary = format_summary_as_bullets(final_summary)
                print(f"SUCCESS: Final AI summary generated (length: {len(final_summary)} chars)")
                return final_summary
            else:
                # Apply formatting to combined text if needed
                if format_type == "bullet_points":
                    combined_text = format_summary_as_bullets(combined_text)
                print(f"SUCCESS: Combined summary generated (length: {len(combined_text)} chars)")
                return combined_text
        else:
            final_summary = chunk_summaries[0] if chunk_summaries else "Unable to generate summary."
            # Apply formatting to single chunk if needed
            if format_type == "bullet_points":
                final_summary = format_summary_as_bullets(final_summary)
            print(f"SUCCESS: Single chunk summary generated (length: {len(final_summary)} chars)")
            return final_summary
            
    except ImportError as e:
        # Fallback to simple text extraction if transformers not available
        print(f"ERROR: Transformers import failed: {e}")
        print("FALLBACK: Using simple text extraction fallback")
        return await _simple_text_summary(chunked_texts)
    except Exception as e:
        print(f"ERROR: Local model error: {e}")
        print(f"ERROR: Error type: {type(e).__name__}")
        print("FALLBACK: Using simple text extraction fallback")
        return await _simple_text_summary(chunked_texts)

async def _simple_text_summary(chunked_texts: List[str]) -> str:
    """Simple text summarization fallback when AI models are not available."""
    try:
        print("WARNING: Using basic text extraction (AI model unavailable)")
        # Combine all chunks
        full_text = " ".join(chunked_texts)
        
        # Extract first few sentences as a basic summary
        sentences = full_text.split('. ')
        
        # Take first 3-5 sentences as summary
        summary_sentences = sentences[:min(5, len(sentences))]
        
        # Join and clean up
        summary = '. '.join(summary_sentences)
        if not summary.endswith('.'):
            summary += '.'
            
        # Add a note that this is a basic summary
        summary = f"[Basic Summary - AI unavailable] {summary}"
        print(f"WARNING: Basic summary generated (length: {len(summary)} chars)")
        
        return summary
        
    except Exception as e:
        print(f"ERROR: Even basic summary failed: {e}")
        # Ultimate fallback - just return first 300 characters
        full_text = " ".join(chunked_texts)
        fallback = f"[Text Preview - AI unavailable] {full_text[:300]}{'...' if len(full_text) > 300 else ''}"
        print(f"WARNING: Using text preview fallback (length: {len(fallback)} chars)")
        return fallback

async def _summarize_with_groq_api(chunked_texts: List[str], format_type: str = "normal") -> str:
    """Summarize using Groq API with LLaMA 3.3 70B model."""
    try:
        async with httpx.AsyncClient() as client:
            chunk_summaries = []
            
            for i, chunk in enumerate(chunked_texts):
                # Create format-specific prompt
                if format_type == "bullet_points":
                    prompt = f"Summarize the following text into clear bullet points:\n\n{chunk}"
                else:
                    prompt = f"Summarize the following text in a clear, concise paragraph:\n\n{chunk}"
                
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": settings.GROQ_MODEL,
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are an expert at creating clear, educational summaries. Focus on key concepts and main ideas."
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        "max_tokens": 300,
                        "temperature": 0.7,
                        "top_p": 0.9
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if "choices" in result and len(result["choices"]) > 0:
                        chunk_summary = result["choices"][0]["message"]["content"].strip()
                        chunk_summaries.append(chunk_summary)
                        print(f"SUCCESS: Groq summarized chunk {i+1}/{len(chunked_texts)}")
                    else:
                        print(f"ERROR: Groq API returned unexpected format for chunk {i+1}")
                        chunk_summaries.append(chunk[:200] + "...")
                else:
                    print(f"ERROR: Groq API error for chunk {i+1}: {response.status_code}")
                    chunk_summaries.append(chunk[:200] + "...")
            
            # Combine chunk summaries
            if len(chunk_summaries) > 1:
                combined_text = " ".join(chunk_summaries)
                if len(combined_text) > 1000:
                    # Summarize the combined text
                    if format_type == "bullet_points":
                        final_prompt = f"Summarize the following combined summaries into clear bullet points:\n\n{combined_text}"
                    else:
                        final_prompt = f"Create a final, concise summary from these summaries:\n\n{combined_text}"
                    
                    response = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": settings.GROQ_MODEL,
                            "messages": [
                                {
                                    "role": "system",
                                    "content": "You are an expert at creating clear, educational summaries. Focus on key concepts and main ideas."
                                },
                                {
                                    "role": "user",
                                    "content": final_prompt
                                }
                            ],
                            "max_tokens": 400,
                            "temperature": 0.7,
                            "top_p": 0.9
                        },
                        timeout=30.0
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        if "choices" in result and len(result["choices"]) > 0:
                            final_summary = result["choices"][0]["message"]["content"].strip()
                            print(f"SUCCESS: Groq final summary generated")
                            return final_summary
                
                print(f"SUCCESS: Groq combined summary generated")
                return combined_text
            else:
                final_summary = chunk_summaries[0] if chunk_summaries else "Unable to generate summary."
                print(f"SUCCESS: Groq single chunk summary generated")
                return final_summary
                
    except Exception as e:
        raise Exception(f"Groq API error: {str(e)}")

async def _summarize_with_hf_api(chunked_texts: List[str], format_type: str = "normal") -> str:
    """Summarize using Hugging Face Inference API."""
    try:
        async with httpx.AsyncClient() as client:
            chunk_summaries = []
            
            for chunk in chunked_texts:
                prompt = get_summary_prompt(chunk, format_type)
                response = await client.post(
                    "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
                    headers={
                        "Authorization": f"Bearer {settings.HUGGINGFACE_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "inputs": prompt,
                        "parameters": {
                            "max_length": 200,
                            "min_length": 50,
                            "do_sample": True,
                            "temperature": 0.7,
                            "top_p": 0.9,
                            "repetition_penalty": 1.1,
                            "no_repeat_ngram_size": 3
                        }
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if isinstance(result, list) and len(result) > 0:
                        chunk_summary = result[0]['summary_text']
                        # Apply formatting if needed
                        if format_type == "bullet_points":
                            chunk_summary = format_summary_as_bullets(chunk_summary)
                        chunk_summaries.append(chunk_summary)
                    else:
                        chunk_summaries.append(chunk[:200] + "...")
                else:
                    print(f"HF API error for chunk: {response.status_code}")
                    chunk_summaries.append(chunk[:200] + "...")
            
            # Combine chunk summaries
            if len(chunk_summaries) > 1:
                combined_text = " ".join(chunk_summaries)
                if len(combined_text) > 1000:
                    # Summarize the combined text
                    final_prompt = get_summary_prompt(combined_text, format_type)
                    response = await client.post(
                        "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
                        headers={
                            "Authorization": f"Bearer {settings.HUGGINGFACE_API_KEY}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "inputs": final_prompt,
                            "parameters": {
                                "max_length": 250,
                                "min_length": 60,
                                "do_sample": True,
                                "temperature": 0.7,
                                "top_p": 0.9,
                                "repetition_penalty": 1.1,
                                "no_repeat_ngram_size": 3
                            }
                        },
                        timeout=30.0
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        if isinstance(result, list) and len(result) > 0:
                            final_summary = result[0]['summary_text']
                            # Apply formatting if needed
                            if format_type == "bullet_points":
                                final_summary = format_summary_as_bullets(final_summary)
                            return final_summary
                
                # Apply formatting to combined text if needed
                if format_type == "bullet_points":
                    combined_text = format_summary_as_bullets(combined_text)
                return combined_text
            else:
                final_summary = chunk_summaries[0] if chunk_summaries else "Unable to generate summary."
                # Apply formatting if needed
                if format_type == "bullet_points":
                    final_summary = format_summary_as_bullets(final_summary)
                return final_summary
                
    except Exception as e:
        raise Exception(f"HF API error: {str(e)}")

async def get_file_content(file_id: str, user_token: str) -> Optional[Dict[str, Any]]:
    """Fetch file content from Supabase with ownership check using user token."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.SUPABASE_URL}/rest/v1/files",
                headers={
                    "Authorization": f"Bearer {user_token}",
                    "apikey": settings.SUPABASE_ANON_KEY or settings.SUPABASE_SERVICE_KEY,
                    "Content-Type": "application/json"
                },
                params={
                    "id": f"eq.{file_id}",
                    "select": "id,filename,text_content"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    return data[0]
            return None
            
    except Exception as e:
        print(f"Error fetching file: {e}")
        return None

async def get_existing_summary(file_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    """Check if summary already exists for this file."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.SUPABASE_URL}/rest/v1/summaries",
                headers={
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                    "apikey": settings.SUPABASE_SERVICE_KEY,
                    "Content-Type": "application/json"
                },
                params={
                    "file_id": f"eq.{file_id}",
                    "user_id": f"eq.{user_id}",
                    "select": "id,summary_text,created_at",
                    "order": "created_at.desc",
                    "limit": "1"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    return data[0]
            return None
            
    except Exception as e:
        print(f"Error fetching existing summary: {e}")
        return None

async def save_summary(file_id: str, user_id: str, summary_text: str) -> str:
    """Save summary to Supabase and return summary_id."""
    try:
        summary_id = str(uuid.uuid4())
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.SUPABASE_URL}/rest/v1/summaries",
                headers={
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                    "apikey": settings.SUPABASE_SERVICE_KEY,
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal"
                },
                json={
                    "id": summary_id,
                    "file_id": file_id,
                    "user_id": user_id,
                    "summary_text": summary_text
                }
            )
            
            if response.status_code not in [200, 201]:
                raise Exception(f"Failed to save summary: {response.status_code} - {response.text}")
            
            return summary_id
            
    except Exception as e:
        raise Exception(f"Database error saving summary: {e}")

async def delete_summary(summary_id: str, user_id: str) -> bool:
    """Delete a summary from Supabase."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{settings.SUPABASE_URL}/rest/v1/summaries",
                headers={
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                    "apikey": settings.SUPABASE_SERVICE_KEY,
                    "Content-Type": "application/json"
                },
                params={
                    "id": f"eq.{summary_id}",
                    "user_id": f"eq.{user_id}"
                }
            )
            
            return response.status_code in [200, 204]
            
    except Exception as e:
        print(f"Error deleting summary: {e}")
        return False

# Quiz Generation Functions

def get_quiz_prompt(text: str) -> str:
    """
    Generate prompt for quiz generation (fallback method).
    
    Args:
        text: The text to generate questions from
        
    Returns:
        Formatted prompt for the model
    """
    return f"""Create 4 multiple choice questions from this text. Each question must have exactly 4 options and one correct answer.

Text: {text}

Format your response as JSON array like this:
[{{"question": "What is the main topic?", "options": ["Option A", "Option B", "Option C", "Option D"], "answer_index": 1}}]

IMPORTANT: Return ONLY the JSON array, no other text."""

def validate_quiz_json(quiz_json: str) -> Optional[List[Dict[str, Any]]]:
    """
    Validate and clean quiz JSON response from AI model.
    
    Args:
        quiz_json: Raw JSON string from model
        
    Returns:
        Validated quiz data or None if invalid
    """
    try:
        # Try to parse as JSON first
        quiz_data = json.loads(quiz_json)
        
        if not isinstance(quiz_data, list):
            return None
            
        validated_questions = []
        for question in quiz_data:
            if not isinstance(question, dict):
                continue
                
            # Check required fields
            if not all(key in question for key in ["question", "options", "answer_index"]):
                continue
                
            # Validate question text
            if not isinstance(question["question"], str) or len(question["question"].strip()) < 10:
                continue
                
            # Validate options
            if not isinstance(question["options"], list) or len(question["options"]) < 3:
                continue
                
            # Validate answer_index
            try:
                answer_index = int(question["answer_index"])
                if answer_index < 0 or answer_index >= len(question["options"]):
                    continue
            except (ValueError, TypeError):
                continue
                
            validated_questions.append({
                "question": question["question"].strip(),
                "options": [str(opt).strip() for opt in question["options"]],
                "answer_index": answer_index
            })
            
        return validated_questions if len(validated_questions) >= 3 else None
        
    except json.JSONDecodeError:
        # Try to extract JSON from text using regex
        json_match = re.search(r'\[.*\]', quiz_json, re.DOTALL)
        if json_match:
            try:
                return validate_quiz_json(json_match.group())
            except:
                pass
        return None

def clean_quiz_json(raw_text: str) -> str:
    """
    Clean raw text to extract valid JSON for quiz generation.
    
    Args:
        raw_text: Raw text from AI model
        
    Returns:
        Cleaned JSON string
    """
    # Remove markdown formatting
    cleaned = re.sub(r'```json\s*', '', raw_text)
    cleaned = re.sub(r'```\s*', '', cleaned)
    
    # Handle model-specific output format issues
    # Some models return arrays like ['FMA:B', 'A', 'B', 'C', 'D']
    if cleaned.startswith("[['") and cleaned.endswith("']]"):
        print("🔄 Detected invalid array format, converting to JSON...")
        # This is not a valid quiz format, return empty to trigger fallback
        return "[]"
    
    # Find JSON array pattern
    json_match = re.search(r'\[.*\]', cleaned, re.DOTALL)
    if json_match:
        return json_match.group()
    
    return cleaned

async def call_model_for_quiz_generation(text: str) -> List[Dict[str, Any]]:
    """
    Call AI model for quiz generation with Groq API, local transformers, or Hugging Face API fallback.
    
    Args:
        text: The text to generate questions from
        
    Returns:
        List of validated quiz questions
    """
    try:
        # Try Groq API first (fastest and most reliable)
        if settings.GROQ_API_KEY:
            return await _generate_quiz_with_groq_api(text)
    except Exception as groq_error:
        print(f"Groq API failed: {groq_error}")
    
    try:
        # Fallback to local transformers
        return await _generate_quiz_with_local_model(text)
    except Exception as local_error:
        print(f"Local model failed: {local_error}")
        
        # Fallback to Hugging Face API if available
        if settings.HUGGINGFACE_API_KEY:
            try:
                return await _generate_quiz_with_hf_api(text)
            except Exception as api_error:
                print(f"HF API failed: {api_error}")
                raise Exception(f"All AI services failed. Groq: {groq_error if 'groq_error' in locals() else 'N/A'}, Local: {local_error}, HF API: {api_error}")
        else:
            raise Exception(f"All AI services failed. Groq: {groq_error if 'groq_error' in locals() else 'N/A'}, Local: {local_error}, No HF API key available")

async def _generate_quiz_with_groq_api(text: str) -> List[Dict[str, Any]]:
    """Generate quiz using Groq API with LLaMA 3.3 70B model."""
    try:
        async with httpx.AsyncClient() as client:
            prompt = get_quiz_prompt(text)
            
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": settings.GROQ_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are an expert educator who creates high-quality multiple choice questions. Always return valid JSON arrays with exactly 4 options per question."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "max_tokens": 1500,
                    "temperature": 0.7,
                    "top_p": 0.9
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                if "choices" in result and len(result["choices"]) > 0:
                    raw_response = result["choices"][0]["message"]["content"].strip()
                    cleaned_json = clean_quiz_json(raw_response)
                    validated_quiz = validate_quiz_json(cleaned_json)
                    
                    if validated_quiz:
                        print(f"SUCCESS: Groq generated {len(validated_quiz)} quiz questions")
                        return validated_quiz
                    else:
                        print("WARNING: Groq API returned invalid quiz format, using fallback")
                        return await _generate_fallback_quiz(text)
                else:
                    print("ERROR: Groq API returned unexpected format")
                    return await _generate_fallback_quiz(text)
            else:
                print(f"ERROR: Groq API error: {response.status_code}")
                return await _generate_fallback_quiz(text)
                
    except Exception as e:
        raise Exception(f"Groq API error: {str(e)}")

async def _generate_quiz_with_local_model(text: str) -> List[Dict[str, Any]]:
    """Generate quiz using fallback method (no AI models configured)."""
    try:
        print("INFO: No AI models configured, using fallback quiz generation")
        return await _generate_fallback_quiz(text)
        
    except ImportError as e:
        print(f"ERROR: Transformers import failed: {e}")
        print("FALLBACK: Using fallback quiz generation")
        return await _generate_fallback_quiz(text)
    except Exception as e:
        print(f"ERROR: Local model error: {e}")
        print("FALLBACK: Using fallback quiz generation")
        return await _generate_fallback_quiz(text)

async def _generate_quiz_with_hf_api(text: str) -> List[Dict[str, Any]]:
    """Generate quiz using Hugging Face Inference API."""
    try:
        async with httpx.AsyncClient() as client:
            prompt = get_quiz_prompt(text)
            
            # Try twice with different parameters
            for attempt in range(2):
                try:
                    response = await client.post(
                        "https://api-inference.huggingface.co/models/gpt2",
                        headers={
                            "Authorization": f"Bearer {settings.HUGGINGFACE_API_KEY}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "inputs": prompt,
                            "parameters": {
                                "max_length": 1000,
                                "do_sample": True,
                                "temperature": 0.7,
                                "top_p": 0.9,
                                "num_return_sequences": 1
                            }
                        },
                        timeout=30.0
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        if isinstance(result, list) and len(result) > 0:
                            raw_response = result[0]['generated_text']
                            cleaned_json = clean_quiz_json(raw_response)
                            validated_quiz = validate_quiz_json(cleaned_json)
                            
                            if validated_quiz:
                                return validated_quiz
                    
                    print(f"ERROR: HF API attempt {attempt + 1} failed")
                    
                except Exception as e:
                    print(f"ERROR: HF API attempt {attempt + 1} error: {e}")
            
            # If API fails, use fallback
            return await _generate_fallback_quiz(text)
                
    except Exception as e:
        raise Exception(f"HF API error: {str(e)}")

async def _generate_fallback_quiz(text: str) -> List[Dict[str, Any]]:
    """Generate intelligent fallback quiz when AI models fail."""
    try:
        print("WARNING: Using intelligent fallback quiz generation")
        
        # Extract key concepts and sentences
        sentences = [s.strip() for s in text.split('.') if len(s.strip()) > 20]
        
        if len(sentences) < 3:
            sentences = [s.strip() for s in text.split('\n') if len(s.strip()) > 20]
        
        questions = []
        
        # Generate questions based on content analysis
        for i, sentence in enumerate(sentences[:4]):
            if len(sentence) > 30:
                words = sentence.split()
                if len(words) > 4:
                    # Extract key terms
                    key_terms = [w.lower() for w in words if len(w) > 4 and w.isalpha()]
                    
                    if key_terms:
                        main_term = key_terms[0]
                        
                        # Create more intelligent questions
                        question_text = f"What does the text say about {main_term}?"
                        
                        # Create better options based on sentence content
                        options = [
                            sentence[:60] + "..." if len(sentence) > 60 else sentence,
                            f"It is related to {main_term}",
                            f"It is not about {main_term}",
                            "The text doesn't mention this"
                        ]
                        
                        questions.append({
                            "question": question_text,
                            "options": options,
                            "answer_index": 0
                        })
        
        # Add content-based questions if we need more
        if len(questions) < 3:
            # Analyze text for key concepts
            all_words = text.lower().split()
            word_freq = {}
            for word in all_words:
                if len(word) > 4 and word.isalpha():
                    word_freq[word] = word_freq.get(word, 0) + 1
            
            # Get most frequent words
            frequent_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:3]
            
            for word, freq in frequent_words:
                if len(questions) >= 4:
                    break
                    
                questions.append({
                    "question": f"What is the main focus regarding {word}?",
                    "options": [
                        f"The text discusses {word} in detail",
                        f"{word} is mentioned briefly",
                        f"{word} is not important",
                        f"The text doesn't cover {word}"
                    ],
                    "answer_index": 0
                })
        
        # Ensure we have at least 3 questions
        while len(questions) < 3:
            questions.append({
                "question": f"What is the main topic discussed in this text?",
                "options": [
                    "The main topic is clearly explained",
                    "Multiple topics are covered",
                    "The topic is unclear",
                    "No specific topic is discussed"
                ],
                "answer_index": 0
            })
        
        print(f"WARNING: Intelligent fallback quiz generated with {len(questions)} questions")
        return questions[:5]  # Return max 5 questions
        
    except Exception as e:
        print(f"ERROR: Even fallback quiz failed: {e}")
        # Ultimate fallback
        return [
            {
                "question": "What is the main topic of this text?",
                "options": ["Main topic", "Secondary topic", "Minor topic", "Unknown"],
                "answer_index": 0
            },
            {
                "question": "How would you describe the content?",
                "options": ["Informative", "Confusing", "Brief", "Detailed"],
                "answer_index": 0
            },
            {
                "question": "What is the purpose of this text?",
                "options": ["To inform", "To entertain", "To persuade", "Unknown"],
                "answer_index": 0
            }
        ]

async def get_existing_quiz(file_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    """Check if quiz already exists for this file."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.SUPABASE_URL}/rest/v1/quizzes",
                headers={
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                    "apikey": settings.SUPABASE_SERVICE_KEY,
                    "Content-Type": "application/json"
                },
                params={
                    "file_id": f"eq.{file_id}",
                    "user_id": f"eq.{user_id}",
                    "select": "id,questions,created_at",
                    "order": "created_at.desc",
                    "limit": "1"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    return data[0]
            return None
            
    except Exception as e:
        print(f"Error fetching existing quiz: {e}")
        return None

async def save_quiz(file_id: str, user_id: str, questions: List[Dict[str, Any]]) -> str:
    """Save quiz to Supabase and return quiz_id."""
    try:
        quiz_id = str(uuid.uuid4())
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.SUPABASE_URL}/rest/v1/quizzes",
                headers={
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                    "apikey": settings.SUPABASE_SERVICE_KEY,
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal"
                },
                json={
                    "id": quiz_id,
                    "file_id": file_id,
                    "user_id": user_id,
                    "questions": questions
                }
            )
            
            if response.status_code not in [200, 201]:
                raise Exception(f"Failed to save quiz: {response.status_code} - {response.text}")
            
            return quiz_id
            
    except Exception as e:
        raise Exception(f"Database error saving quiz: {e}")

async def delete_quiz(quiz_id: str, user_id: str) -> bool:
    """Delete a quiz from Supabase."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{settings.SUPABASE_URL}/rest/v1/quizzes",
                headers={
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                    "apikey": settings.SUPABASE_SERVICE_KEY,
                    "Content-Type": "application/json"
                },
                params={
                    "id": f"eq.{quiz_id}",
                    "user_id": f"eq.{user_id}"
                }
            )
            
            return response.status_code in [200, 204]
            
    except Exception as e:
        print(f"Error deleting quiz: {e}")
        return False

# Flashcard Generation Functions

def get_flashcard_prompt(text: str, count: int = 10) -> str:
    """
    Generate prompt for flashcard generation.
    
    Args:
        text: The text to generate flashcards from
        count: Number of flashcards to generate
        
    Returns:
        Formatted prompt for the model
    """
    return f"""Create {count} flashcards from the following text. Each flashcard should have a front (term or question) and back (definition or answer).

Text: {text}

Return ONLY a valid JSON array in this exact format:
[
  {{"front": "Term or question", "back": "Definition or answer"}},
  {{"front": "Term or question", "back": "Definition or answer"}}
]

IMPORTANT: 
- Return ONLY the JSON array, no other text
- Each flashcard must have "front" and "back" fields
- Make flashcards clear, concise, and educational
- Cover key concepts from the text"""

def validate_flashcard_json(flashcard_json: str) -> Optional[List[Dict[str, Any]]]:
    """
    Validate and clean flashcard JSON response from AI model.
    
    Args:
        flashcard_json: Raw JSON string from model
        
    Returns:
        Validated flashcard data or None if invalid
    """
    try:
        # Try to parse as JSON first
        flashcard_data = json.loads(flashcard_json)
        
        if not isinstance(flashcard_data, list):
            return None
            
        validated_cards = []
        for card in flashcard_data:
            if not isinstance(card, dict):
                continue
                
            # Check required fields
            if not all(key in card for key in ["front", "back"]):
                continue
                
            # Validate front text
            if not isinstance(card["front"], str) or len(card["front"].strip()) < 3:
                continue
                
            # Validate back text
            if not isinstance(card["back"], str) or len(card["back"].strip()) < 3:
                continue
                
            validated_cards.append({
                "front": card["front"].strip(),
                "back": card["back"].strip()
            })
            
        return validated_cards if len(validated_cards) >= 3 else None
        
    except json.JSONDecodeError:
        # Try to extract JSON from text using regex
        json_match = re.search(r'\[.*\]', flashcard_json, re.DOTALL)
        if json_match:
            try:
                return validate_flashcard_json(json_match.group())
            except:
                pass
        return None

def clean_flashcard_json(raw_text: str) -> str:
    """
    Clean raw text to extract valid JSON for flashcard generation.
    
    Args:
        raw_text: Raw text from AI model
        
    Returns:
        Cleaned JSON string
    """
    # Remove markdown formatting
    cleaned = re.sub(r'```json\s*', '', raw_text)
    cleaned = re.sub(r'```\s*', '', cleaned)
    
    # Find JSON array pattern
    json_match = re.search(r'\[.*\]', cleaned, re.DOTALL)
    if json_match:
        return json_match.group()
    
    return cleaned

async def call_model_for_flashcard_generation(text: str, count: int = 10) -> List[Dict[str, Any]]:
    """
    Generate flashcards using Groq API, local transformers, or intelligent fallback system.
    
    Args:
        text: The text to generate flashcards from
        count: Number of flashcards to generate
        
    Returns:
        List of validated flashcard objects
    """
    try:
        # Try Groq API first (fastest and most reliable)
        if settings.GROQ_API_KEY:
            return await _generate_flashcards_with_groq_api(text, count)
    except Exception as groq_error:
        print(f"Groq API failed: {groq_error}")
    
    try:
        # Fallback to local transformers
        return await _generate_flashcards_with_local_model(text, count)
    except Exception as local_error:
        print(f"Local model failed: {local_error}")
        
        # Fallback to Hugging Face API if available
        if settings.HUGGINGFACE_API_KEY:
            try:
                return await _generate_flashcards_with_hf_api(text, count)
            except Exception as api_error:
                print(f"HF API failed: {api_error}")
                raise Exception(f"All AI services failed. Groq: {groq_error if 'groq_error' in locals() else 'N/A'}, Local: {local_error}, HF API: {api_error}")
        else:
            raise Exception(f"All AI services failed. Groq: {groq_error if 'groq_error' in locals() else 'N/A'}, Local: {local_error}, No HF API key available")

async def _generate_flashcards_with_groq_api(text: str, count: int = 10) -> List[Dict[str, Any]]:
    """Generate flashcards using Groq API with LLaMA 3.3 70B model."""
    try:
        async with httpx.AsyncClient() as client:
            prompt = get_flashcard_prompt(text, count)
            
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": settings.GROQ_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are an expert educator who creates high-quality flashcards. Always return valid JSON arrays with 'front' and 'back' fields for each flashcard."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "max_tokens": 2000,
                    "temperature": 0.7,
                    "top_p": 0.9
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                if "choices" in result and len(result["choices"]) > 0:
                    raw_response = result["choices"][0]["message"]["content"].strip()
                    cleaned_json = clean_flashcard_json(raw_response)
                    validated_flashcards = validate_flashcard_json(cleaned_json)
                    
                    if validated_flashcards:
                        print(f"SUCCESS: Groq generated {len(validated_flashcards)} flashcards")
                        return validated_flashcards
                    else:
                        print("WARNING: Groq API returned invalid flashcard format, using fallback")
                        return await _generate_fallback_flashcards(text, count)
                else:
                    print("ERROR: Groq API returned unexpected format")
                    return await _generate_fallback_flashcards(text, count)
            else:
                print(f"ERROR: Groq API error: {response.status_code}")
                return await _generate_fallback_flashcards(text, count)
                
    except Exception as e:
        raise Exception(f"Groq API error: {str(e)}")

async def _generate_flashcards_with_local_model(text: str, count: int = 10) -> List[Dict[str, Any]]:
    """Generate flashcards using intelligent fallback system (no AI model)."""
    try:
        print("INFO: Using intelligent fallback flashcard generation (no AI model)")
        return await _generate_fallback_flashcards(text, count)
            
    except Exception as e:
        print(f"ERROR: Fallback generation failed: {e}")
        print(f"ERROR: Error type: {type(e).__name__}")
        # Ultimate fallback
        return [
            {
                "front": "What is the main topic?",
                "back": text[:200] + "..." if len(text) > 200 else text
            },
            {
                "front": "Key concept from the text",
                "back": text[200:400] + "..." if len(text) > 400 else text[200:] if len(text) > 200 else "Continuation of main topic"
            },
            {
                "front": "Summary point",
                "back": "Review the key concepts from the provided text"
            }
        ][:count]

async def _generate_flashcards_with_hf_api(text: str, count: int = 10) -> List[Dict[str, Any]]:
    """Generate flashcards using Hugging Face Inference API (fallback to intelligent system)."""
    try:
        print("INFO: HF API not configured, using intelligent fallback")
        return await _generate_fallback_flashcards(text, count)
                
    except Exception as e:
        print(f"ERROR: Fallback generation failed: {e}")
        raise Exception(f"Fallback generation error: {str(e)}")

async def _generate_fallback_flashcards(text: str, count: int = 10) -> List[Dict[str, Any]]:
    """Generate intelligent fallback flashcards when AI models fail."""
    try:
        print(f"WARNING: Using intelligent fallback flashcard generation for {count} cards")
        
        # Extract sentences and key concepts
        sentences = [s.strip() for s in text.split('.') if len(s.strip()) > 20]
        
        if len(sentences) < 3:
            sentences = [s.strip() for s in text.split('\n') if len(s.strip()) > 20]
        
        flashcards = []
        
        # Strategy 1: Extract key terms and definitions from sentences
        for sentence in sentences[:count]:
            words = sentence.split()
            if len(words) > 5:
                # Look for definition patterns
                if ' is ' in sentence.lower() or ' are ' in sentence.lower() or ' means ' in sentence.lower():
                    parts = re.split(r'\s+is\s+|\s+are\s+|\s+means\s+', sentence, maxsplit=1, flags=re.IGNORECASE)
                    if len(parts) == 2:
                        flashcards.append({
                            "front": parts[0].strip(),
                            "back": parts[1].strip()
                        })
                        continue
                
                # Extract key terms (capitalized words or longer words)
                key_terms = [w for w in words if (w[0].isupper() and len(w) > 3) or len(w) > 7]
                if key_terms:
                    term = key_terms[0]
                    context = sentence.replace(term, '___', 1)
                    flashcards.append({
                        "front": f"What term fits: {context[:80]}..." if len(context) > 80 else f"What term fits: {context}",
                        "back": term
                    })
                else:
                    # Create question from sentence
                    flashcards.append({
                        "front": f"What concept is described: {sentence[:50]}...?" if len(sentence) > 50 else f"What does the text say?",
                        "back": sentence[:100] + "..." if len(sentence) > 100 else sentence
                    })
        
        # Strategy 2: Create concept-based flashcards if we need more
        if len(flashcards) < min(5, count):
            # Extract most frequent important words
            all_words = text.lower().split()
            word_freq = {}
            for word in all_words:
                if len(word) > 5 and word.isalpha():
                    word_freq[word] = word_freq.get(word, 0) + 1
            
            frequent_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:count-len(flashcards)]
            
            for word, freq in frequent_words:
                # Find sentence containing this word
                for sentence in sentences:
                    if word in sentence.lower():
                        flashcards.append({
                            "front": f"Define or explain: {word.capitalize()}",
                            "back": sentence[:120] + "..." if len(sentence) > 120 else sentence
                        })
                        break
        
        # Ensure we have at least 5 flashcards
        while len(flashcards) < min(5, count):
            idx = len(flashcards)
            if idx < len(sentences):
                sentence = sentences[idx]
                flashcards.append({
                    "front": f"Key concept #{idx + 1}",
                    "back": sentence[:150] + "..." if len(sentence) > 150 else sentence
                })
            else:
                flashcards.append({
                    "front": "Main topic of the text",
                    "back": text[:200] + "..." if len(text) > 200 else text
                })
                break
        
        # Limit to requested count
        flashcards = flashcards[:count]
        
        print(f"WARNING: Intelligent fallback generated {len(flashcards)} flashcards")
        return flashcards
        
    except Exception as e:
        print(f"ERROR: Even fallback flashcard generation failed: {e}")
        # Ultimate fallback - basic flashcards
        return [
            {
                "front": "What is the main topic?",
                "back": text[:200] + "..." if len(text) > 200 else text
            },
            {
                "front": "Key concept from the text",
                "back": text[200:400] + "..." if len(text) > 400 else text[200:] if len(text) > 200 else "Continuation of main topic"
            },
            {
                "front": "Summary point",
                "back": "Review the key concepts from the provided text"
            },
            {
                "front": "Important detail",
                "back": "Study the main ideas and supporting details"
            },
            {
                "front": "Review question",
                "back": "What are the most important takeaways?"
            }
        ][:count]

async def get_existing_flashcards(file_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    """Check if flashcards already exist for this file."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.SUPABASE_URL}/rest/v1/flashcards",
                headers={
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                    "apikey": settings.SUPABASE_SERVICE_KEY,
                    "Content-Type": "application/json"
                },
                params={
                    "file_id": f"eq.{file_id}",
                    "user_id": f"eq.{user_id}",
                    "select": "id,cards,created_at",
                    "order": "created_at.desc",
                    "limit": "1"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    return data[0]
            return None
            
    except Exception as e:
        print(f"Error fetching existing flashcards: {e}")
        return None

async def save_flashcards(file_id: str, user_id: str, cards: List[Dict[str, Any]]) -> str:
    """Save flashcards to Supabase and return flashcard_id."""
    try:
        flashcard_id = str(uuid.uuid4())
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.SUPABASE_URL}/rest/v1/flashcards",
                headers={
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                    "apikey": settings.SUPABASE_SERVICE_KEY,
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal"
                },
                json={
                    "id": flashcard_id,
                    "file_id": file_id,
                    "user_id": user_id,
                    "cards": cards
                }
            )
            
            if response.status_code not in [200, 201]:
                raise Exception(f"Failed to save flashcards: {response.status_code} - {response.text}")
            
            return flashcard_id
            
    except Exception as e:
        raise Exception(f"Database error saving flashcards: {e}")

async def delete_flashcards(flashcard_id: str, user_id: str) -> bool:
    """Delete flashcards from Supabase."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{settings.SUPABASE_URL}/rest/v1/flashcards",
                headers={
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                    "apikey": settings.SUPABASE_SERVICE_KEY,
                    "Content-Type": "application/json"
                },
                params={
                    "id": f"eq.{flashcard_id}",
                    "user_id": f"eq.{user_id}"
                }
            )
            
            return response.status_code in [200, 204]
            
    except Exception as e:
        print(f"Error deleting flashcards: {e}")
        return False

@router.post("/quiz/{file_id}")
async def generate_quiz(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Generate quiz questions for the specified file.
    
    Args:
        file_id: The ID of the file to generate quiz from
        current_user: Authenticated user
    
    - Checks if quiz already exists and returns cached version
    - Fetches file content with ownership verification
    - Uses intelligent fallback to generate 3-5 multiple choice questions
    - Validates JSON response and attempts cleanup if needed
    - Saves quiz to database for future retrieval
    - Returns quiz questions in JSON format
    """
    
    # Check if quiz already exists
    existing_quiz = await get_existing_quiz(file_id, current_user.id)
    if existing_quiz:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "quiz_id": existing_quiz["id"],
                "questions": existing_quiz["questions"],
                "cached": True,
                "created_at": existing_quiz["created_at"]
            }
        )
    
    # Fetch file content
    file_data = await get_file_content(file_id, current_user.token)
    if not file_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found or access denied"
        )
    
    text_content = file_data.get("text_content", "").strip()
    if not text_content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="File has no extractable text"
        )
    
    try:
        # If text is very long, use summary for better quiz generation
        if len(text_content) > 2000:
            print("INFO: Text is long, checking for existing summary...")
            existing_summary = await get_existing_summary(file_id, current_user.id)
            if existing_summary:
                print("INFO: Using existing summary for quiz generation")
                text_content = existing_summary["summary_text"]
            else:
                print("INFO: Generating summary first for long text...")
                chunks = chunk_text(text_content)
                summary_text = await call_model_for_summarization(chunks, "normal")
                await save_summary(file_id, current_user.id, summary_text)
                text_content = summary_text
        
        # Generate quiz using AI model
        questions = await call_model_for_quiz_generation(text_content)
        
        # Validate that we have enough questions
        if len(questions) < 3:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI model failed to generate sufficient quiz questions"
            )
        
        # Save quiz to database
        quiz_id = await save_quiz(file_id, current_user.id, questions)
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "quiz_id": quiz_id,
                "questions": questions,
                "cached": False,
                "filename": file_data["filename"],
                "question_count": len(questions)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "AI service error" in error_msg or "model" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI service error - unable to generate quiz at this time"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Quiz generation failed: {error_msg}"
            )

@router.delete("/quiz/{file_id}")
async def delete_file_quiz(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete the quiz for a specific file to force regeneration.
    """
    try:
        # Get existing quiz
        existing_quiz = await get_existing_quiz(file_id, current_user.id)
        if not existing_quiz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No quiz found for this file"
            )
        
        # Delete the quiz
        success = await delete_quiz(existing_quiz["id"], current_user.id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete quiz"
            )
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": "Quiz deleted successfully. Call quiz endpoint again to generate a new quiz.",
                "file_id": file_id
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Delete failed: {str(e)}"
        )

@router.delete("/summarize/{file_id}")
async def delete_file_summary(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete the summary for a specific file to force regeneration.
    """
    try:
        # Get existing summary
        existing_summary = await get_existing_summary(file_id, current_user.id)
        if not existing_summary:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No summary found for this file"
            )
        
        # Delete the summary
        success = await delete_summary(existing_summary["id"], current_user.id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete summary"
            )
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": "Summary deleted successfully. Call summarize endpoint again to generate a new AI summary.",
                "file_id": file_id
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Delete failed: {str(e)}"
        )

@router.post("/test-ai-summarization")
async def test_ai_summarization(format_type: str = "normal"):
    """
    Test endpoint to verify AI summarization is working.
    This endpoint doesn't require authentication for testing purposes.
    """
    try:
        test_text = """
        Artificial Intelligence (AI) is a branch of computer science that aims to create intelligent machines 
        that can perform tasks that typically require human intelligence. These tasks include learning, 
        reasoning, problem-solving, perception, and language understanding. Machine learning is a subset 
        of AI that focuses on algorithms that can learn and improve from experience without being explicitly 
        programmed. Deep learning, a subset of machine learning, uses neural networks with multiple layers 
        to model and understand complex patterns in data. AI has applications in various fields including 
        healthcare, finance, transportation, and entertainment. The development of AI raises important 
        questions about ethics, privacy, and the future of work.
        """
        
        print(f"TEST: Testing AI summarization in {format_type} format...")
        chunks = chunk_text(test_text)
        summary = await call_model_for_summarization(chunks, format_type)
        
        return JSONResponse(
            status_code=200,
            content={
                "message": "AI summarization test completed",
                "format_type": format_type,
                "original_text_length": len(test_text),
                "summary": summary,
                "summary_length": len(summary),
                "is_ai_generated": not summary.startswith("[Basic Summary") and not summary.startswith("[Text Preview")
            }
        )
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "message": "AI summarization test failed",
                "error": str(e),
                "error_type": type(e).__name__
            }
        )

@router.post("/test-ai-quiz")
async def test_ai_quiz():
    """
    Test endpoint to verify AI quiz generation is working.
    This endpoint doesn't require authentication for testing purposes.
    """
    try:
        test_text = """
        Photosynthesis is the process by which plants convert light energy into chemical energy. 
        This process occurs in the chloroplasts of plant cells, specifically in structures called thylakoids. 
        During photosynthesis, plants absorb carbon dioxide from the atmosphere and water from the soil. 
        Using sunlight as the energy source, these raw materials are converted into glucose and oxygen. 
        The glucose serves as food for the plant, while oxygen is released into the atmosphere as a byproduct. 
        This process is crucial for life on Earth as it produces the oxygen we breathe and forms the base 
        of most food chains. Photosynthesis can be divided into two main stages: the light-dependent 
        reactions and the light-independent reactions (Calvin cycle).
        """
        
        print("TEST: Testing AI quiz generation...")
        questions = await call_model_for_quiz_generation(test_text)
        
        return JSONResponse(
            status_code=200,
            content={
                "message": "AI quiz generation test completed",
                "original_text_length": len(test_text),
                "questions": questions,
                "question_count": len(questions),
                "is_ai_generated": len(questions) > 1
            }
        )
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "message": "AI quiz generation test failed",
                "error": str(e),
                "error_type": type(e).__name__
            }
        )

@router.post("/summarize/{file_id}")
async def summarize_file(
    file_id: str,
    format_type: str = "normal",  # "normal" or "bullet_points"
    current_user: User = Depends(get_current_user)
):
    """
    Generate a summary for the specified file.
    
    Args:
        file_id: The ID of the file to summarize
        format_type: Summary format - "normal" (paragraph) or "bullet_points" (bullet list)
        current_user: Authenticated user
    
    - Checks if summary already exists and returns cached version
    - Fetches file content with ownership verification
    - Chunks text if too long for model limits
    - Uses local transformers or Hugging Face API for summarization
    - Saves summary to database for future retrieval
    """
    
    # Check if summary already exists
    existing_summary = await get_existing_summary(file_id, current_user.id)
    if existing_summary:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "summary_id": existing_summary["id"],
                "summary_text": existing_summary["summary_text"],
                "cached": True,
                "created_at": existing_summary["created_at"]
            }
        )
    
    # Fetch file content
    file_data = await get_file_content(file_id, current_user.token)
    if not file_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found or access denied"
        )
    
    text_content = file_data.get("text_content", "").strip()
    if not text_content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="File has no extractable text"
        )
    
    try:
        # Chunk the text if necessary
        chunks = chunk_text(text_content)
        
        # Generate summary using AI model
        summary_text = await call_model_for_summarization(chunks, format_type)
        
        # Save summary to database
        summary_id = await save_summary(file_id, current_user.id, summary_text)
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "summary_id": summary_id,
                "summary_text": summary_text,
                "format_type": format_type,
                "cached": False,
                "filename": file_data["filename"]
            }
        )
        
    except Exception as e:
        error_msg = str(e)
        if "AI service error" in error_msg or "model" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI service error - unable to generate summary at this time"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Summarization failed: {error_msg}"
            )

@router.post("/flashcards/{file_id}")
async def generate_flashcards(
    file_id: str,
    count: int = Query(default=10, ge=5, le=30),
    current_user: User = Depends(get_current_user)
):
    """
    Generate flashcards for the specified file.
    
    Args:
        file_id: The ID of the file to generate flashcards from
        count: Number of flashcards to generate (min: 5, max: 30, default: 10)
        current_user: Authenticated user
    
    - Checks if flashcards already exist and returns cached version
    - Fetches file content with ownership verification
    - For long texts, generates summary first and uses it for focused flashcards
    - Uses phi-3.5-mini model to generate flashcards with term/definition pairs
    - Validates JSON response and attempts cleanup if needed
    - Saves flashcards to database for future retrieval
    - Returns flashcards in JSON format with "front" and "back" fields
    """
    
    # Check if flashcards already exist
    existing_flashcards = await get_existing_flashcards(file_id, current_user.id)
    if existing_flashcards:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "flashcard_id": existing_flashcards["id"],
                "cards": existing_flashcards["cards"],
                "card_count": len(existing_flashcards["cards"]),
                "cached": True,
                "created_at": existing_flashcards["created_at"]
            }
        )
    
    # Fetch file content
    file_data = await get_file_content(file_id, current_user.token)
    if not file_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found or access denied"
        )
    
    text_content = file_data.get("text_content", "").strip()
    if not text_content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="File has no extractable text"
        )
    
    try:
        # If text is very long, use summary for better flashcard generation
        # This keeps flashcards focused on key concepts
        if len(text_content) > 3000:
            print(f"INFO: Text is long ({len(text_content)} chars), checking for existing summary...")
            existing_summary = await get_existing_summary(file_id, current_user.id)
            if existing_summary:
                print("INFO: Using existing summary for flashcard generation")
                text_content = existing_summary["summary_text"]
            else:
                print("INFO: Generating summary first for long text...")
                chunks = chunk_text(text_content)
                summary_text = await call_model_for_summarization(chunks, "normal")
                await save_summary(file_id, current_user.id, summary_text)
                text_content = summary_text
                print(f"INFO: Using summary ({len(text_content)} chars) for flashcard generation")
        
        # Generate flashcards using AI model
        print(f"INFO: Generating {count} flashcards...")
        cards = await call_model_for_flashcard_generation(text_content, count)
        
        # Validate that we have enough flashcards
        if len(cards) < 3:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI model failed to generate sufficient flashcards"
            )
        
        # Save flashcards to database
        flashcard_id = await save_flashcards(file_id, current_user.id, cards)
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "flashcard_id": flashcard_id,
                "cards": cards,
                "card_count": len(cards),
                "cached": False,
                "filename": file_data["filename"]
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "AI service error" in error_msg or "model" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI service error - unable to generate flashcards at this time"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Flashcard generation failed: {error_msg}"
            )

@router.delete("/flashcards/{file_id}")
async def delete_file_flashcards(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete the flashcards for a specific file to force regeneration.
    """
    try:
        # Get existing flashcards
        existing_flashcards = await get_existing_flashcards(file_id, current_user.id)
        if not existing_flashcards:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No flashcards found for this file"
            )
        
        # Delete the flashcards
        success = await delete_flashcards(existing_flashcards["id"], current_user.id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete flashcards"
            )
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": "Flashcards deleted successfully. Call flashcards endpoint again to generate new flashcards.",
                "file_id": file_id
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Delete failed: {str(e)}"
        )
