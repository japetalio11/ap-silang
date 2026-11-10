import { apiRequest } from "@/lib/api"
import { db, type LocalMessage } from "@/lib/db/silangDatabase"
import { silangSyncEngine } from "@/lib/sync/silangSyncEngine"

export type MessageUser = {
  user_id: string
  first_name?: string | null
  last_name?: string | null
  role?: string | null
  profile_url?: string | null
  facility_id?: string | null
}

export type MessageRecord = {
  message_id: string
  sender_id: string
  receiver_id: string
  message_type?: string | null
  message_content?: string | null
  message_date?: string | null
  is_read?: boolean
  sender?: MessageUser | null
  receiver?: MessageUser | null
}

export type MessageMother = {
  mother_id: string
  user?: MessageUser | null
}

export type MessageListResponse = {
  data?: MessageRecord[]
  contact?: MessageUser | null
  hasFacility?: boolean
}

export async function getMessages(token: string): Promise<MessageListResponse> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const local = await db.messages.toArray().catch(() => [])
    if (local.length > 0) {
      return {
        data: local.map((m) => ({
          message_id: m.message_id,
          sender_id: m.sender_id,
          receiver_id: m.receiver_id,
          message_type: m.message_type,
          message_content: m.message_content,
          message_date: m.message_date,
          is_read: m.is_read,
        })),
      }
    }
  }

  try {
    const res = await apiRequest<MessageListResponse>("/message/getAll", { token })
    if (Array.isArray(res.data)) {
      for (const m of res.data) {
        await db.messages.put({
          id: m.message_id,
          message_id: m.message_id,
          sender_id: m.sender_id,
          receiver_id: m.receiver_id,
          message_type: m.message_type || "text",
          message_content: m.message_content || "",
          message_date: m.message_date || new Date().toISOString(),
          is_read: m.is_read ?? false,
          sync_status: "synced",
          updated_at: Date.now(),
        }).catch(() => {})
      }
    }
    const pending = await db.messages.where("sync_status").anyOf("pending_create").toArray().catch(() => [])
    const onlineIds = new Set((res.data || []).map((m) => m.message_id))
    const uniquePending = pending.filter((m) => !onlineIds.has(m.message_id)).map((m) => ({
      message_id: m.message_id,
      sender_id: m.sender_id,
      receiver_id: m.receiver_id,
      message_type: m.message_type,
      message_content: m.message_content,
      message_date: m.message_date,
      is_read: m.is_read,
    }))
    return { ...res, data: [...(res.data || []), ...uniquePending] }
  } catch (error) {
    const local = await db.messages.toArray().catch(() => [])
    if (local.length > 0) {
      return {
        data: local.map((m) => ({
          message_id: m.message_id,
          sender_id: m.sender_id,
          receiver_id: m.receiver_id,
          message_type: m.message_type,
          message_content: m.message_content,
          message_date: m.message_date,
          is_read: m.is_read,
        })),
      }
    }
    throw error
  }
}

export function getMessageMothers(token: string) {
  return apiRequest<{ result?: MessageMother[] }>("/mother/active", { token })
}

export async function createMessage(
  token: string,
  input: { receiver_id: string; message_content: string; message_type?: string }
): Promise<{ data?: MessageRecord; message?: string; offline?: boolean }> {
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine

  if (isOffline) {
    const tempId = `temp-msg-${crypto.randomUUID()}`
    const sessionStr = window.localStorage.getItem("silang.auth.session")
    let currentUserId = "offline-user"
    if (sessionStr) {
      try {
        const parsed = JSON.parse(sessionStr)
        if (parsed.user?.user_id) currentUserId = parsed.user.user_id
      } catch {}
    }
    const localMsg: LocalMessage = {
      id: tempId,
      message_id: tempId,
      sender_id: currentUserId,
      receiver_id: input.receiver_id,
      message_type: input.message_type || "text",
      message_content: input.message_content,
      message_date: new Date().toISOString(),
      is_read: false,
      sync_status: "pending_create",
      updated_at: Date.now(),
    }
    await db.messages.put(localMsg)
    await silangSyncEngine.enqueue({
      client_mutation_id: crypto.randomUUID(),
      entity_type: "message",
      action: "CREATE",
      endpoint: "/message/create",
      method: "POST",
      payload: { message_type: "text", ...input },
      temp_id: tempId,
    })
    return { message: "Message sent offline", data: localMsg as any, offline: true }
  }

  try {
    const res = await apiRequest<{ data?: MessageRecord; message?: string }>(
      "/message/create",
      {
        method: "POST",
        token,
        body: JSON.stringify({ message_type: "text", ...input }),
      }
    )
    if (res.data) {
      await db.messages.put({
        id: res.data.message_id,
        message_id: res.data.message_id,
        sender_id: res.data.sender_id,
        receiver_id: res.data.receiver_id,
        message_type: res.data.message_type || "text",
        message_content: res.data.message_content || "",
        message_date: res.data.message_date || new Date().toISOString(),
        is_read: res.data.is_read ?? false,
        sync_status: "synced",
        updated_at: Date.now(),
      }).catch(() => {})
    }
    return res
  } catch (error: any) {
    if (error instanceof TypeError || !navigator.onLine) {
      const tempId = `temp-msg-${crypto.randomUUID()}`
      const sessionStr = window.localStorage.getItem("silang.auth.session")
      let currentUserId = "offline-user"
      if (sessionStr) {
        try {
          const parsed = JSON.parse(sessionStr)
          if (parsed.user?.user_id) currentUserId = parsed.user.user_id
        } catch {}
      }
      const localMsg: LocalMessage = {
        id: tempId,
        message_id: tempId,
        sender_id: currentUserId,
        receiver_id: input.receiver_id,
        message_type: input.message_type || "text",
        message_content: input.message_content,
        message_date: new Date().toISOString(),
        is_read: false,
        sync_status: "pending_create",
        updated_at: Date.now(),
      }
      await db.messages.put(localMsg)
      await silangSyncEngine.enqueue({
        client_mutation_id: crypto.randomUUID(),
        entity_type: "message",
        action: "CREATE",
        endpoint: "/message/create",
        method: "POST",
        payload: { message_type: "text", ...input },
        temp_id: tempId,
      })
      return { message: "Message sent offline", data: localMsg as any, offline: true }
    }
    throw error
  }
}

export function markMessagesRead(
  token: string,
  input: { sender_id?: string; receiver_id?: string } = {}
) {
  return apiRequest<{ message?: string; data?: { count?: number } }>(
    "/message/markAllAsRead",
    {
      method: "PUT",
      token,
      body: JSON.stringify(input),
    }
  )
}

export async function uploadMessageAttachment(token: string, file: File) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const blobId = `blob-${crypto.randomUUID()}`
    await db.blobs.put({
      id: blobId,
      data: file,
      filename: file.name,
      mime_type: file.type,
    })
    return { fileUrl: blobId, file_url: blobId, fileName: file.name, fileType: file.type }
  }
  const body = new FormData()
  body.append("file", file)
  return apiRequest<{
    fileUrl?: string
    file_url?: string
    fileName?: string
    fileType?: string
    fileSize?: string
  }>("/message/upload", { method: "POST", token, body })
}
