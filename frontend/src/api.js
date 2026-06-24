// Set VITE_API_URL in your Vercel dashboard to your backend URL (e.g. https://telechurn-api.onrender.com)
// Falls back to localhost:8000 for local development.
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * POST /predict — send a File object, receive predictions JSON.
 */
export async function predictChurn(file) {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    body: form,
  });

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
