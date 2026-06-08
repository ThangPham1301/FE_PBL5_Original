import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../../shared/components/ScreenContainer';
import { useAuth } from '../../../application/providers/AuthContext';
import useAppTheme from '../../../shared/theme/useAppTheme';
import AnimatedCard from '../../../shared/components/AnimatedCard';

function ActionRow({ label, icon, onPress, colors }) {
  return (
    <Pressable style={[styles.row, { borderColor: colors.border, backgroundColor: colors.bgSoft }]} onPress={onPress}>
      <View style={[styles.rowIcon, { backgroundColor: colors.primarySoft }]}> 
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

export default function ProfileScreen({ navigation }) {
  const { colors, radius } = useAppTheme();
  const { user } = useAuth();
  const role = String(user?.role || '').toLowerCase();
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isEmployee = role === 'employee';
  const roleLabel = {
    admin: 'Quản trị viên',
    manager: 'Quản lý',
    employee: 'Nhân viên',
  }[role] || 'Không xác định';

  const personalActions = [
    { label: 'Nghỉ phép', icon: 'document-text-outline', onPress: () => navigation.navigate('LeaveManagement') },
    { label: 'Lịch sử chấm công', icon: 'time-outline', onPress: () => navigation.navigate('AttendanceHistory') },
    { label: 'Ca làm của tôi', icon: 'calendar-outline', onPress: () => navigation.navigate('MyShifts') },
    { label: 'Chấm công vào / ra', icon: 'scan-outline', onPress: () => navigation.navigate('Attendance') },
    { label: 'Đăng ký khuôn mặt', icon: 'person-circle-outline', onPress: () => navigation.navigate('FaceRegistration') },
  ].filter(
    (item) =>
      !(isAdmin && (item.label === 'Ca làm của tôi' || item.label === 'Chấm công vào / ra' || item.label === 'Đăng ký khuôn mặt')) &&
      !((isEmployee || isManager) && item.label === 'Chấm công vào / ra')
  );

  const managementActions = [
    { label: 'Quản lý ca làm', icon: 'briefcase-outline', onPress: () => navigation.navigate('ShiftsManagement') },
    { label: 'Báo cáo tháng', icon: 'bar-chart-outline', onPress: () => navigation.navigate('Reports') },
  ];

  const adminActions = [
    { label: 'Quản lý nhân viên', icon: 'people-outline', onPress: () => navigation.navigate('AdminEmployees') },
    { label: 'Quản lý phòng ban', icon: 'git-network-outline', onPress: () => navigation.navigate('DepartmentManagement') },
  ];

  return (
    <ScreenContainer contentStyle={styles.contentStyle}>
      <AnimatedCard style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="person-outline" size={22} color={colors.primary} />
        </View>
        <Text style={[styles.name, { color: colors.text }]}>{user?.first_name || user?.username}</Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>{user?.email || 'Không có email'}</Text>
        <Text style={[styles.badge, { color: colors.primary }]}>Vai trò: {roleLabel}</Text>
      </AnimatedCard>

      <AnimatedCard style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]} delay={40}>
        <Text style={[styles.groupTitle, { color: colors.textMuted }]}>Tác vụ cá nhân</Text>
        <View style={styles.rowsWrap}>
          {personalActions.map((item) => (
            <ActionRow
              key={item.label}
              label={item.label}
              icon={item.icon}
              onPress={item.onPress}
              colors={colors}
            />
          ))}
        </View>
      </AnimatedCard>

      {(role === 'admin' || role === 'manager') && (
        <AnimatedCard style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]} delay={80}>
          <Text style={[styles.groupTitle, { color: colors.textMuted }]}>Quản lý</Text>
          <View style={styles.rowsWrap}>
            {managementActions.map((item) => (
              <ActionRow
                key={item.label}
                label={item.label}
                icon={item.icon}
                onPress={item.onPress}
                colors={colors}
              />
            ))}
          </View>
        </AnimatedCard>
      )}
      {role === 'admin' && (
        <AnimatedCard style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]} delay={120}>
          <Text style={[styles.groupTitle, { color: colors.textMuted }]}>Hệ thống</Text>
          <View style={styles.rowsWrap}>
            {adminActions.map((item) => (
              <ActionRow
                key={item.label}
                label={item.label}
                icon={item.icon}
                onPress={item.onPress}
                colors={colors}
              />
            ))}
          </View>
        </AnimatedCard>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contentStyle: {
    gap: 10,
  },
  profileCard: {
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 14,
    gap: 4,
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  meta: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  badge: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  actionCard: {
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    paddingHorizontal: 2,
  },
  rowsWrap: {
    gap: 8,
  },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
});
