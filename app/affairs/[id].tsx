import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, SectionTitle, Button, Loading } from '@/components/ui';
import { EmptyState, ErrorState, ConfirmDialog, useToast } from '@/components/feedback';
import { MoneyText, StatusBadge, AttachmentUploader } from '@/components/business';
import { useAffair, useAffairFinancials, useUpdateAffair, mutationErrorMessage } from '@/hooks/queries';
import { addPurchaseOrder } from '@/api/affairs';
import { computeVat } from '@/lib/finance';
import { formatDate, formatMAD } from '@/lib/format';
import {
  AFFAIR_STATUS_LABELS,
  AFFAIR_STATUSES,
  ORDER_TYPE_LABELS,
  isAffairOverdue,
  type AffairStatus,
} from '@/constants/statuses';
import { colors, spacing, typography } from '@/constants/theme';

const CLOSURE_CHECKLIST: { key: string; label: string; done: (f: ClosureFacts) => boolean }[] = [
  { key: 'delivered', label: 'Livraison effectuée', done: (f) => f.delivered },
  { key: 'invoiced', label: 'Facturation émise', done: (f) => f.invoiced },
  { key: 'paid', label: 'Règlement encaissé', done: (f) => f.paid },
  { key: 'documents', label: 'Documents complets', done: (f) => f.documents },
];

interface ClosureFacts {
  delivered: boolean;
  invoiced: boolean;
  paid: boolean;
  documents: boolean;
}

export default function AffairDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const query = useAffair(id!);
  const financials = useAffairFinancials();
  const updateAffair = useUpdateAffair();
  const queryClient = useQueryClient();
  const [confirmClose, setConfirmClose] = useState(false);
  const [poForm, setPoForm] = useState({ po_number: '', amount_excluding_tax: '', vat_rate: '20' });

  const addPo = useMutation({
    mutationFn: (input: Omit<import('@/types/database').PurchaseOrder, 'id' | 'vat_amount' | 'amount_including_tax'>) =>
      addPurchaseOrder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affair', id] });
      setPoForm({ po_number: '', amount_excluding_tax: '', vat_rate: '20' });
      toast.show('Bon de commande ajouté', 'success');
    },
    onError: (error) => toast.show(mutationErrorMessage(error), 'error'),
  });

  if (query.isLoading) return <Loading />;
  if (query.isError || !query.data) return <ErrorState message="Affaire introuvable." onRetry={() => query.refetch()} />;

  const affair = query.data;
  const financial = financials.data?.find((f) => f.affair_id === id);
  const overdue = isAffairOverdue(affair.status, affair.planned_delivery_date);

  const poTotal = affair.purchase_orders.reduce((sum, po) => sum + Number(po.amount_excluding_tax), 0);

  const closureFacts: ClosureFacts = {
    delivered: affair.status === 'delivered' || affair.status === 'invoiced' || affair.status === 'closed' || affair.actual_delivery_date !== null,
    invoiced: (financial?.invoiced_revenue_excluding_tax ?? 0) > 0,
    paid: financial ? Number(financial.outstanding_receivables) <= 0 && Number(financial.invoiced_revenue_excluding_tax) > 0 : false,
    documents: true, // refined per-record via v_missing_documents
  };

  const submitPo = () => {
    const amount = Number(poForm.amount_excluding_tax);
    if (!poForm.po_number.trim() || Number.isNaN(amount) || amount < 0) {
      toast.show('Renseignez un n° de BC et un montant HT valides.', 'error');
      return;
    }
    addPo.mutate({
      affair_id: affair.id,
      po_number: poForm.po_number.trim(),
      description: null,
      amount_excluding_tax: amount,
      vat_rate: Number(poForm.vat_rate) || 20,
      order_date: affair.order_date,
      planned_delivery_date: affair.planned_delivery_date,
      actual_delivery_date: null,
      status: affair.status,
    });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing(4) }}>
      {/* Header */}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={typography.title}>{affair.internal_ref}</Text>
            <Text style={typography.caption}>
              {affair.customers?.company_name} · {ORDER_TYPE_LABELS[affair.order_type]}
            </Text>
          </View>
          <StatusBadge status={affair.status} overdue={overdue} />
        </View>
        {affair.description ? <Text style={styles.line}>{affair.description}</Text> : null}
        <Text style={styles.line}>Commande : {formatDate(affair.order_date)} · Livraison planifiée : {formatDate(affair.planned_delivery_date)}</Text>
        {affair.odoo_quote_ref ? <Text style={styles.line}>Devis Odoo : {affair.odoo_quote_ref}</Text> : null}
        <Text style={styles.line}>Responsable : {affair.profiles?.full_name ?? '—'}</Text>

        {/* Status progression */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing(3) }}>
          {AFFAIR_STATUSES.map((status) => (
            <Button
              key={status}
              title={AFFAIR_STATUS_LABELS[status]}
              variant={affair.status === status ? 'primary' : 'secondary'}
              onPress={() => updateAffair.mutate({ id: affair.id, patch: { status } })}
            />
          ))}
        </ScrollView>
      </Card>

      {/* Financial synthesis (from v_affair_financials — recognized revenue counted once) */}
      {financial && (
        <Card>
          <SectionTitle title="Synthèse financière" />
          <FinRow label="Commandes (HT)" value={formatMAD(financial.order_value_excluding_tax)} />
          <FinRow label="CA facturé (HT)" value={formatMAD(financial.invoiced_revenue_excluding_tax)} />
          <FinRow label="Encaissé" value={formatMAD(financial.collected_revenue)} />
          <FinRow label="Reste à encaisser" value={formatMAD(financial.outstanding_receivables)} />
          <FinRow label="Coûts variables" value={formatMAD(financial.variable_costs)} />
          <FinRow label="Charges fixes allouées" value={formatMAD(financial.allocated_fixed_costs)} />
          <FinRow label="Coût total" value={formatMAD(financial.total_cost)} />
          <FinRow label="Marge brute" value={formatMAD(financial.gross_margin)} highlight={financial.gross_margin >= 0} />
          <FinRow label="Marge %" value={financial.margin_percent !== null ? `${financial.margin_percent} %` : '—'} />
        </Card>
      )}

      {/* Purchase orders */}
      <SectionTitle title={`Bons de commande — ${formatMAD(poTotal)} HT`} />
      {affair.purchase_orders.length > 0 && (
        <Card>
          {affair.purchase_orders.map((po) => (
            <FinRow key={po.id} label={`${po.po_number}`} value={`${formatMAD(po.amount_excluding_tax)} HT · TVA ${po.vat_rate} %`} />
          ))}
        </Card>
      )}
      <Card>
        <Text style={typography.caption}>Ajouter un bon de commande (plusieurs BC possibles par affaire)</Text>
        <View style={{ flexDirection: 'row', gap: spacing(2), marginTop: spacing(2) }}>
          <TextInput
            style={styles.poInput}
            placeholder="N° BC client"
            placeholderTextColor={colors.textMuted}
            value={poForm.po_number}
            onChangeText={(v) => setPoForm((p) => ({ ...p, po_number: v }))}
          />
          <TextInput
            style={styles.poInput}
            placeholder="Montant HT"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            value={poForm.amount_excluding_tax}
            onChangeText={(v) => setPoForm((p) => ({ ...p, amount_excluding_tax: v }))}
          />
          <TextInput
            style={[styles.poInput, { width: 60 }]}
            placeholder="TVA"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            value={poForm.vat_rate}
            onChangeText={(v) => setPoForm((p) => ({ ...p, vat_rate: v }))}
          />
        </View>
        <Button
          title={addPo.isPending ? 'Ajout…' : 'Ajouter le BC'}
          variant="secondary"
          onPress={submitPo}
          disabled={addPo.isPending}
        />
      </Card>

      {/* Tasks */}
      <SectionTitle title="Suivi & tâches" />
      {affair.tasks.length === 0 ? (
        <EmptyState title="Aucune tâche" />
      ) : (
        affair.tasks.map((task) => (
          <Card key={task.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={typography.body}>{task.title}</Text>
              <StatusBadge status={task.status as AffairStatus} />
            </View>
            <Text style={typography.caption}>Échéance : {formatDate(task.planned_date)}</Text>
          </Card>
        ))
      )}
      <Button title="+ Nouvelle tâche" variant="secondary" onPress={() => router.push({ pathname: '/tasks/new', params: { affairId: affair.id } })} />

      {/* Closure checklist */}
      <SectionTitle title="Check-list de clôture" />
      <Card>
        {CLOSURE_CHECKLIST.map((item) => (
          <View key={item.key} style={styles.checkRow}>
            <Text style={{ color: item.done(closureFacts) ? colors.success : colors.textMuted }}>
              {item.done(closureFacts) ? '✓' : '○'} {item.label}
            </Text>
          </View>
        ))}
        {affair.status !== 'closed' && affair.status !== 'cancelled' && (
          <Button title="Clôturer l’affaire" onPress={() => setConfirmClose(true)} />
        )}
      </Card>

      {/* Documents */}
      <SectionTitle title="Documents" />
      <AttachmentUploader documentType="purchase_order" links={{ affair_id: affair.id }} />

      <ConfirmDialog
        visible={confirmClose}
        title="Clôturer l’affaire ?"
        message="La clôture est distincte de la livraison, de la facturation et du règlement. Vérifiez la check-list avant de continuer."
        confirmLabel="Clôturer"
        onConfirm={() => {
          setConfirmClose(false);
          updateAffair.mutate(
            { id: affair.id, patch: { status: 'closed' } },
            { onSuccess: () => toast.show('Affaire clôturée', 'success'), onError: (e) => toast.show(mutationErrorMessage(e), 'error') },
          );
        }}
        onCancel={() => setConfirmClose(false)}
      />
      <View style={{ height: spacing(8) }} />
    </ScrollView>
  );
}

function FinRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.finRow}>
      <Text style={styles.finLabel}>{label}</Text>
      <Text style={[styles.finValue, highlight === true && { color: colors.success }, highlight === false && { color: colors.danger }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { ...typography.body, color: colors.textSecondary, marginTop: spacing(1) },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing(1.5) },
  finLabel: { ...typography.body, color: colors.textSecondary },
  finValue: { ...typography.body, fontWeight: '700', color: colors.text },
  checkRow: { paddingVertical: spacing(1) },
  poInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(2),
    fontSize: 14,
    color: colors.text,
  },
});
