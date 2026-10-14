import React from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, Button, Loading } from '@/components/ui';
import { EmptyState, ErrorState } from '@/components/feedback';
import { ListRow, SearchBar } from '@/components/business';
import { useCustomers } from '@/hooks/queries';

export default function CustomersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const query = useCustomers({ search: search || undefined });

  return (
    <ScreenContainer>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Raison sociale…" />
      {query.isLoading ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState message="Échec du chargement des clients." onRetry={() => query.refetch()} />
      ) : (
        <FlatList
          data={query.data?.customers ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
          ListEmptyComponent={<EmptyState title="Aucun client" subtitle="Ajoutez votre premier client." />}
          renderItem={({ item }) => (
            <ListRow
              title={item.company_name}
              subtitle={[item.ice ? `ICE ${item.ice}` : null, item.customer_type === 'public' ? 'Public' : 'Privé'].filter(Boolean).join(' · ')}
              onPress={() => router.push(`/customers/${item.id}`)}
            />
          )}
        />
      )}
      <Button title="+ Nouveau client" onPress={() => router.push('/customers/new')} />
    </ScreenContainer>
  );
}
