'use client'

import { useState } from 'react'
import LottieAnimation from '../components/LottieAnimation'

export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const scrollToSection = (sectionId: string) => {
    if (sectionId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      const element = document.getElementById(sectionId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
    setIsMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header / Navbar */}
      <header className="bg-white border-b-2 border-black sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-dark">PrepWise</h1>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <button
                  onClick={() => scrollToSection('home')}
                  className="text-dark hover:text-primary px-3 py-2 text-sm font-medium transition-colors"
                >
                  Home
                </button>
                <button
                  onClick={() => scrollToSection('benefits')}
                  className="text-dark hover:text-primary px-3 py-2 text-sm font-medium transition-colors"
                >
                  Benefits
                </button>
                <button
                  onClick={() => scrollToSection('features')}
                  className="text-dark hover:text-primary px-3 py-2 text-sm font-medium transition-colors"
                >
                  Features
                </button>
                <button className="btn-secondary text-sm">
                  Login
                </button>
                <button className="btn-primary text-sm">
                  Sign Up
                </button>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-dark hover:text-primary p-2"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t-2 border-black">
                <button
                  onClick={() => scrollToSection('home')}
                  className="text-dark hover:text-primary block px-3 py-2 text-base font-medium"
                >
                  Home
                </button>
                <button
                  onClick={() => scrollToSection('benefits')}
                  className="text-dark hover:text-primary block px-3 py-2 text-base font-medium"
                >
                  Benefits
                </button>
                <button
                  onClick={() => scrollToSection('features')}
                  className="text-dark hover:text-primary block px-3 py-2 text-base font-medium"
                >
                  Features
                </button>
                <button className="btn-secondary w-full mt-2">
                  Login
                </button>
                <button className="btn-primary w-full mt-2">
                  Sign Up
                </button>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <section id="home" className="bg-primary border-2 border-black mx-4 mt-8 rounded-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Text content */}
            <div className="text-white">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Never study alone again
              </h1>
              <p className="text-lg md:text-xl mb-8 opacity-90">
                PrepWise is your AI study partner—always ready to quiz you, simplify tricky topics, and keep you on track until exam day.
              </p>
              <button className="bg-black text-white px-8 py-4 rounded-lg border-2 border-black font-medium text-lg transition-all duration-200 hover:scale-105 hover:shadow-lg">
                Get Started
              </button>
            </div>

            {/* Right side - Lottie Animation */}
            <div className="flex items-center justify-center">
              <div className="w-full h-80 bg-white/10 rounded-lg border-2 border-white/20 flex items-center justify-center">
                {/* Replace with your Lottie animation URL */}
                <LottieAnimation 
                  src="https://lottie.host/your-animation-url-here.json"
                  className="w-full h-full"
                  autoplay={true}
                  loop={true}
                />
                {/* Fallback text if animation fails to load */}
                <p className="text-white/60 text-lg absolute">Illustration placeholder</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-accent mb-12">
            Benefits
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Benefit Card 1 */}
            <div className="card">
              <h3 className="text-xl font-bold text-dark mb-4">Study made Simple</h3>
              <p className="text-dark">
                Skip the stress of endless notes. PrepWise transforms your materials into clean, structured insights so you can focus on what really matters—learning.
              </p>
            </div>

            {/* Benefit Card 2 */}
            <div className="card">
              <h3 className="text-xl font-bold text-dark mb-4">Learn what matters most</h3>
              <p className="text-dark">
                Our AI pinpoints your weak spots and builds practice sessions that help you improve faster, smarter, and with confidence.
              </p>
            </div>

            {/* Benefit Card 3 */}
            <div className="card">
              <h3 className="text-xl font-bold text-dark mb-4">Stay on track</h3>
              <p className="text-dark">
                See your daily progress at a glance. With smart analytics, PrepWise shows you what's working, what's not, and keeps you moving toward your exam goals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-accent mb-12">
            Features
          </h2>
          <div className="space-y-8">
            {/* Feature Card 1 - Intelligent Notes */}
            <div className="bg-primary rounded-lg border-2 border-black p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="flex items-center justify-center">
                  <div className="w-full h-48 bg-white/10 rounded-lg border-2 border-white/20 flex items-center justify-center relative">
                    {/* Replace with your Intelligent Notes Lottie animation URL */}
                    <LottieAnimation 
                      src="https://lottie.host/1b1c3bdb-868b-4011-86cb-61b4339f1f54/ZREdlsnRVK.lottie"
                      className="w-full h-full"
                      autoplay={true}
                      loop={true}
                    />
                    {/* Fallback text if animation fails to load */}
                    <p className="text-white/60 absolute">Lottie animation placeholder</p>
                  </div>
                </div>
                <div className="text-white">
                  <h3 className="text-2xl font-bold mb-4">Intelligent Notes</h3>
                  <p className="text-lg opacity-90">
                    Organize your study materials into clear, structured notes. PrepWise can summarize, highlight key points, and make your learning resources easier to revisit.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature Card 2 - Smart Quizzes */}
            <div className="bg-dark rounded-lg border-2 border-black p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="text-white">
                  <h3 className="text-2xl font-bold mb-4">Smart Quizzes</h3>
                  <p className="text-lg opacity-90">
                    Generate practice quizzes instantly from your notes or textbooks. Get immediate feedback and explanations to strengthen your understanding and prep for exams with confidence.
                  </p>
                </div>
                <div className="flex items-center justify-center">
                  <div className="w-full h-48 bg-white/10 rounded-lg border-2 border-white/20 flex items-center justify-center relative">
                    {/* Replace with your Smart Quizzes Lottie animation URL */}
                    <LottieAnimation 
                      src="https://lottie.host/smart-quizzes-animation.json"
                      className="w-full h-full"
                      autoplay={true}
                      loop={true}
                    />
                    {/* Fallback text if animation fails to load */}
                    <p className="text-white/60 absolute">Lottie animation placeholder</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Card 3 - AI Flashcards */}
            <div className="bg-white rounded-lg border-2 border-black p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="flex items-center justify-center">
                  <div className="w-full h-48 bg-gray-100 rounded-lg border-2 border-gray-300 flex items-center justify-center relative">
                    {/* Replace with your AI Flashcards Lottie animation URL */}
                    <LottieAnimation 
                      src="https://lottie.host/ai-flashcards-animation.json"
                      className="w-full h-full"
                      autoplay={true}
                      loop={true}
                    />
                    {/* Fallback text if animation fails to load */}
                    <p className="text-gray-600 absolute">Lottie animation placeholder</p>
                  </div>
                </div>
                <div className="text-dark">
                  <h3 className="text-2xl font-bold mb-4">AI Flashcards</h3>
                  <p className="text-lg">
                    Turn complex topics into simple, bite-sized flashcards automatically. Review them anytime, anywhere, and retain knowledge more effectively.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Left Column - PrepWise Information */}
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-white">PrepWise</h3>
              <p className="text-white/90 leading-relaxed">
                Smarter exam prep, powered by AI. Helping students study efficiently with quizzes, flashcards, and smart notes.
              </p>
              <p className="text-white/90">
                Ready to start your smarter studying?
              </p>
              <button className="bg-primary text-white px-6 py-3 rounded-lg border-2 border-black font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg">
                Get Started
              </button>
            </div>

            {/* Middle Column - Quick Links */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white">Quick Links:</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-white/90 hover:text-white transition-colors">
                    - About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white/90 hover:text-white transition-colors">
                    - Features
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white/90 hover:text-white transition-colors">
                    - Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white/90 hover:text-white transition-colors">
                    - Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white/90 hover:text-white transition-colors">
                    - Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Right Column - Contact Information */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white">Contact:</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <span className="text-white/90">hilman278@gmail.com</span>
                </div>
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  <span className="text-white/90">+06-1122334455</span>
                </div>
                <div className="flex items-center space-x-4 mt-4">
                  <a href="#" className="text-white hover:text-primary transition-colors">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/>
                    </svg>
                  </a>
                  <a href="#" className="text-white hover:text-primary transition-colors">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </a>
                  <a href="#" className="text-white hover:text-primary transition-colors">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Copyright Section */}
          <div className="border-t border-white/20 pt-8">
            <p className="text-center text-white/90">
              © 2025 PrepWise. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
