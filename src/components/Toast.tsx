"use client";

import { create } from "zustand";
import { CheckCircle, AlertCircle, X, TrendingUp } from "lucide-react";

type ToastType = "success" | "error" | "info" | "trade";

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastStore = {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
};

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type = "info") => {
    const id = Math.random().toString(36).slice(2, 8);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }].slice(-3),
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-4 h-4 text-accent-green" />,
  error: <AlertCircle className="w-4 h-4 text-accent-red" />,
  info: <TrendingUp className="w-4 h-4 text-accent-blue" />,
  trade: <TrendingUp className="w-4 h-4 text-accent-green" />,
};

const bgColors: Record<ToastType, string> = {
  success: "border-accent-green/30 bg-accent-green/5",
  error: "border-accent-red/30 bg-accent-red/5",
  info: "border-accent-blue/30 bg-accent-blue/5",
  trade: "border-accent-green/30 bg-accent-green/5",
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto glass border ${bgColors[toast.type]} p-3 pr-8 rounded-lg shadow-lg max-w-sm animate-slide-up relative`}
        >
          <div className="flex items-center gap-2">
            {icons[toast.type]}
            <p className="text-sm text-foreground">{toast.message}</p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="absolute top-2 right-2 text-text-muted hover:text-foreground"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
