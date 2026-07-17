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

export default function StudentLoginScreen({ navigation }: any) {
  const colors = useColors();
  const { login } = useAuth();
  const [regNumber, setRegNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!regNumber || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await authApi.studentLogin(regNumber.trim(), password);
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backArrow}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.header}>
          <View style={styles.backCircle}>
            <Ionicons name="school-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>Student Login</Text>
          <Text style={styles.subtitle}>Enter your registration number and password</Text>
        </View>

        <View style={styles.form}>
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          <Input
            label="Registration Number"
            placeholder="e.g. 20211186172"
            value={regNumber}
            onChangeText={setRegNumber}
            keyboardType="number-pad"
            maxLength={11}
            leftIcon="id-card-outline"
          />
          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            isPassword
            leftIcon="lock-closed-outline"
          />
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
          </TouchableOpacity>
          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            size="lg"
            style={{ marginTop: spacing.sm }}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('StudentRegister')}>
            <Text style={styles.footerLink}>Register Here</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    ...typography.bodySmall,
    color: '#6B7280',
  },
  footerLink: {
    ...typography.bodySmall,
    color: '#059669',
    fontWeight: '600',
  },
});
