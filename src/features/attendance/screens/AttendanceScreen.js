import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import ScreenContainer from '../../../shared/components/ScreenContainer';
import PrimaryButton from '../../../shared/components/PrimaryButton';
import FloatingField from '../../../shared/components/FloatingField';
import { faceAPI, unwrapResponse } from '../../../core/api/api';
import useAppTheme from '../../../shared/theme/useAppTheme';
import AnimatedCard from '../../../shared/components/AnimatedCard';
import { getApiErrorMessage } from '../../../shared/utils/apiError';

export default function AttendanceScreen() {
  const { colors, radius } = useAppTheme();
  const [employeeId, setEmployeeId] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [recognizing, setRecognizing] = useState(false);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Thiếu quyền', 'Vui lòng cấp quyền truy cập ảnh để nhận diện khuôn mặt.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      setSelectedImage(result.assets[0]);
    }
  };

  const recognizeFace = async () => {
    if (!selectedImage?.uri) {
      Alert.alert('Thiếu ảnh', 'Vui lòng chọn ảnh khuôn mặt trước khi nhận diện.');
      return;
    }

    setRecognizing(true);
    try {
      const response = await faceAPI.recognize({
        uri: selectedImage.uri,
        type: selectedImage.mimeType || 'image/jpeg',
        name: selectedImage.fileName || `face-${Date.now()}.jpg`,
      });
      const payload = unwrapResponse(response) || {};
      const recognizedEmployeeId = (
        payload.employee_code
        || payload.employee_id
        || payload.employee?.id
        || payload.id
      );

      if (!recognizedEmployeeId) {
        Alert.alert('Không nhận diện được', 'Không tìm thấy mã nhân viên trong kết quả nhận diện.');
        return;
      }

      setEmployeeId(String(recognizedEmployeeId));
      Alert.alert(
        payload.attendance_action === 'check_out'
          ? 'Checkout thành công'
          : 'Check-in thành công',
        payload.attendance_message
          || `Đã chấm công cho nhân viên ${recognizedEmployeeId}.`,
      );
    } catch (error) {
      Alert.alert(
        'Chấm công không thành công',
        getApiErrorMessage(error, 'Không thể nhận diện khuôn mặt.'),
      );
    } finally {
      setRecognizing(false);
    }
  };

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: colors.text }]}>Chấm công vào / ra</Text>
      <AnimatedCard style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]}>
        <FloatingField
          label="Mã nhân viên"
          value={employeeId}
          editable={false}
        />
        <PrimaryButton title="Chọn ảnh khuôn mặt" variant="secondary" onPress={pickImage} />
        {selectedImage?.uri ? <Image source={{ uri: selectedImage.uri }} style={[styles.preview, { borderColor: colors.border, borderRadius: radius.sm }]} /> : null}
        <PrimaryButton
          title={recognizing ? 'Đang chấm công...' : 'Nhận diện và chấm công'}
          onPress={recognizeFace}
          disabled={!selectedImage?.uri || recognizing}
        />
      </AnimatedCard>
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Hệ thống tự động check-in khi chưa có ca đang mở và checkout khi đã đến giờ kết thúc ca.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  card: {
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  preview: {
    width: '100%',
    height: 220,
    borderWidth: 1,
    marginTop: 6,
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
  },
});
