'use client'

import { useState, useRef, useEffect } from 'react'
import { chatService, ChatMessage } from '../lib/chatService'
import { QuizQuestion } from '../lib/quizService'

interface QuizEditChatProps {
  currentQuestions: QuizQuestion[]
  quizName?: string
  filename?: string
  onClose: () => void
  onQuestionsGenerated: (questions: QuizQuestion[]) => void
  isOpen: boolean
  onToggle: () => void
  selectedQuestion?: QuizQuestion | null
  selectedQuestionIndex?: number | null
}

const EDIT_SUGGESTED_PROMPTS = [
  "Create similar questions",
  "Make them more concise",
  "Add more questions",
  "Improve question clarity",
  "Generate harder questions",
  "Create easier questions"
]

export default function QuizEditChat({ 
  currentQuestions,
  quizName,
  filename,
  onClose,
  onQuestionsGenerated,
  isOpen,
  onToggle,
  selectedQuestion,
  selectedQuestionIndex
}: QuizEditChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Focus input when chat opens
  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue.trim()
    }

    // Add user message immediately
    setMessages(prev => [...prev, userMessage])
    const currentInput = inputValue.trim()
    setInputValue('')
    setIsLoading(true)

    try {
      // Call backend API for quiz editing assistance
      // If a specific question is selected, include it in the context
      const questionsToSend = selectedQuestion 
        ? currentQuestions.filter((_, idx) => idx === selectedQuestionIndex)
        : currentQuestions
      
      const reply = await chatService.sendQuizEditMessage(
        currentInput,
        questionsToSend,
        quizName || null,
        filename || null,
        selectedQuestion || null
      )
      
      // Check if the reply contains JSON quiz questions
      const questions = parseQuizQuestionsFromResponse(reply)
      
      if (questions && questions.length > 0) {
        // If a specific question is selected, only use the first generated question
        const questionsToShow = selectedQuestion && selectedQuestionIndex !== null
          ? [questions[0]] // Only first question when replacing a specific question
          : questions // All questions when no specific question is selected
        
        // Add assistant response with questions
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: reply,
          questions: questionsToShow
        }
        setMessages(prev => [...prev, assistantMessage])
        
        // Automatically show preview
        onQuestionsGenerated(questionsToShow)
      } else {
        // Regular text response
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: reply
        }
        setMessages(prev => [...prev, assistantMessage])
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: error instanceof Error 
          ? `Sorry, I encountered an error: ${error.message}. Please try again.`
          : 'Sorry, I encountered an error. Please try again later.'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClearChat = () => {
    setMessages([])
  }

  const handlePromptClick = async (prompt: string) => {
    if (isLoading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: prompt
    }

    // Add user message immediately
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      // Call backend API for quiz editing assistance
      // If a specific question is selected, include it in the context
      const questionsToSend = selectedQuestion 
        ? currentQuestions.filter((_, idx) => idx === selectedQuestionIndex)
        : currentQuestions
      
      const reply = await chatService.sendQuizEditMessage(
        prompt,
        questionsToSend,
        quizName || null,
        filename || null,
        selectedQuestion || null
      )
      
      // Check if the reply contains JSON quiz questions
      const questions = parseQuizQuestionsFromResponse(reply)
      
      if (questions && questions.length > 0) {
        // If a specific question is selected, only use the first generated question
        const questionsToShow = selectedQuestion && selectedQuestionIndex !== null
          ? [questions[0]] // Only first question when replacing a specific question
          : questions // All questions when no specific question is selected
        
        // Add assistant response with questions
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: reply,
          questions: questionsToShow
        }
        setMessages(prev => [...prev, assistantMessage])
        
        // Automatically show preview
        onQuestionsGenerated(questionsToShow)
      } else {
        // Regular text response
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: reply
        }
        setMessages(prev => [...prev, assistantMessage])
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: error instanceof Error 
          ? `Sorry, I encountered an error: ${error.message}. Please try again.`
          : 'Sorry, I encountered an error. Please try again later.'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Parse quiz questions from AI response
  const parseQuizQuestionsFromResponse = (response: string): QuizQuestion[] | null => {
    try {
      // Try to find JSON in the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Validate structure
          const validQuestions = parsed.filter((q: any) => 
            q.question && 
            Array.isArray(q.options) && 
            q.options.length >= 2 &&
            typeof q.answer_index === 'number' &&
            q.answer_index >= 0 &&
            q.answer_index < q.options.length
          );
          return validQuestions.length > 0 ? validQuestions : null;
        }
      }
      
      // Try parsing the entire response as JSON
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      
      return null;
    } catch (error) {
      // Not JSON, return null
      return null;
    }
  }

  return (
    <>
      {/* Floating Chat Bubble */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-primary text-white rounded-full shadow-lg hover:bg-opacity-90 transition-all duration-200 hover:scale-105 hover:shadow-xl flex items-center justify-center z-50"
          aria-label="Open quiz editor chat"
        >
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-3rem)] h-[calc(100vh-8rem)] sm:h-[600px] max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-50 transition-all duration-200">
          {/* Header */}
          <div className="bg-primary text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <h3 className="font-semibold">AI Quiz Editor</h3>
          {selectedQuestionIndex !== null && selectedQuestionIndex !== undefined && (
            <span className="ml-2 px-2.5 py-1 bg-white bg-opacity-20 rounded-full text-xs font-bold border border-white border-opacity-30">
              Question {selectedQuestionIndex + 1}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="p-1 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all duration-200 hover:scale-105"
              aria-label="Clear chat"
              title="Clear chat"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
          <button
            onClick={() => {
              onToggle()
              onClose()
            }}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all duration-200 hover:scale-105"
            aria-label="Close chat"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <p className="text-sm">
              {selectedQuestion 
                ? "Ask me to help improve this question!" 
                : "Ask me to help improve your quiz questions!"}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              {selectedQuestion 
                ? 'Try: "Make this clearer" or "Improve the options"'
                : 'Try: "Create similar questions" or "Make them more concise"'}
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 transition-all duration-200 ${
                  message.role === 'user'
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.content}
                </p>
                {message.questions && message.questions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-2">
                      Generated {message.questions.length} question{message.questions.length !== 1 ? 's' : ''}:
                    </p>
                    <div className="space-y-2">
                      {message.questions.slice(0, 2).map((q, qIndex) => (
                        <div key={qIndex} className="text-xs bg-gray-50 p-2 rounded">
                          <p className="font-medium">{q.question}</p>
                          <p className="text-gray-600 mt-1">
                            Correct: {q.options[q.answer_index]}
                          </p>
                        </div>
                      ))}
                      {message.questions.length > 2 && (
                        <p className="text-xs text-gray-500">
                          +{message.questions.length - 2} more questions
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white rounded-b-lg">
        {/* Prompt Suggestions */}
        {messages.length === 0 && !isLoading && (
          <div className="p-3 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-2 font-medium">Quick suggestions:</p>
            <div className="flex flex-wrap gap-2">
              {EDIT_SUGGESTED_PROMPTS.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handlePromptClick(prompt)}
                  disabled={isLoading}
                  className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-primary hover:text-white text-gray-700 rounded-full transition-all duration-200 hover:scale-105 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="p-4">
          <div className="flex items-end space-x-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask to improve questions..."
              className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
              rows={1}
              disabled={isLoading}
              style={{
                minHeight: '40px',
                maxHeight: '120px',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`
              }}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-all duration-200 hover:scale-105 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none flex items-center justify-center"
              aria-label="Send message"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
            </button>
          </div>
          </div>
        </div>
        </div>
      )}
    </>
  )
}

