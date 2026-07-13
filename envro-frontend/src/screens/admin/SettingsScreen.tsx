import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { typography, spacing, borderRadius } from '../../constants';
import { lightColors } from '../../constants/theme';
import { useThemeColors } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../api/auth';
import { facultiesApi } from '../../api/faculties';
import { departmentsApi } from '../../api/departments';
import { formatRole } from '../../utils/helpers';
import { Button } from '../../components/ui/Button';

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useThemeColors();
  const styles = getStyles(colors);
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const handleChangePassword = async () => {
    setPwError(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError('Please fill in all fields'); return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match'); return;
    }
    if (newPassword.length < 6) {
      setPwError('Password must be at least 6 characters'); return;
    }
    setChanging(true);
    try {
      const { data } = await authApi.changePassword(currentPassword, newPassword);
      if (data.success) {
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setPwError(err.response?.data?.message || 'Failed to change password');
    } finally { setChanging(false); }
  };

  const initials = user?.fullName
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'A';

  const [facultyLabel, setFacultyLabel] = useState<string | null>(null);
  const [departmentLabel, setDepartmentLabel] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (user?.faculty) {
        if (typeof user.faculty === 'object') {
          setFacultyLabel((user.faculty as any)?.name || (user.faculty as any)?.code || '');
        } else {
          try {
            const { data } = await facultiesApi.getById(user.faculty);
            if (active && data.success) setFacultyLabel(data.data?.name || data.data?.code || '');
          } catch { if (active) setFacultyLabel(user.faculty as string); }
        }
      }
      if (user?.department) {
        if (typeof user.department === 'object') {
          const d = user.department as any;
          setDepartmentLabel(`${d?.name || ''} (${d?.code || ''})`.trim());
        } else {
          try {
            const { data } = await departmentsApi.getById(user.department);
            if (active && data.success) {
              const d = data.data;
              setDepartmentLabel(`${d?.name || ''} (${d?.code || ''})`.trim());
            }
          } catch { if (active) setDepartmentLabel(user.department as string); }
        }
      }
    })();
    return () => { active = false; };
  }, [user?.faculty, user?.department]);

  const fields = [
    { icon: 'person-outline', label: 'Full Name', value: user?.fullName },
    { icon: 'mail-outline', label: 'Email', value: user?.email },
    { icon: 'shield-outline', label: 'Role', value: formatRole(user?.role || '') },
  ];

  if (user?.faculty) {
    const fallback = typeof user.faculty === 'object'
      ? ((user.faculty as any)?.name || (user.faculty as any)?.code)
      : 'Loading…';
    fields.push({ icon: 'school-outline', label: 'Faculty', value: facultyLabel !== null ? (facultyLabel || 'N/A') : fallback });
  }

  if (user?.department) {
    const objD = typeof user.department === 'object' ? `${(user.department as any)?.name || ''} (${(user.department as any)?.code || ''})`.trim() : '';
    const fallback = objD || 'Loading…';
    fields.push({ icon: 'business-outline', label: 'Department', value: departmentLabel !== null ? (departmentLabel || 'N/A') : fallback });
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Profile Header ── */}
        <LinearGradient colors={['#059669', '#047857', '#065F46']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <View style={styles.avatarOuter}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
          <Text style={styles.name}>{user?.fullName || 'Admin'}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#FFF" style={styles.roleIcon} />
            <Text style={styles.roleText}>{formatRole(user?.role || '')}</Text>
          </View>
        </LinearGradient>

        {/* ── Info Card ── */}
        <View style={styles.infoCard}>
          {fields.map((field, i) => (
            <View key={i} style={[styles.fieldRow, i < fields.length - 1 && styles.fieldBorder]}>
              <View style={[styles.fieldIcon, { backgroundColor: colors.primaryBg }]}>
                <Ionicons name={field.icon as any} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.caption, { color: colors.textTertiary, fontWeight: '500' }]}>
                  {field.label}
                </Text>
                <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginTop: 1 }]}>
                  {field.value || 'N/A'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Account ── */}
        <View style={styles.settingsGroup}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowPasswordModal(true)} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: colors.infoLight }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.info} />
            </View>
            <Text style={styles.menuText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* ── Preferences ── */}
        <View style={styles.settingsGroup}>
          <Text style={styles.sectionLabel}>PREFERENCES</Text>
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: isDark ? '#1E293B' : '#FEF3C7' }]}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={isDark ? '#FBBF24' : '#D97706'} />
            </View>
            <Text style={styles.menuText}>Dark Mode</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primaryLight + '80' }}
              thumbColor={isDark ? colors.primary : '#f4f3f4'}
            />
          </View>
        </View>

        {/* ── Sign Out ── */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => setShowLogoutModal(true)} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
          <Text style={styles.versionText}>EnviroGuard v{Constants.expoConfig?.version || '1.0.0'}</Text>
        </View>
      </ScrollView>

      {/* ── Change Password ── */}
      <Modal visible={showPasswordModal} transparent animationType="slide" onRequestClose={() => setShowPasswordModal(false)}>
        <KeyboardAvoidingView style={styles.pwModalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.pwModalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {pwError && (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.danger }]}>{pwError}</Text>
              </View>
            )}

            <View style={{ marginBottom: spacing.md }}>
              <Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs, fontWeight: '600' }]}>Current Password</Text>
              <View style={[styles.pwInputBox, { borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} />
                <TextInput
                  style={[styles.pwInput, { color: colors.text }]}
                  placeholder="Enter current password"
                  placeholderTextColor={colors.textTertiary}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                />
              </View>
            </View>

            <View style={{ marginBottom: spacing.md }}>
              <Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs, fontWeight: '600' }]}>New Password</Text>
              <View style={[styles.pwInputBox, { borderColor: colors.border }]}>
                <Ionicons name="lock-open-outline" size={18} color={colors.textTertiary} />
                <TextInput
                  style={[styles.pwInput, { color: colors.text }]}
                  placeholder="Enter new password"
                  placeholderTextColor={colors.textTertiary}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
              </View>
            </View>

            <View style={{ marginBottom: spacing.lg }}>
              <Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs, fontWeight: '600' }]}>Confirm New Password</Text>
              <View style={[styles.pwInputBox, { borderColor: colors.border }]}>
                <Ionicons name="checkmark-outline" size={18} color={colors.textTertiary} />
                <TextInput
                  style={[styles.pwInput, { color: colors.text }]}
                  placeholder="Re-enter new password"
                  placeholderTextColor={colors.textTertiary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>
            </View>

            <Button title="Update Password" onPress={handleChangePassword} loading={changing} size="lg" />
            <TouchableOpacity style={styles.pwModalCancel} onPress={() => setShowPasswordModal(false)} activeOpacity={0.7}>
              <Text style={[typography.body, { color: colors.textSecondary, fontWeight: '600' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Logout Confirmation ── */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowLogoutModal(false)} />
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalIconBox, { backgroundColor: colors.dangerLight }]}>
              <Ionicons name="log-out-outline" size={28} color={colors.danger} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Sign Out?</Text>
            <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
              You will be returned to the login screen.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: colors.danger }]}
                onPress={logout}
                activeOpacity={0.7}
              >
                <Text style={styles.modalConfirmText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (c: typeof lightColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  content: { paddingBottom: spacing.xxl },

  // ── Header ──
  header: {
    paddingTop: spacing.xxxl + 10,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  avatarOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  name: {
    ...typography.h2,
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  roleText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  roleIcon: {
    marginRight: spacing.xs,
  },

  // ── Info Card ──
  infoCard: {
    marginHorizontal: spacing.lg,
    marginTop: -spacing.lg,
    backgroundColor: c.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  fieldBorder: {
    borderBottomWidth: 1,
    borderBottomColor: c.borderLight,
  },
  fieldIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Settings ──
  settingsGroup: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
  },
  sectionLabel: {
    ...typography.caption,
    color: c.textTertiary,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    ...typography.body,
    color: c.text,
    fontWeight: '600',
    flex: 1,
  },

  // ── Logout ──
  logoutSection: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  logoutText: {
    ...typography.body,
    color: c.danger,
    fontWeight: '600',
  },
  versionText: {
    ...typography.caption,
    color: c.textTertiary,
    marginTop: spacing.sm,
  },

  // ── Change Password Modal ──
  pwModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pwModalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pwInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surfaceAlt,
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
  },
  pwInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  pwModalCancel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: c.surfaceAlt,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  // ── Logout Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 8px 32px rgba(0,0,0,0.18)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 12 },
    }),
  },
  modalIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalMessage: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    ...typography.body,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
