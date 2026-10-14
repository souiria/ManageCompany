import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Label } from '@/components/ui';
import { useToast } from '@/components/feedback';
import { useAuth } from '@/hooks/use-auth';
import { loginSchema, type LoginInput } from '@/validation/schemas';
import { toUserMessage } from '@/lib/errors';
import { colors, spacing, typography } from '@/constants/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const { control, handleSubmit } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setBusy(true);
    try {
      await signIn(values.email, values.password);
    } catch (error) {
      toast.show(toUserMessage(error), 'error');
    } finally {
      setBusy(false);
    }
  });

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <Text style={styles.logo}>LTM</Text>
        <Text style={styles.title}>Gestion d’entreprise</Text>

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <View>
              <Label text="E-mail" />
              <Input placeholder="vous@entreprise.ma" keyboardType="email-address" autoCapitalize="none"
                onChangeText={onChange} onBlur={onBlur} value={value} />
              {error && <Text style={styles.error}>{error.message}</Text>}
            </View>
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <View>
              <Label text="Mot de passe" />
              <Input placeholder="••••••••" secureTextEntry onChangeText={onChange} onBlur={onBlur} value={value} />
              {error && <Text style={styles.error}>{error.message}</Text>}
            </View>
          )}
        />

        <Button title="Se connecter" onPress={onSubmit} loading={busy} />

        <Link href="/(auth)/reset-password" asChild>
          <Pressable style={styles.forgot}>
            <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
          </Pressable>
        </Link>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, justifyContent: 'center', padding: spacing(6) },
  logo: { fontSize: 40, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  title: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing(8) },
  error: { color: colors.danger, fontSize: 12, marginTop: 2 },
  forgot: { alignItems: 'center', marginTop: spacing(4) },
  forgotText: { color: colors.primary, fontSize: 14 },
});
