import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../providers/AuthContext';

import HomeScreen from '../../features/home/screens/HomeScreen';
import LoginScreen from '../../features/auth/screens/LoginScreen';
import ProfileScreen from '../../features/profile/screens/ProfileScreen';
import LeaveManagementScreen from '../../features/leaves/screens/LeaveManagementScreen';
import AttendanceHistoryScreen from '../../features/attendance/screens/AttendanceHistoryScreen';
import MyShiftsScreen from '../../features/shifts/screens/MyShiftsScreen';
import AttendanceScreen from '../../features/attendance/screens/AttendanceScreen';
import FaceRegistrationScreen from '../../features/face-recognition/screens/FaceRegistrationScreen';
import AdminEmployeesScreen from '../../features/organization/screens/AdminEmployeesScreen';
import DepartmentManagementScreen from '../../features/organization/screens/DepartmentManagementScreen';
import ShiftsManagementScreen from '../../features/shifts/screens/ShiftsManagementScreen';
import ReportsScreen from '../../features/reports/screens/ReportsScreen';
import OvertimeRequestScreen from '../../features/overtime/screens/OvertimeRequestScreen';
import WorkRulesScreen from '../../features/work-rules/screens/WorkRulesScreen';
import SmartOfficeControlScreen from '../../features/smart-office/screens/SmartOfficeControlScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { user } = useAuth();
  const isAdmin = String(user?.role || '').toLowerCase() === 'admin';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0f5fb6',
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Tài khoản' }} />
      <Tab.Screen name="Leaves" component={LeaveManagementScreen} options={{ title: 'Nghỉ phép' }} />
      <Tab.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} options={{ title: 'Chấm công' }} />
      {!isAdmin ? <Tab.Screen name="MyShifts" component={MyShiftsScreen} options={{ title: 'Ca của tôi' }} /> : null}
    </Tab.Navigator>
  );
}

function SplashLoading() {
  return (
    <View style={styles.loadingWrap}>
      <ActivityIndicator size="large" color="#0f5fb6" />
      <Text style={styles.loadingText}>Đang khởi tạo...</Text>
    </View>
  );
}

export default function AppNavigator() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const role = String(user?.role || '').toLowerCase();
  const canUseAttendanceScreen = role !== 'employee' && role !== 'manager';

  if (isLoading) {
    return <SplashLoading />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="LeaveManagement" component={LeaveManagementScreen} />
          <Stack.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} />
          <Stack.Screen name="MyShifts" component={MyShiftsScreen} />
          {canUseAttendanceScreen ? <Stack.Screen name="Attendance" component={AttendanceScreen} /> : null}
          <Stack.Screen name="FaceRegistration" component={FaceRegistrationScreen} />
          <Stack.Screen name="AdminEmployees" component={AdminEmployeesScreen} />
          <Stack.Screen name="DepartmentManagement" component={DepartmentManagementScreen} />
          <Stack.Screen name="ShiftsManagement" component={ShiftsManagementScreen} />
          <Stack.Screen name="Reports" component={ReportsScreen} />
          <Stack.Screen name="OvertimeRequest" component={OvertimeRequestScreen} />
          <Stack.Screen name="WorkRules" component={WorkRulesScreen} />
          <Stack.Screen name="SmartOfficeControl" component={SmartOfficeControlScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f7fb',
    gap: 10,
  },
  loadingText: {
    color: '#445166',
  },
});
