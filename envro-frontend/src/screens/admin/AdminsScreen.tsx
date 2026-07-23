import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  Modal,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lightColors } from '../../constants/theme';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { SkeletonList } from '../../components/ui/SkeletonList';
import { EmptyState } from '../../components/ui/EmptyState';
import { typography, spacing, borderRadius } from '../../constants';
import { useColors } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { adminsApi } from '../../api/admins';
import { facultiesApi } from '../../api/faculties';
import { departmentsApi } from '../../api/departments';
import { getFriendlyErrorMessage } from '../../services/apiErrors';
import { useAutoRetry } from '../../hooks/useAutoRetry';
import { ToastService } from '../../services/ToastService';
import type { Faculty, Department } from '../../types';

type AdminType = 'environmentalAdmin' | 'facultyAdmin' | 'departmentAdmin';

const PAGE_SIZE = 20;

export default function AdminsScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminType>(user?.role === 'environmentalAdmin' ? 'environmentalAdmin' : 'departmentAdmin');
  const [admins, setAdmins] = useState<any[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [toggleError, setToggleError] = useState('');
  const [fetchError, setFetchError] = useState('');

  // Quick department creation state
  const [quickDeptVisible, setQuickDeptVisible] = useState(false);
  const [quickDeptName, setQuickDeptName] = useState('');
  const [quickDeptCode, setQuickDeptCode] = useState('');
  const [quickDeptSaving, setQuickDeptSaving] = useState(false);
  const [quickDeptError, setQuickDeptError] = useState('');
  const [adminMenuTarget, setAdminMenuTarget] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleTarget, setToggleTarget] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<{ id: string; type: AdminType } | null>(null);

  const fetchDepartments = useCallback(async (facultyId?: string) => {
    try {
      const params: any = {};
      if (facultyId) params.faculty = facultyId;
      const { data } = await departmentsApi.getAll(params);
      if (data.success) setDepartments(data.data);
    } catch {}
  }, []);

  const fetchAdmins = useCallback(async (pageNum = 1, append = false) => {
    if (!append) { setFetchError(''); setLoading(true); }
    try {
      const params = { page: pageNum, limit: PAGE_SIZE };
      let data: any;
      if (activeTab === 'environmentalAdmin') {
        data = await adminsApi.getEnvironmentalAdmins(params);
      } else if (activeTab === 'facultyAdmin') {
        data = await adminsApi.getFacultyAdmins(params);
      } else {
        data = await adminsApi.getDepartmentAdmins(params);
      }
      if (data.data.success) {
        setAdmins(prev => append ? [...prev, ...data.data.data] : data.data.data);
        setHasMore(data.data.data.length === PAGE_SIZE);
        setPage(pageNum);
        if (!append) setTotalAdmins(data.data.meta?.pagination?.total ?? data.data.data.length);
      }
      if (activeTab !== 'environmentalAdmin') {
        const { data: facData } = await facultiesApi.getAll();
        if (facData.success) setFaculties(facData.data);
      }
    } catch (err: any) {
      if (!append) setFetchError(getFriendlyErrorMessage(err, 'admins'));
    }
    finally { setLoading(false); setHasLoaded(true); setRefreshing(false); setLoadingMore(false); }
  }, [activeTab]);

  useFocusEffect(useCallback(() => {
    setPage(1);
    setHasMore(true);
    fetchAdmins(1);
    if (activeTab === 'departmentAdmin') {
      const facultyId = user?.role === 'facultyAdmin' ? (typeof user.faculty === 'object' ? (user.faculty as any)?._id : user.faculty) : undefined;
      fetchDepartments(facultyId);
    }
  }, [fetchAdmins, activeTab, user, fetchDepartments]));

  useAutoRetry(() => { setPage(1); setHasMore(true); fetchAdmins(1); }, !loading);

  useEffect(() => {
    if (activeTab === 'departmentAdmin') {
      if (selectedFaculty) {
        fetchDepartments(selectedFaculty);
      } else if (user?.role === 'facultyAdmin' && user.faculty) {
        fetchDepartments(typeof user.faculty === 'object' ? (user.faculty as any)?._id : user.faculty);
      } else {
        fetchDepartments();
      }
    }
  }, [selectedFaculty, activeTab, user, fetchDepartments]);

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    fetchAdmins(page + 1, true);
  };

  const handleQuickCreateDept = async () => {
    setQuickDeptError('');
    if (!quickDeptName.trim()) { setQuickDeptError('Department name is required'); return; }
    if (!quickDeptCode.trim()) { setQuickDeptError('Department code is required'); return; }
    const faculty = selectedFaculty || user?.faculty;
    if (!faculty) { setQuickDeptError('Select a faculty first'); return; }
    setQuickDeptSaving(true);
    try {
      const { data } = await departmentsApi.create({
        name: quickDeptName.trim(),
        code: quickDeptCode.trim(),
        faculty,
      });
      if (data.success) {
        setQuickDeptVisible(false);
        setQuickDeptName(''); setQuickDeptCode('');
        setQuickDeptError('');
        await fetchDepartments(faculty);
        setSelectedDepartment(data.data._id || data.data?.department?._id);
        ToastService.success('Department Created', 'Department added successfully.');
      }
    } catch (err: any) {
      ToastService.error('Error', err.response?.data?.message || 'Failed to create department');
      setQuickDeptError(err.response?.data?.message || 'Failed to create department');
    } finally { setQuickDeptSaving(false); }
  };

  const handleCreate = async () => {
    setCreateError('');
    if (!name.trim()) { setCreateError('Name is required'); return; }
    if (!email.trim()) { setCreateError('Email is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setCreateError('Enter a valid email address'); return; }
    if (activeTab === 'facultyAdmin' && !selectedFaculty) {
      setCreateError('Faculty selection is required'); return;
    }
    if (activeTab === 'departmentAdmin' && (!selectedFaculty || !selectedDepartment)) {
      setCreateError('Faculty and department selection are required'); return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        if (editTarget.type === 'environmentalAdmin') {
          await adminsApi.updateEnvironmentalAdmin(editTarget.id, { fullName: name.trim(), email: email.toLowerCase() });
        } else if (editTarget.type === 'facultyAdmin') {
          await adminsApi.updateFacultyAdmin(editTarget.id, { fullName: name.trim(), email: email.toLowerCase(), faculty: selectedFaculty });
        } else {
          await adminsApi.updateDepartmentAdmin(editTarget.id, { fullName: name.trim(), email: email.toLowerCase(), faculty: selectedFaculty, department: selectedDepartment });
        }
      } else if (activeTab === 'environmentalAdmin') {
        await adminsApi.createEnvironmentalAdmin({ fullName: name.trim(), email: email.toLowerCase() });
      } else if (activeTab === 'facultyAdmin') {
        await adminsApi.createFacultyAdmin({ fullName: name.trim(), email: email.toLowerCase(), faculty: selectedFaculty });
      } else {
        await adminsApi.createDepartmentAdmin({ fullName: name.trim(), email: email.toLowerCase(), faculty: selectedFaculty, department: selectedDepartment });
      }
      setModalVisible(false);
      setName(''); setEmail(''); setSelectedFaculty(''); setSelectedDepartment('');
      setCreateError('');
      setEditTarget(null);
      fetchAdmins();
      ToastService.success(editTarget ? 'Admin Updated' : 'Admin Created', 'Admin account ' + (editTarget ? 'updated' : 'created') + ' successfully.');
    } catch (err: any) {
      ToastService.error('Error', err.response?.data?.message || (editTarget ? 'Failed to update admin' : 'Failed to create admin'));
      setCreateError(err.response?.data?.message || (editTarget ? 'Failed to update admin' : 'Failed to create admin'));
    } finally { setSaving(false); }
  };

  const handleToggle = (id: string) => {
    setToggleTarget(id);
  };

  const handleToggleConfirm = async () => {
    if (!toggleTarget) return;
    const id = toggleTarget;
    setTogglingId(id);
    setToggleError('');
    try {
      if (activeTab === 'environmentalAdmin') await adminsApi.toggleEnvironmentalAdminStatus(id);
      else if (activeTab === 'facultyAdmin') await adminsApi.toggleFacultyAdminStatus(id);
      else await adminsApi.toggleDepartmentAdminStatus(id);
      fetchAdmins();
      ToastService.success('Status Updated', 'Admin status changed successfully.');
    } catch (err: any) {
      ToastService.error('Error', err.response?.data?.message || 'Failed to toggle admin status');
      setToggleError(err.response?.data?.message || 'Failed to toggle admin status');
    }
    finally { setTogglingId(null); setToggleTarget(null); }
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteError('');
    setConfirmDelete({ id, name });
  };

  const openEditAdmin = (item: any) => {
    const fac = typeof item.faculty === 'string' ? item.faculty : item.faculty?._id;
    const dep = typeof item.department === 'string' ? item.department : item.department?._id;
    setEditTarget({ id: item._id, type: activeTab });
    setName(item.fullName || '');
    setEmail(item.email || '');
    setSelectedFaculty(fac || (user?.role === 'facultyAdmin' ? (typeof user.faculty === 'object' ? (user.faculty as any)?._id || '' : user.faculty || '') : ''));
    setSelectedDepartment(dep || '');
    setCreateError('');
    setToggleError('');
    setFetchError('');
    setModalVisible(true);
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    setDeleteError('');
    const { id } = confirmDelete;
    try {
      if (activeTab === 'environmentalAdmin') await adminsApi.deleteEnvironmentalAdmin(id);
      else if (activeTab === 'facultyAdmin') await adminsApi.deleteFacultyAdmin(id);
      else await adminsApi.deleteDepartmentAdmin(id);
      setAdmins(prev => prev.filter(a => a._id !== id));
      setTotalAdmins(prev => Math.max(0, prev - 1));
      setConfirmDelete(null);
      ToastService.success('Admin Deleted', 'Admin account has been removed.');
    } catch (err: any) {
      ToastService.error('Error', err.response?.data?.message || 'Failed to delete admin');
      setDeleteError(err.response?.data?.message || 'Failed to delete admin');
    }
  };

  const allTabs: { key: AdminType; label: string; shortLabel: string }[] = [
    { key: 'environmentalAdmin', label: 'Environmental Admins', shortLabel: 'Env. Admins' },
    { key: 'facultyAdmin', label: 'Faculty Admins', shortLabel: 'Faculty Admins' },
    { key: 'departmentAdmin', label: 'Dept. Admins', shortLabel: 'Dept. Admins' },
  ];

  const tabs = user?.role === 'environmentalAdmin'
    ? allTabs
    : user?.role === 'facultyAdmin'
    ? allTabs.filter(t => t.key === 'departmentAdmin')
    : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Admins</Text>
          <Text style={styles.subtitle}>{totalAdmins} admin{totalAdmins !== 1 ? 's' : ''}</Text>
        </View>
        <Button title="Add" onPress={() => {
          setCreateError(''); setName(''); setEmail('');
          const facId = user?.role === 'facultyAdmin' ? (typeof user.faculty === 'object' ? (user.faculty as any)?._id || '' : user.faculty || '') : '';
          setSelectedFaculty(facId);
          setSelectedDepartment(''); setEditTarget(null); setModalVisible(true); setToggleError(''); setFetchError('');
        }} size="sm" />
      </View>

      {tabs.length > 1 ? (
        <View style={styles.tabRow}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => { setActiveTab(tab.key); setToggleError(''); setFetchError(''); }}
            >
              <Text style={[typography.bodySmall, { fontWeight: '600', color: activeTab === tab.key ? '#FFF' : colors.textSecondary }]} numberOfLines={1}>
                {tab.shortLabel}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Text style={styles.sectionTitle}>{tabs[0]?.label || 'Dept. Admins'}</Text>
      )}

      {fetchError || toggleError ? (
        <View style={[styles.errorBox, { backgroundColor: colors.dangerLight, marginHorizontal: spacing.lg, marginBottom: spacing.sm }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[styles.errorText, { color: colors.danger, flex: 1 }]}>{fetchError || toggleError}</Text>
            <TouchableOpacity onPress={() => { setFetchError(''); setToggleError(''); }} style={{ paddingLeft: spacing.sm }}>
              <Ionicons name="close" size={16} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.list}>
          <SkeletonList variant="admin-card" />
        </View>
      ) : (
      <>
      <FlatList
        data={admins}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setPage(1); setHasMore(true); fetchAdmins(1); }} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loadingMore ? (
          <View style={styles.footerLoading}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.footerText}>Loading more...</Text>
          </View>
        ) : !hasMore && admins.length > 0 ? (
          <View style={styles.footerEnd}>
            <View style={[styles.footerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.footerText, { color: colors.textTertiary }]}>All admins loaded</Text>
            <View style={[styles.footerLine, { backgroundColor: colors.border }]} />
          </View>
        ) : null}
        ListEmptyComponent={
          hasLoaded ? (
            <EmptyState icon="shield-outline" title="No Admins" message={`No ${activeTab === 'environmentalAdmin' ? 'environmental' : activeTab === 'facultyAdmin' ? 'faculty' : 'department'} admins yet.`} />
          ) : null
        }
        renderItem={({ item }) => {
          return (
            <Card style={styles.adminCard}>
              <View style={styles.adminRow}>
                <View style={styles.adminAvatar}>
                  <Text style={styles.avatarText}>{item.fullName?.charAt(0) || 'A'}</Text>
                </View>
                <View style={{ flex: 1, flexShrink: 1 }}>
                  <Text style={[typography.body, { fontWeight: '600', color: colors.text, flexShrink: 1 }]}>{item.fullName}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>{item.email}</Text>
                  {item.department?.name && (
                    <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 2 }]} numberOfLines={1}>
                      {item.department.name} ({item.department.code})
                    </Text>
                  )}
                  <View style={[styles.activeBadge, { backgroundColor: item.isActive ? colors.successLight : colors.dangerLight, alignSelf: 'flex-start', marginTop: 4 }]}>
                    <Text style={[typography.caption, { color: item.isActive ? colors.success : colors.danger, fontWeight: '600' }]}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => setAdminMenuTarget(item)} style={styles.actionBtn} activeOpacity={0.7}>
                    <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          );
        }}
      />
      </>
      )}

      {/* Create Admin Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => { setModalVisible(false); setCreateError(''); }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editTarget ? 'Edit' : 'New'} {activeTab === 'environmentalAdmin' ? 'Environmental' : activeTab === 'facultyAdmin' ? 'Faculty' : 'Department'} Admin
                </Text>
                <TouchableOpacity onPress={() => { setModalVisible(false); setCreateError(''); }}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
              {createError ? (
                <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
                  <Text style={[styles.errorText, { color: colors.danger }]}>{createError}</Text>
                </View>
              ) : null}
              <Input label="Full Name" placeholder="Full name" value={name} onChangeText={(t) => { setName(t); setCreateError(''); }} leftIcon="person-outline" />
              <Input label="Email" placeholder="admin@school.edu" value={email} onChangeText={(t) => { setEmail(t); setCreateError(''); }} autoCapitalize="none" keyboardType="email-address" leftIcon="mail-outline" />
              {activeTab !== 'environmentalAdmin' && (
                <View style={{ marginBottom: spacing.md }}>
                  <Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Faculty</Text>
                  {user?.role === 'facultyAdmin' ? (
                    <View style={[styles.facultyLocked, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                      <Ionicons name="lock-closed-outline" size={16} color={colors.textTertiary} />
                      <Text style={[typography.body, { color: colors.textSecondary, flex: 1 }]} numberOfLines={1}>
                        {(() => {
                          const f = faculties.find(f => f._id === (typeof user.faculty === 'object' ? (user.faculty as any)?._id : user.faculty));
                          return f ? `${f.name} (${f.code || ''})` : 'Your Faculty';
                        })()}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textTertiary, fontStyle: 'italic' }]}>Locked</Text>
                    </View>
                  ) : (
                    <View style={styles.facultyPicker}>
                      {faculties.map((f) => (
                        <TouchableOpacity
                          key={f._id}
                          style={[styles.facultyOption, selectedFaculty === f._id && styles.facultyOptionSelected]}
                          onPress={() => { setSelectedFaculty(f._id); setSelectedDepartment(''); setCreateError(''); }}
                        >
                          <Text style={[typography.caption, { fontWeight: '600', color: selectedFaculty === f._id ? '#FFF' : colors.text }]}>
                            {f.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
              {activeTab === 'departmentAdmin' && (
                <View style={{ marginBottom: spacing.md }}>
                  <Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Department</Text>
                  {departments.length === 0 ? (
                    <TouchableOpacity
                      onPress={() => {
                        if (!selectedFaculty && user?.role !== 'facultyAdmin') {
                          setCreateError('Select a faculty first to create a department under it.');
                          return;
                        }
                        setQuickDeptError(''); setQuickDeptName(''); setQuickDeptCode('');
                        setQuickDeptVisible(true);
                      }}
                      style={styles.addDeptPrompt}
                    >
                      <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                      <Text style={[typography.caption, { color: colors.primary, fontWeight: '600', marginLeft: spacing.xs }]}>
                        No departments — create one now
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.facultyPicker}>
                      {departments.map((dept) => (
                        <TouchableOpacity
                          key={dept._id}
                          style={[styles.facultyOption, selectedDepartment === dept._id && styles.facultyOptionSelected]}
                          onPress={() => { setSelectedDepartment(dept._id); setCreateError(''); }}
                        >
                          <Text style={[typography.caption, { fontWeight: '600', color: selectedDepartment === dept._id ? '#FFF' : colors.text }]}>
                            {dept.code}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
              <Button title={editTarget ? 'Save Changes' : 'Create Admin'} onPress={handleCreate} loading={saving} size="lg" />
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Quick Create Department Modal */}
      <Modal visible={quickDeptVisible} animationType="slide" transparent onRequestClose={() => setQuickDeptVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => { setQuickDeptVisible(false); setQuickDeptError(''); }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Quick Create Department</Text>
                <TouchableOpacity onPress={() => { setQuickDeptVisible(false); setQuickDeptError(''); }}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
              {quickDeptError ? (
                <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
                  <Text style={[styles.errorText, { color: colors.danger }]}>{quickDeptError}</Text>
                </View>
              ) : null}
              <Input label="Department Name" placeholder="e.g. Computer Science" value={quickDeptName} onChangeText={(t) => { setQuickDeptName(t); setQuickDeptError(''); }} leftIcon="business-outline" />
              <Input label="Department Code" placeholder="e.g. CSC" value={quickDeptCode} onChangeText={(t) => { setQuickDeptCode(t); setQuickDeptError(''); }} leftIcon="code-outline" autoCapitalize="characters" />
              <Text style={[typography.caption, { color: colors.textTertiary, marginBottom: spacing.md, textAlign: 'center' }]}>
                Will be created under the selected faculty. Full management available in Faculties page.
              </Text>
              <Button title="Create" onPress={handleQuickCreateDept} loading={quickDeptSaving} size="lg" />
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={!!confirmDelete} animationType="fade" transparent onRequestClose={() => setConfirmDelete(null)}>
        <Pressable style={styles.confirmOverlay} onPress={() => { setConfirmDelete(null); setDeleteError(''); }}>
          <Pressable style={[styles.confirmCard, { backgroundColor: colors.surface }]} onPress={e => e.stopPropagation()}>
            <View style={styles.confirmIconWrap}>
              <View style={[styles.confirmIconBg, { backgroundColor: colors.dangerLight }]}>
                <Ionicons name="trash-outline" size={24} color={colors.danger} />
              </View>
            </View>
            {deleteError ? (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
                <Text style={[styles.errorText, { color: colors.danger }]}>{deleteError}</Text>
              </View>
            ) : null}
            <Text style={[styles.confirmTitle, { color: colors.text }]}>Delete Admin</Text>
            <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
              Remove "{confirmDelete?.name}"? This cannot be undone.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                onPress={() => setConfirmDelete(null)}
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

      {/* Activate / Deactivate Confirmation */}
      <Modal visible={toggleTarget !== null} transparent animationType="fade" onRequestClose={() => setToggleTarget(null)}>
        <Pressable style={styles.confirmOverlay} onPress={() => setToggleTarget(null)}>
          <Pressable style={[styles.confirmCard, { backgroundColor: colors.surface }]} onPress={e => e.stopPropagation()}>
            <View style={styles.confirmIconWrap}>
              <View style={[styles.confirmIconBg, { backgroundColor: colors.secondaryLight }]}>
                <Ionicons name="swap-horizontal-outline" size={24} color={colors.secondary} />
              </View>
            </View>
            <Text style={[styles.confirmTitle, { color: colors.text }]}>
              {admins.find(a => a._id === toggleTarget)?.isActive ? 'Deactivate Admin' : 'Activate Admin'}
            </Text>
            <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
              {`Set "${admins.find(a => a._id === toggleTarget)?.fullName || 'this admin'}" to ${admins.find(a => a._id === toggleTarget)?.isActive ? 'inactive' : 'active'}?`}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => setToggleTarget(null)}
                activeOpacity={0.7}
              >
                <Text style={[styles.confirmBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.secondary }]}
                onPress={handleToggleConfirm}
                activeOpacity={0.7}
              >
                <Text style={[styles.confirmBtnText, { color: '#FFF' }]}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Admin Actions Menu */}
      {adminMenuTarget && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]}>
          <TouchableOpacity style={styles.confirmOverlay} activeOpacity={1} onPress={() => setAdminMenuTarget(null)}>
            <TouchableOpacity style={[styles.menuCard, { backgroundColor: colors.surface }]} activeOpacity={1} onPress={e => { e.stopPropagation(); }}>
              <Text style={[styles.menuTitle, { color: colors.text }]} numberOfLines={1}>
                {adminMenuTarget.fullName || 'Admin'}
              </Text>
              <View>
                <TouchableOpacity style={styles.menuItem} onPress={() => { const a = adminMenuTarget; setAdminMenuTarget(null); openEditAdmin(a); }}>
                  <View style={[styles.menuItemIcon, { backgroundColor: colors.infoLight }]}>
                    <Ionicons name="pencil-outline" size={18} color={colors.info} />
                  </View>
                  <Text style={[styles.menuItemText, { color: colors.text }]}>Edit Admin</Text>
                </TouchableOpacity>
                {activeTab !== 'environmentalAdmin' && (
                  <TouchableOpacity style={styles.menuItem} onPress={() => { const a = adminMenuTarget; setAdminMenuTarget(null); setToggleTarget(a._id); }}>
                    <View style={[styles.menuItemIcon, { backgroundColor: colors.secondaryLight }]}>
                      <Ionicons name={adminMenuTarget.isActive ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.secondary} />
                    </View>
                    <Text style={[styles.menuItemText, { color: colors.text }]}>
                      {adminMenuTarget.isActive ? 'Deactivate' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.menuItem} onPress={() => { const a = adminMenuTarget; setAdminMenuTarget(null); handleDelete(a._id, a.fullName); }}>
                  <View style={[styles.menuItemIcon, { backgroundColor: colors.dangerLight }]}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </View>
                  <Text style={[styles.menuItemText, { color: colors.danger }]}>Delete Admin</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={[styles.menuCancel, { borderTopColor: colors.border }]} onPress={() => setAdminMenuTarget(null)}>
                <Text style={[styles.menuCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const getStyles = (c: typeof lightColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.md,
  },
  title: { ...typography.h2, color: c.text },
  subtitle: { ...typography.bodySmall, color: c.textSecondary, marginTop: 2 },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    backgroundColor: c.surface,
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: c.primary },
  sectionTitle: {
    ...typography.h3,
    color: c.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  list: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl },
  adminCard: { marginBottom: spacing.sm },
  adminRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  adminAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.h4, color: c.primary },
  activeBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actionBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  addDeptPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: borderRadius.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: c.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: { ...typography.h3, color: c.text },
  facultyPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  facultyOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
  },
  facultyOptionSelected: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  facultyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  facultyLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
    opacity: 0.7,
  },
  errorBox: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    fontWeight: '600',
    textAlign: 'center',
  },
  footerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  footerText: {
    ...typography.caption,
    color: c.textTertiary,
  },
  footerEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  footerLine: {
    flex: 1,
    height: 1,
    maxWidth: 60,
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
    maxWidth: 340,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
  },
  confirmIconWrap: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  confirmIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmTitle: {
    ...typography.h3,
    textAlign: 'center',
  },
  confirmMessage: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    width: '100%',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: spacing.md - 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    ...typography.body,
    fontWeight: '600',
  },
  menuCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  menuTitle: {
    ...typography.h4,
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    ...typography.body,
    fontWeight: '600',
  },
  menuCancel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  menuCancelText: {
    ...typography.body,
    fontWeight: '600',
  },
});
