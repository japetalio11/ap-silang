import { getMaternalProfile, type MaternalCompositeRecord, type RegisterMaternalRecordInput } from "@/features/maternal-records/api"
import { ApiError, apiRequest } from "@/lib/api"

export type OfflineConflictField = {
  key: keyof RegisterMaternalRecordInput
  label: string
  cloudValue: string
  deviceValue: string
}

export type PendingMotherUpdate = {
  id: string
  motherId: string
  motherName: string
  queuedAt: string
  baseRecord: MaternalCompositeRecord
  changes: Partial<RegisterMaternalRecordInput>
  state: "pending" | "conflict"
  serverRecord?: MaternalCompositeRecord
  conflictingFields?: OfflineConflictField[]
  lastError?: string
}

type SyncSummary = { synced: number; conflicts: number; pending: number }

const DATABASE_NAME = "silang-offline-sync"
const STORE_NAME = "mother-profile-outbox"
const LAST_SYNCED_KEY = "silang.offline.last-synced"
const AUTO_SYNC_KEY = "silang.settings.auto-sync-on-reconnect"

export function isAutoSyncOnReconnectEnabled() {
  return window.localStorage.getItem(AUTO_SYNC_KEY) !== "false"
}

const fields: Array<{
  key: keyof RegisterMaternalRecordInput
  label: string
  read: (record: MaternalCompositeRecord) => unknown
}> = [
  { key: "first_name", label: "First Name", read: (record) => record.user?.first_name },
  { key: "middle_name", label: "Middle Name", read: (record) => record.user?.middle_name },
  { key: "last_name", label: "Last Name", read: (record) => record.user?.last_name },
  { key: "address", label: "Address", read: (record) => record.user?.address },
  { key: "phone_number", label: "Phone Number", read: (record) => record.user?.phone_number },
  { key: "email", label: "Email", read: (record) => record.user?.email },
  { key: "birth_date", label: "Date of Birth", read: (record) => record.birth_date },
  { key: "civil_status", label: "Civil Status", read: (record) => record.civil_status },
  { key: "blood_type", label: "Blood Type", read: (record) => record.blood_type },
  { key: "family_serial_no", label: "Family Serial No.", read: (record) => record.family_serial_no },
]

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "id" })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("Could not open local sync storage"))
  })
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase()
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode)
      const request = run(transaction.objectStore(STORE_NAME))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error("Could not access local sync storage"))
      transaction.onabort = () => reject(transaction.error ?? new Error("Local sync storage transaction failed"))
    })
  } finally {
    database.close()
  }
}

function notifyOutboxChanged() {
  window.dispatchEvent(new Event("silang:outbox-updated"))
}

export async function getPendingMotherUpdates() {
  const rows = await withStore<PendingMotherUpdate[]>("readonly", (store) => store.getAll())
  return rows.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt))
}

export async function enqueueMotherProfileUpdate(input: Omit<PendingMotherUpdate, "id" | "queuedAt" | "state">) {
  const existing = (await getPendingMotherUpdates()).find((item) => item.motherId === input.motherId && item.state === "pending")
  const item: PendingMotherUpdate = existing
    ? { ...existing, changes: { ...existing.changes, ...input.changes }, motherName: input.motherName, lastError: undefined }
    : { ...input, id: crypto.randomUUID(), queuedAt: new Date().toISOString(), state: "pending" }
  await withStore("readwrite", (store) => existing ? store.put(item) : store.add(item))
  notifyOutboxChanged()
  return item
}

async function savePendingUpdate(item: PendingMotherUpdate) {
  await withStore("readwrite", (store) => store.put(item))
  notifyOutboxChanged()
}

async function removePendingUpdate(id: string) {
  await withStore("readwrite", (store) => store.delete(id))
  notifyOutboxChanged()
}

function comparable(value: unknown, key: keyof RegisterMaternalRecordInput) {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") return (key === "birth_date" ? value.slice(0, 10) : value).trim().toLowerCase()
  return String(value).trim().toLowerCase()
}

function findConflicts(item: PendingMotherUpdate, serverRecord: MaternalCompositeRecord): OfflineConflictField[] {
  const conflicts: OfflineConflictField[] = []
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(item.changes, field.key)) continue
    const deviceValue = item.changes[field.key]
    const baseValue = field.read(item.baseRecord)
    const cloudValue = field.read(serverRecord)
    const deviceChanged = comparable(deviceValue, field.key) !== comparable(baseValue, field.key)
    const cloudChanged = comparable(cloudValue, field.key) !== comparable(baseValue, field.key)
    if (deviceChanged && cloudChanged && comparable(deviceValue, field.key) !== comparable(cloudValue, field.key)) {
      conflicts.push({ key: field.key, label: field.label, cloudValue: String(cloudValue ?? "—"), deviceValue: String(deviceValue ?? "—") })
    }
  }
  return conflicts
}

async function sendMotherUpdate(token: string, motherId: string, changes: Partial<RegisterMaternalRecordInput>, serverRecord: MaternalCompositeRecord) {
  const motherChanges: Partial<RegisterMaternalRecordInput> = {}
  const userChanges: Partial<RegisterMaternalRecordInput> = {}
  const motherKeys = ["birth_date", "civil_status", "blood_type", "family_serial_no"] as const
  for (const [key, value] of Object.entries(changes) as Array<[keyof RegisterMaternalRecordInput, unknown]>) {
    if (motherKeys.includes(key as typeof motherKeys[number])) Object.assign(motherChanges, { [key]: value })
    else Object.assign(userChanges, { [key]: value })
  }

  // The mother update endpoint also writes linked user fields before its MVCC
  // check. Keep those writes separate so a stale mother version cannot partially
  // overwrite the profile before the server reports a conflict.
  if (Object.keys(motherChanges).length) {
    await apiRequest<{ message?: string; result?: MaternalCompositeRecord }>(`/mother/update/${encodeURIComponent(motherId)}`, {
      method: "PUT",
      token,
      body: JSON.stringify({ ...motherChanges, version: serverRecord.version ?? 1 }),
    })
  }

  if (Object.keys(userChanges).length) {
    const userId = serverRecord.user?.user_id
    if (!userId) throw new Error("This maternal record has no linked account to update.")
    await apiRequest<{ success?: boolean; record?: unknown }>("/sync/resolve-conflict", {
      method: "POST",
      token,
      body: JSON.stringify({
        modelName: "user",
        recordId: userId,
        strategy: "CUSTOM",
        customData: userChanges,
        clientRecord: { ...userChanges, version: serverRecord.user?.version ?? 1 },
      }),
    })
  }
}

export async function syncMotherOutbox(token: string): Promise<SyncSummary> {
  const items = await getPendingMotherUpdates()
  let synced = 0

  for (const item of items) {
    if (item.state === "conflict") continue
    try {
      const { result: serverRecord } = await getMaternalProfile(token, item.motherId)
      const conflicts = findConflicts(item, serverRecord)
      if (conflicts.length) {
        await savePendingUpdate({ ...item, state: "conflict", serverRecord, conflictingFields: conflicts, lastError: undefined })
        continue
      }

      await sendMotherUpdate(token, item.motherId, item.changes, serverRecord)
      await removePendingUpdate(item.id)
      synced += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sync this maternal profile update"
      if (error instanceof ApiError && error.status === 409) {
        try {
          const { result: serverRecord } = await getMaternalProfile(token, item.motherId)
          const conflicts = findConflicts(item, serverRecord)
          if (conflicts.length) {
            await savePendingUpdate({ ...item, state: "conflict", serverRecord, conflictingFields: conflicts, lastError: undefined })
            continue
          }
          await sendMotherUpdate(token, item.motherId, item.changes, serverRecord)
          await removePendingUpdate(item.id)
          synced += 1
          continue
        } catch (retryError) {
          await savePendingUpdate({ ...item, lastError: retryError instanceof Error ? retryError.message : message })
        }
      } else {
        await savePendingUpdate({ ...item, lastError: message })
      }
      if (!navigator.onLine || error instanceof TypeError) break
    }
  }

  const remaining = await getPendingMotherUpdates()
  if (synced) window.localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString())
  return {
    synced,
    conflicts: remaining.filter((item) => item.state === "conflict").length,
    pending: remaining.filter((item) => item.state === "pending").length,
  }
}

export function getLastSyncedAt() {
  return window.localStorage.getItem(LAST_SYNCED_KEY)
}

export async function resolveMotherUpdateConflict(itemId: string, token: string, choices: Record<string, "cloud" | "device">) {
  const item = (await getPendingMotherUpdates()).find((candidate) => candidate.id === itemId)
  if (!item) throw new Error("This offline update is no longer in the queue.")

  const { result: serverRecord } = await getMaternalProfile(token, item.motherId)
  const conflicts = findConflicts(item, serverRecord)
  const previousConflicts = item.conflictingFields ?? []
  const conflictViewChanged = conflicts.length !== previousConflicts.length || conflicts.some((field, index) => {
    const previous = previousConflicts[index]
    return !previous || previous.key !== field.key || previous.cloudValue !== field.cloudValue || previous.deviceValue !== field.deviceValue
  })
  if (conflictViewChanged) {
    await savePendingUpdate({ ...item, state: conflicts.length ? "conflict" : "pending", serverRecord, conflictingFields: conflicts })
    throw new Error("The online record changed again. Review the updated values before applying.")
  }
  const unresolved = conflicts.filter((field) => !choices[field.key])
  if (unresolved.length) throw new Error("Choose the version to keep for each changed field.")

  const changes: Partial<RegisterMaternalRecordInput> = {}
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(item.changes, field.key)) continue
    const conflict = conflicts.find((candidate) => candidate.key === field.key)
    if (conflict && choices[field.key] === "cloud") continue
    Object.assign(changes, { [field.key]: item.changes[field.key] })
  }

  if (Object.keys(changes).length) {
    await sendMotherUpdate(token, item.motherId, changes, serverRecord)
  }
  await removePendingUpdate(item.id)
  window.localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString())
}

export function isNetworkFailure(error: unknown) {
  return error instanceof TypeError || !navigator.onLine
}
