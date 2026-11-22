'use client'
// Runs inside the theme editor's preview iframe (admin-only `?preview=1`).
// It turns the real storefront into an editing canvas:
//   • hovering a section outlines it, clicking selects it in the editor
//   • links and forms are disabled so the preview never navigates away
//   • the editor can ask it to highlight, scroll to or refresh a section
// Messages are same-origin only.
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const STYLE_ID = 'sf-preview-bridge-style'
const SELECT_ID = 'sf-preview-bridge-select'

const BASE_CSS = `
[data-sec] { position: relative; cursor: pointer; }
[data-sec]::after {
  content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 40;
  outline: 2px solid transparent; outline-offset: -2px; transition: outline-color .12s;
}
[data-sec]:hover::after { outline-color: rgba(0, 91, 211, .45); }
[data-sec]:hover::before {
  content: attr(data-sec-label); position: absolute; top: 0; left: 0; z-index: 41; pointer-events: none;
  background: #005bd3; color: #fff; font: 600 11px/1 system-ui, sans-serif;
  padding: 5px 8px; border-bottom-right-radius: 6px; letter-spacing: .01em;
}
[data-sec][data-sec-hidden="true"] { opacity: .45; }
html { scroll-behavior: auto !important; }
`

function post(message: Record<string, unknown>) {
  window.parent?.postMessage({ source: 'sf-preview', ...message }, window.location.origin)
}

export function PreviewBridge() {
  const router = useRouter()

  useEffect(() => {
    if (window.parent === window) return // opened directly, not in the editor

    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = BASE_CSS
    document.head.appendChild(style)
    const selectStyle = document.createElement('style')
    selectStyle.id = SELECT_ID
    document.head.appendChild(selectStyle)

    const select = (id: string | null) => {
      selectStyle.textContent = id
        ? `[data-sec="${CSS.escape(id)}"]::after { outline-color: #005bd3 !important; outline-width: 3px; }
           [data-sec="${CSS.escape(id)}"]::before { content: attr(data-sec-label); position: absolute; top: 0; left: 0; z-index: 41; pointer-events: none; background: #005bd3; color: #fff; font: 600 11px/1 system-ui, sans-serif; padding: 5px 8px; border-bottom-right-radius: 6px; }`
        : ''
    }

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const sec = target?.closest?.('[data-sec]') as HTMLElement | null
      // Never navigate or submit inside the preview
      if (target?.closest?.('a, button, form, summary, [role="button"]')) e.preventDefault()
      if (sec) {
        e.stopPropagation()
        post({ type: 'select', id: sec.getAttribute('data-sec') })
      } else {
        post({ type: 'select', id: null })
      }
    }
    const onSubmit = (e: Event) => e.preventDefault()

    // Shortcuts keep working while focus is inside the preview
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (['z', 'y', 's', 'd'].includes(e.key.toLowerCase())) {
          e.preventDefault()
          post({ type: 'shortcut', key: e.key, shift: e.shiftKey })
        }
      } else if (e.key === 'Escape') {
        post({ type: 'key', key: 'Escape' })
      }
    }

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.source !== 'sf-editor') return
      const { type, id } = e.data
      if (type === 'select') select(id || null)
      if (type === 'scroll') {
        // The section may not be in the DOM yet (just added, refresh in flight)
        let tries = 0
        const attempt = () => {
          const el = document.querySelector(`[data-sec="${CSS.escape(id)}"]`)
          if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
          else if (tries++ < 20) setTimeout(attempt, 150)
        }
        attempt()
      }
      if (type === 'refresh') router.refresh()
    }

    document.addEventListener('click', onClick, true)
    document.addEventListener('submit', onSubmit, true)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('message', onMessage)
    post({ type: 'ready' })

    return () => {
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('submit', onSubmit, true)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('message', onMessage)
      style.remove()
      selectStyle.remove()
    }
  }, [router])

  return null
}
