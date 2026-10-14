import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Card, SectionTitle, Button, Loading } from '@/components/ui';
import { ErrorState, useToast } from '@/components/feedback';
import { MoneyText, StatusBadge, AttachmentUploader } from '@/components/business';
import { useApproveExpense, useExpense, mutationErrorMessage } from '@/hooks/queries';
import { canApproveExpenses } from '@/lib/roles';
import { useAuth } from '@/hooks/use-auth';
import { addExpensePayment } from '@/api/expenses';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { computeOutstanding, derivePaymentStatus } from '@/lib/finance';
import { formatDate, formatMAD } from '@/lib/format';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/constants/statuses';
import { colors, spacing, typography } from '@/constants/theme';

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const query = useExpense(id!);
  const approve = useApproveExpense();
  const qc = useQueryClient();
  const { profile } = useAuth();

  const paidAmount = query.data?.expense_payments.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;

  const pay = useMutation({
    mutationFn: (input: { amount: number; payment_method: PaymentMethod }) =>
      addExpensePayment(id!, { payment_date: new Date().toISOString().slice(0, 10), ...input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense', id] });
      toast.show('Paiement enregistré', 'success');
    },
    onError: (error) => toast.show(mutationErrorMessage(error), 'error'),
  });

  if (query.isLoading) return <Loading />;
  if (query.isError || !query.data) return <ErrorState message="Dépense introuvable." onRetry={() => query.refetch()} />;

  const expense = query.data;
  const outstanding = computeOutstanding(expense.amount_including_tax, paidAmount);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing(4) }}>
      <Card>
        <Text style={typography.title}>{expense.description}</Text>
        <Text style={typography.caption}>
          {formatDate(expense.expense_date)} · {expense.suppliers?.company_name ?? 'Sans fournisseur'} · {expense.affairs?.internal_ref ?? 'Sans affaire'}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing(2), marginTop: spacing(2) }}>
          <StatusBadge status={expense.payment_status} />
          <StatusBadge status={expense.approval_status} />
        </View>
        <View style={{ marginTop: spacing(3) }}>
          <MoneyText amount={expense.amount_including_tax} />
          <Text style={typography.caption}>HT {formatMAD(expense.amount_excluding_tax)} · TVA {expense.vat_rate} %</Text>
        </View>
      </Card>

      {/* Approval workflow */}
      {expense.approval_status === 'pending' && canApproveExpenses(profile?.role) && (
        <Card>
          <SectionTitle title="Approbation" />
          <View style={{ flexDirection: 'row', gap: spacing(2) }}>
            <Button title="Approuver" onPress={() => approve.mutate({ id: expense.id, status: 'approved' })} loading={approve.isPending} />
            <Button title="Rejeter" variant="danger" onPress={() => approve.mutate({ id: expense.id, status: 'rejected' })} loading={approve.isPending} />
          </View>
        </Card>
      )}

      {/* Partial payments */}
      <SectionTitle title={`Paiements — reste ${formatMAD(outstanding)}`} />
      {expense.expense_payments.map((payment) => (
        <Card key={payment.id}>
          <Text style={typography.body}>{formatMAD(payment.amount)} — {PAYMENT_METHOD_LABELS[payment.payment_method as PaymentMethod]}</Text>
          <Text style={typography.caption}>{formatDate(payment.payment_date)}</Text>
        </Card>
      ))}
      {expense.payment_status !== 'paid' && (
        <Card>
          <Button
            title="Enregistrer un paiement partiel"
            variant="secondary"
            loading={pay.isPending}
            onPress={() => pay.mutate({ amount: outstanding, payment_method: 'bank_transfer' })}
          />
          <Text style={styles.hint}>Statut dérivé automatiquement : {derivePaymentStatus(expense.amount_including_tax, paidAmount)}</Text>
        </Card>
      )}

      {/* Receipt */}
      <SectionTitle title="Pièce justificative" />
      <Card>
        <Text style={typography.caption}>
          {expense.receipt_received ? 'Pièce reçue' : 'Pièce manquante'} {expense.receipt_ref ? `· Réf ${expense.receipt_ref}` : ''}
        </Text>
        <AttachmentUploader
          documentType="expense_receipt"
          links={{ expense_id: expense.id }}
          onUploaded={() => query.refetch()}
        />
      </Card>
      <View style={{ height: spacing(8) }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hint: { ...typography.caption, marginTop: spacing(2) },
});
