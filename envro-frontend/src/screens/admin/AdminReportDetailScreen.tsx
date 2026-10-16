import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
  ActivityIndicator,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { ImagePreview } from '../../components/ui/ImagePreview';
import { ErrorState } from '../../components/ui/ErrorState';
import { SkeletonDetail } from '../../components/ui/SkeletonDetail';
import { MapPreview } from '../../components/ui/MapPreview';
import { typography, spacing, borderRadius, categoryColors as cc } from '../../constants';
import { lightColors } from '../../constants/theme';
import { useColors } from '../../contexts/ThemeContext';
import { reportsApi } from '../../api/reports';
import { adminsApi } from '../../api/admins';
import { ToastService } from '../../services/ToastService';
import { getFriendlyErrorMessage } from '../../services/apiErrors';
import { useAutoRetry } from '../../hooks/useAutoRetry';
import { useAuth } from '../../contexts/AuthContext';
import { formatFullDateExtended } from '../../utils/helpers';
import { showConfirm } from '../../utils/dialog';
import type { HazardReport, ReportStatus } from '../../types';

const { width } = Dimensions.get('window');

const openInMaps = (latitude: number, longitude: number) => {
  const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  Linking.openURL(url).catch(() => {});
};

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

const statusActions: { label: string; status: ReportStatus; color: string; icon: string }[] = [
  { label: 'Under Review', status: 'under_review', color: '#3B82F6', icon: 'eye-outline' },
  { label: 'In Progress', status: 'in_progress', color: '#8B5CF6', icon: 'construct-outline' },
  { label: 'Resolved', status: 'resolved', color: '#10B981', icon: 'checkmark-circle-outline' },
];

const transitionMap: Record<ReportStatus, ReportStatus[]> = {
  pending: ['under_review'],
  under_review: ['in_progress'],
  in_progress: ['resolved'],
  resolved: [],
};

const getAllowedActions = (currentStatus: ReportStatus) =>
  statusActions.filter((action) => (transitionMap[currentStatus] || []).includes(action.status));

// Exceptional backward transitions. Must mirror the backend policy.
const RETURN_REASON_MIN = 10;
const returnActions: {
  label: string;
  status: ReportStatus;
  color: string;
  icon: string;
  from: ReportStatus[];
}[] = [
  { label: 'Return to Under Review', status: 'under_review', color: '#D97706', icon: 'arrow-undo-outline', from: ['in_progress'] },
  { label: 'Return to In Progress', status: 'in_progress', color: '#D97706', icon: 'refresh-outline', from: ['resolved'] },
  { label: 'Return to Under Review', status: 'under_review', color: '#D97706', icon: 'refresh-outline', from: ['resolved'] },
];

const getReturnActions = (currentStatus: ReportStatus) =>
  returnActions.filter((action) => action.from.includes(currentStatus));

export default function AdminReportDetailScreen({ route, navigation }: any) {
  const colors = useColors();
  const styles = getStyles(colors);
  const { user } = useAuth();
  const { reportId } = route.params;
  const [report, setReport] = useState<HazardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [returnTarget, setReturnTarget] = useState<{ status: ReportStatus; label: string } | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnError, setReturnError] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ status: ReportStatus; label: string } | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [envAdmins, setEnvAdmins] = useState<any[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => { fetchReport(); }, [reportId]);
  useEffect(() => {
    setImageLoading(true);
  }, [reportId]);

  const fetchReport = async () => {
    setLoading(true); setError(null);
    try {
      const { data } = await reportsApi.getReportById(reportId);
      if (data.success) setReport(data.data);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err, 'reports'));
    } finally { setLoading(false); }
  };

  useAutoRetry(fetchReport, !loading && !!reportId);

  const openAssignModal = async () => {
    try {
      const { data } = await adminsApi.getEnvironmentalAdmins();
      if (data.success) setEnvAdmins(data.data);
      setShowAssignModal(true);
    } catch {
      ToastService.error('Error', 'Failed to load environmental admins');
    }
  };

  const handleAssign = async (adminId: string) => {
    setAssigning(true);
    try {
      const { data } = await reportsApi.assignReport(reportId, adminId);
      if (data.success) setReport(data.data);
      setShowAssignModal(false);
      ToastService.success('Report Assigned', 'The report has been assigned.');
    } catch (err: any) {
      ToastService.error('Error', err.response?.data?.message || 'Failed to assign report');
    } finally { setAssigning(false); }
  };

  const handleDelete = () => {
    showConfirm('Delete Report', 'Are you sure? This cannot be undone.', async () => {
      try {
        await reportsApi.deleteReport(reportId);
        ToastService.success('Report Deleted', 'The report has been removed.');
        navigation.goBack();
      } catch (err: any) {
        ToastService.error('Error', err.response?.data?.message || 'Failed to delete report');
      }
    }, 'Delete');
  };

  const performStatusUpdate = async (status: ReportStatus, reason?: string) => {
    if (!report) return;
    setUpdating(true);
    try {
      // Send the status we are acting on so the backend can reject stale requests.
      const { data } = await reportsApi.updateReportStatus(reportId, status, report.status, undefined, reason);
      if (data.success) setReport(data.data);
      ToastService.success(
        reason ? 'Report Returned' : 'Status Updated',
        reason ? 'The report was returned successfully.' : 'Report status changed successfully.'
      );
    } catch (err: any) {
      if (err.response?.status === 409) {
        ToastService.error('Report Changed', 'Someone else already updated this report. The latest status has been loaded.');
        await fetchReport();
      } else {
        ToastService.error('Error', err.response?.data?.message || 'Failed to update status');
      }
    } finally { setUpdating(false); }
  };

  const confirmForward = (action: { label: string; status: ReportStatus }) => {
    if (!report) return;
    setConfirmTarget({ status: action.status, label: action.label });
  };

  const closeConfirmModal = () => setConfirmTarget(null);

  const submitForward = () => {
    if (!confirmTarget) return;
    const target = confirmTarget;
    performStatusUpdate(target.status).then(closeConfirmModal);
  };

  const openReturnModal = (action: { label: string; status: ReportStatus }) => {
    setReturnTarget({ status: action.status, label: action.label });
    setReturnReason('');
    setReturnError(null);
  };

  const closeReturnModal = () => {
    setReturnTarget(null);
    setReturnReason('');
    setReturnError(null);
  };

  const submitReturn = () => {
    if (!report || !returnTarget) return;
    const trimmed = returnReason.trim();
    if (trimmed.length < RETURN_REASON_MIN) {
      setReturnError(`Please provide a reason of at least ${RETURN_REASON_MIN} characters.`);
      return;
    }
    if (trimmed.length > 500) {
      setReturnError('Reason cannot exceed 500 characters.');
      return;
    }
    const target = returnTarget;
    performStatusUpdate(target.status, trimmed).then(closeReturnModal);
  };

  if (loading) return <SkeletonDetail />;
  if (error) return <ErrorState message={error} onRetry={fetchReport} />;
  if (!report) return <ErrorState message="Report not found" />;

  const canUpdateStatus = user?.role === 'environmentalAdmin';
  const canDelete = user?.role === 'environmentalAdmin';
  const canAssign = user?.role === 'environmentalAdmin';
  const catColor = cc[report.category] || '#6B7280';
  const images = report.images || [];
  const hasImages = images.length > 0;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, images.length === 0 && styles.contentNoImage]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Back Button ── */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        {!hasImages && (
          <View style={styles.placeholderCard}>
            <View style={[styles.placeholderIcon, { backgroundColor: colors.primaryBg }]}> 
              <Ionicons name="image-outline" size={24} color={colors.primary} />
            </View>
            <Text style={styles.placeholderTitle}>No photo attached</Text>
            <Text style={styles.placeholderText}>No image was submitted with this report.</Text>
          </View>
        )}

        {/* ── Image ── */}
        {hasImages && (
          <View style={styles.imageSection}>
            <TouchableOpacity activeOpacity={1} onPress={() => setPreviewImage(images[0].url)}>
              <Image
                source={{ uri: images[0].url }}
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
            <View style={styles.imageOverlay} />
            {images.length > 1 && (
              <View style={styles.imageCounter}>
                <Text style={styles.imageCounterText}>{images.length} photos</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Hero Info ── */}
        <View style={[styles.heroCard, !hasImages && styles.heroCardNoImage]}>
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

          {!!report.location.placeName && (
            <View style={styles.placeRow}>
              <Ionicons name="navigate-circle" size={18} color={colors.primary} />
              <Text style={styles.placeName}>{report.location.placeName}</Text>
            </View>
          )}

          <View style={styles.locationBody}>
            <Ionicons name="location" size={16} color={colors.primary} />
            <Text style={styles.locationAddress}>{report.location.address}</Text>
          </View>

          {report.location.coordinates?.length === 2 && (
            <>
              <MapPreview
                latitude={report.location.coordinates[1]}
                longitude={report.location.coordinates[0]}
                height={160}
                style={{ marginTop: spacing.md }}
                onPress={() => openInMaps(report.location.coordinates[1], report.location.coordinates[0])}
              />
              <TouchableOpacity
                style={styles.openMapBtn}
                onPress={() => openInMaps(report.location.coordinates[1], report.location.coordinates[0])}
                activeOpacity={0.7}
              >
                <Ionicons name="open-outline" size={15} color={colors.primary} />
                <Text style={styles.openMapText}>Open in Maps</Text>
              </TouchableOpacity>
              <View style={styles.coordRow}>
                <Ionicons name="compass-outline" size={13} color={colors.textTertiary} style={{ marginRight: 4 }} />
                <Text style={styles.coordText}>
                  {report.location.coordinates[1].toFixed(6)}°, {report.location.coordinates[0].toFixed(6)}°
                </Text>
              </View>
            </>
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

        {/* ── Assign Info ── */}
        {report.assignedTo && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHead}>
              <Ionicons name="person-add-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.sectionLabel}>Assigned To</Text>
            </View>
            <Text style={[typography.body, { fontWeight: '600', color: colors.text }]}>
              {typeof report.assignedTo === 'string' ? 'Assigned' : 'Admin'}
            </Text>
          </View>
        )}

        {/* ── Status Update ── */}
        {canUpdateStatus && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHead}>
              <Ionicons name="swap-horizontal-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.sectionLabel}>Update Status</Text>
            </View>
            <View style={styles.statusGrid}>
              {getAllowedActions(report.status).map((action) => {
                const isCurrent = report.status === action.status;
                return (
                  <TouchableOpacity
                    key={action.status}
                    style={[styles.statusBtn, isCurrent && { backgroundColor: action.color + '18', borderColor: action.color }]}
                    onPress={() => confirmForward(action)}
                    disabled={updating || isCurrent}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={action.icon as any} size={18} color={isCurrent ? action.color : colors.textTertiary} />
                    <Text style={[styles.statusBtnText, { color: isCurrent ? action.color : colors.textSecondary }]}>
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {canAssign && (
              <TouchableOpacity style={styles.assignLink} onPress={openAssignModal} activeOpacity={0.7}>
                <Ionicons name="person-add-outline" size={18} color={colors.primary} />
                <Text style={styles.assignLinkText}>
                  {report.assignedTo ? 'Reassign Environmental Admin' : 'Assign to Environmental Admin'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Return / Reopen (exceptional) ── */}
        {canUpdateStatus && getReturnActions(report.status).length > 0 && (
          <View style={[styles.sectionCard, styles.returnCard]}>
            <View style={styles.sectionHead}>
              <Ionicons name="arrow-undo-outline" size={18} color="#D97706" />
              <Text style={[styles.sectionLabel, { color: '#D97706' }]}>Return / Reopen</Text>
            </View>
            <Text style={styles.returnHint}>
              Use these only when the report needs further work. A reason is required and will be shown to the student.
            </Text>
            <View style={styles.statusGrid}>
              {getReturnActions(report.status).map((action) => (
                <TouchableOpacity
                  key={`${report.status}-${action.status}`}
                  style={[styles.statusBtn, styles.returnBtn]}
                  onPress={() => openReturnModal(action)}
                  disabled={updating}
                  activeOpacity={0.7}
                >
                  <Ionicons name={action.icon as any} size={18} color="#D97706" />
                  <Text style={[styles.statusBtnText, { color: '#D97706' }]}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Danger Zone ── */}
        {canDelete && (
          <View style={[styles.sectionCard, styles.dangerZone]}>
            <View style={styles.sectionHead}>
              <Ionicons name="warning-outline" size={18} color={colors.danger} />
              <Text style={[styles.sectionLabel, { color: colors.danger }]}>Danger Zone</Text>
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.body, { fontWeight: '600', color: colors.danger }]}>Delete Report</Text>
                <Text style={[typography.caption, { color: colors.textTertiary }]}>This action cannot be undone</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Timeline ── */}
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
                      {entry.isReturn && (
                        <View style={styles.returnBadge}>
                          <Ionicons name="arrow-undo" size={11} color="#B45309" />
                          <Text style={styles.returnBadgeText}>
                            {entry.previousStatus === 'resolved' ? 'Reopened' : 'Returned for further work'}
                          </Text>
                        </View>
                      )}
                      {entry.note && <Text style={styles.timelineNote}>{entry.note}</Text>}
                      <Text style={styles.timelineDate}>{formatFullDateExtended(entry.changedAt)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* ── Assign Modal ── */}
      <Modal visible={showAssignModal} transparent animationType="slide" onRequestClose={() => setShowAssignModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign to Environmental Admin</Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)} style={styles.modalClose}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            {envAdmins.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Ionicons name="people-outline" size={40} color={colors.textTertiary} />
                <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
                  No environmental admins available
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.modalScroll}>
                {envAdmins.map((admin) => (
                  <TouchableOpacity
                    key={admin._id}
                    style={styles.adminOption}
                    onPress={() => handleAssign(admin._id)}
                    disabled={assigning}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.adminAvatar, { backgroundColor: colors.primaryBg }]}>
                      <Text style={[styles.avatarText, { color: colors.primary }]}>{admin.fullName?.charAt(0)?.toUpperCase() || 'A'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.body, { fontWeight: '600', color: colors.text }]}>{admin.fullName}</Text>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>{admin.email}</Text>
                    </View>
                    {assigning ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Forward Status Confirmation Modal ── */}
      <Modal visible={!!confirmTarget} transparent animationType="fade" onRequestClose={closeConfirmModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Status Change</Text>
              <TouchableOpacity onPress={closeConfirmModal} style={styles.modalClose}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>
              {report && confirmTarget
                ? `Are you sure you want to change this report's status from ${statusLabels[report.status] || report.status} to ${confirmTarget.label}?`
                : ''}
            </Text>
            <View style={styles.modalActions}>
              <Button title="No" variant="outline" onPress={closeConfirmModal} style={styles.modalActionBtn} />
              <Button title="Yes" onPress={submitForward} loading={updating} style={styles.modalActionBtn} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Return / Reopen Modal ── */}
      <Modal visible={!!returnTarget} transparent animationType="slide" onRequestClose={closeReturnModal}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{returnTarget?.label}</Text>
              <TouchableOpacity onPress={closeReturnModal} style={styles.modalClose}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.returnCurrent}>
              Current status: {report ? statusLabels[report.status] || report.status : ''}
            </Text>
            <Text style={styles.returnLabel}>Reason for returning the report</Text>
            <TextInput
              style={styles.returnInput}
              value={returnReason}
              onChangeText={(text) => {
                setReturnReason(text);
                if (returnError) setReturnError(null);
              }}
              placeholder="e.g. The waste disposal was incomplete, and further action is required."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              maxLength={500}
              editable={!updating}
            />
            <Text style={[styles.returnCount, returnReason.trim().length < RETURN_REASON_MIN && { color: colors.danger }]}>
              {returnReason.trim().length}/500 · minimum {RETURN_REASON_MIN}
            </Text>
            {returnError && <Text style={styles.returnError}>{returnError}</Text>}
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="outline" onPress={closeReturnModal} style={styles.modalActionBtn} />
              <Button title="Confirm Return" onPress={submitReturn} loading={updating} style={styles.modalActionBtn} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ImagePreview visible={!!previewImage} imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
    </View>
  );
}

const getStyles = (c: typeof lightColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  container: { flex: 1 },
  content: { paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  contentNoImage: { paddingTop: spacing.lg },

  placeholderCard: {
    backgroundColor: 'transparent',
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: c.border,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  placeholderIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderTitle: {
    ...typography.h4,
    color: c.text,
    marginTop: spacing.md,
  },
  placeholderText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // ── Back Button ──
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'web' ? spacing.lg : spacing.xxxl,
    left: spacing.md,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Image ──
  imageSection: { position: 'relative' },
  imageLoader: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  mainImage: { width, height: width * 0.55, resizeMode: 'cover' },
  imageOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 60,
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
  imageCounterText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

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
  heroCardNoImage: {
    marginTop: spacing.md,
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
  heroTitleWrap: { flex: 1 },
  heroTitle: { ...typography.h3, color: c.text, marginBottom: 2 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroMetaText: { fontSize: 12, color: c.textTertiary },
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
  heroCategoryText: { fontSize: 12, fontWeight: '700' },

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
  descriptionText: { ...typography.body, color: c.text, lineHeight: 26 },

  // ── Location ──
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  placeName: { ...typography.h4, color: c.text, flex: 1 },
  locationBody: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  locationAddress: { ...typography.body, color: c.text, flex: 1 },
  openMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: c.primaryBg,
    borderRadius: borderRadius.sm,
  },
  openMapText: { ...typography.label, color: c.primary, fontWeight: '600' },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
  },
  coordText: { fontSize: 12, color: c.textTertiary, fontFamily: 'monospace' },

  // ── Reporter ──
  reporterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reporterAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  reporterInitial: { fontSize: 20, fontWeight: '700' },
  reporterName: { ...typography.body, fontWeight: '600', color: c.text },
  reporterReg: { ...typography.caption, color: c.textSecondary, marginTop: 1 },

  // ── Status Update ──
  statusGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  statusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: c.border,
  },
  statusBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  assignLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
    gap: spacing.sm,
  },
  assignLinkText: {
    ...typography.bodySmall,
    color: c.primary,
    fontWeight: '600',
  },

  // ── Return / Reopen ──
  returnCard: {
    borderColor: '#FDE68A',
    borderWidth: 1.5,
  },
  returnBtn: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  returnHint: {
    ...typography.bodySmall,
    color: c.textSecondary,
    marginBottom: spacing.md,
  },
  returnCurrent: {
    ...typography.bodySmall,
    color: c.textSecondary,
    marginBottom: spacing.md,
  },
  returnLabel: {
    ...typography.label,
    color: c.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  returnInput: {
    borderWidth: 1.5,
    borderColor: c.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 96,
    color: c.text,
    textAlignVertical: 'top',
  },
  returnCount: {
    ...typography.caption,
    color: c.textTertiary,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  returnError: {
    ...typography.bodySmall,
    color: c.danger,
    marginTop: spacing.xs,
  },
  returnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: '#FEF3C7',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.xs,
  },
  returnBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalActionBtn: {
    flex: 1,
  },

  // ── Danger Zone ──
  dangerZone: {
    borderColor: c.dangerLight,
    borderWidth: 1.5,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // ── Timeline ──
  timeline: {},
  timelineItem: { flexDirection: 'row', marginBottom: spacing.sm },
  timelineCol: { width: 24, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, zIndex: 1 },
  timelineDotActive: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#FFF' },
  timelineLine: { width: 2, flex: 1, minHeight: 30 },
  timelineCard: { flex: 1, marginLeft: spacing.md, paddingBottom: spacing.md },
  timelineStatusBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.sm },
  timelineStatusText: { fontSize: 12, fontWeight: '700' },
  timelineNote: { ...typography.bodySmall, color: c.textSecondary, marginTop: spacing.xs },
  timelineDate: { fontSize: 11, color: c.textTertiary, marginTop: 3 },

  // ── Assign Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: c.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '65%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: { ...typography.h3, color: c.text },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {},
  modalEmpty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  adminOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: c.borderLight,
    gap: spacing.md,
  },
  adminAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700' },
});
