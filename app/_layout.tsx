import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { initSupabase } from '@/lib/supabase';
import { SupabaseConfig } from '@/config/supabase-config';
import { ToastProvider } from '@/components/feedback';
import { colors } from '@/constants/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initSupabase().then((client) => {
      setConfigured(!!client);
      setReady(true);
    });
    // React to runtime credential changes (Settings screen).
    return SupabaseConfig.getInstance().onChange((c) => {
      setConfigured(!!c);
      if (!c) router.replace('/configure');
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    const first = segments[0];
    const onPublicScreen = first === '(auth)' || first === 'configure';
    if (!configured && !onPublicScreen) {
      router.replace('/configure');
    } else if (configured && (first === 'configure' || first === undefined)) {
      router.replace('/(auth)/login');
    }
  }, [ready, configured, segments]);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="configure" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="affairs/[id]" options={{ headerShown: true, title: 'Affaire' }} />
          <Stack.Screen name="affairs/new" options={{ headerShown: true, title: 'Nouvelle affaire' }} />
          <Stack.Screen name="customers/index" options={{ headerShown: true, title: 'Clients' }} />
          <Stack.Screen name="customers/[id]" options={{ headerShown: true, title: 'Client' }} />
          <Stack.Screen name="customers/new" options={{ headerShown: true, title: 'Nouveau client' }} />
          <Stack.Screen name="suppliers/index" options={{ headerShown: true, title: 'Fournisseurs' }} />
          <Stack.Screen name="suppliers/[id]" options={{ headerShown: true, title: 'Fournisseur' }} />
          <Stack.Screen name="suppliers/new" options={{ headerShown: true, title: 'Nouveau fournisseur' }} />
          <Stack.Screen name="expenses/[id]" options={{ headerShown: true, title: 'Dépense' }} />
          <Stack.Screen name="expenses/new" options={{ headerShown: true, title: 'Nouvelle dépense' }} />
          <Stack.Screen name="tasks/new" options={{ headerShown: true, title: 'Nouvelle tâche' }} />
          <Stack.Screen name="fixed-costs/index" options={{ headerShown: true, title: 'Charges fixes' }} />
          <Stack.Screen name="fixed-costs/new" options={{ headerShown: true, title: 'Nouvelle charge fixe' }} />
          <Stack.Screen name="invoices/index" options={{ headerShown: true, title: 'Factures' }} />
          <Stack.Screen name="invoices/[id]" options={{ headerShown: true, title: 'Facture' }} />
          <Stack.Screen name="invoices/new" options={{ headerShown: true, title: 'Nouvelle facture' }} />
          <Stack.Screen name="reports" options={{ headerShown: true, title: 'Rapports' }} />
          <Stack.Screen name="documents" options={{ headerShown: true, title: 'Documents' }} />
          <Stack.Screen name="settings/index" options={{ headerShown: true, title: 'Paramètres' }} />
        </Stack>
      </ToastProvider>
    </QueryClientProvider>
  );
}
