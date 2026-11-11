import { useState, useRef, useEffect, type ChangeEvent, type DragEvent } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MaternalAvatar } from "./MaternalAvatar"
import { Camera, Image as ImageIcon, Loader2, UploadCloud, X } from "lucide-react"
import { toast } from "sonner"
import { useAuthSession } from "@/features/auth/auth-session"
import { uploadMaternalAvatar } from "../api"

interface UploadAvatarDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  motherId: string
  patientName: string
  currentPhotoUrl?: string | null
  onSuccess: (newPhotoUrl: string) => void
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

export function UploadAvatarDialog({
  open,
  onOpenChange,
  motherId,
  patientName,
  currentPhotoUrl,
  onSuccess,
}: UploadAvatarDialogProps) {
  const { session } = useAuthSession()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
      setSelectedFile(null)
      setIsDragging(false)
      setIsUploading(false)
    }
    onOpenChange(nextOpen)
  }

  const handleSelectFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a valid image file (PNG, JPG, WEBP).")
      return
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`Image size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 10 MB limit.`)
      return
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const onFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleSelectFile(file)
    }
    event.target.value = ""
  }

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = () => {
    setIsDragging(false)
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) {
      handleSelectFile(file)
    }
  }

  const handleClear = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setSelectedFile(null)
  }

  const handleSave = async () => {
    if (!selectedFile) {
      toast.error("Select a photo first")
      return
    }
    if (!session?.token) {
      toast.error("Your session has expired. Sign in again.")
      return
    }

    setIsUploading(true)
    try {
      const res = await uploadMaternalAvatar(session.token, motherId, selectedFile)
      if (res.offline) {
        toast.info("Profile photo saved on this device", {
          description: "It will synchronize automatically when connection is restored.",
        })
      } else {
        toast.success("Profile photo updated successfully")
      }
      onSuccess(res.profile_url)
      handleOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload profile photo")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md gap-4 overflow-hidden p-5 sm:max-w-md">
        <DialogHeader className="min-w-0">
          <DialogTitle className="truncate text-base font-semibold">Change Profile Photo</DialogTitle>
          <p className="truncate text-xs text-muted-foreground">
            Upload a clear photo for {patientName || "this mother"}.
          </p>
        </DialogHeader>

        <div className="flex w-full min-w-0 max-w-full flex-col items-center gap-4 py-2">
          <div className="relative flex items-center justify-center">
            {previewUrl ? (
              <div className="relative">
                <div className="size-28 overflow-hidden rounded-full border-2 border-primary/25 shadow-sm">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="size-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="Remove selected photo"
                  className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full border border-sidebar-border bg-background text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <MaternalAvatar
                src={currentPhotoUrl}
                name={patientName}
                className="size-28 border-2 border-sidebar-border text-2xl"
              />
            )}
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                fileInputRef.current?.click()
              }
            }}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isDragging ? "border-primary bg-primary/10" : "border-sidebar-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={onFileInputChange}
            />
            <div className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UploadCloud className="size-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-foreground">
                Drag and drop image here, or{" "}
                <span className="font-semibold text-primary underline underline-offset-2">
                  browse
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                PNG, JPG or WEBP up to 10MB
              </p>
            </div>
          </div>

          {selectedFile && (
            <div className="flex w-full min-w-0 max-w-full items-center justify-between gap-2 overflow-hidden rounded-md border border-sidebar-border bg-card px-3 py-1.5 text-xs">
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                <ImageIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <span
                  className="min-w-0 flex-1 truncate font-medium text-foreground"
                  title={selectedFile.name}
                >
                  {selectedFile.name}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  ({(selectedFile.size / 1024).toFixed(0)} KB)
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClear}
                aria-label="Remove selected file"
                className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-end gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isUploading}
            className="h-8 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!selectedFile || isUploading}
            className="h-8 gap-1.5 text-xs"
          >
            {isUploading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Camera className="size-3.5" />
                Save Photo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
