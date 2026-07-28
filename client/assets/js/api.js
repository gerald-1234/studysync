import { API_BASE_URL, TOKEN_KEY } from "./config.js";

export async function api(path, options = {}) {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    if (response.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem("studysync_user");
    }
    throw new Error(body?.message || "The request could not be completed.");
  }

  return body;
}

export function send(path, method, payload) {
  return api(path, {
    method,
    body: JSON.stringify(payload),
  });
}
