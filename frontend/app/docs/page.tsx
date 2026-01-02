'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, authHelpers } from '../../lib/supabase'

type SectionId = 'introduction' | 'who-should-use' | 'core-features' | 'how-to-use' | 'learning-analytics' | 'faq'

interface Section {
  id: SectionId
  title: string
  subsections?: { id: string; title: string }[]
}

const sections: Section[] = [
  { id: 'introduction', title: 'Introduction' },
  { id: 'who-should-use', title: 'Who Should Use PrepWise' },
  { id: 'core-features', title: 'Core Features Overview' },
  { 
    id: 'how-to-use', 
    title: 'How to Use PrepWise',
    subsections: [
      { id: 'notes', title: 'Notes' },
      { id: 'quizzes', title: 'Quizzes' },
      { id: 'flashcards', title: 'Flashcards' },
      { id: 'ai-chat-agents', title: 'AI Chat Agents' }
    ]
  },
  { id: 'learning-analytics', title: 'Learning Analytics' },
  { id: 'faq', title: 'Frequently Asked Questions' }
]

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('introduction')
  const [activeSubsection, setActiveSubsection] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Scroll to top when section changes
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeSection, activeSubsection])

  const handleNext = () => {
    const currentIndex = sections.findIndex(s => s.id === activeSection)
    if (currentIndex < sections.length - 1) {
      setActiveSection(sections[currentIndex + 1].id as SectionId)
      setActiveSubsection(null)
    }
  }

  const handleSectionClick = (sectionId: SectionId) => {
    setActiveSection(sectionId)
    setActiveSubsection(null)
  }

  const handleSubsectionClick = (subsectionId: string) => {
    setActiveSubsection(subsectionId)
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'introduction':
        return (
          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-dark mb-4">Introduction</h1>
            <p className="text-xl text-gray-600 mb-8">Welcome to the PrepWise user manual!</p>
            
            <div className="space-y-6">
              <section>
                <h2 className="text-2xl font-bold text-dark mb-4">What is PrepWise?</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  PrepWise is a web application that makes exam preparation easy and efficient. 
                  PrepWise applies proven learning methods such as spaced repetition and active recall 
                  to significantly increase the amount of information you can memorize in a given amount of time.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  PrepWise is content-agnostic, so you can use it to prepare for any exam or subject you want.
                </p>
              </section>

              <section className="mt-8">
                <h2 className="text-2xl font-bold text-dark mb-4">Spaced Repetition and Active Recall</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  PrepWise makes learning more efficient by leveraging two key learning methods:
                </p>
                <ul className="space-y-4">
                  <li>
                    <h3 className="font-bold text-lg text-dark mb-2">Spaced Repetition</h3>
                    <p className="text-gray-700 leading-relaxed">
                      An evidence-based learning technique that involves reviewing information at increasing 
                      intervals over time to enhance memory retention. This method has been proven to increase 
                      the rate of learning significantly. PrepWise uses an advanced spaced repetition algorithm 
                      to predict with accuracy when you should review each card or quiz question.
                    </p>
                  </li>
                  <li>
                    <h3 className="font-bold text-lg text-dark mb-2">Active Recall</h3>
                    <p className="text-gray-700 leading-relaxed">
                      Research shows that long-term memory is increased when part of the learning is devoted 
                      to retrieving information from memory. PrepWise encourages active recall through quizzes 
                      and flashcards, helping you strengthen your memory through practice.
                    </p>
                  </li>
                </ul>
              </section>

              {/* Image placeholder */}
              <div className="mt-8 bg-gray-100 rounded-lg p-8 flex items-center justify-center min-h-[300px] border-2 border-dashed border-gray-300">
                <p className="text-gray-500 text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Image placeholder for PrepWise overview
                </p>
              </div>
            </div>

            <div className="mt-12 flex justify-end">
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all hover:scale-105 hover:shadow-lg font-medium"
              >
                Next →
              </button>
            </div>
          </div>
        )

      case 'who-should-use':
        return (
          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-dark mb-4">Who Should Use PrepWise</h1>
            
            <div className="space-y-6">
              <p className="text-gray-700 leading-relaxed text-lg">
                PrepWise is designed for anyone who wants to improve their exam preparation and learning efficiency. 
                Whether you're a student, professional, or lifelong learner, PrepWise can help you achieve your goals.
              </p>

              <section className="mt-6">
                <h2 className="text-2xl font-bold text-dark mb-4">Ideal for:</h2>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-primary mr-3">•</span>
                    <span><strong>Students</strong> preparing for exams, tests, or standardized assessments</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-3">•</span>
                    <span><strong>Professionals</strong> studying for certifications or licensing exams</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-3">•</span>
                    <span><strong>Language learners</strong> looking to expand vocabulary and improve retention</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-3">•</span>
                    <span><strong>Anyone</strong> who wants to memorize information more effectively using science-backed methods</span>
                  </li>
                </ul>
              </section>

              {/* Image placeholder */}
              <div className="mt-8 bg-gray-100 rounded-lg p-8 flex items-center justify-center min-h-[250px] border-2 border-dashed border-gray-300">
                <p className="text-gray-500 text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Image placeholder for target users
                </p>
              </div>
            </div>

            <div className="mt-12 flex justify-end">
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all hover:scale-105 hover:shadow-lg font-medium"
              >
                Next →
              </button>
            </div>
          </div>
        )

      case 'core-features':
        return (
          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-dark mb-4">Core Features Overview</h1>
            
            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-bold text-dark mb-4">Key Features</h2>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="bg-secondary rounded-lg p-6 hover:shadow-md transition-shadow">
                    <h3 className="text-xl font-bold text-dark mb-3">📝 Smart Notes</h3>
                    <p className="text-gray-700">
                      Upload your lecture notes, PDFs, or documents. PrepWise extracts and organizes 
                      your content for easy access and study.
                    </p>
                  </div>
                  <div className="bg-secondary rounded-lg p-6 hover:shadow-md transition-shadow">
                    <h3 className="text-xl font-bold text-dark mb-3">❓ AI-Generated Quizzes</h3>
                    <p className="text-gray-700">
                      Automatically generate practice quizzes from your notes. Test your knowledge 
                      with multiple-choice and short-answer questions.
                    </p>
                  </div>
                  <div className="bg-secondary rounded-lg p-6 hover:shadow-md transition-shadow">
                    <h3 className="text-xl font-bold text-dark mb-3">🎴 Interactive Flashcards</h3>
                    <p className="text-gray-700">
                      Create and study flashcards with spaced repetition. Review cards at optimal 
                      intervals to maximize retention.
                    </p>
                  </div>
                  <div className="bg-secondary rounded-lg p-6 hover:shadow-md transition-shadow">
                    <h3 className="text-xl font-bold text-dark mb-3">🤖 AI Chat Agents</h3>
                    <p className="text-gray-700">
                      Get instant help with your study questions. Our AI tutors can explain concepts, 
                      provide examples, and guide your learning.
                    </p>
                  </div>
                  <div className="bg-secondary rounded-lg p-6 hover:shadow-md transition-shadow">
                    <h3 className="text-xl font-bold text-dark mb-3">📊 Learning Analytics</h3>
                    <p className="text-gray-700">
                      Track your progress, study streaks, and performance metrics. Understand your 
                      learning patterns and improve over time.
                    </p>
                  </div>
                  <div className="bg-secondary rounded-lg p-6 hover:shadow-md transition-shadow">
                    <h3 className="text-xl font-bold text-dark mb-3">📁 Organized Folders</h3>
                    <p className="text-gray-700">
                      Organize your study materials into folders. Keep everything structured and easy to find.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-12 flex justify-end">
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all hover:scale-105 hover:shadow-lg font-medium"
              >
                Next →
              </button>
            </div>
          </div>
        )

      case 'how-to-use':
        const currentSubsection = activeSubsection || 'notes'
        
        if (currentSubsection === 'notes') {
          return (
            <div className="space-y-6">
              <h1 className="text-4xl font-bold text-dark mb-4">How to Use PrepWise</h1>
              <h2 className="text-2xl font-semibold text-gray-700 mb-6">Notes</h2>
              
              <div className="space-y-6">
                <section>
                  <h3 className="text-xl font-bold text-dark mb-3">Uploading Notes</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                    <li>Navigate to the Notes section from the sidebar</li>
                    <li>Click "Upload File" or "Generate Notes"</li>
                    <li>Select your file (PDF, DOCX, TXT, or images)</li>
                    <li>Wait for the file to be processed and text extracted</li>
                    <li>Your notes will be saved and organized automatically</li>
                  </ol>
                </section>

                <section>
                  <h3 className="text-xl font-bold text-dark mb-3">Viewing and Managing Notes</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Once uploaded, you can view your notes, edit them, or organize them into folders. 
                    Notes can be used as the basis for generating quizzes and flashcards.
                  </p>
                </section>

                {/* Image placeholder */}
                <div className="mt-6 bg-gray-100 rounded-lg p-8 flex items-center justify-center min-h-[300px] border-2 border-dashed border-gray-300">
                  <p className="text-gray-500 text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Image placeholder for Notes feature
                  </p>
                </div>
              </div>

              <div className="mt-12 flex justify-end">
                <button
                  onClick={() => handleSubsectionClick('quizzes')}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all hover:scale-105 hover:shadow-lg font-medium"
                >
                  Next →
                </button>
              </div>
            </div>
          )
        }

        if (currentSubsection === 'quizzes') {
          return (
            <div className="space-y-6">
              <h1 className="text-4xl font-bold text-dark mb-4">How to Use PrepWise</h1>
              <h2 className="text-2xl font-semibold text-gray-700 mb-6">Quizzes</h2>
              
              <div className="space-y-6">
                <section>
                  <h3 className="text-xl font-bold text-dark mb-3">Generating Quizzes</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                    <li>Select a file from your notes</li>
                    <li>Click "Generate Quiz"</li>
                    <li>Choose between Multiple Choice or Short Answer questions</li>
                    <li>Wait for AI to generate questions based on your content</li>
                    <li>Review and edit questions if needed</li>
                  </ol>
                </section>

                <section>
                  <h3 className="text-xl font-bold text-dark mb-3">Taking Quizzes</h3>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    Once generated, you can take quizzes in Quiz Mode:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>Answer questions one at a time</li>
                    <li>Get immediate feedback on your answers</li>
                    <li>Review incorrect answers with explanations</li>
                    <li>Track your performance and progress</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-xl font-bold text-dark mb-3">AI Chat Assistance</h3>
                  <p className="text-gray-700 leading-relaxed">
                    While taking quizzes, you can use the AI Chat feature to get help with questions 
                    you're struggling with. The AI can provide hints, explanations, and additional context.
                  </p>
                </section>
              </div>

              <div className="mt-12 flex justify-end">
                <button
                  onClick={() => handleSubsectionClick('flashcards')}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all hover:scale-105 hover:shadow-lg font-medium"
                >
                  Next →
                </button>
              </div>
            </div>
          )
        }

        if (currentSubsection === 'flashcards') {
          return (
            <div className="space-y-6">
              <h1 className="text-4xl font-bold text-dark mb-4">How to Use PrepWise</h1>
              <h2 className="text-2xl font-semibold text-gray-700 mb-6">Flashcards</h2>
              
              <div className="space-y-6">
                <section>
                  <h3 className="text-xl font-bold text-dark mb-3">Generating Flashcards</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                    <li>Select a file from your notes</li>
                    <li>Click "Generate Flashcards"</li>
                    <li>AI will automatically create term-definition pairs</li>
                    <li>Review and edit flashcards as needed</li>
                  </ol>
                </section>

                <section>
                  <h3 className="text-xl font-bold text-dark mb-3">Studying with Flashcards</h3>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    Use the spaced repetition system to study:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>Cards are shown at optimal intervals based on your performance</li>
                    <li>Mark cards as "Easy", "Good", or "Hard" after reviewing</li>
                    <li>The algorithm adjusts the next review time accordingly</li>
                    <li>Focus more on cards you find difficult</li>
                  </ul>
                </section>

                {/* Image placeholder */}
                <div className="mt-6 bg-gray-100 rounded-lg p-8 flex items-center justify-center min-h-[300px] border-2 border-dashed border-gray-300">
                  <p className="text-gray-500 text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Image placeholder for Flashcards feature
                  </p>
                </div>
              </div>

              <div className="mt-12 flex justify-end">
                <button
                  onClick={() => handleSubsectionClick('ai-chat-agents')}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all hover:scale-105 hover:shadow-lg font-medium"
                >
                  Next →
                </button>
              </div>
            </div>
          )
        }

        if (currentSubsection === 'ai-chat-agents') {
          return (
            <div className="space-y-6">
              <h1 className="text-4xl font-bold text-dark mb-4">How to Use PrepWise</h1>
              <h2 className="text-2xl font-semibold text-gray-700 mb-6">AI Chat Agents</h2>
              
              <div className="space-y-6">
                <section>
                  <h3 className="text-xl font-bold text-dark mb-3">Using AI Chat</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    PrepWise includes AI-powered chat agents that can help you understand concepts, 
                    answer questions, and provide study guidance.
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                    <li>Access AI Chat from quiz mode or the main interface</li>
                    <li>Ask questions about your study material</li>
                    <li>Get explanations, examples, and clarifications</li>
                    <li>Use hints when stuck on quiz questions</li>
                  </ol>
                </section>

                <section>
                  <h3 className="text-xl font-bold text-dark mb-3">Best Practices</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>Ask specific questions for better answers</li>
                    <li>Use AI chat to clarify concepts you don't understand</li>
                    <li>Request examples or analogies to aid understanding</li>
                    <li>Don't rely solely on AI - use it as a study aid</li>
                  </ul>
                </section>
              </div>

              <div className="mt-12 flex justify-end">
                <button
                  onClick={handleNext}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all hover:scale-105 hover:shadow-lg font-medium"
                >
                  Next →
                </button>
              </div>
            </div>
          )
        }

        return null

      case 'learning-analytics':
        return (
          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-dark mb-4">Learning Analytics</h1>
            
            <div className="space-y-6">
              <section>
                <p className="text-gray-700 leading-relaxed text-lg mb-6">
                  PrepWise tracks your learning progress to help you understand your study patterns 
                  and improve your performance over time.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-dark mb-4">Available Metrics</h2>
                <div className="space-y-4">
                  <div className="bg-secondary rounded-lg p-5">
                    <h3 className="text-xl font-bold text-dark mb-2">📈 Study Streaks</h3>
                    <p className="text-gray-700">
                      Track your daily study consistency. Maintain streaks to build better study habits.
                    </p>
                  </div>
                  <div className="bg-secondary rounded-lg p-5">
                    <h3 className="text-xl font-bold text-dark mb-2">📊 Quiz Performance</h3>
                    <p className="text-gray-700">
                      View your quiz scores, accuracy rates, and improvement trends over time.
                    </p>
                  </div>
                  <div className="bg-secondary rounded-lg p-5">
                    <h3 className="text-xl font-bold text-dark mb-2">🎴 Flashcard Mastery</h3>
                    <p className="text-gray-700">
                      See how many flashcards you've mastered and which ones need more review.
                    </p>
                  </div>
                  <div className="bg-secondary rounded-lg p-5">
                    <h3 className="text-xl font-bold text-dark mb-2">⏱️ Time Spent Studying</h3>
                    <p className="text-gray-700">
                      Monitor the time you spend on different study activities to optimize your schedule.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-dark mb-4">Using Analytics</h2>
                <p className="text-gray-700 leading-relaxed">
                  Visit the Analytics page from the sidebar to view detailed charts and statistics. 
                  Use this data to identify your strengths, areas for improvement, and adjust your 
                  study strategy accordingly.
                </p>
              </section>

              {/* Image placeholder */}
              <div className="mt-8 bg-gray-100 rounded-lg p-8 flex items-center justify-center min-h-[300px] border-2 border-dashed border-gray-300">
                <p className="text-gray-500 text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Image placeholder for Analytics dashboard
                </p>
              </div>
            </div>

            <div className="mt-12 flex justify-end">
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all hover:scale-105 hover:shadow-lg font-medium"
              >
                Next →
              </button>
            </div>
          </div>
        )

      case 'faq':
        return (
          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-dark mb-4">Frequently Asked Questions</h1>
            
            <div className="space-y-6">
              <section className="space-y-6">
                <div className="bg-secondary rounded-lg p-6">
                  <h3 className="text-xl font-bold text-dark mb-3">How do I upload files?</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Navigate to the Notes section, click "Upload File" or "Generate Notes", and select 
                    your file. Supported formats include PDF, DOCX, TXT, and images (with OCR support).
                  </p>
                </div>

                <div className="bg-secondary rounded-lg p-6">
                  <h3 className="text-xl font-bold text-dark mb-3">Can I edit generated quizzes and flashcards?</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Yes! After generation, you can edit any question, answer, or flashcard card. 
                    Simply click the edit button and make your changes.
                  </p>
                </div>

                <div className="bg-secondary rounded-lg p-6">
                  <h3 className="text-xl font-bold text-dark mb-3">How does spaced repetition work?</h3>
                  <p className="text-gray-700 leading-relaxed">
                    The algorithm tracks your performance on each card and adjusts review intervals. 
                    Cards you find easy are shown less frequently, while difficult cards appear more often 
                    until you master them.
                  </p>
                </div>

                <div className="bg-secondary rounded-lg p-6">
                  <h3 className="text-xl font-bold text-dark mb-3">Is my data secure?</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Yes, all your data is stored securely and is only accessible to you. We use industry-standard 
                    security practices to protect your information.
                  </p>
                </div>

                <div className="bg-secondary rounded-lg p-6">
                  <h3 className="text-xl font-bold text-dark mb-3">Can I organize my study materials?</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Absolutely! You can create folders to organize your notes, quizzes, and flashcards. 
                    Each folder can have a different color for easy identification.
                  </p>
                </div>

                <div className="bg-secondary rounded-lg p-6">
                  <h3 className="text-xl font-bold text-dark mb-3">What if I have more questions?</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Use the Feedback button at the bottom of the sidebar to send us your questions, 
                    suggestions, or report any issues you encounter.
                  </p>
                </div>
              </section>
            </div>

            <div className="mt-12 flex justify-end">
              <button
                onClick={() => setActiveSection('introduction')}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all hover:scale-105 hover:shadow-lg font-medium"
              >
                Back to Introduction
              </button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { user, error } = await authHelpers.getCurrentUser()
        if (error || !user) {
          router.push('/login')
          return
        }
        setUser(user)
        setLoading(false)
      } catch (error) {
        console.error('Error checking user:', error)
        router.push('/login')
      }
    }
    checkUser()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-space-grotesk">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white font-space-grotesk">
      {/* Header */}
      <header className="bg-white border-b-2 border-black fixed top-0 left-0 right-0 z-50">
        <nav className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-dark">
                <span className="text-black">Prep</span>
                <span className="text-primary">Wise</span>
              </h1>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-gray-700 hover:text-primary transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </nav>
      </header>

      <div className="flex min-h-screen pt-16">
        {/* Fixed Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 fixed left-0 top-16 bottom-0 overflow-y-auto">
          <div className="p-6 flex flex-col h-full">
            <nav className="space-y-1 flex-1">
              {sections.map((section) => (
                <div key={section.id}>
                  <button
                    onClick={() => handleSectionClick(section.id)}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                      activeSection === section.id
                        ? 'bg-primary text-white font-semibold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {section.title}
                  </button>
                  {section.subsections && activeSection === section.id && (
                    <div className="ml-4 mt-2 space-y-1">
                      {section.subsections.map((subsection) => (
                        <button
                          key={subsection.id}
                          onClick={() => handleSubsectionClick(subsection.id)}
                          className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                            activeSubsection === subsection.id
                              ? 'bg-primary text-white font-medium'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {subsection.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* Feedback Button at Bottom */}
            <div className="mt-auto pt-8 border-t border-gray-200">
              <button
                onClick={() => {
                  // You can implement feedback functionality here
                  alert('Feedback feature coming soon!')
                }}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Feedback</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area - Centered */}
        <main className="flex-1 ml-64">
          <div className="max-w-4xl mx-auto px-8 py-12">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}

