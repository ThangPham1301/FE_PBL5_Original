import React, { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../../shared/components/ScreenContainer';
import InfoCard from '../../../shared/components/InfoCard';
import PrimaryButton from '../../../shared/components/PrimaryButton';
import DetailModal from '../../../shared/components/DetailModal';
import FloatingField from '../../../shared/components/FloatingField';
import { departmentsAPI, employeeAPI, unwrapResponse } from '../../../core/api/api';
import { useAuth } from '../../../application/providers/AuthContext';
import { minLength, validateRequired } from '../../../shared/utils/validators';
import useAppTheme from '../../../shared/theme/useAppTheme';
import AnimatedCard from '../../../shared/components/AnimatedCard';

const ROLE_OPTIONS = [
  { value: 'employee', label: 'Nhân viên' },
  { value: 'manager', label: 'Quản lý' },
];

const getRoleLabel = (role) => ROLE_OPTIONS.find((option) => option.value === role)?.label || '--';

const getApiErrorMessage = (error, fallbackMessage) => {
  const data = error?.response?.data;
  if (!data) {
    return error?.message || fallbackMessage;
  }
  if (typeof data.message === 'string' && data.message.trim()) {
    return data.message;
  }
  if (typeof data.detail === 'string' && data.detail.trim()) {
    return data.detail;
  }

  const findFirstMessage = (value) => {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        const message = findFirstMessage(item);
        if (message) {
          return message;
        }
      }
    }
    if (value && typeof value === 'object') {
      for (const item of Object.values(value)) {
        const message = findFirstMessage(item);
        if (message) {
          return message;
        }
      }
    }
    return null;
  };

  return findFirstMessage(data) || fallbackMessage;
};

function SelectGroup({ label, options, value, onChange, colors }) {
  return (
    <View style={styles.selectWrap}>
      <Text style={[styles.selectLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={styles.selectOptions}>
        {options.map((option) => {
          const selected = String(value || '') === String(option.value);
          return (
            <Pressable
              key={String(option.value)}
              onPress={() => onChange(option.value)}
              style={[
                styles.selectOption,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primarySoft : colors.bgSoft,
                },
              ]}
            >
              <Text style={[styles.selectOptionText, { color: selected ? colors.primary : colors.text }]}>
                {option.label}
              </Text>
              {selected ? <Ionicons name="checkmark-circle" size={16} color={colors.primary} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function AdminEmployeesScreen() {
  const { colors, radius } = useAppTheme();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [enteredIds, setEnteredIds] = useState({});
  const [animatedIds, setAnimatedIds] = useState({});
  const [form, setForm] = useState({
    username: '',
    password: '',
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    departmentId: '',
    role: 'employee',
    phone: '',
  });

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

  const canManage = user?.role === 'admin';

  const sortEmployeesNewestFirst = (employeeList) => {
    if (!Array.isArray(employeeList)) {
      return [];
    }

    return [...employeeList].sort((left, right) => Number(right?.id || 0) - Number(left?.id || 0));
  };

  const resetForm = () => {
    setForm({
      username: '',
      password: '',
      employeeId: '',
      firstName: '',
      lastName: '',
      email: '',
      departmentId: '',
      role: 'employee',
      phone: '',
    });
    setEditingEmployee(null);
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormVisible(true);
  };

  const closeForm = () => {
    resetForm();
    setIsFormVisible(false);
  };

  const loadData = async () => {
    setRefreshing(true);
    try {
      const [employeeResponse, departmentResponse] = await Promise.all([
        employeeAPI.getAll(),
        departmentsAPI.getAll(),
      ]);
      const data = unwrapResponse(employeeResponse);
      const departmentData = unwrapResponse(departmentResponse);
      const rawItems = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      const rawDepartments = Array.isArray(departmentData?.results)
        ? departmentData.results
        : Array.isArray(departmentData)
          ? departmentData
          : [];
      setItems(sortEmployeesNewestFirst(rawItems));
      setDepartments(rawDepartments);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createEmployee = async () => {
    const validationError = validateRequired({
      'Tên đăng nhập': form.username,
      'Mật khẩu': form.password,
      'Mã nhân viên': form.employeeId,
      'Họ': form.firstName,
      'Tên': form.lastName,
    });

    if (validationError) {
      Alert.alert('Thiếu thông tin', validationError);
      return;
    }

    if (!minLength(form.password, 6)) {
      Alert.alert('Mật khẩu yếu', 'Mật khẩu cần tối thiểu 6 ký tự.');
      return;
    }

    const payload = {
      user: {
        username: form.username.trim(),
        password: form.password,
        role: form.role,
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim(),
      },
      employee_id: form.employeeId.trim(),
      phone: form.phone.trim(),
    };

    const departmentId = form.departmentId.trim();
    if (departmentId) {
      payload.department = Number(departmentId);
    } else {
      payload.department = null;
    }

    try {
      await employeeAPI.create(payload);
      Alert.alert('Thành công', 'Đã tạo nhân viên');
      closeForm();
      await loadData();
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tạo nhân viên. Kiểm tra payload theo serializer BE.');
    }
  };

  const startEdit = (employee) => {
    setIsFormVisible(true);
    setEditingEmployee(employee);
    setForm({
      username: employee.user?.username || '',
      password: '',
      employeeId: employee.employee_id || '',
      firstName: employee.user?.first_name || '',
      lastName: employee.user?.last_name || '',
      email: employee.user?.email || '',
      departmentId: employee.department ? String(employee.department) : '',
      role: employee.user?.role === 'manager' ? 'manager' : 'employee',
      phone: employee.phone || '',
    });
  };

  const updateEmployee = async () => {
    if (!editingEmployee) {
      return;
    }

    const validationError = validateRequired({
      'Tên đăng nhập': form.username,
      'Mã nhân viên': form.employeeId,
      'Họ': form.firstName,
      'Tên': form.lastName,
    });

    if (validationError) {
      Alert.alert('Thiếu thông tin', validationError);
      return;
    }

    const payload = {
      employee_id: form.employeeId.trim(),
      phone: form.phone.trim(),
      user: {
        username: form.username.trim(),
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim(),
        role: form.role,
      },
    };

    if (form.password.trim()) {
      payload.user.password = form.password;
    }
    const departmentId = form.departmentId.trim();
    if (departmentId) {
      payload.department = Number(departmentId);
    } else {
      payload.department = null;
    }

    try {
      await employeeAPI.update(editingEmployee.id, payload);
      Alert.alert('Thành công', 'Đã cập nhật nhân viên.');
      closeForm();
    } catch (error) {
      console.error('[AdminEmployees] Update failed:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
      });
      Alert.alert('Lỗi', getApiErrorMessage(error, 'Không thể cập nhật nhân viên.'));
      return;
    }

    try {
      await loadData();
    } catch (error) {
      console.error('[AdminEmployees] Reload after update failed:', error);
    }
  };

  const deleteEmployee = async (employee) => {
    Alert.alert('Xác nhận xóa', `Bạn có chắc muốn xóa nhân viên ${employee.employee_id}?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await employeeAPI.delete(employee.id);
            if (editingEmployee?.id === employee.id) {
              closeForm();
            }
            Alert.alert('Thành công', 'Đã xóa nhân viên.');
            await loadData();
          } catch (error) {
            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xóa nhân viên.');
          }
        },
      },
    ]);
  };

  if (!canManage) {
    return (
      <ScreenContainer>
        <Text style={styles.denied}>Bạn không có quyền truy cập màn hình này.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.screenBody}>
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfigRef.current}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
          ListHeaderComponent={
            <View style={styles.headerWrap}>
              <Text style={[styles.title, { color: colors.text }]}>Quản lý nhân viên</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Pressable onPress={() => setSelectedEmployee(item)}>
              <InfoCard
                animationIndex={index}
                playAnimation={Boolean(enteredIds[String(item.id)]) && !animatedIds[String(item.id)]}
                onAnimationDone={() => setAnimatedIds((prev) => ({ ...prev, [String(item.id)]: true }))}
                title={`${item.employee_id} - ${item.full_name || `${item.user?.first_name || ''} ${item.user?.last_name || ''}`.trim() || item.user?.username || 'N/A'}`}
                subtitle={`${item.department_name || 'Chưa có phòng ban'} | ${getRoleLabel(item.user?.role)}`}
                right={
                  <View style={styles.actions}>
                    <PrimaryButton title="Sửa" onPress={() => startEdit(item)} />
                    <PrimaryButton title="Xóa" variant="secondary" onPress={() => deleteEmployee(item)} />
                  </View>
                }
              />
            </Pressable>
          )}
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>Không có dữ liệu nhân viên.</Text>}
          contentContainerStyle={styles.list}
        />

        {!isFormVisible ? (
          <Pressable
            onPress={openCreateForm}
            style={[
              styles.fab,
              {
                backgroundColor: colors.primary,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </Pressable>
        ) : null}
      </View>

      <Modal animationType="fade" transparent visible={isFormVisible} onRequestClose={closeForm}>
        <Pressable style={styles.modalOverlay} onPress={closeForm}>
          <View style={styles.modalContentWrap}>
            <Pressable onPress={(event) => event.stopPropagation()}>
              <AnimatedCard style={[styles.formModal, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {editingEmployee ? 'Chỉnh sửa nhân viên' : 'Tạo nhân viên'}
                </Text>
                <Pressable onPress={closeForm} hitSlop={10} style={styles.closeButton}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScrollContent}>
                <FloatingField
                  label="Tên đăng nhập"
                  value={form.username}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, username: value }))}
                  autoCapitalize="none"
                />
                <FloatingField
                  label={editingEmployee ? 'Mật khẩu mới (để trống nếu giữ nguyên)' : 'Mật khẩu'}
                  value={form.password}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, password: value }))}
                  secureTextEntry
                />
                <FloatingField
                  label="Mã nhân viên"
                  value={form.employeeId}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, employeeId: value }))}
                />
                <View style={styles.row}>
                  <FloatingField
                    label="Họ"
                    containerStyle={styles.halfInput}
                    value={form.firstName}
                    onChangeText={(value) => setForm((prev) => ({ ...prev, firstName: value }))}
                  />
                  <FloatingField
                    label="Tên"
                    containerStyle={styles.halfInput}
                    value={form.lastName}
                    onChangeText={(value) => setForm((prev) => ({ ...prev, lastName: value }))}
                  />
                </View>
                <FloatingField
                  label="Email"
                  value={form.email}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, email: value }))}
                  keyboardType="email-address"
                />
                <SelectGroup
                  label="Phòng ban"
                  colors={colors}
                  value={form.departmentId}
                  onChange={(value) => setForm((prev) => ({ ...prev, departmentId: String(value) }))}
                  options={[
                    { value: '', label: 'Chưa chọn' },
                    ...departments.map((department) => ({
                      value: String(department.id),
                      label: department.name,
                    })),
                  ]}
                />
                <SelectGroup
                  label="Chức vụ"
                  colors={colors}
                  value={form.role}
                  onChange={(value) => setForm((prev) => ({ ...prev, role: value }))}
                  options={ROLE_OPTIONS}
                />
                <FloatingField
                  label="Số điện thoại"
                  value={form.phone}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))}
                  keyboardType="phone-pad"
                />

                <PrimaryButton
                  title={editingEmployee ? 'Lưu cập nhật nhân viên' : 'Tạo nhân viên'}
                  onPress={editingEmployee ? updateEmployee : createEmployee}
                  disabled={!form.username || !form.employeeId || !form.firstName || !form.lastName}
                />
                <PrimaryButton
                  title={editingEmployee ? 'Hủy chỉnh sửa' : 'Đóng biểu mẫu'}
                  variant="secondary"
                  onPress={closeForm}
                />
              </ScrollView>
            </AnimatedCard>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <DetailModal
        visible={Boolean(selectedEmployee)}
        title="Chi tiết nhân viên"
        onClose={() => setSelectedEmployee(null)}
        details={
          selectedEmployee
            ? [
                { label: 'Mã nhân viên', value: selectedEmployee.employee_id || '--' },
                { label: 'Tên đăng nhập', value: selectedEmployee.user?.username || '--' },
                { label: 'Họ tên', value: `${selectedEmployee.user?.first_name || ''} ${selectedEmployee.user?.last_name || ''}`.trim() || '--' },
                { label: 'Email', value: selectedEmployee.user?.email || '--' },
                { label: 'Phòng ban', value: selectedEmployee.department_name || '--' },
                { label: 'Chức vụ', value: getRoleLabel(selectedEmployee.user?.role) },
                { label: 'Điện thoại', value: selectedEmployee.phone || '--' },
              ]
            : []
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenBody: {
    flex: 1,
  },
  title: { fontSize: 20, fontWeight: '800' },
  denied: { fontSize: 16 },
  headerWrap: { gap: 12, marginBottom: 14 },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  halfInput: {
    flex: 1,
  },
  selectWrap: {
    gap: 6,
  },
  selectLabel: {
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 2,
  },
  selectOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectOption: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectOptionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  list: { gap: 10, paddingBottom: 30 },
  empty: {},
  actions: {
    width: 130,
    gap: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    elevation: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContentWrap: {
    width: '100%',
  },
  formModal: {
    borderWidth: 1,
    padding: 14,
    gap: 12,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formScrollContent: {
    gap: 8,
    paddingBottom: 4,
  },
});
