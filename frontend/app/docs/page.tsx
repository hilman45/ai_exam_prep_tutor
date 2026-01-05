'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, authHelpers } from '../../lib/supabase'
import FeedbackModal from '../../components/FeedbackModal'

type SectionId = 'introduction' | 'who-should-use' | 'core-features' | 'how-to-use' | 'learning-analytics' | 'faq'

interface Section {
  id: SectionId
  title: string
  icon?: JSX.Element
  subsections?: { id: string; title: string }[]
}

const sections: Section[] = [
  { 
    id: 'introduction', 
    title: 'Introduction',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  { 
    id: 'who-should-use', 
    title: 'Who Should Use',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  },
  { 
    id: 'core-features', 
    title: 'Core Features',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    )
  },
  { 
    id: 'how-to-use', 
    title: 'How to Use',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    subsections: [
      { id: 'notes', title: 'Notes' },
      { id: 'quizzes', title: 'Quizzes' },
      { id: 'flashcards', title: 'Flashcards' },
      { id: 'ai-chat-agents', title: 'AI Chat Agents' }
    ]
  },
  { 
    id: 'learning-analytics', 
    title: 'Learning Analytics',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  { 
    id: 'faq', 
    title: 'FAQ',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
]

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('introduction')
  const [activeSubsection, setActiveSubsection] = useState<string | null>(null)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
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

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index)
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'introduction':
        return (
          <div className="space-y-6 animate-fadeIn">
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
              <div className="mt-8 bg-gray-50 rounded-xl p-8 flex items-center justify-center min-h-[300px] border-2 border-dashed border-gray-200">
                <p className="text-gray-500 text-center flex flex-col items-center">
                  <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Image placeholder for PrepWise overview</span>
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
          <div className="space-y-6 animate-fadeIn">
            <h1 className="text-4xl font-bold text-dark mb-4">Who Should Use PrepWise</h1>
            
            <div className="space-y-6">
              <p className="text-gray-700 leading-relaxed text-lg">
                PrepWise is designed for anyone who wants to improve their exam preparation and learning efficiency. 
                Whether you're a student, professional, or lifelong learner, PrepWise can help you achieve your goals.
              </p>

              <section className="mt-6">
                <h2 className="text-2xl font-bold text-dark mb-4">Ideal for:</h2>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                        <div className="flex items-center mb-2">
                             <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 text-primary">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                             </div>
                             <h3 className="font-bold text-dark">Students</h3>
                        </div>
                        <p className="text-sm text-gray-600 pl-11">Preparing for exams, tests, or standardized assessments.</p>
                    </div>
                    <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                        <div className="flex items-center mb-2">
                             <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 text-blue-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                             </div>
                             <h3 className="font-bold text-dark">Professionals</h3>
                        </div>
                        <p className="text-sm text-gray-600 pl-11">Studying for certifications or licensing exams.</p>
                    </div>
                    <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                        <div className="flex items-center mb-2">
                             <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3 text-green-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                             </div>
                             <h3 className="font-bold text-dark">Language Learners</h3>
                        </div>
                        <p className="text-sm text-gray-600 pl-11">Looking to expand vocabulary and improve retention.</p>
                    </div>
                    <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                        <div className="flex items-center mb-2">
                             <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-3 text-purple-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                             </div>
                             <h3 className="font-bold text-dark">Lifelong Learners</h3>
                        </div>
                        <p className="text-sm text-gray-600 pl-11">Memorize information effectively using science-backed methods.</p>
                    </div>
                </div>
              </section>

              {/* Image placeholder */}
              <div className="mt-8 bg-gray-50 rounded-xl p-8 flex items-center justify-center min-h-[250px] border-2 border-dashed border-gray-200">
                <p className="text-gray-500 text-center flex flex-col items-center">
                  <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Image placeholder for target users</span>
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
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h1 className="text-4xl font-bold text-dark mb-2">Core Features Overview</h1>
              <p className="text-xl text-gray-600">Everything you need to master your studies.</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: "Smart Notes",
                  desc: "Upload lecture notes, PDFs, or documents. We extract and organize content for easy access.",
                  icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
                  color: "text-primary",
                  bg: "bg-primary/10"
                },
                {
                  title: "AI Quizzes",
                  desc: "Generate practice quizzes from notes. Test knowledge with MCQ and short-answer questions.",
                  icon: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
                  color: "text-blue-600",
                  bg: "bg-blue-100"
                },
                {
                  title: "Flashcards",
                  desc: "Create flashcards with spaced repetition. Review at optimal intervals to maximize retention.",
                  icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
                  color: "text-accent",
                  bg: "bg-accent/10"
                },
                {
                  title: "AI Chat Agents",
                  desc: "Get instant help. Our AI tutors explain concepts, provide examples, and guide your learning.",
                  icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
                  color: "text-green-600",
                  bg: "bg-green-100"
                },
                {
                  title: "Analytics",
                  desc: "Track progress, study streaks, and metrics. Understand your patterns and improve over time.",
                  icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
                  color: "text-orange-600",
                  bg: "bg-orange-100"
                },
                {
                  title: "Organized Folders",
                  desc: "Keep everything structured. Organize your study materials into folders for easy access.",
                  icon: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z",
                  color: "text-purple-600",
                  bg: "bg-purple-100"
                }
              ].map((feature, idx) => (
                <div key={idx} className="group bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <svg className={`w-6 h-6 ${feature.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-dark mb-3 group-hover:text-primary transition-colors">{feature.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              ))}
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
            <div className="space-y-6 animate-fadeIn">
              <h1 className="text-4xl font-bold text-dark mb-4">How to Use PrepWise</h1>
              <h2 className="text-2xl font-semibold text-gray-700 mb-6">Notes</h2>
              
              <div className="space-y-6">
                <section>
                  <h3 className="text-xl font-bold text-dark mb-3">Uploading Notes</h3>
                  <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                    <ol className="list-decimal list-inside space-y-3 text-gray-700">
                      <li>Navigate to the Notes section from the sidebar</li>
                      <li>Click "Upload File" or "Generate Notes"</li>
                      <li>Select your file (PDF, DOCX, TXT, or images)</li>
                      <li>Wait for the file to be processed and text extracted</li>
                      <li>Your notes will be saved and organized automatically</li>
                    </ol>
                  </div>
                </section>

                <section>
                  <h3 className="text-xl font-bold text-dark mb-3">Viewing and Managing Notes</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Once uploaded, you can view your notes, edit them, or organize them into folders. 
                    Notes can be used as the basis for generating quizzes and flashcards.
                  </p>
                </section>

                {/* Image placeholder */}
                <div className="mt-6 bg-gray-50 rounded-xl p-8 flex items-center justify-center min-h-[300px] border-2 border-dashed border-gray-200">
                  <p className="text-gray-500 text-center flex flex-col items-center">
                    <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Image placeholder for Notes feature</span>
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
            <div className="space-y-6 animate-fadeIn">
              <h1 className="text-4xl font-bold text-dark mb-4">How to Use PrepWise</h1>
              <h2 className="text-2xl font-semibold text-gray-700 mb-6">Quizzes</h2>
              
              <div className="space-y-6">
                <section>
                  <h3 className="text-xl font-bold text-dark mb-3">Generating Quizzes</h3>
                  <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                    <ol className="list-decimal list-inside space-y-3 text-gray-700">
                      <li>Select a file from your notes</li>
                      <li>Click "Generate Quiz"</li>
                      <li>Choose between Multiple Choice or Short Answer questions</li>
                      <li>Wait for AI to generate questions based on your content</li>
                      <li>Review and edit questions if needed</li>
                    </ol>
                  </div>
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
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-blue-900 mb-2 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        AI Chat Assistance
                    </h3>
                    <p className="text-blue-800 leading-relaxed">
                        While taking quizzes, you can use the AI Chat feature to get help with questions 
                        you're struggling with. The AI can provide hints, explanations, and additional context.
                    </p>
                  </div>
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
            <div className="space-y-6 animate-fadeIn">
              <h1 className="text-4xl font-bold text-dark mb-4">How to Use PrepWise</h1>
              <h2 className="text-2xl font-semibold text-gray-700 mb-6">Flashcards</h2>
              
              <div className="space-y-6">
                <section>
                  <h3 className="text-xl font-bold text-dark mb-3">Generating Flashcards</h3>
                  <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                    <ol className="list-decimal list-inside space-y-3 text-gray-700">
                      <li>Select a file from your notes</li>
                      <li>Click "Generate Flashcards"</li>
                      <li>AI will automatically create term-definition pairs</li>
                      <li>Review and edit flashcards as needed</li>
                    </ol>
                  </div>
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
                <div className="mt-6 bg-gray-50 rounded-xl p-8 flex items-center justify-center min-h-[300px] border-2 border-dashed border-gray-200">
                  <p className="text-gray-500 text-center flex flex-col items-center">
                    <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span>Image placeholder for Flashcards feature</span>
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
            <div className="space-y-6 animate-fadeIn">
              <h1 className="text-4xl font-bold text-dark mb-4">How to Use PrepWise</h1>
              <h2 className="text-2xl font-semibold text-gray-700 mb-6">AI Chat Agents</h2>
              
              <div className="space-y-6">
                <section>
                  <h3 className="text-xl font-bold text-dark mb-3">Using AI Chat</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    PrepWise includes AI-powered chat agents that can help you understand concepts, 
                    answer questions, and provide study guidance.
                  </p>
                  <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                    <ol className="list-decimal list-inside space-y-3 text-gray-700">
                      <li>Access AI Chat from quiz mode or the main interface</li>
                      <li>Ask questions about your study material</li>
                      <li>Get explanations, examples, and clarifications</li>
                      <li>Use hints when stuck on quiz questions</li>
                    </ol>
                  </div>
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
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h1 className="text-4xl font-bold text-dark mb-4">Learning Analytics</h1>
              <p className="text-xl text-gray-600">
                Data-driven insights to supercharge your study sessions.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: "Study Streaks",
                  desc: "Consistency is key. Track your daily activity and maintain streaks to build lasting habits.",
                  icon: "M13 10V3L4 14h7v7l9-11h-7z",
                  color: "text-orange-500",
                  bg: "bg-orange-50",
                  stats: "7 Days"
                },
                {
                  title: "Quiz Performance",
                  desc: "Detailed breakdown of your quiz scores. Identify strong subjects and areas needing review.",
                  icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
                  color: "text-blue-500",
                  bg: "bg-blue-50",
                  stats: "85% Avg"
                },
                {
                  title: "Flashcard Mastery",
                  desc: "Visualize your retention rates. See how many cards moved from 'Learning' to 'Mastered'.",
                  icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
                  color: "text-green-500",
                  bg: "bg-green-50",
                  stats: "124 Cards"
                },
                {
                  title: "Time Management",
                  desc: "Understand how you spend your time. Optimize your schedule for maximum efficiency.",
                  icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
                  color: "text-purple-500",
                  bg: "bg-purple-50",
                  stats: "12h Studied"
                }
              ].map((metric, idx) => (
                <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl ${metric.bg} ${metric.color}`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={metric.icon} />
                      </svg>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${metric.bg} ${metric.color}`}>
                      Example: {metric.stats}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-dark mb-2">{metric.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{metric.desc}</p>
                </div>
              ))}
            </div>

            <section className="bg-secondary/30 rounded-2xl p-8 border border-gray-200">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-dark mb-4">How to Use Analytics</h2>
                        <p className="text-gray-700 leading-relaxed mb-4">
                        Visit the Analytics page from the sidebar to view detailed charts and statistics. 
                        Use this data to identify your strengths, areas for improvement, and adjust your 
                        study strategy accordingly.
                        </p>
                        <ul className="space-y-2">
                            <li className="flex items-center text-gray-700">
                                <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Check daily to maintain streaks
                            </li>
                            <li className="flex items-center text-gray-700">
                                <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Review weak topics based on quiz scores
                            </li>
                        </ul>
                    </div>
                    {/* Visual placeholder for graph */}
                    <div className="w-full md:w-1/3 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-end justify-between h-32 space-x-2">
                            <div className="w-1/5 bg-primary/20 rounded-t-lg h-[40%]"></div>
                            <div className="w-1/5 bg-primary/40 rounded-t-lg h-[60%]"></div>
                            <div className="w-1/5 bg-primary/60 rounded-t-lg h-[30%]"></div>
                            <div className="w-1/5 bg-primary/80 rounded-t-lg h-[80%]"></div>
                            <div className="w-1/5 bg-primary rounded-t-lg h-[55%]"></div>
                        </div>
                        <div className="mt-2 text-center text-xs text-gray-400">Activity Overview</div>
                    </div>
                </div>
            </section>

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
          <div className="space-y-6 animate-fadeIn">
            <h1 className="text-4xl font-bold text-dark mb-4">Frequently Asked Questions</h1>
            <p className="text-gray-600 mb-8">Common questions about using PrepWise.</p>
            
            <div className="space-y-4">
              {[
                {
                  q: "How do I upload files?",
                  a: "Navigate to the Notes section, click 'Upload File' or 'Generate Notes', and select your file. Supported formats include PDF, DOCX, TXT, and images (with OCR support)."
                },
                {
                  q: "Can I edit generated quizzes and flashcards?",
                  a: "Yes! After generation, you can edit any question, answer, or flashcard card. Simply click the edit button and make your changes."
                },
                {
                  q: "How does spaced repetition work?",
                  a: "The algorithm tracks your performance on each card and adjusts review intervals. Cards you find easy are shown less frequently, while difficult cards appear more often until you master them."
                },
                {
                  q: "Is my data secure?",
                  a: "Yes, all your data is stored securely and is only accessible to you. We use industry-standard security practices to protect your information."
                },
                {
                  q: "Can I organize my study materials?",
                  a: "Absolutely! You can create folders to organize your notes, quizzes, and flashcards. Each folder can have a different color for easy identification."
                },
                {
                  q: "What if I have more questions?",
                  a: "Use the Feedback button at the bottom of the sidebar to send us your questions, suggestions, or report any issues you encounter."
                }
              ].map((faq, index) => (
                <div key={index} className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:border-primary/30 transition-colors">
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full px-6 py-4 flex justify-between items-center text-left bg-white hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-bold text-dark text-lg">{faq.q}</span>
                    <span className={`transform transition-transform duration-200 ${openFaqIndex === index ? 'rotate-180' : ''}`}>
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </span>
                  </button>
                  <div 
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                        openFaqIndex === index ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="px-6 pb-6 text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                        {faq.a}
                    </div>
                  </div>
                </div>
              ))}
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
              className="px-4 py-2 text-gray-700 hover:text-primary transition-colors flex items-center font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
          </div>
        </nav>
      </header>

      <div className="flex min-h-screen pt-16">
        {/* Fixed Sidebar */}
        <aside className="w-72 bg-gray-50/50 border-r border-gray-200 fixed left-0 top-16 bottom-0 overflow-y-auto">
          <div className="p-6 flex flex-col h-full">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">Documentation</h2>
            <nav className="space-y-1 flex-1">
              {sections.map((section) => (
                <div key={section.id} className="mb-2">
                  <button
                    onClick={() => handleSectionClick(section.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center space-x-3 group ${
                      activeSection === section.id
                        ? 'bg-primary text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-dark'
                    }`}
                  >
                    <span className={`${activeSection === section.id ? 'text-white' : 'text-gray-400 group-hover:text-primary'}`}>
                      {section.icon}
                    </span>
                    <span className="font-medium">{section.title}</span>
                    {activeSection === section.id && (
                        <span className="ml-auto">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </span>
                    )}
                  </button>
                  {section.subsections && activeSection === section.id && (
                    <div className="ml-10 mt-2 space-y-1 border-l-2 border-gray-200 pl-2">
                      {section.subsections.map((subsection) => (
                        <button
                          key={subsection.id}
                          onClick={() => handleSubsectionClick(subsection.id)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors relative ${
                            activeSubsection === subsection.id
                              ? 'text-primary font-semibold bg-primary/5'
                              : 'text-gray-500 hover:text-dark hover:bg-gray-100'
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
            <div className="mt-auto pt-6 border-t border-gray-200">
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-600 mb-3">Have suggestions or found a bug?</p>
                <button
                    onClick={() => setIsFeedbackOpen(true)}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-primary hover:text-primary text-gray-700 rounded-lg transition-all shadow-sm hover:shadow font-medium text-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <span>Give Feedback</span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area - Centered */}
        <main className="flex-1 ml-72">
          <div className="max-w-4xl mx-auto px-8 py-12">
            {renderContent()}
          </div>
        </main>
      </div>

      <FeedbackModal 
        isOpen={isFeedbackOpen} 
        onClose={() => setIsFeedbackOpen(false)} 
      />
    </div>
  )
}
