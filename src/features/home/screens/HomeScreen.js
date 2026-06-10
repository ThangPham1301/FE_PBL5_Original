import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, useColorScheme, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../../shared/components/ScreenContainer';
import PrimaryButton from '../../../shared/components/PrimaryButton';
import { useAuth } from '../../../application/providers/AuthContext';

export default function HomeScreen({ navigation }) {
  const { isAuthenticated, user } = useAuth();
  const role = String(user?.role || '').toLowerCase();
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isEmployee = role === 'employee';
  const canUseAttendanceScreen = !isEmployee && !isManager;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [openSection, setOpenSection] = useState('personal');

  const theme = useMemo(
    () =>
      isDark
        ? {
            screen: '#0E1116',
            surface: '#151B23',
            surfaceSoft: '#1B2430',
            border: '#273241',
            text: '#F4F7FB',
            textMuted: '#9EB0C5',
            accent: '#2BA6FF',
            accentSoft: '#183B59',
            iconBg: '#193247',
          }
        : {
            screen: '#F2F5FA',
            surface: '#FFFFFF',
            surfaceSoft: '#EEF4FF',
            border: '#D8E4F2',
            text: '#102033',
            textMuted: '#5B6D84',
            accent: '#0F70D1',
            accentSoft: '#DDEBFF',
            iconBg: '#E6F1FF',
          },
    [isDark]
  );

  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  const animatedStyle = {
    opacity: entrance,
    transform: [
      {
        translateY: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [16, 0],
        }),
      },
    ],
  };

  const toggleSection = (sectionKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenSection((current) => (current === sectionKey ? null : sectionKey));
  };

  const footerActionKeys = isAdmin || isManager
    ? new Set(['leaves', 'attendance_history', 'reports'])
    : new Set(['leaves', 'attendance_history', 'my_shifts']);

  const sections = [
    {
      key: 'personal',
      title: 'Tác vụ cá nhân',
      icon: 'person-outline',
      defaultOpen: true,
      items: [
        { key: 'leaves', label: 'Nghỉ phép', onPress: () => navigation.navigate('MainTabs', { screen: 'Leaves' }) },
        { key: 'attendance_history', label: 'Lịch sử chấm công', onPress: () => navigation.navigate('MainTabs', { screen: 'AttendanceHistory' }) },
        { key: 'my_shifts', label: 'Ca làm của tôi', onPress: () => navigation.navigate('MainTabs', { screen: 'MyShifts' }) },
        { key: 'attendance', label: 'Chấm công vào / ra', onPress: () => navigation.navigate('Attendance') },
        { key: 'face_registration', label: 'Đăng ký khuôn mặt', onPress: () => navigation.navigate('FaceRegistration') },
      ],
    },
    {
      key: 'management',
      title: 'Quản lý',
      icon: 'briefcase-outline',
      items: [
        { key: 'shift_management', label: 'Quản lý ca làm', onPress: () => navigation.navigate('ShiftsManagement') },
        { key: 'reports', label: 'Báo cáo tháng', onPress: () => navigation.navigate('Reports') },
        { key: 'employee_management', label: 'Quản lý nhân viên', onPress: () => navigation.navigate('AdminEmployees') },
        { key: 'department_management', label: 'Quản lý phòng ban', onPress: () => navigation.navigate('DepartmentManagement') },
      ],
    },
    {
      key: 'others',
      title: 'Khác',
      icon: 'layers-outline',
      items: [{ key: 'work_rules', label: 'Quy định làm việc', onPress: () => navigation.navigate('WorkRules') }],
    },
  ]
    .map((section) => {
      const filteredItems = section.items.filter((item) => {
        if (footerActionKeys.has(item.key)) {
          return false;
        }

        if (isAdmin && (item.key === 'attendance' || item.key === 'face_registration' || item.key === 'my_shifts')) {
          return false;
        }

        if (!canUseAttendanceScreen && item.key === 'attendance') {
          return false;
        }

        return true;
      });

      return {
        ...section,
        items: filteredItems,
      };
    })
    .filter((section) => section.items.length > 0);

  const guestIcons = ['scan-outline', 'time-outline', 'shield-checkmark-outline'];

  const authTiles = [
    ...(canUseAttendanceScreen ? [{ icon: 'scan-outline', label: 'Chấm công vào' }] : []),
    { icon: 'calendar-outline', label: 'Ca trực' },
    { icon: 'document-text-outline', label: 'Nghỉ phép' },
    { icon: 'stats-chart-outline', label: 'Báo cáo' },
  ];

  return (
    <ScreenContainer scroll={false} showBackButton={!isAdmin}>
      <View style={[styles.root, { backgroundColor: theme.screen }]}>
        <View style={[styles.bgBlobTop, { backgroundColor: theme.accentSoft }]} />
        <View style={[styles.bgBlobBottom, { backgroundColor: theme.iconBg }]} />

        <Animated.View style={[styles.content, animatedStyle]}>
          <View style={styles.header}>
            <View style={[styles.logoWrap, { backgroundColor: theme.iconBg, borderColor: theme.border }]}>
              <Ionicons name="scan-circle-outline" size={22} color={theme.accent} />
            </View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>PBL5 Mobile</Text>
          </View>

          {!isAuthenticated ? (
            <>
              <View style={[styles.guestHero, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.guestOrbLarge, { backgroundColor: theme.accentSoft }]} />
                <View style={[styles.guestOrbSmall, { backgroundColor: theme.iconBg }]} />

                <View style={[styles.guestMainIconWrap, { backgroundColor: theme.iconBg, borderColor: theme.border }]}>
                  <Ionicons name="scan-circle-outline" size={54} color={theme.accent} />
                </View>

                <Text style={[styles.guestTitle, { color: theme.text }]}>Chấm công thông minh</Text>

                <View style={styles.guestVisualList}>
                  {guestIcons.map((icon) => (
                    <View key={icon} style={[styles.guestVisualItem, { backgroundColor: theme.surfaceSoft, borderColor: theme.border }]}>
                      <View style={[styles.guestVisualIcon, { backgroundColor: theme.iconBg }]}>
                        <Ionicons name={icon} size={18} color={theme.accent} />
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              <View style={[styles.guestCtaWrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <PrimaryButton title="Đăng nhập" onPress={() => navigation.navigate('Login')} />
              </View>
            </>
          ) : (
            <>
              <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.heroTitle, { color: theme.text }]}>Bảng điều khiển</Text>

                <View style={styles.authTileGrid}>
                  {authTiles.map((tile) => (
                    <View key={tile.label} style={[styles.authTile, { backgroundColor: theme.surfaceSoft, borderColor: theme.border }]}>
                      <Ionicons name={tile.icon} size={20} color={theme.accent} />
                      <Text style={[styles.authTileText, { color: theme.text }]}>{tile.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          {isAuthenticated ? (
            <View style={styles.accordionList}>
              {sections.map((section) => {
                const isOpen = openSection === section.key || (section.defaultOpen && openSection == null);
                return (
                  <View key={section.key} style={[styles.accordionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Pressable onPress={() => toggleSection(section.key)} style={styles.accordionHeader}>
                      <View style={styles.accordionHeaderLeft}>
                        <View style={[styles.accordionIcon, { backgroundColor: theme.iconBg }]}>
                          <Ionicons name={section.icon} size={18} color={theme.accent} />
                        </View>
                        <Text style={[styles.accordionTitle, { color: theme.text }]}>{section.title}</Text>
                      </View>
                      <Ionicons
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={theme.textMuted}
                      />
                    </Pressable>

                    {isOpen ? (
                      <View style={styles.accordionBody}>
                        {section.items.map((item) => (
                          <PrimaryButton key={item.label} title={item.label} onPress={item.onPress} />
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}

          {isAuthenticated ? (
            <View style={[styles.ctaWrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.ctaTitle, { color: theme.text }]}>Tiếp tục</Text>
              <PrimaryButton title="Vào ứng dụng" onPress={() => navigation.navigate('MainTabs')} />
            </View>
          ) : null}
        </Animated.View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    padding: 14,
  },
  bgBlobTop: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    top: -90,
    right: -50,
    opacity: 0.42,
  },
  bgBlobBottom: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    bottom: -110,
    left: -80,
    opacity: 0.38,
  },
  content: {
    flex: 1,
    gap: 14,
  },
  header: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  heroCard: {
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    shadowColor: '#0A203A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  authTileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  authTile: {
    width: '47%',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  authTileText: {
    fontSize: 13,
    fontWeight: '700',
  },
  guestHero: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    gap: 16,
    overflow: 'hidden',
    shadowColor: '#0A203A',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  guestOrbLarge: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -140,
    right: -90,
    opacity: 0.7,
  },
  guestOrbSmall: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    bottom: -70,
    left: -40,
    opacity: 0.7,
  },
  guestMainIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  guestVisualList: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  guestVisualItem: {
    borderWidth: 1,
    borderRadius: 16,
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestVisualIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestCtaWrap: {
    marginTop: 0,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    shadowColor: '#0A203A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  accordionList: {
    gap: 10,
  },
  accordionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  accordionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  accordionBody: {
    gap: 8,
    paddingTop: 2,
  },
  ctaWrap: {
    marginTop: 'auto',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    shadowColor: '#0A203A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
});
