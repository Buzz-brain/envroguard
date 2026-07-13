import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ImagePreview } from '../../components/ui/ImagePreview';
import { ErrorState } from '../../components/ui/ErrorState';
import { SkeletonDetail } from '../../components/ui/SkeletonDetail';
import { typography, spacing, borderRadius, categoryColors as cc } from '../../constants';
import { lightColors } from '../../constants/theme';
import { useColors } from '../../contexts/ThemeContext';
import { reportsApi } from '../../api/reports';
import { formatFullDateExtended } from '../../utils/helpers';
import type { HazardReport } from '../../types';

const { width } = Dimensions.get('window');

const catIcons: Record<string, string> = {
  Flooding: 'water',
  'Waste Dumping': 'trash',
  Pollution: 'flask',
  'Blocked Drainage': 'funnel',
  'Dirty Environment': 'brush',
  Others: 'alert-circle',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

const statusColors: Record<string, string> = {
  pending: '#F59E0B',
  under_review: '#3B82F6',
  in_progress: '#8B5CF6',
  resolved: '#10B981',
};

export default function ReportDetailScreen({ route }: any) {
  const colors = useColors();
  const styles = getStyles(colors);
  const { reportId } = route.params;
  const [report, setReport] = useState<HazardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => { fetchReport(); }, [reportId]);

  const fetchReport = async () => {
    setLoading(true); setError(null);
    try {
      const { data } = await reportsApi.getReportById(reportId);
      if (data.success) setReport(data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load report');
    } finally { setLoading(false); }
  };

  if (loading) return <SkeletonDetail />;
  if (error) return <ErrorState message={error} onRetry={fetchReport} />;
  if (!report) return <ErrorState message="Report not found" />;

  const catColor = cc[report.category] || '#6B7280';
  const images = report.images || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* ── Image Carousel ── */}
      {images.length > 0 && (
        <View style={styles.imageSection}>
          <TouchableOpacity activeOpacity={1} onPress={() => setPreviewImage(images[currentImageIndex].url)}>
            <Image
              source={{ uri: images[currentImageIndex].url }}
              style={styles.mainImage}
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
            />
            {imageLoading && (
              <View style={styles.imageLoader}>
                <ActivityIndicator size="large" color="#FFF" />
              </View>
            )}
          </TouchableOpacity>
          {/* Gradient overlay */}
          <View style={styles.imageOverlay} />
          {/* Image counter badge */}
          {images.length > 1 && (
            <View style={styles.imageCounter}>
              <Text style={styles.imageCounterText}>{currentImageIndex + 1}/{images.length}</Text>
            </View>
          )}
          {/* Dots */}
          {images.length > 1 && (
            <View style={styles.imageDots}>
              {images.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => setCurrentImageIndex(i)}>
                  <View style={[styles.dot, i === currentImageIndex && styles.dotActive]} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ── Hero Info ── */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={[styles.catIconWrap, { backgroundColor: colors.primaryBg }]}>
            <Ionicons name={catIcons[report.category] as any} size={24} color={colors.primary} />
          </View>
          <View style={styles.heroTitleWrap}>
            <Text style={styles.heroTitle}>{report.title}</Text>
            <View style={styles.heroMeta}>
              <Ionicons name="calendar-outline" size={13} color={colors.textTertiary} />
              <Text style={styles.heroMetaText}>{formatFullDateExtended(report.createdAt)}</Text>
            </View>
          </View>
          <StatusBadge status={report.status} />
        </View>
        <View style={styles.heroCategoryRow}>
          <View style={[styles.heroCategoryPill, { backgroundColor: colors.primaryBg }]}>
            <Ionicons name={catIcons[report.category] as any} size={13} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.heroCategoryText, { color: colors.primary }]}>{report.category}</Text>
          </View>
        </View>
      </View>

      {/* ── Description ── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHead}>
          <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.sectionLabel}>Description</Text>
        </View>
        <Text style={styles.descriptionText}>{report.description}</Text>
      </View>

      {/* ── Location ── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHead}>
          <Ionicons name="location-outline" size={18} color={colors.primary} />
          <Text style={styles.sectionLabel}>Location</Text>
        </View>
        <View style={styles.locationBody}>
          <Ionicons name="location" size={16} color={colors.primary} />
          <Text style={styles.locationAddress}>{report.location.address}</Text>
        </View>
        {report.location.coordinates?.length === 2 && (
          <View style={styles.coordRow}>
            <Ionicons name="compass-outline" size={13} color={colors.textTertiary} style={{ marginRight: 4 }} />
            <Text style={styles.coordText}>
              {report.location.coordinates[1].toFixed(6)}, {report.location.coordinates[0].toFixed(6)}
            </Text>
          </View>
        )}
      </View>

      {/* ── Reporter ── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHead}>
          <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.sectionLabel}>Reported By</Text>
        </View>
        <View style={styles.reporterRow}>
          <View style={[styles.reporterAvatar, { backgroundColor: colors.primaryBg }]}>
            <Text style={[styles.reporterInitial, { color: colors.primary }]}>
              {report.studentInfo.fullName?.charAt(0)?.toUpperCase() || 'S'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reporterName}>{report.studentInfo.fullName || 'Student'}</Text>
            <Text style={styles.reporterReg}>{report.studentInfo.registrationNumber}</Text>
          </View>
        </View>
      </View>

      {/* ── Status Timeline ── */}
      {report.statusHistory.length > 0 && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHead}>
            <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.sectionLabel}>Timeline</Text>
          </View>
          <View style={styles.timeline}>
            {report.statusHistory.map((entry, i) => {
              const sc = statusColors[entry.status] || '#6B7280';
              const isFirst = i === 0;
              return (
                <View key={i} style={styles.timelineItem}>
                  <View style={styles.timelineCol}>
                    {!isFirst && <View style={[styles.timelineLine, { backgroundColor: statusColors[report.statusHistory[i - 1].status] || '#E5E7EB' }]} />}
                    <View style={[styles.timelineDot, { backgroundColor: sc }, isFirst && styles.timelineDotActive]} />
                    {i < report.statusHistory.length - 1 && <View style={[styles.timelineLine, { backgroundColor: sc + '40' }]} />}
                  </View>
                  <View style={styles.timelineCard}>
                    <View style={[styles.timelineStatusBadge, { backgroundColor: sc + '15' }]}>
                      <Text style={[styles.timelineStatusText, { color: sc }]}>{statusLabels[entry.status] || entry.status}</Text>
                    </View>
                    {entry.note && (
                      <Text style={styles.timelineNote}>{entry.note}</Text>
                    )}
                    <Text style={styles.timelineDate}>{formatFullDateExtended(entry.changedAt)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <ImagePreview visible={!!previewImage} imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const getStyles = (c: typeof lightColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  content: { paddingTop: spacing.md },

  // ── Image ──
  imageSection: {
    position: 'relative',
  },
  imageLoader: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  mainImage: {
    width,
    height: width * 0.65,
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 80,
  },
  imageCounter: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  imageCounterText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  imageDots: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: {
    backgroundColor: '#FFF',
    width: 18,
    borderRadius: 3,
  },

  // ── Hero ──
  heroCard: {
    backgroundColor: c.surface,
    marginHorizontal: spacing.lg,
    marginTop: -spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: c.border,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  catIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitleWrap: {
    flex: 1,
  },
  heroTitle: {
    ...typography.h3,
    color: c.text,
    marginBottom: 2,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroMetaText: {
    fontSize: 12,
    color: c.textTertiary,
  },
  heroCategoryRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
  },
  heroCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  heroCategoryText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Section Card ──
  sectionCard: {
    backgroundColor: c.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: c.border,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...typography.label,
    color: c.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Description ──
  descriptionText: {
    ...typography.body,
    color: c.text,
    lineHeight: 26,
  },

  // ── Location ──
  locationBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  locationAddress: {
    ...typography.body,
    color: c.text,
    flex: 1,
  },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
  },
  coordText: {
    fontSize: 12,
    color: c.textTertiary,
    fontFamily: 'monospace',
  },

  // ── Reporter ──
  reporterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  reporterAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reporterInitial: {
    fontSize: 20,
    fontWeight: '700',
  },
  reporterName: {
    ...typography.body,
    fontWeight: '600',
    color: c.text,
  },
  reporterReg: {
    ...typography.caption,
    color: c.textSecondary,
    marginTop: 1,
  },

  // ── Timeline ──
  timeline: {},
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  timelineCol: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 1,
  },
  timelineDotActive: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 30,
  },
  timelineCard: {
    flex: 1,
    marginLeft: spacing.md,
    paddingBottom: spacing.md,
  },
  timelineStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  timelineStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timelineNote: {
    ...typography.bodySmall,
    color: c.textSecondary,
    marginTop: spacing.xs,
  },
  timelineDate: {
    fontSize: 11,
    color: c.textTertiary,
    marginTop: 3,
  },
});
