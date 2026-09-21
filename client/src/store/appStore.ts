import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AppState {
    isAuthenticated: boolean;
    user: User | null;
    userPhoto: string | null; // Base64 of registered face
    login: (user: User) => void;
    logout: () => void;
    registerFace: (photo: string) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            isAuthenticated: false,
            user: null,
            userPhoto: null,
            login: (user) => set({ isAuthenticated: true, user }),
            logout: () => set({ isAuthenticated: false, user: null, userPhoto: null }),
            registerFace: (photo) => set({ userPhoto: photo }),
        }),
        {
            name: 'proctoring-app-storage', // localStorage key
        }
    )
);
