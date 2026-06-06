import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../../shared/components/ScreenContainer';
import InfoCard from '../../../shared/components/InfoCard';
import PrimaryButton from '../../../shared/components/PrimaryButton';
import FilterForm from '../../../shared/components/FilterForm';
import StatusBadge from '../../../shared/components/StatusBadge';
import DetailModal from '../../../shared/components/DetailModal';
import { useAuth } from '../../../application/providers/AuthContext';
import { leaveAPI, unwrapResponse } from '../../../core/api/api';
import useAppTheme from '../../../shared/theme/useAppTheme';
import AnimatedCard from '../../../shared/components/AnimatedCard';

export default function LeaveManagementScreen() {
  const { colors, radius } = useAppTheme();
  const { user } = useAuth();
  const role = String(user?.role || '').toLowerCase();
  const [types, setTypes] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    fromDate: '',
    toDate: '',
  });
  const [enteredIds, setEnteredIds] = useState({});
  const [animatedIds, setAnimatedIds] = useState({});
  const [datePickerTarget, setDatePickerTarget] = useState(null);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

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

  const isAdmin = role === 'admin';
  const isEmployee = role === 'employee';
  const selectedTypeOption = types.find((item) => String(item.id) === String(selectedType));

  const getStatusLabel = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'pending') {
      return 'Đã gửi - Chờ duyệt';
    }
    if (normalized === 'approved') {
      return 'Đã duyệt';
    }
    if (normalized === 'rejected') {
      return 'Từ chối';
    }
    return normalized || '--';
  };

  const filterFields = [
    {
      key: 'status',
      label: 'Trạng thái đơn',
      type: 'options',
      options: [
        { label: 'Tất cả', value: 'all' },
        { label: 'Chờ duyệt', value: 'pending' },
        { label: 'Đã duyệt', value: 'approved' },
        { label: 'Từ chối', value: 'rejected' },
      ],
    },
    {
      key: 'fromDate',
      label: 'Từ ngày',
      type: 'date',
      placeholder: '2026-04-01',
    },
    {
      key: 'toDate',
      label: 'Đến ngày',
      type: 'date',
      placeholder: '2026-04-30',
    },
  ];

  const formatDate = (dateValue) => {
    if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) {
      return '';
    }
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseDate = (rawValue) => {
    const value = String(rawValue || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date();
    }
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return new Date();
    }
    return parsed;
  };

  const onRequestDateChange = (event, selectedDate) => {
    const shouldClose = Platform.OS === 'android' || event?.type === 'dismissed' || Boolean(selectedDate);
    if (event?.type !== 'dismissed' && selectedDate && datePickerTarget) {
      const nextValue = formatDate(selectedDate);
      if (datePickerTarget === 'startDate') {
        setStartDate(nextValue);
      }
      if (datePickerTarget === 'endDate') {
        setEndDate(nextValue);
      }
    }
    if (shouldClose) {
      setDatePickerTarget(null);
    }
  };

  const applyFilterData = (sourceData, nextFilters) => {
    const list = Array.isArray(sourceData) ? sourceData : [];
    const fromDate = nextFilters.fromDate.trim();
    const toDate = nextFilters.toDate.trim();

    const result = list.filter((item) => {
      const statusOk = nextFilters.status === 'all' || String(item.status || '').toLowerCase() === nextFilters.status;
      const start = String(item.start_date || '');
      const end = String(item.end_date || '');
      const fromOk = !fromDate || end >= fromDate;
      const toOk = !toDate || start <= toDate;
      return statusOk && fromOk && toOk;
    });

    setFilteredItems(result);
  };

  const loadData = async () => {
    if (!isAdmin && !isEmployee) {
      return;
    }

    setRefreshing(true);
    try {
      if (isAdmin) {
        const leavesRes = await leaveAPI.getAll();
        const leaveItems = unwrapResponse(leavesRes);
        const parsedItems = Array.isArray(leaveItems?.results) ? leaveItems.results : Array.isArray(leaveItems) ? leaveItems : [];
        setItems(parsedItems);
        applyFilterData(parsedItems, filters);
      } else {
        const [typesRes, leavesRes] = await Promise.all([leaveAPI.getTypes(), leaveAPI.getAll()]);
        const leaveTypes = unwrapResponse(typesRes);
        const leaveItems = unwrapResponse(leavesRes);
        const parsedItems = Array.isArray(leaveItems?.results) ? leaveItems.results : Array.isArray(leaveItems) ? leaveItems : [];
        setTypes(Array.isArray(leaveTypes?.results) ? leaveTypes.results : Array.isArray(leaveTypes) ? leaveTypes : []);
        setItems(parsedItems);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const onFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    applyFilterData(items, filters);
  };

  const resetFilters = () => {
    const nextFilters = {
      status: 'all',
      fromDate: '',
      toDate: '',
    };
    setFilters(nextFilters);
    applyFilterData(items, nextFilters);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [role])
  );

  const submit = async () => {
    if (!isEmployee) {
      Alert.alert('Không có quyền', 'Chỉ nhân viên mới có thể gửi đơn nghỉ phép.');
      return;
    }

    if (!selectedType) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn loại nghỉ.');
      return;
    }

    try {
      await leaveAPI.create({
        leave_type: Number(selectedType),
        start_date: startDate,
        end_date: endDate,
        reason,
      });
      Alert.alert('Thành công', 'Đã tạo đơn nghỉ phép');
      setSelectedType('');
      setStartDate('');
      setEndDate('');
      setReason('');
      setIsTypeDropdownOpen(false);
      await loadData();
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tạo đơn nghỉ phép');
    }
  };

  const approveLeave = async (id) => {
    try {
      await leaveAPI.approve(id);
      Alert.alert('Thành công', 'Đã duyệt đơn nghỉ phép.');
      await loadData();
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể duyệt đơn nghỉ phép.');
    }
  };

  const rejectLeave = async (id) => {
    try {
      await leaveAPI.reject(id);
      Alert.alert('Thành công', 'Đã từ chối đơn nghỉ phép.');
      await loadData();
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể từ chối đơn nghỉ phép.');
    }
  };

  return (
    <ScreenContainer scroll={false}>
      <FlatList
        data={isAdmin ? filteredItems : isEmployee ? items : []}
        keyExtractor={(item) => String(item.id)}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfigRef.current}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Text style={[styles.title, { color: colors.text }]}>Nghỉ phép</Text>
            {isAdmin ? (
              <FilterForm
                title="Bộ lọc đơn nghỉ"
                fields={filterFields}
                values={filters}
                onChange={onFilterChange}
                onApply={applyFilters}
                onReset={resetFilters}
              />
            ) : null}

            {isEmployee ? (
              <View style={styles.requestWrap}>
                <Text style={[styles.requestTitle, { color: colors.textMuted }]}>Gửi đơn nghỉ</Text>
                <AnimatedCard style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]}> 
                  <View style={styles.fieldWrap}>
                    <Text style={[styles.floatingLabel, { color: colors.textMuted, backgroundColor: colors.card }]}>Loại nghỉ</Text>
                    <Pressable
                      onPress={() => setIsTypeDropdownOpen((prev) => !prev)}
                      style={[styles.input, styles.selectInput, { borderColor: colors.border, backgroundColor: colors.bgSoft }]}
                    >
                      <Text style={[styles.dateValue, { color: selectedTypeOption ? colors.text : colors.textMuted }]}>
                        {selectedTypeOption ? selectedTypeOption.name : ''}
                      </Text>
                      <Ionicons name={isTypeDropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                    </Pressable>
                    {isTypeDropdownOpen ? (
                      <View style={[styles.dropdownMenu, { borderColor: colors.border, backgroundColor: colors.bgSoft }]}> 
                        {types.map((type) => {
                          const active = String(type.id) === String(selectedType);
                          return (
                            <Pressable
                              key={String(type.id)}
                              onPress={() => {
                                setSelectedType(String(type.id));
                                setIsTypeDropdownOpen(false);
                              }}
                              style={[
                                styles.dropdownItem,
                                {
                                  backgroundColor: active ? colors.primarySoft : 'transparent',
                                },
                              ]}
                            >
                              <Text style={[styles.dropdownText, { color: active ? colors.primary : colors.text }]}>{type.name}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.fieldWrap}>
                    <Text style={[styles.floatingLabel, { color: colors.textMuted, backgroundColor: colors.card }]}>Ngày bắt đầu</Text>
                    <Pressable
                      onPress={() => setDatePickerTarget('startDate')}
                      style={[styles.input, styles.dateInput, { borderColor: colors.border, backgroundColor: colors.bgSoft }]}
                    >
                      <Text style={[styles.dateValue, { color: colors.text }]}>{startDate}</Text>
                    </Pressable>
                  </View>

                  <View style={styles.fieldWrap}>
                    <Text style={[styles.floatingLabel, { color: colors.textMuted, backgroundColor: colors.card }]}>Ngày kết thúc</Text>
                    <Pressable
                      onPress={() => setDatePickerTarget('endDate')}
                      style={[styles.input, styles.dateInput, { borderColor: colors.border, backgroundColor: colors.bgSoft }]}
                    >
                      <Text style={[styles.dateValue, { color: colors.text }]}>{endDate}</Text>
                    </Pressable>
                  </View>

                  <View style={styles.fieldWrap}>
                    <Text style={[styles.floatingLabel, { color: colors.textMuted, backgroundColor: colors.card }]}>Lý do</Text>
                    <TextInput
                      style={[styles.input, styles.textInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bgSoft }]}
                      value={reason}
                      onChangeText={setReason}
                    />
                  </View>
                  <PrimaryButton title="Gửi đơn" onPress={submit} disabled={!selectedType || !startDate || !endDate} />
                </AnimatedCard>
                <Text style={[styles.sentListTitle, { color: colors.textMuted }]}>Đơn đã gửi</Text>
              </View>
            ) : null}

            {!isAdmin && !isEmployee ? (
              <View style={[styles.deniedCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]}>
                <Text style={[styles.deniedText, { color: colors.textMuted }]}>
                  Chỉ admin được xem và duyệt danh sách đơn nghỉ phép.
                </Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item, index }) => (
          <Pressable onPress={() => setSelectedItem(item)}>
            <InfoCard
              animationIndex={index}
              playAnimation={Boolean(enteredIds[String(item.id)]) && !animatedIds[String(item.id)]}
              onAnimationDone={() => setAnimatedIds((prev) => ({ ...prev, [String(item.id)]: true }))}
              title={`${item.leave_type_name || 'Nghỉ phép'} | ${item.start_date} đến ${item.end_date}`}
              subtitle={`Trạng thái: ${getStatusLabel(item.status)} | ${item.reason || '--'}`}
              right={
                <View style={styles.rightWrap}>
                  <StatusBadge status={item.status} />
                  {isAdmin && item.status === 'pending' ? (
                    <View style={styles.actions}>
                      <PrimaryButton title="Duyệt" onPress={() => approveLeave(item.id)} />
                      <PrimaryButton title="Từ chối" variant="secondary" onPress={() => rejectLeave(item.id)} />
                    </View>
                  ) : null}
                </View>
              }
            />
          </Pressable>
        )}
        ListEmptyComponent={
          isAdmin || isEmployee ? (
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              {isEmployee ? 'Bạn chưa gửi đơn nghỉ phép nào.' : 'Chưa có đơn nghỉ phép.'}
            </Text>
          ) : null
        }
        contentContainerStyle={styles.list}
      />
      {isEmployee && datePickerTarget ? (
        <DateTimePicker
          value={parseDate(datePickerTarget === 'startDate' ? startDate : endDate)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onRequestDateChange}
        />
      ) : null}
      <DetailModal
        visible={(isAdmin || isEmployee) && Boolean(selectedItem)}
        title="Chi tiết đơn nghỉ"
        onClose={() => setSelectedItem(null)}
        details={
          selectedItem
            ? [
                { label: 'Loại nghỉ', value: selectedItem.leave_type_name || '--' },
                { label: 'Từ ngày', value: selectedItem.start_date || '--' },
                { label: 'Đến ngày', value: selectedItem.end_date || '--' },
                { label: 'Trạng thái', value: getStatusLabel(selectedItem.status) },
                { label: 'Lý do', value: selectedItem.reason || '--' },
              ]
            : []
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    gap: 12,
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  form: {
    gap: 8,
    borderWidth: 1,
    padding: 12,
  },
  requestWrap: {
    gap: 8,
  },
  requestTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sentListTitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deniedCard: {
    borderWidth: 1,
    padding: 14,
  },
  deniedText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fieldWrap: {
    position: 'relative',
  },
  textInput: {
    minHeight: 44,
    paddingTop: 14,
  },
  selectInput: {
    minHeight: 44,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dateInput: {
    minHeight: 44,
    justifyContent: 'center',
    paddingTop: 14,
  },
  dateValue: {
    fontSize: 14,
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
  dropdownMenu: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownText: {
    fontSize: 14,
  },
  list: {
    gap: 10,
    paddingBottom: 30,
  },
  empty: {},
  actions: {
    width: 160,
    gap: 8,
  },
  rightWrap: {
    alignItems: 'flex-end',
    gap: 8,
  },
});
