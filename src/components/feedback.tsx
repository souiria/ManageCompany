import React, { createContext, useCallback, useContext, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/constants/theme';

// ---------- Toast ----------

interface ToastItem { id: number; message: string; kind: 'success' | 'error' | 'info'; }

const ToastContext = createContext<{ show: (message: string, kind?: ToastItem['kind']) => void }>({ show: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const show = useCallback((message: string, kind: ToastItem['kind'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <View style={styles.toastWrap} pointerEvents="none">
        {toasts.map((t) => (
          <View key={t.id} style={[styles.toast, {
            backgroundColor: t.kind === 'success' ? colors.success : t.kind === 'error' ? colors.danger : colors.info,
          }]}>
            <Text style={styles.toastText}>{t.message}</Text>
          </View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

// ---------- Confirm dialog ----------

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirmer',
  danger = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.dialogBackdrop}>
        <View style={styles.dialog}>
          <Text style={styles.dialogTitle}>{title}</Text>
          <Text style={styles.dialogMessage}>{message}</Text>
          <View style={styles.dialogActions}>
            <Pressable onPress={onCancel} style={styles.dialogBtn}>
              <Text style={{ color: colors.textSecondary }}>Annuler</Text>
            </Pressable>
            <Pressable onPress={onConfirm} style={styles.dialogBtn}>
              <Text style={{ color: danger ? colors.danger : colors.primary, fontWeight: '700' }}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------- Empty / Error states ----------

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.stateWrap}>
      <Ionicons name="folder-open-outline" size={40} color={colors.textMuted} />
      <Text style={styles.stateTitle}>{title}</Text>
      {subtitle && <Text style={styles.stateSub}>{subtitle}</Text>}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.stateWrap}>
      <Ionicons name="alert-circle-outline" size={40} color={colors.danger} />
      <Text style={styles.stateTitle}>{message}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} style={styles.retryBtn}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Réessayer</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toastWrap: { position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center', gap: spacing(2) },
  toast: { borderRadius: 10, paddingHorizontal: spacing(4), paddingVertical: spacing(2.5), maxWidth: '90%' },
  toastText: { color: '#fff', fontSize: 14 },
  dialogBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: spacing(6) },
  dialog: { backgroundColor: colors.surface, borderRadius: 14, padding: spacing(5) },
  dialogTitle: { ...typography.section, color: colors.text, marginBottom: spacing(2) },
  dialogMessage: { color: colors.textSecondary, marginBottom: spacing(4) },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing(5) },
  dialogBtn: { paddingVertical: spacing(1) },
  stateWrap: { alignItems: 'center', paddingVertical: spacing(10), gap: spacing(2) },
  stateTitle: { ...typography.section, color: colors.textSecondary },
  stateSub: { ...typography.caption, textAlign: 'center' },
  retryBtn: { marginTop: spacing(2) },
});
