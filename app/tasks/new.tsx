import React from 'react';
import { ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui';
import { DatePickerField, FormField, SelectorField } from '@/components/form';
import { useToast } from '@/components/feedback';
import { useAffairs, useCreateTask, useTasks, mutationErrorMessage } from '@/hooks/queries';
import { taskSchema, type TaskInput } from '@/validation/schemas';
import { toISODate } from '@/lib/format';
import { TASK_PRIORITY_LABELS, TASK_PRIORITIES } from '@/constants/statuses';

export default function NewTaskScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ affairId?: string; editId?: string }>();
  const toast = useToast();
  const create = useCreateTask();
  const affairs = useAffairs();
  const editing = useTasks({ search: undefined });

  const { control, handleSubmit } = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '', description: '', affair_id: params.affairId ?? '', assigned_to: '',
      planned_date: '', priority: 'medium', notes: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const task = await create.mutateAsync({
        title: values.title,
        description: values.description || null,
        affair_id: values.affair_id || null,
        assigned_to: values.assigned_to || null,
        planned_date: toISODate(values.planned_date ?? ''),
        status: 'planned',
        priority: values.priority,
        notes: values.notes || null,
        created_by: null,
      });
      toast.show('Tâche créée', 'success');
      router.replace({ pathname: '/(tabs)/tasks', params: { highlight: task.id } });
    } catch (error) {
      toast.show(mutationErrorMessage(error), 'error');
    }
  });

  void editing;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F6F7F9' }} contentContainerStyle={{ padding: 16 }}>
      <FormField control={control} name="title" label="Titre *" />
      <FormField control={control} name="description" label="Description" multiline />
      <SelectorField
        control={control} name="affair_id" label="Affaire"
        options={(affairs.data?.affairs ?? []).map((a) => ({ value: a.id, label: a.internal_ref }))}
      />
      <SelectorField
        control={control} name="priority" label="Priorité"
        options={TASK_PRIORITIES.map((p) => ({ value: p, label: TASK_PRIORITY_LABELS[p] }))}
      />
      <DatePickerField control={control} name="planned_date" label="Date planifiée" />
      <FormField control={control} name="notes" label="Notes" multiline />
      <Button title="Créer la tâche" onPress={onSubmit} loading={create.isPending} />
    </ScrollView>
  );
}
