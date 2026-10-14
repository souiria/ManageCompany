import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/constants/theme';
import { formatMAD } from '@/lib/format';
import {
  AFFAIR_STATUS_LABELS,
  APPROVAL_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type AffairStatus,
  type ApprovalStatus,
  type InvoiceStatus,
  type PaymentStatus,
  type TaskPriority,
  type TaskStatus,
} from '@/constants/statuses';
import * as documentsApi from '@/api/documents';
import { useToast } from '@/components/feedback';

// ---------- Status badges ----------

type BadgeStatus = AffairStatus | TaskStatus | TaskPriority | PaymentStatus | ApprovalStatus | InvoiceStatus;

const BADGE_COLORS: Record<string, { bg: string; fg: string }> = {
  draft: { bg: '#ECEFF3', fg: '#5B6169' },
  planned: { bg: '#ECEFF3', fg: '#5B6169' },
  low: { bg: '#ECEFF3', fg: '#5B6169' },
  in_progress: { bg: '#E3F0FF', fg: '#1F4E79' },
  in_progress_task: { bg: '#E3F0FF', fg: '#1F4E79' },
  medium: { bg: '#FFF3DC', fg: '#B26A00' },
  partially_delivered: { bg: '#FFF3DC', fg: '#B26A00' },
  partially_paid: { bg: '#FFF3DC', fg: '#B26A00' },
  partial: { bg: '#FFF3DC', fg: '#B26A00' },
  pending: { bg: '#FFF3DC', fg: '#B26A00' },
  delivered: { bg: '#E6F4EA', fg: '#2E7D32' },
  sent: { bg: '#E6F4EA', fg: '#2E7D32' },
  paid: { bg: '#E6F4EA', fg: '#2E7D32' },
  approved: { bg: '#E6F4EA', fg: '#2E7D32' },
  done: { bg: '#E6F4EA', fg: '#2E7D32' },
  high: { bg: '#FDE7E5', fg: '#B3261E' },
  overdue: { bg: '#FDE7E5', fg: '#B3261E' },
  blocked: { bg: '#FDE7E5', fg: '#B3261E' },
  rejected: { bg: '#FDE7E5', fg: '#B3261E' },
  invoiced: { bg: '#E0F2F5', fg: '#02677A' },
  closed: { bg: '#EDE7F6', fg: '#5E35B1' },
  cancelled: { bg: '#ECEFF3', fg: '#8A919B' },
  unpaid: { bg: '#FDE7E5', fg: '#B3261E' },
};

export function statusLabel(status: BadgeStatus): string {
  const map: Partial<Record<string, string>> = {
    ...AFFAIR_STATUS_LABELS,
    ...TASK_STATUS_LABELS,
    ...TASK_PRIORITY_LABELS,
    ...PAYMENT_STATUS_LABELS,
    ...APPROVAL_STATUS_LABELS,
    ...INVOICE_STATUS_LABELS,
  };
  return map[status] ?? status;
}

export function StatusBadge({ status, overdue = false }: { status: BadgeStatus; overdue?: boolean }) {
  const key = overdue ? 'overdue' : status in AFFAIR_STATUS_LABELS && status === 'in_progress' ? 'in_progress' : status;
  const palette = BADGE_COLORS[key] ?? BADGE_COLORS.draft;
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.fg }]}>
        {overdue ? 'En retard' : statusLabel(status)}
      </Text>
    </View>
  );
}

// ---------- Money ----------

export function MoneyText({ amount, style }: { amount: number | string | null | undefined; style?: object }) {
  return <Text style={[styles.money, style]}>{formatMAD(amount)}</Text>;
}

// ---------- Search bar ----------

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Rechercher…',
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.searchBox}>
      <Ionicons name="search" size={16} color={colors.textMuted} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')}>
          <Ionicons name="close-circle" size={16} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

// ---------- List row ----------

export function ListRow({
  title,
  subtitle,
  right,
  onPress,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.primaryLight }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={styles.rowSubtitle} numberOfLines={2}>{subtitle}</Text>}
      </View>
      {right}
      {onPress && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
    </Pressable>
  );
}

// ---------- Attachment uploader (Supabase Storage, private bucket) ----------

export function AttachmentUploader({
  documentType,
  links,
  onUploaded,
}: {
  documentType: Parameters<typeof documentsApi.uploadDocument>[0];
  links: documentsApi.DocumentLinks;
  onUploaded?: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);

  const pick = async () => {
    setBusy(true);
    try {
      await documentsApi.uploadDocument(documentType, links);
      toast.show('Document téléversé', 'success');
      onUploaded?.();
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Échec du téléversement', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable style={styles.uploadBox} onPress={pick} disabled={busy}>
      <Ionicons name="cloud-upload-outline" size={22} color={colors.primary} />
      <Text style={styles.uploadText}>{busy ? 'Téléversement…' : 'Ajouter un document'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 8, paddingHorizontal: spacing(2), paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  money: { ...typography.section, color: colors.text },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing(3),
    marginBottom: spacing(3),
  },
  searchInput: { flex: 1, paddingVertical: spacing(2.5), fontSize: 15, color: colors.text },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing(3),
    marginBottom: spacing(2),
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowTitle: { ...typography.body, fontWeight: '600', color: colors.text },
  rowSubtitle: { ...typography.caption, marginTop: 2 },
  uploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(2),
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing(4),
    marginTop: spacing(2),
  },
  uploadText: { color: colors.primary, fontWeight: '600' },
});
