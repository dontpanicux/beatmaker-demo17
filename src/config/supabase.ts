/**
 * Supabase configuration.
 * Production requires VITE_SUPABASE_* env vars (set in deployment platform).
 * Development: use .env.local; use Supabase MCP (get_project_url, get_publishable_keys) to populate.
 */
import { projectId as fallbackProjectId, publicAnonKey as fallbackAnonKey } from '/utils/supabase/info';

const env = import.meta.env;
const isProd = env.PROD;

function getProjectId(): string {
  const id = (env.VITE_SUPABASE_PROJECT_ID as string) || fallbackProjectId;
  if (isProd && !id) {
    throw new Error(
      'VITE_SUPABASE_PROJECT_ID is required in production. Set it in your deployment platform env vars.'
    );
  }
  return id;
}

function getAnonKey(): string {
  const key = (env.VITE_SUPABASE_ANON_KEY as string) || fallbackAnonKey;
  if (isProd && !key) {
    throw new Error(
      'VITE_SUPABASE_ANON_KEY is required in production. Set it in your deployment platform env vars.'
    );
  }
  return key;
}

export const projectId = getProjectId();
export const publicAnonKey = getAnonKey();
export const supabaseUrl =
  (env.VITE_SUPABASE_URL as string) || `https://${projectId}.supabase.co`;

/** Base URL for Edge Functions (used for beats, profile photo, signup) */
export const edgeFunctionsBaseUrl = `${supabaseUrl}/functions/v1/make-server-e44554cb`;

/** Request timeout for typical API calls (ms). */
export const API_TIMEOUT_MS = 15000;

/**
 * Timeout for Edge Function requests that may hit cold start.
 * Supabase Edge Functions can take 60–120s to spin up when idle.
 */
export const EDGE_FUNCTION_COLD_START_TIMEOUT_MS = 120000;
