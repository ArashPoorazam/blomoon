/** Require complete container payloads after identification headers. */
export function recognizeOgg(data: Buffer): boolean {
  let offset = 0;
  let codec: "opus" | "vorbis" | undefined;
  let serial: number | undefined;
  let packet: Buffer[] = [];
  while (offset + 27 <= data.length) {
    if (data.toString("ascii", offset, offset + 4) !== "OggS" || data[offset + 4] !== 0) return false;
    const pageSerial = data.readUInt32LE(offset + 14);
    if (serial !== undefined && serial !== pageSerial) return false;
    serial = pageSerial;
    const segments = data[offset + 26];
    const table = offset + 27;
    if (table + segments > data.length) return false;
    let body = table + segments;
    for (let i = 0; i < segments; i++) {
      const size = data[table + i];
      if (body + size > data.length) return false;
      packet.push(data.subarray(body, body + size));
      body += size;
      if (size === 255) continue;
      const payload = Buffer.concat(packet);
      packet = [];
      if (!codec) {
        if (payload.length >= 19 && payload.toString("ascii", 0, 8) === "OpusHead") codec = "opus";
        else if (payload.length >= 30 && payload[0] === 1 && payload.toString("ascii", 1, 7) === "vorbis")
          codec = "vorbis";
        else return false;
      } else if (codec === "opus") {
        if (payload.length > 1 && payload.toString("ascii", 0, 8) !== "OpusTags") return true;
      } else if (payload.length > 1 && (payload[0] & 1) === 0) return true;
    }
    offset = body;
  }
  return false;
}

export function recognizeWave(data: Buffer): boolean {
  if (data.toString("ascii", 8, 12) !== "WAVE") return false;
  let blockAlign = 0;
  for (let offset = 12; offset + 8 <= data.length; ) {
    const kind = data.toString("ascii", offset, offset + 4);
    const size = data.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (kind === "data") return blockAlign > 0 && size >= blockAlign && data.length - body >= blockAlign;
    if (body + size > data.length) return false;
    if (kind === "fmt " && size >= 16) {
      const format = data.readUInt16LE(body);
      const channels = data.readUInt16LE(body + 2);
      const sampleRate = data.readUInt32LE(body + 4);
      const bits = data.readUInt16LE(body + 14);
      const alignment = data.readUInt16LE(body + 12);
      if (
        ![1, 3].includes(format) ||
        channels < 1 ||
        channels > 8 ||
        sampleRate === 0 ||
        ![8, 16, 24, 32, 64].includes(bits) ||
        alignment !== (channels * bits) / 8
      )
        return false;
      blockAlign = alignment;
    }
    offset = body + size + (size % 2);
  }
  return false;
}
