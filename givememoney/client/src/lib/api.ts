const API = "/api";

function getToken() {
  return localStorage.getItem("gmm_token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("gmm_token", token);
  else localStorage.removeItem("gmm_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = data.error;
    throw new Error(typeof err === "string" ? err : JSON.stringify(err) || res.statusText);
  }

  return data as T;
}

export const api = {
  register: (body: { email: string; name: string; password: string }) =>
    request<{ token: string; user: import("../types").User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: import("../types").User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  me: () => request<{ user: import("../types").User }>("/me"),

  getContacts: () =>
    request<{ contacts: import("../types").Contact[] }>("/contacts"),

  createContact: (body: { name: string; email?: string; phone?: string }) =>
    request<{ contact: import("../types").Contact }>("/contacts", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteContact: (id: number) =>
    fetch(`${API}/contacts/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    }),

  getRequests: () =>
    request<{ requests: import("../types").MoneyRequest[] }>("/requests"),

  sendRequest: (body: {
    contactId: number;
    amountCents: number;
    message: string;
    paymentLink?: string;
    sendEmail: boolean;
    sendSms: boolean;
  }) =>
    request<{ request: import("../types").MoneyRequest; emailSent: boolean; smsSent: boolean }>(
      "/requests",
      { method: "POST", body: JSON.stringify(body) }
    ),
};
