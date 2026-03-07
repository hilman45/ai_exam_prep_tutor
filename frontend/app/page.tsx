'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import LottieAnimation from '../components/LottieAnimation'

export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    if (sectionId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      const element = document.getElementById(sectionId)
      if (element) {
        const headerOffset = 80
        const elementPosition = element.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        })
      }
    }
    setIsMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-white font-space-grotesk selection:bg-primary selection:text-white">
      {/* Header / Navbar */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-2' : 'bg-transparent py-4'
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0 cursor-pointer" onClick={() => scrollToSection('home')}>
              <img src="/logo.svg" alt="PrepWise" width={180} height={50} className="w-[180px] h-[50px] object-contain" />
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => scrollToSection('home')}
                className="text-gray-600 hover:text-primary font-medium transition-colors"
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className="text-gray-600 hover:text-primary font-medium transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('benefits')}
                className="text-gray-600 hover:text-primary font-medium transition-colors"
              >
                Benefits
              </button>
              <div className="flex items-center space-x-4 ml-4">
                <Link href="/login" className="text-gray-900 font-bold hover:text-primary transition-colors">
                  Log in
                </Link>
                <Link 
                  href="/signup" 
                  className="bg-primary text-white px-5 py-2.5 rounded-full font-bold hover:bg-opacity-90 transition-all hover:shadow-lg hover:-translate-y-0.5"
                >
                  Sign Up Free
                </Link>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-900 p-2"
              >
                {isMenuOpen ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-100 shadow-xl p-4 flex flex-col space-y-4 animate-in slide-in-from-top-5">
              <button
                onClick={() => scrollToSection('home')}
                className="text-left text-gray-900 font-medium py-2 px-4 hover:bg-gray-50 rounded-lg"
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className="text-left text-gray-900 font-medium py-2 px-4 hover:bg-gray-50 rounded-lg"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('benefits')}
                className="text-left text-gray-900 font-medium py-2 px-4 hover:bg-gray-50 rounded-lg"
              >
                Benefits
              </button>
              <div className="pt-2 border-t border-gray-100 flex flex-col space-y-3">
                <Link href="/login" className="text-center w-full py-3 text-gray-900 font-bold border border-gray-200 rounded-xl hover:bg-gray-50">
                  Log in
                </Link>
                <Link href="/signup" className="text-center w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-opacity-90 shadow-md">
                  Sign Up Free
                </Link>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <section id="home" className="pt-32 pb-20 lg:pt-40 lg:pb-32 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left side - Text content */}
            <div className="text-center lg:text-left z-10">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-primary text-sm font-bold mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
                AI-Powered Study Companion
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-[1.1] tracking-tight animate-in fade-in slide-in-from-bottom-6 duration-1000">
                Study Smarter, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">Not Harder</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000">
                PrepWise is your personal AI tutor. We turn your study materials into interactive quizzes, flashcards, and summaries instantly.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-in fade-in slide-in-from-bottom-10 duration-1000">
                <Link href="/signup" className="bg-primary text-white px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/30 flex items-center justify-center">
                  Get Started Free
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <button onClick={() => scrollToSection('features')} className="bg-white text-gray-900 px-8 py-4 rounded-full border-2 border-gray-200 font-bold text-lg transition-all duration-300 hover:border-gray-900 hover:bg-gray-50">
                  See How It Works
                </button>
              </div>
              
              <div className="mt-10 flex items-center justify-center lg:justify-start gap-4 text-sm text-gray-500 font-medium">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`w-8 h-8 rounded-full border-2 border-white bg-gray-${i*100 + 100} flex items-center justify-center text-xs overflow-hidden`}>
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="User" />
                    </div>
                  ))}
                </div>
                <p>Trusted by 10,000+ students</p>
              </div>
            </div>

            {/* Right side - Visual */}
            <div className="relative lg:h-[600px] flex items-center justify-center animate-in fade-in zoom-in duration-1000 delay-200">
              <div className="absolute top-0 right-0 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
              <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
              
              <div className="relative w-full max-w-lg aspect-square bg-white rounded-3xl shadow-2xl border border-gray-100 p-2 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="w-full h-full bg-gray-50 rounded-2xl overflow-hidden relative flex items-center justify-center">
                  <LottieAnimation 
                    src="https://lottie.host/1b1c3bdb-868b-4011-86cb-61b4339f1f54/ZREdlsnRVK.lottie"
                    className="w-full h-full p-8"
                    autoplay={true}
                    loop={true}
                  />
                  
                  {/* Floating cards */}
                  <div className="absolute -left-8 top-1/4 bg-white p-4 rounded-xl shadow-lg border border-gray-100 max-w-[180px] animate-float">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <span className="font-bold text-sm">Quiz Ready!</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full w-full overflow-hidden">
                      <div className="h-full bg-green-500 w-3/4 rounded-full"></div>
                    </div>
                  </div>

                  <div className="absolute -right-6 bottom-1/4 bg-white p-4 rounded-xl shadow-lg border border-gray-100 max-w-[200px] animate-float animation-delay-1500">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                        A+
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900">Study Streak</p>
                        <p className="text-xs text-gray-500">7 days in a row 🔥</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-primary font-bold tracking-wide uppercase text-sm mb-3">Powerful Features</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Everything you need to ace your exams</h3>
            <p className="text-xl text-gray-600">Stop wasting time organizing. Let AI handle the busy work while you focus on understanding the material.</p>
          </div>

          <div className="space-y-24">
            {/* Feature 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-2 transform -rotate-1 hover:rotate-0 transition-transform duration-500">
                  <div className="bg-purple-50 rounded-2xl h-[400px] flex items-center justify-center overflow-hidden">
                     {/* Placeholder for feature image/animation */}
                     <div className="text-center p-8">
                        <div className="w-20 h-20 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-6 text-4xl">📝</div>
                        <h4 className="text-xl font-bold text-gray-900 mb-2">Smart Summaries</h4>
                        <p className="text-gray-500">Upload any document and get key points instantly.</p>
                     </div>
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-6">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">Intelligent Notes & Summaries</h3>
                <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                  Overwhelmed by hundreds of pages? Upload your textbooks, lecture slides, or notes, and our AI will extract the most important concepts, definitions, and summaries in seconds.
                </p>
                <ul className="space-y-3">
                  {['Upload PDF, DOCX, or TXT files', 'Get concise bullet-point summaries', 'Auto-highlighted key terms'].map((item, i) => (
                    <li key={i} className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-6">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">Instant Practice Quizzes</h3>
                <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                  Stop passively reading and start actively recalling. Generate custom quizzes from your materials to test your knowledge and identify gaps before the real exam.
                </p>
                <ul className="space-y-3">
                  {['Multiple choice & open-ended questions', 'Instant feedback and explanations', 'Difficulty levels that adapt to you'].map((item, i) => (
                    <li key={i} className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-2 transform rotate-1 hover:rotate-0 transition-transform duration-500">
                  <div className="bg-blue-50 rounded-2xl h-[400px] flex items-center justify-center overflow-hidden">
                     {/* Placeholder for feature image/animation */}
                     <div className="text-center p-8">
                        <div className="w-20 h-20 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-6 text-4xl">🎯</div>
                        <h4 className="text-xl font-bold text-gray-900 mb-2">Quiz Mode</h4>
                        <p className="text-gray-500">Test yourself and get instant feedback.</p>
                     </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-2 transform -rotate-1 hover:rotate-0 transition-transform duration-500">
                  <div className="bg-yellow-50 rounded-2xl h-[400px] flex items-center justify-center overflow-hidden">
                     {/* Placeholder for feature image/animation */}
                     <div className="text-center p-8">
                        <div className="w-20 h-20 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-6 text-4xl">⚡</div>
                        <h4 className="text-xl font-bold text-gray-900 mb-2">Flashcards</h4>
                        <p className="text-gray-500">Master terms with spaced repetition.</p>
                     </div>
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center text-yellow-600 mb-6">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">AI-Generated Flashcards</h3>
                <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                  Memorize definitions and formulas effortlessly. Our AI automatically creates flashcard decks from your notes, so you can study on the go.
                </p>
                <ul className="space-y-3">
                  {['Auto-generated from your content', 'Spaced repetition learning', 'Mobile-friendly review'].map((item, i) => (
                    <li key={i} className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-primary font-bold tracking-wide uppercase text-sm mb-3">Why PrepWise?</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Built for students who want to succeed</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Save 10+ Hours Weekly',
                desc: 'Stop spending hours summarizing notes. Let AI do the heavy lifting so you can focus on learning.',
                icon: '⏰',
                color: 'bg-red-50 text-red-600'
              },
              {
                title: 'Boost Retention',
                desc: 'Active recall through quizzes and flashcards is proven to improve long-term memory retention.',
                icon: '🧠',
                color: 'bg-indigo-50 text-indigo-600'
              },
              {
                title: 'Study Anywhere',
                desc: 'Access your materials, quizzes, and flashcards from any device. Your study partner is always with you.',
                icon: '📱',
                color: 'bg-green-50 text-green-600'
              }
            ].map((benefit, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-primary/30 hover:shadow-xl transition-all duration-300 group">
                <div className={`w-14 h-14 ${benefit.color} rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform`}>
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{benefit.title}</h3>
                <p className="text-gray-600 leading-relaxed">
                  {benefit.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto bg-primary rounded-[2.5rem] p-8 md:p-16 text-center relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full translate-x-1/2 translate-y-1/2"></div>
          
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Ready to upgrade your grades?</h2>
            <p className="text-white/90 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
              Join thousands of students studying smarter with PrepWise. Start for free today.
            </p>
            <Link href="/signup" className="inline-block bg-white text-primary px-10 py-4 rounded-full font-bold text-lg transition-all duration-300 hover:bg-gray-50 hover:scale-105 hover:shadow-lg">
              Start Studying for Free
            </Link>
            <p className="text-white/70 text-sm mt-6">No credit card required • Free plan available</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white pt-20 pb-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <img src="/logo.svg" alt="PrepWise" width={180} height={50} className="w-[180px] h-[50px] object-contain brightness-0 invert opacity-90" />
              </div>
              <p className="text-gray-400 leading-relaxed mb-6">
                Your AI-powered study companion. We help you learn faster, remember more, and ace your exams.
              </p>
              <div className="flex space-x-4">
                {['twitter', 'github', 'discord'].map((social) => (
                  <a key={social} href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white transition-all">
                    <span className="sr-only">{social}</span>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10s10-4.477 10-10c0-5.523-4.477-10-10-10z"/></svg>
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">Product</h4>
              <ul className="space-y-4 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Testimonials</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">Company</h4>
              <ul className="space-y-4 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">Legal</h4>
              <ul className="space-y-4 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-500 text-sm">
            <p>© 2025 PrepWise. All rights reserved.</p>
            <div className="flex space-x-6">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Sitemap</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
