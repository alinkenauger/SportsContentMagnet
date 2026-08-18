const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

export function hasAllowedBrandImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === "image/png") {
    return buffer.length >= PNG_SIGNATURE.length &&
      buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
  }
  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  }
  if (mimeType === "image/webp") {
    return buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }
  return false;
}
