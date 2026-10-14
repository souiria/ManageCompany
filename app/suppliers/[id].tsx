import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Card, SectionTitle, Loading } from '@/components/ui';
import { EmptyState, ErrorState } from '@/components/feedback';
import { MoneyText } from '@/components/business';
import { getSupplier } from '@/api/suppliers';
import { useQuery } from '@tanstack/react-query';
import { formatDate, formatMAD } from '@/lib/format';
import { colors, spacing, typography } from '@/constants/theme';

export default function SupplierDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery({ queryKey: ['supplier', id], queryFn: () => getSupplier(id!), enabled: !!id });

  if (query.isLoading) return <Loading />;
  if (query.isError || !query.data) return <ErrorState message="Fournisseur introuvable." onRetry={() => query.refetch()} />;

  const supplier = query.data;
  const totalExpenses = supplier.expenses.reduce((sum, e) => sum + Number(e.amount_including_tax), 0);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing(4) }}>
      <Card>
        <Text style={typography.title}>{supplier.company_name}</Text>
        <Text style={typography.caption}>
          {[supplier.specialty, supplier.ice ? `ICE ${supplier.ice}` : null].filter(Boolean).join(' · ')}
        </Text>
        <Text style={styles.line}>{[supplier.contact_person, supplier.phone, supplier.email].filter(Boolean).join(' · ')}</Text>
      </Card>

      <SectionTitle title={`Dépenses associées — total ${formatMAD(totalExpenses)}`} />
      {supplier.expenses.length === 0 ? (
        <EmptyState title="Aucune dépense" />
      ) : (
        supplier.expenses.map((expense) => (
          <Card key={expense.id}>
            <Text style={typography.body}>{expense.description}</Text>
            <Text style={typography.caption}>
              {formatDate(expense.expense_date)} · {expense.affairs?.internal_ref ?? 'Sans affaire'}
            </Text>
            <MoneyText amount={expense.amount_including_tax} />
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  line: { ...typography.body, color: colors.textSecondary, marginTop: spacing(1) },
});
