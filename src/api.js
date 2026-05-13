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
  lineSettings: () => request("/api/line-settings"),
  saveLineSettings: (payload) =>
    request("/api/line-settings", {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  recipients: () => request("/api/recipients"),
  campaign: () => request("/api/campaign"),
  saveCampaign: (payload) =>
    request("/api/campaign", {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  sendNow: (payload) =>
    request("/api/send", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  history: () => request("/api/history?limit=50"),
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch("/api/upload", {
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
