/**
 * Enterprise-grade resilient HTTP client wrapper for SendChat
 * - Automatically attaches credentials (HTTP-only JWT cookies)
 * - Safely parses JSON/text/empty responses
 * - Detects 401 Unauthorized and auto-clears stale sessions
 */

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Handle session expiration globally
 */
export const handleSessionExpired = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("chat-user");
    window.dispatchEvent(new CustomEvent("auth:unauthorized"));
  }
};

/**
 * Core request dispatcher
 */
export async function request(endpoint, options = {}) {
  const { body, headers = {}, ...customConfig } = options;

  const config = {
    method: customConfig.method || "GET",
    credentials: "include", // Required for HTTP-only cookies
    headers: {
      ...headers,
    },
    ...customConfig,
  };

  if (body !== undefined && body !== null) {
    if (body instanceof FormData) {
      config.body = body;
    } else {
      config.headers["Content-Type"] = "application/json";
      config.body = JSON.stringify(body);
    }
  }

  let response;
  try {
    response = await fetch(endpoint, config);
  } catch (networkErr) {
    throw new ApiError(
      "Unable to connect to server. Please check your network connection.",
      0,
      networkErr
    );
  }

  // Parse body safely
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { rawText: text };
    }
  }

  // Handle 401 Unauthorized (Session Expired / Token Invalid)
  if (response.status === 401) {
    handleSessionExpired();
    const errorMsg = data?.error || data?.message || "Session expired. Please log in again.";
    throw new ApiError(errorMsg, 401, data);
  }

  // Handle other non-2xx errors
  if (!response.ok) {
    const errorMsg = data?.error || data?.message || `Request failed with status ${response.status}`;
    throw new ApiError(errorMsg, response.status, data);
  }

  return data;
}

export const api = {
  get: (url, options = {}) => request(url, { ...options, method: "GET" }),
  post: (url, body, options = {}) => request(url, { ...options, method: "POST", body }),
  put: (url, body, options = {}) => request(url, { ...options, method: "PUT", body }),
  delete: (url, options = {}) => request(url, { ...options, method: "DELETE" }),
};

export default api;
