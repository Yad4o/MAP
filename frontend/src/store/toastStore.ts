import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: Toast[];
  timers: Record<string, ReturnType<typeof setTimeout>>;
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  timers: {},
  addToast: (message, type = 'success') => {
    const id = Math.random().toString(36).slice(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    
    // Auto-remove after 4 seconds
    const timer = setTimeout(() => {
      useToastStore.getState().removeToast(id);
    }, 4000);
    
    set((state) => ({ 
      timers: { ...state.timers, [id]: timer } 
    }));
  },
  removeToast: (id) => {
    set((state) => {
      if (state.timers[id]) {
        clearTimeout(state.timers[id]);
      }
      
      const { [id]: _, ...remainingTimers } = state.timers;
      
      return {
        toasts: state.toasts.filter((t) => t.id !== id),
        timers: remainingTimers,
      };
    });
  },
}));

export const toast = {
  success: (msg: string) => useToastStore.getState().addToast(msg, 'success'),
  error: (msg: string) => useToastStore.getState().addToast(msg, 'error'),
  info: (msg: string) => useToastStore.getState().addToast(msg, 'info'),
  warning: (msg: string) => useToastStore.getState().addToast(msg, 'warning'),
};
