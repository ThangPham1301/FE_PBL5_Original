import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import useAppTheme from '../theme/useAppTheme';
import AnimatedCard from '../components/AnimatedCard';

export default function WorkRulesScreen() {
  const { colors, radius } = useAppTheme();
  const rules = [
    'Check-in dung gio theo ca da gan.',
    'Di tre qua nguong se tinh trang thai late.',
    'Nghỉ phép can tao don va cho duyet.',
    'Check-out cuoi ngay de hoan tat cong.',
  ];

  return (
    <ScreenContainer>
      <AnimatedCard style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>Quy định làm việc</Text>
            <Text style={[styles.caption, { color: colors.textMuted }]}>Tất cả thành viên cần tuân thủ để dữ liệu chấm công chính xác.</Text>
          </View>
        </View>

        {rules.map((item, index) => (
          <AnimatedCard key={item} style={[styles.ruleRow, { backgroundColor: colors.bgSoft, borderColor: colors.border }]} delay={40 + index * 20} duration={240} fromY={6}>
            <Text style={[styles.ruleIndex, { color: colors.primary }]}>{index + 1}</Text>
            <Text style={[styles.item, { color: colors.text }]}>{item}</Text>
          </AnimatedCard>
        ))}
      </AnimatedCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 2,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  caption: {
    fontSize: 12,
    lineHeight: 17,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 8,
  },
  ruleIndex: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 1,
  },
  item: {
    flex: 1,
    lineHeight: 19,
    fontSize: 13,
  },
});
