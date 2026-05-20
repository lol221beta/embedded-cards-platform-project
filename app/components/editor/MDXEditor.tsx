'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import { EditorView } from '@codemirror/view'
import { cn } from '@/lib/cn'

// Load CodeMirror with SSR disabled
const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), { ssr: false })

const URL_REGEX = /https?:\/\/[^\s"<>)[\]]+/g

const editorTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '13.5px', background: '#ffffff' },
  '.cm-scroller': {
    fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
    lineHeight: '1.75',
    overflowY: 'auto',
  },
  '.cm-content': { padding: '24px 28px', caretColor: '#0ea5e9', maxWidth: '72ch' },
  '.cm-focused': { outline: 'none' },
  '.cm-cursor': { borderLeftColor: '#0ea5e9', borderLeftWidth: '2px' },
  '.cm-selectionBackground, ::selection': { background: '#e0f2fe !important' },
  '&.cm-focused .cm-selectionBackground': { background: '#bae6fd !important' },
  '.cm-gutters': {
    background: '#f9fafb',
    borderRight: '1px solid #f3f4f6',
    color: '#d1d5db',
    fontSize: '11px',
    minWidth: '40px',
    paddingRight: '8px',
  },
  '.cm-lineNumbers .cm-gutterElement': { textAlign: 'right' },
  '.cm-activeLineGutter': { background: '#f0f9ff', color: '#9ca3af' },
  '.cm-activeLine': { background: 'rgba(224,242,254,0.25)' },
  '.cm-line': { padding: '0' },
  // Markdown-specific highlight
  '.cm-heading': { color: '#111827', fontWeight: '700' },
  '.cm-strong': { color: '#111827', fontWeight: '700' },
  '.cm-emphasis': { color: '#374151', fontStyle: 'italic' },
  '.cm-url': { color: '#0284c7', textDecoration: 'underline', textUnderlineOffset: '2px' },
  '.cm-link': { color: '#0284c7' },
  '.cm-quote': { color: '#6b7280', fontStyle: 'italic' },
  '.cm-code': { color: '#7c3aed', background: '#f5f3ff', borderRadius: '3px', padding: '0 3px' },
  '.cm-monospace': { fontFamily: 'inherit' },
})

interface MDXEditorProps {
  value: string
  onChange: (v: string) => void
  onUrlsDetected?: (urls: string[]) => void
  className?: string
}

export function MDXEditor({ value, onChange, onUrlsDetected, className }: MDXEditorProps) {
  const prevUrlsRef = useRef<Set<string>>(new Set())

  const handleChange = useCallback(
    (v: string) => {
      onChange(v)

      if (onUrlsDetected) {
        const found = [...new Set(
          [...(v.match(URL_REGEX) ?? [])].map((u) => u.replace(/[.,;!?)\]]+$/, ''))
        )]
        const prev = prevUrlsRef.current
        const newUrls = found.filter((u) => !prev.has(u))
        if (newUrls.length) onUrlsDetected(newUrls)
        prevUrlsRef.current = new Set(found)
      }
    },
    [onChange, onUrlsDetected],
  )

  const extensions = useMemo(() => [EditorView.lineWrapping, editorTheme], [])

  return (
    <div className={cn('h-full overflow-hidden', className)}>
      <CodeMirror
        value={value}
        onChange={handleChange}
        height="100%"
        extensions={extensions}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          syntaxHighlighting: true,
          closeBrackets: true,
          history: true,
          searchKeymap: true,
          foldGutter: false,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: true,
          bracketMatching: true,
          autocompletion: false,
          rectangularSelection: false,
        }}
        style={{ height: '100%' }}
        className="h-full text-sm"
      />
    </div>
  )
}
