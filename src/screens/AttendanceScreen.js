import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import ScreenContainer from '../components/ScreenContainer';
import PrimaryButton from '../components/PrimaryButton';
import FloatingField from '../components/FloatingField';
import { attendanceAPI, faceAPI, unwrapResponse } from '../services/api';
import useAppTheme from '../theme/useAppTheme';
import AnimatedCard from '../components/AnimatedCard';

export default function AttendanceScreen() {
  const { colors, radius } = useAppTheme();
  const [employeeId, setEmployeeId] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [recognizing, setRecognizing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      const recognizedEmployeeId = payload.employee_id || payload.employee?.id || payload.id;

      if (!recognizedEmployeeId) {
        Alert.alert('Không nhận diện được', 'Không tìm thấy employee_id trong kết quả nhận diện.');
        return;
      }

      setEmployeeId(String(recognizedEmployeeId));
      Alert.alert('Thành công', `Đã nhận diện nhân viên #${recognizedEmployeeId}`);
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể nhận diện khuôn mặt.');
    } finally {
      setRecognizing(false);
    }
  };

  const doCheckIn = async () => {
    if (!employeeId.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập hoặc nhận diện employee_id.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await attendanceAPI.checkIn({ employee_id: employeeId.trim() });
      Alert.alert('Thành công', response.data?.message || 'Check-in thành công');
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể check-in');
    } finally {
      setSubmitting(false);
    }
  };

  const doCheckOut = async () => {
    if (!employeeId.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập hoặc nhận diện employee_id.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await attendanceAPI.checkOut({ employee_id: employeeId.trim() });
      Alert.alert('Thành công', response.data?.message || 'Check-out thành công');
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể check-out');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: colors.text }]}>Check-in / Check-out</Text>
      <AnimatedCard style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]}>
        <FloatingField
          label="Ma nhan vien (employee_id)"
          value={employeeId}
          onChangeText={setEmployeeId}
        />
        <PrimaryButton title="Chọn ảnh khuôn mặt" variant="secondary" onPress={pickImage} />
        {selectedImage?.uri ? <Image source={{ uri: selectedImage.uri }} style={[styles.preview, { borderColor: colors.border, borderRadius: radius.sm }]} /> : null}
        <PrimaryButton
          title={recognizing ? 'Đang nhận diện...' : 'Nhận diện từ ảnh'}
          onPress={recognizeFace}
          disabled={!selectedImage?.uri || recognizing}
        />
      </AnimatedCard>
      <PrimaryButton title={submitting ? 'Đang xử lý...' : 'Check-in'} onPress={doCheckIn} disabled={!employeeId.trim() || submitting} />
      <PrimaryButton title={submitting ? 'Đang xử lý...' : 'Check-out'} variant="secondary" onPress={doCheckOut} disabled={!employeeId.trim() || submitting} />
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
});
