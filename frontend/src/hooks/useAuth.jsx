// src/hooks/useAuth.js
import { useState, useEffect, createContext, useContext } from "react";
import { apiLogin, apiSignup } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On app load, check if there's a saved session
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const email = localStorage.getItem("user_email");
    const name = localStorage.getItem("user_name");
    if (token && email) {
      setUser({ email, name: name || email.split("@")[0], token });
    }
    setLoading(false);
  }, []);

  async function login(email, password) {
    const data = await apiLogin(email, password);
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("user_email", data.email);
    localStorage.setItem("user_name", email.split("@")[0]);
    setUser({ email: data.email, name: email.split("@")[0], token: data.access_token });
  }

  async function signup(email, password, fullName) {
    const data = await apiSignup(email, password, fullName);
    if (data.access_token) {
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_email", data.email);
      localStorage.setItem("user_name", fullName);
      setUser({ email: data.email, name: fullName, token: data.access_token });
    }
    return data;
  }

  function logout() {
    localStorage.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
