'use client'

import { useState, useRef, useEffect } from 'react'
import { chatService, ChatMessage } from '../lib/chatService'

interface NotesChatProps {
  notes: string
  notesName?: string
  filename?: string
  onNotesUpdated?: (updatedNotes: string) => void
}

const EDIT_SUGGESTED_PROMPTS = [
  "Add more details",
  "Make it more concise",
  "Reorganize the content",
  "Add examples",
  "Improve clarity",
  "Expand on key points"
]


export default function NotesChat({ notes, notesName, filename, onNotesUpdated }: NotesChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue.trim()
    }

    // Add user message immediately
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Always use notes edit endpoint since this is edit mode only
      const reply = await chatService.sendNotesEditMessage(
        userMessage.content,
        notes,
        notesName || null,
        filename || null
      )
      
      // Check if reply looks like updated notes (longer response, contains actual content)
      // If it's significantly longer than a typical chat response, it's likely updated notes
      if (reply.length > 200 && onNotesUpdated) {
        // Trigger preview modal
        onNotesUpdated(reply)
        // Add assistant response
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: reply,
          isUpdatedNotes: true
        }
        setMessages(prev => [...prev, assistantMessage])
        return
      }
      
      // Add assistant response
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: reply
      }
      
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      // Add error message with more details
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
      // Always use notes edit endpoint
      const reply = await chatService.sendNotesEditMessage(
        prompt,
        notes,
        notesName || null,
        filename || null
      )
      
      // Check if reply looks like updated notes
      if (reply.length > 200 && onNotesUpdated) {
        // Trigger preview modal
        onNotesUpdated(reply)
        // Add assistant response
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: reply,
          isUpdatedNotes: true
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        // Add assistant response
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

  return (
    <>
      {/* Floating Chat Bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-primary text-white rounded-full shadow-lg hover:bg-opacity-90 transition-all duration-200 hover:scale-105 hover:shadow-xl flex items-center justify-center z-50"
          aria-label="Open chat"
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
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
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
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <h3 className="font-semibold">Notes Editor</h3>
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
                onClick={() => setIsOpen(false)}
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
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <p className="text-sm">Ask me to edit your notes!</p>
                <p className="text-xs text-gray-400 mt-2">
                  Try: "Add more details" or "Make it more concise"
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
                    {message.isUpdatedNotes && onNotesUpdated && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-600 mb-2">
                          Updated notes content generated. Check the preview modal.
                        </p>
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
                <p className="text-xs text-gray-500 mb-2 font-medium">Quick prompts:</p>
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
                placeholder="Ask to edit your notes..."
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
