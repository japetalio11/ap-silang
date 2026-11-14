import { apiRequest } from "@/lib/api"

export type NotificationRecord = {
  notification_id: string
  user_id: string
  notification_type?: string | null
  notification_message: string
  notification_date?: string | null
  is_read?: boolean
  sender?: string | null
  category?: string | null
  link?: string | null
}

type NotificationListResponse = {
  message?: string
  notifications?: NotificationRecord[]
}

export async function getUserNotifications(token: string, userId: string) {
  const response = await apiRequest<NotificationListResponse>(
    `/notification/get/user/${encodeURIComponent(userId)}`,
    { token, cache: "no-store" },
  )
  return response.notifications ?? []
}

export function markNotificationRead(token: string, userId: string, notificationId: string) {
  return apiRequest<{ message?: string; notification?: NotificationRecord }>(
    `/notification/update/${encodeURIComponent(notificationId)}`,
    {
      method: "PUT",
      token,
      body: JSON.stringify({ user_id: userId, is_read: true }),
    },
  )
}

export function markAllNotificationsRead(token: string, userId: string) {
  return apiRequest<{ message?: string }>(
    `/notification/mark/read/${encodeURIComponent(userId)}`,
    { method: "PUT", token },
  )
}
