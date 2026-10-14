import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, Card, SectionTitle, Button, Loading } from '@/components/ui';
import { EmptyState, ErrorState } from '@/components/feedback';
import { MoneyText } from '@/components/business';
import { useAllocations, useFixedCosts } from '@/hooks/queries';
import { formatMAD } from '@/lib/format';
import { FIXED_COST_FREQUENCY_LABELS, ALLOCATION_METHOD_LABELS } from '@/constants/statuses';
import { colors, spacing, typography } from '@/constants/theme';

export default function FixedCostsScreen() {
  const router = useRouter();
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const [period] = useState(currentPeriod);
  const costs = useFixedCosts();
  const allocations = useAllocations(period);

  const allocatedTotal = (allocations.data ?? [])
    .filter((a) => a.period === period)
    .reduce((sum, a) => sum + Number(a.allocated_amount), 0);

  return (
    <ScreenContainer>
      <SectionTitle title={`Charges actives — ${(costs.data ?? []).length}`} right={
        <Button title="+ Nouvelle" variant="ghost" onPress={() => router.push('/fixed-costs/new')} />
      } />
      {costs.isLoading ? (
        <Loading />
      ) : costs.isError ? (
        <ErrorState message="Échec du chargement." onRetry={() => costs.refetch()} />
      ) : (
        <FlatList
          data={costs.data ?? []}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<EmptyState title="Aucune charge fixe" />}
          renderItem={({ item }) => (
            <Card>
              <Text style={typography.section}>{item.description}</Text>
              <Text style={typography.caption}>
                {FIXED_COST_FREQUENCY_LABELS[item.frequency]} · {ALLOCATION_METHOD_LABELS[item.allocation_method]}
              </Text>
              <MoneyText amount={item.amount} />
            </Card>
          )}
        />
      )}

      <SectionTitle title={`Allocations ${period} — ${formatMAD(allocatedTotal)}`} />
      {allocations.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={(allocations.data ?? []).filter((a) => a.period === period)}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<EmptyState title="Aucune allocation ce mois-ci" subtitle="Les allocations mensuelles alimentent la rentabilité des affaires." />}
          renderItem={({ item }) => (
            <View style={styles.allocRow}>
              <View style={{ flex: 1 }}>
                <Text style={typography.body}>{item.fixed_costs?.description}</Text>
                <Text style={typography.caption}>{item.affairs?.internal_ref} · {item.allocation_percent} %</Text>
              </View>
              <MoneyText amount={item.allocated_amount} />
            </View>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  allocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(3),
    marginBottom: spacing(2),
  },
});
