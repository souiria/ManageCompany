import React, { useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer, Button, Loading } from '@/components/ui';
import { EmptyState, ErrorState } from '@/components/feedback';
import { ListRow, MoneyText, SearchBar, StatusBadge } from '@/components/business';
import { useExpenses } from '@/hooks/queries';
import { formatDate, formatMAD } from '@/lib/format';

export default function ExpensesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ missingReceipts?: string }>();
  const [search, setSearch] = useState('');

  const query = useExpenses({
    search: search || undefined,
    approvalStatus: params.missingReceipts ? 'approved' : undefined,
  });

  const expenses = (query.data?.expenses ?? []).filter((e) => (params.missingReceipts ? !e.receipt_received : true));

  return (
    <ScreenContainer>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Description…" />
      {query.isLoading ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState message="Échec du chargement des dépenses." onRetry={() => query.refetch()} />
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
          ListEmptyComponent={<EmptyState title="Aucune dépense" subtitle="Enregistrez une nouvelle dépense." />}
          renderItem={({ item }) => (
            <ListRow
              title={item.description}
              subtitle={`${formatDate(item.expense_date)} · ${item.suppliers?.company_name ?? '—'} · ${item.affairs?.internal_ref ?? 'Sans affaire'}`}
              onPress={() => router.push(`/expenses/${item.id}`)}
              right={
                <>
                  <MoneyText amount={item.amount_including_tax} />
                  <StatusBadge status={item.approval_status} />
                </>
              }
            />
          )}
        />
      )}
      <Button title="+ Nouvelle dépense" onPress={() => router.push('/expenses/new')} />
    </ScreenContainer>
  );
}
