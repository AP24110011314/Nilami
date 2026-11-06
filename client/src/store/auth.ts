import { create } from 'zustand';

export interface User {
  id: string;
  name: string;
  email: string;
  roles: ('buyer' | 'seller' | 'admin')[];
  emailVerifiedAt: string | null;
  status: 'active' | 'suspended';
  ratingAvg: number;
  ratingCount: number;
  stats: {
    bidsPlaced: number;
    auctionsWon: number;
    auctionsSold: number;
  };
  createdAt: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isInitialized: boolean;
  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  setInitialized: (initialized: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isInitialized: false,
  setAuth: (user, accessToken) => set({ user, accessToken, isInitialized: true }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  clearAuth: () => set({ user: null, accessToken: null, isInitialized: true }),
  setInitialized: (isInitialized) => set({ isInitialized }),
}));
