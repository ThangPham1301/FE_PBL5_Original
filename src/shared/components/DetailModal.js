import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import PrimaryButton from './PrimaryButton';
import useAppTheme from '../theme/useAppTheme';
import AnimatedCard from './AnimatedCard';

export default function DetailModal({ visible, title, details = [], onClose }) {
  const { colors } = useAppTheme();

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={(event) => event.stopPropagation()}>
          <AnimatedCard style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]} fromY={14}>
          <Text style={[styles.title, { color: colors.text }]}>{title || 'Chi tiết'}</Text>
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {details.map((item, index) => (
              <AnimatedCard
                key={`${item.label}-${index}`}
                style={[styles.row, { backgroundColor: colors.bgSoft, borderColor: colors.border }]}
                delay={40 + index * 20}
                duration={240}
                fromY={6}
              >
                <Text style={[styles.label, { color: colors.textMuted }]}>{item.label}</Text>
                <Text style={[styles.value, { color: colors.text }]}>{item.value || '--'}</Text>
              </AnimatedCard>
            ))}
          </ScrollView>
          <PrimaryButton title="Đóng" onPress={onClose} />
          </AnimatedCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: 16,
  },
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    maxHeight: '80%',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  body: {
    maxHeight: 360,
  },
  bodyContent: {
    gap: 10,
  },
  row: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  value: {
    fontSize: 14,
  },
});
