import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  Modal,
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
import { facultiesApi } from '../../api/faculties';
import { departmentsApi } from '../../api/departments';
import { ToastService } from '../../services/ToastService';
import { getFriendlyErrorMessage } from '../../services/apiErrors';
import { useAutoRetry } from '../../hooks/useAutoRetry';
import { useAuth } from '../../contexts/AuthContext';
import type { Faculty, Department } from '../../types';

export default function FacultiesScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const { user } = useAuth();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editFaculty, setEditFaculty] = useState<Faculty | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [facultyError, setFacultyError] = useState('');
  const [facultyMenuTarget, setFacultyMenuTarget] = useState<Faculty | null>(null);
  const [deleteFacultyTarget, setDeleteFacultyTarget] = useState<Faculty | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [togglingFaculty, setTogglingFaculty] = useState<string | null>(null);
  const [toggleTarget, setToggleTarget] = useState<{ kind: 'faculty'; item: Faculty } | { kind: 'dept'; item: Department } | null>(null);
  const [toggleError, setToggleError] = useState('');

  // Department state
  const [expandedFaculty, setExpandedFaculty] = useState<string | null>(null);
  const isFacultyScoped = user?.role === 'facultyAdmin' && !!user.faculty;
  const [facultyDepts, setFacultyDepts] = useState<Record<string, Department[]>>({});
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [deptModalVisible, setDeptModalVisible] = useState(false);
  const [deptEditTarget, setDeptEditTarget] = useState<Department | null>(null);
  const [deptFacultyId, setDeptFacultyId] = useState('');
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptSaving, setDeptSaving] = useState(false);
  const [deptError, setDeptError] = useState('');
  const [deleteDeptTarget, setDeleteDeptTarget] = useState<Department | null>(null);
  const [deleteDeptError, setDeleteDeptError] = useState('');
  const [togglingDept, setTogglingDept] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchFaculties = useCallback(async () => {
    try {
      setFetchError(null);
      const { data } = await facultiesApi.getAll();
      if (data.success) {
        const list = data.data;
        if (isFacultyScoped) {
          const fid = typeof user.faculty === 'string' ? user.faculty : (user.faculty as any)?._id;
          setFaculties(list.filter((f: Faculty) => f._id === fid));
        } else {
          setFaculties(list);
        }
      }
    } catch (err: any) { setFetchError(getFriendlyErrorMessage(err, 'faculties')); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user, isFacultyScoped]);

  useFocusEffect(useCallback(() => { fetchFaculties(); }, [fetchFaculties]));

  useAutoRetry(fetchFaculties, !loading);

  const openCreate = () => {
    setEditFaculty(null);
    setName(''); setCode(''); setDescription('');
    setFacultyError('');
    setModalVisible(true);
  };

  const openEdit = (faculty: Faculty) => {
    setEditFaculty(faculty);
    setName(faculty.name);
    setCode(faculty.code || '');
    setDescription(faculty.description || '');
    setFacultyError('');
    setModalVisible(true);
  };

  const handleSave = async () => {
    setFacultyError('');
    if (!name.trim()) { setFacultyError('Faculty name is required'); return; }
    setSaving(true);
    try {
      if (editFaculty) {
        await facultiesApi.update(editFaculty._id, { name: name.trim(), code: code.trim(), description: description.trim() });
      } else {
        await facultiesApi.create({ name: name.trim(), code: code.trim(), description: description.trim() });
      }
      fetchFaculties();
      setModalVisible(false);
      ToastService.success('Faculty Saved', 'Faculty has been ' + (editFaculty ? 'updated' : 'created') + ' successfully.');
    } catch (err: any) {
      ToastService.error('Error', err.response?.data?.message || 'Failed to save faculty');
      setFacultyError(err.response?.data?.message || 'Failed to save faculty');
    } finally { setSaving(false); }
  };

  const handleToggle = (faculty: Faculty) => {
    setToggleTarget({ kind: 'faculty', item: faculty });
  };

  const handleToggleConfirm = async () => {
    if (!toggleTarget) return;
    setToggleError('');
    try {
      if (toggleTarget.kind === 'faculty') {
        const f = toggleTarget.item;
        setTogglingFaculty(f._id);
        await facultiesApi.toggleStatus(f._id);
        fetchFaculties();
        ToastService.success('Status Updated', 'Status changed successfully');
      } else {
        const d = toggleTarget.item;
        setTogglingDept(d._id);
        await departmentsApi.toggleStatus(d._id);
        const fid = typeof d.faculty === 'string' ? d.faculty : d.faculty._id;
        const { data } = await departmentsApi.getAll({ faculty: fid });
        if (data.success) setFacultyDepts(prev => ({ ...prev, [fid]: data.data }));
        ToastService.success('Status Updated', 'Status changed successfully');
      }
    } catch (err: any) {
      ToastService.error('Error', err.response?.data?.message || 'Failed to update status');
      setToggleError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setTogglingFaculty(null);
      setTogglingDept(null);
      setToggleTarget(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteFacultyTarget) return;
    setDeleteError('');
    try {
      await facultiesApi.delete(deleteFacultyTarget._id);
      setFaculties(prev => prev.filter(f => f._id !== deleteFacultyTarget._id));
      setDeleteFacultyTarget(null);
      ToastService.success('Faculty Deleted', 'The faculty has been removed.');
    } catch (err: any) {
      ToastService.error('Error', err.response?.data?.message || 'Failed to delete faculty');
      setDeleteError(err.response?.data?.message || 'Failed to delete faculty');
    }
  };

  const toggleExpandFaculty = async (facultyId: string) => {
    if (expandedFaculty === facultyId) {
      setExpandedFaculty(null);
      return;
    }
    setExpandedFaculty(facultyId);
    if (!facultyDepts[facultyId]) {
      setLoadingDepts(true);
      try {
        const { data } = await departmentsApi.getAll({ faculty: facultyId });
        if (data.success) {
          setFacultyDepts(prev => ({ ...prev, [facultyId]: data.data }));
        }
      } catch {}
      finally { setLoadingDepts(false); }
    }
  };

  const openCreateDept = (facultyId: string) => {
    setDeptEditTarget(null);
    setDeptFacultyId(facultyId);
    setDeptName('');
    setDeptCode('');
    setDeptError('');
    setDeptModalVisible(true);
  };

  const openEditDept = (dept: Department) => {
    setDeptEditTarget(dept);
    setDeptFacultyId(typeof dept.faculty === 'string' ? dept.faculty : dept.faculty._id);
    setDeptName(dept.name);
    setDeptCode(dept.code);
    setDeptError('');
    setDeptModalVisible(true);
  };

  const handleSaveDept = async () => {
    setDeptError('');
    if (!deptName.trim()) { setDeptError('Department name is required'); return; }
    if (!deptCode.trim()) { setDeptError('Department code is required'); return; }
    setDeptSaving(true);
    try {
      if (deptEditTarget?.name) {
        await departmentsApi.update(deptEditTarget._id, { name: deptName.trim(), code: deptCode.trim() });
      } else {
        await departmentsApi.create({ name: deptName.trim(), code: deptCode.trim(), faculty: deptFacultyId });
      }
      setDeptModalVisible(false);
      setDeptName(''); setDeptCode('');
      const { data } = await departmentsApi.getAll({ faculty: deptFacultyId });
      if (data.success) {
        setFacultyDepts(prev => ({ ...prev, [deptFacultyId]: data.data }));
      }
      ToastService.success('Department Saved', 'Department has been ' + (deptEditTarget ? 'updated' : 'created') + ' successfully.');
    } catch (err: any) {
      ToastService.error('Error', err.response?.data?.message || 'Failed to save department');
      setDeptError(err.response?.data?.message || 'Failed to save department');
    } finally { setDeptSaving(false); }
  };

  const handleDeleteDeptConfirm = async () => {
    if (!deleteDeptTarget) return;
    setDeleteDeptError('');
    try {
      await departmentsApi.delete(deleteDeptTarget._id);
      const fid = typeof deleteDeptTarget.faculty === 'string' ? deleteDeptTarget.faculty : deleteDeptTarget.faculty._id;
      setFacultyDepts(prev => ({
        ...prev,
        [fid]: (prev[fid] || []).filter(d => d._id !== deleteDeptTarget._id),
      }));
      setDeleteDeptTarget(null);
      ToastService.success('Department Deleted', 'The department has been removed.');
    } catch (err: any) {
      ToastService.error('Error', err.response?.data?.message || 'Failed to delete department');
      setDeleteDeptError(err.response?.data?.message || 'Failed to delete department');
    }
  };

  if (loading) return <SkeletonList variant="faculty-card" />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Faculties</Text>
          <Text style={styles.subtitle}>{faculties.length} facult{faculties.length !== 1 ? 'ies' : 'y'}</Text>
        </View>
        <Button title="Add" onPress={openCreate} size="sm" />
      </View>

      <FlatList
        data={faculties}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFaculties(); }} />}
        ListEmptyComponent={
          <EmptyState icon="business-outline" title="No Faculties" message="Create your first faculty." />
        }
        renderItem={({ item }) => {
          const isExpanded = expandedFaculty === item._id;
          const depts = facultyDepts[item._id];
          const canManage = user?.role === 'environmentalAdmin' || user?.role === 'facultyAdmin';

          return (
            <Card style={styles.facultyCard}>
              <View style={styles.facultyRow}>
                <TouchableOpacity style={styles.facultyMain} onPress={() => toggleExpandFaculty(item._id)} activeOpacity={0.7}>
                  <View style={styles.facultyIcon}>
                    <Ionicons name="business-outline" size={24} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, flexShrink: 1 }}>
                    <View style={styles.facultyHeader}>
                      <Text style={[typography.body, { fontWeight: '600', color: colors.text, flexShrink: 1 }]}>{item.name}</Text>
                      <View style={[styles.activeBadge, { backgroundColor: item.isActive ? colors.successLight : colors.dangerLight }]}>
                        <Text style={[typography.caption, { color: item.isActive ? colors.success : colors.danger, fontWeight: '600' }]}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                    {item.code && <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>Code: {item.code}</Text>}
                  </View>
                </TouchableOpacity>
                <View style={styles.actions}>
                  {canManage && (
                    <TouchableOpacity onPress={() => setFacultyMenuTarget(item)} style={styles.actionBtn} activeOpacity={0.7}>
                      <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => toggleExpandFaculty(item._id)} style={styles.actionBtn} activeOpacity={0.7}>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              </View>

              {!isExpanded && (
                <View style={styles.deptChipRow}>
                  <TouchableOpacity onPress={() => toggleExpandFaculty(item._id)} style={styles.deptChip} activeOpacity={0.7}>
                    <Ionicons name="layers-outline" size={14} color={colors.primary} />
                    <Text style={styles.deptChipText}>{depts?.length ?? '...'} Department{(depts?.length ?? 0) !== 1 ? 's' : ''}</Text>
                  </TouchableOpacity>
                  {canManage && (
                    <TouchableOpacity onPress={() => openCreateDept(item._id)} style={styles.addDeptChipBtn} activeOpacity={0.7}>
                      <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {isExpanded && (
                <View style={styles.deptSection}>
                  <View style={styles.deptHeader}>
                    <Text style={[typography.bodySmall, { fontWeight: '700', color: colors.textSecondary }]}>
                      Departments ({depts?.length || 0})
                    </Text>
                    {canManage && (
                      <Pressable onPress={() => openCreateDept(item._id)} style={styles.addDeptBtn}>
                        <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                        <Text style={[typography.caption, { color: colors.primary, fontWeight: '600', marginLeft: 3 }]}>Add</Text>
                      </Pressable>
                    )}
                  </View>

                  {loadingDepts && !depts ? (
                    <Text style={[typography.caption, { color: colors.textTertiary, paddingVertical: spacing.sm }]}>Loading...</Text>
                  ) : !depts || depts.length === 0 ? (
                    <Text style={[typography.caption, { color: colors.textTertiary, paddingVertical: spacing.sm }]}>No departments yet</Text>
                  ) : (
                    <View style={styles.deptList}>
                      {depts.map(d => {
                        return (
                          <View key={d._id} style={[styles.deptItem, { borderColor: colors.border }]}>
                            <View style={styles.deptInfo}>
                              <View style={[styles.deptStatusDot, { backgroundColor: d.isActive ? colors.success : colors.danger }]} />
                              <Text style={[typography.bodySmall, { fontWeight: '600', color: colors.text, flex: 1 }]}>{d.name}</Text>
                              <View style={[styles.deptCodeBadge, { backgroundColor: colors.surfaceAlt }]}>
                                <Text style={[typography.caption, { fontWeight: '700', color: colors.textSecondary }]}>{d.code}</Text>
                              </View>
                            </View>
                            {canManage && (
                              <View style={styles.deptActions}>
                                <Pressable onPress={() => openEditDept(d)} style={styles.deptActionBtn}>
                                  <Ionicons name="pencil-outline" size={14} color={colors.info} />
                                </Pressable>
                                <Pressable onPress={() => setToggleTarget({ kind: 'dept', item: d })} style={styles.deptActionBtn} disabled={togglingDept === d._id}>
                                  <Ionicons name={d.isActive ? 'eye-off-outline' : 'eye-outline'} size={14} color={togglingDept === d._id ? colors.textTertiary : colors.secondary} />
                                </Pressable>
                                <Pressable onPress={() => setDeleteDeptTarget(d)} style={styles.deptActionBtn}>
                                  <Ionicons name="trash-outline" size={14} color={colors.danger} />
                                </Pressable>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </Card>
          );
        }}
      />

      {/* Create/Edit Faculty Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editFaculty ? 'Edit Faculty' : 'New Faculty'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {facultyError ? (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
                <Text style={[styles.errorText, { color: colors.danger }]}>{facultyError}</Text>
              </View>
            ) : null}
            <Input label="Faculty Name" placeholder="e.g. Faculty of Science" value={name} onChangeText={(t) => { setName(t); setFacultyError(''); }} />
            <Input label="Code (optional)" placeholder="e.g. SCI" value={code} onChangeText={setCode} autoCapitalize="characters" />
            <Input label="Description (optional)" placeholder="Brief description" value={description} onChangeText={setDescription} />
            <Button title={editFaculty ? 'Update' : 'Create'} onPress={handleSave} loading={saving} size="lg" style={{ marginTop: spacing.sm }} />
          </View>
        </View>
      </Modal>

      {/* Create/Edit Department Modal */}
      <Modal visible={deptModalVisible} animationType="slide" transparent onRequestClose={() => setDeptModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{deptEditTarget?.name ? 'Edit Department' : 'New Department'}</Text>
              <TouchableOpacity onPress={() => setDeptModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {deptError ? (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
                <Text style={[styles.errorText, { color: colors.danger }]}>{deptError}</Text>
              </View>
            ) : null}
            <Input label="Department Name" placeholder="e.g. Computer Science" value={deptName} onChangeText={(t) => { setDeptName(t); setDeptError(''); }} leftIcon="business-outline" />
            <Input label="Department Code" placeholder="e.g. CSC" value={deptCode} onChangeText={(t) => { setDeptCode(t); setDeptError(''); }} leftIcon="code-outline" autoCapitalize="characters" />
            <Button title={deptEditTarget?.name ? 'Update' : 'Create'} onPress={handleSaveDept} loading={deptSaving} size="lg" style={{ marginTop: spacing.sm }} />
          </View>
        </View>
      </Modal>

      {/* Delete Faculty Confirmation */}
      <Modal visible={deleteFacultyTarget !== null} transparent animationType="fade" onRequestClose={() => { setDeleteFacultyTarget(null); setDeleteError(''); }}>
        <Pressable style={styles.confirmOverlay} onPress={() => { setDeleteFacultyTarget(null); setDeleteError(''); }}>
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
            <Text style={[styles.confirmTitle, { color: colors.text }]}>Delete Faculty</Text>
            <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
              Remove "{deleteFacultyTarget?.name}"? All related data will be affected. This cannot be undone.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => { setDeleteFacultyTarget(null); setDeleteError(''); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.confirmBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.danger }]}
                onPress={handleDeleteConfirm}
                activeOpacity={0.7}
              >
                <Text style={[styles.confirmBtnText, { color: '#FFF' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Department Confirmation */}
      <Modal visible={deleteDeptTarget !== null} transparent animationType="fade" onRequestClose={() => { setDeleteDeptTarget(null); setDeleteDeptError(''); }}>
        <Pressable style={styles.confirmOverlay} onPress={() => { setDeleteDeptTarget(null); setDeleteDeptError(''); }}>
          <Pressable style={[styles.confirmCard, { backgroundColor: colors.surface }]} onPress={e => e.stopPropagation()}>
            <View style={styles.confirmIconWrap}>
              <View style={[styles.confirmIconBg, { backgroundColor: colors.dangerLight }]}>
                <Ionicons name="trash-outline" size={24} color={colors.danger} />
              </View>
            </View>
            {deleteDeptError ? (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
                <Text style={[styles.errorText, { color: colors.danger }]}>{deleteDeptError}</Text>
              </View>
            ) : null}
            <Text style={[styles.confirmTitle, { color: colors.text }]}>Delete Department</Text>
            <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
              Remove "{deleteDeptTarget?.name || deleteDeptTarget?.code}"? This cannot be undone.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => { setDeleteDeptTarget(null); setDeleteDeptError(''); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.confirmBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.danger }]}
                onPress={handleDeleteDeptConfirm}
                activeOpacity={0.7}
              >
                <Text style={[styles.confirmBtnText, { color: '#FFF' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Faculty Actions Menu */}
      {facultyMenuTarget && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]}>
          <TouchableOpacity style={styles.confirmOverlay} activeOpacity={1} onPress={() => setFacultyMenuTarget(null)}>
            <TouchableOpacity style={[styles.menuCard, { backgroundColor: colors.surface }]} activeOpacity={1} onPress={e => { e.stopPropagation(); }}>
              <Text style={[styles.menuTitle, { color: colors.text }]} numberOfLines={1}>
                {facultyMenuTarget.name || 'Faculty'}
              </Text>
              <View>
                <TouchableOpacity style={styles.menuItem} onPress={() => { const f = facultyMenuTarget; setFacultyMenuTarget(null); openEdit(f); }}>
                  <View style={[styles.menuItemIcon, { backgroundColor: colors.infoLight }]}>
                    <Ionicons name="pencil-outline" size={18} color={colors.info} />
                  </View>
                  <Text style={[styles.menuItemText, { color: colors.text }]}>Edit Faculty</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => { const f = facultyMenuTarget; setFacultyMenuTarget(null); handleToggle(f); }}>
                  <View style={[styles.menuItemIcon, { backgroundColor: colors.secondaryLight }]}>
                    <Ionicons name={facultyMenuTarget.isActive ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.secondary} />
                  </View>
                  <Text style={[styles.menuItemText, { color: colors.text }]}>
                    {facultyMenuTarget.isActive ? 'Deactivate' : 'Activate'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => { const f = facultyMenuTarget; setFacultyMenuTarget(null); setDeleteFacultyTarget(f); }}>
                  <View style={[styles.menuItemIcon, { backgroundColor: colors.dangerLight }]}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </View>
                  <Text style={[styles.menuItemText, { color: colors.danger }]}>Delete Faculty</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={[styles.menuCancel, { borderTopColor: colors.border }]} onPress={() => setFacultyMenuTarget(null)}>
                <Text style={[styles.menuCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}

      {/* Activate / Deactivate Confirmation */}
      <Modal visible={toggleTarget !== null} transparent animationType="fade" onRequestClose={() => { setToggleTarget(null); setToggleError(''); }}>
        <Pressable style={styles.confirmOverlay} onPress={() => { setToggleTarget(null); setToggleError(''); }}>
          <Pressable style={[styles.confirmCard, { backgroundColor: colors.surface }]} onPress={e => e.stopPropagation()}>
            <View style={styles.confirmIconWrap}>
              <View style={[styles.confirmIconBg, { backgroundColor: colors.secondaryLight }]}>
                <Ionicons name="swap-horizontal-outline" size={24} color={colors.secondary} />
              </View>
            </View>
            {toggleError ? (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
                <Text style={[styles.errorText, { color: colors.danger }]}>{toggleError}</Text>
              </View>
            ) : null}
            <Text style={[styles.confirmTitle, { color: colors.text }]}>
              {toggleTarget?.kind === 'faculty'
                ? (toggleTarget?.item.isActive ? 'Deactivate Faculty' : 'Activate Faculty')
                : (toggleTarget?.item.isActive ? 'Deactivate Department' : 'Activate Department')}
            </Text>
            <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
              {toggleTarget?.kind === 'faculty'
                ? `Set "${toggleTarget?.item.name}" to ${toggleTarget?.item.isActive ? 'inactive' : 'active'}?`
                : `Set "${toggleTarget?.item.name}" to ${toggleTarget?.item.isActive ? 'inactive' : 'active'}?`}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => { setToggleTarget(null); setToggleError(''); }}
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
  list: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl },
  facultyCard: { marginBottom: spacing.sm },
  facultyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  facultyMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  facultyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  facultyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  activeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionBtn: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  deptActions: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: spacing.sm },
  deptActionBtn: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.sm },
  deptChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
  },
  deptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: c.primaryBg,
  },
  deptChipText: {
    ...typography.caption,
    color: c.primary,
    fontWeight: '600',
  },
  addDeptChipBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: c.primaryBg,
  },
  deptSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
  },
  deptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addDeptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  deptList: { gap: spacing.xs },
  deptItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  deptInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  deptStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deptCodeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
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
