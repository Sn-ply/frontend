'use client'

import { useCallback, useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const DEFAULT_MAX_IMAGES = 4
const MAX_FILE_SIZE_MB = 5

interface ImageUploaderProps {
  value: string[]
  onChange: (urls: string[]) => void
  error?: string
  max?: number
  circle?: boolean
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function ImageUploader({ value, onChange, error, max = DEFAULT_MAX_IMAGES, circle = false }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [localError, setLocalError] = useState('')

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      setLocalError('')
      const images = Array.from(files).filter((f) => f.type.startsWith('image/'))
      if (images.length === 0) return

      const room = max - value.length
      if (room <= 0) {
        setLocalError(max === 1 ? 'Remove the current photo first' : `Up to ${max} images per post`)
        return
      }

      const oversized = images.find((f) => f.size > MAX_FILE_SIZE_MB * 1024 * 1024)
      if (oversized) {
        setLocalError(`${oversized.name} is over ${MAX_FILE_SIZE_MB}MB`)
        return
      }

      setIsProcessing(true)
      try {
        const dataUrls = await Promise.all(images.slice(0, room).map(fileToDataUrl))
        onChange([...value, ...dataUrls])
      } finally {
        setIsProcessing(false)
      }
    },
    [value, onChange],
  )

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  function removeAt(i: number) {
    onChange(value.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className={cn('grid gap-2', circle ? 'grid-cols-1 w-24' : 'grid-cols-4')}>
          {value.map((src, i) => (
            <div
              key={i}
              className={cn(
                'group relative aspect-square overflow-hidden border border-zinc-200 bg-zinc-50',
                circle ? 'rounded-full' : 'rounded-md',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob/data URLs, not a remote image */}
              <img src={src} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove image"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {value.length < max && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed text-center transition-colors',
            circle ? 'h-24 w-24 rounded-full p-2' : 'rounded-md px-4 py-8',
            isDragging ? 'border-primary bg-primary/5' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50',
          )}
        >
          {isProcessing ? (
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          ) : circle ? (
            <ImagePlus className="h-6 w-6 text-zinc-400" />
          ) : (
            <>
              <ImagePlus className="h-6 w-6 text-zinc-400" />
              <p className="text-sm text-zinc-500">
                <span className="font-medium text-primary">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-zinc-400">
                PNG or JPG, up to {MAX_FILE_SIZE_MB}MB, max {max} images
              </p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple={max > 1}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>
      )}

      {(error || localError) && <p className="text-xs text-red-500">{error || localError}</p>}
    </div>
  )
}
