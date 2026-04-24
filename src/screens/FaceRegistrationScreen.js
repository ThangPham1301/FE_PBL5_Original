import React, { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import ScreenContainer from '../components/ScreenContainer';
import PrimaryButton from '../components/PrimaryButton';
import FloatingField from '../components/FloatingField';
import { faceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import useAppTheme from '../theme/useAppTheme';
import AnimatedCard from '../components/AnimatedCard';

export default function FaceRegistrationScreen() {
  const { colors, radius } = useAppTheme();
  const { user } = useAuth();
  const userId = user?.employee?.id ? String(user.employee.id) : '';
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [capturedCount, setCapturedCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [facing, setFacing] = useState('front'); // State để track camera facing
  const [scanHint, setScanHint] = useState('Đặt khuôn mặt vào vòng tròn, giữ máy ổn định trong vài giây.');
  const requiredPhotos = 5;

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'front' ? 'back' : 'front'));
  };

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const scanAndRegister = () => {
    if (!userId) {
      Alert.alert('Không thể đăng ký', 'Tài khoản hiện tại chưa liên kết nhân viên (employee).');
      return;
    }

    // Hiển thị confirm dialog
    Alert.alert(
      'Xác nhận đăng ký khuôn mặt',
      'Lưu ý: Nếu bạn đã đăng ký trước đó, dữ liệu cũ sẽ bị xóa hoàn toàn. Tiếp tục?',
      [
        {
          text: 'Hủy',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Tiếp tục',
          onPress: performScan,
          style: 'default',
        },
      ]
    );
  };

  const performScan = async () => {
    if (!permission?.granted) {
      const permissionResult = await requestPermission();
      if (!permissionResult.granted) {
        Alert.alert('Thiếu quyền', 'Vui lòng cấp quyền camera để quét khuôn mặt.');
        return;
      }
    }

    if (!cameraRef.current) {
      Alert.alert('Camera chưa sẵn sàng', 'Vui lòng đợi camera khởi tạo rồi thử lại.');
      return;
    }

    setSubmitting(true);
    setCapturedCount(0);
    setScanHint('Đang kiểm tra độ rõ khuôn mặt...');

    try {
      const images = [];
      let attempts = 0;
      const maxAttempts = 30;

      while (images.length < requiredPhotos && attempts < maxAttempts) {
        attempts += 1;
        // Delay ngắn để có các frame khác nhau.
        await wait(250);
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.7,
          skipProcessing: true, // Không animation khi chụp
          pauseAfterCapture: false, // Không pause camera sau chụp
        });

        if (!photo?.base64) {
          throw new Error('Không lấy được dữ liệu ảnh base64.');
        }

        const validationResponse = await faceAPI.validate(photo.base64);
        const validation = validationResponse?.data || {};

        if (!validation.success) {
          throw new Error(validation.message || 'Không thể kiểm tra độ rõ khuôn mặt.');
        }

        if (!validation.is_clear) {
          setScanHint(validation.message || 'Chưa thấy khuôn mặt rõ, vui lòng giữ yên và đủ sáng.');
          continue;
        }

        images.push(photo.base64);
        setCapturedCount(images.length);
        setScanHint(`Ảnh ${images.length}/${requiredPhotos} đạt chuẩn. Tiếp tục giữ yên khuôn mặt.`);
      }

      if (images.length < requiredPhotos) {
        throw new Error('Không đủ ảnh rõ khuôn mặt. Vui lòng thử lại với ánh sáng tốt hơn.');
      }

      console.log('[FaceRegistration] Gửi request đến backend với 5 ảnh...');
      const response = await faceAPI.register(userId.trim(), images);
      
      console.log('[FaceRegistration] Response nhận được:', {
        status: response?.status,
        data: response?.data,
      });

      const payload = response?.data || {};
      
      if (payload.success) {
        Alert.alert(
          'Thành công',
          `${payload.message || 'Đã đăng ký khuôn mặt hoàn tất.'}\n\nID: ${payload.registration_id}\nSố ảnh: ${payload.image_count}`
        );
      } else {
        Alert.alert(
          'Thông báo',
          payload.message || 'Đăng ký khuôn mặt hoàn tất.'
        );
      }
    } catch (error) {
      console.error('[FaceRegistration] Error:', {
        message: error?.message,
        code: error?.code,
        status: error?.response?.status,
        responseData: error?.response?.data,
      });

      const message =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.images?.[0] ||
        error?.message ||
        'Không thể đăng ký khuôn mặt. Vui lòng kiểm tra kết nối mạng.';
      Alert.alert('Lỗi', message);
    } finally {
      setSubmitting(false);
      setCapturedCount(0);
      setScanHint('Đặt khuôn mặt vào vòng tròn, giữ máy ổn định trong vài giây.');
    }
  };

  if (!permission) {
    return (
      <ScreenContainer>
        <Text style={[styles.note, { color: colors.textMuted }]}>Đang kiểm tra quyền camera...</Text>
      </ScreenContainer>
    );
  }

  if (!permission.granted) {
    return (
      <ScreenContainer>
        <Text style={[styles.note, { color: colors.textMuted }]}>Ứng dụng cần quyền camera để quét khuôn mặt.</Text>
        <PrimaryButton title="Cấp quyền camera" onPress={requestPermission} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: colors.text }]}>Đăng ký khuôn mặt</Text>
      <AnimatedCard style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]}>
        <FloatingField
          label="User ID (tự động từ tài khoản đăng nhập)"
          value={userId}
          onChangeText={() => {}}
          editable={false}
        />
        <Text style={[styles.caption, { color: colors.textMuted }]}>Khi bấm quét, hệ thống sẽ tự chụp ngầm 5 ảnh và gửi lên backend.</Text>

        <View style={[styles.cameraWrap, { borderColor: colors.border, borderRadius: radius.md }]}> 
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
            mute={true}
            animateShutter={false}
          />
          <View style={styles.overlayCenter} pointerEvents="none">
            <View style={[styles.faceGuide, { borderColor: '#FFFFFF' }]} />
          </View>
          <View style={[styles.toggleButtonWrap, { backgroundColor: 'rgba(0, 0, 0, 0.4)' }]}>
            <TouchableOpacity onPress={toggleCameraFacing}>
              <Text style={[styles.toggleButton, { color: '#FFFFFF' }]}>
                🔄 Xoay Camera
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {submitting ? (
          <Text style={[styles.progress, { color: colors.text }]}>Đang quét tự động: {capturedCount}/{requiredPhotos}</Text>
        ) : null}
        <Text style={[styles.progress, { color: submitting ? colors.text : colors.textMuted }]}>{scanHint}</Text>

        <PrimaryButton
          title={submitting ? 'Đang quét và gửi...' : 'Quét khuôn mặt tự động (5 ảnh)'}
          onPress={scanAndRegister}
          disabled={submitting || !userId}
        />
      </AnimatedCard>
      <Text style={[styles.note, { color: colors.textMuted }]}>Gợi ý: Đủ sáng, không che mặt và nhìn thẳng vào camera để tăng độ chính xác.</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800' },
  form: {
    gap: 8,
    borderWidth: 1,
    padding: 12,
  },
  caption: {
    lineHeight: 20,
  },
  cameraWrap: {
    overflow: 'hidden',
    borderWidth: 1,
    height: 340,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlayCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceGuide: {
    width: 220,
    height: 220,
    borderRadius: 999,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  toggleButtonWrap: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleButton: {
    fontSize: 14,
    fontWeight: '600',
  },
  progress: {
    lineHeight: 20,
  },
  note: {
    lineHeight: 20,
  },
});
