/**
 * A minimal ZIP writer.
 *
 * Exports that contain screenshots cannot be a single markdown file, and they
 * cannot embed the images as data URIs either — base64 inflates by a third and
 * a course export would run to hundreds of megabytes of unreadable text. So a
 * `.zip` holding `transcript.md` plus an `images/` folder.
 *
 * ## Why not a library
 *
 * Every entry is written with the **store** method — no compression. PNG data
 * is already deflated, so compressing it again costs CPU and saves nothing,
 * and markdown is a rounding error next to the images. That removes the only
 * reason to pull in a compression dependency, which matters for an extension
 * whose entire claim is that it ships nothing it does not need.
 *
 * The format written here is the original ZIP spec: no ZIP64, so the archive
 * is limited to 4 GB and 65,535 entries. Both are far beyond a course export.
 */

const LOCAL_HEADER_SIG = 0x04034b50;
const CENTRAL_HEADER_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;

/** Version 2.0: the lowest that understands folders, which is all we need. */
const VERSION = 20;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

/** Standard CRC-32, which every ZIP entry carries for integrity. */
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * MS-DOS packed date and time, which ZIP still uses.
 *
 * Seconds have one-bit-of-two resolution and years start at 1980; both are
 * properties of the format, not mistakes here.
 */
function dosDateTime(date: Date): { time: number; date: number } {
  const time =
    (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day =
    ((Math.max(1980, date.getFullYear()) - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: day };
}

/** Cursor that writes little-endian fields and tracks its own position. */
class Writer {
  private view: DataView;
  private offset = 0;

  constructor(public readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  u16(value: number): void {
    this.view.setUint16(this.offset, value, true);
    this.offset += 2;
  }

  u32(value: number): void {
    this.view.setUint32(this.offset, value >>> 0, true);
    this.offset += 4;
  }

  raw(value: Uint8Array): void {
    this.bytes.set(value, this.offset);
    this.offset += value.length;
  }

  get position(): number {
    return this.offset;
  }
}

export interface ZipEntry {
  /** Path inside the archive; forward slashes make folders. */
  name: string;
  data: Uint8Array;
}

/** UTF-8 encode a string for use as file content. */
export function textBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/**
 * Decode a `data:` URL's base64 payload to bytes.
 *
 * Captured frames arrive as data URLs from a canvas, and the archive needs the
 * raw PNG.
 */
export function dataUrlBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',');
  const payload = comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Build a ZIP archive from entries, all stored uncompressed.
 *
 * The layout is the one the spec requires: each entry's local header and data
 * first, then a central directory repeating those headers, then a record
 * saying where the directory starts. Readers seek to the end and work
 * backwards, which is why the directory offsets have to be exact.
 */
export function createZip(entries: ZipEntry[], now = new Date()): Uint8Array {
  const encoder = new TextEncoder();
  const { time, date } = dosDateTime(now);

  const prepared = entries.map((entry) => ({
    nameBytes: encoder.encode(entry.name),
    data: entry.data,
    crc: crc32(entry.data),
  }));

  const localSize = prepared.reduce((sum, e) => sum + 30 + e.nameBytes.length + e.data.length, 0);
  const centralSize = prepared.reduce((sum, e) => sum + 46 + e.nameBytes.length, 0);

  const out = new Uint8Array(localSize + centralSize + 22);
  const writer = new Writer(out);

  const offsets: number[] = [];

  for (const entry of prepared) {
    offsets.push(writer.position);

    writer.u32(LOCAL_HEADER_SIG);
    writer.u16(VERSION);
    writer.u16(0); // flags
    writer.u16(0); // method: store
    writer.u16(time);
    writer.u16(date);
    writer.u32(entry.crc);
    writer.u32(entry.data.length); // compressed == uncompressed when stored
    writer.u32(entry.data.length);
    writer.u16(entry.nameBytes.length);
    writer.u16(0); // extra field length
    writer.raw(entry.nameBytes);
    writer.raw(entry.data);
  }

  const centralStart = writer.position;

  prepared.forEach((entry, index) => {
    writer.u32(CENTRAL_HEADER_SIG);
    writer.u16(VERSION); // version made by
    writer.u16(VERSION); // version needed
    writer.u16(0); // flags
    writer.u16(0); // method: store
    writer.u16(time);
    writer.u16(date);
    writer.u32(entry.crc);
    writer.u32(entry.data.length);
    writer.u32(entry.data.length);
    writer.u16(entry.nameBytes.length);
    writer.u16(0); // extra
    writer.u16(0); // comment
    writer.u16(0); // disk number
    writer.u16(0); // internal attributes
    writer.u32(0); // external attributes
    writer.u32(offsets[index]);
    writer.raw(entry.nameBytes);
  });

  const centralEnd = writer.position;

  writer.u32(EOCD_SIG);
  writer.u16(0); // this disk
  writer.u16(0); // disk with central directory
  writer.u16(prepared.length);
  writer.u16(prepared.length);
  writer.u32(centralEnd - centralStart);
  writer.u32(centralStart);
  writer.u16(0); // comment length

  return out;
}
