import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { View } from 'react-native';
import { CustomToast, ToastConfig, ToastType, ToastPosition } from './CustomToast';
import { setToastHandler } from '../../utils/toastUtils';

interface ToastContextType {
  toast: {
    success: (title: string, message?: string, options?: Partial<ToastConfig>) => string;
    error: (title: string, message?: string, options?: Partial<ToastConfig>) => string;
    warning: (title: string, message?: string, options?: Partial<ToastConfig>) => string;
    info: (title: string, message?: string, options?: Partial<ToastConfig>) => string;
    loading: (title: string, message?: string, options?: Partial<ToastConfig>) => string;
    update: (id: string, config: Partial<ToastConfig>) => void;
    hide: (id: string) => void;
    hideAll: () => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

interface ToastItem extends ToastConfig {
  id: string;
  visible: boolean;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Map<string, ToastItem>>(new Map());

  // Register the toast handler with the standalone utility
  useEffect(() => {
    setToastHandler({
      success: (title: string, message?: string, options?: Partial<ToastConfig>) =>
        showToast({ type: 'success', title, message, ...options }),
      error: (title: string, message?: string, options?: Partial<ToastConfig>) =>
        showToast({ type: 'error', title, message, ...options }),
      warning: (title: string, message?: string, options?: Partial<ToastConfig>) =>
        showToast({ type: 'warning', title, message, ...options }),
      info: (title: string, message?: string, options?: Partial<ToastConfig>) =>
        showToast({ type: 'info', title, message, ...options }),
      loading: (title: string, message?: string, options?: Partial<ToastConfig>) =>
        showToast({ type: 'loading', title, message, duration: 0, ...options }),
    });
  }, []);

  const generateId = () => `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const showToast = (config: ToastConfig): string => {
    const id = config.id || generateId();
    const toastItem: ToastItem = {
      ...config,
      id,
      visible: true,
    };
    
    setToasts(prev => new Map(prev).set(id, toastItem));
    return id;
  };

  const updateToast = (id: string, config: Partial<ToastConfig>) => {
    setToasts(prev => {
      const newToasts = new Map(prev);
      const existing = newToasts.get(id);
      if (existing) {
        newToasts.set(id, { ...existing, ...config });
      }
      return newToasts;
    });
  };

  const hideToast = (id: string) => {
    setToasts(prev => {
      const newToasts = new Map(prev);
      const existing = newToasts.get(id);
      if (existing) {
        newToasts.set(id, { ...existing, visible: false });
      }
      return newToasts;
    });
  };

  const hideAllToasts = () => {
    setToasts(prev => {
      const newToasts = new Map();
      prev.forEach((toast, id) => {
        newToasts.set(id, { ...toast, visible: false });
      });
      return newToasts;
    });
  };

  const removeToast = (id: string) => {
    setToasts(prev => {
      const newToasts = new Map(prev);
      newToasts.delete(id);
      return newToasts;
    });
  };

  const toast = {
    success: (title: string, message?: string, options?: Partial<ToastConfig>) =>
      showToast({ type: 'success', title, message, ...options }),
    error: (title: string, message?: string, options?: Partial<ToastConfig>) =>
      showToast({ type: 'error', title, message, ...options }),
    warning: (title: string, message?: string, options?: Partial<ToastConfig>) =>
      showToast({ type: 'warning', title, message, ...options }),
    info: (title: string, message?: string, options?: Partial<ToastConfig>) =>
      showToast({ type: 'info', title, message, ...options }),
    loading: (title: string, message?: string, options?: Partial<ToastConfig>) =>
      showToast({ type: 'loading', title, message, duration: 0, ...options }),
    update: updateToast,
    hide: hideToast,
    hideAll: hideAllToasts,
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {Array.from(toasts.values()).map((toastItem) => (
        <View
          key={toastItem.id}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999,
            pointerEvents: 'box-none',
            elevation: 999999,
          }}
        >
          <CustomToast
            {...toastItem}
            visible={toastItem.visible}
            onHide={() => removeToast(toastItem.id)}
          />
        </View>
      ))}
    </ToastContext.Provider>
  );
};

// Single useToast hook that uses the provider's context
export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};


