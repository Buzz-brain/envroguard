import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { typography, spacing, borderRadius, shadows } from '../../constants';
import { useColors } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { studentsApi } from '../../api/students';
import { departmentsApi } from '../../api/departments';
import { ToastService } from '../../services/ToastService';
import { getFriendlyErrorMessage } from '../../services/apiErrors';
import { useAutoRetry } from '../../hooks/useAutoRetry';
import { impactLight, notificationSuccess, notificationError } from '../../utils/haptics';
import type { Student, Department as DeptType } from '../../types';

const PAGE_SIZE = 20;
const LEVELS = ['100', '200', '300', '400', '500'];

interface BatchRow {
  id: number;
  registrationNumber: string;
  fullName: string;
  email: string;
  department: string;
  level: string;
}

export default function StudentsScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const isSmallScreen = screenWidth < 400;
  const isDeptAdmin = user?.role === 'departmentAdmin';
  const isFacultyAdmin = user?.role === 'facultyAdmin';
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [importing, setImporting] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLevel, setEditLevel] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [batchRows, setBatchRows] = useState<BatchRow[]>([
    { id: 1, registrationNumber: '', fullName: '', email: '', department: '', level: '' },
  ]);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const batchIdRef = useRef(2);
  const [departments, setDepartments] = useState<DeptType[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const facultyDepts = departments.filter(
    d => isFacultyAdmin && user?.faculty && String(typeof d.faculty === 'string' ? d.faculty : d.faculty._id) === String(user.faculty)
  );
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    departmentsApi.getAll().then((res: any) => {
      if (res.data.success && Array.isArray(res.data.data)) setDepartments(res.data.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [search]);

  const fetchStudents = useCallback(async (pageNum = 1, append = false) => {
    try {
      setFetchError(null);
      const params: any = { page: pageNum, limit: PAGE_SIZE };
      if (debouncedSearch) params.search = debouncedSearch;
      const { data } = await studentsApi.getAll(params);
      if (data.success) {
        setStudents(prev => append ? [...prev, ...data.data] : data.data);
        setHasMore(data.data.length === PAGE_SIZE);
        setPage(pageNum);
      }
    } catch (err: any) { setFetchError(getFriendlyErrorMessage(err, 'students')); }
    finally { setLoading(false); setHasLoaded(true); setRefreshing(false); setLoadingMore(false); }
  }, [debouncedSearch]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    setHasLoaded(false);
    setPage(1);
    setHasMore(true);
    fetchStudents(1);
  }, [fetchStudents]));

  useAutoRetry(() => { setPage(1); setHasMore(true); fetchStudents(1); }, !loading);

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    fetchStudents(page + 1, true);
  };

  const handleImport = () => {
    setImportModalVisible(true);
  };

  const handlePickFile = async () => {
    setImportModalVisible(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ],
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const picked = result.assets[0];
      const formData = new FormData();
      if (Platform.OS === 'web') {
        let webFile = (picked as any).file;
        if (!webFile) {
          const response = await fetch(picked.uri);
          const blob = await response.blob();
          webFile = new File([blob], picked.name || 'students.csv', { type: picked.mimeType || 'text/csv' });
        }
        formData.append('file', webFile);
      } else {
        formData.append('file', {
          uri: picked.uri,
          name: picked.name,
          type: picked.mimeType || 'text/csv',
        } as any);
      }
      if (isDeptAdmin && user?.faculty) {
        const fid = typeof user.faculty === 'string' ? user.faculty : (user.faculty as any)?._id;
        if (fid) formData.append('facultyId', fid);
      }
      setImporting(true);
      const { data } = await studentsApi.importStudents(formData);
      if (data.success) {
        const result = data.data as any;
        const created = result?.created ?? 0;
        const failed = result?.failed ?? 0;
        const errors = result?.errors as Array<{ row: number; error: string }> | undefined;
        if (created > 0) {
          ToastService.success('Import Complete', `${created} student(s) imported successfully.`);
          notificationSuccess();
        } else if (failed > 0) {
          let msg = `Import completed with ${failed} failure(s).`;
          if (errors?.length) {
            msg += '\n' + errors.map(e => `Row ${e.row}: ${e.error}`).join('\n');
          }
          ToastService.error('Import Completed with Errors', msg);
          notificationError();
        }
        fetchStudents();
      }
    } catch (err: any) {
      const res = err.response?.data;
      let msg = res?.message || 'Failed to import students.';
      if (res?.errors?.length) {
        msg = res.errors.map((e: any) => e.message).join('\n');
      }
      ToastService.error('Import Failed', msg);
      notificationError();
    } finally {
      setImporting(false);
    }
  };

  const handleViewDetail = async (student: Student) => {
    setSelectedStudent(student);
    setEditName(student.fullName);
    setEditLevel(String(student.level));
    setEditDepartment(student.department);
    setEditing(false);
    setDetailLoading(true);
    try {
      const { data } = await studentsApi.getById(student._id);
      if (data.success) {
        setSelectedStudent(data.data);
        setEditName(data.data.fullName);
        setEditLevel(String(data.data.level));
        setEditDepartment(data.data.department);
      }
    } catch {}
    finally { setDetailLoading(false); }
  };

  const handleSaveEdit = async () => {
    if (!selectedStudent) return;
    if (!editName.trim() || !editLevel.trim() || !editDepartment.trim()) {
      setError('All fields are required'); return;
    }
    setSavingEdit(true);
    try {
      await studentsApi.update(selectedStudent._id, {
        fullName: editName.trim(),
        level: editLevel.trim(),
        department: editDepartment.trim(),
      });
      setSelectedStudent(prev => prev ? { ...prev, fullName: editName.trim(), level: editLevel.trim(), department: editDepartment.trim() } : null);
      setEditing(false);
      impactLight();
      notificationSuccess();
      setStudents(prev => prev.map(s => s._id === selectedStudent._id ? { ...s, fullName: editName.trim(), level: editLevel.trim(), department: editDepartment.trim() } : s));
      ToastService.success('Student Updated', 'Student information saved.');
    } catch (err: any) {
      ToastService.error('Error', err.response?.data?.message || 'Failed to update student');
      setError(err.response?.data?.message || 'Failed to update student');
      notificationError();
    } finally { setSavingEdit(false); }
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteError('');
    setConfirmDelete({ id, name });
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    setDeleteError('');
    const { id } = confirmDelete;
    try {
      await studentsApi.delete(id);
      setStudents(prev => prev.filter(s => s._id !== id));
      setConfirmDelete(null);
      notificationSuccess();
      ToastService.success('Student Deleted', 'Student has been removed.');
    } catch (err: any) {
      ToastService.error('Error', err.response?.data?.message || 'Failed to delete student');
      setDeleteError(err.response?.data?.message || 'Failed to delete student');
    }
  };

  const addBatchRow = () => {
    setBatchRows(prev => [
      ...prev,
      { id: batchIdRef.current++, registrationNumber: '', fullName: '', email: '', department: '', level: '' },
    ]);
  };

  const removeBatchRow = (id: number) => {
    setBatchRows(prev => prev.filter(r => r.id !== id));
  };

  const updateBatchRow = (id: number, field: keyof BatchRow, value: string) => {
    setBatchRows(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const openBatchModal = () => {
    const defaultDept = isDeptAdmin && user?.department ? user.department : '';
    setBatchRows([{ id: batchIdRef.current++, registrationNumber: '', fullName: '', email: '', department: defaultDept, level: '' }]);
    setBatchModalVisible(true);
  };

  const handleBatchSubmit = async () => {
    const valid = batchRows.every(r => r.registrationNumber && r.fullName && r.email && r.level && (isDeptAdmin || r.department));
    if (!valid) { Alert.alert('Error', isDeptAdmin ? 'Reg. Number, Name, Email, and Level are required for every row.' : 'All fields including Department are required for every row.'); return; }
    setBatchSubmitting(true);
    try {
      const { data } = await studentsApi.batchCreate(
        batchRows.map(r => ({
          registrationNumber: r.registrationNumber,
          fullName: r.fullName,
          email: r.email.toLowerCase(),
          department: r.department,
          level: r.level,
        }))
      );
      if (data.success) {
        setBatchModalVisible(false);
        const r = data.data;
        ToastService.success('Batch Complete', `${r.created} created, ${r.updated} updated, ${r.failed} failed.`);
        notificationSuccess();
        fetchStudents();
      }
    } catch (err: any) {
      ToastService.error('Batch Failed', err.userMessage || 'Failed to create students');
    } finally {
      setBatchSubmitting(false);
    }
  };

  if (loading) return <SkeletonList variant="student-card" />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Students</Text>
          <Text style={styles.subtitle}>{students.length} students</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {isDeptAdmin && <Button title="Batch Entry" onPress={openBatchModal} variant="outline" size="sm" />}
          {(isDeptAdmin || isFacultyAdmin) && <Button title="Import" onPress={handleImport} variant="outline" size="sm" loading={importing} />}
        </View>
      </View>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search students..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
        {search && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={students}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setPage(1); setHasMore(true); fetchStudents(1); }} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loadingMore ? <View style={{ padding: spacing.lg, alignItems: 'center' }}><Text style={[typography.caption, { color: colors.textTertiary }]}>Loading more...</Text></View> : null}
        ListEmptyComponent={
          hasLoaded ? <EmptyState icon="people-outline" title="No Students" message="Import students or add them manually." hint="Pull down to refresh" /> : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleViewDetail(item)}>
            <Card style={styles.studentCard}>
              <View style={styles.studentRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.fullName.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { fontWeight: '600', color: colors.text }]}>{item.fullName}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {item.registrationNumber} • {item.department}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textTertiary }]}>
                    Level {item.level}
                  </Text>
                </View>
                {isDeptAdmin && (
                  <TouchableOpacity onPress={() => handleDelete(item._id, item.fullName)}>
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
      {/* Import Instruction Modal */}
      <Modal visible={importModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Import Students</Text>
                <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 2 }]}>
                  Upload a file to add students in bulk
                </Text>
              </View>
              <TouchableOpacity onPress={() => setImportModalVisible(false)} style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceAlt }]}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.importInfoCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
              <Text style={[typography.label, { color: colors.text, fontWeight: '700', marginBottom: spacing.sm }]}>
                Accepted File Types
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                {[{ ext: '.csv', icon: 'document-text', desc: 'CSV (Comma-Separated Values)' },
                  { ext: '.xlsx', icon: 'grid', desc: 'Excel Workbook' },
                  { ext: '.xls', icon: 'grid', desc: 'Excel 97-2004 Workbook' },
                ].map(t => (
                  <View key={t.ext} style={[styles.importTypeBadge, { backgroundColor: colors.primaryBg, borderColor: colors.primary + '30' }]}>
                    <Ionicons name={t.icon as any} size={16} color={colors.primary} />
                    <Text style={[typography.caption, { color: colors.primary, fontWeight: '600', marginLeft: 4 }]}>{t.ext}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.importInfoCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
              <Text style={[typography.label, { color: colors.text, fontWeight: '700', marginBottom: spacing.sm }]}>
                Required Columns
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.sm }]}>
                Your file must include these columns in the first row:
              </Text>
              {[
                { col: 'fullName', desc: 'Student full name', req: true },
                { col: 'email', desc: 'Valid school email address', req: true },
                { col: 'registrationNumber', desc: 'Unique registration number', req: true },
                { col: 'level', desc: 'e.g. 100, 200, 300, 400, 500', req: true },
                { col: 'department', desc: isDeptAdmin ? 'Auto-set to your department — column optional' : 'Department code or name', req: !isDeptAdmin },
              ].map(col => (
                <View key={col.col} style={styles.importColRow}>
                  <View style={[styles.importColBadge, { backgroundColor: col.req ? colors.primaryBg : colors.surfaceAlt }]}>
                    <Text style={[typography.caption, { color: col.req ? colors.primary : colors.textSecondary, fontWeight: '700', fontFamily: 'monospace' }]}>
                      {col.col}
                    </Text>
                  </View>
                  <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>{col.desc}</Text>
                  {col.req ? (
                    <Text style={[typography.caption, { color: colors.danger, fontWeight: '600' }]}>Required</Text>
                  ) : (
                    <Text style={[typography.caption, { color: colors.success, fontWeight: '600' }]}>Optional</Text>
                  )}
                </View>
              ))}
            </View>

            <View style={[styles.importInfoCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
              <Text style={[typography.label, { color: colors.text, fontWeight: '700', marginBottom: spacing.sm }]}>
                Sample Row
              </Text>
              <View style={[styles.importSampleBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[typography.caption, { color: colors.textSecondary, fontFamily: 'monospace', fontSize: 12, lineHeight: 20 }]}>
                  fullName,email,registrationNumber,level{isDeptAdmin ? '' : ',department'}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, fontFamily: 'monospace', fontSize: 12, lineHeight: 20 }]}>
                  John Doe,john.doe@school.edu,20210001,200{isDeptAdmin ? '' : ',CS'}
                </Text>
              </View>
              <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.xs }]}>
                First row must be headers. Each subsequent row = one student.
              </Text>
            </View>

            {isFacultyAdmin && facultyDepts.length > 0 && (
              <View style={[styles.importInfoCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
                <Text style={[typography.label, { color: colors.text, fontWeight: '700', marginBottom: spacing.sm }]}>
                  Available Departments Under Your Faculty
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
                  {facultyDepts.map(d => (
                    <View key={d._id} style={[styles.importTypeBadge, { backgroundColor: colors.primaryBg, borderColor: colors.primary + '30' }]}>
                      <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>{d.code}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
              <Button title="Cancel" onPress={() => setImportModalVisible(false)} variant="outline" size="lg" style={{ flex: 1 }} />
              <Button title="Choose File" onPress={handlePickFile} size="lg" style={{ flex: 1 }} />
            </View>
          </ScrollView>
        </View>
      </Modal>
      {/* Student Detail Modal */}
      <Modal visible={!!selectedStudent} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Student Details</Text>
              <TouchableOpacity onPress={() => setSelectedStudent(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {detailLoading ? (
              <Loading />
            ) : selectedStudent ? (
              <>
                <View style={styles.detailAvatarSection}>
                  <View style={styles.detailAvatar}>
                    <Text style={styles.detailAvatarText}>{selectedStudent.fullName.charAt(0)}</Text>
                  </View>
                  <Text style={styles.detailName}>{selectedStudent.fullName}</Text>
                </View>

                <View style={styles.detailFields}>
                  {editing ? (
                    <>
                      <View style={styles.detailField}>
                        <Ionicons name="person-outline" size={18} color={colors.primary} />
                        <View style={{ marginLeft: spacing.md, flex: 1 }}>
                          <Text style={[typography.caption, { color: colors.textSecondary }]}>Full Name</Text>
                          <TextInput style={styles.editInput} value={editName} onChangeText={setEditName} />
                        </View>
                      </View>
                      <View style={[styles.detailField, styles.detailFieldBorder]}>
                        <Ionicons name="business-outline" size={18} color={colors.primary} />
                        <View style={{ marginLeft: spacing.md, flex: 1 }}>
                          <Text style={[typography.caption, { color: colors.textSecondary }]}>Department</Text>
                          <TextInput style={styles.editInput} value={editDepartment} onChangeText={setEditDepartment} />
                        </View>
                      </View>
                      <View style={[styles.detailField, styles.detailFieldBorder]}>
                        <Ionicons name="trending-up-outline" size={18} color={colors.primary} />
                        <View style={{ marginLeft: spacing.md, flex: 1 }}>
                          <Text style={[typography.caption, { color: colors.textSecondary }]}>Level</Text>
                          <TextInput style={styles.editInput} value={editLevel} onChangeText={setEditLevel} />
                        </View>
                      </View>
                    </>
                  ) : (
                    [
                      { label: 'Registration No.', value: selectedStudent.registrationNumber, icon: 'id-card-outline' },
                      { label: 'Email', value: selectedStudent.email, icon: 'mail-outline' },
                      { label: 'Department', value: selectedStudent.department, icon: 'business-outline' },
                      { label: 'Level', value: String(selectedStudent.level), icon: 'trending-up-outline' },
                      { label: 'Faculty', value: typeof selectedStudent.faculty === 'object' ? selectedStudent.faculty.name : selectedStudent.faculty || 'N/A', icon: 'school-outline' },
                      { label: 'Status', value: selectedStudent.isEligible ? 'Active' : 'Inactive', icon: 'checkmark-circle-outline' },
                    ].map((field, i) => (
                      <View key={i} style={[styles.detailField, i > 0 && styles.detailFieldBorder]}>
                        <Ionicons name={field.icon as any} size={18} color={colors.primary} />
                        <View style={{ marginLeft: spacing.md, flex: 1 }}>
                          <Text style={[typography.caption, { color: colors.textSecondary }]}>{field.label}</Text>
                          <Text style={[typography.body, { color: colors.text, fontWeight: '500' }]}>{field.value}</Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>

                {editing ? (
                  <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
                    <Button title="Cancel" onPress={() => setEditing(false)} variant="outline" size="lg" style={{ flex: 1 }} />
                    <Button title="Save" onPress={handleSaveEdit} loading={savingEdit} size="lg" style={{ flex: 1 }} />
                  </View>
                ) : (
                  <>
                    <Button
                      title="Edit Student"
                      onPress={() => setEditing(true)}
                      variant="outline"
                      size="lg"
                      style={{ marginTop: spacing.lg }}
                    />
                    {isDeptAdmin && (
                      <Button
                        title="Delete Student"
                        onPress={() => {
                          setSelectedStudent(null);
                          handleDelete(selectedStudent._id, selectedStudent.fullName);
                        }}
                        variant="danger"
                        size="lg"
                        style={{ marginTop: spacing.md }}
                      />
                    )}
                  </>
                )}
              </>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
      {/* Batch Entry Modal */}
      <Modal visible={batchModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Batch Entry</Text>
                <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 2 }]}>
                  Add multiple students at once
                </Text>
              </View>
              <TouchableOpacity onPress={() => setBatchModalVisible(false)} style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceAlt }]}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
              {batchRows.map((row, index) => (
                <View key={row.id} style={[styles.batchRow, { backgroundColor: colors.surface, ...shadows.sm }]}>
                  <View style={styles.batchRowHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <View style={[styles.batchRowBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.batchRowBadgeText}>{index + 1}</Text>
                      </View>
                      <View>
                        <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>Student #{index + 1}</Text>
                        <Text style={[typography.caption, { color: colors.textTertiary }]}>Enter student details below</Text>
                      </View>
                    </View>
                    {batchRows.length > 1 && (
                      <TouchableOpacity onPress={() => removeBatchRow(row.id)} style={[styles.removeBtn, { backgroundColor: colors.dangerLight }]}>
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.batchFieldGroup}>
                    <View style={styles.fieldRow}>
                      <View style={isSmallScreen ? { flex: 1 } : { flex: 1 }}>
                        <Text style={[styles.batchFieldLabel, { color: colors.textSecondary }]}>Reg. Number</Text>
                        <TextInput
                          style={[styles.batchInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                          placeholder="e.g. 20211186172"
                          placeholderTextColor={colors.textTertiary}
                          value={row.registrationNumber}
                          onChangeText={v => updateBatchRow(row.id, 'registrationNumber', v)}
                          keyboardType="number-pad"
                          maxLength={11}
                        />
                      </View>
                      <View style={isSmallScreen ? { flex: 1.5 } : { flex: 2 }}>
                        <Text style={[styles.batchFieldLabel, { color: colors.textSecondary }]}>Full Name</Text>
                        <TextInput
                          style={[styles.batchInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                          placeholder="e.g. John Doe"
                          placeholderTextColor={colors.textTertiary}
                          value={row.fullName}
                          onChangeText={v => updateBatchRow(row.id, 'fullName', v)}
                        />
                      </View>
                    </View>

                    <View>
                      <Text style={[styles.batchFieldLabel, { color: colors.textSecondary }]}>Email</Text>
                      <TextInput
                        style={[styles.batchInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                        placeholder="e.g. john.doe@school.edu"
                        placeholderTextColor={colors.textTertiary}
                        value={row.email}
                        onChangeText={v => updateBatchRow(row.id, 'email', v)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>

                    {isDeptAdmin ? (
                      <View>
                        <Text style={[styles.batchFieldLabel, { color: colors.textSecondary }]}>Department</Text>
                        <View style={[styles.batchInput, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' }]}>
                          <Ionicons name="business-outline" size={16} color={colors.primary} />
                          <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginLeft: spacing.sm }]}>
                            {user?.department || 'Your Department'}
                          </Text>
                          <Text style={[typography.caption, { color: colors.textTertiary, marginLeft: 'auto' }]}>Auto-set</Text>
                        </View>
                      </View>
                    ) : (
                      <View>
                        <Text style={[styles.batchFieldLabel, { color: colors.textSecondary }]}>Department</Text>
                        <View style={[styles.chipRow, { borderColor: colors.border }]}>
                          {(departments || []).map(d => (
                            <TouchableOpacity
                              key={d._id}
                              style={[styles.chip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, row.department === d.code && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                              onPress={() => updateBatchRow(row.id, 'department', d.code)}
                            >
                              <Text style={[styles.chipText, { color: colors.textSecondary }, row.department === d.code && styles.chipTextActive]}>{d.name || d.code}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    <View style={{ marginTop: spacing.sm }}>
                      <Text style={[styles.batchFieldLabel, { color: colors.textSecondary }]}>Level</Text>
                      <View style={[styles.chipRow, { borderColor: colors.border }]}>
                          {LEVELS.map(l => (
                              <TouchableOpacity
                                key={l}
                                style={[styles.chip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, row.level === l && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                                onPress={() => updateBatchRow(row.id, 'level', l)}
                              >
                                <Text style={[styles.chipText, { color: colors.textSecondary }, row.level === l && styles.chipTextActive]}>{l}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                    </View>
                  </View>
                ))}

              <TouchableOpacity onPress={addBatchRow} style={[styles.addRowButton, { borderColor: colors.primary }]}>
                <Ionicons name="add" size={20} color={colors.primary} />
                <Text style={[typography.label, { color: colors.primary, fontWeight: '600', marginLeft: spacing.xs }]}>
                  Add Another Student
                </Text>
              </TouchableOpacity>

              <Button
                title={`Submit ${batchRows.length} Student${batchRows.length > 1 ? 's' : ''}`}
                onPress={handleBatchSubmit}
                loading={batchSubmitting}
                size="lg"
                style={{ marginTop: spacing.lg, marginBottom: spacing.lg }}
              />
          </ScrollView>
        </View>
      </Modal>
      {/* Delete Confirmation Modal */}
      <Modal visible={!!confirmDelete} animationType="fade" transparent onRequestClose={() => { setConfirmDelete(null); setDeleteError(''); }}>
        <Pressable style={styles.confirmOverlay} onPress={() => { setConfirmDelete(null); setDeleteError(''); }}>
          <Pressable style={[styles.confirmCard, { backgroundColor: colors.surface }]} onPress={e => e.stopPropagation()}>
            <View style={styles.confirmIconWrap}>
              <View style={[styles.confirmIconBg, { backgroundColor: colors.dangerLight }]}>
                <Ionicons name="trash-outline" size={24} color={colors.danger} />
              </View>
            </View>
            {deleteError ? (
              <View style={[{ backgroundColor: colors.dangerLight, borderRadius: borderRadius.sm, padding: spacing.sm, marginBottom: spacing.sm, width: '100%' }]}>
                <Text style={[{ color: colors.danger, ...typography.caption, fontWeight: '600', textAlign: 'center' }]}>{deleteError}</Text>
              </View>
            ) : null}
            <Text style={[styles.confirmTitle, { color: colors.text }]}>Delete Student</Text>
            <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
              Remove "{confirmDelete?.name}"? This cannot be undone.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                onPress={() => { setConfirmDelete(null); setDeleteError(''); }}
                style={[styles.confirmBtn, { backgroundColor: colors.surfaceAlt }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.confirmBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={executeDelete}
                style={[styles.confirmBtn, { backgroundColor: colors.danger }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.confirmBtnText, { color: '#FFF' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.sm,
  },
  title: { ...typography.h2, color: '#1F2937' },
  subtitle: { ...typography.bodySmall, color: '#6B7280', marginTop: 2 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1F2937', marginLeft: spacing.sm, height: '100%' },
  list: { padding: spacing.lg, paddingTop: 0, paddingBottom: 100 },
  studentCard: { marginBottom: spacing.sm },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.h4, color: '#059669' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: { ...typography.h3, color: '#1F2937' },
  detailAvatarSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  detailAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  detailAvatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#059669',
  },
  detailName: { ...typography.h3, color: '#1F2937' },
  detailFields: {
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  detailField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  detailFieldBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  editInput: {
    fontSize: 15,
    color: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: spacing.xs,
    marginTop: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: '#DC2626',
    flex: 1,
  },
  batchScrollArea: {
    flex: 1,
  },
  batchRow: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  batchRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  batchRowBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchRowBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchFieldGroup: {
    gap: spacing.sm,
  },
  batchFieldLabel: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  batchInput: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginBottom: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  addRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    borderStyle: 'dashed',
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importInfoCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  importTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  importColRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  importColBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  importSampleBox: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  confirmIconWrap: {
    marginBottom: spacing.md,
  },
  confirmIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmTitle: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  confirmMessage: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    ...typography.label,
    fontWeight: '700',
  },
});
