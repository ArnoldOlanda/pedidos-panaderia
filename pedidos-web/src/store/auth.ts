import { create } from 'zustand';

// Vestigial: the API only issues vendor sessions (buyers are anonymous and
// their data lives on each order). Kept as a literal until the role is
// removed end-to-end.
export type AuthUser = { id: string; name: string; role: 'VENDEDOR' };
export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  setUser: (user: AuthUser | null) => void;
  setStatus: (status: AuthStatus) => void;
  clear: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: 'idle',
  setUser: (user) => set({ user, status: user ? 'authenticated' : 'unauthenticated' }),
  setStatus: (status) => set({ status }),
  clear: () => set({ user: null, status: 'unauthenticated' }),
}));