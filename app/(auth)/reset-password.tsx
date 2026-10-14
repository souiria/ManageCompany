import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Label } from '@/components/ui';
import { useToast } from '@/components/feedback';
import { useAuth } from '@/hooks/use-auth';
import { toUserMessage } from '@/lib/errors';
import { colors, spacing } from '@/constants/theme';

const schema = z.object({ email: z.string().trim().email('Adresse e-mail invalide') });
type FormValues = z.infer<typeof schema>;

export default function ResetPasswordScreen() {
  const { resetPassword } = useAuth();
  const toast = useToast();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const { control, handleSubmit } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async ({ email }) => {
    setBusy(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (error) {
      toast.show(toUserMessage(error), 'error');
    } finally {
      setBusy(false);
    }
  });

  return (
    <View style={styles.container}>
      <Label text="E-mail du compte" />
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <View>
            <Input placeholder="vous@entreprise.ma" keyboardType="email-address" autoCapitalize="none"
              onChangeText={onChange} onBlur={onBlur} value={value} />
            {error && <Text style={styles.error}>{error.message}</Text>}
          </View>
        )}
      />
      <Button title="Envoyer le lien de réinitialisation" onPress={onSubmit} loading={busy} />
      {sent && <Text style={styles.sent}>Si ce compte existe, un e-mail de réinitialisation a été envoyé.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing(6), justifyContent: 'center' },
  error: { color: colors.danger, fontSize: 12, marginTop: 2 },
  sent: { color: colors.success, marginTop: spacing(3), textAlign: 'center' },
});
