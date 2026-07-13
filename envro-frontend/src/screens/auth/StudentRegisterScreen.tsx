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

export default function StudentRegisterScreen({ navigation }: any) {
  const colors = useColors();
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestOTP = async () => {
    if (!registrationNumber.trim()) { setError('Enter your registration number'); return; }
    setLoading(true); setError(null);
    try {
      await authApi.requestRegistrationOTP(registrationNumber.trim());
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 6) { setError('Enter a valid OTP'); return; }
    setLoading(true); setError(null);
    try {
      const { data } = await authApi.verifyRegistrationOTP(registrationNumber.trim(), otp);
      setVerificationToken(data.data.verificationToken);
      setStep('password');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async () => {
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError(null);
    try {
      await authApi.completeRegistration(verificationToken, password, confirmPassword);
      navigation.replace('StudentLogin');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.backCircle}>
            <Ionicons
              name={step === 'email' ? 'mail-outline' : step === 'otp' ? 'key-outline' : 'lock-closed-outline'}
              size={28}
              color={colors.primary}
            />
          </View>
          <Text style={styles.title}>
            {step === 'email' ? 'Register' : step === 'otp' ? 'Verify OTP' : 'Set Password'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'email'
              ? 'Enter your registration number to receive OTP'
              : step === 'otp'
              ? 'Enter the 6-digit code sent to your email'
              : 'Create a strong password for your account'}
          </Text>
        </View>

        {/* Step indicator */}
        <View style={styles.stepsRow}>
          {['email', 'otp', 'password'].map((s, i) => (
            <View key={i} style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  (step === s || (step === 'otp' && s === 'email') || (step === 'password' && (s === 'email' || s === 'otp')))
                    ? styles.stepDotActive
                    : null,
                ]}
              >
                <Text style={styles.stepNumber}>{i + 1}</Text>
              </View>
              {i < 2 && <View style={[styles.stepLine, (step === 'password' || step === 'otp') && s === 'email' ? styles.stepLineActive : null]} />}
            </View>
          ))}
        </View>

        <View style={styles.form}>
          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {step === 'email' && (
            <>
              <Input
                label="Registration Number"
                placeholder="e.g. 20211186172"
                value={registrationNumber}
                onChangeText={setRegistrationNumber}
                keyboardType="number-pad"
                maxLength={11}
                leftIcon="id-card-outline"
              />
              <Button title="Send OTP" onPress={handleRequestOTP} loading={loading} size="lg" />
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
              <Button title="Verify OTP" onPress={handleVerifyOTP} loading={loading} size="lg" />
              <TouchableOpacity onPress={handleRequestOTP} style={{ marginTop: spacing.md, alignItems: 'center' }}>
                <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: '600' }]}>
                  Resend OTP
                </Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'password' && (
            <>
              <Input
                label="Password"
                placeholder="At least 8 characters"
                value={password}
                onChangeText={setPassword}
                isPassword
                leftIcon="lock-closed-outline"
              />
              <Input
                label="Confirm Password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                isPassword
                leftIcon="lock-closed-outline"
              />
              <Button title="Create Account" onPress={handleCompleteRegistration} loading={loading} size="lg" />
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('StudentLogin')}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
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
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: '#059669',
  },
  stepNumber: {
    ...typography.caption,
    color: '#FFF',
    fontWeight: '700',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: spacing.xs,
  },
  stepLineActive: {
    backgroundColor: '#059669',
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
