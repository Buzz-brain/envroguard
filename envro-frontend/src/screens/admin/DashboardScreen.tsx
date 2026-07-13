import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { DashboardSkeleton } from '../../components/ui/DashboardSkeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { spacing, borderRadius, REPORT_STATUS, categoryColors, categoryIcons, statusColors, statusLabels } from '../../constants';
import { useColors } from '../../contexts/ThemeContext';
import { reportsApi } from '../../api/reports';
import { studentsApi } from '../../api/students';
import { facultiesApi } from '../../api/faculties';
import { departmentsApi } from '../../api/departments';
import { adminsApi } from '../../api/admins';
import { notificationsApi } from '../../api/notifications';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, capitalize, formatRole } from '../../utils/helpers';
import type { DashboardStats, Notification } from '../../types';

const { width } = Dimensions.get('window');
const PADDING = spacing.lg;
const CARD_GAP = spacing.sm;
const HALF_GAP = CARD_GAP / 2;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PANEL_WIDTH = Math.min(width * 0.85, 380);

const statCardConfig = [
  { key: 'totalReports', label: 'Total Reports', icon: 'document-text' as const },
  { key: 'pendingReports', label: 'Pending', icon: 'time' as const },
  { key: 'inProgressReports', label: 'In Progress', icon: 'sync' as const },
  { key: 'resolvedReports', label: 'Resolved', icon: 'checkmark-circle' as const },
] as const;

const statCardStatus: Record<string, string> = {
  totalReports: '',
  pendingReports: REPORT_STATUS.PENDING,
  inProgressReports: REPORT_STATUS.IN_PROGRESS,
  resolvedReports: REPORT_STATUS.RESOLVED,
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatCompact(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

export default function DashboardScreen({ navigation }: any) {
  const colors = useColors();
  const styles = getStyles(colors);
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [panelVisible, setPanelVisible] = useState(false);
  const [notifList, setNotifList] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState('');
  const [statsError, setStatsError] = useState('');
  const slideAnim = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const openNotificationPanel = useCallback(() => {
    setPanelVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
    fetchNotifications();
  }, []);

  const closeNotificationPanel = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: PANEL_WIDTH, duration: 250, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setPanelVisible(false));
  }, []);

  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    setNotifError('');
    try {
      const { data } = await notificationsApi.getAll({ page: 1, limit: 30 });
      if (data.success) setNotifList(data.data);
    } catch (err: any) {
      setNotifError(err.response?.data?.message || 'Failed to load notifications');
    }
    finally { setNotifLoading(false); }
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsError('');
    try {
      if (user?.role === 'environmentalAdmin') {
        const { data } = await adminsApi.getDashboard();
        if (data.success) {
          const d = data.data;
          setStats({
            totalReports: d.reports.total,
            pendingReports: d.reports.pending,
            inProgressReports: d.reports.inProgress,
            resolvedReports: d.reports.resolved,
            totalStudents: d.users.totalStudents,
            totalFaculties: d.users.activeFaculties,
            reportsByCategory: d.byCategory || [],
            reportsByStatus: d.byStatus || [],
            recentReports: d.recentReports || [],
            monthlyTrend: d.monthlyTrend || [],
            reportsThisMonth: d.reports.thisMonth,
            reportsThisWeek: d.reports.thisWeek,
          });
        }
      } else {
        const isFacultyScoped = user?.role === 'facultyAdmin' || user?.role === 'departmentAdmin';
        const [reportRes, studentRes, orgRes] = await Promise.all([
          reportsApi.getReportStats(),
          studentsApi.getStats(),
          isFacultyScoped
            ? departmentsApi.getAll({ faculty: user?.faculty })
            : facultiesApi.getAll(),
        ]);
        if (reportRes.data.success) {
          setStats({
            ...reportRes.data.data,
            totalStudents: studentRes.data?.data?.total ?? studentRes.data?.data?.length ?? 0,
            totalFaculties: isFacultyScoped ? 0 : (orgRes.data?.data?.length ?? 0),
            totalDepartments: isFacultyScoped ? (orgRes.data?.data?.length ?? 0) : undefined,
          });
        }
      }
    } catch (err: any) {
      setStatsError(err.response?.data?.message || 'Failed to refresh dashboard');
    }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { fetchStats(); }, [fetchStats]));

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const { data } = await notificationsApi.getStats();
        if (data.success) setUnreadCount(data.data?.unread ?? data.data?.unreadCount ?? 0);
      } catch {}
    })();
  }, []));

  const greeting = useMemo(() => getGreeting(), []);
  const roleLabel = useMemo(() => formatRole(user?.role || ''), [user]);
  const heroInitial = user?.fullName
    ? user.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : capitalize(user?.role || 'U').charAt(0);
  const pendingCount = stats?.pendingReports ?? 0;

  if (loading) return <DashboardSkeleton />;
  if (!stats) return <ErrorState message="Failed to load dashboard" onRetry={fetchStats} />;

  const monthlyTrend = stats.monthlyTrend || [];
  const trendMax = monthlyTrend.length > 0 ? Math.max(...monthlyTrend.map(t => t.count)) : 1;
  const categoryData = stats.reportsByCategory || [];
  const catMax = categoryData.length > 0 ? Math.max(...categoryData.map(c => c.count)) : 1;
  const recentReports = stats.recentReports || [];

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} />}
    >
      {/* ─── Hero Header ─── */}
      <LinearGradient
        colors={['#059669', '#047857', '#065F46']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroUserRow}>
            <View style={[styles.heroAvatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.heroAvatarText}>{heroInitial}</Text>
            </View>
            <View>
              <Text style={styles.heroGreeting}>{greeting},</Text>
              <Text style={styles.heroRole}>{roleLabel}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={openNotificationPanel} style={styles.bellWrap}>
            <Ionicons name="notifications-outline" size={22} color="#FFF" />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        {pendingCount > 0 && (
          <View style={styles.heroBottom}>
            <Ionicons name="pulse" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.heroStatus} numberOfLines={1}>
              {pendingCount} pending report{pendingCount > 1 ? 's' : ''} need attention
            </Text>
          </View>
        )}
      </LinearGradient>

      {statsError && (
        <View style={[styles.errorBanner, { backgroundColor: colors.dangerLight }]}>
          <Ionicons name="alert-circle" size={18} color={colors.danger} />
          <Text style={[styles.errorBannerText, { color: colors.danger }]}>{statsError}</Text>
          <TouchableOpacity onPress={() => setStatsError('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      )}

      {/* ─── Premium Stat Cards ─── */}
      <View style={styles.statsGrid}>
        {statCardConfig.map((card) => {
          const val = (stats as any)[card.key] as number;
          return (
            <TouchableOpacity
              key={card.key}
              style={styles.statCardOuter}
              onPress={() => navigation.navigate('Reports' as never, { screen: 'AdminReportsList', params: { status: statCardStatus[card.key] } } as never)}
              activeOpacity={0.7}
            >
              <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                <View style={[styles.statIconRing, { backgroundColor: colors.primaryBg }]}>
                  <Ionicons name={card.icon} size={20} color={colors.primary} />
                </View>
                <Text style={[styles.statNumber, { color: colors.text }]}>
                  {formatCompact(val || 0)}
                </Text>
                <View style={styles.statLabelRow}>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]} numberOfLines={1}>
                    {card.label}
                  </Text>
                  <Ionicons name="chevron-forward" size={12} color={colors.textTertiary} />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ─── Meta Chips ─── */}
      {(() => {
        const isFacultyScoped = user?.role === 'facultyAdmin' || user?.role === 'departmentAdmin';
        const pluralize = (count: number, word: string) => `${formatCompact(count)} ${count < 2 ? word : word + 's'}`;
        const showStudents = stats.totalStudents !== undefined;
        const showOrg = isFacultyScoped
          ? stats.totalDepartments !== undefined
          : stats.totalFaculties !== undefined;
        if (!showStudents && !showOrg) return null;
        return (
          <View style={styles.metaChips}>
            {showStudents && (
              <View style={[styles.metaChip, { backgroundColor: colors.surface }]}>
                <Ionicons name="people" size={14} color={colors.primary} />
                <Text style={[styles.metaChipText, { color: colors.textSecondary }]}>{pluralize(stats.totalStudents!, 'Student')}</Text>
              </View>
            )}
            {showOrg && (
              <View style={[styles.metaChip, { backgroundColor: colors.surface }]}>
                <Ionicons name={isFacultyScoped ? 'layers' : 'business'} size={14} color={colors.primary} />
                <Text style={[styles.metaChipText, { color: colors.textSecondary }]}>
                  {pluralize(isFacultyScoped ? (stats.totalDepartments ?? 0) : (stats.totalFaculties ?? 0), isFacultyScoped ? 'Department' : 'Faculty')}
                </Text>
              </View>
            )}
          </View>
        );
      })()}



      {/* ─── Category Breakdown ─── */}
      {categoryData.length > 0 && (
        <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleRow}>
              <View style={[styles.chartDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.chartTitle, { color: colors.text }]}>By Category</Text>
            </View>
            <Text style={[styles.chartSubtitle, { color: colors.textTertiary }]}>
              {categoryData.length} categories
            </Text>
          </View>
          {categoryData.map((cat, i) => {
            const pct = (cat.count / catMax) * 100;
            const accent = categoryColors[cat._id] || '#6B7280';
            const icon = categoryIcons[cat._id] || 'alert-circle';
            return (
              <View key={i} style={styles.catRow}>
                <View style={[styles.catAccent, { backgroundColor: accent }]} />
                <View style={[styles.catIconBox, { backgroundColor: colors.primaryBg }]}>
                  <Ionicons name={icon as any} size={16} color={colors.primary} />
                </View>
                <View style={styles.catLabelRow}>
                  <Text style={[styles.catLabel, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{cat._id}</Text>
                </View>
                <View style={styles.catBarTrack}>
                  <View style={[styles.catBarFill, { width: `${pct}%`, backgroundColor: accent }]} />
                </View>
                <Text style={[styles.catValue, { color: colors.text }]}>{cat.count}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* ─── Monthly Trend ─── */}
      {monthlyTrend.length > 0 && (
        <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleRow}>
              <View style={[styles.chartDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.chartTitle, { color: colors.text }]}>Monthly Trend</Text>
            </View>
            <Text style={[styles.chartSubtitle, { color: colors.textTertiary }]}>
              Last {monthlyTrend.length} months{stats.reportsThisWeek !== undefined ? ` · This Week: ${stats.reportsThisWeek}` : ''}
            </Text>
          </View>
          <View style={styles.barChart}>
            {monthlyTrend.map((m, i) => {
              const barH = (m.count / trendMax) * 140;
              return (
                <View key={i} style={styles.barCol}>
                  <Text style={[styles.barValue, { color: colors.textTertiary }]}>{m.count}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: barH, backgroundColor: i === monthlyTrend.length - 1 ? '#2563EB' : '#059669' }]} />
                  </View>
                  <Text style={[styles.barLabel, { color: colors.textTertiary }]}>
                    {MONTHS[m._id.month - 1]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ─── Recent Reports ─── */}
      {recentReports.length > 0 && (
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.chartTitleRow}>
              <View style={[styles.chartDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Reports' as never, { screen: 'AdminReportsList', params: { status: '' } } as never)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.timeline, { backgroundColor: colors.surface }]}>
            {recentReports.slice(0, 5).map((report, idx) => {
              const sColor = statusColors[report.status] || '#9CA3AF';
              const isLast = idx === recentReports.slice(0, 5).length - 1;
              return (
                <View key={report._id} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, { backgroundColor: sColor }]}>
                      <View style={[styles.timelineDotInner, { backgroundColor: sColor + '40' }]} />
                    </View>
                    {!isLast && <View style={[styles.timelineLine, { backgroundColor: colors.borderLight }]} />}
                  </View>
                  <TouchableOpacity
                    style={styles.timelineContent}
                    onPress={() => navigation.navigate('ReportDetail', { reportId: report._id })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.timelineTop}>
                      <Text style={[styles.timelineTitle, { color: colors.text }]} numberOfLines={1}>
                        {report.title}
                      </Text>
                      <View style={[styles.timelineStatus, { backgroundColor: sColor + '18' }]}>
                        <Text style={[styles.timelineStatusText, { color: sColor }]}>
                          {statusLabels[report.status] || capitalize(report.status)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.timelineMetaRow}>
                      <View style={[styles.timelineCatIcon, { backgroundColor: colors.primaryBg }]}>
                        <Ionicons
                          name={(categoryIcons[report.category] || 'alert-circle') as any}
                          size={12}
                          color={colors.primary}
                        />
                      </View>
                      <Text style={[styles.timelineMeta, { color: colors.textTertiary }]}>
                        {report.category} · {formatDate(report.createdAt)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
      {panelVisible && (
        <>
          <Animated.View style={[styles.panelOverlay, { opacity: overlayAnim }]}>
            <TouchableOpacity style={{ flex: 1 }} onPress={closeNotificationPanel} activeOpacity={1} />
          </Animated.View>
          <Animated.View style={[styles.notificationPanel, { transform: [{ translateX: slideAnim }] }]}>
            <View style={[styles.panelHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.panelTitle, { color: colors.text }]}>Notifications</Text>
              <TouchableOpacity onPress={closeNotificationPanel} style={styles.panelClose}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {notifLoading ? (
              <View style={styles.panelLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : notifError ? (
              <View style={styles.panelEmpty}>
                <Ionicons name="alert-circle-outline" size={40} color={colors.danger} />
                <Text style={[styles.panelEmptyText, { color: colors.danger }]}>{notifError}</Text>
                <TouchableOpacity
                  onPress={fetchNotifications}
                  style={[styles.panelRetry, { backgroundColor: colors.primary }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh" size={16} color="#FFF" />
                  <Text style={styles.panelRetryText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : notifList.length === 0 ? (
              <View style={styles.panelEmpty}>
                <Ionicons name="notifications-off-outline" size={40} color={colors.textTertiary} />
                <Text style={[styles.panelEmptyText, { color: colors.textTertiary }]}>No notifications yet</Text>
              </View>
            ) : (
              <FlatList
                data={notifList}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.panelList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.notifItem, { backgroundColor: item.isRead ? 'transparent' : colors.primaryBg }]}
                    activeOpacity={item.relatedReport ? 0.7 : 1}
                    onPress={() => {
                      if (item.relatedReport) {
                        navigation.navigate('ReportDetail' as never, { reportId: item.relatedReport } as never);
                        closeNotificationPanel();
                      }
                    }}
                  >
                    <View style={[styles.notifDot, { backgroundColor: item.isRead ? colors.borderLight : colors.primary }]} />
                    <View style={styles.notifContent}>
                      <Text style={[styles.notifTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
                      <Text style={[styles.notifMessage, { color: colors.textTertiary }]} numberOfLines={2}>{item.message}</Text>
                      <Text style={[styles.notifTime, { color: colors.textTertiary }]}>{formatDate(item.createdAt)}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </Animated.View>
        </>
      )}
    </>
  );
}

const getStyles = (c: typeof import('../../constants/theme').lightColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: PADDING,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },

  /* ─── Hero ─── */
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'web' ? spacing.lg : spacing.xl + spacing.md,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: borderRadius.lg + 4,
    borderBottomRightRadius: borderRadius.lg + 4,
    position: 'relative',
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroAvatarText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    color: '#FFF',
  },
  heroGreeting: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.3,
  },
  heroRole: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#FFF',
    marginTop: 1,
  },
  bellWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: c.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 9,
    color: '#FFF',
  },
  heroBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  heroStatus: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    flex: 1,
  },

  /* ─── Stats Grid ─── */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: PADDING - HALF_GAP,
    marginTop: spacing.md,
  },
  statCardOuter: {
    width: '50%',
    paddingHorizontal: HALF_GAP,
    marginBottom: CARD_GAP,
  },
  statCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    paddingTop: spacing.md + 2,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
    }),
  },
  statIconRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statNumber: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  statLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginTop: 2,
  },

  /* ─── Meta Chips ─── */
  metaChips: {
    flexDirection: 'row',
    paddingHorizontal: PADDING,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
    }),
  },
  metaChipText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
  },

  /* ─── Charts ─── */
  chartCard: {
    marginHorizontal: PADDING,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    }),
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chartDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  chartTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
  },
  chartSubtitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
  },

  /* ─── Bar Chart ─── */
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 180,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barValue: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    marginBottom: 4,
  },
  barTrack: {
    width: 20,
    height: 140,
    borderRadius: 10,
    backgroundColor: c.borderLight,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 10,
    minHeight: 4,
  },
  barLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    marginTop: 6,
  },

  /* ─── Category Bars ─── */
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: borderRadius.md,
  },
  catAccent: {
    width: 3,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderTopLeftRadius: borderRadius.md,
    borderBottomLeftRadius: borderRadius.md,
  },
  catIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm + 3,
  },
  catLabelRow: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  catLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
  },
  catBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.borderLight,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  catBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  catValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    width: 32,
    textAlign: 'right',
  },

  /* ─── Recent Reports ─── */
  recentSection: {
    paddingHorizontal: PADDING,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
  },
  seeAll: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  timeline: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    }),
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  timelineDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },
  timelineContent: {
    flex: 1,
    marginLeft: spacing.md,
    paddingBottom: spacing.lg,
  },
  timelineTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  timelineTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  timelineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
  },
  timelineStatusText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  timelineMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
  },
  timelineCatIcon: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineMeta: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
  },

  /* ─── Notification Panel ─── */
  panelOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 100,
  },
  notificationPanel: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: PANEL_WIDTH,
    height: '100%',
    backgroundColor: c.surface,
    zIndex: 101,
    borderTopLeftRadius: borderRadius.xl,
    borderBottomLeftRadius: borderRadius.xl,
    ...Platform.select({
      web: { boxShadow: '-4px 0 24px rgba(0,0,0,0.12)' },
      default: { shadowColor: '#000', shadowOffset: { width: -2, height: 0 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10 },
    }),
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    paddingTop: Platform.OS === 'web' ? spacing.md : spacing.xxxl,
  },
  panelTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
  },
  panelClose: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  panelEmptyText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    textAlign: 'center',
  },
  panelRetry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
  },
  panelRetryText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#FFF',
  },
  panelList: {
    paddingVertical: spacing.xs,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  notifDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
  },
  notifMessage: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  notifTime: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    marginTop: 4,
  },
});
