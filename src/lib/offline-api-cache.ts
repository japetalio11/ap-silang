type CachedApiValue = {
  key: string
  scope: string
  url: string
  value: unknown
  cachedAt: number
}

const DATABASE_NAME = "silang-offline-data"
const DATABASE_VERSION = 1
const STORE_NAME = "api-responses"

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "key" })
        store.createIndex("scope", "scope", { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("Could not open offline data storage"))
  })
}

async function transact<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDatabase()
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode)
      const request = action(transaction.objectStore(STORE_NAME))
      let result!: T
      request.onsuccess = () => { result = request.result }
      request.onerror = () => reject(request.error ?? new Error("Could not access offline data storage"))
      // Resolve writes only after IndexedDB confirms the transaction committed.
      // Otherwise a fast refresh can race the cache write and lose the latest read.
      transaction.oncomplete = () => resolve(result)
      transaction.onerror = () => reject(transaction.error ?? new Error("Offline data storage transaction failed"))
      transaction.onabort = () => reject(transaction.error ?? new Error("Offline data storage transaction failed"))
    })
  } finally {
    db.close()
  }
}

export async function getApiCacheScope(token?: string | null) {
  if (!token) return "public"
  const payloadPart = token.split(".")[1]
  if (payloadPart) {
    try {
      const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/")
      const payload = JSON.parse(window.atob(base64 + "=".repeat((4 - base64.length % 4) % 4))) as Record<string, unknown>
      const subject = payload.user_id ?? payload.id ?? payload.sub
      if (typeof subject === "string" && subject) return subject
    } catch {
      // Hash the token below when the JWT uses an unrecognized claim shape.
    }
  }
  if (!crypto.subtle) return null
  const bytes = new TextEncoder().encode(token)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return `session-${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`
}

function makeKey(scope: string, url: string) {
  const normalized = new URL(url, window.location.origin)
  return `${scope}:${normalized.origin}${normalized.pathname}${normalized.search}`
}

export async function readCachedApiValue<T>(scope: string | null, url: string): Promise<T | undefined> {
  if (!scope || typeof indexedDB === "undefined") return undefined
  const record = await transact<CachedApiValue | undefined>("readonly", (store) => store.get(makeKey(scope, url)))
  return record?.value as T | undefined
}

export async function writeCachedApiValue(scope: string | null, url: string, value: unknown) {
  if (!scope || typeof indexedDB === "undefined") return
  const record: CachedApiValue = { key: makeKey(scope, url), scope, url, value, cachedAt: Date.now() }
  await transact("readwrite", (store) => store.put(record))
}

export async function clearOfflineApiCache(scope?: string) {
  if (typeof indexedDB === "undefined") return
  if (!scope) {
    await transact("readwrite", (store) => store.clear())
    return
  }
  const db = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite")
      transaction.objectStore(STORE_NAME).index("scope").openCursor(IDBKeyRange.only(scope)).onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
      }
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not clear offline data"))
      transaction.onabort = () => reject(transaction.error ?? new Error("Could not clear offline data"))
    })
  } finally {
    db.close()
  }
}
