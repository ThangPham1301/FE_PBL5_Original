import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import useAppTheme from '../theme/useAppTheme';

export default function ScreenContainer({ children, scroll = true, contentStyle, showHeader = true, showFooter = true }) {
  const { colors, spacing } = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { isAuthenticated, user, logout } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(1)).current;

  const windowWidth = Dimensions.get('window').width;
  const panelWidth = Math.max(280, Math.floor(windowWidth * 0.5));

  const role = String(user?.role || '').toLowerCase();
  const shouldShowFooter = showFooter && isAuthenticated;
  const initials = String(user?.first_name || user?.username || 'U').charAt(0).toUpperCase();

  const routeTitleMap = {
    Profile: 'Tài khoản',
    Leaves: 'Nghỉ phép',
    LeaveManagement: 'Nghỉ phép',
    AttendanceHistory: 'Lịch sử chấm công',
    Attendance: 'Điểm danh',
    MyShifts: 'Ca làm của tôi',
    FaceRegistration: 'Đăng ký khuôn mặt',
    AdminEmployees: 'Quản lý nhân viên',
    DepartmentManagement: 'Quản lý phòng ban',
    ShiftsManagement: 'Quản lý ca làm',
    Reports: 'Báo cáo',
    OvertimeRequest: 'Đơn tăng ca',
    WorkRules: 'Quy định làm việc',
    SmartOfficeControl: 'Smart Office Control',
    Home: 'Trang chủ',
    Login: 'Đăng nhập',
  };

  const sectionTitle = routeTitleMap[route.name] || 'PBL5 Mobile';

  const openMenu = () => {
    setMenuVisible(true);
    slideAnim.setValue(1);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setMenuVisible(false);
      }
    });
  };

  const handleMenuAction = (action) => {
    closeMenu();
    setTimeout(() => {
      action();
    }, 120);
  };

  useEffect(() => {
    setMenuVisible(false);
  }, [route.name]);

  const quickActions = useMemo(() => {
    if (!isAuthenticated) {
      return [];
    }

    const common = [
      {
        key: 'profile',
        label: 'Tài khoản',
        icon: 'person-outline',
        active: ['Profile'],
        onPress: () => navigation.navigate('MainTabs', { screen: 'Profile' }),
      },
      {
        key: 'leaves',
        label: 'Nghỉ phép',
        icon: 'document-text-outline',
        active: ['Leaves', 'LeaveManagement'],
        onPress: () => navigation.navigate('LeaveManagement'),
      },
      {
        key: 'attendance',
        label: 'Chấm công',
        icon: 'time-outline',
        active: ['Attendance', 'AttendanceHistory'],
        onPress: () => navigation.navigate('AttendanceHistory'),
      },
    ];

    if (role === 'admin' || role === 'manager') {
      return [
        ...common,
        {
          key: 'reports',
          label: 'Báo cáo',
          icon: 'bar-chart-outline',
          active: ['Reports'],
          onPress: () => navigation.navigate('Reports'),
        },
      ];
    }

    return [
      ...common,
      {
        key: 'myshifts',
        label: 'Ca của tôi',
        icon: 'calendar-outline',
        active: ['MyShifts'],
        onPress: () => navigation.navigate('MyShifts'),
      },
    ];
  }, [isAuthenticated, navigation, role]);

  const content = (
    <View style={[styles.inner, !scroll && styles.innerFill, { padding: spacing.lg }, contentStyle]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      {showHeader ? (
        <View style={[styles.header, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <View style={styles.headerLeft}>
            {navigation.canGoBack() ? (
              <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={22} color={colors.text} />
              </Pressable>
            ) : (
              <View style={[styles.logoMark, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="layers-outline" size={16} color={colors.primary} />
              </View>
            )}
            <View>
              <Text style={[styles.brand, { color: colors.text }]}>PBL5 Mobile</Text>
              <Text style={[styles.section, { color: colors.textMuted }]}>{sectionTitle}</Text>
            </View>
          </View>

          {isAuthenticated ? (
            <Pressable
              style={[styles.avatar, { backgroundColor: colors.bgSoft, borderColor: colors.border }]}
              onPress={openMenu}
            >
              <Ionicons name="menu-outline" size={20} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.contentWrap}>
        {scroll ? (
          <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.sm }]}>{content}</ScrollView>
        ) : (
          content
        )}
      </View>

      {shouldShowFooter ? (
        <View style={[styles.footer, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          {quickActions.map((item) => {
            const active = item.active.includes(route.name);
            return (
              <Pressable key={item.key} onPress={item.onPress} style={styles.footerItem}>
                <Ionicons name={item.icon} size={18} color={active ? colors.primary : colors.textMuted} />
                <Text style={[styles.footerText, { color: active ? colors.primary : colors.textMuted }]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <Modal visible={menuVisible} transparent animationType="none" onRequestClose={closeMenu}>
        <View style={styles.menuRoot}>
          <Pressable style={styles.menuBackdrop} onPress={closeMenu} />
          <Animated.View
            style={[
              styles.menuPanel,
              {
                width: panelWidth,
                backgroundColor: colors.card,
                borderColor: colors.border,
                transform: [{ translateX: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, panelWidth] }) }],
              },
            ]}
          >
            <View style={[styles.menuHeader, { borderBottomColor: colors.border }]}> 
              <Text style={[styles.menuTitle, { color: colors.text }]}>Menu nhanh</Text>
              <Text style={[styles.menuSubtitle, { color: colors.textMuted }]}>Chức năng bổ sung</Text>
            </View>

            <View style={styles.menuList}>
              <Pressable
                style={[styles.menuItem, { borderColor: colors.border, backgroundColor: colors.bgSoft }]}
                onPress={() => handleMenuAction(() => navigation.navigate('SmartOfficeControl'))}
              >
                <Ionicons name="hardware-chip-outline" size={18} color={colors.primary} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>Smart Office Control</Text>
              </Pressable>

              <Pressable
                style={[styles.menuItem, { borderColor: colors.border, backgroundColor: colors.bgSoft }]}
                onPress={() => handleMenuAction(() => navigation.navigate('WorkRules'))}
              >
                <Ionicons name="book-outline" size={18} color={colors.primary} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>Quy định làm việc</Text>
              </Pressable>

              <Pressable
                style={[styles.menuItem, { borderColor: colors.border, backgroundColor: colors.bgSoft }]}
                onPress={() => handleMenuAction(() => navigation.navigate('OvertimeRequest'))}
              >
                <Ionicons name="timer-outline" size={18} color={colors.primary} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>Đơn tăng ca</Text>
              </Pressable>

              <Pressable
                style={[styles.menuItem, styles.menuDanger, { borderColor: '#f5b3b3', backgroundColor: '#fff1f1' }]}
                onPress={() => handleMenuAction(() => logout())}
              >
                <Ionicons name="log-out-outline" size={18} color="#d23c3c" />
                <Text style={[styles.menuItemText, { color: '#b02424' }]}>Đăng xuất</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {},
  contentWrap: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 14,
    fontWeight: '800',
  },
  section: {
    fontSize: 11,
    fontWeight: '600',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
  },
  menuRoot: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 12, 28, 0.32)',
  },
  menuPanel: {
    height: '100%',
    borderLeftWidth: 1,
    paddingTop: 20,
    paddingHorizontal: 14,
  },
  menuHeader: {
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  menuSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  menuList: {
    marginTop: 14,
    gap: 10,
  },
  menuItem: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '700',
  },
  menuDanger: {
    marginTop: 4,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    flex: 1,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inner: {
    gap: 12,
  },
  innerFill: {
    flex: 1,
  },
});
