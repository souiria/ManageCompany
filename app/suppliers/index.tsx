import React, { useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, Button, Loading } from '@/components/ui';
import { EmptyState, ErrorState } from '@/components/feedback';
import { ListRow, SearchBar } from '@/components/business';
import { useSuppliers } from '@/hooks/queries';

export default function SuppliersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const query = useSuppliers(search || undefined);

  return (
    <ScreenContainer>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Raison sociale…" />
      {query.isLoading ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState message="Échec du chargement des fournisseurs." onRetry={() => query.refetch()} />
      ) : (
        <FlatList
          data={query.data?.suppliers ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
          ListEmptyComponent={<EmptyState title="Aucun fournisseur" subtitle="Ajoutez votre premier fournisseur." />}
          renderItem={({ item }) => (
            <ListRow
              title={item.company_name}
              subtitle={[item.specialty, item.contact_person].filter(Boolean).join(' · ')}
              onPress={() => router.push(`/suppliers/${item.id}`)}
            />
          )}
        />
      )}
      <Button title="+ Nouveau fournisseur" onPress={() => router.push('/suppliers/new')} />
    </ScreenContainer>
  );
}
