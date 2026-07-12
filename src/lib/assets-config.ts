/** Hard limits mirrored into the bucket config (see the 3b migration). UI uses
 *  these for early feedback; the bucket + a DB CHECK are the real gates. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 26214400

export const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/zip",
] as const;

const ALLOWED = new Set<string>(ALLOWED_MIME_TYPES);

export function isAllowedMime(mime: string): boolean {
  return ALLOWED.has(mime);
}

export function isWithinSize(bytes: number): boolean {
  return bytes > 0 && bytes <= MAX_FILE_BYTES;
}
