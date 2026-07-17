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

export default function ForgotPasswordScreen({ navigation, route }: any) {
  const colors = useColors();
  const isAdmin = route?.params?.role === 'admin';
  const [step, setStep] = useState<'regNumber' | 'otp' | 'password'>('regNumber');
  const [regNumber, setRegNumber] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestReset = async () => {
    if (isAdmin) {
      if (!email) { setError('Enter your email'); return; }
    } else {
      if (!regNumber) { setError('Enter your registration number'); return; }
    }
    setLoading(true); setError(null);
    try {
      if (isAdmin) {
        await authApi.adminForgotPassword(email.trim().toLowerCase());
      } else {
        await authApi.forgotPassword(regNumber.trim());
      }
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!otp || otp.length < 6) { setError('Enter a valid OTP'); return; }
    setLoading(true); setError(null);
    try {
      if (isAdmin) {
        await authApi.adminResetPassword(email.trim().toLowerCase(), otp, password);
      } else {
        await authApi.resetPassword(regNumber.trim(), otp, password, confirmPassword);
      }
      navigation.navigate(isAdmin ? 'AdminLogin' : 'StudentLogin');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  const subtitle = isAdmin
    ? step === 'regNumber'
      ? 'Enter your email to receive a reset code'
      : step === 'otp'
      ? 'Enter the code sent to your email'
      : 'Create a new password'
    : step === 'regNumber'
      ? 'Enter your registration number to receive a reset code'
      : step === 'otp'
      ? 'Enter the code sent to your email'
      : 'Create a new password';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.backCircle}>
            <Ionicons name="lock-open-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.form}>
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {step === 'regNumber' && (
            <>
              {isAdmin ? (
                <Input
                  label="Email"
                  placeholder="admin@school.edu"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  leftIcon="mail-outline"
                />
              ) : (
                <Input
                  label="Registration Number"
                  placeholder="e.g. 20211186172"
                  value={regNumber}
                  onChangeText={setRegNumber}
                  keyboardType="number-pad"
                  maxLength={11}
                  leftIcon="id-card-outline"
                />
              )}
              <Button title="Send Reset Code" onPress={handleRequestReset} loading={loading} size="lg" />
            </>
          )}

          {step === 'otp' && (
            <>
              <Input
                label="OTP Code"
                placeholder="000000"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                leftIcon="key-outline"
              />
              <Input
                label="New Password"
                placeholder="At least 8 characters"
                value={password}
                onChangeText={setPassword}
                isPassword
                leftIcon="lock-closed-outline"
              />
              <Input
                label="Confirm Password"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                isPassword
                leftIcon="lock-closed-outline"
              />
              <Button title="Reset Password" onPress={handleResetPassword} loading={loading} size="lg" />
            </>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.footerLink}>Back to Sign In</Text>
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
    textAlign: 'center',
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
