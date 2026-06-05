import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import ScreenContainer from '../components/ScreenContainer';
import PrimaryButton from '../components/PrimaryButton';
import FloatingField from '../components/FloatingField';
import { faceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import useAppTheme from '../theme/useAppTheme';
import AnimatedCard from '../components/AnimatedCard';

const FACE_CAPTURE_STEPS = [
  { pose: 'front', title: 'Chinh dien', hint: 'Nhin thang vao camera va giu mat trong vong tron.' },
  { pose: 'left', title: 'Quay trai', hint: 'Quay nhe mat sang trai, van giu mat trong vong tron.' },
  { pose: 'right', title: 'Quay phai', hint: 'Quay nhe mat sang phai, van giu mat trong vong tron.' },
  { pose: 'up', title: 'Quay len', hint: 'Ngua mat len nhe, khong dua mat ra khoi vong tron.' },
  { pose: 'down', title: 'Quay xuong', hint: 'Cui mat xuong nhe, giu mat ro va du sang.' },
];

const REQUIRED_FACE_PHOTOS = FACE_CAPTURE_STEPS.length;
const RING_TICK_COUNT = 80;
const RING_SIZE = 266;
const CAMERA_CIRCLE_SIZE = 238;

function FaceProgressRing({ active, capturedCount, totalPhotos, spinValue }) {
  const progress = Math.min(1, Math.max(0, capturedCount / totalPhotos));
  const activeTicks = Math.round(progress * RING_TICK_COUNT);
  const sweepRotation = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.progressRing} pointerEvents="none">
      {Array.from({ length: RING_TICK_COUNT }).map((_, index) => {
        const isDone = index < activeTicks;
        const isNext = active && index === activeTicks;
        return (
          <View
            key={index}
            style={[
              styles.ringTickSlot,
              {
                transform: [{ rotate: `${(360 / RING_TICK_COUNT) * index}deg` }],
              },
            ]}
          >
            <View
              style={[
                styles.ringTick,
                {
                  backgroundColor: isDone || isNext ? '#5DFFF2' : 'rgba(255, 255, 255, 0.32)',
                  opacity: isDone ? 1 : isNext ? 0.9 : 0.72,
                },
              ]}
            />
          </View>
        );
      })}
      <Animated.View
        style={[
          styles.scanSweep,
          {
            opacity: active ? 1 : 0,
            transform: [{ rotate: sweepRotation }],
          },
        ]}
      />
    </View>
  );
}

export default function FaceRegistrationScreen() {
  const { colors, radius } = useAppTheme();
  const { user } = useAuth();
  const userId = user?.employee?.id ? String(user.employee.id) : '';
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const scanSpin = useRef(new Animated.Value(0)).current;
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const [capturedPoses, setCapturedPoses] = useState([]);
  const [capturedCount, setCapturedCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [facing, setFacing] = useState('front');
  const [scanHint, setScanHint] = useState(FACE_CAPTURE_STEPS[0].hint);

  const currentStep = FACE_CAPTURE_STEPS[Math.min(capturedCount, REQUIRED_FACE_PHOTOS - 1)];

  useEffect(() => {
    if (!submitting) {
      scanSpin.stopAnimation();
      scanSpin.setValue(0);
      return undefined;
    }

    scanSpin.setValue(0);
    const animation = Animated.loop(
      Animated.timing(scanSpin, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();

    return () => animation.stop();
  }, [scanSpin, submitting]);

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'front' ? 'back' : 'front'));
  };

  const withTimeout = (promise, ms, message) =>
    Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);

  const scanAndRegister = () => {
    if (!userId) {
      Alert.alert('Khong the dang ky', 'Tai khoan hien tai chua lien ket nhan vien.');
      return;
    }

    if (capturedCount > 0) {
      captureCurrentPose();
      return;
    }

    Alert.alert(
      'Xac nhan dang ky khuon mat',
      'Ban se chup lan luot 5 goc: chinh dien, trai, phai, len, xuong. Du lieu cu se bi xoa sau khi gui thanh cong. Tiep tuc?',
      [
        { text: 'Huy', onPress: () => {}, style: 'cancel' },
        { text: 'Tiep tuc', onPress: captureCurrentPose, style: 'default' },
      ]
    );
  };

  const submitRegistration = async (imagesToSubmit = capturedImages, posesToSubmit = capturedPoses) => {
    if (imagesToSubmit.length !== REQUIRED_FACE_PHOTOS || posesToSubmit.length !== REQUIRED_FACE_PHOTOS) {
      Alert.alert('Chua du anh', `Can chup du ${REQUIRED_FACE_PHOTOS} anh truoc khi gui.`);
      return;
    }

    setSubmitting(true);
    setScanHint('Da du 5 anh, dang gui du lieu...');

    try {
      console.log('[FaceRegistration] Sending 5 pose images...', { poses: posesToSubmit });
      const response = await withTimeout(
        faceAPI.register(userId.trim(), imagesToSubmit, posesToSubmit),
        45000,
        'Gui dang ky qua lau. Vui long kiem tra ket noi backend hoac ChromaDB.'
      );
      const payload = response?.data || {};

      if (payload.success) {
        Alert.alert(
          'Thanh cong',
          `${payload.message || 'Da dang ky khuon mat hoan tat.'}\n\nNhan vien: ${payload.employee_code || userId}\nSo anh: ${payload.image_count}`
        );
        setCapturedImages([]);
        setCapturedPoses([]);
        setCapturedCount(0);
        setScanHint(FACE_CAPTURE_STEPS[0].hint);
      } else {
        Alert.alert('Thong bao', payload.message || 'Dang ky khuon mat hoan tat.');
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
        'Khong the dang ky khuon mat. Vui long kiem tra ket noi mang.';
      setScanHint('Gui dang ky that bai. Bam lai de gui lai hoac chup lai tu dau.');
      Alert.alert('Loi', message);
    } finally {
      setSubmitting(false);
    }
  };

  const captureCurrentPose = async () => {
    if (capturedCount >= REQUIRED_FACE_PHOTOS) {
      await submitRegistration();
      return;
    }

    if (!permission?.granted) {
      const permissionResult = await requestPermission();
      if (!permissionResult.granted) {
        Alert.alert('Thieu quyen', 'Vui long cap quyen camera de quet khuon mat.');
        return;
      }
    }

    if (!cameraRef.current) {
      Alert.alert('Camera chua san sang', 'Vui long doi camera khoi tao roi thu lai.');
      return;
    }

    setSubmitting(true);
    setScanHint(`Dang chup goc ${currentStep.title}...`);

    try {
      const step = FACE_CAPTURE_STEPS[capturedCount];
      const photo = await withTimeout(
        cameraRef.current.takePictureAsync({
            base64: true,
            quality: 0.72,
            skipProcessing: true,
            pauseAfterCapture: false,
        }),
        12000,
        'Camera chup qua lau. Vui long thu lai.'
      );

      if (!photo?.base64) {
        throw new Error('Khong lay duoc du lieu anh base64.');
      }

      const nextImages = [...capturedImages, photo.base64];
      const nextPoses = [...capturedPoses, step.pose];
      const nextCount = nextImages.length;

      setCapturedImages(nextImages);
      setCapturedPoses(nextPoses);
      setCapturedCount(nextCount);

      const nextStep = FACE_CAPTURE_STEPS[nextCount];
      if (nextStep) {
        setScanHint(nextStep.hint);
      } else {
        await submitRegistration(nextImages, nextPoses);
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
        error?.message ||
        'Khong the chup anh. Vui long thu lai.';
      Alert.alert('Loi', message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetCapture = () => {
    setCapturedImages([]);
    setCapturedPoses([]);
    setCapturedCount(0);
    setScanHint(FACE_CAPTURE_STEPS[0].hint);
  };

  const actionTitle = submitting
    ? 'Dang xu ly...'
    : capturedCount >= REQUIRED_FACE_PHOTOS
      ? 'Gui lai dang ky khuon mat'
      : `Chup ${currentStep.title}`;

  if (!permission) {
    return (
      <ScreenContainer>
        <Text style={[styles.note, { color: colors.textMuted }]}>Dang kiem tra quyen camera...</Text>
      </ScreenContainer>
    );
  }

  if (!permission.granted) {
    return (
      <ScreenContainer>
        <Text style={[styles.note, { color: colors.textMuted }]}>Ung dung can quyen camera de quet khuon mat.</Text>
        <PrimaryButton title="Cap quyen camera" onPress={requestPermission} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: colors.text }]}>Dang ky khuon mat</Text>
      <AnimatedCard style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]}>
        <FloatingField
          label="User ID tu tai khoan dang nhap"
          value={userId}
          onChangeText={() => {}}
          editable={false}
        />
        <Text style={[styles.caption, { color: colors.textMuted }]}>Chup 5 goc de nhan dien on dinh hon khi cham cong.</Text>

        <View style={[styles.cameraWrap, { borderColor: colors.border, borderRadius: radius.md }]}>
          <Text style={styles.poseLabel}>{currentStep.title}</Text>
          <View style={styles.scanStage}>
            <View style={styles.cameraCircle}>
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing={facing}
                mute={true}
                animateShutter={false}
                onCameraReady={() => setCameraReady(true)}
              />
            </View>
            <FaceProgressRing
              active={submitting}
              capturedCount={capturedCount}
              totalPhotos={REQUIRED_FACE_PHOTOS}
              spinValue={scanSpin}
            />
            <View style={styles.innerGuide} pointerEvents="none" />
          </View>
          <View style={[styles.toggleButtonWrap, { backgroundColor: 'rgba(0, 0, 0, 0.4)' }]}>
            <TouchableOpacity onPress={toggleCameraFacing}>
              <Text style={[styles.toggleButton, { color: '#FFFFFF' }]}>Xoay Camera</Text>
            </TouchableOpacity>
          </View>
        </View>

        {submitting ? (
          <Text style={[styles.progressCount, { color: colors.text }]}>Dang xu ly: {capturedCount}/{REQUIRED_FACE_PHOTOS}</Text>
        ) : (
          <Text style={[styles.progressCount, { color: colors.text }]}>Da chup: {capturedCount}/{REQUIRED_FACE_PHOTOS}</Text>
        )}
        {!cameraReady ? (
          <Text style={[styles.progress, { color: colors.textMuted }]}>Dang khoi tao camera...</Text>
        ) : null}
        <Text style={[styles.progress, { color: submitting ? colors.text : colors.textMuted }]}>{scanHint}</Text>

        <PrimaryButton
          title={actionTitle}
          onPress={scanAndRegister}
          disabled={submitting || !userId}
        />
        {capturedCount > 0 && !submitting ? (
          <PrimaryButton title="Chup lai tu dau" variant="secondary" onPress={resetCapture} />
        ) : null}
      </AnimatedCard>
      <Text style={[styles.note, { color: colors.textMuted }]}>Goi y: giu mat ro, du sang va di chuyen dau nhe theo tung huong.</Text>
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
    height: 352,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#B8325E',
  },
  poseLabel: {
    position: 'absolute',
    top: 12,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  scanStage: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraCircle: {
    width: CAMERA_CIRCLE_SIZE,
    height: CAMERA_CIRCLE_SIZE,
    borderRadius: CAMERA_CIRCLE_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#111111',
  },
  camera: {
    flex: 1,
  },
  progressRing: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringTickSlot: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
  },
  ringTick: {
    width: 3,
    height: 13,
    borderRadius: 2,
  },
  scanSweep: {
    position: 'absolute',
    width: RING_SIZE - 4,
    height: RING_SIZE - 4,
    borderRadius: (RING_SIZE - 4) / 2,
    borderWidth: 4,
    borderColor: 'transparent',
    borderTopColor: '#89FFF6',
    borderRightColor: '#89FFF6',
  },
  innerGuide: {
    position: 'absolute',
    width: CAMERA_CIRCLE_SIZE + 6,
    height: CAMERA_CIRCLE_SIZE + 6,
    borderRadius: (CAMERA_CIRCLE_SIZE + 6) / 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.72)',
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
  progressCount: {
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  progress: {
    lineHeight: 20,
  },
  note: {
    lineHeight: 20,
  },
});
