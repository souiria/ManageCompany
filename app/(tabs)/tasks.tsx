import React, { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer, Button, Loading } from '@/components/ui';
import { EmptyState, ErrorState } from '@/components/feedback';
import { ListRow, SearchBar, StatusBadge } from '@/components/business';
import { useTasks, useUpdateTask } from '@/hooks/queries';
import { isTaskOverdue, TASK_STATUS_LABELS, TASK_STATUSES, TASK_PRIORITY_LABELS, type TaskStatus } from '@/constants/statuses';
import { formatDate } from '@/lib/format';
import { colors, spacing } from '@/constants/theme';

export default function TasksScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ status?: string; affairId?: string }>();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>(params.status ?? '');
  const complete = useUpdateTask();

  const query = useTasks({
    search: search || undefined,
    status: (status || undefined) as TaskStatus | 'overdue' | undefined,
    affairId: params.affairId,
  });

  return (
    <ScreenContainer>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Titre de tâche…" />
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[['', 'Toutes'], ['overdue', 'En retard'], ...TASK_STATUSES.map((s) => [s, TASK_STATUS_LABELS[s]] as [string, string])]}
        keyExtractor={([v]) => v}
        style={{ marginBottom: spacing(3), flexGrow: 0 }}
        renderItem={({ item: [value, label] }) => (
          <Pressable onPress={() => setStatus(value)} style={[styles.chip, status === value && styles.chipActive]}>
            <Text style={[styles.chipText, status === value && styles.chipTextActive]}>{label}</Text>
          </Pressable>
        )}
      />

      {query.isLoading ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState message="Échec du chargement des tâches." onRetry={() => query.refetch()} />
      ) : (
        <FlatList
          data={query.data?.tasks ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
          ListEmptyComponent={<EmptyState title="Aucune tâche" subtitle="Planifiez une nouvelle tâche." />}
          renderItem={({ item }) => {
            const overdue = isTaskOverdue(item.status, item.planned_date);
            return (
              <ListRow
                title={item.title}
                subtitle={`${item.affairs?.internal_ref ?? '—'} · échéance ${formatDate(item.planned_date)} · ${TASK_PRIORITY_LABELS[item.priority]}`}
                onPress={() => router.push({ pathname: '/tasks/new', params: { editId: item.id } })}
                right={
                  <>
                    <StatusBadge status={item.status} overdue={overdue} />
                    {item.status !== 'done' && (
                      <Pressable
                        onPress={() => complete.mutate({ id: item.id, patch: { status: 'done', completed_at: new Date().toISOString() } })}
                        hitSlop={8}
                      >
                        <Text style={{ color: colors.success, fontWeight: '700' }}>Terminer</Text>
                      </Pressable>
                    )}
                  </>
                }
              />
            );
          }}
        />
      )}
      <Button title="+ Nouvelle tâche" onPress={() => router.push('/tasks/new')} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing(3), paddingVertical: spacing(1.5), marginRight: spacing(2) },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '700' },
});
