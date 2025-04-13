import { create } from 'zustand';
import { Profile } from '../types';

interface Store {
  user: Profile | null;
  loading: boolean;
  error: string | null;
  setUser: (user: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateRegularBalance: (amount: number) => void;
  updateSweepsBalance: (amount: number) => void;
  reset: () => void;
}

const initialState = {
  user: null,
  loading: true,
  error: null
};

export const useStore = create<Store>((set) => ({
  ...initialState,
  setUser: (user) => set({ user, loading: false }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  updateRegularBalance: (amount) =>
    set((state) => ({
      user: state.user
        ? { ...state.user, regular_balance: state.user.regular_balance + amount }
        : null,
    })),
  updateSweepsBalance: (amount) =>
    set((state) => ({
      user: state.user
        ? { ...state.user, sweeps_balance: state.user.sweeps_balance + amount }
        : null,
    })),
  reset: () => set(initialState)
}));