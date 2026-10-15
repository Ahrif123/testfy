import { useEffect, useRef, useState } from 'react'
import type { Screenshot } from '../types'

// Shows an image stored as a Blob, and frees the memory when it's removed
function BlobImage({ blob, alt, className }: { blob: Blob; alt: string; className?: string }) {
  const ref = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const url = URL.createObjectURL(blob)
    if (ref.current) ref.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [blob])

  return <img ref={ref} alt={alt} className={className} />
}

export default function ScreenshotGallery({
  screenshots,
  onDelete,
}: {
  screenshots: Screenshot[]
  onDelete: (id: number) => void
}) {
  const [viewing, setViewing] = useState<Screenshot | null>(null)

  // Esc closes the full-size view
  useEffect(() => {
    if (!viewing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewing(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewing])

  if (screenshots.length === 0) return null

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {screenshots.map((s, i) => (
          <div key={s.id} className="relative group">
            <button
              type="button"
              onClick={() => setViewing(s)}
              className="block w-36 h-24 rounded-md overflow-hidden border border-slate-200 bg-slate-100 hover:ring-2 hover:ring-emerald-500"
            >
              <BlobImage blob={s.blob} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover object-top" />
            </button>
            <button
              type="button"
              title="Delete screenshot"
              onClick={() => s.id !== undefined && onDelete(s.id)}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white text-xs shadow opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {viewing && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8 cursor-zoom-out"
          onClick={() => setViewing(null)}
        >
          <BlobImage blob={viewing.blob} alt="Screenshot full size" className="max-w-full max-h-full rounded-md shadow-2xl" />
          <button
            type="button"
            onClick={() => setViewing(null)}
            className="absolute top-4 right-6 text-white text-3xl"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>
      )}
    </>
  )
}