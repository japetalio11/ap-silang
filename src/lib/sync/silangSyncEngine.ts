import { db, type OfflineQueueItem, type SyncConflict } from "../db/silangDatabase"
import { apiRequest, ApiError } from "../api"
import { isAutoSyncOnReconnectEnabled } from "@/features/dashboard/offline-maternal-sync"

export interface SyncEngineStatus {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  conflictCount: number
  lastSyncedAt: number | null
  error: string | null
}

type SyncStatusListener = (status: SyncEngineStatus) => void

const LAST_SYNCED_KEY = "silang.sync.last-synced-at"

export class SilangSyncEngine {
  private isSyncing = false
  private listeners: Set<SyncStatusListener> = new Set()
  private lastSyncedAt: number | null = null
  private lastError: string | null = null
  private isOnlineState: boolean = typeof navigator !== "undefined" ? navigator.onLine : true
  private tempIdMap: Map<string, string> = new Map()

  constructor() {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(LAST_SYNCED_KEY)
      if (stored) this.lastSyncedAt = Number(stored)

      window.addEventListener("online", () => {
        this.setNetworkOnline(true)
      })
      window.addEventListener("offline", () => {
        this.setNetworkOnline(false)
      })
    }
  }

  public setNetworkOnline(online: boolean) {
    if (this.isOnlineState !== online) {
      this.isOnlineState = online
      this.notify()
      if (online && isAutoSyncOnReconnectEnabled()) {
        const sessionStr = window.localStorage.getItem("silang.auth.session")
        if (sessionStr) {
          try {
            const session = JSON.parse(sessionStr) as { token?: string }
            if (session.token) {
              void this.processQueue(session.token)
            }
          } catch {
            return
          }
        }
      }
    }
  }

  public subscribe(listener: SyncStatusListener) {
    this.listeners.add(listener)
    void this.notify()
    return () => {
      this.listeners.delete(listener)
    }
  }

  public async notify() {
    const pendingCount = await db.offlineQueue.where("status").equals("pending").count().catch(() => 0)
    const conflictCount = await db.conflicts.where("status").equals("unresolved").count().catch(() => 0)
    const status = {
      isOnline: this.isOnlineState,
      isSyncing: this.isSyncing,
      pendingCount,
      conflictCount,
      lastSyncedAt: this.lastSyncedAt,
      error: this.lastError,
    }
    for (const listener of this.listeners) {
      try {
        listener(status)
      } catch {
        continue
      }
    }
  }

  public async enqueue(item: Omit<OfflineQueueItem, "id" | "created_at" | "retry_count" | "status">) {
    const queueItem: OfflineQueueItem = {
      ...item,
      created_at: Date.now(),
      retry_count: 0,
      status: "pending",
    }
    const id = await db.offlineQueue.add(queueItem)
    await this.notify()
    return id
  }

  private resolvePayloadReferences(payload: unknown): Record<string, unknown> {
    if (!payload || typeof payload !== "object") return {}
    const clone = { ...(payload as Record<string, unknown>) }

    if (typeof clone.mother_id === "string" && this.tempIdMap.has(clone.mother_id)) {
      clone.mother_id = this.tempIdMap.get(clone.mother_id)
    }
    if (typeof clone.motherId === "string" && this.tempIdMap.has(clone.motherId)) {
      clone.motherId = this.tempIdMap.get(clone.motherId)
    }
    if (typeof clone.pregnancy_id === "string" && this.tempIdMap.has(clone.pregnancy_id)) {
      clone.pregnancy_id = this.tempIdMap.get(clone.pregnancy_id)
    }
    if (typeof clone.pregnancyId === "string" && this.tempIdMap.has(clone.pregnancyId)) {
      clone.pregnancyId = this.tempIdMap.get(clone.pregnancyId)
    }
    return clone
  }

  private async uploadBlobsIfAny(blobIds?: string[], token?: string): Promise<Record<string, string>> {
    if (!blobIds || !blobIds.length || !token) return {}
    const uploadedUrls: Record<string, string> = {}
    for (const blobId of blobIds) {
      const localBlob = await db.blobs.get(blobId)
      if (localBlob) {
        const formData = new FormData()
        formData.append("file", localBlob.data, localBlob.filename)
        const response = await apiRequest<{ file_url: string }>("/lab-screening/upload", {
          method: "POST",
          token,
          body: formData,
        })
        if (response.file_url) {
          uploadedUrls[blobId] = response.file_url
          await db.blobs.delete(blobId)
        }
      }
    }
    return uploadedUrls
  }

  public async processQueue(token: string): Promise<{ synced: number; conflicts: number; errors: number }> {
    if (this.isSyncing || !navigator.onLine) {
      return { synced: 0, conflicts: 0, errors: 0 }
    }

    this.isSyncing = true
    this.lastError = null
    await this.notify()

    let synced = 0
    let conflicts = 0
    let errors = 0

    try {
      const pendingItems = await db.offlineQueue.where("status").equals("pending").sortBy("created_at")

      for (const item of pendingItems) {
        if (!navigator.onLine) break
        if (!item.id) continue

        await db.offlineQueue.update(item.id, { status: "processing" })

        try {
          const resolvedPayload = this.resolvePayloadReferences(item.payload)

          if (item.blob_ids && item.blob_ids.length > 0) {
            const uploadedUrls = await this.uploadBlobsIfAny(item.blob_ids, token)
            for (const [blobId, url] of Object.entries(uploadedUrls)) {
              if (resolvedPayload.file_url === blobId) resolvedPayload.file_url = url
            }
          }

          let response: Record<string, unknown> | null = null

          if (item.method === "POST") {
            response = await apiRequest<Record<string, unknown>>(item.endpoint, {
              method: "POST",
              token,
              body: JSON.stringify(resolvedPayload),
            })
          } else if (item.method === "PUT") {
            response = await apiRequest<Record<string, unknown>>(item.endpoint, {
              method: "PUT",
              token,
              body: JSON.stringify(resolvedPayload),
            })
          } else if (item.method === "DELETE") {
            response = await apiRequest<Record<string, unknown>>(item.endpoint, {
              method: "DELETE",
              token,
            })
          }

          if (item.entity_type === "mother" && item.action === "CREATE") {
            const serverMother = ((response?.result ?? response?.mother ?? response?.data) ?? {}) as Record<string, unknown>
            const serverMotherId = typeof serverMother.mother_id === "string" ? serverMother.mother_id : undefined
            if (serverMotherId && item.temp_id) {
              this.tempIdMap.set(item.temp_id, serverMotherId)
              const localMother = await db.mothers.get(item.temp_id)
              if (localMother) {
                await db.mothers.delete(item.temp_id)
                await db.mothers.put({
                  ...localMother,
                  id: serverMotherId,
                  mother_id: serverMotherId,
                  sync_status: "synced",
                  user_id: typeof serverMother.user_id === "string" ? serverMother.user_id : localMother.user_id,
                  version: typeof serverMother.version === "number" ? serverMother.version : localMother.version,
                  updated_at: Date.now(),
                })
              }
            }
          } else if (item.entity_type === "pregnancy" && item.action === "CREATE") {
            const serverPregnancy = ((response?.pregnancy ?? response?.result ?? response?.data) ?? {}) as Record<string, unknown>
            const serverPregId = typeof serverPregnancy.pregnancy_id === "string" ? serverPregnancy.pregnancy_id : undefined
            if (serverPregId && item.temp_id) {
              this.tempIdMap.set(item.temp_id, serverPregId)
              const localPreg = await db.pregnancies.get(item.temp_id)
              if (localPreg) {
                await db.pregnancies.delete(item.temp_id)
                await db.pregnancies.put({
                  ...localPreg,
                  id: serverPregId,
                  pregnancy_id: serverPregId,
                  sync_status: "synced",
                  mother_id: this.tempIdMap.get(localPreg.mother_id) || localPreg.mother_id,
                  version: typeof serverPregnancy.version === "number" ? serverPregnancy.version : localPreg.version,
                  updated_at: Date.now(),
                })
              }
            }
          } else if (item.temp_id) {
            const serverRecord = ((response?.result ?? response?.data ?? response) ?? {}) as Record<string, unknown>
            const serverId = (serverRecord.visit_id || serverRecord.appointment_id || serverRecord.referral_id || serverRecord.prescription_id || serverRecord.screening_id || serverRecord.delivery_id) as string | undefined
            if (serverId) {
              this.tempIdMap.set(item.temp_id, serverId)
            }
          }

          await db.offlineQueue.delete(item.id)
          synced++
        } catch (error: unknown) {
          if (error instanceof ApiError && error.status === 409) {
            conflicts++
            const conflictRecord: SyncConflict = {
              conflict_id: crypto.randomUUID(),
              entity_type: item.entity_type,
              entity_id: item.temp_id || item.endpoint,
              endpoint: item.endpoint,
              method: item.method,
              server_record: {},
              client_payload: (item.payload && typeof item.payload === "object" ? item.payload : {}) as Record<string, unknown>,
              conflicting_fields: [],
              status: "unresolved",
              detected_at: Date.now(),
              last_error: error.message,
            }
            await db.conflicts.add(conflictRecord)
            await db.offlineQueue.update(item.id, {
              status: "conflict",
              last_error: error.message,
            })
          } else {
            errors++
            const isOfflineFail = error instanceof TypeError || !navigator.onLine
            const message = error instanceof Error ? error.message : "Failed to sync"
            await db.offlineQueue.update(item.id, {
              status: isOfflineFail ? "pending" : "error",
              retry_count: item.retry_count + 1,
              last_error: message,
            })
            if (isOfflineFail) break
          }
        }
      }

      if (synced > 0) {
        this.lastSyncedAt = Date.now()
        window.localStorage.setItem(LAST_SYNCED_KEY, String(this.lastSyncedAt))
      }
    } catch (err: unknown) {
      this.lastError = err instanceof Error ? err.message : "Sync queue error"
    } finally {
      this.isSyncing = false
      await this.notify()
    }

    return { synced, conflicts, errors }
  }
}

export const silangSyncEngine = new SilangSyncEngine()
