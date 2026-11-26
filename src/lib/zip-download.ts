type ZipFile = { name: string; data: Uint8Array }

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function arrayBufferOf(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

export function createZipBlob(files: ZipFile[]) {
  const encoder = new TextEncoder()
  const localParts: BlobPart[] = []
  const directoryParts: ArrayBuffer[] = []
  let offset = 0

  for (const file of files) {
    const name = encoder.encode(file.name)
    const checksum = crc32(file.data)
    const localHeader = new Uint8Array(30 + name.length)
    const local = new DataView(localHeader.buffer)
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, 0x0800, true)
    local.setUint32(14, checksum, true)
    local.setUint32(18, file.data.length, true)
    local.setUint32(22, file.data.length, true)
    local.setUint16(26, name.length, true)
    localHeader.set(name, 30)
    localParts.push(arrayBufferOf(localHeader), arrayBufferOf(file.data))

    const directoryHeader = new Uint8Array(46 + name.length)
    const directory = new DataView(directoryHeader.buffer)
    directory.setUint32(0, 0x02014b50, true)
    directory.setUint16(4, 20, true)
    directory.setUint16(6, 20, true)
    directory.setUint16(8, 0x0800, true)
    directory.setUint32(16, checksum, true)
    directory.setUint32(20, file.data.length, true)
    directory.setUint32(24, file.data.length, true)
    directory.setUint16(28, name.length, true)
    directory.setUint32(42, offset, true)
    directoryHeader.set(name, 46)
    directoryParts.push(arrayBufferOf(directoryHeader))
    offset += localHeader.length + file.data.length
  }

  const directorySize = directoryParts.reduce((size, part) => size + part.byteLength, 0)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(8, files.length, true)
  endView.setUint16(10, files.length, true)
  endView.setUint32(12, directorySize, true)
  endView.setUint32(16, offset, true)
  return new Blob([...localParts, ...directoryParts, end], { type: "application/zip" })
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function safeArchiveName(name: string) {
  return name.replace(/[\\/]/g, "_").replace(/[<>:"|?*\u0000-\u001f]/g, "_")
}
