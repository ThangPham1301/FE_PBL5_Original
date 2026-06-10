import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import ScreenContainer from '../../../shared/components/ScreenContainer';
import PrimaryButton from '../../../shared/components/PrimaryButton';
import InfoCard from '../../../shared/components/InfoCard';
import FloatingField from '../../../shared/components/FloatingField';
import { useAuth } from '../../../application/providers/AuthContext';
import { overtimeAPI, unwrapResponse } from '../../../core/api/api';
import useAppTheme from '../../../shared/theme/useAppTheme';
import AnimatedCard from '../../../shared/components/AnimatedCard';
import { getApiErrorMessage } from '../../../shared/utils/apiError';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidDate(value) {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day
  );
}

function formatDate(dateValue) {
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, '0');
  const day = String(dateValue.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatTime(dateValue) {
  const hours = String(dateValue.getHours()).padStart(2, '0');
  const minutes = String(dateValue.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function parseTime(value) {
  const [hours, minutes] = String(value).split(':').map(Number);
  const parsed = new Date();
  parsed.setHours(hours || 0, minutes || 0, 0, 0);
  return parsed;
}

function createInitialForm() {
  return {
    date: formatDate(new Date()),
    planned_start_time: '17:00',
    planned_end_time: '19:00',
    reason: '',
  };
}

export default function OvertimeRequestScreen() {
  const { colors, radius } = useAppTheme();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(createInitialForm);
  const [pickerTarget, setPickerTarget] = useState(null);
  const [enteredIds, setEnteredIds] = useState({});
  const [animatedIds, setAnimatedIds] = useState({});

  const role = String(user?.role || '').toLowerCase();
  const isManager = role === 'admin' || role === 'manager';

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

  const otRate = useMemo(() => {
    if (!form.date) {
      return null;
    }
    if (!isValidDate(form.date)) {
      return null;
    }
    const [year, month, dayOfMonth] = form.date.split('-').map(Number);
    const day = new Date(Date.UTC(year, month - 1, dayOfMonth)).getUTCDay();
    if (day === 0 || day === 6) {
      return { label: 'Cuối tuần', rate: 2.0 };
    }
    return { label: 'Ngày thường', rate: 1.5 };
  }, [form.date]);

  const formatData = (rawData) => {
    if (Array.isArray(rawData)) {
      return rawData;
    }
    if (Array.isArray(rawData?.results)) {
      return rawData.results;
    }
    return [];
  };

  const loadData = async () => {
    setRefreshing(true);
    try {
      const response = await overtimeAPI.getAll();
      const data = unwrapResponse(response);
      setItems(formatData(data));
    } catch (error) {
      Alert.alert(
        'Lỗi',
        getApiErrorMessage(error, 'Không thể tải danh sách tăng ca.'),
      );
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const calcDurationMinutes = (startTime, endTime) => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    return eh * 60 + em - (sh * 60 + sm);
  };

  const getStatusText = (status) => {
    if (status === 'approved') return 'Đã duyệt';
    if (status === 'rejected') return 'Đã từ chối';
    return 'Chờ duyệt';
  };

  const onPickerChange = (event, selectedValue) => {
    if (event?.type !== 'dismissed' && selectedValue) {
      if (pickerTarget === 'date') {
        setForm((prev) => ({ ...prev, date: formatDate(selectedValue) }));
      } else if (pickerTarget === 'start') {
        setForm((prev) => ({
          ...prev,
          planned_start_time: formatTime(selectedValue),
        }));
      } else if (pickerTarget === 'end') {
        setForm((prev) => ({
          ...prev,
          planned_end_time: formatTime(selectedValue),
        }));
      }
    }
    setPickerTarget(null);
  };

  const submitRequest = async () => {
    if (!form.date || !form.planned_start_time || !form.planned_end_time) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn ngày và thời gian tăng ca.');
      return;
    }
    if (!isValidDate(form.date)) {
      Alert.alert('Ngày không hợp lệ', 'Ngày tăng ca phải đúng định dạng YYYY-MM-DD.');
      return;
    }
    if (!TIME_PATTERN.test(form.planned_start_time) || !TIME_PATTERN.test(form.planned_end_time)) {
      Alert.alert('Giờ không hợp lệ', 'Giờ tăng ca phải đúng định dạng HH:mm.');
      return;
    }

    const durationMinutes = calcDurationMinutes(form.planned_start_time, form.planned_end_time);
    if (durationMinutes <= 0) {
      Alert.alert('Dữ liệu không hợp lệ', 'Giờ kết thúc phải sau giờ bắt đầu.');
      return;
    }
    if (durationMinutes > 120) {
      Alert.alert('Vượt giới hạn', 'Tăng ca không quá 2 tiếng/ngày.');
      return;
    }

    setSubmitting(true);
    try {
      await overtimeAPI.create({
        date: form.date,
        planned_start_time: form.planned_start_time,
        planned_end_time: form.planned_end_time,
        reason: form.reason.trim(),
      });
      Alert.alert('Thành công', 'Đã gửi yêu cầu tăng ca.');
      setForm(createInitialForm());
      await loadData();
    } catch (error) {
      Alert.alert(
        'Lỗi',
        getApiErrorMessage(error, 'Không thể gửi yêu cầu tăng ca.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const approveRequest = async (id) => {
    try {
      await overtimeAPI.approve(id);
      Alert.alert('Thành công', 'Đã duyệt yêu cầu tăng ca.');
      await loadData();
    } catch (error) {
      Alert.alert(
        'Lỗi',
        getApiErrorMessage(error, 'Không thể duyệt yêu cầu.'),
      );
    }
  };

  const rejectRequest = async (id) => {
    try {
      await overtimeAPI.reject(id, { reason: 'Từ chối bởi quản lý' });
      Alert.alert('Thành công', 'Đã từ chối yêu cầu tăng ca.');
      await loadData();
    } catch (error) {
      Alert.alert(
        'Lỗi',
        getApiErrorMessage(error, 'Không thể từ chối yêu cầu.'),
      );
    }
  };

  return (
    <ScreenContainer scroll={false}>
      <Text style={[styles.title, { color: colors.text }]}>{isManager ? 'Quản lý đơn tăng ca' : 'Đơn tăng ca của tôi'}</Text>

      {!isManager ? (
        <AnimatedCard style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Gửi yêu cầu mới</Text>
          <Pressable
            onPress={() => setPickerTarget('date')}
            style={[
              styles.pickerField,
              { borderColor: colors.border, backgroundColor: colors.bgSoft },
            ]}
          >
            <Text
              style={[
                styles.pickerLabel,
                { color: colors.textMuted, backgroundColor: colors.card },
              ]}
            >
              Ngày tăng ca
            </Text>
            <Text style={[styles.pickerValue, { color: colors.text }]}>
              {form.date}
            </Text>
          </Pressable>
          <View style={styles.row}>
            <Pressable
              onPress={() => setPickerTarget('start')}
              style={[
                styles.pickerField,
                styles.half,
                { borderColor: colors.border, backgroundColor: colors.bgSoft },
              ]}
            >
              <Text
                style={[
                  styles.pickerLabel,
                  { color: colors.textMuted, backgroundColor: colors.card },
                ]}
              >
                Bắt đầu
              </Text>
              <Text style={[styles.pickerValue, { color: colors.text }]}>
                {form.planned_start_time}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setPickerTarget('end')}
              style={[
                styles.pickerField,
                styles.half,
                { borderColor: colors.border, backgroundColor: colors.bgSoft },
              ]}
            >
              <Text
                style={[
                  styles.pickerLabel,
                  { color: colors.textMuted, backgroundColor: colors.card },
                ]}
              >
                Kết thúc
              </Text>
              <Text style={[styles.pickerValue, { color: colors.text }]}>
                {form.planned_end_time}
              </Text>
            </Pressable>
          </View>
          <FloatingField
            label="Lý do tăng ca (không bắt buộc)"
            value={form.reason}
            multiline
            numberOfLines={3}
            onChangeText={(value) => setForm((prev) => ({ ...prev, reason: value }))}
            inputStyle={styles.textArea}
          />
          {otRate ? (
            <Text style={[styles.hint, { color: colors.textMuted }]}>Loại ngày: {otRate.label} | Hệ số tăng ca: x{otRate.rate}</Text>
          ) : null}
          <PrimaryButton
            title={submitting ? 'Đang gửi...' : 'Gửi yêu cầu tăng ca'}
            onPress={submitRequest}
            disabled={submitting}
          />
        </AnimatedCard>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfigRef.current}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>Không có yêu cầu tăng ca nào.</Text>}
        renderItem={({ item, index }) => {
          const employeeLabel = isManager
            ? `${item.employee_name || 'Nhân viên'} (${item.employee_code || '-'})\n`
            : '';
          const rejectionText = item.rejection_reason
            ? `\nLý do từ chối: ${item.rejection_reason}`
            : '';
          const subtitle = (
            `${employeeLabel}${item.date || '-'} | `
            + `${item.planned_start_time || '-'} - ${item.planned_end_time || '-'}\n`
            + `${item.planned_hours || '-'} giờ | Hệ số x${item.overtime_rate || '-'}\n`
            + `Lý do: ${item.reason || '-'}${rejectionText}`
          );
          return (
            <InfoCard
              animationIndex={index}
              playAnimation={Boolean(enteredIds[String(item.id)]) && !animatedIds[String(item.id)]}
              onAnimationDone={() => setAnimatedIds((prev) => ({ ...prev, [String(item.id)]: true }))}
              title={`#${item.id} - ${getStatusText(item.status)}`}
              subtitle={subtitle}
              right={
                isManager && item.status === 'pending' ? (
                  <View style={styles.actions}>
                    <PrimaryButton title="Duyệt" onPress={() => approveRequest(item.id)} />
                    <PrimaryButton title="Từ chối" variant="secondary" onPress={() => rejectRequest(item.id)} />
                  </View>
                ) : null
              }
            />
          );
        }}
      />
      {pickerTarget ? (
        <DateTimePicker
          value={
            pickerTarget === 'date'
              ? parseDate(form.date)
              : parseTime(
                  pickerTarget === 'start'
                    ? form.planned_start_time
                    : form.planned_end_time,
                )
          }
          mode={pickerTarget === 'date' ? 'date' : 'time'}
          minimumDate={pickerTarget === 'date' ? new Date() : undefined}
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onPickerChange}
        />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  formCard: {
    borderWidth: 1,
    padding: 14,
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  pickerField: {
    position: 'relative',
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: 15,
    paddingBottom: 10,
    justifyContent: 'center',
  },
  pickerLabel: {
    position: 'absolute',
    top: -8,
    left: 10,
    paddingHorizontal: 6,
    fontSize: 11,
    fontWeight: '700',
    zIndex: 1,
  },
  pickerValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  textArea: {
    minHeight: 80,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  half: {
    flex: 1,
  },
  hint: { fontSize: 12 },
  list: {
    gap: 10,
    paddingBottom: 30,
  },
  empty: {},
  actions: {
    width: 160,
    gap: 8,
  },
});
