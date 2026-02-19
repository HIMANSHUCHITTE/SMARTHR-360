import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
    persist(
        (set) => ({
            token: null,
            user: null,
            organization: null, // Current active org context
            panel: null,
            isAuthenticated: false,

            setToken: (token) => set({ token, isAuthenticated: !!token }),

            login: (userData, token, organization = null, panel = null) => set({
                user: userData,
                token,
                organization,
                panel,
                isAuthenticated: true
            }),

            logout: () => {
                set({ token: null, user: null, organization: null, panel: null, isAuthenticated: false });
                // Optional: Call logout API to clear cookie
            },

            setOrganization: (org) => set({ organization: org }),
            setPanel: (panel) => set({ panel }),

            updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),
        }),
        {
            name: 'auth-storage', // localstorage key
            partialize: (state) => ({
                token: state.token,
                user: state.user,
                organization: state.organization,
                panel: state.panel,
                isAuthenticated: state.isAuthenticated
            }),
        }
    )
);
