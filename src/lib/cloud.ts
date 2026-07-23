/**
 * True on serverless cloud hosts (Vercel, Netlify) where the disk is
 * read-only and server instances rotate — file-based data can't persist
 * there, so listing/signup flows are gated until the database milestone.
 * Local and self-hosted servers stay fully functional.
 */
export const IS_CLOUD_DEMO = Boolean(process.env.VERCEL || process.env.NETLIFY);
