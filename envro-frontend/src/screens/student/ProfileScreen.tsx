import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../../components/ui/Button';
import { typography, spacing, borderRadius } from '../../constants';
import { lightColors } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeColors } from '../../contexts/ThemeContext';
import { authApi } from '../../api/auth';
import { formatRole } from '../../utils/helpers';

const menuSections = [
  {
    title: 'Account',
    items: [
      { icon: 'lock-closed-outline' as const, label: 'Change Password', action: 'password' as const },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: 'moon-outline' as const, label: 'Dark Mode', action: 'theme' as const },
    ],
  },
];

interface ProfileField {
  icon: string;
  label: string;
  value?: string;
}

export default function ProfileScreen() {
  const { colors, isDark, toggleTheme } = useThemeColors();
  const styles = getStyles(colors);
  const { user, logout } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const profileFields: ProfileField[] = [
    { icon: 'person-outline', label: 'Full Name', value: user?.fullName },
    { icon: 'mail-outline', label: 'Email', value: user?.email },
    { icon: 'shield-outline', label: 'Role', value: formatRole(user?.role || '') },
    { icon: 'id-card-outline', label: 'Registration No.', value: user?.registrationNumber },
  ];

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
    .slice(0, 2) || 'U';

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Profile Header ── */}
        <LinearGradient colors={['#059669', '#047857', '#065F46']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.profileHeader}>
          <View style={styles.avatarOuter}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
          <Text style={styles.name}>{user?.fullName || 'User'}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#FFF" style={styles.roleIcon} />
            <Text style={styles.roleText}>{formatRole(user?.role || '')}</Text>
          </View>
        </LinearGradient>

        {/* ── Profile Info Card ── */}
        <View style={styles.infoCard}>
          {profileFields.map((field, i) => (
            <View key={i} style={[styles.fieldRow, i < profileFields.length - 1 && styles.fieldBorder]}>
              <View style={[styles.fieldIcon, { backgroundColor: colors.primaryBg }]}>
                <Ionicons name={field.icon as any} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.caption, { color: colors.textTertiary, fontWeight: '500' }]}>{field.label}</Text>
                <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginTop: 1 }]}>
                  {field.value || 'N/A'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Settings Sections ── */}
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

        <View style={styles.settingsGroup}>
          <Text style={styles.sectionLabel}>PREFERENCES</Text>
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: isDark ? '#1E293B' : colors.secondaryLight }]}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={isDark ? '#FBBF24' : colors.secondary} />
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
          <Text style={styles.versionText}>EnviroGuard v1.0.0</Text>
        </View>
      </ScrollView>

      {/* ── Change Password Modal ── */}
      <Modal visible={showPasswordModal} transparent animationType="slide" onRequestClose={() => setShowPasswordModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {pwError ? (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.danger }]}>{pwError}</Text>
              </View>
            ) : null}

            {/* Current Password */}
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

            {/* New Password */}
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

            {/* Confirm Password */}
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
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowPasswordModal(false)} activeOpacity={0.7}>
              <Text style={[typography.body, { color: colors.textSecondary, fontWeight: '600' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Logout Confirmation ── */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.logoutModalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowLogoutModal(false)} />
          <View style={[styles.logoutModalCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.logoutModalIconBox, { backgroundColor: colors.dangerLight }]}>
              <Ionicons name="log-out-outline" size={28} color={colors.danger} />
            </View>
            <Text style={[styles.logoutModalTitle, { color: colors.text }]}>Sign Out?</Text>
            <Text style={[styles.logoutModalMessage, { color: colors.textSecondary }]}>
              You will be returned to the login screen.
            </Text>
            <View style={styles.logoutModalActions}>
              <TouchableOpacity
                style={[styles.logoutModalCancelBtn, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.logoutModalCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.logoutModalConfirmBtn, { backgroundColor: colors.danger }]}
                onPress={logout}
                activeOpacity={0.7}
              >
                <Text style={styles.logoutModalConfirmText}>Sign Out</Text>
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

  // ── Profile Header ──
  profileHeader: {
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

  // ── Password Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
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
  modalTitle: { ...typography.h3 },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  errorText: { fontSize: 13, fontWeight: '600', flex: 1 },
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
  modalCancel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: c.surfaceAlt,
  },

  // ── Logout Modal ──
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  logoutModalCard: {
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
  logoutModalIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoutModalTitle: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  logoutModalMessage: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  logoutModalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  logoutModalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutModalCancelText: {
    ...typography.body,
    fontWeight: '600',
  },
  logoutModalConfirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutModalConfirmText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
