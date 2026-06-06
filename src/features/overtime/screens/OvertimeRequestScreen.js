import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../../../shared/components/ScreenContainer';
import PrimaryButton from '../../../shared/components/PrimaryButton';
import InfoCard from '../../../shared/components/InfoCard';
import FloatingField from '../../../shared/components/FloatingField';
import { useAuth } from '../../../application/providers/AuthContext';
import { overtimeAPI, unwrapResponse } from '../../../core/api/api';
import useAppTheme from '../../../shared/theme/useAppTheme';
import AnimatedCard from '../../../shared/components/AnimatedCard';

export default function OvertimeRequestScreen() {
  const { colors, radius } = useAppTheme();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    date: '',
    planned_start_time: '17:00',
    planned_end_time: '19:00',
    reason: '',
  });
  const [enteredIds, setEnteredIds] = useState({});
  const [animatedIds, setAnimatedIds] = useState({});

  const isManager = user?.role === 'admin' || user?.role === 'manager';

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
    const day = new Date(form.date).getDay();
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
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải danh sách tăng ca.');
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

  const submitRequest = async () => {
    if (!form.date || !form.planned_start_time || !form.planned_end_time || !form.reason.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ thông tin tăng ca.');
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
        planned_hours: Math.round((durationMinutes / 60) * 10) / 10,
        reason: form.reason.trim(),
      });
      Alert.alert('Thành công', 'Đã gửi yêu cầu tăng ca.');
      setForm({
        date: '',
        planned_start_time: '17:00',
        planned_end_time: '19:00',
        reason: '',
      });
      await loadData();
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.detail || error.response?.data?.message || 'Không thể gửi yêu cầu tăng ca.');
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
      Alert.alert('Lỗi', error.response?.data?.detail || 'Không thể duyệt yêu cầu.');
    }
  };

  const rejectRequest = async (id) => {
    try {
      await overtimeAPI.reject(id, { reason: 'Từ chối bởi quản lý' });
      Alert.alert('Thành công', 'Đã từ chối yêu cầu tăng ca.');
      await loadData();
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.detail || 'Không thể từ chối yêu cầu.');
    }
  };

  return (
    <ScreenContainer scroll={false}>
      <Text style={[styles.title, { color: colors.text }]}>{isManager ? 'Quản lý đơn tăng ca' : 'Đơn tăng ca của tôi'}</Text>

      {!isManager ? (
        <AnimatedCard style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Gửi yêu cầu mới</Text>
          <FloatingField
            label="Ngày tăng ca"
            value={form.date}
            onChangeText={(value) => setForm((prev) => ({ ...prev, date: value }))}
          />
          <View style={styles.row}>
            <FloatingField
              label="Bắt đầu (HH:mm)"
              containerStyle={styles.half}
              value={form.planned_start_time}
              onChangeText={(value) => setForm((prev) => ({ ...prev, planned_start_time: value }))}
            />
            <FloatingField
              label="Kết thúc (HH:mm)"
              containerStyle={styles.half}
              value={form.planned_end_time}
              onChangeText={(value) => setForm((prev) => ({ ...prev, planned_end_time: value }))}
            />
          </View>
          <FloatingField
            label="Lý do tăng ca"
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
          const subtitle = `${item.date || '-'} | ${item.planned_start_time || '-'} - ${item.planned_end_time || '-'}`;
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
