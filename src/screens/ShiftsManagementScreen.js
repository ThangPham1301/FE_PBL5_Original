import React, { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import InfoCard from '../components/InfoCard';
import PrimaryButton from '../components/PrimaryButton';
import FloatingField from '../components/FloatingField';
import { shiftsAPI, unwrapResponse } from '../services/api';
import { useAuth } from '../context/AuthContext';
import useAppTheme from '../theme/useAppTheme';
import AnimatedCard from '../components/AnimatedCard';

export default function ShiftsManagementScreen() {
  const { colors, radius } = useAppTheme();
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';
  const isAdmin = user?.role === 'admin';

  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('08:00:00');
  const [endTime, setEndTime] = useState('17:00:00');
  const [lateThreshold, setLateThreshold] = useState('15');
  const [employeeId, setEmployeeId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
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
      const response = await shiftsAPI.getAll();
      const data = unwrapResponse(response);
      setItems(Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createShift = async () => {
    try {
      await shiftsAPI.create({
        name,
        start_time: startTime,
        end_time: endTime,
        late_threshold: Number(lateThreshold),
      });
      Alert.alert('Thành công', 'Đã tạo ca làm việc');
      setName('');
      await loadData();
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tạo ca làm việc');
    }
  };

  const assignShift = async () => {
    try {
      await shiftsAPI.assign({
        employee_id: Number(employeeId),
        shift_id: Number(shiftId),
        effective_date: effectiveDate,
      });
      Alert.alert('Thành công', 'Đã gán ca cho nhân viên');
      setEmployeeId('');
      setShiftId('');
      setEffectiveDate('');
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể gán ca');
    }
  };

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
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Tao ca</Text>
                <FloatingField label="Ten ca" value={name} onChangeText={setName} />
                <FloatingField label="Bat dau HH:MM:SS" value={startTime} onChangeText={setStartTime} />
                <FloatingField label="Ket thuc HH:MM:SS" value={endTime} onChangeText={setEndTime} />
                <FloatingField label="Nguong di tre (phut)" value={lateThreshold} onChangeText={setLateThreshold} keyboardType="number-pad" />
                <PrimaryButton title="Tạo ca" onPress={createShift} disabled={!name || !startTime || !endTime} />
              </AnimatedCard>
            )}

            <AnimatedCard style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]} delay={60}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Gan ca cho nhan vien</Text>
              <FloatingField label="Employee PK ID" value={employeeId} onChangeText={setEmployeeId} keyboardType="number-pad" />
              <FloatingField label="Shift ID" value={shiftId} onChangeText={setShiftId} keyboardType="number-pad" />
              <FloatingField label="Ngay hieu luc YYYY-MM-DD" value={effectiveDate} onChangeText={setEffectiveDate} />
              <PrimaryButton title="Gán ca" onPress={assignShift} disabled={!employeeId || !shiftId || !effectiveDate} />
            </AnimatedCard>
          </View>
        }
        renderItem={({ item, index }) => (
          <InfoCard
            animationIndex={index}
            playAnimation={Boolean(enteredIds[String(item.id)]) && !animatedIds[String(item.id)]}
            onAnimationDone={() => setAnimatedIds((prev) => ({ ...prev, [String(item.id)]: true }))}
            title={`${item.id} - ${item.name}`}
            subtitle={`${item.start_time} - ${item.end_time} | Trễ: ${item.late_threshold} phút`}
          />
        )}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>Không có ca làm việc.</Text>}
        contentContainerStyle={styles.list}
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
    gap: 8,
    borderWidth: 1,
    padding: 12,
  },
  list: { gap: 10, paddingBottom: 30 },
  empty: {},
});
