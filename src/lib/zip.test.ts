import { describe, it, expect } from 'vitest';
import { crc32, createZip, textBytes, dataUrlBytes } from './zip';

/**
 * Read an archive back by walking its central directory, the way a real
 * unzipper does. A writer that only satisfies assertions about its own output
 * proves nothing; this proves the offsets actually resolve.
 */
function readZip(bytes: Uint8Array): { name: string; data: Uint8Array }[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = bytes.length - 22;
  expect(view.getUint32(eocd, true)).toBe(0x06054b50);

  const count = view.getUint16(eocd + 10, true);
  const cdOffset = view.getUint32(eocd + 16, true);

  const files: { name: string; data: Uint8Array }[] = [];
  let p = cdOffset;

  for (let i = 0; i < count; i += 1) {
    expect(view.getUint32(p, true)).toBe(0x02014b50);
    const nameLength = view.getUint16(p + 28, true);
    const extraLength = view.getUint16(p + 30, true);
    const commentLength = view.getUint16(p + 32, true);
    const localOffset = view.getUint32(p + 42, true);
    const name = new TextDecoder().decode(bytes.slice(p + 46, p + 46 + nameLength));

    expect(view.getUint32(localOffset, true)).toBe(0x04034b50);
    const size = view.getUint32(localOffset + 18, true);
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;

    files.push({ name, data: bytes.slice(dataStart, dataStart + size) });
    p += 46 + nameLength + extraLength + commentLength;
  }

  return files;
}

describe('crc32', () => {
  it('matches the standard check value', () => {
    // "123456789" -> 0xCBF43926 is the published CRC-32 check vector.
    expect(crc32(textBytes('123456789'))).toBe(0xcbf43926);
  });

  it('is zero for empty input', () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
  });

  it('differs for different content', () => {
    expect(crc32(textBytes('a'))).not.toBe(crc32(textBytes('b')));
  });
});

describe('createZip', () => {
  it('round-trips a single file', () => {
    const zip = createZip([{ name: 'transcript.md', data: textBytes('# Hello') }]);
    const files = readZip(zip);

    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('transcript.md');
    expect(new TextDecoder().decode(files[0].data)).toBe('# Hello');
  });

  it('round-trips several files, including in folders', () => {
    const zip = createZip([
      { name: 'transcript.md', data: textBytes('body') },
      { name: 'images/frame-000012.png', data: new Uint8Array([137, 80, 78, 71, 1, 2, 3]) },
      { name: 'images/frame-000030.png', data: new Uint8Array([137, 80, 78, 71, 9, 9]) },
    ]);
    const files = readZip(zip);

    expect(files.map((f) => f.name)).toEqual([
      'transcript.md',
      'images/frame-000012.png',
      'images/frame-000030.png',
    ]);
    expect([...files[1].data]).toEqual([137, 80, 78, 71, 1, 2, 3]);
    expect([...files[2].data]).toEqual([137, 80, 78, 71, 9, 9]);
  });

  it('stores entries uncompressed, so PNGs are not deflated twice', () => {
    const payload = new Uint8Array(64).fill(7);
    const zip = createZip([{ name: 'a.bin', data: payload }]);
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    // Compression method lives at offset 8 of the local header; 0 is "store".
    expect(view.getUint16(8, true)).toBe(0);
    expect(readZip(zip)[0].data).toHaveLength(64);
  });

  it('records a CRC that matches the content', () => {
    const data = textBytes('verify me');
    const zip = createZip([{ name: 'a.txt', data }]);
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    expect(view.getUint32(14, true)).toBe(crc32(data));
  });

  it('handles an empty archive', () => {
    const zip = createZip([]);
    expect(zip).toHaveLength(22);
    expect(readZip(zip)).toEqual([]);
  });

  it('handles an empty file inside the archive', () => {
    const files = readZip(createZip([{ name: 'empty.txt', data: new Uint8Array(0) }]));
    expect(files[0].name).toBe('empty.txt');
    expect(files[0].data).toHaveLength(0);
  });

  it('writes UTF-8 names', () => {
    const files = readZip(createZip([{ name: 'café/notes.md', data: textBytes('x') }]));
    expect(files[0].name).toBe('café/notes.md');
  });

  it('clamps dates below the DOS epoch rather than writing a negative year', () => {
    const zip = createZip([{ name: 'a.txt', data: textBytes('x') }], new Date('1970-01-01'));
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    // Year field is the top 7 bits of the date word; 1980 encodes as 0.
    expect(view.getUint16(12, true) >> 9).toBe(0);
  });
});

describe('dataUrlBytes', () => {
  it('decodes the payload of a data URL', () => {
    // "Hi" base64-encodes to "SGk=".
    expect([...dataUrlBytes('data:image/png;base64,SGk=')]).toEqual([72, 105]);
  });

  it('accepts a bare base64 payload', () => {
    expect([...dataUrlBytes('SGk=')]).toEqual([72, 105]);
  });
});
