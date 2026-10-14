import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/use-auth';
import { Loading } from '@/components/ui';
import { colors } from '@/constants/theme';

function tabIcon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
}

export default function TabsLayout() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) router.replace('/(auth)/login');
  }, [loading, session]);

  if (loading || !session) return <Loading />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerShown: false,
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Tableau de bord', tabBarIcon: tabIcon('grid-outline') }} />
      <Tabs.Screen name="affairs" options={{ title: 'Affaires', tabBarIcon: tabIcon('briefcase-outline') }} />
      <Tabs.Screen name="expenses" options={{ title: 'Dépenses', tabBarIcon: tabIcon('receipt-outline') }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tâches', tabBarIcon: tabIcon('checkmark-circle-outline') }} />
      <Tabs.Screen name="more" options={{ title: 'Plus', tabBarIcon: tabIcon('menu-outline') }} />
    </Tabs>
  );
}
