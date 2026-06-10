import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AnimatedCard from '../../../shared/components/AnimatedCard';
import ScreenContainer from '../../../shared/components/ScreenContainer';
import { useAuth } from '../../../application/providers/AuthContext';
import { attendanceAPI, unwrapResponse } from '../../../core/api/api';
import { smartOfficeMqttService } from '../services/mqttService';
import useAppTheme from '../../../shared/theme/useAppTheme';

const DEVICES = [
  {
    key: 'fan',
    name: 'Quạt',
    icon: 'aperture-outline',
    activeLabel: 'Đang bật',
    inactiveLabel: 'Đang tắt',
  },
  {
    key: 'door',
    name: 'Cửa',
    icon: 'lock-open-outline',
    activeLabel: 'Đang mở',
    inactiveLabel: 'Đang đóng',
  },
  {
    key: 'curtain',
    name: 'Rèm',
    icon: 'albums-outline',
    activeLabel: 'Đang mở',
    inactiveLabel: 'Đang đóng',
  },
];

const DEFAULT_DEVICE_STATE = {
  fan: false,
  door: false,
  curtain: false,
};

function DeviceCard({ device, value, disabled, onToggle, colors, index }) {
  const isActive = Boolean(value);
  const statusText = isActive ? device.activeLabel : device.inactiveLabel;
  const activeColor = device.key === 'fan' ? '#0F70D1' : '#159A63';
  const inactiveColor = colors.textMuted;

  return (
    <AnimatedCard
      delay={index * 45}
      style={[
        styles.deviceCard,
        {
          backgroundColor: colors.card,
          borderColor: isActive ? activeColor : colors.border,
        },
      ]}
    >
      <View style={styles.deviceMain}>
        <View
          style={[
            styles.deviceIcon,
            {
              backgroundColor: isActive ? `${activeColor}1F` : colors.bgSoft,
            },
          ]}
        >
          <Ionicons name={device.icon} size={22} color={isActive ? activeColor : inactiveColor} />
        </View>

        <View style={styles.deviceTextWrap}>
          <Text style={[styles.deviceName, { color: colors.text }]}>{device.name}</Text>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: isActive ? `${activeColor}1A` : colors.bgSoft,
                borderColor: isActive ? activeColor : colors.border,
              },
            ]}
          >
            <View style={[styles.statusDot, { backgroundColor: isActive ? activeColor : inactiveColor }]} />
            <Text style={[styles.statusText, { color: isActive ? activeColor : inactiveColor }]}>{statusText}</Text>
          </View>
        </View>
      </View>

      <Switch
        value={isActive}
        onValueChange={(nextValue) => onToggle(device.key, nextValue)}
        disabled={disabled}
        trackColor={{ false: colors.border, true: `${activeColor}66` }}
        thumbColor={isActive ? activeColor : '#F7FAFF'}
        ios_backgroundColor={colors.border}
      />
    </AnimatedCard>
  );
}

export default function SmartOfficeControlScreen({ navigation }) {
  const { isAuthenticated } = useAuth();
  const { colors, radius } = useAppTheme();
  const [deviceState, setDeviceState] = useState(DEFAULT_DEVICE_STATE);
  const [mqttConnected, setMqttConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [canControl, setCanControl] = useState(false);
  const [accessMessage, setAccessMessage] = useState('Đang kiểm tra trạng thái chấm công...');
  const [lastSyncText, setLastSyncText] = useState('Đang chờ trạng thái từ ESP32');

  const connectionText = !canControl ? 'Đã khóa' : mqttConnected ? 'Đã kết nối' : 'Mất kết nối';

  const verifyControlAccess = useCallback(async () => {
    setCheckingAccess(true);
    try {
      const response = await attendanceAPI.getSmartOfficeAccess();
      const payload = unwrapResponse(response) || {};
      const allowed = Boolean(payload.can_control);
      setCanControl(allowed);
      smartOfficeMqttService.setControlAccess(allowed);

      if (payload.admin_override) {
        setAccessMessage(
          'Quản trị viên có thể điều khiển thiết bị bất cứ lúc nào.',
        );
      } else if (allowed) {
        setAccessMessage('Đã chấm công vào. Bạn có thể điều khiển thiết bị.');
      } else if (payload.checked_out) {
        setAccessMessage('Bạn đã chấm công ra. Thiết bị đã được khóa.');
      } else {
        setAccessMessage('Bạn cần chấm công vào trước khi điều khiển thiết bị.');
      }
      return allowed;
    } catch (error) {
      setCanControl(false);
      smartOfficeMqttService.setControlAccess(false);
      setAccessMessage('Không thể xác minh trạng thái chấm công.');
      return false;
    } finally {
      setCheckingAccess(false);
    }
  }, []);

  const connectMqtt = useCallback(async () => {
    setIsConnecting(true);
    try {
      await smartOfficeMqttService.connect();
    } catch (error) {
      Alert.alert('MQTT', 'Không thể kết nối MQTT. Vui lòng kiểm tra mạng và thử lại.');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const reconnectWithAccessCheck = useCallback(async () => {
    const allowed = await verifyControlAccess();
    if (!allowed) {
      Alert.alert('Văn phòng thông minh', 'Bạn cần chấm công vào và chưa chấm công ra để điều khiển thiết bị.');
      return;
    }
    await connectMqtt();
  }, [connectMqtt, verifyControlAccess]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return undefined;
    }

    smartOfficeMqttService.setConnectionHandler(setMqttConnected);
    smartOfficeMqttService.setStatusHandler((nextState) => {
      setDeviceState(nextState);
      setLastSyncText(`Đã đồng bộ lúc ${new Date().toLocaleTimeString('vi-VN')}`);
    });

    return () => {
      smartOfficeMqttService.setControlAccess(false);
      smartOfficeMqttService.setStatusHandler(null);
      smartOfficeMqttService.setConnectionHandler(null);
      smartOfficeMqttService.disconnect();
    };
  }, [isAuthenticated, navigation]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const refreshAccess = async () => {
        const allowed = await verifyControlAccess();
        if (active && allowed) {
          await connectMqtt();
        }
      };

      refreshAccess();
      const accessInterval = setInterval(verifyControlAccess, 15000);
      return () => {
        active = false;
        clearInterval(accessInterval);
      };
    }, [connectMqtt, verifyControlAccess])
  );

  const handleToggle = useCallback(async (deviceKey, nextValue) => {
    const allowed = await verifyControlAccess();
    if (!allowed) {
      Alert.alert('Văn phòng thông minh', 'Bạn cần chấm công vào và chưa chấm công ra để điều khiển thiết bị.');
      return;
    }

    setDeviceState((current) => ({
      ...current,
      [deviceKey]: nextValue,
    }));

    try {
      smartOfficeMqttService.publishDeviceState(deviceKey, nextValue);
      setLastSyncText('Đã gửi lệnh, đang chờ ESP32 xác nhận');
    } catch (error) {
      setDeviceState((current) => ({
        ...current,
        [deviceKey]: !nextValue,
      }));
      Alert.alert('MQTT', 'Chưa kết nối MQTT nên không thể gửi lệnh.');
    }
  }, [verifyControlAccess]);

  const summary = useMemo(() => {
    const activeCount = Object.values(deviceState).filter(Boolean).length;
    return `${activeCount}/3 thiết bị đang hoạt động`;
  }, [deviceState]);

  return (
    <ScreenContainer contentStyle={styles.contentStyle}>
      <AnimatedCard
        style={[
          styles.headerCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: radius.lg,
          },
        ]}
      >
        <View style={styles.titleRow}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="hardware-chip-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.titleTextWrap}>
            <Text style={[styles.title, { color: colors.text }]}>Điều khiển văn phòng thông minh</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{summary}</Text>
          </View>
        </View>

        <View style={styles.connectionRow}>
          <View
            style={[
              styles.connectionBadge,
              {
                borderColor: canControl && mqttConnected ? '#159A63' : colors.border,
                backgroundColor: canControl && mqttConnected ? '#159A631A' : colors.bgSoft,
              },
            ]}
          >
            <View style={[styles.connectionDot, { backgroundColor: canControl && mqttConnected ? '#159A63' : colors.textMuted }]} />
            <Text style={[styles.connectionText, { color: canControl && mqttConnected ? '#159A63' : colors.textMuted }]}>
              {connectionText}
            </Text>
          </View>

          <Pressable
            style={[
              styles.reconnectButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.bgSoft,
                opacity: isConnecting || checkingAccess ? 0.65 : 1,
              },
            ]}
            onPress={reconnectWithAccessCheck}
            disabled={isConnecting || checkingAccess}
          >
            <Ionicons name="refresh-outline" size={16} color={colors.primary} />
            <Text style={[styles.reconnectText, { color: colors.primary }]}>
              {isConnecting ? 'Đang kết nối' : 'Kết nối lại'}
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.syncText, { color: colors.textMuted }]}>{lastSyncText}</Text>
        <View
          style={[
            styles.accessNotice,
            {
              backgroundColor: canControl ? '#159A631A' : colors.bgSoft,
              borderColor: canControl ? '#159A63' : colors.border,
            },
          ]}
        >
          <Ionicons
            name={canControl ? 'checkmark-circle-outline' : 'lock-closed-outline'}
            size={18}
            color={canControl ? '#159A63' : colors.textMuted}
          />
          <Text style={[styles.accessText, { color: canControl ? '#159A63' : colors.textMuted }]}>
            {checkingAccess ? 'Đang kiểm tra trạng thái chấm công...' : accessMessage}
          </Text>
        </View>
      </AnimatedCard>

      <View style={styles.deviceList}>
        {DEVICES.map((device, index) => (
          <DeviceCard
            key={device.key}
            device={device}
            value={deviceState[device.key]}
            disabled={!canControl || !mqttConnected || checkingAccess}
            onToggle={handleToggle}
            colors={colors}
            index={index + 1}
          />
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contentStyle: {
    gap: 12,
  },
  headerCard: {
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleTextWrap: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  connectionBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '800',
  },
  reconnectButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reconnectText: {
    fontSize: 12,
    fontWeight: '800',
  },
  syncText: {
    fontSize: 12,
    fontWeight: '600',
  },
  accessNotice: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accessText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  deviceList: {
    gap: 10,
  },
  deviceCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  deviceMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  deviceIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceTextWrap: {
    flex: 1,
    gap: 7,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '800',
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
  },
});
