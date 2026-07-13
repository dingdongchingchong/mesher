import { create } from "zustand";
import { api, setToken } from "../lib/api";
import type { User } from "../types";

type AuthState = {
  user: User | null;
  loading: boolean;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,

  bootstrap: async () => {
    const token = localStorage.getItem("gmm_token");
    if (!token) {
      set({ user: null, loading: false });
      return;
    }
    try {
      const { user } = await api.me();
      set({ user, loading: false });
    } catch {
      setToken(null);
      set({ user: null, loading: false });
    }
  },

  login: async (email, password) => {
    const { token, user } = await api.login({ email, password });
    setToken(token);
    set({ user });
  },

  register: async (email, name, password) => {
    const { token, user } = await api.register({ email, name, password });
    setToken(token);
    set({ user });
  },

  logout: () => {
    setToken(null);
    set({ user: null });
  },
}));
