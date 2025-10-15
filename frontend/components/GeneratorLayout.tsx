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
    <div className="p-6">
      {/* Page Title */}
      <h1 className="text-3xl font-bold text-gray-800 mb-4">{title}</h1>
      
      {/* Description */}
      <p className="text-gray-600 mb-8 text-lg">
        {description}
      </p>

      {/* File Upload Section */}
      <div className="max-w-2xl">
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 ${
            isDragOver 
              ? 'border-primary bg-primary bg-opacity-5' 
              : 'border-gray-300 hover:border-primary hover:bg-gray-50'
          }`}
          style={{ backgroundColor: '#F0F2F9' }}
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
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-gray-200 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-800 mb-2">{uploadedFile.name}</p>
                <p className="text-sm text-gray-600">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveFile()
                }}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Remove file
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-gray-200 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-800 mb-2">
                  Drag a document here or click browser
                </p>
                <p className="text-sm text-gray-600">
                  Supports PDF, DOCX, TXT, and image files
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Next Button */}
        <div className="mt-8">
          <button
            onClick={onNext}
            disabled={!uploadedFile}
            className="w-full sm:w-auto px-8 py-3 bg-white border-2 border-black rounded-lg font-medium text-gray-800 hover:bg-gray-50 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            Next
          </button>
        </div>
      </div>

      {/* Additional content (like modals) */}
      {children}
    </div>
  )
}
