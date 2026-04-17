/**
 * Lectura mínima de dimensiones PNG/JPEG sin dependencias nativas.
 */

export function readImageDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24) return null;
  // PNG: IHDR chunk at byte 16
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    const width  = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    if (width > 0 && height > 0 && width < 1_000_000 && height < 1_000_000) return { width, height };
    return null;
  }
  // JPEG: scan for SOF0 / SOF2
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let i = 2;
    while (i < buffer.length - 9) {
      if (buffer[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buffer[i + 1];
      const len    = buffer.readUInt16BE(i + 2);
      if (marker === 0xc0 || marker === 0xc2) {
        const height = buffer.readUInt16BE(i + 5);
        const width  = buffer.readUInt16BE(i + 7);
        if (width > 0 && height > 0) return { width, height };
        return null;
      }
      if (len < 2) return null;
      i += 2 + len;
    }
  }
  return null;
}
