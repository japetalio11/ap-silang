import { apiRequest } from "@/lib/api"

export async function verifyCurrentUserPassword(token: string, userId: string, password: string) {
  const { result: user } = await apiRequest<{ result: { user_id: string; email?: string | null; phone_number?: string | null } }>(`/user/${encodeURIComponent(userId)}`, { token })
  const identifier = user.email || user.phone_number
  if (!identifier) throw new Error("Your account has no email address or phone number to verify against.")

  const response = await apiRequest<{ user: { user_id: string } }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  })
  if (response.user?.user_id !== userId) throw new Error("The password did not match the signed-in account.")
}
