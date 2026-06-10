import React, { useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenContainer from '../../../shared/components/ScreenContainer';
import InfoCard from '../../../shared/components/InfoCard';
import FilterForm from '../../../shared/components/FilterForm';
import DetailModal from '../../../shared/components/DetailModal';
import PrimaryButton from '../../../shared/components/PrimaryButton';
import { reportsAPI, unwrapResponse } from '../../../core/api/api';
import { useAuth } from '../../../application/providers/AuthContext';
import { API_BASE_URL, STORAGE_KEYS } from '../../../shared/config';
import { isPositiveInteger } from '../../../shared/utils/validators';
import useAppTheme from '../../../shared/theme/useAppTheme';

export default function ReportsScreen() {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const canView = user?.role === 'admin' || user?.role === 'manager';

  const now = new Date();
  const [filters, setFilters] = useState({
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
    departmentId: '',
    employeeKeyword: '',
  });
  const [rows, setRows] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [exporting, setExporting] = useState(false);
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
        const id = entry?.item?.employee_id;
        if (!id) {
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
      key: 'month',
      label: 'Tháng',
      type: 'text',
      placeholder: '4',
      keyboardType: 'number-pad',
    },
    {
      key: 'year',
      label: 'Năm',
      type: 'text',
      placeholder: '2026',
      keyboardType: 'number-pad',
    },
    {
      key: 'departmentId',
      label: 'Mã phòng ban (tùy chọn)',
      type: 'text',
      placeholder: '1',
      keyboardType: 'number-pad',
    },
    {
      key: 'employeeKeyword',
      label: 'Tìm theo nhân viên',
      type: 'text',
      placeholder: 'Nguyễn Văn A',
    },
  ];

  const loadReport = async () => {
    if (!isPositiveInteger(filters.month) || Number(filters.month) < 1 || Number(filters.month) > 12) {
      Alert.alert('Dữ liệu không hợp lệ', 'Tháng phải nằm trong khoảng 1-12.');
      return;
    }
    if (!isPositiveInteger(filters.year) || String(filters.year).length !== 4) {
      Alert.alert('Dữ liệu không hợp lệ', 'Năm phải có 4 chữ số.');
      return;
    }

    try {
      const params = {
        month: Number(filters.month),
        year: Number(filters.year),
      };
      if (filters.departmentId.trim()) {
        params.department_id = Number(filters.departmentId);
      }
      const response = await reportsAPI.getMonthly(params);
      const data = unwrapResponse(response);
      const parsedRows = Array.isArray(data?.employees) ? data.employees : [];
      const keyword = filters.employeeKeyword.trim().toLowerCase();
      const nextRows = keyword
        ? parsedRows.filter((item) => String(item.employee_name || '').toLowerCase().includes(keyword))
        : parsedRows;
      setRows(nextRows);
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải báo cáo');
    }
  };

  const exportReport = async () => {
    if (
      !isPositiveInteger(filters.month)
      || Number(filters.month) < 1
      || Number(filters.month) > 12
      || !isPositiveInteger(filters.year)
      || String(filters.year).length !== 4
    ) {
      Alert.alert('Thiếu dữ liệu', 'Vui lòng nhập tháng và năm hợp lệ trước khi xuất báo cáo.');
      return;
    }
    if (filters.departmentId.trim() && !isPositiveInteger(filters.departmentId)) {
      Alert.alert('Dữ liệu không hợp lệ', 'Mã phòng ban phải là số nguyên dương.');
      return;
    }

    setExporting(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!token) {
        Alert.alert('Phiên đăng nhập hết hạn', 'Vui lòng đăng nhập lại để xuất báo cáo.');
        return;
      }

      const queryParts = [
        `month=${encodeURIComponent(String(Number(filters.month)))}`,
        `year=${encodeURIComponent(String(Number(filters.year)))}`,
      ];
      if (filters.departmentId.trim()) {
        queryParts.push(`department_id=${encodeURIComponent(String(Number(filters.departmentId)))}`);
      }

      const fileName = `report-${filters.year}-${filters.month}.xlsx`;
      if (!FileSystem.cacheDirectory) {
        throw new Error('Thiết bị không hỗ trợ thư mục lưu tệp tạm.');
      }
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      const downloadUrl = `${API_BASE_URL}/reports/export/?${queryParts.join('&')}`;

      const result = await FileSystem.downloadAsync(downloadUrl, fileUri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (result.status !== 200) {
        await FileSystem.deleteAsync(result.uri, { idempotent: true });
        throw new Error(`Máy chủ không thể xuất báo cáo (HTTP ${result.status}).`);
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Chia sẻ báo cáo tháng',
        });
      } else {
        Alert.alert('Xuất báo cáo thành công', `Đã tải tệp về: ${result.uri}`);
      }
    } catch (error) {
      Alert.alert('Lỗi', error.message || 'Không thể xuất báo cáo.');
    } finally {
      setExporting(false);
    }
  };

  const onFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    const nextFilters = {
      month: String(now.getMonth() + 1),
      year: String(now.getFullYear()),
      departmentId: '',
      employeeKeyword: '',
    };
    setFilters(nextFilters);
    setRows([]);
  };

  if (!canView) {
    return (
      <ScreenContainer>
        <Text style={styles.denied}>Bạn không có quyền xem báo cáo.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.employee_id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfigRef.current}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Text style={[styles.title, { color: colors.text }]}>Báo cáo tháng</Text>
            <FilterForm
              title="Bộ lọc báo cáo"
              fields={filterFields}
              values={filters}
              onChange={onFilterChange}
              onApply={loadReport}
              onReset={resetFilters}
            />
            <PrimaryButton
              title={exporting ? 'Đang xuất...' : 'Xuất tệp Excel'}
              variant="secondary"
              onPress={exportReport}
              disabled={exporting}
            />
          </View>
        }
        renderItem={({ item, index }) => (
          <Pressable onPress={() => setSelectedRow(item)}>
            <InfoCard
              animationIndex={index}
              playAnimation={Boolean(enteredIds[String(item.employee_id)]) && !animatedIds[String(item.employee_id)]}
              onAnimationDone={() => setAnimatedIds((prev) => ({ ...prev, [String(item.employee_id)]: true }))}
              title={`${item.employee_name} (${item.employee_id})`}
              subtitle={`Có mặt: ${item.present} | Trễ: ${item.late} | Vắng: ${item.absent} | Nghỉ: ${item.leave}`}
            />
          </Pressable>
        )}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>Chưa có dữ liệu báo cáo.</Text>}
        contentContainerStyle={styles.list}
      />
      <DetailModal
        visible={Boolean(selectedRow)}
        title="Chi tiết báo cáo nhân viên"
        onClose={() => setSelectedRow(null)}
        details={
          selectedRow
            ? [
                { label: 'Nhân viên', value: selectedRow.employee_name || '--' },
                { label: 'Mã nhân viên', value: selectedRow.employee_id || '--' },
                { label: 'Ngày có mặt', value: String(selectedRow.present ?? '--') },
                { label: 'Đi trễ', value: String(selectedRow.late ?? '--') },
                { label: 'Vắng mặt', value: String(selectedRow.absent ?? '--') },
                { label: 'Nghỉ phép', value: String(selectedRow.leave ?? '--') },
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
  list: { gap: 10, paddingBottom: 30 },
  empty: {},
});
