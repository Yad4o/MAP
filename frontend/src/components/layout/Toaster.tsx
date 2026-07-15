import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore, type ToastType } from '../../store/toastStore';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

/**
 * Toaster component renders all active toast notifications.
 * It uses framer-motion for smooth entry and exit animations.
 */
export default function Toaster() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = getIcon(toast.type);
          const colors = getColors(toast.type);

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-center gap-3 min-w-[300px] max-w-md p-4 rounded-md border border-hairline-on-dark shadow-sm bg-surface-elevated-dark ${colors.border}`}
            >
              <div className={`${colors.icon} shrink-0`}>
                <Icon size={20} />
              </div>
              <p className="flex-1 text-sm font-semibold text-on-dark tracking-tight">
                {toast.message}
              </p>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-muted hover:text-on-dark transition-colors p-1"
              >
                <X size={16} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function getIcon(type: ToastType) {
  switch (type) {
    case 'success': return CheckCircle2;
    case 'error': return XCircle;
    case 'warning': return AlertTriangle;
    case 'info': return Info;
  }
}

function getColors(type: ToastType) {
  switch (type) {
    case 'success':
      return { border: 'border-l-4 border-l-[theme(colors.trading.up)]', icon: 'text-trading-up' };
    case 'error':
      return { border: 'border-l-4 border-l-[theme(colors.trading.down)]', icon: 'text-trading-down' };
    case 'warning':
      return { border: 'border-l-4 border-l-[theme(colors.primary.DEFAULT)]', icon: 'text-primary' };
    case 'info':
      return { border: 'border-l-4 border-l-[theme(colors.info.DEFAULT)]', icon: 'text-info' };
  }
}

