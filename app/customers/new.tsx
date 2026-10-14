import React from 'react';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ScreenContainer, Button } from '@/components/ui';
import { FormField } from '@/components/form';
import { useToast } from '@/components/feedback';
import { useCreateCustomer } from '@/hooks/queries';
import { mutationErrorMessage } from '@/hooks/queries';
import { customerSchema, type CustomerInput } from '@/validation/schemas';

export default function NewCustomerScreen() {
  const router = useRouter();
  const toast = useToast();
  const create = useCreateCustomer();

  const { control, handleSubmit } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: { company_name: '', ice: '', customer_type: 'private', address: '', phone: '', email: '', notes: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const customer = await create.mutateAsync({
        company_name: values.company_name,
        ice: values.ice || null,
        customer_type: values.customer_type,
        address: values.address || null,
        phones: values.phone ? [values.phone] : [],
        emails: values.email ? [values.email] : [],
        notes: values.notes || null,
        created_by: null,
      });
      toast.show('Client créé', 'success');
      router.replace(`/customers/${customer.id}`);
    } catch (error) {
      toast.show(mutationErrorMessage(error), 'error');
    }
  });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F6F7F9' }} contentContainerStyle={{ padding: 16 }}>
      <FormField control={control} name="company_name" label="Raison sociale *" />
      <FormField control={control} name="ice" label="ICE (15 chiffres)" keyboardType="numeric" />
      <FormField control={control} name="address" label="Adresse" />
      <FormField control={control} name="phone" label="Téléphone" keyboardType="numeric" />
      <FormField control={control} name="email" label="E-mail" keyboardType="email-address" autoCapitalize="none" />
      <FormField control={control} name="notes" label="Notes" multiline />
      <Button title="Enregistrer" onPress={onSubmit} loading={create.isPending} />
    </ScrollView>
  );
}
