import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../../components/ui/Card';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { typography, spacing, borderRadius } from '../../constants';
import { getFriendlyErrorMessage } from '../../services/apiErrors';
import { useAutoRetry } from '../../hooks/useAutoRetry';
import { notificationsApi } from '../../api/notifications';
import { useColors } from '../../contexts/ThemeContext';
import { formatDate } from '../../utils/helpers';
import type { Notification } from '../../types';

const PAGE_SIZE = 20;

export default function NotificationsScreen({ navigation }: any) {
  const colors = useColors();
  const styles = getStyles(colors);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (pageNum = 1, append = false) => {
    try {
      setFetchError(null);
      const { data } = await notificationsApi.getAll({ page: pageNum, limit: PAGE_SIZE });
      if (data.success) {
        setNotifications(prev => append ? [...prev, ...data.data] : data.data);
        setHasMore(data.data.length === PAGE_SIZE);
        setPage(pageNum);
      }
    } catch (err: any) { setFetchError(getFriendlyErrorMessage(err, 'notifications')); }
    finally { setLoading(false); setRefreshing(false); setLoadingMore(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    setPage(1);
    setHasMore(true);
    fetchNotifications(1);
  }, [fetchNotifications]));

  useAutoRetry(() => { setPage(1); setHasMore(true); fetchNotifications(1); }, !loading);

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    fetchNotifications(page + 1, true);
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {}
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Notification', 'Remove this notification?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await notificationsApi.delete(id);
          setNotifications(prev => prev.filter(n => n._id !== id));
        } catch {}
      }},
    ]);
  };

  if (loading) return <SkeletonList variant="notification-card" />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            {notifications.filter(n => !n.isRead).length} unread
          </Text>
        </View>
        {notifications.some(n => !n.isRead) && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: '600' }]}>
              Mark All Read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setPage(1); setHasMore(true); fetchNotifications(1); }} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loadingMore ? <View style={{ padding: spacing.lg, alignItems: 'center' }}><Text style={[typography.caption, { color: colors.textTertiary }]}>Loading more...</Text></View> : null}
        ListEmptyComponent={
          <EmptyState icon="notifications-off-outline" title="No Notifications" message="You're all caught up!" hint="Pull down to refresh" />
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => { markAsRead(item._id); if (item.relatedEntityType === 'Report' && item.relatedEntityId) { navigation.navigate('ReportDetail' as never, { reportId: item.relatedEntityId } as never); } }} onLongPress={() => handleDelete(item._id)}>
            <Card
              style={[styles.notifCard, item.isRead ? undefined : styles.unreadCard]}
            >
              <View style={styles.notifRow}>
                <View style={[styles.notifIcon, item.isRead ? undefined : styles.notifIconUnread]}>
                  <Ionicons
                    name={
                      item.type === 'report_submitted' ? 'document-text' :
                      item.type === 'status_changed' ? 'swap-horizontal' :
                      'notifications'
                    }
                    size={20}
                    color={!item.isRead ? colors.primary : colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodySmall, { fontWeight: item.isRead ? '400' : '600', color: colors.text }]}>
                    {item.title}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                    {item.message}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>
                    {formatDate(item.createdAt)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item._id)} style={{ padding: 4 }}>
                  <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const getStyles = (c: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: c.text,
  },
  subtitle: {
    ...typography.bodySmall,
    color: c.textSecondary,
    marginTop: 2,
  },
  list: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: 100,
  },
  notifCard: {
    marginBottom: spacing.sm,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: c.primary,
  },
  notifRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifIconUnread: {
    backgroundColor: c.primaryBg,
  },
});
