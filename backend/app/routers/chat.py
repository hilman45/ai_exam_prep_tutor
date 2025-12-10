import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.deps import get_current_user, User
from app.config import settings

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    notes: str

class ChatResponse(BaseModel):
    reply: str

class QuizChatRequest(BaseModel):
    message: str
    question: str | None = None
    options: list[str] | None = None
    correct_answer: str | None = None
    user_answer: str | None = None
    topic_name: str | None = None
    explanation: str | None = None
    all_questions: list[dict] | None = None
    quiz_name: str | None = None

class FlashcardChatRequest(BaseModel):
    message: str
    front: str | None = None
    back: str | None = None
    topic_name: str | None = None
    all_flashcards: list[dict] | None = None
    flashcard_set_name: str | None = None

async def _chat_with_groq_api(message: str, notes: str) -> str:
    """Chat with notes context using Groq API."""
    try:
        async with httpx.AsyncClient() as client:
            # Construct the prompt with notes context
            system_prompt = """You are a helpful study assistant. Your role is to help students understand their notes by:
- Providing clear explanations of concepts
- Summarizing content when asked
- Simplifying complex topics
- Extracting key points
- Defining terms based on the notes
- Answering follow-up questions

Always base your responses ONLY on the notes provided by the user. If the notes don't contain relevant information, politely say so."""

            user_prompt = f"""The user provided these notes:

{notes}

User's question: {message}

Please provide a helpful response based on the notes above."""

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
                            "content": system_prompt
                        },
                        {
                            "role": "user",
                            "content": user_prompt
                        }
                    ],
                    "max_tokens": 1000,
                    "temperature": 0.7,
                    "top_p": 0.9
                },
                timeout=60.0
            )

            if response.status_code == 200:
                result = response.json()
                if "choices" in result and len(result["choices"]) > 0:
                    reply = result["choices"][0]["message"]["content"].strip()
                    print(f"SUCCESS: Groq chat response generated")
                    return reply
                else:
                    raise Exception("Groq API returned unexpected format")
            else:
                error_text = response.text
                print(f"ERROR: Groq API error: {response.status_code} - {error_text}")
                raise Exception(f"Groq API error: {response.status_code}")

    except Exception as e:
        print(f"ERROR: Groq API chat error: {str(e)}")
        raise

async def _chat_with_fallback(message: str, notes: str) -> str:
    """Fallback chat response when AI models are unavailable."""
    # Simple keyword-based responses
    message_lower = message.lower()
    
    if "summarize" in message_lower or "summary" in message_lower:
        # Extract first few sentences as a basic summary
        sentences = notes.split('. ')
        summary = '. '.join(sentences[:3]) + '.'
        return f"Here's a brief summary of your notes:\n\n{summary}\n\nNote: For a more detailed AI-powered summary, please ensure your AI model is configured."
    
    elif "explain" in message_lower or "what is" in message_lower or "what are" in message_lower:
        return "I'd be happy to explain! However, I need an AI model configured to provide detailed explanations. Please check your AI model configuration."
    
    elif "key points" in message_lower or "main points" in message_lower:
        # Extract first few sentences as key points
        sentences = notes.split('. ')
        key_points = '\n- '.join(sentences[:5])
        return f"Here are some key points from your notes:\n\n- {key_points}\n\nNote: For more comprehensive key points, please ensure your AI model is configured."
    
    elif "simplify" in message_lower or "simpler" in message_lower:
        return "I can help simplify your notes! However, I need an AI model configured to provide simplified explanations. Please check your AI model configuration."
    
    else:
        return "I'm here to help with your notes! However, I need an AI model configured to provide detailed responses. Please check your AI model configuration (Groq API key or Hugging Face setup)."

async def call_chat_model(message: str, notes: str) -> str:
    """
    Call AI model for chat with notes context.
    Tries Groq API first, then falls back to basic responses.
    """
    # Try Groq API first (fastest and most reliable)
    try:
        if settings.GROQ_API_KEY:
            return await _chat_with_groq_api(message, notes)
    except Exception as groq_error:
        print(f"Groq API failed: {groq_error}")
    
    # Fallback to basic responses
    try:
        return await _chat_with_fallback(message, notes)
    except Exception as fallback_error:
        print(f"Fallback failed: {fallback_error}")
        raise Exception("All chat services failed")

@router.post("/notes", response_model=ChatResponse)
async def chat_with_notes(
    request: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Chat endpoint for notes assistance.
    Takes a user message and notes context, returns AI response.
    """
    try:
        # Validate inputs
        if not request.message or not request.message.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message cannot be empty"
            )
        
        if not request.notes or not request.notes.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Notes cannot be empty"
            )
        
        # Call AI model to generate response
        reply = await call_chat_model(request.message, request.notes)
        
        return ChatResponse(reply=reply)
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR: Chat endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate chat response: {str(e)}"
        )

async def _chat_quiz_with_groq_api(
    message: str,
    question: str | None = None,
    options: list[str] | None = None,
    correct_answer: str | None = None,
    user_answer: str | None = None,
    topic_name: str | None = None,
    explanation: str | None = None,
    all_questions: list[dict] | None = None,
    quiz_name: str | None = None
) -> str:
    """Chat with quiz context using Groq API."""
    try:
        async with httpx.AsyncClient() as client:
            # Construct the prompt with quiz context
            system_prompt = """You are PrepWise, an AI tutor. Your role is to help students understand quiz questions by:
- Explaining why the correct answer is correct
- Explaining why wrong answers are wrong (if applicable)
- Breaking down concepts related to the question
- Providing follow-up clarification
- Giving simple examples to reinforce learning

Use a friendly, encouraging tone. Be clear and concise. Help students learn from their mistakes without being condescending."""

            # Build the quiz context
            if question and options and correct_answer:
                # Specific question context
                options_text = "\n".join([f"{chr(65+i)}. {opt}" for i, opt in enumerate(options)])
                
                quiz_context = f"""Here is the quiz question:

Question: {question}

Options:
{options_text}

Correct Answer: {correct_answer}"""
                
                if user_answer is not None:
                    quiz_context += f"\nUser's Answer: {user_answer}"
                
                if topic_name:
                    quiz_context += f"\nTopic: {topic_name}"
                
                if explanation:
                    quiz_context += f"\nExplanation: {explanation}"
            else:
                # General quiz context
                quiz_context = f"""The user is asking about a quiz"""
                if quiz_name:
                    quiz_context += f" titled: {quiz_name}"
                if topic_name:
                    quiz_context += f" on the topic: {topic_name}"
                if all_questions:
                    quiz_context += f"\n\nThe quiz contains {len(all_questions)} questions:\n"
                    for idx, q in enumerate(all_questions[:10]):  # Limit to first 10 questions
                        quiz_context += f"\nQuestion {idx + 1}: {q.get('question', 'N/A')}\n"
                        quiz_context += f"Options: {', '.join(q.get('options', []))}\n"
                        quiz_context += f"Correct Answer: {q.get('options', [])[q.get('answer_index', 0)] if q.get('options') else 'N/A'}\n"
                quiz_context += "\nPlease help the user understand the quiz concepts, topics, or answer general questions about the quiz."

            user_prompt = f"""{quiz_context}

User's question: {message}

Please provide a helpful response about this quiz question."""

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
                            "content": system_prompt
                        },
                        {
                            "role": "user",
                            "content": user_prompt
                        }
                    ],
                    "max_tokens": 1000,
                    "temperature": 0.7,
                    "top_p": 0.9
                },
                timeout=60.0
            )

            if response.status_code == 200:
                result = response.json()
                if "choices" in result and len(result["choices"]) > 0:
                    reply = result["choices"][0]["message"]["content"].strip()
                    print(f"SUCCESS: Groq quiz chat response generated")
                    return reply
                else:
                    raise Exception("Groq API returned unexpected format")
            else:
                error_text = response.text
                print(f"ERROR: Groq API error: {response.status_code} - {error_text}")
                raise Exception(f"Groq API error: {response.status_code}")

    except Exception as e:
        print(f"ERROR: Groq API quiz chat error: {str(e)}")
        raise

async def _chat_quiz_with_fallback(
    message: str,
    question: str | None = None,
    options: list[str] | None = None,
    correct_answer: str | None = None,
    user_answer: str | None = None,
    all_questions: list[dict] | None = None,
    quiz_name: str | None = None
) -> str:
    """Fallback quiz chat response when AI models are unavailable."""
    message_lower = message.lower()
    
    if "why" in message_lower and ("wrong" in message_lower or "incorrect" in message_lower):
        if user_answer and user_answer != correct_answer:
            return f"Your answer '{user_answer}' is incorrect. The correct answer is '{correct_answer}'. I'd be happy to explain why in more detail, but I need an AI model configured. Please check your AI model configuration."
        else:
            return "I can help explain why an answer is wrong! However, I need an AI model configured to provide detailed explanations. Please check your AI model configuration."
    
    elif "explain" in message_lower and "correct" in message_lower:
        return f"The correct answer is '{correct_answer}'. I'd be happy to explain why this is correct in more detail, but I need an AI model configured. Please check your AI model configuration."
    
    elif "how" in message_lower and "solve" in message_lower:
        return "I can help you understand how to solve this type of question! However, I need an AI model configured to provide detailed explanations. Please check your AI model configuration."
    
    elif "explain" in message_lower and "concept" in message_lower:
        return "I'd be happy to explain the concept! However, I need an AI model configured to provide detailed explanations. Please check your AI model configuration."
    
    else:
        return f"I'm here to help with this quiz question! The correct answer is '{correct_answer}'. However, I need an AI model configured to provide detailed responses. Please check your AI model configuration (Groq API key or Hugging Face setup)."

async def call_quiz_chat_model(
    message: str,
    question: str | None = None,
    options: list[str] | None = None,
    correct_answer: str | None = None,
    user_answer: str | None = None,
    topic_name: str | None = None,
    explanation: str | None = None,
    all_questions: list[dict] | None = None,
    quiz_name: str | None = None
) -> str:
    """
    Call AI model for chat with quiz context.
    Tries Groq API first, then falls back to basic responses.
    """
    # Try Groq API first (fastest and most reliable)
    try:
        if settings.GROQ_API_KEY:
            return await _chat_quiz_with_groq_api(
                message, question, options, correct_answer,
                user_answer, topic_name, explanation,
                all_questions, quiz_name
            )
    except Exception as groq_error:
        print(f"Groq API failed: {groq_error}")
    
    # Fallback to basic responses
    try:
        return await _chat_quiz_with_fallback(
            message, question, options, correct_answer, user_answer,
            all_questions, quiz_name
        )
    except Exception as fallback_error:
        print(f"Fallback failed: {fallback_error}")
        raise Exception("All chat services failed")

@router.post("/quiz", response_model=ChatResponse)
async def chat_with_quiz(
    request: QuizChatRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Chat endpoint for quiz assistance.
    Takes a user message and quiz question context, returns AI response.
    """
    try:
        # Validate inputs
        if not request.message or not request.message.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message cannot be empty"
            )
        
        # Validate inputs - either specific question OR general quiz context
        if request.question:
            # If question is provided, validate it
            if not request.question.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Question cannot be empty"
                )
            
            if not request.options or len(request.options) < 2:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Options must have at least 2 items"
                )
            
            if not request.correct_answer or not request.correct_answer.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Correct answer cannot be empty"
                )
        elif not request.all_questions or len(request.all_questions) == 0:
            # If no specific question, need all_questions for general context
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either provide a specific question or all questions for general quiz context"
            )
        
        # Call AI model to generate response
        reply = await call_quiz_chat_model(
            request.message,
            request.question,
            request.options,
            request.correct_answer,
            request.user_answer,
            request.topic_name,
            request.explanation,
            request.all_questions,
            request.quiz_name
        )
        
        return ChatResponse(reply=reply)
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR: Quiz chat endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate quiz chat response: {str(e)}"
        )

async def _chat_flashcard_with_groq_api(
    message: str,
    front: str | None = None,
    back: str | None = None,
    topic_name: str | None = None,
    all_flashcards: list[dict] | None = None,
    flashcard_set_name: str | None = None
) -> str:
    """Chat with flashcard context using Groq API."""
    try:
        async with httpx.AsyncClient() as client:
            # Construct the prompt with flashcard context
            system_prompt = """You are PrepWise, an AI assistant helping the user understand a flashcard.

Explain the card in simple terms.
Give examples if helpful.
Stay friendly and educational.
Allow follow-up questions.

Your role is to help students understand flashcards by:
- Explaining the flashcard's meaning clearly
- Simplifying complex concepts
- Providing real-world examples
- Explaining why terms are important
- Helping with vocabulary understanding
- Creating practice questions when asked

Use a friendly, encouraging tone. Be clear and concise."""

            # Build the flashcard context
            if front and back:
                # Specific flashcard context
                flashcard_context = f"""Here is the flashcard:

Front (Question/Term): {front}

Back (Answer/Definition): {back}"""
                
                if topic_name:
                    flashcard_context += f"\nTopic/Category: {topic_name}"
            else:
                # General flashcard set context
                flashcard_context = f"""The user is asking about flashcards"""
                if flashcard_set_name:
                    flashcard_context += f" from the set: {flashcard_set_name}"
                if topic_name:
                    flashcard_context += f" on the topic: {topic_name}"
                if all_flashcards:
                    flashcard_context += f"\n\nThe flashcard set contains {len(all_flashcards)} cards:\n"
                    for idx, card in enumerate(all_flashcards[:10]):  # Limit to first 10 cards
                        flashcard_context += f"\nCard {idx + 1}:\n"
                        flashcard_context += f"Front: {card.get('front', 'N/A')}\n"
                        flashcard_context += f"Back: {card.get('back', 'N/A')}\n"
                flashcard_context += "\nPlease help the user understand the flashcard concepts, terms, or answer general questions about the flashcards."

            user_prompt = f"""{flashcard_context}

User's question: {message}

Please provide a helpful response about this flashcard."""

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
                            "content": system_prompt
                        },
                        {
                            "role": "user",
                            "content": user_prompt
                        }
                    ],
                    "max_tokens": 1000,
                    "temperature": 0.7,
                    "top_p": 0.9
                },
                timeout=60.0
            )

            if response.status_code == 200:
                result = response.json()
                if "choices" in result and len(result["choices"]) > 0:
                    reply = result["choices"][0]["message"]["content"].strip()
                    print(f"SUCCESS: Groq flashcard chat response generated")
                    return reply
                else:
                    raise Exception("Groq API returned unexpected format")
            else:
                error_text = response.text
                print(f"ERROR: Groq API error: {response.status_code} - {error_text}")
                raise Exception(f"Groq API error: {response.status_code}")

    except Exception as e:
        print(f"ERROR: Groq API flashcard chat error: {str(e)}")
        raise

async def _chat_flashcard_with_fallback(
    message: str,
    front: str | None = None,
    back: str | None = None,
    topic_name: str | None = None,
    all_flashcards: list[dict] | None = None,
    flashcard_set_name: str | None = None
) -> str:
    """Fallback flashcard chat response when AI models are unavailable."""
    message_lower = message.lower()
    
    if "explain" in message_lower:
        if front and back:
            return f"I'd be happy to explain this flashcard!\n\nFront: {front}\nBack: {back}\n\nHowever, I need an AI model configured to provide detailed explanations. Please check your AI model configuration."
        else:
            return "I'd be happy to explain the flashcard! However, I need an AI model configured to provide detailed explanations. Please check your AI model configuration."
    
    elif "simpler" in message_lower or "simple" in message_lower:
        if back:
            return f"I can help simplify this concept! The definition is: {back}\n\nHowever, I need an AI model configured to provide simplified explanations. Please check your AI model configuration."
        else:
            return "I can help simplify this concept! However, I need an AI model configured to provide simplified explanations. Please check your AI model configuration."
    
    elif "example" in message_lower:
        if front and back:
            return f"I can provide examples for this flashcard!\n\nTerm: {front}\nDefinition: {back}\n\nHowever, I need an AI model configured to provide detailed examples. Please check your AI model configuration."
        else:
            return "I can provide examples! However, I need an AI model configured to provide detailed examples. Please check your AI model configuration."
    
    elif "important" in message_lower or "why" in message_lower:
        if front:
            return f"I can explain why '{front}' is important! However, I need an AI model configured to provide detailed explanations. Please check your AI model configuration."
        else:
            return "I can explain why this term is important! However, I need an AI model configured to provide detailed explanations. Please check your AI model configuration."
    
    elif "test" in message_lower or "practice" in message_lower or "question" in message_lower:
        if front and back:
            return f"I can create a practice question for this flashcard!\n\nTerm: {front}\nDefinition: {back}\n\nHowever, I need an AI model configured to generate practice questions. Please check your AI model configuration."
        else:
            return "I can create practice questions! However, I need an AI model configured to generate them. Please check your AI model configuration."
    
    else:
        if front and back:
            return f"I'm here to help with this flashcard!\n\nFront: {front}\nBack: {back}\n\nHowever, I need an AI model configured to provide detailed responses. Please check your AI model configuration (Groq API key or Hugging Face setup)."
        else:
            return "I'm here to help with your flashcards! However, I need an AI model configured to provide detailed responses. Please check your AI model configuration (Groq API key or Hugging Face setup)."

async def call_flashcard_chat_model(
    message: str,
    front: str | None = None,
    back: str | None = None,
    topic_name: str | None = None,
    all_flashcards: list[dict] | None = None,
    flashcard_set_name: str | None = None
) -> str:
    """
    Call AI model for chat with flashcard context.
    Tries Groq API first, then falls back to basic responses.
    """
    # Try Groq API first (fastest and most reliable)
    try:
        if settings.GROQ_API_KEY:
            return await _chat_flashcard_with_groq_api(
                message, front, back, topic_name,
                all_flashcards, flashcard_set_name
            )
    except Exception as groq_error:
        print(f"Groq API failed: {groq_error}")
    
    # Fallback to basic responses
    try:
        return await _chat_flashcard_with_fallback(
            message, front, back, topic_name,
            all_flashcards, flashcard_set_name
        )
    except Exception as fallback_error:
        print(f"Fallback failed: {fallback_error}")
        raise Exception("All chat services failed")

@router.post("/flashcard", response_model=ChatResponse)
async def chat_with_flashcard(
    request: FlashcardChatRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Chat endpoint for flashcard assistance.
    Takes a user message and flashcard context, returns AI response.
    """
    try:
        # Validate inputs
        if not request.message or not request.message.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message cannot be empty"
            )
        
        # Validate inputs - either specific flashcard OR general flashcard set context
        if request.front and request.back:
            # If specific flashcard is provided, validate it
            if not request.front.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Front text cannot be empty"
                )
            
            if not request.back.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Back text cannot be empty"
                )
        elif not request.all_flashcards or len(request.all_flashcards) == 0:
            # If no specific flashcard, need all_flashcards for general context
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either provide a specific flashcard (front and back) or all flashcards for general context"
            )
        
        # Call AI model to generate response
        reply = await call_flashcard_chat_model(
            request.message,
            request.front,
            request.back,
            request.topic_name,
            request.all_flashcards,
            request.flashcard_set_name
        )
        
        return ChatResponse(reply=reply)
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR: Flashcard chat endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate flashcard chat response: {str(e)}"
        )
