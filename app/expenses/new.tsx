import React from 'react';
import { ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui';
import { DatePickerField, FormField, SelectorField } from '@/components/form';
import { useToast } from '@/components/feedback';
import {
  useAffairs, useCreateExpense, useExpenseCategories, useSuppliers, mutationErrorMessage,
} from '@/hooks/queries';
import { expenseSchema, type ExpenseFormInput } from '@/validation/schemas';
import { toISODate } from '@/lib/format';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '@/constants/statuses';

export default function NewExpenseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ affairId?: string }>();
  const toast = useToast();
  const create = useCreateExpense();
  const affairs = useAffairs();
  const suppliers = useSuppliers();
  const categories = useExpenseCategories();

  const { control, handleSubmit, watch } = useForm<ExpenseFormInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expense_date: '', affair_id: params.affairId ?? '', supplier_id: '', description: '',
      category_id: '', classification: 'variable', amount_excluding_tax: 0, vat_rate: 20,
      payment_method: '', receipt_ref: '', notes: '',
    },
  });
  const amount = watch('amount_excluding_tax');
  const vatRate = watch('vat_rate');

  const onSubmit = handleSubmit(async (values) => {
    try {
      const expense = await create.mutateAsync({
        expense_date: toISODate(values.expense_date)!,
        affair_id: values.affair_id || null,
        supplier_id: values.supplier_id || null,
        description: values.description,
        category_id: values.category_id || null,
        classification: values.classification,
        amount_excluding_tax: Number(values.amount_excluding_tax),
        vat_rate: Number(values.vat_rate),
        payment_method: values.payment_method || null,
        receipt_ref: values.receipt_ref || null,
        notes: values.notes || null,
      });
      toast.show('Dépense enregistrée (en attente d’approbation)', 'success');
      router.replace(`/expenses/${expense.id}`);
    } catch (error) {
      toast.show(mutationErrorMessage(error), 'error');
    }
  });

  const ttc = (Number(amount) || 0) * (1 + (Number(vatRate) || 0) / 100);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F6F7F9' }} contentContainerStyle={{ padding: 16 }}>
      <DatePickerField control={control} name="expense_date" label="Date de dépense *" />
      <FormField control={control} name="description" label="Description *" multiline />
      <SelectorField
        control={control} name="supplier_id" label="Fournisseur"
        options={(suppliers.data?.suppliers ?? []).map((s) => ({ value: s.id, label: s.company_name }))}
      />
      <SelectorField
        control={control} name="affair_id" label="Affaire"
        options={(affairs.data?.affairs ?? []).map((a) => ({ value: a.id, label: a.internal_ref }))}
      />
      <SelectorField
        control={control} name="category_id" label="Catégorie"
        options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
      />
      <SelectorField
        control={control} name="classification" label="Classification"
        options={[{ value: 'variable', label: 'Variable' }, { value: 'fixed', label: 'Fixe' }]}
      />
      <FormField control={control} name="amount_excluding_tax" label="Montant HT (DH) *" keyboardType="numeric" />
      <FormField control={control} name="vat_rate" label="Taux TVA (%)" keyboardType="numeric" />
      <SelectorField
        control={control} name="payment_method" label="Mode de paiement"
        options={PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }))}
      />
      <FormField control={control} name="receipt_ref" label="Réf. pièce / reçu" />
      <FormField control={control} name="notes" label="Notes" multiline />
      <Button title={`Enregistrer — TTC ${ttc.toFixed(2)} DH`} onPress={onSubmit} loading={create.isPending} />
    </ScrollView>
  );
}
