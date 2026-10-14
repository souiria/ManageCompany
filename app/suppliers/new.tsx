import React from 'react';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui';
import { FormField } from '@/components/form';
import { useToast } from '@/components/feedback';
import { useCreateSupplier, mutationErrorMessage } from '@/hooks/queries';
import { supplierSchema, type SupplierInput } from '@/validation/schemas';

export default function NewSupplierScreen() {
  const router = useRouter();
  const toast = useToast();
  const create = useCreateSupplier();

  const { control, handleSubmit } = useForm<SupplierInput>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { company_name: '', ice: '', specialty: '', contact_person: '', phone: '', email: '', address: '', notes: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const supplier = await create.mutateAsync({
        company_name: values.company_name,
        ice: values.ice || null,
        specialty: values.specialty || null,
        contact_person: values.contact_person || null,
        phone: values.phone || null,
        email: values.email || null,
        address: values.address || null,
        notes: values.notes || null,
        created_by: null,
      });
      toast.show('Fournisseur créé', 'success');
      router.replace(`/suppliers/${supplier.id}`);
    } catch (error) {
      toast.show(mutationErrorMessage(error), 'error');
    }
  });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F6F7F9' }} contentContainerStyle={{ padding: 16 }}>
      <FormField control={control} name="company_name" label="Raison sociale *" />
      <FormField control={control} name="ice" label="ICE (15 chiffres)" keyboardType="numeric" />
      <FormField control={control} name="specialty" label="Spécialité" />
      <FormField control={control} name="contact_person" label="Personne de contact" />
      <FormField control={control} name="phone" label="Téléphone" keyboardType="numeric" />
      <FormField control={control} name="email" label="E-mail" keyboardType="email-address" autoCapitalize="none" />
      <FormField control={control} name="address" label="Adresse" />
      <FormField control={control} name="notes" label="Notes" multiline />
      <Button title="Enregistrer" onPress={onSubmit} loading={create.isPending} />
    </ScrollView>
  );
}
