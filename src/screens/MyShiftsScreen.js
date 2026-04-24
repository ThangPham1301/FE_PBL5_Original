import React, { useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import InfoCard from '../components/InfoCard';
import { employeeAPI, shiftsAPI, unwrapResponse } from '../services/api';
import { useAuth } from '../context/AuthContext';
import useAppTheme from '../theme/useAppTheme';

export default function MyShiftsScreen() {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
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
    setError('');
    try {
      const [shiftsResponse, employeesResponse] = await Promise.all([
        shiftsAPI.getAll(),
        employeeAPI.getAll({ is_active: true }),
      ]);

      const shiftsData = unwrapResponse(shiftsResponse);
      const allShifts = Array.isArray(shiftsData?.results)
        ? shiftsData.results
        : Array.isArray(shiftsData)
          ? shiftsData
          : [];

      const employeesData = unwrapResponse(employeesResponse);
      const allEmployees = Array.isArray(employeesData?.results)
        ? employeesData.results
        : Array.isArray(employeesData)
          ? employeesData
          : [];

      const me = allEmployees.find((employee) => employee?.user?.id === user?.id);

      if (!me) {
        setItems([]);
        setError('Không tìm thấy hồ sơ nhân viên của bạn.');
        return;
      }

      const myShifts = allShifts.filter(
        (shift) => Array.isArray(shift?.employees) && shift.employees.some((employee) => employee?.id === me.id)
      );

      if (myShifts.length === 0) {
        setError('Bạn chưa được gán vào ca làm việc nào.');
      }

      setItems(myShifts);
    } catch (requestError) {
      setItems([]);
      setError('Không thể tải dữ liệu ca làm việc.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <ScreenContainer scroll={false}>
      <Text style={[styles.title, { color: colors.text }]}>Ca làm việc</Text>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfigRef.current}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
        renderItem={({ item, index }) => (
          <InfoCard
            animationIndex={index}
            playAnimation={Boolean(enteredIds[String(item.id)]) && !animatedIds[String(item.id)]}
            onAnimationDone={() => setAnimatedIds((prev) => ({ ...prev, [String(item.id)]: true }))}
            title={item.name || `Shift ${item.id}`}
            subtitle={`${item.start_time} - ${item.end_time} | Đi trễ sau ${item.late_threshold} phút`}
          />
        )}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>Chưa có dữ liệu ca làm.</Text>}
        contentContainerStyle={styles.list}
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
  empty: {},
  error: { marginBottom: 10 },
});
