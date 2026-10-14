import React from 'react';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui';
import { DatePickerField, FormField, SelectorField } from '@/components/form';
import { useToast } from '@/components/feedback';
import { useFixedCosts, mutationErrorMessage } from '@/hooks/queries';
import { fixedCostSchema, type FixedCostInput } from '@/validation/schemas';
import { toISODate } from '@/lib/format';
import { createFixedCost } from '@/api/fixed-costs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ALLOCATION_METHOD_LABELS, ALLOCATION_METHODS, FIXED_COST_FREQUENCY_LABELS, FIXED_COST_FREQUENCIES } from '@/constants/statuses';

export default function NewFixedCostScreen() {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: createFixedCost,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fixed-costs'] });
      toast.show('Charge fixe créée', 'success');
      router.back();
    },
    onError: (error) => toast.show(mutationErrorMessage(error), 'error'),
  });
  void useFixedCosts;

  const { control, handleSubmit } = useForm<FixedCostInput>({
    resolver: zodResolver(fixedCostSchema),
    defaultValues: {
      description: '', category: '', amount: 0, frequency: 'monthly',
      start_date: '', end_date: '', allocation_method: 'equal', notes: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    create.mutate({
      description: values.description,
      category: values.category || null,
      amount: Number(values.amount),
      currency: 'MAD',
      frequency: values.frequency,
      start_date: toISODate(values.start_date ?? ''),
      end_date: toISODate(values.end_date ?? ''),
      is_active: true,
      allocation_method: values.allocation_method,
      notes: values.notes || null,
      created_by: null,
    });
  });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F6F7F9' }} contentContainerStyle={{ padding: 16 }}>
      <FormField control={control} name="description" label="Description *" />
      <FormField control={control} name="category" label="Catégorie" />
      <FormField control={control} name="amount" label="Montant (DH) *" keyboardType="numeric" />
      <SelectorField
        control={control} name="frequency" label="Fréquence"
        options={FIXED_COST_FREQUENCIES.map((f) => ({ value: f, label: FIXED_COST_FREQUENCY_LABELS[f] }))}
      />
      <SelectorField
        control={control} name="allocation_method" label="Méthode d’allocation"
        options={ALLOCATION_METHODS.map((m) => ({ value: m, label: ALLOCATION_METHOD_LABELS[m] }))}
      />
      <DatePickerField control={control} name="start_date" label="Date de début" />
      <DatePickerField control={control} name="end_date" label="Date de fin" />
      <FormField control={control} name="notes" label="Notes" multiline />
      <Button title="Enregistrer" onPress={onSubmit} loading={create.isPending} />
    </ScrollView>
  );
}
