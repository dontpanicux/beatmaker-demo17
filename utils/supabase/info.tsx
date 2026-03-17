/* Fallback for dev when .env is not set (e.g. Figma Make bundle).
 * Production builds require VITE_SUPABASE_* env vars - do not rely on this file.
 * Use Supabase MCP (get_project_url, get_publishable_keys) to populate .env.local.
 */

export const projectId = ""
export const publicAnonKey = ""