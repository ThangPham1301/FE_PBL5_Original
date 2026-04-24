import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import PrimaryButton from '../components/PrimaryButton';
import FloatingField from '../components/FloatingField';
import { useAuth } from '../context/AuthContext';
import useAppTheme from '../theme/useAppTheme';
import AnimatedCard from '../components/AnimatedCard';

export default function LoginScreen({ navigation }) {
  const { colors, radius } = useAppTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const onLogin = async () => {
    try {
      setLoading(true);
      await login(username.trim(), password);
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (error) {
      Alert.alert('Đăng nhập thất bại', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <AnimatedCard style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Đăng nhập</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Truy cập nhanh bằng tài khoản công ty của bạn.</Text>
      </AnimatedCard>

      <AnimatedCard style={[styles.box, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]} delay={70}>
        <FloatingField
          label="Tên đăng nhập"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <FloatingField
          label="Mat khau"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </AnimatedCard>
      <PrimaryButton
        title={loading ? 'Đang xử lý...' : 'Đăng nhập'}
        onPress={onLogin}
        disabled={loading || !username || !password}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  box: {
    gap: 10,
    borderWidth: 1,
    padding: 12,
  },
});
