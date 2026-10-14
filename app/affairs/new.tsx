import React from 'react';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui';
import { DatePickerField, FormField, SelectorField } from '@/components/form';
import { useToast } from '@/components/feedback';
import { useCreateAffair, useCustomers, mutationErrorMessage } from '@/hooks/queries';
import { affairSchema, type AffairInput } from '@/validation/schemas';
import { toISODate } from '@/lib/format';
import { ORDER_TYPE_LABELS, ORDER_TYPES, type OrderType } from '@/constants/statuses';

export default function NewAffairScreen() {
  const router = useRouter();
  const toast = useToast();
  const create = useCreateAffair();
  const customers = useCustomers();

  const { control, handleSubmit } = useForm<AffairInput>({
    resolver: zodResolver(affairSchema),
    defaultValues: {
      customer_id: '', description: '', order_type: 'purchase_order',
      buyer: '', requester: '', customer_contact_info: '',
      order_date: '', planned_delivery_date: '', actual_delivery_date: '',
      responsible_id: '', odoo_quote_ref: '', notes: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const affair = await create.mutateAsync({
        customer_id: values.customer_id,
        description: values.description || null,
        order_type: values.order_type as OrderType,
        buyer: values.buyer || null,
        requester: values.requester || null,
        customer_contact_info: values.customer_contact_info || null,
        order_date: toISODate(values.order_date ?? ''),
        planned_delivery_date: toISODate(values.planned_delivery_date ?? ''),
        actual_delivery_date: toISODate(values.actual_delivery_date ?? ''),
        responsible_id: values.responsible_id || null,
        odoo_quote_ref: values.odoo_quote_ref || null,
        notes: values.notes || null,
        created_by: null,
      });
      toast.show(`Affaire ${affair.internal_ref} créée`, 'success');
      router.replace(`/affairs/${affair.id}`);
    } catch (error) {
      toast.show(mutationErrorMessage(error), 'error');
    }
  });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F6F7F9' }} contentContainerStyle={{ padding: 16 }}>
      <SelectorField
        control={control}
        name="customer_id"
        label="Client *"
        placeholder="Choisir un client"
        options={(customers.data?.customers ?? []).map((c) => ({ value: c.id, label: c.company_name }))}
      />
      <SelectorField
        control={control}
        name="order_type"
        label="Type de commande"
        options={ORDER_TYPES.map((t) => ({ value: t, label: ORDER_TYPE_LABELS[t] }))}
      />
      <FormField control={control} name="description" label="Description des travaux" multiline />
      <FormField control={control} name="buyer" label="Acheteur" />
      <FormField control={control} name="requester" label="Demandeur" />
      <FormField control={control} name="customer_contact_info" label="Contact client" />
      <FormField control={control} name="odoo_quote_ref" label="Réf. devis Odoo" />
      <DatePickerField control={control} name="order_date" label="Date de commande" />
      <DatePickerField control={control} name="planned_delivery_date" label="Livraison planifiée" />
      <FormField control={control} name="notes" label="Notes" multiline />
      <Button title="Créer l’affaire" onPress={onSubmit} loading={create.isPending} />
    </ScrollView>
  );
}
