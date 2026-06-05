import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedCard from '../components/AnimatedCard';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../context/AuthContext';
import { smartOfficeMqttService } from '../services/mqttService';
import useAppTheme from '../theme/useAppTheme';

const DEVICES = [
  {
    key: 'fan',
    name: 'Fan / Quạt',
    icon: 'aperture-outline',
    activeLabel: 'ON',
    inactiveLabel: 'OFF',
  },
  {
    key: 'door',
    name: 'Door / Cửa',
    icon: 'lock-open-outline',
    activeLabel: 'OPEN',
    inactiveLabel: 'CLOSE',
  },
  {
    key: 'curtain',
    name: 'Curtain / Rèm',
    icon: 'albums-outline',
    activeLabel: 'OPEN',
    inactiveLabel: 'CLOSE',
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
  const [lastSyncText, setLastSyncText] = useState('Đang chờ trạng thái từ ESP32');

  const connectionText = mqttConnected ? 'Connected' : 'Disconnected';

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

  useEffect(() => {
    if (!isAuthenticated) {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return undefined;
    }

    smartOfficeMqttService.setConnectionHandler(setMqttConnected);
    smartOfficeMqttService.setStatusHandler((nextState) => {
      setDeviceState(nextState);
      setLastSyncText(`Đã đồng bộ ${new Date().toLocaleTimeString('vi-VN')}`);
    });

    connectMqtt();

    return () => {
      smartOfficeMqttService.setStatusHandler(null);
      smartOfficeMqttService.setConnectionHandler(null);
      smartOfficeMqttService.disconnect();
    };
  }, [connectMqtt, isAuthenticated, navigation]);

  const handleToggle = useCallback((deviceKey, nextValue) => {
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
  }, []);

  const summary = useMemo(() => {
    const activeCount = Object.values(deviceState).filter(Boolean).length;
    return `${activeCount}/3 thiết bị đang active`;
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
            <Text style={[styles.title, { color: colors.text }]}>Smart Office Control</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{summary}</Text>
          </View>
        </View>

        <View style={styles.connectionRow}>
          <View
            style={[
              styles.connectionBadge,
              {
                borderColor: mqttConnected ? '#159A63' : colors.border,
                backgroundColor: mqttConnected ? '#159A631A' : colors.bgSoft,
              },
            ]}
          >
            <View style={[styles.connectionDot, { backgroundColor: mqttConnected ? '#159A63' : colors.textMuted }]} />
            <Text style={[styles.connectionText, { color: mqttConnected ? '#159A63' : colors.textMuted }]}>
              {connectionText}
            </Text>
          </View>

          <Pressable
            style={[
              styles.reconnectButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.bgSoft,
                opacity: isConnecting ? 0.65 : 1,
              },
            ]}
            onPress={connectMqtt}
            disabled={isConnecting}
          >
            <Ionicons name="refresh-outline" size={16} color={colors.primary} />
            <Text style={[styles.reconnectText, { color: colors.primary }]}>
              {isConnecting ? 'Connecting' : 'Reconnect'}
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.syncText, { color: colors.textMuted }]}>{lastSyncText}</Text>
      </AnimatedCard>

      <View style={styles.deviceList}>
        {DEVICES.map((device, index) => (
          <DeviceCard
            key={device.key}
            device={device}
            value={deviceState[device.key]}
            disabled={!mqttConnected}
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
