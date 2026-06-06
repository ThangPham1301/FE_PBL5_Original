import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import ScreenContainer from '../../../shared/components/ScreenContainer';
import PrimaryButton from '../../../shared/components/PrimaryButton';
import FloatingField from '../../../shared/components/FloatingField';
import { faceAPI } from '../../../core/api/api';
import { useAuth } from '../../../application/providers/AuthContext';
import useAppTheme from '../../../shared/theme/useAppTheme';
import AnimatedCard from '../../../shared/components/AnimatedCard';

const FACE_CAPTURE_STEPS = [
  { pose: 'front', title: 'Chính diện', hint: 'Nhìn thẳng vào camera và giữ mặt trong vòng tròn.' },
  { pose: 'left', title: 'Quay trái', hint: 'Quay nhẹ mặt sang trái, vẫn giữ mặt trong vòng tròn.' },
  { pose: 'right', title: 'Quay phải', hint: 'Quay nhẹ mặt sang phải, vẫn giữ mặt trong vòng tròn.' },
  { pose: 'up', title: 'Ngửa lên', hint: 'Ngửa mặt lên nhẹ, không đưa mặt ra khỏi vòng tròn.' },
  { pose: 'down', title: 'Cúi xuống', hint: 'Cúi mặt xuống nhẹ, giữ mặt rõ và đủ sáng.' },
];

const REQUIRED_FACE_PHOTOS = FACE_CAPTURE_STEPS.length;
const RING_TICK_COUNT = 80;
const RING_SIZE = 266;
const CAMERA_CIRCLE_SIZE = 238;
const CENTER_DETECTION_BOX = {
  left: 45,
  top: 32,
  width: 148,
  height: 174,
};
const POSE_LANDMARK_GUIDES = {
  front: [
    { x: 0.35, y: 0.32 },
    { x: 0.65, y: 0.32 },
    { x: 0.5, y: 0.5 },
    { x: 0.38, y: 0.72 },
    { x: 0.62, y: 0.72 },
  ],
  left: [
    { x: 0.34, y: 0.33 },
    { x: 0.58, y: 0.31 },
    { x: 0.4, y: 0.5 },
    { x: 0.34, y: 0.71 },
    { x: 0.55, y: 0.7 },
  ],
  right: [
    { x: 0.42, y: 0.31 },
    { x: 0.66, y: 0.33 },
    { x: 0.6, y: 0.5 },
    { x: 0.45, y: 0.7 },
    { x: 0.66, y: 0.71 },
  ],
  up: [
    { x: 0.35, y: 0.38 },
    { x: 0.65, y: 0.38 },
    { x: 0.5, y: 0.58 },
    { x: 0.38, y: 0.78 },
    { x: 0.62, y: 0.78 },
  ],
  down: [
    { x: 0.35, y: 0.26 },
    { x: 0.65, y: 0.26 },
    { x: 0.5, y: 0.44 },
    { x: 0.38, y: 0.63 },
    { x: 0.62, y: 0.63 },
  ],
};

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

function FaceLandmarkOverlay({ overlay, mirrored, pose }) {
  const guideLandmarks = POSE_LANDMARK_GUIDES[pose] || POSE_LANDMARK_GUIDES.front;
  const hasActualLandmarks = overlay?.frameSize?.width && overlay?.frameSize?.height && overlay.landmarks?.length;
  const frameWidth = hasActualLandmarks ? overlay.frameSize.width : 1;
  const frameHeight = hasActualLandmarks ? overlay.frameSize.height : 1;
  const scale = Math.max(CAMERA_CIRCLE_SIZE / frameWidth, CAMERA_CIRCLE_SIZE / frameHeight);
  const displayWidth = frameWidth * scale;
  const displayHeight = frameHeight * scale;
  const offsetX = (CAMERA_CIRCLE_SIZE - displayWidth) / 2;
  const offsetY = (CAMERA_CIRCLE_SIZE - displayHeight) / 2;
  const mapActualX = (x) => {
    const mapped = offsetX + x * frameWidth * scale;
    return mirrored ? CAMERA_CIRCLE_SIZE - mapped : mapped;
  };
  const mapActualY = (y) => offsetY + y * frameHeight * scale;
  const mapGuideX = (x) => CENTER_DETECTION_BOX.left + x * CENTER_DETECTION_BOX.width;
  const mapGuideY = (y) => CENTER_DETECTION_BOX.top + y * CENTER_DETECTION_BOX.height;

  return (
    <View style={styles.landmarkLayer} pointerEvents="none">
      <View style={[styles.centerDetectionBox, CENTER_DETECTION_BOX]} />
      {guideLandmarks.map((point, index) => (
        <View
          key={`guide-${pose}-${index}`}
          style={[
            styles.guideLandmarkDot,
            {
              left: mapGuideX(point.x) - 4,
              top: mapGuideY(point.y) - 4,
            },
          ]}
        />
      ))}
      {hasActualLandmarks
        ? overlay.landmarks.map((point, index) => (
            <View
              key={`actual-${point.x}-${point.y}-${index}`}
              style={[
                styles.landmarkDot,
                {
                  left: mapActualX(point.x) - 4,
                  top: mapActualY(point.y) - 4,
                },
              ]}
            />
          ))
        : null}
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
  const [faceOverlay, setFaceOverlay] = useState(null);
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

  useEffect(() => {
    setFaceOverlay(null);
  }, [currentStep.pose]);

  const withTimeout = (promise, ms, message) =>
    Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);

  const scanAndRegister = () => {
    if (!userId) {
      Alert.alert('Không thể đăng ký', 'Tài khoản hiện tại chưa liên kết nhân viên.');
      return;
    }

    if (capturedCount > 0) {
      captureCurrentPose();
      return;
    }

    Alert.alert(
      'Xác nhận đăng ký khuôn mặt',
      'Bạn sẽ chụp lần lượt 5 góc: chính diện, trái, phải, lên, xuống. Dữ liệu cũ sẽ bị xóa sau khi gửi thành công. Tiếp tục?',
      [
        { text: 'Hủy', onPress: () => {}, style: 'cancel' },
        { text: 'Tiếp tục', onPress: captureCurrentPose, style: 'default' },
      ]
    );
  };

  const submitRegistration = async (imagesToSubmit = capturedImages, posesToSubmit = capturedPoses) => {
    if (imagesToSubmit.length !== REQUIRED_FACE_PHOTOS || posesToSubmit.length !== REQUIRED_FACE_PHOTOS) {
      Alert.alert('Chưa đủ ảnh', `Cần chụp đủ ${REQUIRED_FACE_PHOTOS} ảnh trước khi gửi.`);
      return;
    }

    setSubmitting(true);
    setScanHint('Đã đủ 5 ảnh, đang gửi dữ liệu...');

    try {
      console.log('[FaceRegistration] Sending 5 pose images...', { poses: posesToSubmit });
      const response = await withTimeout(
        faceAPI.register(userId.trim(), imagesToSubmit, posesToSubmit),
        45000,
        'Gửi đăng ký quá lâu. Vui lòng kiểm tra kết nối máy chủ hoặc ChromaDB.'
      );
      const payload = response?.data || {};

      if (payload.success) {
        Alert.alert(
          'Thành công',
          `${payload.message || 'Đã đăng ký khuôn mặt hoàn tất.'}\n\nNhân viên: ${payload.employee_code || userId}\nSố ảnh: ${payload.image_count}`
        );
        setCapturedImages([]);
        setCapturedPoses([]);
        setCapturedCount(0);
        setFaceOverlay(null);
        setScanHint(FACE_CAPTURE_STEPS[0].hint);
      } else {
        Alert.alert('Thông báo', payload.message || 'Đăng ký khuôn mặt hoàn tất.');
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
      setScanHint('Gửi đăng ký thất bại. Bấm lại để gửi lại hoặc chụp lại từ đầu.');
      Alert.alert('Lỗi', message);
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
        Alert.alert('Thiếu quyền', 'Vui lòng cấp quyền camera để quét khuôn mặt.');
        return;
      }
    }

    if (!cameraRef.current) {
      Alert.alert('Camera chưa sẵn sàng', 'Vui lòng đợi camera khởi tạo rồi thử lại.');
      return;
    }

    setSubmitting(true);
    setScanHint(`Đang chụp góc ${currentStep.title}...`);

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
        'Camera chụp quá lâu. Vui lòng thử lại.'
      );

      if (!photo?.base64) {
        throw new Error('Không lấy được dữ liệu ảnh base64.');
      }

      setScanHint('Đang kiểm tra các điểm đặc trưng trên khuôn mặt...');
      const validationResponse = await withTimeout(
        faceAPI.validate(photo.base64, step.pose),
        20000,
        'Kiểm tra khuôn mặt quá lâu. Vui lòng thử lại.'
      );
      const validation = validationResponse?.data || {};
      if (validation.landmarks?.length) {
        setFaceOverlay({
          landmarks: validation.landmarks,
          faceBox: validation.face_box,
          frameSize: validation.frame_size,
        });
      } else {
        setFaceOverlay(null);
      }

      if (!validation.is_clear && !validation.can_capture) {
        const validationMessage = validation.message || 'Khuôn mặt chưa hợp lệ, vui lòng làm theo hướng dẫn và chụp lại.';
        setScanHint(validationMessage);
        Alert.alert('Chưa thể lưu ảnh', validationMessage);
        return;
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
        'Không thể chụp ảnh. Vui lòng thử lại.';
      Alert.alert('Lỗi', message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetCapture = () => {
    setCapturedImages([]);
    setCapturedPoses([]);
    setCapturedCount(0);
    setFaceOverlay(null);
    setScanHint(FACE_CAPTURE_STEPS[0].hint);
  };

  const actionTitle = submitting
    ? 'Đang xử lý...'
    : capturedCount >= REQUIRED_FACE_PHOTOS
      ? 'Gửi lại đăng ký khuôn mặt'
      : `Chụp ${currentStep.title}`;

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
          label="Mã người dùng từ tài khoản đăng nhập"
          value={userId}
          onChangeText={() => {}}
          editable={false}
        />
        <Text style={[styles.caption, { color: colors.textMuted }]}>Chụp 5 góc để nhận diện ổn định hơn khi chấm công.</Text>

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
              <FaceLandmarkOverlay overlay={faceOverlay} mirrored={facing === 'front'} pose={currentStep.pose} />
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
              <Text style={[styles.toggleButton, { color: '#FFFFFF' }]}>Xoay camera</Text>
            </TouchableOpacity>
          </View>
        </View>

        {submitting ? (
          <Text style={[styles.progressCount, { color: colors.text }]}>Đang xử lý: {capturedCount}/{REQUIRED_FACE_PHOTOS}</Text>
        ) : (
          <Text style={[styles.progressCount, { color: colors.text }]}>Đã chụp: {capturedCount}/{REQUIRED_FACE_PHOTOS}</Text>
        )}
        {!cameraReady ? (
          <Text style={[styles.progress, { color: colors.textMuted }]}>Đang khởi tạo camera...</Text>
        ) : null}
        <Text style={[styles.progress, { color: submitting ? colors.text : colors.textMuted }]}>{scanHint}</Text>

        <PrimaryButton
          title={actionTitle}
          onPress={scanAndRegister}
          disabled={submitting || !userId}
        />
        {capturedCount > 0 && !submitting ? (
          <PrimaryButton title="Chụp lại từ đầu" variant="secondary" onPress={resetCapture} />
        ) : null}
      </AnimatedCard>
      <Text style={[styles.note, { color: colors.textMuted }]}>Gợi ý: giữ mặt rõ, đủ sáng và di chuyển đầu nhẹ theo từng hướng.</Text>
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
    position: 'relative',
    backgroundColor: '#111111',
  },
  camera: {
    flex: 1,
  },
  landmarkLayer: {
    position: 'absolute',
    width: CAMERA_CIRCLE_SIZE,
    height: CAMERA_CIRCLE_SIZE,
    left: 0,
    top: 0,
  },
  centerDetectionBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#5DFFF2',
    borderRadius: 22,
    backgroundColor: 'rgba(93, 255, 242, 0.08)',
  },
  guideLandmarkDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#083C42',
    backgroundColor: '#5DFFF2',
  },
  landmarkDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#111111',
    backgroundColor: '#FFE45D',
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
