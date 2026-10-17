/**
 * GET /api/models
 * Returns the curated list of available Google Gemma models.
 * Uses a hardcoded list to avoid format-mismatch with Google's native
 * model list API (which differs from OpenAI's { data: [{ id }] } shape).
 * Validates GOOGLE_API_KEY is set and respects APP_PASSWORD gate.
 */

const GEMMA_MODELS = [
  // ── Gemma 4 ──────────────────────────────────────────────
  { id: 'gemma-4-26b-a4b-it',  family: 'Gemma 4', label: 'Gemma 4 · 26B MoE',  vision: true  },
  { id: 'gemma-4-31b-it',      family: 'Gemma 4', label: 'Gemma 4 · 31B',       vision: false },
  // ── Gemma 3 ──────────────────────────────────────────────
  { id: 'gemma-3-27b-it',      family: 'Gemma 3', label: 'Gemma 3 · 27B',       vision: true  },
  { id: 'gemma-3-12b-it',      family: 'Gemma 3', label: 'Gemma 3 · 12B',       vision: true  },
  { id: 'gemma-3-4b-it',       family: 'Gemma 3', label: 'Gemma 3 · 4B',        vision: true  },
];

export async function onRequestGet(context) {
  const apiKey      = context.env.GOOGLE_API_KEY;
  const appPassword = context.env.APP_PASSWORD;

  if (!apiKey) {
    return jsonError(500, 'GOOGLE_API_KEY is not configured on the server.');
  }

  // ── App-level password gate ──────────────────────────────
  if (appPassword) {
    const provided = context.request.headers.get('X-App-Password') || '';
    if (provided !== appPassword) {
      return jsonError(401, 'Unauthorized: invalid app password.');
    }
  }

  // Return OpenAI-compatible model list shape
  const body = JSON.stringify({
    object: 'list',
    data: GEMMA_MODELS.map(m => ({
      id:       m.id,
      object:   'model',
      created:  0,
      owned_by: 'google',
      family:   m.family,
      label:    m.label,
      vision:   m.vision,
    })),
  });

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type':  'application/json',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-App-Password',
    },
  });
}

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
