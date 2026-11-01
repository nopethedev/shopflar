'use client'
import { useEffect, useRef, useState } from 'react'
import { Bold, Italic, Underline, Strikethrough, Link2, Unlink, List, ListOrdered, RemoveFormatting } from 'lucide-react'

// Lightweight WYSIWYG editor built on contentEditable + execCommand.
// No external deps; produces plain HTML suitable for email rendering.
export function RichTextEditor({ value, onChange, placeholder = 'Write here…', minHeight = 110 }) {
  const ref = useRef(null)
  const [focused, setFocused] = useState(false)
  const debounceRef = useRef(null)
  // External value changes (e.g. undo) are applied only when the editor
  // isn't focused, so typing never resets the caret.
  const lastEmitted = useRef(value)

  useEffect(() => {
    if (ref.current && !focused && value !== lastEmitted.current) {
      ref.current.innerHTML = value || ''
      lastEmitted.current = value
    }
  }, [value, focused])

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || '')) {
      ref.current.innerHTML = value || ''
      lastEmitted.current = value
    }
    // Runs once on mount to seed the contentEditable
     
  }, [])

  const emit = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const html = ref.current?.innerHTML || ''
      lastEmitted.current = html
      onChange(html === '<br>' || html === '<div><br></div>' ? '' : html)
    }, 350)
  }

  const exec = (cmd, arg = null) => {
    ref.current?.focus()
    document.execCommand(cmd, false, arg)
    emit()
  }

  const addLink = () => {
    const sel = window.getSelection()
    const text = sel?.toString() || ''
    const url = window.prompt('Link URL (relative like /products or full https://…)', 'https://')
    if (!url || url === 'https://') return
    ref.current?.focus()
    if (text) {
      exec('createLink', url)
      // Force target=_blank on the new link
      const a = ref.current?.querySelector('a[href="' + url + '"]')
      if (a) { a.target = '_blank'; a.rel = 'noopener' }
    } else {
      exec('insertHTML', `<a href="${url}" target="_blank" rel="noopener" style="color:#1a1a1a;text-decoration:underline;">${url}</a>`)
    }
  }

  const btn = 'p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors'

  return (
    <div className={`rounded-md border border-input bg-background overflow-hidden ${focused ? 'ring-2 ring-ring/30 border-ring' : ''}`}>
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-border bg-muted/30 flex-wrap">
        <button type="button" className={btn} onMouseDown={(e) => { e.preventDefault(); exec('bold') }} title="Bold"><Bold className="h-3.5 w-3.5" /></button>
        <button type="button" className={btn} onMouseDown={(e) => { e.preventDefault(); exec('italic') }} title="Italic"><Italic className="h-3.5 w-3.5" /></button>
        <button type="button" className={btn} onMouseDown={(e) => { e.preventDefault(); exec('underline') }} title="Underline"><Underline className="h-3.5 w-3.5" /></button>
        <button type="button" className={btn} onMouseDown={(e) => { e.preventDefault(); exec('strikeThrough') }} title="Strikethrough"><Strikethrough className="h-3.5 w-3.5" /></button>
        <div className="w-px h-4 bg-border mx-1" />
        <button type="button" className={btn} onMouseDown={(e) => { e.preventDefault(); addLink() }} title="Insert link"><Link2 className="h-3.5 w-3.5" /></button>
        <button type="button" className={btn} onMouseDown={(e) => { e.preventDefault(); exec('unlink') }} title="Remove link"><Unlink className="h-3.5 w-3.5" /></button>
        <div className="w-px h-4 bg-border mx-1" />
        <button type="button" className={btn} onMouseDown={(e) => { e.preventDefault(); exec('insertUnorderedList') }} title="Bullet list"><List className="h-3.5 w-3.5" /></button>
        <button type="button" className={btn} onMouseDown={(e) => { e.preventDefault(); exec('insertOrderedList') }} title="Numbered list"><ListOrdered className="h-3.5 w-3.5" /></button>
        <button type="button" className={btn} onMouseDown={(e) => { e.preventDefault(); exec('removeFormat') }} title="Clear formatting"><RemoveFormatting className="h-3.5 w-3.5" /></button>
        <div className="w-px h-4 bg-border mx-1" />
        <select
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => { if (e.target.value) { exec('formatBlock', e.target.value); e.target.value = '' } }}
          className="text-xs bg-transparent border-none outline-none cursor-pointer text-muted-foreground hover:text-foreground py-0.5"
          defaultValue=""
          title="Text style"
        >
          <option value="">Style</option>
          <option value="h2">Heading</option>
          <option value="h3">Subheading</option>
          <option value="p">Paragraph</option>
        </select>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); emit() }}
        onInput={emit}
        data-placeholder={placeholder}
        className="px-3 py-2.5 text-sm leading-relaxed outline-none prose-p:my-2 empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50"
        style={{ minHeight }}
      />
      <style jsx global>{`
        [data-placeholder]:empty:before { pointer-events: none; }
      `}</style>
    </div>
  )
}
