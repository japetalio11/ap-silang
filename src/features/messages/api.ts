import { apiRequest } from "@/lib/api"

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

export function getMessages(token: string) {
  return apiRequest<MessageListResponse>("/message/getAll", { token })
}

export function getMessageMothers(token: string) {
  return apiRequest<{ result?: MessageMother[] }>("/mother/active", { token })
}

export function createMessage(
  token: string,
  input: { receiver_id: string; message_content: string; message_type?: string }
) {
  return apiRequest<{ data?: MessageRecord; message?: string }>(
    "/message/create",
    {
      method: "POST",
      token,
      body: JSON.stringify({ message_type: "text", ...input }),
    }
  )
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

export function uploadMessageAttachment(token: string, file: File) {
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
