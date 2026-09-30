// src/api/client.js
// All calls to the FastAPI backend go through here.
// BASE_URL points to your local backend during development.

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getToken() {
  return localStorage.getItem("access_token");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

let refreshPromise;

function clearAuth() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user_email");
  localStorage.removeItem("user_name");
  window.dispatchEvent(new Event("auth:session-expired"));
}

async function readResponse(res, fallback) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || fallback);
  return data;
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
      .then(async res => {
        if (!res.ok) return null;
        const data = await res.json();
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        return data.access_token;
      })
      .catch(() => null)
      .finally(() => { refreshPromise = null; });
  }

  return refreshPromise;
}

async function authenticatedFetch(url, options = {}) {
  const send = token => fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  });

  const response = await send(getToken());
  if (response.status !== 401) return response;

  const token = await refreshAccessToken();
  if (!token) {
    clearAuth();
    throw new Error("Your session expired. Please log in again.");
  }

  const retry = await send(token);
  if (retry.status === 401) clearAuth();
  return retry;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function apiSignup(email, password, fullName) {
  const res = await fetch(`${BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
  const data = await readResponse(res, "Signup failed");
  return data; // { user_id, email, access_token }
}

export async function apiLogin(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await readResponse(res, "Login failed");
  return data; // { user_id, email, access_token }
}

// ── Expenses ──────────────────────────────────────────────────────────────────

export async function apiGetExpenses() {
  const res = await authenticatedFetch(`${BASE_URL}/expenses`, { headers: authHeaders() });
  return readResponse(res, "Failed to fetch expenses");
}

export async function apiAddExpense(amount, description, txn_date, category) {
  const res = await authenticatedFetch(`${BASE_URL}/expenses`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ amount, description, txn_date, category }),
  });
  return readResponse(res, "Failed to add expense");
}

export async function apiImportExpenses(transactions) {
  const res = await authenticatedFetch(`${BASE_URL}/expenses/import`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ transactions }),
  });
  return readResponse(res, "Failed to import bank statement");
}

export async function apiDeleteExpense(id) {
  const res = await authenticatedFetch(`${BASE_URL}/expenses/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return readResponse(res, "Failed to delete expense");
}

export async function apiGetFinanceOverview() {
  const res = await authenticatedFetch(`${BASE_URL}/finance/overview`, { headers: authHeaders() });
  return readResponse(res, "Failed to load cash-flow overview");
}

export async function apiUpdateFinanceSettings(settings) {
  const res = await authenticatedFetch(`${BASE_URL}/finance/settings`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(settings),
  });
  return readResponse(res, "Failed to save cash-flow settings");
}

export async function apiChat(messages) {
  const res = await authenticatedFetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ messages }),
  });
  return readResponse(res, "Failed to contact the AI advisor");
}
