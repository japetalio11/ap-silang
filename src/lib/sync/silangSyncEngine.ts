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
  private tempUserIdMap: Map<string, string> = new Map()

  constructor() {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(LAST_SYNCED_KEY)
      if (stored) this.lastSyncedAt = Number(stored)

      void this.rehydrateMappings()

      window.addEventListener("online", () => {
        this.setNetworkOnline(true)
      })
      window.addEventListener("offline", () => {
        this.setNetworkOnline(false)
      })
    }
  }

  private async rehydrateMappings() {
    try {
      const stored = await db.idMappings.toArray().catch(() => [])
      for (const m of stored) {
        if (m.temp_id && m.canonical_id) {
          this.tempIdMap.set(m.temp_id, m.canonical_id)
        }
        if (m.temp_id && m.canonical_user_id) {
          this.tempUserIdMap.set(m.temp_id, m.canonical_user_id)
        }
      }
      const mothers = await db.mothers.toArray().catch(() => [])
      for (const m of mothers) {
        if (m.id && m.mother_id && m.id !== m.mother_id && m.id.startsWith("temp-") && !m.mother_id.startsWith("temp-")) {
          this.tempIdMap.set(m.id, m.mother_id)
        }
        if (m.id && m.user_id && m.id.startsWith("temp-") && !m.user_id.startsWith("temp-")) {
          this.tempUserIdMap.set(m.id, m.user_id)
        }
      }
      const pregs = await db.pregnancies.toArray().catch(() => [])
      for (const p of pregs) {
        if (p.id && p.pregnancy_id && p.id !== p.pregnancy_id && p.id.startsWith("temp-") && !p.pregnancy_id.startsWith("temp-")) {
          this.tempIdMap.set(p.id, p.pregnancy_id)
        }
      }
    } catch {
      return
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
    const pendingCount = await db.offlineQueue.where("status").anyOf("pending", "processing").count().catch(() => 0)
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

  public isItemBlocked(item: OfflineQueueItem, queue: OfflineQueueItem[]): boolean {
    return this.isParentPendingInQueue(item, queue)
  }

  private isParentPendingInQueue(item: OfflineQueueItem, queue: OfflineQueueItem[]): boolean {
    if (!item.payload || typeof item.payload !== "object") return false
    const payload = item.payload as Record<string, unknown>
    const currentIndex = queue.findIndex((q) => q.id === item.id)
    if (currentIndex <= 0) return false

    const checkIds: string[] = []
    for (const key of ["mother_id", "motherId", "pregnancy_id", "pregnancyId", "user_id"]) {
      const val = payload[key]
      if (typeof val === "string" && val.startsWith("temp-")) {
        if (!this.tempIdMap.has(val) && !this.tempUserIdMap.has(val)) {
          checkIds.push(val)
        }
      }
    }
    if (checkIds.length === 0) return false

    for (let i = 0; i < currentIndex; i++) {
      const prev = queue[i]
      if (prev.status === "pending" || prev.status === "processing") {
        if (prev.temp_id && checkIds.includes(prev.temp_id)) {
          return true
        }
      }
    }
    return false
  }

  public async discardQueueItem(id: number) {
    await db.offlineQueue.delete(id).catch(() => {})
    await this.notify()
  }

  public async clearFailedQueueItems() {
    const failed = await db.offlineQueue.where("status").equals("error").toArray().catch(() => [])
    for (const item of failed) {
      if (item.id) {
        await db.offlineQueue.delete(item.id).catch(() => {})
      }
    }
    const all = await db.offlineQueue.toArray().catch(() => [])
    for (const item of all) {
      if (item.last_error && item.id) {
        await db.offlineQueue.delete(item.id).catch(() => {})
      }
    }
    await this.notify()
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

  private async resolvePayloadReferences(payload: unknown, entityType?: string): Promise<Record<string, unknown>> {
    if (!payload || typeof payload !== "object") return {}
    const clone = { ...(payload as Record<string, unknown>) }

    for (const key of ["mother_id", "motherId"] as const) {
      const val = clone[key]
      if (typeof val === "string") {
        if (this.tempIdMap.has(val)) {
          clone[key] = this.tempIdMap.get(val)!
        } else {
          const mapping = await db.idMappings.get(val).catch(() => null)
          if (mapping?.canonical_id) {
            this.tempIdMap.set(val, mapping.canonical_id)
            clone[key] = mapping.canonical_id
          } else if (val.startsWith("temp-")) {
            const localM = await db.mothers.get(val).catch(() => null)
            if (localM && localM.mother_id && !localM.mother_id.startsWith("temp-")) {
              this.tempIdMap.set(val, localM.mother_id)
              clone[key] = localM.mother_id
            }
          }
        }
      }
    }

    for (const key of ["pregnancy_id", "pregnancyId"] as const) {
      const val = clone[key]
      if (typeof val === "string") {
        if (this.tempIdMap.has(val)) {
          clone[key] = this.tempIdMap.get(val)!
        } else {
          const mapping = await db.idMappings.get(val).catch(() => null)
          if (mapping?.canonical_id) {
            this.tempIdMap.set(val, mapping.canonical_id)
            clone[key] = mapping.canonical_id
          } else if (val.startsWith("temp-")) {
            const localP = await db.pregnancies.get(val).catch(() => null)
            if (localP && localP.pregnancy_id && !localP.pregnancy_id.startsWith("temp-")) {
              this.tempIdMap.set(val, localP.pregnancy_id)
              clone[key] = localP.pregnancy_id
            }
            if (localP?.mother_id && !clone.mother_id && !clone.motherId) {
              const mappedMother = this.tempIdMap.get(localP.mother_id) || localP.mother_id
              clone.mother_id = mappedMother
            }
          }
        }
      }
    }

    if (typeof clone.user_id === "string") {
      const val = clone.user_id
      if (this.tempUserIdMap.has(val)) {
        clone.user_id = this.tempUserIdMap.get(val)!
      } else if (this.tempIdMap.has(val)) {
        clone.user_id = this.tempIdMap.get(val)!
      } else {
        const mapping = await db.idMappings.get(val).catch(() => null)
        if (mapping?.canonical_user_id) {
          this.tempUserIdMap.set(val, mapping.canonical_user_id)
          clone.user_id = mapping.canonical_user_id
        } else if (mapping?.canonical_id) {
          clone.user_id = mapping.canonical_id
        }
      }
    }

    if (!clone.user_id && clone.mother_id) {
      const motherIdStr = String(clone.mother_id)
      if (this.tempUserIdMap.has(motherIdStr)) {
        clone.user_id = this.tempUserIdMap.get(motherIdStr)!
      } else {
        const localM = await db.mothers.get(motherIdStr).catch(() => null)
        if (localM?.user_id) {
          clone.user_id = localM.user_id
        } else if (localM?.user?.user_id) {
          clone.user_id = localM.user.user_id
        }
      }
    }

    if (typeof clone.patient_id === "string" && this.tempIdMap.has(clone.patient_id)) {
      clone.patient_id = this.tempIdMap.get(clone.patient_id)
    }
    if (typeof clone.staff_id === "string" && this.tempIdMap.has(clone.staff_id)) {
      clone.staff_id = this.tempIdMap.get(clone.staff_id)
    }

    if (["delivery_outcome", "lab_screening", "prenatal_visit", "referral", "prescription"].includes(entityType ?? "")) {
      if (!clone.mother_id && !clone.motherId && typeof clone.pregnancy_id === "string") {
        const localP = await db.pregnancies.get(clone.pregnancy_id).catch(() => null)
        if (localP?.mother_id) {
          clone.mother_id = this.tempIdMap.get(localP.mother_id) || localP.mother_id
        }
      }
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
        if (response?.file_url) {
          uploadedUrls[blobId] = response.file_url
        }
      }
    }
    return uploadedUrls
  }

  private async recordMapping(tempId: string, canonicalId: string, entityType: string, canonicalUserId?: string) {
    this.tempIdMap.set(tempId, canonicalId)
    if (canonicalUserId) {
      this.tempUserIdMap.set(tempId, canonicalUserId)
    }
    await db.idMappings.put({
      temp_id: tempId,
      canonical_id: canonicalId,
      canonical_user_id: canonicalUserId,
      entity_type: entityType,
      created_at: Date.now(),
    }).catch(() => {})
  }

  public async processQueue(token: string): Promise<{ synced: number; conflicts: number; errors: number }> {
    if (this.isSyncing || !navigator.onLine) {
      return { synced: 0, conflicts: 0, errors: 0 }
    }

    this.isSyncing = true
    this.lastError = null
    await this.notify()
    await this.rehydrateMappings()

    let synced = 0
    let conflicts = 0
    let errors = 0

    try {
      const orderWeights: Record<string, number> = {
        mother: 1,
        pregnancy: 2,
        prenatal_visit: 3,
        appointment: 4,
        prescription: 5,
        lab_screening: 6,
        referral: 7,
        delivery_outcome: 8,
        message: 9,
        staff: 10,
        profile: 11,
        user_profile: 11,
        facility: 12,
      }

      const allItems = await db.offlineQueue
        .where("status")
        .anyOf("pending", "error")
        .toArray()

      allItems.sort((a, b) => {
        const weightA = orderWeights[a.entity_type] ?? 99
        const weightB = orderWeights[b.entity_type] ?? 99
        if (weightA !== weightB) return weightA - weightB
        return a.created_at - b.created_at
      })

      for (const item of allItems) {
        if (!navigator.onLine) break
        if (!item.id) continue

        if (this.isParentPendingInQueue(item, allItems)) {
          continue
        }

        await db.offlineQueue.update(item.id, { status: "processing" })

        try {
          const resolvedPayload = await this.resolvePayloadReferences(item.payload, item.entity_type)

          if (item.blob_ids && item.blob_ids.length > 0) {
            const uploadedUrls = await this.uploadBlobsIfAny(item.blob_ids, token)
            for (const [blobId, url] of Object.entries(uploadedUrls)) {
              if (resolvedPayload.file_url === blobId) resolvedPayload.file_url = url
              if (resolvedPayload.profile_url === blobId) resolvedPayload.profile_url = url
              if (resolvedPayload.photo_url === blobId) resolvedPayload.photo_url = url
              if (resolvedPayload.facility_profile_url === blobId) resolvedPayload.facility_profile_url = url
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

          const resAny = response as any

          if (item.entity_type === "mother" && item.action === "CREATE") {
            const resMother = (resAny?.result?.mother ?? resAny?.mother ?? resAny?.user?.mother ?? resAny?.result ?? resAny?.data) as Record<string, any> | undefined
            const serverMotherId = (resMother?.mother_id || resMother?.id) as string | undefined
            const serverUserId = (resAny?.result?.user?.user_id || resAny?.user?.user_id || resMother?.user_id) as string | undefined

            if (serverMotherId && item.temp_id) {
              await this.recordMapping(item.temp_id, serverMotherId, "mother", serverUserId)
              const localMother = await db.mothers.get(item.temp_id)
              if (localMother) {
                await db.mothers.delete(item.temp_id)
                await db.mothers.put({
                  ...localMother,
                  id: serverMotherId,
                  mother_id: serverMotherId,
                  user_id: serverUserId ?? localMother.user_id,
                  sync_status: "synced",
                  updated_at: Date.now(),
                })
              }

              const pregs = await db.pregnancies.where("mother_id").equals(item.temp_id).toArray()
              for (const p of pregs) {
                await db.pregnancies.update(p.id, { mother_id: serverMotherId })
              }
              const appts = await db.appointments.where("mother_id").equals(item.temp_id).toArray()
              for (const a of appts) {
                await db.appointments.update(a.id, { mother_id: serverMotherId, user_id: serverUserId ?? a.user_id })
              }
              const visits = await db.prenatalVisits.where("mother_id").equals(item.temp_id).toArray()
              for (const v of visits) {
                await db.prenatalVisits.update(v.id, { mother_id: serverMotherId })
              }
              const refs = await db.referrals.where("mother_id").equals(item.temp_id).toArray()
              for (const r of refs) {
                await db.referrals.update(r.id, { mother_id: serverMotherId })
              }
              const labs = await db.labScreenings.where("mother_id").equals(item.temp_id).toArray()
              for (const l of labs) {
                await db.labScreenings.update(l.id, { mother_id: serverMotherId })
              }
              const delivs = await db.deliveryOutcomes.where("mother_id").equals(item.temp_id).toArray()
              for (const d of delivs) {
                await db.deliveryOutcomes.update(d.id, { mother_id: serverMotherId })
              }
            }
          } else if (item.entity_type === "pregnancy" && item.action === "CREATE") {
            const resPreg = (resAny?.pregnancy ?? resAny?.result?.pregnancy ?? resAny?.result ?? resAny?.data) as Record<string, any> | undefined
            const serverPregId = (resPreg?.pregnancy_id || resPreg?.id) as string | undefined

            if (serverPregId && item.temp_id) {
              await this.recordMapping(item.temp_id, serverPregId, "pregnancy")
              const localPreg = await db.pregnancies.get(item.temp_id)
              if (localPreg) {
                await db.pregnancies.delete(item.temp_id)
                await db.pregnancies.put({
                  ...localPreg,
                  id: serverPregId,
                  pregnancy_id: serverPregId,
                  mother_id: this.tempIdMap.get(localPreg.mother_id) || localPreg.mother_id,
                  sync_status: "synced",
                  updated_at: Date.now(),
                })
              }

              const visits = await db.prenatalVisits.where("pregnancy_id").equals(item.temp_id).toArray()
              for (const v of visits) {
                await db.prenatalVisits.update(v.id, { pregnancy_id: serverPregId })
              }
              const prex = await db.prescriptions.where("pregnancy_id").equals(item.temp_id).toArray()
              for (const pr of prex) {
                await db.prescriptions.update(pr.id, { pregnancy_id: serverPregId })
              }
              const labs = await db.labScreenings.where("pregnancy_id").equals(item.temp_id).toArray()
              for (const l of labs) {
                await db.labScreenings.update(l.id, { pregnancy_id: serverPregId })
              }
              const refs = await db.referrals.where("pregnancy_id").equals(item.temp_id).toArray()
              for (const r of refs) {
                await db.referrals.update(r.id, { pregnancy_id: serverPregId })
              }
              const delivs = await db.deliveryOutcomes.where("pregnancy_id").equals(item.temp_id).toArray()
              for (const d of delivs) {
                await db.deliveryOutcomes.update(d.id, { pregnancy_id: serverPregId })
              }
            }
          } else if (item.entity_type === "prenatal_visit" && item.action === "CREATE") {
            const resVisit = (resAny?.prenatalVisit ?? resAny?.result?.prenatalVisit ?? resAny?.result ?? resAny?.data) as Record<string, any> | undefined
            const serverVisitId = (resVisit?.visit_id || resVisit?.id) as string | undefined
            if (serverVisitId && item.temp_id) {
              await this.recordMapping(item.temp_id, serverVisitId, "prenatal_visit")
              const localVisit = await db.prenatalVisits.get(item.temp_id)
              if (localVisit) {
                await db.prenatalVisits.delete(item.temp_id)
                await db.prenatalVisits.put({
                  ...localVisit,
                  id: serverVisitId,
                  visit_id: serverVisitId,
                  sync_status: "synced",
                  updated_at: Date.now(),
                })
              }
            }
          } else if (item.entity_type === "delivery_outcome" && item.action === "CREATE") {
            const resDel = (response?.data ?? response?.result ?? response?.delivery ?? response) as Record<string, unknown> | undefined
            const serverDelId = (resDel?.delivery_id || resDel?.id) as string | undefined
            const serverPregId = (resDel?.pregnancy_id) as string | undefined
            if (serverDelId && item.temp_id) {
              await this.recordMapping(item.temp_id, serverDelId, "delivery_outcome")
              const localDel = await db.deliveryOutcomes.get(item.temp_id)
              if (localDel) {
                await db.deliveryOutcomes.delete(item.temp_id)
                await db.deliveryOutcomes.put({
                  ...localDel,
                  id: serverDelId,
                  delivery_id: serverDelId,
                  pregnancy_id: serverPregId || (resolvedPayload.pregnancy_id as string) || localDel.pregnancy_id,
                  sync_status: "synced",
                  updated_at: Date.now(),
                })
              }
            }
          } else if (item.entity_type === "lab_screening" && item.action === "CREATE") {
            const resLab = (resAny?.data ?? resAny?.result ?? resAny?.screening ?? resAny) as Record<string, any> | undefined
            const serverLabId = (resLab?.screening_id || resLab?.id) as string | undefined
            const serverPregId = (resLab?.pregnancy_id) as string | undefined
            const finalFileUrl = (resLab?.file_url as string) || (resolvedPayload.file_url as string)
            if (serverLabId && item.temp_id) {
              await this.recordMapping(item.temp_id, serverLabId, "lab_screening")
              const localLab = await db.labScreenings.get(item.temp_id)
              if (localLab) {
                await db.labScreenings.delete(item.temp_id)
                await db.labScreenings.put({
                  ...localLab,
                  id: serverLabId,
                  screening_id: serverLabId,
                  pregnancy_id: serverPregId || (resolvedPayload.pregnancy_id as string) || localLab.pregnancy_id,
                  file_url: finalFileUrl || localLab.file_url,
                  sync_status: "synced",
                  updated_at: Date.now(),
                })
              }
            }
            if (item.blob_ids && item.blob_ids.length > 0) {
              for (const blobId of item.blob_ids) {
                await db.blobs.delete(blobId).catch(() => {})
              }
            }
          } else if (item.entity_type === "referral" && item.action === "CREATE") {
            const resRef = (response?.data ?? response?.result ?? response?.referral) as Record<string, unknown> | undefined
            const serverRefId = (resRef?.referral_id || resRef?.id) as string | undefined
            if (serverRefId && item.temp_id) {
              await this.recordMapping(item.temp_id, serverRefId, "referral")
              const localRef = await db.referrals.get(item.temp_id)
              if (localRef) {
                await db.referrals.delete(item.temp_id)
                await db.referrals.put({
                  ...localRef,
                  id: serverRefId,
                  referral_id: serverRefId,
                  sync_status: "synced",
                  updated_at: Date.now(),
                })
              }
            }
          } else if (item.entity_type === "appointment" && item.action === "CREATE") {
            const resAppt = (response?.data ?? response?.result ?? response?.appointment) as Record<string, unknown> | undefined
            const serverApptId = (resAppt?.appointment_id || resAppt?.id) as string | undefined
            if (serverApptId && item.temp_id) {
              await this.recordMapping(item.temp_id, serverApptId, "appointment")
              const localAppt = await db.appointments.get(item.temp_id)
              if (localAppt) {
                await db.appointments.delete(item.temp_id)
                await db.appointments.put({
                  ...localAppt,
                  id: serverApptId,
                  appointment_id: serverApptId,
                  sync_status: "synced",
                  updated_at: Date.now(),
                })
              }
            }
          } else if (item.entity_type === "staff" && item.action === "CREATE") {
            const resStaff = (response?.user ?? response?.result ?? response?.data) as Record<string, unknown> | undefined
            const serverStaffId = (resStaff?.user_id || resStaff?.id) as string | undefined
            if (serverStaffId && item.temp_id) {
              await this.recordMapping(item.temp_id, serverStaffId, "staff")
              const localStaff = await db.staff.get(item.temp_id)
              if (localStaff) {
                await db.staff.delete(item.temp_id)
                await db.staff.put({
                  ...localStaff,
                  id: serverStaffId,
                  user_id: serverStaffId,
                  sync_status: "synced",
                  updated_at: Date.now(),
                })
              }
            }
          } else if (item.entity_type === "mother" && item.action === "UPDATE") {
            const rawId = String(resolvedPayload.mother_id || item.temp_id || item.endpoint.split("/").pop() || "")
            const motherId = this.tempIdMap.get(rawId) || rawId
            if (motherId) {
              const localMother = await db.mothers.get(motherId)
              if (localMother) {
                const nextProfileUrl = (resolvedPayload.profile_url as string) || (resolvedPayload.photo_url as string) || localMother.profile_url
                await db.mothers.update(motherId, {
                  ...localMother,
                  ...resolvedPayload,
                  profile_url: nextProfileUrl,
                  user: { ...(localMother.user || {}), ...(nextProfileUrl ? { profile_url: nextProfileUrl } : {}) },
                  sync_status: "synced",
                  updated_at: Date.now(),
                })
              }
            }
          } else if (item.entity_type === "facility") {
            const facId = String(resolvedPayload.facility_id || item.temp_id || "")
            if (facId) {
              const existing = await db.facilities.get(facId)
              if (existing) {
                await db.facilities.update(facId, {
                  ...existing,
                  ...resolvedPayload,
                  sync_status: "synced",
                  updated_at: Date.now(),
                })
              }
            }
            if (item.action === "REASSIGN_STAFF") {
              const staffId = String(resolvedPayload.user_id || "")
              const targetFacId = String(resolvedPayload.target_facility_id || "")
              if (staffId && targetFacId) {
                const existingStaff = await db.staff.get(staffId)
                if (existingStaff) {
                  await db.staff.update(staffId, {
                    ...existingStaff,
                    facility_id: targetFacId,
                    sync_status: "synced",
                    updated_at: Date.now(),
                  })
                }
              }
            } else if (item.action === "REASSIGN_MOTHER") {
              const motherId = String(resolvedPayload.mother_id || "")
              const targetFacId = String(resolvedPayload.target_facility_id || "")
              if (motherId && targetFacId) {
                const existingMother = await db.mothers.get(motherId)
                if (existingMother) {
                  await db.mothers.update(motherId, {
                    ...existingMother,
                    facility_id: targetFacId,
                    sync_status: "synced",
                    updated_at: Date.now(),
                  })
                }
              }
            }
            const resFac = (resAny?.result ?? resAny?.facility ?? resAny?.data) as Record<string, any> | undefined
            const finalLogo = (resolvedPayload.facility_profile_url as string) || resFac?.facility_profile_url
            if (finalLogo) {
              const cachedFacilityStr = localStorage.getItem("silang.facility.profile")
              if (cachedFacilityStr) {
                try {
                  const fac = JSON.parse(cachedFacilityStr)
                  fac.facility_profile_url = finalLogo
                  localStorage.setItem("silang.facility.profile", JSON.stringify(fac))
                } catch {}
              }
              const sessionStr = localStorage.getItem("silang.auth.session")
              if (sessionStr) {
                try {
                  const s = JSON.parse(sessionStr)
                  if (s.facility) s.facility.facility_profile_url = finalLogo
                  localStorage.setItem("silang.auth.session", JSON.stringify(s))
                } catch {}
              }
            }
            window.dispatchEvent(new CustomEvent("silang:facility-updated", {
              detail: { ...(resFac || {}), ...(resolvedPayload || {}), ...(finalLogo ? { facility_profile_url: finalLogo } : {}) }
            }))
          }

          if (item.blob_ids && item.blob_ids.length > 0) {
            for (const blobId of item.blob_ids) {
              await db.blobs.delete(blobId).catch(() => {})
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
