'use client'

import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'

interface ToolbarGroup {
  id: string
  label: string
  enabled: boolean
}

const DEFAULT_GROUPS: ToolbarGroup[] = [
  { id: 'text', label: 'Text Formatting', enabled: true },
  { id: 'lists', label: 'Lists', enabled: true },
  { id: 'blocks', label: 'Blocks', enabled: true },
  { id: 'insert', label: 'Insert', enabled: true },
]

const STORAGE_KEY = 'notes-toolbar-groups'

interface FormattingToolbarProps {
  editor: Editor | null
}

export default function FormattingToolbar({ editor }: FormattingToolbarProps) {
  const [groups, setGroups] = useState<ToolbarGroup[]>(DEFAULT_GROUPS)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: ToolbarGroup[] = JSON.parse(stored)
        setGroups(
          DEFAULT_GROUPS.map((g) => {
            const found = parsed.find((p) => p.id === g.id)
            return found ? { ...g, enabled: found.enabled } : g
          })
        )
      }
    } catch {}
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    if (settingsOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [settingsOpen])

  const toggleGroup = (id: string) => {
    setGroups((prev) => {
      const updated = prev.map((g) => (g.id === id ? { ...g, enabled: !g.enabled } : g))
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch {}
      return updated
    })
  }

  const isEnabled = (id: string) => groups.find((g) => g.id === id)?.enabled ?? true

  const insertLink = () => {
    if (!editor) return
    const url = window.prompt('Enter URL:')
    if (!url) return
    editor.chain().focus().toggleLink({ href: url }).run()
  }

  // ----- Button component -----

  const Btn = ({
    title,
    onClick,
    children,
    wide = false,
    active = false,
  }: {
    title: string
    onClick: () => void
    children: React.ReactNode
    wide?: boolean
    active?: boolean
  }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${
        active
          ? 'bg-primary/10 text-primary'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200'
      } ${wide ? 'px-2 py-1.5 text-xs font-semibold min-w-[2rem]' : 'w-8 h-8 text-sm font-semibold'}`}
    >
      {children}
    </button>
  )

  const Divider = () => <div className="w-px h-5 bg-gray-200 mx-1 self-center flex-shrink-0" />

  return (
    <div className="flex items-center gap-0.5 px-3 py-2 border-b border-gray-100 bg-gray-50/70 rounded-none flex-wrap relative">
      {/* Text Formatting */}
      {isEnabled('text') && (
        <>
          <Btn
            title="Bold (Ctrl+B)"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            active={editor?.isActive('bold') ?? false}
          >
            <span className="font-bold">B</span>
          </Btn>
          <Btn
            title="Italic (Ctrl+I)"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            active={editor?.isActive('italic') ?? false}
          >
            <span className="italic font-medium">I</span>
          </Btn>
          <Btn
            title="Strikethrough"
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            active={editor?.isActive('strike') ?? false}
          >
            <span className="line-through text-xs">S</span>
          </Btn>
          <Btn
            title="Inline code"
            onClick={() => editor?.chain().focus().toggleCode().run()}
            active={editor?.isActive('code') ?? false}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </Btn>
          <Divider />
          {/* Font family */}
          <select
            title="Font family"
            value={editor?.getAttributes('textStyle').fontFamily ?? ''}
            onChange={(e) => {
              const val = e.target.value
              val
                ? editor?.chain().focus().setFontFamily(val).run()
                : editor?.chain().focus().unsetFontFamily().run()
            }}
            className="text-xs border border-gray-200 rounded-md px-1 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
          >
            <option value="">Default</option>
            <option value="sans-serif">Sans-serif</option>
            <option value="serif">Serif</option>
            <option value="monospace">Monospace</option>
            <option value="cursive">Cursive</option>
          </select>
          {/* Text color */}
          <div className="flex items-center gap-0.5">
            <input
              type="color"
              title="Text color"
              value={editor?.getAttributes('textStyle').color ?? '#000000'}
              onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()}
              className="w-7 h-7 rounded cursor-pointer border border-gray-200 p-0.5 bg-white"
            />
            <Btn
              title="Remove color"
              onClick={() => editor?.chain().focus().unsetColor().run()}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </Btn>
          </div>
          <Divider />
        </>
      )}

      {/* Lists */}
      {isEnabled('lists') && (
        <>
          <Btn
            title="Bullet list"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            active={editor?.isActive('bulletList') ?? false}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="9" y1="6" x2="20" y2="6" />
              <line x1="9" y1="12" x2="20" y2="12" />
              <line x1="9" y1="18" x2="20" y2="18" />
              <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </Btn>
          <Btn
            title="Ordered list"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            active={editor?.isActive('orderedList') ?? false}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="10" y1="6" x2="21" y2="6" />
              <line x1="10" y1="12" x2="21" y2="12" />
              <line x1="10" y1="18" x2="21" y2="18" />
              <text x="2" y="8" fontSize="7" fill="currentColor" stroke="none" fontWeight="bold">1.</text>
              <text x="2" y="14" fontSize="7" fill="currentColor" stroke="none" fontWeight="bold">2.</text>
              <text x="2" y="20" fontSize="7" fill="currentColor" stroke="none" fontWeight="bold">3.</text>
            </svg>
          </Btn>
          <Btn
            title="Task / checklist"
            onClick={() => editor?.chain().focus().toggleTaskList().run()}
            active={editor?.isActive('taskList') ?? false}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="5" width="6" height="6" rx="1" />
              <polyline points="5 8 6.5 9.5 9 6.5" strokeWidth={1.8} />
              <line x1="13" y1="8" x2="21" y2="8" />
              <rect x="3" y="13" width="6" height="6" rx="1" />
              <line x1="13" y1="16" x2="21" y2="16" />
            </svg>
          </Btn>
          <Divider />
        </>
      )}

      {/* Blocks */}
      {isEnabled('blocks') && (
        <>
          <Btn
            title="Blockquote"
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            active={editor?.isActive('blockquote') ?? false}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
            </svg>
          </Btn>
          <Btn
            title="Code block"
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            active={editor?.isActive('codeBlock') ?? false}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M9 9l-3 3 3 3" />
              <path d="M15 9l3 3-3 3" />
            </svg>
          </Btn>
          <Btn
            title="Horizontal rule"
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="3" y1="12" x2="21" y2="12" />
            </svg>
          </Btn>
          <Divider />
        </>
      )}

      {/* Insert */}
      {isEnabled('insert') && (
        <>
          <Btn
            title="Insert link"
            onClick={insertLink}
            active={editor?.isActive('link') ?? false}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
          </Btn>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings gear */}
      <div className="relative" ref={settingsRef}>
        <button
          type="button"
          title="Customize toolbar"
          onClick={() => setSettingsOpen((o) => !o)}
          className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${settingsOpen ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>

        {settingsOpen && (
          <div className="absolute right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[210px] p-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 pb-1.5 pt-0.5">
              Toolbar groups
            </p>
            {groups.map((group) => (
              <label
                key={group.id}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <span className="relative flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={group.enabled}
                    onChange={() => toggleGroup(group.id)}
                    className="peer sr-only"
                  />
                  <span className="w-4 h-4 rounded flex items-center justify-center border border-gray-300 peer-checked:bg-primary peer-checked:border-primary transition-colors">
                    {group.enabled && (
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <polyline points="2 6 5 9 10 3" />
                      </svg>
                    )}
                  </span>
                </span>
                <span className="text-sm text-gray-700">{group.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
