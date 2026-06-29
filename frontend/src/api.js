// Set VITE_API_URL in your Vercel dashboard to your backend URL (e.g. https://telechurn-api.onrender.com)
// Falls back to localhost:8000 for local development.
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * POST /predict — send a File object, receive predictions JSON.
 */
export async function predictChurn(file) {
  const form = new FormData();
  form.append('file', file);

  const url = `${API_BASE}/predict`;
  console.log(`[API] Initiating fetch to exact URL: ${url}`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 seconds timeout
  
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error("Request timed out (90 seconds). The server might still be waking up, or the file is too large.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await res.json();

  if (!res.ok) {
    const msg =
      data?.detail?.message ||
      (typeof data?.detail === 'string' ? data.detail : null) ||
      `Server error ${res.status}`;
    const missing = data?.detail?.missing_columns;
    const err = new Error(msg);
    err.missingColumns = missing;
    throw err;
  }

  return data; // { count, results }
}

/**
 * GET /download — download the last prediction batch as CSV.
 */
export function downloadPredictions() {
  window.open(`${API_BASE}/download`, '_blank');
}

/**
 * GET /health — ping the server to wake it up from cold start
 */
export async function pingServer() {
  try {
    console.log(`[API] Pinging server to wake up: ${API_BASE}/health`);
    await fetch(`${API_BASE}/health`);
  } catch (err) {
    console.warn("[API] Ping failed (expected if server is fully asleep or CORS blocks early preflight).", err);
  }
}
