'use client'

import { useState, ReactNode } from 'react'

interface GeneratorLayoutProps {
  title: string
  description: string
  children?: ReactNode
  onFileSelect: (file: File) => void
  onNext: () => void
  uploadedFile: File | null
  isDragOver: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveFile: () => void
}

export default function GeneratorLayout({
  title,
  description,
  children,
  onFileSelect,
  onNext,
  uploadedFile,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInputChange,
  onRemoveFile
}: GeneratorLayoutProps) {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row gap-12">
        {/* Left Content */}
        <div className="flex-1 space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-dark tracking-tight">{title}</h1>
            <p className="text-gray-600 text-lg leading-relaxed max-w-xl">
              {description}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">1</div>
              <h3 className="font-semibold text-gray-900">Upload your study material</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">2</div>
              <h3 className="font-semibold text-gray-500">Configure settings</h3>
            </div>
          </div>
        </div>

        {/* Right Content - File Upload */}
        <div className="flex-1 max-w-xl">
          <div
            className={`relative rounded-3xl border-2 border-dashed p-10 text-center transition-all duration-300 cursor-pointer overflow-hidden ${
              isDragOver 
                ? 'border-primary bg-primary/5 scale-[1.02]' 
                : 'border-gray-200 bg-white hover:border-primary/50 hover:bg-gray-50 hover:shadow-lg'
            }`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt,.jpg,.jpeg,.png"
              onChange={onFileInputChange}
            />
            
            {uploadedFile ? (
              <div className="space-y-6 relative z-10 animate-fadeIn">
                <div className="w-20 h-20 mx-auto bg-green-100 text-green-600 rounded-2xl flex items-center justify-center shadow-sm">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 mb-1">{uploadedFile.name}</p>
                  <p className="text-sm font-medium text-gray-500 bg-gray-100 inline-block px-3 py-1 rounded-full">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={(e) => {
                        e.stopPropagation()
                        onRemoveFile()
                        }}
                        className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                        Remove
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onNext()
                        }}
                        className="px-6 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-purple-700 shadow-md shadow-primary/25 transition-all hover:-translate-y-0.5"
                    >
                        Continue
                    </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 relative z-10">
                <div className="w-24 h-24 mx-auto bg-primary/5 text-primary rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 mb-2">
                    Click to upload or drag & drop
                  </p>
                  <p className="text-gray-500">
                    PDF, DOCX, TXT, or Images (max 10MB)
                  </p>
                </div>
                <div className="pt-4">
                    <span className="inline-flex items-center px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                        Select File
                    </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional content (like modals) */}
      {children}
    </div>
  )
}
