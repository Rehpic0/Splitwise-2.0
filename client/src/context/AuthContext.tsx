import React, { createContext, useState, useEffect, useContext } from "react";

type AuthUser = { _id: string; name: string; email: string };
type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const LOCAL_KEY = "auth";
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const val = localStorage.getItem(LOCAL_KEY);
    if (val) {
      const { token, user } = JSON.parse(val);
      setUser(user); setToken(token);
    }
  }, []);

  function login(token: string, user: AuthUser) {
    setUser(user); setToken(token);
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ token, user }));
  }
  function logout() {
    setUser(null); setToken(null);
    localStorage.removeItem(LOCAL_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext)!;