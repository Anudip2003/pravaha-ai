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

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function apiSignup(email, password, fullName) {
  const res = await fetch(`${BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Signup failed");
  return data; // { user_id, email, access_token }
}

export async function apiLogin(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Login failed");
  return data; // { user_id, email, access_token }
}

// ── Expenses ──────────────────────────────────────────────────────────────────

export async function apiGetExpenses() {
  const res = await fetch(`${BASE_URL}/expenses`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch expenses");
  return data;
}

export async function apiAddExpense(amount, description, txn_date, category) {
  const res = await fetch(`${BASE_URL}/expenses`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ amount, description, txn_date, category }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to add expense");
  return data;
}

export async function apiDeleteExpense(id) {
  const res = await fetch(`${BASE_URL}/expenses/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to delete expense");
  return data;
}
