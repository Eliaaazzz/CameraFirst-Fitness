/**
 * Toast Notification System
 * React Native equivalent of Sonner - minimal, elegant toast notifications
 * Features smooth animations, stacking, and auto-dismiss
 */

import { Feather } from '@expo/vector-icons';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  SlideInUp,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';

import { Text } from '@/components/Text';
import { BRAND_COLORS, spacing } from '@/utils';

// ============================================================================
// TYPES
// ============================================================================

type ToastType = 'success' | 'error' | 'info' | 'warning';
type FeatherIconName = 'check-circle' | 'x-circle' | 'info' | 'alert-triangle' | 'x';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastContextValue {
  toast: (options: Omit<Toast, 'id'>) => void;
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  info: (message: string, description?: string) => void;
  warning: (message: string, description?: string) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

// ============================================================================
// TOAST CONFIG
// ============================================================================

const TOAST_CONFIG: Record<ToastType, { icon: FeatherIconName; color: string; bgColor: string }> = {
  success: {
    icon: 'check-circle',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
  },
  error: {
    icon: 'x-circle',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
  },
  info: {
    icon: 'info',
    color: BRAND_COLORS.primary,
    bgColor: 'rgba(167, 139, 250, 0.1)',
  },
  warning: {
    icon: 'alert-triangle',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.1)',
  },
};

const DEFAULT_DURATION = 4000;
const MAX_TOASTS = 3;

// ============================================================================
// CONTEXT
// ============================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

// ============================================================================
// SINGLE TOAST COMPONENT
// ============================================================================

interface ToastItemProps {
  readonly toast: Toast;
  readonly onDismiss: (id: string) => void;
  readonly index: number;
}

function ToastItem({ toast, onDismiss, index }: Readonly<ToastItemProps>) {
  const config = TOAST_CONFIG[toast.type];
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(1, { damping: 20, stiffness: 300 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [-20, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.9, 1]) },
    ],
  }));

  // Auto dismiss
  useEffect(() => {
    const duration = toast.duration ?? DEFAULT_DURATION;
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <Animated.View
      style={[styles.toastItem, animatedStyle]}
      entering={SlideInUp.springify().damping(20)}
      exiting={FadeOut.duration(200)}
      layout={LinearTransition.springify()}
    >
      <Pressable
        style={styles.toastContent}
        onPress={() => onDismiss(toast.id)}
      >
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
          <Feather name={config.icon} size={18} color={config.color} />
        </View>

        {/* Text */}
        <View style={styles.textContainer}>
          <Text variant="body" weight="semibold" style={styles.message}>
            {toast.message}
          </Text>
          {toast.description && (
            <Text variant="caption" style={styles.description}>
              {toast.description}
            </Text>
          )}
        </View>

        {/* Action button or dismiss */}
        {toast.action ? (
          <Pressable
            style={styles.actionButton}
            onPress={() => {
              toast.action?.onPress();
              onDismiss(toast.id);
            }}
          >
            <Text variant="caption" weight="semibold" style={styles.actionText}>
              {toast.action.label}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.dismissButton}
            onPress={() => onDismiss(toast.id)}
            hitSlop={8}
          >
            <Feather name="x" size={16} color={BRAND_COLORS.textSecondary} />
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ============================================================================
// TOAST PROVIDER
// ============================================================================

interface ToastProviderProps {
  readonly children: React.ReactNode;
}

export function ToastProvider({ children }: Readonly<ToastProviderProps>) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }, []);

  const toast = useCallback((options: Omit<Toast, 'id'>) => {
    const id = generateId();
    const newToast: Toast = { ...options, id };
    
    setToasts((prev) => {
      // Keep only the most recent toasts
      const updated = [newToast, ...prev].slice(0, MAX_TOASTS);
      return updated;
    });

    return id;
  }, [generateId]);

  const success = useCallback((message: string, description?: string) => {
    return toast({ type: 'success', message, description });
  }, [toast]);

  const error = useCallback((message: string, description?: string) => {
    return toast({ type: 'error', message, description });
  }, [toast]);

  const info = useCallback((message: string, description?: string) => {
    return toast({ type: 'info', message, description });
  }, [toast]);

  const warning = useCallback((message: string, description?: string) => {
    return toast({ type: 'warning', message, description });
  }, [toast]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const contextValue = useMemo<ToastContextValue>(() => ({
    toast,
    success,
    error,
    info,
    warning,
    dismiss,
    dismissAll,
  }), [toast, success, error, info, warning, dismiss, dismissAll]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toast Container */}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((t, index) => (
          <ToastItem
            key={t.id}
            toast={t}
            onDismiss={dismiss}
            index={index}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 60, // Account for status bar on mobile
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
  toastItem: {
    width: '100%',
    maxWidth: 400,
    marginHorizontal: 16,
    marginBottom: spacing.sm,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
    // Shadow
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  message: {
    color: BRAND_COLORS.textPrimary,
    fontSize: 14,
  },
  description: {
    color: BRAND_COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: BRAND_COLORS.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  dismissButton: {
    padding: spacing.xs,
  },
});

export default ToastProvider;
