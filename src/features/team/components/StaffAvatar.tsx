import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { db } from "@/lib/db/silangDatabase"
import { backendAssetUrl } from "@/lib/api"
import { cn } from "@/lib/utils"

interface StaffAvatarProps {
  src?: string | null
  name: string
  className?: string
  imageClassName?: string
  fallbackClassName?: string
  size?: "default" | "sm" | "lg"
}

export function StaffAvatar({
  src,
  name,
  className,
  imageClassName,
  fallbackClassName,
  size = "default",
}: StaffAvatarProps) {
  const isBlob = typeof src === "string" && src.startsWith("blob-")
  const [blobObjectUrl, setBlobObjectUrl] = useState<string | null>(null)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setHasError(false)
    if (!isBlob || !src) {
      setBlobObjectUrl(null)
      return
    }

    let active = true
    let createdUrl: string | null = null

    db.blobs.get(src).then((blobRecord) => {
      if (!active || !blobRecord) return
      createdUrl = URL.createObjectURL(blobRecord.data)
      setBlobObjectUrl(createdUrl)
    }).catch(() => {
      if (active) setBlobObjectUrl(null)
    })

    return () => {
      active = false
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl)
      }
      setBlobObjectUrl(null)
    }
  }, [src, isBlob])

  const resolvedSrc = isBlob ? blobObjectUrl : (src ? backendAssetUrl(src) : null)

  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0])
    .join("")
    .toUpperCase() || "S"

  return (
    <Avatar size={size} className={cn("shrink-0", className)}>
      {resolvedSrc && !hasError ? (
        <AvatarImage
          src={resolvedSrc}
          alt={name}
          onError={() => setHasError(true)}
          className={cn("object-cover", imageClassName)}
        />
      ) : null}
      <AvatarFallback className={cn("font-semibold text-foreground", fallbackClassName)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
