// Thin fetch wrapper: same-origin API with JWT bearer auth.
const API_BASE = "/api";

const Api = {
  token: localStorage.getItem("vc_token") || null,

  setToken(t) {
    this.token = t;
    if (t) localStorage.setItem("vc_token", t);
    else localStorage.removeItem("vc_token");
  },

  async request(path, { method = "GET", body, formData } = {}) {
    const headers = {};
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    if (body) headers["Content-Type"] = "application/json";
    const res = await fetch(API_BASE + path, {
      method, headers,
      body: formData ? formData : body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch { /* file downloads etc. */ }
    if (!res.ok) {
      const detail = data && data.detail ? data.detail : `Request failed (${res.status})`;
      const err = new Error(detail);
      err.status = res.status;
      throw err;
    }
    return data;
  },

  get(path) { return this.request(path); },
  post(path, body) { return this.request(path, { method: "POST", body }); },
  patch(path, body) { return this.request(path, { method: "PATCH", body }); },
  del(path) { return this.request(path, { method: "DELETE" }); },
  upload(path, formData) { return this.request(path, { method: "POST", formData }); },
};
