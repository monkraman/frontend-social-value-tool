import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserProfile } from '../types';
import {
  getCurrentUserProfile,
  loginUser,
  registerUser,
  getStoredToken,
  clearStoredToken
} from '../api/client';

export interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isAuthModalOpen: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Validate existing stored token on mount
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const stored = getStoredToken();
      if (!stored) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const profile = await getCurrentUserProfile();
        if (isMounted) {
          if (profile) {
            setUser(profile);
            setToken(stored);
          } else {
            setUser(null);
            setToken(null);
            clearStoredToken();
          }
        }
      } catch (err) {
        console.warn('Could not verify existing session token:', err);
        if (isMounted) {
          setUser(null);
          setToken(null);
          clearStoredToken();
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await loginUser(email, password);
      setUser(res.user);
      setToken(res.access_token);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      const msg = err.message || 'Login failed. Please check your credentials.';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, role: string = 'superadmin') => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await registerUser(name, email, password, role);
        setUser(res.user);
        setToken(res.access_token);
        setIsAuthModalOpen(false);
      } catch (err: any) {
        const msg = err.message || 'Registration failed. Please check input details.';
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
    setToken(null);
    setError(null);
  }, []);

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setError(null);
  }, []);
  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        error,
        isAuthModalOpen,
        login,
        register,
        logout,
        openAuthModal,
        closeAuthModal,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
