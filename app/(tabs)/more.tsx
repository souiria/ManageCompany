import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, Card, SectionTitle } from '@/components/ui';
import { ListRow } from '@/components/business';
import { useAuth } from '@/hooks/use-auth';
import { colors, spacing, typography } from '@/constants/theme';

export default function MoreScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing(4) }}>
      <Card>
        <Text style={typography.section}>{profile?.full_name || 'Utilisateur'}</Text>
        <Text style={typography.caption}>{profile?.role ?? ''}</Text>
      </Card>

      <SectionTitle title="Gestion" />
      <ListRow title="Clients" onPress={() => router.push('/customers')} />
      <ListRow title="Fournisseurs" onPress={() => router.push('/suppliers')} />
      <ListRow title="Charges fixes" onPress={() => router.push('/fixed-costs')} />
      <ListRow title="Factures & paiements" onPress={() => router.push('/invoices')} />
      <ListRow title="Documents" onPress={() => router.push('/documents')} />

      <View style={{ height: spacing(4) }} />
      <SectionTitle title="Analyse" />
      <ListRow title="Rapports & export CSV" onPress={() => router.push('/reports')} />

      <View style={{ height: spacing(4) }} />
      <SectionTitle title="Application" />
      <ListRow title="Paramètres" onPress={() => router.push('/settings')} />
      <ListRow title="Se déconnecter" onPress={() => void signOut()} />
    </ScrollView>
  );
}
