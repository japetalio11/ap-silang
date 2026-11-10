import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react"
import {
  CheckCheck,
  ChevronDown,
  FileText,
  Image,
  Link2,
  Loader2,
  MessageSquare,
  Paperclip,
  PanelRight,
  Search,
  Send,
  X,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DrawerHeading } from "@/components/ui/drawer-heading"
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet"
import { toast } from "sonner"
import { useIsMobile } from "@/hooks/use-mobile"
import { useAuthSession } from "@/features/auth/auth-session"
import {
  createMessage,
  getMessageMothers,
  getMessages,
  markMessagesRead,
  uploadMessageAttachment,
  type MessageMother,
  type MessageRecord,
} from "../api"

type Conversation = {
  id: string
  name: string
  initials: string
  profileUrl?: string | null
  preview: string
  time: string
  activity: number
  unread: number
  lastSeen: string
}
type ChatMessage = {
  id: string
  from: "mother" | "staff"
  text: string
  time: string
  isRead?: boolean
  kind?: string
  status?: "sending" | "sent" | "failed"
}

type MessagePayload = MessageRecord & {
  sender_id: string
  receiver_id: string
}

function formatMessageTime(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" })
}

function toChatMessage(
  message: MessagePayload,
  currentUserId: string
): ChatMessage {
  return {
    id: message.message_id,
    from: message.sender_id === currentUserId ? "staff" : "mother",
    text: message.message_content ?? "",
    time: formatMessageTime(message.message_date),
    kind: message.message_type?.toLowerCase() ?? "text",
  }
}

function messagePreview(message?: MessagePayload) {
  if (!message) return "No messages yet"
  const kind = message.message_type?.toLowerCase()
  if (kind === "image") return "Photo"
  if (kind === "file") {
    const rawName = decodeURIComponent(
      message.message_content?.split("/").pop()?.split("?")[0] ?? "Attachment"
    )
    const cleanName =
      rawName.length > 25 ? `${rawName.slice(0, 22)}...` : rawName
    return `File · ${cleanName}`
  }
  const text = (message.message_content || "").trim()
  if (!text) return "No messages yet"
  const maxLen = 42
  return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text
}

function toConversation(
  mother: MessageMother,
  messages: MessagePayload[],
  currentUserId: string
): Conversation | null {
  const user = mother.user
  if (!user?.user_id) return null
  const ownMessages = messages.filter(
    (message) =>
      (message.sender_id === user.user_id &&
        message.receiver_id === currentUserId) ||
      (message.sender_id === currentUserId &&
        message.receiver_id === user.user_id)
  )
  const latest = ownMessages[ownMessages.length - 1]
  const name =
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    "Maternal patient"
  return {
    id: user.user_id,
    name,
    initials:
      [user.first_name?.[0], user.last_name?.[0]]
        .filter(Boolean)
        .join("")
        .toUpperCase() || "M",
    profileUrl: user.profile_url,
    preview: messagePreview(latest),
    time: formatMessageTime(latest?.message_date),
    activity: latest?.message_date
      ? new Date(latest.message_date).getTime()
      : 0,
    unread: ownMessages.filter(
      (message) => message.receiver_id === currentUserId && !message.is_read
    ).length,
    lastSeen: "Maternal patient",
  }
}

function PatientAvatar({
  conversation,
  className = "",
}: {
  conversation: Conversation
  className?: string
}) {
  return (
    <Avatar
      className={`shrink-0 border border-border/70 bg-primary/10 ${className}`}
    >
      {conversation.profileUrl && (
        <AvatarImage src={conversation.profileUrl} alt={conversation.name} />
      )}
      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
        {conversation.initials}
      </AvatarFallback>
    </Avatar>
  )
}

export function MessagesPage() {
  const isMobile = useIsMobile()
  const { session } = useAuthSession()
  const sessionToken = session?.token
  const currentUserId = session?.user.user_id
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [search, setSearch] = useState("")
  const [draft, setDraft] = useState("")
  const [attachment, setAttachment] = useState<File | null>(null)
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>({})
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [sortNewest, setSortNewest] = useState(true)
  const [threadSearchOpen, setThreadSearchOpen] = useState(false)
  const [threadSearch, setThreadSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const threadEndRef = useRef<HTMLDivElement>(null)
  const attachmentInputRef = useRef<HTMLInputElement>(null)
  const seenMessageIdsRef = useRef<Set<string>>(new Set())
  const hasLoadedInboxRef = useRef(false)
  const inboxErrorShownRef = useRef(false)
  const inboxRequestRef = useRef(false)
  const readRequestsRef = useRef<Set<string>>(new Set())
  const inFlightMessagesRef = useRef<Set<string>>(new Set())

  const loadInbox = useCallback(async () => {
    if (!sessionToken || !currentUserId) {
      setIsLoading(false)
      return
    }
    if (inboxRequestRef.current) return
    inboxRequestRef.current = true
    try {
      const [motherResponse, messageResponse] = await Promise.all([
        getMessageMothers(sessionToken),
        getMessages(sessionToken),
      ])
      const messageRecords = (messageResponse.data ?? []) as MessagePayload[]
      const sortedMessages = [...messageRecords].sort(
        (a, b) =>
          new Date(a.message_date ?? 0).getTime() -
          new Date(b.message_date ?? 0).getTime()
      )
      const motherRecordsByUser = new Map(
        (motherResponse.result ?? [])
          .filter((mother) => mother.user?.user_id)
          .map((mother) => [mother.user!.user_id, mother])
      )
      for (const message of sortedMessages) {
        for (const participant of [message.sender, message.receiver]) {
          if (
            participant?.user_id &&
            participant.role?.toLowerCase() === "mother" &&
            !motherRecordsByUser.has(participant.user_id)
          ) {
            motherRecordsByUser.set(participant.user_id, {
              mother_id: participant.user_id,
              user: participant,
            })
          }
        }
      }
      const motherRecords = [...motherRecordsByUser.values()]
      const nextConversations = motherRecords
        .map((mother) => toConversation(mother, sortedMessages, currentUserId))
        .filter((conversation): conversation is Conversation =>
          Boolean(conversation)
        )
        .sort((a, b) => b.activity - a.activity || a.name.localeCompare(b.name))
      const nextThreads: Record<string, ChatMessage[]> = {}
      for (const conversation of nextConversations) {
        nextThreads[conversation.id] = sortedMessages
          .filter(
            (message) =>
              (message.sender_id === conversation.id &&
                message.receiver_id === currentUserId) ||
              (message.sender_id === currentUserId &&
                message.receiver_id === conversation.id)
          )
          .map((message) => toChatMessage(message, currentUserId))
      }

      const newlyReceived = hasLoadedInboxRef.current
        ? sortedMessages.filter(
            (message) =>
              message.receiver_id === currentUserId &&
              !seenMessageIdsRef.current.has(message.message_id)
          )
        : []
      seenMessageIdsRef.current = new Set(
        sortedMessages.map((message) => message.message_id)
      )
      if (newlyReceived.length) {
        const senderNames = new Map(
          nextConversations.map((conversation) => [
            conversation.id,
            conversation.name,
          ])
        )
        const notifiedSenders = new Set<string>()
        for (const message of newlyReceived) {
          if (notifiedSenders.has(message.sender_id)) continue
          notifiedSenders.add(message.sender_id)
          toast.info(
            `${senderNames.get(message.sender_id) ?? "A patient"} sent you a message`
          )
        }
      }
      hasLoadedInboxRef.current = true
      inboxErrorShownRef.current = false
      setConversations(nextConversations)
      setThreads((current) => {
        const merged: Record<string, ChatMessage[]> = { ...nextThreads }
        for (const [id, msgs] of Object.entries(current)) {
          const pending = msgs.filter(
            (msg) =>
              msg.status === "sending" && inFlightMessagesRef.current.has(msg.id)
          )
          if (pending.length > 0) {
            const existingIds = new Set((merged[id] ?? []).map((m) => m.id))
            const uniquePending = pending.filter((m) => !existingIds.has(m.id))
            if (uniquePending.length > 0) {
              merged[id] = [...(merged[id] ?? []), ...uniquePending]
            }
          }
        }
        return merged
      })
      setSelectedId((current) =>
        nextConversations.some((conversation) => conversation.id === current)
          ? current
          : (nextConversations[0]?.id ?? "")
      )
    } catch (error) {
      if (!inboxErrorShownRef.current) {
        inboxErrorShownRef.current = true
        toast.error(
          error instanceof Error ? error.message : "Unable to load messages"
        )
      }
    } finally {
      inboxRequestRef.current = false
      setIsLoading(false)
    }
  }, [sessionToken, currentUserId])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadInbox(), 0)
    const interval = window.setInterval(() => void loadInbox(), 15000)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
    }
  }, [loadInbox])

  const selected = conversations.find(
    (conversation) => conversation.id === selectedId
  ) ??
    conversations[0] ?? {
      id: "",
      name: "Select a conversation",
      initials: "M",
      preview: "",
      time: "",
      activity: 0,
      unread: 0,
      lastSeen: "",
    }
  const messages = threads[selectedId] ?? []
  const unreadCount = conversations.reduce(
    (sum, conversation) => sum + conversation.unread,
    0
  )
  const filteredConversations = useMemo(() => {
    const filtered = conversations.filter((conversation) =>
      `${conversation.name} ${conversation.preview}`
        .toLowerCase()
        .includes(search.toLowerCase())
    )
    return [...filtered].sort((a, b) =>
      sortNewest ? b.activity - a.activity : a.activity - b.activity
    )
  }, [conversations, search, sortNewest])
  const visibleMessages = messages.filter(
    (message) =>
      !threadSearch.trim() ||
      message.text.toLowerCase().includes(threadSearch.toLowerCase())
  )

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: "end" })
  }, [selectedId, messages.length])

  useEffect(() => {
    if (
      !sessionToken ||
      !currentUserId ||
      !selected.id ||
      selected.unread === 0 ||
      readRequestsRef.current.has(selected.id)
    )
      return
    readRequestsRef.current.add(selected.id)
    markMessagesRead(sessionToken, {
      sender_id: selected.id,
      receiver_id: currentUserId,
    })
      .then(() => {
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === selected.id
              ? { ...conversation, unread: 0 }
              : conversation
          )
        )
        setThreads((current) => ({
          ...current,
          [selected.id]: (current[selected.id] ?? []).map((message) =>
            message.from === "mother" ? { ...message, isRead: true } : message
          ),
        }))
      })
      .catch((error: unknown) =>
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to mark messages as read"
        )
      )
      .finally(() => readRequestsRef.current.delete(selected.id))
  }, [selected.id, selected.unread, sessionToken, currentUserId])

  const selectConversation = (id: string) => {
    setSelectedId(id)
  }

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = draft.trim()
    const fileToUpload = attachment
    if ((!text && !fileToUpload) || !selected.id || !sessionToken)
      return

    const targetId = selected.id
    const nowTime = formatMessageTime(new Date().toISOString())
    const tempTextId = text ? `temp-text-${Date.now()}` : null
    const tempAttachmentId = fileToUpload ? `temp-file-${Date.now()}` : null

    const optimisticMessages: ChatMessage[] = []
    if (text && tempTextId) {
      optimisticMessages.push({
        id: tempTextId,
        from: "staff",
        text,
        time: nowTime,
        kind: "text",
        status: "sending",
      })
    }
    if (fileToUpload && tempAttachmentId) {
      const isImg = fileToUpload.type.startsWith("image/")
      const objectUrl = URL.createObjectURL(fileToUpload)
      optimisticMessages.push({
        id: tempAttachmentId,
        from: "staff",
        text: objectUrl,
        time: nowTime,
        kind: isImg ? "image" : "file",
        status: "sending",
      })
    }

    setDraft("")
    setAttachment(null)
    if (attachmentInputRef.current) attachmentInputRef.current.value = ""

    setThreads((current) => ({
      ...current,
      [targetId]: [...(current[targetId] ?? []), ...optimisticMessages],
    }))

    const previewText = fileToUpload
      ? `File · ${fileToUpload.name.length > 25 ? `${fileToUpload.name.slice(0, 22)}...` : fileToUpload.name}`
      : text.length > 42
        ? `${text.slice(0, 42)}...`
        : text

    setConversations((current) =>
      current.map((c) =>
        c.id === targetId
          ? {
              ...c,
              preview: previewText,
              time: nowTime,
              activity: Date.now(),
            }
          : c
      )
    )

    setTimeout(() => {
      threadEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 50)

    if (tempTextId) inFlightMessagesRef.current.add(tempTextId)
    if (tempAttachmentId) inFlightMessagesRef.current.add(tempAttachmentId)

    setIsSending(true)
    try {
      if (text && tempTextId) {
        const res = await createMessage(sessionToken, {
          receiver_id: targetId,
          message_content: text,
          message_type: "text",
        })
        inFlightMessagesRef.current.delete(tempTextId)
        const serverMsg = res.data
        if (serverMsg?.message_id) {
          setThreads((current) => ({
            ...current,
            [targetId]: (current[targetId] ?? []).map((msg) =>
              msg.id === tempTextId
                ? {
                    ...msg,
                    id: serverMsg.message_id,
                    status: "sent",
                    time: formatMessageTime(
                      serverMsg.message_date || new Date().toISOString()
                    ),
                  }
                : msg
            ),
          }))
        }
      }
      if (fileToUpload && tempAttachmentId) {
        const uploaded = await uploadMessageAttachment(
          sessionToken,
          fileToUpload
        )
        const fileUrl = uploaded.fileUrl ?? uploaded.file_url
        if (!fileUrl)
          throw new Error("The attachment upload did not return a file link.")
        const res = await createMessage(sessionToken, {
          receiver_id: targetId,
          message_content: fileUrl,
          message_type: uploaded.fileType === "image" ? "image" : "file",
        })
        inFlightMessagesRef.current.delete(tempAttachmentId)
        const serverMsg = res.data
        if (serverMsg?.message_id) {
          setThreads((current) => ({
            ...current,
            [targetId]: (current[targetId] ?? []).map((msg) =>
              msg.id === tempAttachmentId
                ? {
                    ...msg,
                    id: serverMsg.message_id,
                    text: fileUrl,
                    status: "sent",
                    time: formatMessageTime(
                      serverMsg.message_date || new Date().toISOString()
                    ),
                  }
                : msg
            ),
          }))
        }
      }
      await loadInbox()
    } catch (error) {
      if (tempTextId) inFlightMessagesRef.current.delete(tempTextId)
      if (tempAttachmentId) inFlightMessagesRef.current.delete(tempAttachmentId)
      setThreads((current) => ({
        ...current,
        [targetId]: (current[targetId] ?? []).map((msg) =>
          optimisticMessages.some((opt) => opt.id === msg.id)
            ? { ...msg, status: "failed" }
            : msg
        ),
      }))
      toast.error(
        error instanceof Error ? error.message : "Unable to send message"
      )
    } finally {
      setIsSending(false)
    }
  }

  const markAllRead = async () => {
    if (!sessionToken || unreadCount === 0) return
    try {
      await markMessagesRead(sessionToken)
      setConversations((current) =>
        current.map((conversation) => ({ ...conversation, unread: 0 }))
      )
      setThreads((current) =>
        Object.fromEntries(
          Object.entries(current).map(([id, thread]) => [
            id,
            thread.map((message) =>
              message.from === "mother" ? { ...message, isRead: true } : message
            ),
          ])
        )
      )
      toast.success("All conversations marked as read")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to mark messages as read"
      )
    }
  }

  return (
    <main className="h-full min-h-0 bg-background font-sans text-foreground">
      <TooltipProvider delayDuration={400}>
        <div
          className="grid h-full min-h-[520px] min-w-0 overflow-hidden"
          style={{
            gridTemplateColumns: isMobile
              ? "minmax(0, 1fr)"
              : "minmax(300px, 32%) minmax(0, 1fr)",
            gridTemplateRows: isMobile
              ? "minmax(220px, 38%) minmax(0, 1fr)"
              : "minmax(0, 1fr)",
          }}
        >
          <aside
            className={`flex min-h-0 min-w-0 flex-col ${isMobile ? "border-b" : "border-r"} border-border`}
          >
            <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-semibold text-foreground">
                    Messages
                  </h1>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground tabular-nums">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Conversations with mothers
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={markAllRead}
                      aria-label="Mark all as read"
                    >
                      <CheckCheck className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mark all as read</TooltipContent>
                </Tooltip>
              </div>
            </header>

            <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-3">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search messages..."
                  className="h-9 pl-9 text-xs"
                  aria-label="Search messages"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 gap-1 text-xs text-muted-foreground"
                  >
                    {sortNewest ? "Newest" : "Oldest"}
                    <ChevronDown className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setSortNewest(true)}>
                    Newest first
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setSortNewest(false)}>
                    Oldest first
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <nav aria-label="Conversations" className="space-y-1 p-2">
                {isLoading ? Array.from({ length: 6 }, (_, index) => <div key={`conversation-skeleton-${index}`} className="flex items-center gap-3 rounded-lg px-3 py-3" aria-hidden="true"><Skeleton className="size-10 shrink-0 rounded-full" /><div className="min-w-0 flex-1 space-y-2"><div className="flex justify-between gap-3"><Skeleton className="h-3.5 w-2/5" /><Skeleton className="h-3 w-12" /></div><Skeleton className="h-3 w-4/5" /></div></div>) : filteredConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => selectConversation(conversation.id)}
                    aria-current={
                      selectedId === conversation.id ? "true" : undefined
                    }
                    className={`flex w-full items-center gap-3 overflow-hidden rounded-lg px-3 py-3 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${selectedId === conversation.id ? "bg-accent" : ""}`}
                  >
                    <span className="relative shrink-0">
                      <PatientAvatar
                        conversation={conversation}
                        className="size-10"
                      />
                    </span>
                    <span className="min-w-0 flex-1 overflow-hidden">
                      <span className="flex items-baseline justify-between gap-2 min-w-0">
                        <span className="truncate text-xs font-semibold text-foreground">
                          {conversation.name}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {conversation.time}
                        </span>
                      </span>
                      <span className="mt-1 flex items-center justify-between gap-2 min-w-0 overflow-hidden">
                        <span className="truncate block min-w-0 flex-1 text-xs text-muted-foreground">
                          {conversation.preview}
                        </span>
                        {conversation.unread > 0 && (
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                            {conversation.unread}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                ))}
                {!isLoading && filteredConversations.length === 0 && (
                  <p className="px-3 py-8 text-center text-xs text-muted-foreground">
                    {search
                        ? "No conversations match your search."
                        : "No maternal conversations available."}
                  </p>
                )}
              </nav>
            </ScrollArea>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-col">
            <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border px-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <span className="relative shrink-0">
                  <PatientAvatar conversation={selected} className="size-9" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {selected.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selected.id
                      ? "Maternal care conversation"
                      : "Select a mother to view messages"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Search conversation"
                      onClick={() => {
                        setThreadSearchOpen((value) => !value)
                        setThreadSearch("")
                      }}
                    >
                      <Search className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Search conversation</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Show chat details"
                      onClick={() => setDetailsOpen(true)}
                    >
                      <PanelRight className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Chat details</TooltipContent>
                </Tooltip>
              </div>
            </header>

            {threadSearchOpen && (
              <div className="shrink-0 border-b border-border px-4 py-2 sm:px-6">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoFocus
                    value={threadSearch}
                    onChange={(event) => setThreadSearch(event.target.value)}
                    placeholder="Search this conversation..."
                    className="h-9 pl-9 text-xs"
                  />
                </div>
              </div>
            )}

            <ScrollArea className="min-h-0 flex-1 bg-muted/10">
              <div className="mx-auto flex w-full max-w-4xl flex-col px-4 py-5 sm:px-6">
                {isLoading && messages.length === 0 ? (
                  <div className="flex flex-col gap-6 py-6" aria-label="Loading messages" aria-busy="true">
                    <Skeleton className="mx-auto h-6 w-16 rounded-full" />
                    <div className="flex items-end gap-2"><Skeleton className="size-7 shrink-0 rounded-full" /><Skeleton className="h-14 w-2/3 rounded-2xl" /></div>
                    <div className="flex justify-end"><Skeleton className="h-16 w-3/4 rounded-2xl" /></div>
                    <div className="flex items-end gap-2"><Skeleton className="size-7 shrink-0 rounded-full" /><Skeleton className="h-12 w-1/2 rounded-2xl" /></div>
                  </div>
                ) : messages.length > 0 ? (
                  <>
                    <div className="mb-6 flex justify-center">
                      <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                        Today
                      </span>
                    </div>
                    <div className="flex flex-col gap-5">
                      {visibleMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex w-full items-end gap-2 ${message.from === "staff" ? "justify-end" : "justify-start"}`}
                        >
                          {message.from === "mother" && (
                            <PatientAvatar
                              conversation={selected}
                              className="mb-5 size-7"
                            />
                          )}
                          <div
                            className={`flex max-w-[min(75%,34rem)] min-w-0 flex-col gap-1 ${message.from === "staff" ? "items-end" : "items-start"}`}
                          >
                            <div
                              className={`w-fit max-w-full rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed break-words whitespace-pre-wrap transition-opacity ${message.from === "staff" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border border-border bg-card text-card-foreground"} ${message.status === "sending" ? "opacity-80" : ""}`}
                            >
                              {message.kind === "image" &&
                              /^(https?:\/\/|blob:|data:)/i.test(message.text) ? (
                                <a
                                  href={message.text}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label="Open shared image"
                                >
                                  <img
                                    src={message.text}
                                    alt="Shared attachment"
                                    className="max-h-64 max-w-full rounded-md object-contain"
                                  />
                                </a>
                              ) : message.kind === "file" &&
                                /^(https?:\/\/|blob:|data:)/i.test(message.text) ? (
                                <a
                                  href={message.text}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-2 underline underline-offset-2"
                                >
                                  <FileText className="size-4 shrink-0" />
                                  <span className="max-w-64 truncate">
                                    {decodeURIComponent(
                                      message.text
                                        .split("/")
                                        .pop()
                                        ?.split("?")[0] ?? "Download attachment"
                                    )}
                                  </span>
                                </a>
                              ) : (
                                message.text
                              )}
                            </div>
                            <span className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
                              {message.from === "staff" ? "You · " : ""}
                              {message.time}
                              {message.status === "sending" && (
                                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Loader2 className="size-3 animate-spin" />
                                  <span>Sending...</span>
                                </span>
                              )}
                              {message.status === "failed" && (
                                <span className="text-[11px] text-destructive">
                                  Failed to send
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                      {visibleMessages.length === 0 && (
                        <p className="py-8 text-center text-xs text-muted-foreground">
                          No messages match your search.
                        </p>
                      )}
                    </div>
                  </>
                ) : selected.id ? (
                  <div className="flex min-h-64 flex-col items-center justify-center text-center">
                    <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Send className="size-5" />
                    </span>
                    <p className="mt-3 text-sm font-semibold">
                      Start a conversation
                    </p>
                    <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                      Send {selected.name} a message about their care or
                      upcoming visit.
                    </p>
                  </div>
                ) : (
                  isLoading
                    ? <div className="flex min-h-64 flex-col items-center justify-center gap-3" aria-label="Loading messages" aria-busy="true"><Skeleton className="size-10 rounded-full" /><Skeleton className="h-3.5 w-36" /><Skeleton className="h-3 w-52 max-w-full" /></div>
                    : <p className="flex min-h-64 items-center justify-center text-xs text-muted-foreground">Choose a mother from the conversation list.</p>
                )}
                <div ref={threadEndRef} />
              </div>
            </ScrollArea>

            <form
              onSubmit={sendMessage}
              className="shrink-0 border-t border-border bg-background px-4 py-3 sm:px-6"
            >
              <div className="mx-auto flex w-full max-w-4xl items-center gap-2">
                <input
                  ref={attachmentInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  className="sr-only"
                  onChange={(event) =>
                    setAttachment(event.currentTarget.files?.[0] ?? null)
                  }
                  aria-label="Choose a message attachment"
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={!selected.id}
                      onClick={() => attachmentInputRef.current?.click()}
                      aria-label="Attach a file"
                      className="size-10 shrink-0"
                    >
                      <Paperclip className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Attach a file</TooltipContent>
                </Tooltip>
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={
                    selected.id
                      ? `Message ${selected.name}...`
                      : "Select a conversation to reply"
                  }
                  aria-label="Write your message"
                  className="h-10 min-w-0 flex-1 text-xs"
                  disabled={!selected.id}
                />
                {attachment && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setAttachment(null)
                      if (attachmentInputRef.current)
                        attachmentInputRef.current.value = ""
                    }}
                    className="max-w-36 shrink-0 gap-1 text-xs"
                  >
                    <span className="truncate">{attachment.name}</span>
                    <X className="size-3.5" />
                  </Button>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="submit"
                      size="icon"
                      disabled={(!draft.trim() && !attachment) || !selected.id || isSending}
                      aria-label="Send message"
                      className="size-10 shrink-0"
                    >
                      <Send className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Send message</TooltipContent>
                </Tooltip>
              </div>
            </form>
          </section>
        </div>

        <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
          <SheetContent
            side="right"
            className="w-3/4 border-sidebar-border shadow-none sm:max-w-sm"
            overlayClassName="bg-transparent backdrop-blur-none supports-backdrop-filter:backdrop-blur-none"
          >
            <DrawerHeading
              icon={MessageSquare}
              title="Chat details"
              description={`Conversation and shared items for ${selected.name}.`}
              className="pr-12"
            />
            <ScrollArea className="min-h-0 flex-1">
              <div className="flex items-center gap-3 border-b border-border px-5 py-5">
                <PatientAvatar conversation={selected} className="size-12" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {selected.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selected.id
                      ? "Maternal care conversation"
                      : "No conversation selected"}
                  </p>
                </div>
              </div>
              <section className="border-b border-border px-5 py-5">
                <h3 className="text-sm font-semibold">Conversation</h3>
                <dl className="mt-4 space-y-3 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Messages</dt>
                    <dd className="font-medium tabular-nums">
                      {messages.length}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Last activity</dt>
                    <dd className="font-medium">{selected.time}</dd>
                  </div>
                </dl>
              </section>
              <section className="space-y-5 px-5 py-5">
                <h3 className="text-sm font-semibold">Shared items</h3>
                <div className="flex items-start gap-3">
                  <Image className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium">Photos and videos</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      No media shared yet
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium">Files</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      No files shared yet
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Link2 className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium">Links</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      No links shared yet
                    </p>
                  </div>
                </div>
              </section>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </TooltipProvider>
    </main>
  )
}
