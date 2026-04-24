import React, { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import InfoCard from '../components/InfoCard';
import PrimaryButton from '../components/PrimaryButton';
import DetailModal from '../components/DetailModal';
import FloatingField from '../components/FloatingField';
import { departmentsAPI, unwrapResponse } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { validateRequired } from '../utils/validators';
import useAppTheme from '../theme/useAppTheme';
import AnimatedCard from '../components/AnimatedCard';

export default function DepartmentManagementScreen() {
  const { colors, radius } = useAppTheme();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [managerId, setManagerId] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [enteredIds, setEnteredIds] = useState({});
  const [animatedIds, setAnimatedIds] = useState({});

  const isAdmin = user?.role === 'admin';

  const getApiErrorMessage = (error, fallbackMessage) => {
    const data = error?.response?.data;
    if (!data) {
      return fallbackMessage;
    }
    if (typeof data?.message === 'string' && data.message.trim()) {
      return data.message;
    }
    if (typeof data?.detail === 'string' && data.detail.trim()) {
      return data.detail;
    }
    if (Array.isArray(data?.non_field_errors) && data.non_field_errors.length > 0) {
      return String(data.non_field_errors[0]);
    }
    if (typeof data === 'object') {
      for (const value of Object.values(data)) {
        if (Array.isArray(value) && value.length > 0) {
          return String(value[0]);
        }
        if (typeof value === 'string' && value.trim()) {
          return value;
        }
      }
    }
    return fallbackMessage;
  };

  const parseManagerId = () => {
    const raw = managerId.trim();
    if (!raw) {
      return null;
    }
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return undefined;
    }
    return parsed;
  };

  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 45,
  });

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (!Array.isArray(viewableItems)) {
      return;
    }
    setEnteredIds((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const entry of viewableItems) {
        const id = entry?.item?.id;
        if (id == null) {
          continue;
        }
        const key = String(id);
        if (!next[key]) {
          next[key] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }).current;

  const loadData = async () => {
    setRefreshing(true);
    try {
      const response = await departmentsAPI.getAll();
      const data = unwrapResponse(response);
      setItems(Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createDepartment = async () => {
    const validationError = validateRequired({ 'Tên phòng ban': name });
    if (validationError) {
      Alert.alert('Thiếu thông tin', validationError);
      return;
    }

    const parsedManagerId = parseManagerId();
    if (parsedManagerId === undefined) {
      Alert.alert('Manager ID không hợp lệ', 'Manager ID phải là số nguyên dương (employee PK ID).');
      return;
    }

    const payload = { name: name.trim() };
    if (parsedManagerId !== null) {
      payload.manager = parsedManagerId;
    }

    try {
      await departmentsAPI.create(payload);
      setName('');
      setManagerId('');
      await loadData();
      Alert.alert('Thành công', 'Đã tạo phòng ban');
    } catch (error) {
      Alert.alert('Lỗi', getApiErrorMessage(error, 'Không thể tạo phòng ban'));
    }
  };

  const startEditDepartment = (department) => {
    setEditingDepartment(department);
    setName(String(department.name || ''));
    setManagerId(department.manager ? String(department.manager) : '');
  };

  const cancelEdit = () => {
    setEditingDepartment(null);
    setName('');
    setManagerId('');
  };

  const updateDepartment = async () => {
    if (!editingDepartment) {
      return;
    }

    const validationError = validateRequired({ 'Tên phòng ban': name });
    if (validationError) {
      Alert.alert('Thiếu thông tin', validationError);
      return;
    }

    const parsedManagerId = parseManagerId();
    if (parsedManagerId === undefined) {
      Alert.alert('Manager ID không hợp lệ', 'Manager ID phải là số nguyên dương (employee PK ID).');
      return;
    }

    const payload = {
      name: name.trim(),
      // Allow clearing manager by submitting null explicitly.
      manager: parsedManagerId,
    };

    try {
      await departmentsAPI.update(editingDepartment.id, payload);
      Alert.alert('Thành công', 'Đã cập nhật phòng ban.');
      cancelEdit();
      await loadData();
    } catch (error) {
      Alert.alert('Lỗi', getApiErrorMessage(error, 'Không thể cập nhật phòng ban.'));
    }
  };

  const deleteDepartment = async (department) => {
    if ((department?.employee_count || 0) > 0) {
      Alert.alert('Không thể xóa', 'Phòng ban đang có nhân viên hoạt động. Hãy chuyển hoặc vô hiệu hóa nhân viên trước khi xóa.');
      return;
    }

    Alert.alert('Xác nhận xóa', `Bạn có chắc muốn xóa phòng ban ${department.name}?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await departmentsAPI.delete(department.id);
            Alert.alert('Thành công', 'Đã xóa phòng ban.');
            if (editingDepartment?.id === department.id) {
              cancelEdit();
            }
            await loadData();
          } catch (error) {
            Alert.alert('Lỗi', getApiErrorMessage(error, 'Không thể xóa phòng ban.'));
          }
        },
      },
    ]);
  };

  if (!isAdmin) {
    return (
      <ScreenContainer>
        <Text style={styles.denied}>Chỉ admin mới có quyền quản lý phòng ban.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfigRef.current}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Text style={[styles.title, { color: colors.text }]}>Phong ban</Text>
            <AnimatedCard style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]}>
              <FloatingField
                label="Ten phong ban"
                value={name}
                onChangeText={setName}
              />
              <FloatingField
                label="Manager ID (tuy chon)"
                value={managerId}
                onChangeText={setManagerId}
                keyboardType="number-pad"
              />
              <PrimaryButton
                title={editingDepartment ? 'Lưu cập nhật phòng ban' : 'Tạo phòng ban'}
                onPress={editingDepartment ? updateDepartment : createDepartment}
                disabled={!name.trim()}
              />
              {editingDepartment ? (
                <PrimaryButton title="Hủy chỉnh sửa" variant="secondary" onPress={cancelEdit} />
              ) : null}
            </AnimatedCard>
          </View>
        }
        renderItem={({ item, index }) => (
          <InfoCard
            animationIndex={index}
            playAnimation={Boolean(enteredIds[String(item.id)]) && !animatedIds[String(item.id)]}
            onAnimationDone={() => setAnimatedIds((prev) => ({ ...prev, [String(item.id)]: true }))}
            title={item.name}
            right={
              <View style={styles.actions}>
                <PrimaryButton title="Sửa" onPress={() => startEditDepartment(item)} />
                <PrimaryButton
                  title="Xóa"
                  variant="secondary"
                  onPress={() => deleteDepartment(item)}
                  disabled={(item.employee_count || 0) > 0}
                />
              </View>
            }
          />
        )}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>Không có phòng ban.</Text>}
        contentContainerStyle={styles.list}
      />
      <DetailModal
        visible={Boolean(selectedDepartment)}
        title="Chi tiết phòng ban"
        onClose={() => setSelectedDepartment(null)}
        details={
          selectedDepartment
            ? [
                { label: 'ID', value: String(selectedDepartment.id || '--') },
                { label: 'Tên phòng ban', value: selectedDepartment.name || '--' },
                { label: 'Manager ID', value: String(selectedDepartment.manager || '--') },
              ]
            : []
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800' },
  denied: { fontSize: 16 },
  headerWrap: { gap: 12, marginBottom: 14 },
  form: {
    gap: 8,
    borderWidth: 1,
    padding: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  list: { gap: 10, paddingBottom: 30 },
  empty: {},
  actions: {
    width: 130,
    gap: 8,
  },
});
