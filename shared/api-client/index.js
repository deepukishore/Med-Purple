/** The same REST transport is used by web and native. Access tokens stay in memory. */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
export function createApi({ baseUrl, storage, native = false }) {
  const listeners = new Set();
  let access = null,
    refreshFlight = null;
  const raw = async (path, options = {}) => {
    let response;
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 15000);
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...options,
        signal: options.signal || controller.signal,
        credentials: native ? "omit" : "include",
        headers: {
          "Content-Type": "application/json",
          ...(access ? { Authorization: `Bearer ${access}` } : {}),
          ...options.headers,
        },
      });
    } catch (error) {
      throw new ApiError(
        error.name === "AbortError"
          ? "The request took too long. Please try again."
          : "Cannot reach Med Purple. Check your connection and try again.",
        0,
      );
    } finally {
      clearTimeout(deadline);
    }
    const data =
      response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok)
      throw new ApiError(
        typeof data?.detail === "string"
          ? data.detail
          : response.status === 422
            ? "Please check the details you entered."
            : "Something went wrong. Please try again.",
        response.status,
      );
    return data;
  };
  const accept = async (data) => {
    access = data.access_token;
    if (native && data.refresh_token) await storage.set(data.refresh_token);
    return data.user;
  };
  const refresh = () => {
    if (!refreshFlight)
      refreshFlight = (async () => {
        const token = native ? await storage.get() : undefined;
        return accept(
          await raw("/auth/refresh", {
            method: "POST",
            body: JSON.stringify({ refresh_token: token }),
          }),
        );
      })().finally(() => {
        refreshFlight = null;
      });
    return refreshFlight;
  };
  const request = async (path, options = {}) => {
    let data;
    try {
      data = await raw(path, options);
    } catch (e) {
      if (e.status !== 401) throw e;
      await refresh();
      data = await raw(path, options);
    }
    if (
      options.method &&
      options.method !== "GET" &&
      !(path === "/auth/me" && options.method === "DELETE")
    ) {
      for (const listener of listeners) listener(path);
    }
    return data;
  };
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    request,
    async bootstrap() {
      try {
        return await refresh();
      } catch (e) {
        if (e.status !== 401) throw e;
        return accept(
          await raw("/auth/guest", {
            method: "POST",
            headers: { "X-Client": native ? "native" : "web" },
          }),
        );
      }
    },
    async login(email, password) {
      return accept(
        await raw("/auth/login", {
          method: "POST",
          headers: { "X-Client": native ? "native" : "web" },
          body: JSON.stringify({ email, password }),
        }),
      );
    },
    async register(values) {
      return accept(
        await raw("/auth/register", {
          method: "POST",
          headers: { "X-Client": native ? "native" : "web" },
          body: JSON.stringify(values),
        }),
      );
    },
    async logout() {
      await raw("/auth/logout", {
        method: "POST",
        body: JSON.stringify({
          refresh_token: native ? await storage.get() : undefined,
        }),
      });
      access = null;
      await storage?.remove?.();
    },
    async clear() {
      access = null;
      await storage?.remove?.();
    },
    get: (path) => request(path),
    post: (path, data) =>
      request(path, { method: "POST", body: JSON.stringify(data ?? {}) }),
    patch: (path, data) =>
      request(path, { method: "PATCH", body: JSON.stringify(data) }),
    put: (path, data) =>
      request(path, { method: "PUT", body: JSON.stringify(data) }),
    delete: (path) => request(path, { method: "DELETE" }),
  };
}
