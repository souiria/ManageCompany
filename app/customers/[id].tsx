import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer, Card, SectionTitle, Loading } from '@/components/ui';
import { EmptyState, ErrorState } from '@/components/feedback';
import { ListRow, StatusBadge } from '@/components/business';
import { useCustomer } from '@/hooks/queries';
import { formatMAD } from '@/lib/format';
import { AFFAIR_STATUS_LABELS, type AffairStatus } from '@/constants/statuses';
import { colors, spacing, typography } from '@/constants/theme';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const query = useCustomer(id!);

  if (query.isLoading) return <Loading />;
  if (query.isError || !query.data) {
    return <ErrorState message="Client introuvable." onRetry={() => query.refetch()} />;
  }

  const customer = query.data;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing(4) }}>
      <Card>
        <Text style={typography.title}>{customer.company_name}</Text>
        <Text style={typography.caption}>
          {customer.customer_type === 'public' ? 'Client public' : 'Client privé'}
          {customer.ice ? ` · ICE ${customer.ice}` : ''}
        </Text>
        {customer.address ? <Text style={styles.line}>{customer.address}</Text> : null}
        {customer.phones.map((p) => <Text key={p} style={styles.line}>{p}</Text>)}
        {customer.emails.map((e) => <Text key={e} style={styles.line}>{e}</Text>)}
        {customer.notes ? <Text style={styles.line}>{customer.notes}</Text> : null}
      </Card>

      <SectionTitle title="Contacts" />
      {customer.customer_contacts.length === 0 ? (
        <EmptyState title="Aucun contact" />
      ) : (
        customer.customer_contacts.map((contact) => (
          <Card key={contact.id}>
            <Text style={typography.section}>{contact.full_name}</Text>
            <Text style={typography.caption}>{[contact.position, contact.phone, contact.email].filter(Boolean).join(' · ')}</Text>
          </Card>
        ))
      )}

      <SectionTitle title="Affaires associées" />
      {customer.affairs.length === 0 ? (
        <EmptyState title="Aucune affaire" />
      ) : (
        customer.affairs.map((affair) => (
          <ListRow
            key={affair.id}
            title={affair.internal_ref}
            onPress={() => router.push(`/affairs/${affair.id}`)}
            right={<StatusBadge status={affair.status as AffairStatus} />}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  line: { ...typography.body, color: colors.textSecondary, marginTop: spacing(1) },
});
