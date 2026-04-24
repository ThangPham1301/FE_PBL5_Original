import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import InfoCard from '../components/InfoCard';
import PrimaryButton from '../components/PrimaryButton';
import FilterForm from '../components/FilterForm';
import StatusBadge from '../components/StatusBadge';
import DetailModal from '../components/DetailModal';
import { useAuth } from '../context/AuthContext';
import { leaveAPI, unwrapResponse } from '../services/api';
import useAppTheme from '../theme/useAppTheme';
import AnimatedCard from '../components/AnimatedCard';

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
  const [activePanel, setActivePanel] = useState('filter');

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

  const canReviewLeaves = role === 'admin' || role === 'manager';
  const canCreateLeave = role !== 'admin';
  const selectedTypeOption = types.find((item) => String(item.id) === String(selectedType));

  const getStatusLabel = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'pending') {
      return 'Da gui - Cho duyet';
    }
    if (normalized === 'approved') {
      return 'Da duyet';
    }
    if (normalized === 'rejected') {
      return 'Tu choi';
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
    setRefreshing(true);
    try {
      const [typesRes, leavesRes] = await Promise.all([leaveAPI.getTypes(), leaveAPI.getAll()]);
      const leaveTypes = unwrapResponse(typesRes);
      const leaveItems = unwrapResponse(leavesRes);
      const parsedItems = Array.isArray(leaveItems?.results) ? leaveItems.results : Array.isArray(leaveItems) ? leaveItems : [];

      setTypes(Array.isArray(leaveTypes?.results) ? leaveTypes.results : Array.isArray(leaveTypes) ? leaveTypes : []);
      setItems(parsedItems);
      applyFilterData(parsedItems, filters);
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

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const submit = async () => {
    if (!selectedType) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn loại nghỉ.');
      return;
    }

    try {
      await leaveAPI.create({
        leave_type_id: Number(selectedType),
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
        data={filteredItems}
        keyExtractor={(item) => String(item.id)}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfigRef.current}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Text style={[styles.title, { color: colors.text }]}>Nghỉ phép</Text>
            {canCreateLeave ? (
              <View style={styles.panelSwitchWrap}>
                <Pressable
                  onPress={() => setActivePanel('filter')}
                  style={[
                    styles.panelSwitchChip,
                    {
                      backgroundColor: activePanel === 'filter' ? colors.primarySoft : colors.bgSoft,
                      borderColor: activePanel === 'filter' ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.panelSwitchText, { color: activePanel === 'filter' ? colors.primary : colors.textMuted }]}>Bộ lọc</Text>
                </Pressable>
                <Pressable
                  onPress={() => setActivePanel('request')}
                  style={[
                    styles.panelSwitchChip,
                    {
                      backgroundColor: activePanel === 'request' ? colors.primarySoft : colors.bgSoft,
                      borderColor: activePanel === 'request' ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.panelSwitchText, { color: activePanel === 'request' ? colors.primary : colors.textMuted }]}>Đơn nghỉ</Text>
                </Pressable>
              </View>
            ) : null}

            {!canCreateLeave || activePanel === 'filter' ? (
              <FilterForm
                title="Bộ lọc đơn nghỉ"
                fields={filterFields}
                values={filters}
                onChange={onFilterChange}
                onApply={applyFilters}
                onReset={resetFilters}
              />
            ) : null}

            {canCreateLeave && activePanel === 'request' ? (
              <View style={styles.requestWrap}>
                <Text style={[styles.requestTitle, { color: colors.textMuted }]}>Gửi đơn nghỉ</Text>
                <AnimatedCard style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]}> 
                  <View style={styles.fieldWrap}>
                    <Text style={[styles.floatingLabel, { color: colors.textMuted, backgroundColor: colors.card }]}>Loai nghi</Text>
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
                    <Text style={[styles.floatingLabel, { color: colors.textMuted, backgroundColor: colors.card }]}>Ngay bat dau</Text>
                    <Pressable
                      onPress={() => setDatePickerTarget('startDate')}
                      style={[styles.input, styles.dateInput, { borderColor: colors.border, backgroundColor: colors.bgSoft }]}
                    >
                      <Text style={[styles.dateValue, { color: colors.text }]}>{startDate}</Text>
                    </Pressable>
                  </View>

                  <View style={styles.fieldWrap}>
                    <Text style={[styles.floatingLabel, { color: colors.textMuted, backgroundColor: colors.card }]}>Ngay ket thuc</Text>
                    <Pressable
                      onPress={() => setDatePickerTarget('endDate')}
                      style={[styles.input, styles.dateInput, { borderColor: colors.border, backgroundColor: colors.bgSoft }]}
                    >
                      <Text style={[styles.dateValue, { color: colors.text }]}>{endDate}</Text>
                    </Pressable>
                  </View>

                  <View style={styles.fieldWrap}>
                    <Text style={[styles.floatingLabel, { color: colors.textMuted, backgroundColor: colors.card }]}>Ly do</Text>
                    <TextInput
                      style={[styles.input, styles.textInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bgSoft }]}
                      value={reason}
                      onChangeText={setReason}
                    />
                  </View>
                  <PrimaryButton title="Gửi đơn" onPress={submit} disabled={!selectedType || !startDate || !endDate} />
                </AnimatedCard>
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
              title={`${item.leave_type_name || 'Leave'} | ${item.start_date} -> ${item.end_date}`}
              subtitle={`Trang thai: ${getStatusLabel(item.status)} | ${item.reason || '--'}`}
              right={
                <View style={styles.rightWrap}>
                  <StatusBadge status={item.status} />
                  {canReviewLeaves && item.status === 'pending' ? (
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
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>Chưa có đơn nghỉ phép.</Text>}
        contentContainerStyle={styles.list}
      />
      {datePickerTarget ? (
        <DateTimePicker
          value={parseDate(datePickerTarget === 'startDate' ? startDate : endDate)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onRequestDateChange}
        />
      ) : null}
      <DetailModal
        visible={Boolean(selectedItem)}
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
  panelSwitchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  panelSwitchChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  panelSwitchText: {
    fontSize: 14,
    fontWeight: '700',
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
