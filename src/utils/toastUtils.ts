import { ToastConfig } from '../contexts/CustomToast/CustomToast';

// Standalone toast utility that doesn't depend on React context
// This breaks the circular dependency between contexts and hooks

let toastHandler: {
  success: (title: string, message?: string, options?: Partial<ToastConfig>) => void;
  error: (title: string, message?: string, options?: Partial<ToastConfig>) => void;
  warning: (title: string, message?: string, options?: Partial<ToastConfig>) => void;
  info: (title: string, message?: string, options?: Partial<ToastConfig>) => void;
  loading: (title: string, message?: string, options?: Partial<ToastConfig>) => void;
} | null = null;

export const setToastHandler = (handler: typeof toastHandler) => {
  toastHandler = handler;
};

export const toast = {
  success: (title: string, message?: string, options?: Partial<ToastConfig>) => {
    if (toastHandler) {
      toastHandler.success(title, message, options);
    } else {
      console.log(`[SUCCESS] ${title}: ${message || ''}`);
    }
  },
  error: (title: string, message?: string, options?: Partial<ToastConfig>) => {
    if (toastHandler) {
      toastHandler.error(title, message, options);
    } else {
      console.error(`[ERROR] ${title}: ${message || ''}`);
    }
  },
  warning: (title: string, message?: string, options?: Partial<ToastConfig>) => {
    if (toastHandler) {
      toastHandler.warning(title, message, options);
    } else {
      console.warn(`[WARNING] ${title}: ${message || ''}`);
    }
  },
  info: (title: string, message?: string, options?: Partial<ToastConfig>) => {
    if (toastHandler) {
      toastHandler.info(title, message, options);
    } else {
      console.info(`[INFO] ${title}: ${message || ''}`);
    }
  },
  loading: (title: string, message?: string, options?: Partial<ToastConfig>) => {
    if (toastHandler) {
      toastHandler.loading(title, message, options);
    } else {
      console.log(`[LOADING] ${title}: ${message || ''}`);
    }
  },
};
