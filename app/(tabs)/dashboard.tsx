import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BarChart } from 'react-native-gifted-charts';
import { ScreenContainer, Card, SectionTitle, Loading } from '@/components/ui';
import { ErrorState } from '@/components/feedback';
import { MoneyText, StatusBadge } from '@/components/business';
import { useAffairFinancials, useDashboardKpis, useMonthlyChart } from '@/hooks/queries';
import { formatMAD } from '@/lib/format';
import { AFFAIR_STATUS_LABELS, type AffairStatus } from '@/constants/statuses';
import { colors, spacing, typography } from '@/constants/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const kpis = useDashboardKpis();
  const chart = useMonthlyChart();
  const financials = useAffairFinancials();

  if (kpis.isLoading) return <Loading />;
  if (kpis.isError || !kpis.data) {
    return <ErrorState message="Impossible de charger le tableau de bord." onRetry={() => kpis.refetch()} />;
  }

  const k = kpis.data;
  const barData = (chart.data ?? []).slice(-12).map((m) => ({
    label: m.month.slice(5),
    frontColor: colors.primary,
    value: Number(m.revenue ?? 0),
    spacing: 4,
    labelWidth: 28,
  }));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing(4) }}
      refreshControl={<RefreshControl refreshing={kpis.isRefetching} onRefresh={() => { kpis.refetch(); chart.refetch(); financials.refetch(); }} />}
    >
      {/* Affair KPIs — clickable → filtered lists */}
      <SectionTitle title="Affaires" />
      <View style={styles.kpiGrid}>
        <KpiCard label="Total" value={String(k.total_affairs)} onPress={() => router.push('/(tabs)/affairs')} />
        <KpiCard label="En cours" value={String(k.affairs_in_progress)} onPress={() => router.push({ pathname: '/(tabs)/affairs', params: { status: 'in_progress' } })} />
        <KpiCard label="Clôturées" value={String(k.affairs_closed)} onPress={() => router.push({ pathname: '/(tabs)/affairs', params: { status: 'closed' } })} />
        <KpiCard label="En retard" value={String(k.affairs_overdue)} highlight={k.affairs_overdue > 0} onPress={() => router.push({ pathname: '/(tabs)/affairs', params: { status: 'overdue' } })} />
      </View>

      {/* Financial KPIs — values come from DB views, never hardcoded */}
      <SectionTitle title="Finances" />
      <Card>
        <KpiLine label="CA commandes (HT)" value={formatMAD(k.po_revenue_excluding_tax)} />
        <KpiLine label="CA facturé (HT)" value={formatMAD(k.invoiced_revenue_excluding_tax)} />
        <KpiLine label="Encaissements" value={formatMAD(k.collected_payments)} />
        <KpiLine label="Reste à encaisser" value={formatMAD(k.outstanding_customers)} />
        <KpiLine label="Dépenses variables" value={formatMAD(k.variable_expenses)} />
        <KpiLine label="Charges fixes allouées" value={formatMAD(k.allocated_fixed_costs)} />
        <KpiLine label="Coût total" value={formatMAD(k.total_costs)} />
      </Card>

      {/* Alerts */}
      {(k.overdue_tasks > 0 || k.missing_expense_receipts > 0) && (
        <Card>
          <SectionTitle title="Alertes" />
          {k.overdue_tasks > 0 && (
            <KpiLine label="Tâches en retard" value={String(k.overdue_tasks)} danger onPress={() => router.push({ pathname: '/(tabs)/tasks', params: { status: 'overdue' } })} />
          )}
          {k.missing_expense_receipts > 0 && (
            <KpiLine label="Pièces manquantes" value={String(k.missing_expense_receipts)} danger onPress={() => router.push({ pathname: '/(tabs)/expenses', params: { missingReceipts: '1' } })} />
          )}
        </Card>
      )}

      {/* Monthly chart */}
      <SectionTitle title="CA mensuel (HT)" />
      <Card>
        {barData.length > 0 ? (
          <BarChart data={barData} barWidth={16} noOfSections={4} yAxisTextStyle={{ fontSize: 10, color: colors.textMuted }} xAxisLabelTextStyle={{ fontSize: 10, color: colors.textMuted }} />
        ) : (
          <Text style={styles.emptyChart}>Pas encore de données facturées.</Text>
        )}
      </Card>

      {/* Profitability by affair */}
      <SectionTitle title="Rentabilité par affaire" />
      {(financials.data ?? []).slice(0, 10).map((f) => (
        <Pressable key={f.affair_id} onPress={() => router.push(`/affairs/${f.affair_id}`)}>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.affairRef}>{f.internal_ref} · {f.customer_name}</Text>
                <StatusBadge status={f.status as AffairStatus} />
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <MoneyText amount={f.gross_margin} style={{ color: f.gross_margin >= 0 ? colors.success : colors.danger }} />
                <Text style={styles.marginPercent}>{f.margin_percent !== null ? `${f.margin_percent} %` : '—'}</Text>
              </View>
            </View>
          </Card>
        </Pressable>
      ))}
      <View style={{ height: spacing(8) }} />
    </ScrollView>
  );
}

function KpiCard({ label, value, highlight, onPress }: { label: string; value: string; highlight?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.kpiCard, highlight && { borderColor: colors.danger }]}>
      <Text style={[styles.kpiValue, highlight && { color: colors.danger }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </Pressable>
  );
}

function KpiLine({ label, value, danger, onPress }: { label: string; value: string; danger?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.kpiLine}>
      <Text style={styles.kpiLineLabel}>{label}</Text>
      <Text style={[styles.kpiLineValue, danger && { color: colors.danger }]}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), marginBottom: spacing(2) },
  kpiCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(3),
  },
  kpiValue: { ...typography.title, color: colors.primary },
  kpiLabel: { ...typography.caption, marginTop: 2 },
  kpiLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing(2) },
  kpiLineLabel: { ...typography.body, color: colors.textSecondary },
  kpiLineValue: { ...typography.body, fontWeight: '700', color: colors.text },
  emptyChart: { ...typography.caption, textAlign: 'center', paddingVertical: spacing(4) },
  affairRef: { ...typography.body, color: colors.text, marginBottom: spacing(1) },
  marginPercent: { ...typography.caption, marginTop: 2 },
});
