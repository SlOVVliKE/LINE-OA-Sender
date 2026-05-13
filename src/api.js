async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");
  const body = isJson ? await response.json() : {};

  if (!response.ok) {
    throw new Error(body.error || "เกิดข้อผิดพลาด");
  }

  return body;
}

export const api = {
  session: () => request("/api/session"),
  login: (password) =>
    request("/api/login", {
      method: "POST",
      body: JSON.stringify({ password })
    }),
  logout: () =>
    request("/api/logout", {
      method: "POST",
      body: JSON.stringify({})
    }),

  adminBots: () => request("/api/admin/bots"),
  createAdminBot: (payload) =>
    request("/api/admin/bots", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateAdminBot: (id, payload) =>
    request(`/api/admin/bots/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  deleteAdminBot: (id) =>
    request(`/api/admin/bots/${id}`, {
      method: "DELETE"
    }),

  adminUsers: () => request("/api/admin/users"),
  createAdminUser: (payload) =>
    request("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateAdminUser: (id, payload) =>
    request(`/api/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  deleteAdminUser: (id) =>
    request(`/api/admin/users/${id}`, {
      method: "DELETE"
    }),

  assignedBots: () => request("/api/bots"),
  recipients: (botId) => request(`/api/bots/${botId}/recipients`),
  campaign: (botId) => request(`/api/bots/${botId}/campaign`),
  saveCampaign: (botId, payload) =>
    request(`/api/bots/${botId}/campaign`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  sendNow: (botId, payload) =>
    request(`/api/bots/${botId}/send`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  history: (botId) => request(`/api/bots/${botId}/history?limit=50`),
  uploadImage: async (botId, file) => {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`/api/bots/${botId}/upload`, {
      method: "POST",
      credentials: "include",
      body: formData
    });

    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error || "อัปโหลดไม่สำเร็จ");
    }
    return body;
  }
};
