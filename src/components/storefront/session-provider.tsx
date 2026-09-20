'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/supabase-js'

// Lightweight session provider — reads a /api/me endpoint
export function SessionProvider({ children }) {
  return children
}

import { useCart } from '@/lib/cart-store'

export function useSession() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const initGuestId = useCart(s => s.initGuestId)

  useEffect(() => {
    let mounted = true
    initGuestId()
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!mounted) return
        if (d?.user) setUser(d.user)
        setLoading(false)
      })
      .catch(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [])

  return { user, loading, setUser }
}
