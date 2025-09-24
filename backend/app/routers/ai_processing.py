import uuid
import os
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
import httpx
from app.deps import get_current_user, User
from app.config import settings

router = APIRouter()

# Chunk size for text processing (characters)
CHUNK_SIZE = 3000

def chunk_text(text: str, max_chars: int = CHUNK_SIZE) -> List[str]:
    """
    Split text into chunks to avoid model token limits.
    
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
            # Look for sentence endings within the last 200 characters
            search_start = max(start, end - 200)
            sentence_endings = ['.', '!', '?', '\n\n']
            
            best_break = end
            for ending in sentence_endings:
                last_ending = text.rfind(ending, search_start, end)
                if last_ending > start:
                    best_break = last_ending + 1
                    break
            
            end = best_break
        
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        
        start = end
    
    return chunks

async def call_model_for_summarization(chunked_texts: List[str]) -> str:
    """
    Call AI model for summarization with local transformers or Hugging Face API fallback.
    
    Args:
        chunked_texts: List of text chunks to summarize
        
    Returns:
        Combined summary text
    """
    try:
        # Try local transformers first
        return await _summarize_with_local_model(chunked_texts)
    except Exception as local_error:
        print(f"Local model failed: {local_error}")
        
        # Fallback to Hugging Face API if available
        if settings.HUGGINGFACE_API_KEY:
            try:
                return await _summarize_with_hf_api(chunked_texts)
            except Exception as api_error:
                print(f"HF API failed: {api_error}")
                raise Exception(f"Both local and API summarization failed. Local: {local_error}, API: {api_error}")
        else:
            raise Exception(f"Local summarization failed and no HF API key available: {local_error}")

async def _summarize_with_local_model(chunked_texts: List[str]) -> str:
    """Summarize using local transformers pipeline or simple text extraction."""
    try:
        print("🤖 Attempting to import transformers...")
        from transformers import pipeline
        print("✅ Transformers imported successfully!")
        
        print("🤖 Initializing summarization pipeline...")
        # Initialize summarization pipeline with a lightweight model
        summarizer = pipeline(
            "summarization",
            model="facebook/bart-large-cnn",
            device=-1,  # Use CPU
            max_length=150,
            min_length=30,
            do_sample=False
        )
        print("✅ Summarization pipeline initialized!")
        
        chunk_summaries = []
        
        for i, chunk in enumerate(chunked_texts):
            try:
                print(f"🤖 Summarizing chunk {i+1}/{len(chunked_texts)} (length: {len(chunk)} chars)")
                # Summarize each chunk
                result = summarizer(chunk, max_length=150, min_length=30)
                chunk_summary = result[0]['summary_text']
                chunk_summaries.append(chunk_summary)
                print(f"✅ Chunk {i+1} summarized successfully")
            except Exception as e:
                print(f"❌ Failed to summarize chunk {i+1}: {e}")
                print(f"❌ Chunk content preview: {chunk[:100]}...")
                # If chunk summarization fails, use first 200 chars as fallback
                chunk_summaries.append(chunk[:200] + "...")
        
        # If we have multiple chunks, combine their summaries
        if len(chunk_summaries) > 1:
            print(f"🤖 Combining {len(chunk_summaries)} chunk summaries...")
            combined_text = " ".join(chunk_summaries)
            if len(combined_text) > 1000:  # If combined is still long, summarize again
                print("🤖 Final summarization of combined text...")
                final_result = summarizer(combined_text, max_length=200, min_length=50)
                final_summary = final_result[0]['summary_text']
                print(f"✅ Final AI summary generated (length: {len(final_summary)} chars)")
                return final_summary
            else:
                print(f"✅ Combined summary generated (length: {len(combined_text)} chars)")
                return combined_text
        else:
            final_summary = chunk_summaries[0] if chunk_summaries else "Unable to generate summary."
            print(f"✅ Single chunk summary generated (length: {len(final_summary)} chars)")
            return final_summary
            
    except ImportError as e:
        # Fallback to simple text extraction if transformers not available
        print(f"❌ Transformers import failed: {e}")
        print("🔄 Using simple text extraction fallback")
        return await _simple_text_summary(chunked_texts)
    except Exception as e:
        print(f"❌ Local model error: {e}")
        print(f"❌ Error type: {type(e).__name__}")
        print("🔄 Using simple text extraction fallback")
        return await _simple_text_summary(chunked_texts)

async def _simple_text_summary(chunked_texts: List[str]) -> str:
    """Simple text summarization fallback when AI models are not available."""
    try:
        print("⚠️  Using basic text extraction (AI model unavailable)")
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
        print(f"⚠️  Basic summary generated (length: {len(summary)} chars)")
        
        return summary
        
    except Exception as e:
        print(f"❌ Even basic summary failed: {e}")
        # Ultimate fallback - just return first 300 characters
        full_text = " ".join(chunked_texts)
        fallback = f"[Text Preview - AI unavailable] {full_text[:300]}{'...' if len(full_text) > 300 else ''}"
        print(f"⚠️  Using text preview fallback (length: {len(fallback)} chars)")
        return fallback

async def _summarize_with_hf_api(chunked_texts: List[str]) -> str:
    """Summarize using Hugging Face Inference API."""
    try:
        async with httpx.AsyncClient() as client:
            chunk_summaries = []
            
            for chunk in chunked_texts:
                response = await client.post(
                    "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
                    headers={
                        "Authorization": f"Bearer {settings.HUGGINGFACE_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "inputs": chunk,
                        "parameters": {
                            "max_length": 150,
                            "min_length": 30,
                            "do_sample": False
                        }
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if isinstance(result, list) and len(result) > 0:
                        chunk_summaries.append(result[0]['summary_text'])
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
                    response = await client.post(
                        "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
                        headers={
                            "Authorization": f"Bearer {settings.HUGGINGFACE_API_KEY}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "inputs": combined_text,
                            "parameters": {
                                "max_length": 200,
                                "min_length": 50,
                                "do_sample": False
                            }
                        },
                        timeout=30.0
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        if isinstance(result, list) and len(result) > 0:
                            return result[0]['summary_text']
                
                return combined_text
            else:
                return chunk_summaries[0] if chunk_summaries else "Unable to generate summary."
                
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
async def test_ai_summarization():
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
        
        print("🧪 Testing AI summarization...")
        chunks = chunk_text(test_text)
        summary = await call_model_for_summarization(chunks)
        
        return JSONResponse(
            status_code=200,
            content={
                "message": "AI summarization test completed",
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

@router.post("/summarize/{file_id}")
async def summarize_file(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Generate a summary for the specified file.
    
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
        summary_text = await call_model_for_summarization(chunks)
        
        # Save summary to database
        summary_id = await save_summary(file_id, current_user.id, summary_text)
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "summary_id": summary_id,
                "summary_text": summary_text,
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
