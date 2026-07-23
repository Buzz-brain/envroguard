import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { typography, spacing, borderRadius } from '../../constants';
import { useColors } from '../../contexts/ThemeContext';
import { authApi } from '../../api/auth';
import { useAuth } from '../../contexts/AuthContext';
import { getFriendlyErrorMessage } from '../../services/apiErrors';
import { ToastService } from '../../services/ToastService';

const ADMIN_ROLES = [
  { key: 'departmentAdmin', label: 'Department Admin' },
  { key: 'facultyAdmin', label: 'Faculty Admin' },
  { key: 'environmentalAdmin', label: 'Environmental Admin' },
];

export default function AdminLoginScreen({ navigation }: any) {
  const colors = useColors();
  const { login } = useAuth();
  const [role, setRole] = useState('departmentAdmin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await authApi.adminLogin(email.toLowerCase(), password, role);
      if (data.success) {
        await login(data.data.account, data.data.accessToken, data.data.refreshToken);
      }
    } catch (err: any) {
      const msg = getFriendlyErrorMessage(err, 'login');
      setError(msg);
      ToastService.error('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backArrow, { backgroundColor: colors.surfaceAlt }]}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.header}>
          <View style={styles.backCircle}>
            <Ionicons name="shield-checkmark-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>Admin Login</Text>
          <Text style={styles.subtitle}>Select your role and sign in</Text>
        </View>

        <View style={styles.form}>
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.roleLabel}>Admin Role</Text>
          <View style={styles.roleRow}>
            {ADMIN_ROLES.map((r) => (
              <TouchableOpacity
                key={r.key}
                style={[
                  styles.roleChip,
                  role === r.key && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setRole(r.key)}
              >
                <Text
                  style={[
                    styles.roleChipText,
                    role === r.key && { color: '#FFF' },
                  ]}
                  numberOfLines={1}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Email"
            placeholder="admin@school.edu"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            leftIcon="mail-outline"
          />
          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            isPassword
            leftIcon="lock-closed-outline"
          />

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword', { role: 'admin' })}>
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
          </TouchableOpacity>

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            size="lg"
            style={{ marginTop: spacing.sm }}
          />

          <TouchableOpacity onPress={() => navigation.navigate('AdminRegister')}>
            <Text style={styles.registerLink}>Not registered yet? Set up your account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.navigate('WelcomeRole')}>
            <Text style={styles.footerLink}>Back to role selection</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  roleLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: '#374151',
    marginBottom: spacing.xs,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  roleChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
  },
  roleChipText: {
    ...typography.caption,
    fontWeight: '600',
    color: '#6B7280',
  },
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xl,
  },
  backArrow: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.md,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  backCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: '#1F2937',
  },
  subtitle: {
    ...typography.bodySmall,
    color: '#6B7280',
    marginTop: spacing.xs,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
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
  forgotPassword: {
    ...typography.bodySmall,
    color: '#059669',
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: spacing.sm,
  },
  registerLink: {
    ...typography.bodySmall,
    color: '#059669',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerLink: {
    ...typography.bodySmall,
    color: '#059669',
    fontWeight: '600',
  },
});
