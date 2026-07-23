/**
 * In-memory fallback for seller photos on hosts with a read-only disk
 * (Vercel serverless). When the upload can't be written to /public/uploads,
 * the bytes are kept here and served by the /uploads route instead. Lives as
 * long as the server instance — exactly the demo semantics we want in the
 * cloud; local servers with a real disk never touch this.
 */
export const MEMORY_PHOTOS = new Map<
  string,
  { bytes: Uint8Array<ArrayBuffer>; type: string }
>();
