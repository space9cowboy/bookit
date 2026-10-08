import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiRequest, setAuthToken, setUnauthorizedHandler } from './api';
import type { AuthResponse, User } from './types';

const TOKEN_KEY = 'bookit.token';

interface AuthContextValue {
  user: User | null;
  /** true tant que la session stockée est en cours de vérification (GET /me). */
  initializing: boolean;
  login(email: string, password: string): Promise<void>;
  register(name: string, email: string, password: string): Promise<void>;
  logout(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const readToken = () => localStorage.getItem(TOKEN_KEY);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(() => readToken() !== null);

  const logout = useCallback(() => {
    setAuthToken(null);
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const startSession = useCallback((response: AuthResponse) => {
    setAuthToken(response.token);
    localStorage.setItem(TOKEN_KEY, response.token);
    setUser(response.user);
  }, []);

  // Restaure la session au chargement ; un 401 ultérieur déconnecte l'utilisateur.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    const token = readToken();
    if (!token) return;
    setAuthToken(token);
    apiRequest<User>('/me')
      .then(setUser)
      .catch(logout)
      .finally(() => setInitializing(false));
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      logout,
      async login(email, password) {
        startSession(
          await apiRequest<AuthResponse>('/auth/login', {
            method: 'POST',
            body: { email, password },
          }),
        );
      },
      async register(name, email, password) {
        startSession(
          await apiRequest<AuthResponse>('/auth/register', {
            method: 'POST',
            body: { name, email, password },
          }),
        );
      },
    }),
    [user, initializing, logout, startSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
