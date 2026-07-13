import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { typography, spacing, borderRadius } from '../../constants';
import { useColors } from '../../contexts/ThemeContext';
import { studentsApi } from '../../api/students';
import { departmentsApi } from '../../api/departments';
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
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
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
      const params: any = { page: pageNum, limit: PAGE_SIZE };
      if (debouncedSearch) params.search = debouncedSearch;
      const { data } = await studentsApi.getAll(params);
      if (data.success) {
        setStudents(prev => append ? [...prev, ...data.data] : data.data);
        setHasMore(data.data.length === PAGE_SIZE);
        setPage(pageNum);
      }
    } catch {}
    finally { setLoading(false); setRefreshing(false); setLoadingMore(false); }
  }, [debouncedSearch]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    setPage(1);
    setHasMore(true);
    fetchStudents(1);
  }, [fetchStudents]));

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    fetchStudents(page + 1, true);
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ],
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const file = result.assets[0];
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'text/csv',
      } as any);
      setImporting(true);
      const { data } = await studentsApi.importStudents(formData);
      if (data.success) {
        Alert.alert('Success', `${data.data?.count || 'Students'} imported successfully.`);
        notificationSuccess();
        fetchStudents();
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to import students.');
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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update student');
      notificationError();
    } finally { setSavingEdit(false); }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Student', `Remove ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await studentsApi.delete(id);
          setStudents(prev => prev.filter(s => s._id !== id));
          notificationSuccess();
        } catch {}
      }},
    ]);
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
    setBatchRows([{ id: batchIdRef.current++, registrationNumber: '', fullName: '', email: '', department: '', level: '' }]);
    setBatchModalVisible(true);
  };

  const handleBatchSubmit = async () => {
    const valid = batchRows.every(r => r.registrationNumber && r.fullName && r.email && r.department && r.level);
    if (!valid) { Alert.alert('Error', 'All fields are required for every row'); return; }
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
        Alert.alert('Done', `${r.created} created, ${r.updated} updated, ${r.failed} failed.`);
        notificationSuccess();
        fetchStudents();
      }
    } catch (err: any) {
      Alert.alert('Error', err.userMessage || 'Failed to create students');
    } finally {
      setBatchSubmitting(false);
    }
  };

  if (loading) return <SkeletonList variant="student-card" />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Students</Text>
          <Text style={styles.subtitle}>{students.length} students</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button title="Batch Entry" onPress={openBatchModal} variant="outline" size="sm" />
          <Button title="Import" onPress={handleImport} variant="outline" size="sm" loading={importing} />
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
          <EmptyState icon="people-outline" title="No Students" message="Import students or add them manually." hint="Pull down to refresh" />
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
                <TouchableOpacity onPress={() => handleDelete(item._id, item.fullName)}>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />

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
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Batch Entry</Text>
              <TouchableOpacity onPress={() => setBatchModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {batchRows.map((row, index) => (
              <View key={row.id} style={styles.batchRow}>
                <View style={styles.batchRowHeader}>
                  <Text style={[typography.bodySmall, { fontWeight: '700', color: colors.textSecondary }]}>
                    Student #{index + 1}
                  </Text>
                  {batchRows.length > 1 && (
                    <TouchableOpacity onPress={() => removeBatchRow(row.id)}>
                      <Ionicons name="close-circle" size={22} color={colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={styles.batchInput}
                      placeholder="Reg No. (11 digits)"
                      placeholderTextColor={colors.textTertiary}
                      value={row.registrationNumber}
                      onChangeText={v => updateBatchRow(row.id, 'registrationNumber', v)}
                      keyboardType="number-pad"
                      maxLength={11}
                    />
                  </View>
                  <View style={{ flex: 2 }}>
                    <TextInput
                      style={styles.batchInput}
                      placeholder="Full Name"
                      placeholderTextColor={colors.textTertiary}
                      value={row.fullName}
                      onChangeText={v => updateBatchRow(row.id, 'fullName', v)}
                    />
                  </View>
                </View>
                <TextInput
                  style={styles.batchInput}
                  placeholder="Email"
                  placeholderTextColor={colors.textTertiary}
                  value={row.email}
                  onChangeText={v => updateBatchRow(row.id, 'email', v)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.caption, { color: colors.textTertiary, marginBottom: 4 }]}>Dept.</Text>
                    <View style={styles.chipRow}>
                      {(departments || []).map(d => (
                        <TouchableOpacity
                          key={d._id}
                          style={[styles.chip, row.department === d.code && styles.chipActive]}
                          onPress={() => updateBatchRow(row.id, 'department', d.code)}
                        >
                          <Text style={[styles.chipText, row.department === d.code && styles.chipTextActive]}>{d.code}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.caption, { color: colors.textTertiary, marginBottom: 4 }]}>Level</Text>
                    <View style={styles.chipRow}>
                      {LEVELS.map(l => (
                        <TouchableOpacity
                          key={l}
                          style={[styles.chip, row.level === l && styles.chipActive]}
                          onPress={() => updateBatchRow(row.id, 'level', l)}
                        >
                          <Text style={[styles.chipText, row.level === l && styles.chipTextActive]}>{l}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity onPress={addBatchRow} style={styles.addRowButton}>
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: '600', marginLeft: spacing.xs }]}>
                Add Row
              </Text>
            </TouchableOpacity>

            <Button
              title={`Submit ${batchRows.length} Student${batchRows.length > 1 ? 's' : ''}`}
              onPress={handleBatchSubmit}
              loading={batchSubmitting}
              size="lg"
              style={{ marginTop: spacing.md }}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
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
    maxHeight: '80%',
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
  batchRow: {
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  batchRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  batchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: '#1F2937',
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  addRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: borderRadius.md,
    borderStyle: 'dashed',
    marginBottom: spacing.sm,
  },
});
