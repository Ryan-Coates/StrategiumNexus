import { useId, useState } from 'react'

export default function Wh40k11eImage({
  value, onChange, label, onProcessing,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  onProcessing: (busy: boolean) => void
}) {
  const id = useId()
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  async function upload(file: File) {
    setError('')
    setUploading(true)
    onProcessing(true)
    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        throw new Error('Choose a JPEG, PNG or WebP image.')
      }
      if (file.size > 5 * 1024 * 1024) throw new Error('Images must be 5 MB or smaller.')
      const bitmap = await createImageBitmap(file)
      try {
        const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(bitmap.width * scale))
        canvas.height = Math.max(1, Math.round(bitmap.height * scale))
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Your browser cannot process this image.')
        context.fillStyle = 'white'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
        onChange(canvas.toDataURL('image/jpeg', 0.85))
      } finally {
        bitmap.close()
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not read the image.')
    } finally {
      setUploading(false)
      onProcessing(false)
    }
  }

  return (
    <div className="space-y-2">
      {value && <img src={value} alt={label} className="h-36 w-48 object-cover border border-gold-muted/30" />}
      <label htmlFor={id} className="block text-xs text-gold">{label} (optional)</label>
      <input id={id} type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading}
        className="text-sm text-parchment-muted max-w-full"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void upload(file)
        }} />
      {uploading && <p role="status" className="text-gold-muted text-xs">Processing image…</p>}
      {value && <button type="button" className="btn-ghost text-xs" onClick={() => onChange('')}>Remove image</button>}
      {error && <p role="alert" className="text-blood-light text-sm">{error}</p>}
    </div>
  )
}
