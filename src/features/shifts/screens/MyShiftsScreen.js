import React, { useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text } from 'react-native';
import ScreenContainer from '../../../shared/components/ScreenContainer';
import InfoCard from '../../../shared/components/InfoCard';
import { shiftsAPI, unwrapResponse } from '../../../core/api/api';
import useAppTheme from '../../../shared/theme/useAppTheme';

export default function MyShiftsScreen() {
  const { colors } = useAppTheme();
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
      const response = await shiftsAPI.getMine();
      const shift = unwrapResponse(response);

      if (!shift) {
        setError('Bạn chưa được gán vào ca làm việc nào.');
        setItems([]);
        return;
      }
      setItems([shift]);
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
            title={item.name || `Ca làm việc ${item.id}`}
            subtitle={`Thứ 2 - Thứ 6 | ${String(item.start_time).slice(0, 5)} - ${String(item.end_time).slice(0, 5)} | Đi trễ sau ${item.late_threshold} phút`}
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
