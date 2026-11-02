/**
 * Magic byte / file signature validation for uploaded purchase bills.
 * Prevents disguised executables or malicious files.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  detectedMime?: string;
}

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function validateFileSignature(file: File | Blob): Promise<ValidationResult> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `File size exceeds the 5 MB limit (Current: ${(file.size / (1024 * 1024)).toFixed(2)} MB).`,
    };
  }

  // Read the first 16 bytes for magic number verification
  const buffer = await file.slice(0, 16).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // 1. JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { isValid: true, detectedMime: "image/jpeg" };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { isValid: true, detectedMime: "image/png" };
  }

  // 3. WebP: RIFF ... WEBP (52 49 46 46 .... 57 45 42 50)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { isValid: true, detectedMime: "image/webp" };
  }

  // 4. PDF: %PDF- (25 50 44 46 2D)
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return { isValid: true, detectedMime: "application/pdf" };
  }

  return {
    isValid: false,
    error: "Invalid file format or signature. Supported formats: JPEG, PNG, WebP, PDF.",
  };
}

