'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/Avatar'

const supabase = createClient()

const PALETTE = [
  '#5E7FA6', // calm blue
  '#8DAA94', // sage
  '#E7B471', // soft clay
  '#1F2D3D', // deep navy
  '#c47a9e', // muted rose
  '#d4836b', // terracotta
  '#7b9e87', // deeper sage
  '#9b7ea8', // muted purple
]

interface Props {
  userId: string
  initialName: string
  initialColour: string
  initialAvatarUrl: string | null
}

export function ProfileForm({ userId, initialName, initialColour, initialAvatarUrl }: Props) {
  const [name, setName] = useState(initialName)
  const [colour, setColour] = useState(initialColour)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('Image must be under 2 MB'); return }

    setUploading(true)
    setError(null)
    const ext = file.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) { setError(uploadError.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    // Bust the browser cache
    const url = `${publicUrl}?t=${Date.now()}`
    setAvatarUrl(url)
    setUploading(false)
    setSaved(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setSaved(false)
    setError(null)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ name: name.trim(), avatar_colour: colour, avatar_url: avatarUrl })
      .eq('id', userId)
    setSaving(false)
    if (updateError) { setError(updateError.message); return }
    setSaved(true)
  }

  const preview = { name, avatar_colour: colour, avatar_url: avatarUrl }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <h3 className="text-sm font-semibold text-slate-900">Your profile</h3>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative group"
          disabled={uploading}
        >
          <Avatar profile={preview} size="md" className="w-14 h-14 text-xl" />
          <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
            {uploading ? '…' : 'Change'}
          </span>
        </button>
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-medium text-slate-500">Display name</label>
          <input
            type="text"
            required
            value={name}
            onChange={e => { setName(e.target.value); setSaved(false) }}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      <div>
        <p className="text-xs font-medium text-slate-500 mb-2">Colour</p>
        <div className="flex gap-2 flex-wrap">
          {PALETTE.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => { setColour(c); setSaved(false) }}
              className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${colour === c ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <form onSubmit={handleSave}>
        <button
          type="submit"
          disabled={saving || uploading}
          className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && <span className="ml-3 text-xs text-emerald-600 font-medium">Saved ✓</span>}
      </form>
    </div>
  )
}
