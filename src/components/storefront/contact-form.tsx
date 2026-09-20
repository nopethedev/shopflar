'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { toast } from '@/lib/toast'
import { Mail, Send } from 'lucide-react'

export function ContactForm({ email }) {
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })

  const submit = async (e) => {
    e.preventDefault()
    setSending(true)
    await new Promise(r => setTimeout(r, 600))
    setSending(false)
    toast.success('Message sent', 'We\'ll be in touch soon.')
    setForm({ name: '', email: '', subject: '', message: '' })
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label>Name</Label>
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <Label>Subject</Label>
          <Input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </div>
        <div>
          <Label>Message</Label>
          <Textarea rows={5} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        </div>
        <Button type="submit" disabled={sending} className="w-full">
          {sending ? 'Sending...' : <><Send className="h-4 w-4 mr-2" /> Send message</>}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Or email us directly at <a href={`mailto:${email}`} className="hover:underline inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {email}</a>
        </p>
      </form>
    </Card>
  )
}
