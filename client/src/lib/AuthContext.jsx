import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => {
        if (r.ok) return r.json();
        throw new Error('Not authenticated');
      })
      .then((data) => setUser(data.data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  }, []);

  const login = useCallback(() => {
    // In dev, OAuth redirects must go directly to Express (not through Vite proxy)
    const baseUrl = import.meta.env.DEV ? 'http://localhost:3001' : '';
    window.location.href = `${baseUrl}/api/auth/google`;
  }, []);

  const isAdmin = user?.role === 'admin';
  const isDev = user?.isDev === true;

  return (
    <AuthContext.Provider value={{ user, isLoading, isAdmin, isDev, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
