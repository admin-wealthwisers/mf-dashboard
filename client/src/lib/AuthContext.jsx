import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [launchMode, setLaunchMode] = useState(false);

  useEffect(() => {
    // Fetch public config (for pre-login landing page)
    fetch('/api/config').then((r) => r.json()).then((d) => setLaunchMode(d.data?.launchMode ?? false)).catch(() => {});

    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => {
        if (r.ok) return r.json();
        throw new Error('Not authenticated');
      })
      .then((data) => {
        setUser(data.data);
        if (data.data?.launchMode !== undefined) setLaunchMode(data.data.launchMode);
      })
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
  const tier = user?.tier || 'free';
  const isPro = tier === 'pro' || user?.role === 'admin';
  const isTrial = tier === 'trial';

  const startTrial = useCallback(async () => {
    const res = await fetch('/api/auth/start-trial', { method: 'POST', credentials: 'include' });
    if (res.ok) {
      // Refresh user data
      const meRes = await fetch('/api/auth/me', { credentials: 'include' });
      if (meRes.ok) {
        const data = await meRes.json();
        setUser(data.data);
      }
    }
    return res.ok;
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAdmin, isDev, tier, isPro, isTrial, launchMode, startTrial, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
