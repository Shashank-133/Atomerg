import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setUnauthorizedHandler } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    const r = await api.get('/auth/me', { skipAuthRedirect: true });
    if (r.success) setUser(r.data.user);
    else setUser(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      if (!window.location.pathname.startsWith('/login')) navigate('/login', { replace: true });
    });
    refresh();
  }, [refresh, navigate]);

  const login = async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    if (r.success) {
      setUser(r.data.user);
      return { ok: true, user: r.data.user };
    }
    return { ok: false, error: r.error };
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
    navigate('/login', { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
