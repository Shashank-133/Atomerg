let onUnauthorized = null;
export function setUnauthorizedHandler(fn) { onUnauthorized = fn; }

async function request(method, path, body, opts = {}) {
  const init = {
    method,
    credentials: 'include',
    headers: { 'Accept': 'application/json' }
  };
  if (body !== undefined && body !== null) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(`/api${path}`, init);
  } catch (e) {
    return { success: false, data: null, error: 'Network error: ' + e.message };
  }

  if (opts.raw) return res;

  if (res.status === 401) {
    if (onUnauthorized && !opts.skipAuthRedirect) onUnauthorized();
  }

  let json;
  try { json = await res.json(); }
  catch { json = { success: false, data: null, error: `HTTP ${res.status}` }; }
  return json;
}

export const api = {
  get:  (p, opts) => request('GET', p, null, opts),
  post: (p, b, opts) => request('POST', p, b, opts),
  put:  (p, b, opts) => request('PUT', p, b, opts),
  del:  (p, opts) => request('DELETE', p, null, opts),
  download: async (p, filename) => {
    const res = await fetch(`/api${p}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
};
