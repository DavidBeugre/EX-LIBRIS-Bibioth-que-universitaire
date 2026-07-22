import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("exlibris_token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async (t) => {
    try {
      const me = await api.me(t);
      setUser(me);
    } catch {
      setToken(null);
      setUser(null);
      localStorage.removeItem("exlibris_token");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      setLoading(true);
      loadMe(token);
    } else {
      setLoading(false);
    }
  }, [token, loadMe]);

  const login = async (email, motDePasse) => {
    const res = await api.login(email, motDePasse);
    localStorage.setItem("exlibris_token", res.token);
    setToken(res.token);
    return res;
  };

  const register = async (payload) => {
    const res = await api.register(payload);
    localStorage.setItem("exlibris_token", res.token);
    setToken(res.token);
    return res;
  };

  const logout = () => {
    localStorage.removeItem("exlibris_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un AuthProvider");
  return ctx;
}
