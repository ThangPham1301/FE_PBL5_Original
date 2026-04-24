import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import useAppTheme from '../theme/useAppTheme';

const STATUS_MAP = {
  pending: { label: 'Chờ duyệt', backgroundColor: '#fff4e5', borderColor: '#ffd7a8', textColor: '#b54708' },
  approved: { label: 'Đã duyệt', backgroundColor: '#ecfdf3', borderColor: '#abefc6', textColor: '#067647' },
  rejected: { label: 'Từ chối', backgroundColor: '#fef3f2', borderColor: '#fecdca', textColor: '#b42318' },
  on_time: { label: 'Đúng giờ', backgroundColor: '#ecfdf3', borderColor: '#abefc6', textColor: '#067647' },
  late: { label: 'Đi trễ', backgroundColor: '#fffaeb', borderColor: '#fedf89', textColor: '#b54708' },
  absent: { label: 'Vắng mặt', backgroundColor: '#fef3f2', borderColor: '#fecdca', textColor: '#b42318' },
};

export default function StatusBadge({ status, label }) {
  const { isDark } = useAppTheme();
  const key = String(status || '').toLowerCase();
  const style = STATUS_MAP[key] || {
    label: label || status || 'Không xác định',
    backgroundColor: '#f2f4f7',
    borderColor: '#d0d5dd',
    textColor: '#344054',
  };

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: isDark ? `${style.backgroundColor}33` : style.backgroundColor,
          borderColor: isDark ? `${style.borderColor}66` : style.borderColor,
        },
      ]}
    >
      <Text style={[styles.text, { color: style.textColor }]}>{label || style.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});
