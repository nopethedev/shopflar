'use client'
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/lib/toast'
import { Upload, Loader2, Link as LinkIcon, X } from 'lucide-react'

export function FileUpload({ value, onChange, type = 'image', accept, placeholder }) {
  const [uploading, setUploading] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const fileInputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      const r = await fetch('/api/upload', { method: 'POST', body: formData })
      const d = await r.json()
      if (r.ok) {
        onChange(d.url)
        toast.success('Uploaded', d.filename)
      } else {
        throw new Error(d.error || 'Upload failed')
      }
    } catch (e) {
      toast.error('Upload failed', e.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const addUrl = () => {
    if (urlInput) {
      onChange(urlInput)
      setUrlInput('')
      setShowUrlInput(false)
    }
  }

  return (
    <div className="space-y-2">
      {/* Preview / current value */}
      {value && type === 'image' && (
        <div className="relative group">
          <img src={value} alt="Preview" className="h-24 w-24 rounded-md object-cover border border-border" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center text-xs"
            aria-label="Remove"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      {value && type === 'file' && (
        <div className="flex items-center gap-2 p-2 rounded-md border border-border bg-muted/20">
          <span className="text-xs font-mono truncate flex-1">{value}</span>
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Upload buttons */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept || (type === 'image' ? 'image/*' : undefined)}
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowUrlInput(!showUrlInput)}
        >
          <LinkIcon className="h-3.5 w-3.5 mr-1.5" /> URL
        </Button>
      </div>

      {/* URL input */}
      {showUrlInput && (
        <div className="flex gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={placeholder || 'https://example.com/image.jpg'}
            className="text-sm"
          />
          <Button type="button" size="sm" onClick={addUrl}>Add</Button>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={(e) => e.preventDefault()}
        className="border-2 border-dashed border-border rounded-md p-3 text-center text-xs text-muted-foreground cursor-pointer hover:border-foreground/30 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? 'Uploading...' : 'Drop file here or click to browse'}
      </div>
    </div>
  )
}
