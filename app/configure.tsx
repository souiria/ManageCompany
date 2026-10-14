import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { FormField } from '@/components/form';
import { useToast } from '@/components/feedback';
import { SupabaseConfig } from '@/config/supabase-config';
import { initSupabase } from '@/lib/supabase';
import { supabaseConfigSchema, type SupabaseConfigInput } from '@/validation/schemas';
import { colors, spacing, typography } from '@/constants/theme';

/**
 * Shown when no Supabase credentials are available at build time.
 * Credentials entered here are persisted on the device and can be changed
 * later from Settings → Configuration Supabase.
 */
export default function ConfigureScreen() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const { control, handleSubmit } = useForm<SupabaseConfigInput>({
    resolver: zodResolver(supabaseConfigSchema),
    defaultValues: { url: '', anonKey: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setBusy(true);
    try {
      await SupabaseConfig.getInstance().setCredentials(values);
      await initSupabase();
      toast.show('Configuration Supabase enregistrée', 'success');
      router.replace('/(auth)/login');
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Configuration invalide', 'error');
    } finally {
      setBusy(false);
    }
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Configuration Supabase</Text>
        <Text style={styles.subtitle}>
          Renseignez l’URL de votre projet et la clé publique (anon). Ces informations sont
          stockées localement sur cet appareil et peuvent être modifiées à tout moment dans
          Paramètres. Ne saisissez JAMAIS la clé service-role.
        </Text>
        <FormField control={control} name="url" label="URL du projet" placeholder="https://xxxx.supabase.co" autoCapitalize="none" />
        <FormField control={control} name="anonKey" label="Clé publique (anon)" placeholder="eyJhbGciOi…" autoCapitalize="none" />
        <Button title="Enregistrer" onPress={onSubmit} loading={busy} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing(6) },
  title: { ...typography.title, color: colors.text, marginBottom: spacing(3) },
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing(5), lineHeight: 21 },
});
