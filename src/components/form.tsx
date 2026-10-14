import React, { useState } from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parse } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/constants/theme';
import { Input, Label } from '@/components/ui';

interface FormFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  secureTextEntry?: boolean;
  multiline?: boolean;
}

/** React Hook Form bound text input with inline validation message. */
export function FormField<T extends FieldValues>(props: FormFieldProps<T>) {
  const { control, name, label, ...inputProps } = props;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <View>
          <Label text={label} />
          <Input
            onChangeText={onChange}
            onBlur={onBlur}
            value={value === null || value === undefined ? '' : String(value)}
            {...inputProps}
          />
          {error && <Text style={styles.error}>{error.message}</Text>}
        </View>
      )}
    />
  );
}

interface DatePickerFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
}

/** DD/MM/YYYY date field rendered with the native picker. */
export function DatePickerField<T extends FieldValues>({ control, name, label }: DatePickerFieldProps<T>) {
  const [show, setShow] = useState(false);
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => {
        const display = value ? String(value) : '';
        return (
          <View>
            <Label text={label} />
            <Pressable style={styles.dateBox} onPress={() => setShow(true)}>
              <Text style={display ? styles.dateText : styles.datePlaceholder}>
                {display || 'JJ/MM/AAAA'}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            </Pressable>
            {error && <Text style={styles.error}>{error.message}</Text>}
            {show && (
              <DateTimePicker
                value={display ? parse(display, 'dd/MM/yyyy', new Date()) : new Date()}
                mode="date"
                display="default"
                onChange={(_e, selected) => {
                  setShow(false);
                  if (selected) onChange(format(selected, 'dd/MM/yyyy'));
                }}
              />
            )}
          </View>
        );
      }}
    />
  );
}

export interface SelectorOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SelectorFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  options: SelectorOption[];
  placeholder?: string;
}

/** Modal selector for customers, affairs, suppliers, users… */
export function SelectorField<T extends FieldValues>({ control, name, label, options, placeholder }: SelectorFieldProps<T>) {
  const [open, setOpen] = useState(false);
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => {
        const selected = options.find((o) => o.value === value);
        return (
          <View>
            <Label text={label} />
            <Pressable style={styles.dateBox} onPress={() => setOpen(true)}>
              <Text style={selected ? styles.dateText : styles.datePlaceholder}>
                {selected ? selected.label : placeholder ?? 'Sélectionner…'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </Pressable>
            {error && <Text style={styles.error}>{error.message}</Text>}
            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
              <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
                <View style={styles.modalSheet}>
                  <ScrollView keyboardShouldPersistTaps="handled">
                    {options.map((option) => (
                      <Pressable
                        key={option.value}
                        style={styles.modalItem}
                        onPress={() => {
                          onChange(option.value);
                          setOpen(false);
                        }}
                      >
                        <Text style={styles.modalItemText}>{option.label}</Text>
                        {option.sublabel && <Text style={styles.modalItemSub}>{option.sublabel}</Text>}
                      </Pressable>
                    ))}
                    {options.length === 0 && <Text style={styles.modalItemSub}>Aucun élément disponible</Text>}
                  </ScrollView>
                </View>
              </Pressable>
            </Modal>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, fontSize: 12, marginTop: 2 },
  dateBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(3),
  },
  dateText: { fontSize: 15, color: colors.text },
  datePlaceholder: { fontSize: 15, color: colors.textMuted },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
    padding: spacing(4),
  },
  modalItem: { paddingVertical: spacing(3), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  modalItemText: { fontSize: 15, color: colors.text },
  modalItemSub: { fontSize: 12, color: colors.textSecondary },
});
