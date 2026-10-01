/** Reads the capture time from a JPEG's EXIF block (no library needed). */
export async function exifInfo(file: File): Promise<{ takenAt?: string }> {
  try {
    const buf = new DataView(await file.slice(0, 256 * 1024).arrayBuffer());
    if (buf.getUint16(0) !== 0xffd8) return {};
    let off = 2;
    while (off + 4 < buf.byteLength) {
      const marker = buf.getUint16(off);
      const size = buf.getUint16(off + 2);
      if (marker === 0xffe1 && buf.getUint32(off + 4) === 0x45786966) return readTiff(buf, off + 10);
      if ((marker & 0xff00) !== 0xff00) break;
      off += 2 + size;
    }
  } catch {
    // not a readable JPEG – no EXIF
  }
  return {};
}

function readTiff(v: DataView, start: number): { takenAt?: string } {
  const le = v.getUint16(start) === 0x4949;
  const u16 = (o: number) => v.getUint16(start + o, le);
  const u32 = (o: number) => v.getUint32(start + o, le);
  const ifd = (o: number) => {
    const n = u16(o);
    const tags = new Map<number, { type: number; count: number; at: number }>();
    for (let i = 0; i < n; i++) {
      const e = o + 2 + i * 12;
      tags.set(u16(e), { type: u16(e + 2), count: u32(e + 4), at: e + 8 });
    }
    return tags;
  };
  const ascii = (t: { count: number; at: number }) => {
    const o = t.count > 4 ? u32(t.at) : t.at;
    let s = "";
    for (let i = 0; i < t.count - 1; i++) s += String.fromCharCode(v.getUint8(start + o + i));
    return s;
  };
  const ifd0 = ifd(u32(4));
  const out: { takenAt?: string } = {};
  const exifPtr = ifd0.get(0x8769);
  if (exifPtr) {
    const dt = ifd(u32(exifPtr.at)).get(0x9003);
    // "2026:10:01 14:32:10" → "2026-10-01T14:32"
    const m = dt && ascii(dt).match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/);
    if (m) out.takenAt = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`;
  }
  return out;
}
