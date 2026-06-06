import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import PrimaryButton from './PrimaryButton';
import useAppTheme from '../theme/useAppTheme';
import AnimatedCard from './AnimatedCard';

export default function FilterForm({ title, fields = [], values = {}, onChange, onApply, onReset }) {
  const { colors, radius } = useAppTheme();
  const [datePickerField, setDatePickerField] = useState(null);

  const activeDateField = useMemo(
    () => fields.find((field) => field.key === datePickerField) || null,
    [datePickerField, fields]
  );

  const formatDate = (dateValue) => {
    if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) {
      return '';
    }
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseDate = (rawValue) => {
    const value = String(rawValue || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date();
    }
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return new Date();
    }
    return parsed;
  };

  const onDateChange = (event, selectedDate) => {
    const shouldClose = Platform.OS === 'android' || event?.type === 'dismissed' || Boolean(selectedDate);
    if (event?.type !== 'dismissed' && selectedDate && datePickerField) {
      onChange(datePickerField, formatDate(selectedDate));
    }
    if (shouldClose) {
      setDatePickerField(null);
    }
  };

  return (
    <AnimatedCard style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]}>
      {title ? <Text style={[styles.title, { color: colors.text }]}>{title}</Text> : null}
      {fields.map((field) => {
        if (field.type === 'options') {
          return (
            <View key={field.key} style={styles.group}>
              <Text style={[styles.label, { color: colors.textMuted }]}>{field.label}</Text>
              <View style={styles.chips}>
                {field.options.map((option) => {
                  const active = values[field.key] === option.value;
                  return (
                    <Pressable
                      key={`${field.key}-${option.value}`}
                      style={[
                        styles.chip,
                        {
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? colors.primarySoft : colors.bgSoft,
                        },
                      ]}
                      onPress={() => onChange(field.key, option.value)}
                    >
                      <Text style={[styles.chipText, { color: active ? colors.primary : colors.textMuted }]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        }

        if (field.type === 'date') {
          const value = String(values[field.key] || '');
          return (
            <View key={field.key} style={styles.group}>
              <Pressable
                onPress={() => setDatePickerField(field.key)}
                style={[styles.input, styles.dateInput, { borderColor: colors.border, backgroundColor: colors.bgSoft }]}
              >
                <Text style={[styles.floatingLabel, { color: colors.textMuted, backgroundColor: colors.card }]}>{field.label}</Text>
                <Text style={[styles.dateText, { color: colors.text }]}>{value}</Text>
              </Pressable>
            </View>
          );
        }

        return (
          <View key={field.key} style={styles.group}>
            <View style={[styles.inputWrap, { backgroundColor: colors.bgSoft }]}> 
              <Text style={[styles.floatingLabel, { color: colors.textMuted, backgroundColor: colors.card }]}>{field.label}</Text>
              <TextInput
                value={String(values[field.key] || '')}
                onChangeText={(value) => onChange(field.key, value)}
                keyboardType={field.keyboardType || 'default'}
                style={[styles.input, styles.textInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bgSoft }]}
              />
            </View>
          </View>
        );
      })}

      <View style={styles.actions}>
        <PrimaryButton title="Áp dụng" onPress={onApply} />
        <PrimaryButton title="Xóa lọc" variant="secondary" onPress={onReset} />
      </View>

      {activeDateField ? (
        <DateTimePicker
          value={parseDate(values[activeDateField.key])}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      ) : null}
    </AnimatedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    borderWidth: 1,
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1b2430',
  },
  group: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputWrap: {
    borderRadius: 10,
  },
  textInput: {
    minHeight: 44,
    paddingTop: 14,
  },
  dateInput: {
    minHeight: 44,
    justifyContent: 'center',
    paddingTop: 14,
  },
  dateText: {
    fontSize: 14,
  },
  floatingLabel: {
    position: 'absolute',
    top: -8,
    left: 10,
    paddingHorizontal: 6,
    fontSize: 11,
    fontWeight: '700',
    zIndex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actions: {
    gap: 8,
    marginTop: 4,
  },
});
