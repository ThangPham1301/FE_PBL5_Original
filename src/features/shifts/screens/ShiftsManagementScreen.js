import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import ScreenContainer from '../../../shared/components/ScreenContainer';
import InfoCard from '../../../shared/components/InfoCard';
import PrimaryButton from '../../../shared/components/PrimaryButton';
import FloatingField from '../../../shared/components/FloatingField';
import { employeeAPI, shiftsAPI, unwrapResponse } from '../../../core/api/api';
import { useAuth } from '../../../application/providers/AuthContext';
import useAppTheme from '../../../shared/theme/useAppTheme';
import AnimatedCard from '../../../shared/components/AnimatedCard';
import { getApiErrorMessage } from '../../../shared/utils/apiError';

const createTime = (hours, minutes) => new Date(2000, 0, 1, hours, minutes, 0, 0);

const formatTime = (value) => [
  String(value.getHours()).padStart(2, '0'),
  String(value.getMinutes()).padStart(2, '0'),
  '00',
].join(':');

const formatDate = (value) => [
  value.getFullYear(),
  String(value.getMonth() + 1).padStart(2, '0'),
  String(value.getDate()).padStart(2, '0'),
].join('-');

const getEmployeeLabel = (employee) => {
  const fullName = [
    employee?.user?.first_name,
    employee?.user?.last_name,
  ].filter(Boolean).join(' ').trim();
  return `${fullName || employee?.user?.username || 'Nhân viên'} (${employee.employee_id})`;
};

function PickerField({ label, value, placeholder, onPress, colors }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.floatingLabel, { color: colors.textMuted, backgroundColor: colors.card }]}>
        {label}
      </Text>
      <Pressable
        onPress={onPress}
        style={[styles.pickerField, { borderColor: colors.border, backgroundColor: colors.bgSoft }]}
      >
        <Text style={{ color: value ? colors.text : colors.textMuted }}>
          {value || placeholder}
        </Text>
        <Text style={[styles.pickerArrow, { color: colors.textMuted }]}>v</Text>
      </Pressable>
    </View>
  );
}

function OptionModal({ visible, title, options, selectedValue, onSelect, onClose, colors }) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={(event) => event.stopPropagation()}
        >
          <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
          <ScrollView contentContainerStyle={styles.optionList}>
            {options.map((option) => {
              const selected = String(option.value) === String(selectedValue);
              return (
                <Pressable
                  key={String(option.value)}
                  onPress={() => {
                    onSelect(String(option.value));
                    onClose();
                  }}
                  style={[
                    styles.option,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primarySoft : colors.bgSoft,
                    },
                  ]}
                >
                  <Text style={[styles.optionText, { color: selected ? colors.primary : colors.text }]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
            {options.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textMuted }]}>Không có dữ liệu để chọn.</Text>
            ) : null}
          </ScrollView>
          <PrimaryButton title="Đóng" variant="secondary" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function ShiftsManagementScreen() {
  const { colors, radius } = useAppTheme();
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';
  const isAdmin = user?.role === 'admin';

  const [items, setItems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState(() => createTime(8, 0));
  const [endTime, setEndTime] = useState(() => createTime(17, 0));
  const [lateThreshold, setLateThreshold] = useState('15');
  const [employeeId, setEmployeeId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(() => new Date());
  const [timePickerTarget, setTimePickerTarget] = useState(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [selectionTarget, setSelectionTarget] = useState(null);
  const [assignmentError, setAssignmentError] = useState('');
  const [enteredIds, setEnteredIds] = useState({});
  const [animatedIds, setAnimatedIds] = useState({});

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
      const [shiftResponse, employeeResponse, assignmentResponse] = await Promise.all([
        shiftsAPI.getAll({ page_size: 100 }),
        employeeAPI.getAll({ is_active: true, page_size: 100 }),
        shiftsAPI.getAssignments(),
      ]);
      const shiftData = unwrapResponse(shiftResponse);
      const employeeData = unwrapResponse(employeeResponse);
      const assignmentData = unwrapResponse(assignmentResponse);
      setItems(Array.isArray(shiftData?.results) ? shiftData.results : Array.isArray(shiftData) ? shiftData : []);
      setEmployees(
        Array.isArray(employeeData?.results)
          ? employeeData.results
          : Array.isArray(employeeData)
            ? employeeData
            : []
      );
      setAssignments(Array.isArray(assignmentData) ? assignmentData : []);
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải dữ liệu ca làm việc.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createShift = async () => {
    const trimmedName = name.trim();
    const threshold = Number(lateThreshold);
    if (!trimmedName) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên ca làm việc.');
      return;
    }
    if (!Number.isInteger(threshold) || threshold < 0) {
      Alert.alert('Dữ liệu không hợp lệ', 'Ngưỡng đi trễ phải là số nguyên không âm.');
      return;
    }
    if (startTime >= endTime) {
      Alert.alert('Thời gian không hợp lệ', 'Giờ kết thúc phải sau giờ bắt đầu.');
      return;
    }

    try {
      await shiftsAPI.create({
        name: trimmedName,
        start_time: formatTime(startTime),
        end_time: formatTime(endTime),
        late_threshold: threshold,
      });
      Alert.alert('Thành công', 'Đã tạo ca làm việc');
      setName('');
      setStartTime(createTime(8, 0));
      setEndTime(createTime(17, 0));
      setLateThreshold('15');
      await loadData();
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tạo ca làm việc');
    }
  };

  const assignShift = async () => {
    setAssignmentError('');
    if (!employeeId || !shiftId) {
      const message = 'Vui lòng chọn nhân viên và ca làm việc.';
      setAssignmentError(message);
      Alert.alert('Thiếu thông tin', message);
      return;
    }

    try {
      await shiftsAPI.assign({
        employee_id: Number(employeeId),
        shift_id: Number(shiftId),
        effective_date: formatDate(effectiveDate),
      });
      Alert.alert('Thành công', 'Đã gán ca cho nhân viên');
      setShiftId('');
      setEffectiveDate(new Date());
      await loadData();
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        'Ca làm việc không hợp lệ hoặc bị cấn giờ.'
      );
      setAssignmentError(message);
      Alert.alert(
        'Không thể gán ca',
        message
      );
    }
  };

  const removeAssignment = (assignment) => {
    Alert.alert(
      'Xóa ca của nhân viên',
      `Xóa ${assignment.shift_name} khỏi ${assignment.employee_name} từ ngày ${assignment.effective_date}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa ca',
          style: 'destructive',
          onPress: async () => {
            try {
              setAssignmentError('');
              await shiftsAPI.unassign(assignment.id);
              Alert.alert('Thành công', 'Đã xóa ca khỏi nhân viên.');
              await loadData();
            } catch (error) {
              const message = getApiErrorMessage(
                error,
                'Không thể xóa phân ca này.'
              );
              setAssignmentError(message);
              Alert.alert(
                'Không thể xóa ca',
                message
              );
            }
          },
        },
      ]
    );
  };

  const onTimeChange = (event, selectedTime) => {
    if (event?.type !== 'dismissed' && selectedTime && timePickerTarget) {
      const normalizedTime = createTime(selectedTime.getHours(), selectedTime.getMinutes());
      if (timePickerTarget === 'start') {
        setStartTime(normalizedTime);
      } else {
        setEndTime(normalizedTime);
      }
    }
    if (Platform.OS === 'android' || event?.type === 'dismissed' || selectedTime) {
      setTimePickerTarget(null);
    }
  };

  const onDateChange = (event, selectedDate) => {
    if (event?.type !== 'dismissed' && selectedDate) {
      setEffectiveDate(selectedDate);
      setAssignmentError('');
    }
    if (Platform.OS === 'android' || event?.type === 'dismissed' || selectedDate) {
      setDatePickerVisible(false);
    }
  };

  const employeeOptions = employees.map((employee) => ({
    value: employee.id,
    label: getEmployeeLabel(employee),
  }));
  const shiftOptions = items.map((shift) => ({
    value: shift.id,
    label: `${shift.name} (Check-in ${shift.start_time.slice(0, 5)} | Check-out ${shift.end_time.slice(0, 5)})`,
  }));
  const selectedEmployee = employeeOptions.find((option) => String(option.value) === employeeId);
  const selectedShift = shiftOptions.find((option) => String(option.value) === shiftId);
  const visibleAssignments = employeeId
    ? assignments.filter((assignment) => String(assignment.employee) === employeeId)
    : [];

  if (!isManagerOrAdmin) {
    return (
      <ScreenContainer>
        <Text style={styles.denied}>Bạn không có quyền truy cập màn hình này.</Text>
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
            <Text style={[styles.title, { color: colors.text }]}>Quản lý ca làm việc</Text>

            {isAdmin && (
              <AnimatedCard style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Tạo ca làm việc</Text>
                <FloatingField label="Tên ca" value={name} onChangeText={setName} />
                <PickerField
                  label="Thời gian check-in"
                  value={formatTime(startTime)}
                  onPress={() => setTimePickerTarget('start')}
                  colors={colors}
                />
                <PickerField
                  label="Thời gian check-out"
                  value={formatTime(endTime)}
                  onPress={() => setTimePickerTarget('end')}
                  colors={colors}
                />
                <FloatingField
                  label="Ngưỡng đi trễ (phút)"
                  value={lateThreshold}
                  onChangeText={setLateThreshold}
                  keyboardType="number-pad"
                />
                <PrimaryButton title="Tạo ca" onPress={createShift} disabled={!name.trim()} />
              </AnimatedCard>
            )}

            <AnimatedCard style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]} delay={60}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Gán ca cho nhân viên</Text>
              <PickerField
                label="Nhân viên"
                value={selectedEmployee?.label}
                placeholder="Chọn nhân viên"
                onPress={() => setSelectionTarget('employee')}
                colors={colors}
              />
              {assignmentError ? (
                <View style={[styles.errorBanner, { borderColor: colors.danger, backgroundColor: colors.bgSoft }]}>
                  <Text style={[styles.errorBannerTitle, { color: colors.danger }]}>
                    Không thể thực hiện
                  </Text>
                  <Text style={[styles.errorBannerText, { color: colors.text }]}>
                    {assignmentError}
                  </Text>
                </View>
              ) : null}
              {employeeId ? (
                <View style={styles.assignedSection}>
                  <Text style={[styles.assignedSectionTitle, { color: colors.text }]}>
                    Các ca của {selectedEmployee?.label}
                  </Text>
                  {visibleAssignments.length === 0 ? (
                    <Text style={[styles.assignmentHint, { color: colors.textMuted }]}>
                      Nhân viên chưa có ca làm việc.
                    </Text>
                  ) : (
                    visibleAssignments.map((assignment) => (
                      <View
                        key={String(assignment.id)}
                        style={[styles.assignmentRow, { borderColor: colors.border, backgroundColor: colors.bgSoft }]}
                      >
                        <View style={styles.assignmentInfo}>
                          <Text style={[styles.assignmentName, { color: colors.text }]}>
                            {assignment.shift_name}
                          </Text>
                          <Text style={[styles.assignmentMeta, { color: colors.textMuted }]}>
                            Check-in {String(assignment.check_in_time).slice(0, 5)} | Check-out {String(assignment.check_out_time).slice(0, 5)}
                          </Text>
                          <Text style={[styles.assignmentMeta, { color: colors.textMuted }]}>
                            Hiệu lực từ {assignment.effective_date}
                          </Text>
                        </View>
                        <PrimaryButton
                          title="Xóa ca"
                          variant="secondary"
                          onPress={() => removeAssignment(assignment)}
                        />
                      </View>
                    ))
                  )}
                </View>
              ) : null}
              <PickerField
                label="Ca làm việc"
                value={selectedShift?.label}
                placeholder="Chọn ca làm việc"
                onPress={() => setSelectionTarget('shift')}
                colors={colors}
              />
              <PickerField
                label="Ngày hiệu lực"
                value={formatDate(effectiveDate)}
                onPress={() => setDatePickerVisible(true)}
                colors={colors}
              />
              <PrimaryButton title="Gán ca" onPress={assignShift} disabled={!employeeId || !shiftId} />
            </AnimatedCard>
          </View>
        }
        renderItem={({ item, index }) => (
          <InfoCard
            animationIndex={index}
            playAnimation={Boolean(enteredIds[String(item.id)]) && !animatedIds[String(item.id)]}
            onAnimationDone={() => setAnimatedIds((prev) => ({ ...prev, [String(item.id)]: true }))}
            title={`${item.id} - ${item.name}`}
            subtitle={`Check-in: ${String(item.check_in_time || item.start_time).slice(0, 5)} | Check-out: ${String(item.check_out_time || item.end_time).slice(0, 5)} | Trễ sau: ${item.late_threshold} phút`}
          />
        )}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>Không có ca làm việc.</Text>}
        contentContainerStyle={styles.list}
      />

      {timePickerTarget ? (
        <DateTimePicker
          value={timePickerTarget === 'start' ? startTime : endTime}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimeChange}
        />
      ) : null}
      {datePickerVisible ? (
        <DateTimePicker
          value={effectiveDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      ) : null}
      <OptionModal
        visible={selectionTarget === 'employee'}
        title="Chọn nhân viên"
        options={employeeOptions}
        selectedValue={employeeId}
        onSelect={(value) => {
          setEmployeeId(value);
          setAssignmentError('');
        }}
        onClose={() => setSelectionTarget(null)}
        colors={colors}
      />
      <OptionModal
        visible={selectionTarget === 'shift'}
        title="Chọn ca làm việc"
        options={shiftOptions}
        selectedValue={shiftId}
        onSelect={(value) => {
          setShiftId(value);
          setAssignmentError('');
        }}
        onClose={() => setSelectionTarget(null)}
        colors={colors}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800' },
  sectionTitle: { fontWeight: '700' },
  denied: { fontSize: 16 },
  headerWrap: { gap: 12, marginBottom: 14 },
  form: {
    gap: 12,
    borderWidth: 1,
    padding: 12,
  },
  list: { gap: 10, paddingBottom: 30 },
  empty: { textAlign: 'center', paddingVertical: 12 },
  fieldWrap: {
    position: 'relative',
  },
  floatingLabel: {
    position: 'absolute',
    top: -8,
    left: 10,
    paddingHorizontal: 6,
    fontSize: 11,
    fontWeight: '700',
    zIndex: 1,
  },
  pickerField: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pickerArrow: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    maxHeight: '80%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  optionList: {
    gap: 8,
  },
  option: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  assignmentHint: {
    fontSize: 13,
    lineHeight: 19,
  },
  assignedSection: {
    gap: 8,
  },
  assignedSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  assignmentRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  assignmentInfo: {
    gap: 4,
  },
  assignmentName: {
    fontSize: 14,
    fontWeight: '800',
  },
  assignmentMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  errorBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  errorBannerText: {
    fontSize: 13,
    lineHeight: 19,
  },
});
