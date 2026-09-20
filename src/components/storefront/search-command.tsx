'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

export function SearchCommand({ onSelect, categories }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!q || q.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    const id = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`)
        .then(r => r.json())
        .then(d => setResults(d.results || []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 200)
    return () => clearTimeout(id)
  }, [q])

  return (
    <div className="p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (q) {
            onSelect?.()
            router.push(`/products?search=${encodeURIComponent(q)}`)
          }
        }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products, categories..."
            className="pl-9 pr-9 h-11"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {(loading || results.length > 0) && (
        <div className="mt-3 space-y-1 max-h-[400px] overflow-y-auto">
          {loading && <p className="text-xs text-muted-foreground px-3 py-2">Searching...</p>}
          {!loading && results.map(r => (
            <Link
              key={r.id}
              href={`/products/${r.slug}`}
              onClick={onSelect}
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted"
            >
              <div className="h-10 w-10 rounded bg-muted overflow-hidden">
                {r.image && <img src={r.image} alt={r.name} className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.name}</p>
                <p className="text-xs text-muted-foreground">${r.price.toFixed(2)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && q.length >= 2 && results.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground text-center py-8">
          No products found for &quot;{q}&quot;
        </p>
      )}

      {q.length < 2 && (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Categories</p>
          <div className="grid grid-cols-2 gap-1">
            {categories.slice(0, 6).map(c => (
              <Link
                key={c.id}
                href={`/categories/${c.slug}`}
                onClick={onSelect}
                className="px-3 py-2 text-sm rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
