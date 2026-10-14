import React, { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer, Button, Loading } from '@/components/ui';
import { EmptyState, ErrorState } from '@/components/feedback';
import { ListRow, MoneyText, SearchBar, StatusBadge } from '@/components/business';
import { useAffairs } from '@/hooks/queries';
import { isAffairOverdue, AFFAIR_STATUS_LABELS, AFFAIR_STATUSES, type AffairStatus } from '@/constants/statuses';
import { colors, spacing, typography } from '@/constants/theme';

export default function AffairsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ status?: string; customerId?: string }>();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>(params.status ?? '');

  const query = useAffairs({
    search: search || undefined,
    status: (status || undefined) as AffairStatus | 'overdue' | undefined,
    customerId: params.customerId,
  });

  return (
    <ScreenContainer>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Réf., description…" />
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[['', 'Toutes'], ['overdue', 'En retard'], ...AFFAIR_STATUSES.map((s) => [s, AFFAIR_STATUS_LABELS[s]] as [string, string])]}
        keyExtractor={([v]) => v}
        style={{ marginBottom: spacing(3), flexGrow: 0 }}
        renderItem={({ item: [value, label] }) => (
          <Pressable
            onPress={() => setStatus(value)}
            style={[styles.chip, status === value && styles.chipActive]}
          >
            <Text style={[styles.chipText, status === value && styles.chipTextActive]}>{label}</Text>
          </Pressable>
        )}
      />

      {query.isLoading ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState message="Échec du chargement des affaires." onRetry={() => query.refetch()} />
      ) : (
        <FlatList
          data={query.data?.affairs ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
          ListEmptyComponent={<EmptyState title="Aucune affaire" subtitle="Créez votre première affaire." />}
          renderItem={({ item }) => {
            const overdue = isAffairOverdue(item.status, item.planned_delivery_date);
            return (
              <ListRow
                title={`${item.internal_ref} — ${item.customers?.company_name ?? ''}`}
                subtitle={item.description ?? ''}
                onPress={() => router.push(`/affairs/${item.id}`)}
                right={<StatusBadge status={item.status} overdue={overdue} />}
              />
            );
          }}
        />
      )}

      <Button title="+ Nouvelle affaire" onPress={() => router.push('/affairs/new')} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    marginRight: spacing(2),
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '700' },
});
