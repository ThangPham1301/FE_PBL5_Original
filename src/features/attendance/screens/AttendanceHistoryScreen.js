import React, { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenContainer from '../../../shared/components/ScreenContainer';
import InfoCard from '../../../shared/components/InfoCard';
import FilterForm from '../../../shared/components/FilterForm';
import StatusBadge from '../../../shared/components/StatusBadge';
import DetailModal from '../../../shared/components/DetailModal';
import { useAuth } from '../../../application/providers/AuthContext';
import { attendanceAPI, unwrapResponse } from '../../../core/api/api';
import useAppTheme from '../../../shared/theme/useAppTheme';

export default function AttendanceHistoryScreen() {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const role = String(user?.role || '').toLowerCase();
  const isEmployee = role === 'employee';
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    employee: '',
    status: 'all',
    fromDate: '',
    toDate: '',
  });
  const [selectedItem, setSelectedItem] = useState(null);
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

  const filterFields = [
    {
      key: 'status',
      label: 'Trạng thái',
      type: 'options',
      options: [
        { label: 'Tất cả', value: 'all' },
        { label: 'Đúng giờ', value: 'present' },
        { label: 'Đi trễ', value: 'late' },
        { label: 'Vắng', value: 'absent' },
        { label: 'Nghỉ phép', value: 'leave' },
      ],
    },
    ...(!isEmployee
      ? [{
          key: 'employee',
          label: 'Nhân viên',
          type: 'text',
          placeholder: 'Nhập tên nhân viên',
        }]
      : []),
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

  const applyFilterData = (sourceData, nextFilters) => {
    const list = Array.isArray(sourceData) ? sourceData : [];
    const employeeKeyword = nextFilters.employee.trim().toLowerCase();
    const fromDate = nextFilters.fromDate.trim();
    const toDate = nextFilters.toDate.trim();

    const result = list.filter((item) => {
      const statusOk = nextFilters.status === 'all' || String(item.status || '').toLowerCase() === nextFilters.status;
      const employeeOk = !employeeKeyword || String(item.employee_name || '').toLowerCase().includes(employeeKeyword);
      const date = String(item.date || '');
      const fromOk = !fromDate || date >= fromDate;
      const toOk = !toDate || date <= toDate;
      return statusOk && employeeOk && fromOk && toOk;
    });

    setFilteredItems(result);
  };

  const loadData = async () => {
    setRefreshing(true);
    try {
      const response = await attendanceAPI.getAll();
      const data = unwrapResponse(response);
      const parsedItems = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
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
      employee: '',
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
    }, [])
  );

  return (
    <ScreenContainer scroll={false}>
      <Text style={[styles.title, { color: colors.text }]}>
        {isEmployee ? 'Lịch sử chấm công của tôi' : 'Lịch sử chấm công'}
      </Text>
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => String(item.id)}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfigRef.current}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
        ListHeaderComponent={
          <FilterForm
            title="Bộ lọc chấm công"
            fields={filterFields}
            values={filters}
            onChange={onFilterChange}
            onApply={applyFilters}
            onReset={resetFilters}
          />
        }
        renderItem={({ item, index }) => (
          <Pressable onPress={() => setSelectedItem(item)}>
            <InfoCard
              animationIndex={index}
              playAnimation={Boolean(enteredIds[String(item.id)]) && !animatedIds[String(item.id)]}
              onAnimationDone={() => setAnimatedIds((prev) => ({ ...prev, [String(item.id)]: true }))}
              title={`${item.employee_name || 'Nhân viên'} - ${item.date}`}
              subtitle={`Vào: ${item.check_in || '--'} | Ra: ${item.check_out || '--'}`}
              right={<StatusBadge status={item.status} />}
            />
          </Pressable>
        )}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>Không có dữ liệu chấm công.</Text>}
        contentContainerStyle={styles.list}
      />
      <DetailModal
        visible={Boolean(selectedItem)}
        title="Chi tiết chấm công"
        onClose={() => setSelectedItem(null)}
        details={
          selectedItem
            ? [
                { label: 'Nhân viên', value: selectedItem.employee_name || '--' },
                { label: 'Ngày', value: selectedItem.date || '--' },
                { label: 'Trạng thái', value: selectedItem.status || '--' },
                { label: 'Giờ vào', value: selectedItem.check_in || '--' },
                { label: 'Giờ ra', value: selectedItem.check_out || '--' },
              ]
            : []
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },
  list: {
    gap: 10,
    paddingBottom: 30,
  },
  empty: { marginTop: 20 },
});
