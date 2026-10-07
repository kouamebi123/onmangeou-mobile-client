import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';
import { useRouter } from 'expo-router';

import { requestOtp, verifyOtp } from '@/api/auth';
import { ApiError } from '@/api/envelope';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Logo } from '@/components/logo';
import { Appear } from '@/components/motion';
import { HeroBlobs } from '@/components/page-hero';
import { PhoneField } from '@/components/phone-field';
import { Screen } from '@/components/screen';
import { Signature } from '@/components/signature';
import { TextField } from '@/components/text-field';
import { t } from '@/i18n';
import { useAuthStore } from '@/store/auth-store';
import { useTransitionStore } from '@/store/transition-store';
import { tokens } from '@/theme';

const phoneSchema = z.object({
  phone: z.string().min(8).max(24),
});

const codeSchema = z.object({
  code: z.string().regex(/^\d{4,8}$/),
});

type PhoneValues = z.infer<typeof phoneSchema>;
type CodeValues = z.infer<typeof codeSchema>;

export function OtpScreen() {
  const router = useRouter();
  const coverWelcome = useTransitionStore((state) => state.coverWelcome);
  const revealWelcome = useTransitionStore((state) => state.revealWelcome);
  const setSession = useAuthStore((state) => state.setSession);
  const [phone, setPhone] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [formError, setFormError] = useState<string | undefined>();

  const phoneForm = useForm<PhoneValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' },
  });

  const codeForm = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  });

  return (
    <Screen>
      <View style={styles.hero}>
        <HeroBlobs />
        <View style={styles.logoWrap}>
          <Logo variant="dark" height={144} />
        </View>
        <AppText variant="caption" color={tokens.color.brand.accent} style={styles.kicker}>
          {t('auth.kicker')}
        </AppText>
        <AppText variant="title" color={tokens.color.text.onBrand} style={styles.title}>
          {t('auth.title')}
        </AppText>
        <AppText variant="muted" color={tokens.color.surface.mint}>
          {t('auth.lede')}
        </AppText>
      </View>

      <View style={styles.card}>
        {formError ? (
          <Appear>
            <AppText color={tokens.color.feedback.error}>{formError}</AppText>
          </Appear>
        ) : null}

        {step === 'phone' ? (
          <Appear key="phone">
            <Controller
              control={phoneForm.control}
              name="phone"
              render={({ field, fieldState }) => (
                <PhoneField
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error ? t('errors.generic') : undefined}
                />
              )}
            />
            <Button
              label={t('auth.sendCode')}
              loading={phoneForm.formState.isSubmitting}
              onPress={phoneForm.handleSubmit(async (values) => {
                setFormError(undefined);
                try {
                  const result = await requestOtp(values.phone);
                  setPhone(values.phone);
                  setDevCode(result.devCode);
                  setStep('code');
                } catch (error) {
                  setFormError(error instanceof ApiError ? error.problem.detail : t('errors.generic'));
                }
              })}
            />
          </Appear>
        ) : (
          <Appear key="code">
            {devCode ? (
              <View style={styles.devCode}>
                <AppText variant="caption" color={tokens.color.brand.primary}>
                  {t('auth.devCode', { code: devCode })}
                </AppText>
              </View>
            ) : null}
            <Controller
              control={codeForm.control}
              name="code"
              render={({ field, fieldState }) => (
                <TextField
                  label={t('auth.codeLabel')}
                  keyboardType="number-pad"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error ? t('errors.generic') : undefined}
                />
              )}
            />
            <Button
              label={t('auth.verify')}
              loading={codeForm.formState.isSubmitting}
              onPress={codeForm.handleSubmit(async (values) => {
                setFormError(undefined);
                try {
                  const tokens = await verifyOtp(phone, values.code);
                  // Le voile couvre l'écran pendant le retour vers l'accueil.
                  await coverWelcome();
                  await setSession(tokens);
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/(tabs)');
                  }
                  revealWelcome();
                } catch (error) {
                  revealWelcome();
                  setFormError(error instanceof ApiError ? error.problem.detail : t('errors.generic'));
                }
              })}
            />
            <Button
              label={t('common.changePhone')}
              variant="ghost"
              onPress={() => {
                setStep('phone');
                setDevCode(undefined);
                setFormError(undefined);
              }}
            />
          </Appear>
        )}
      </View>
      <Signature />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: tokens.spacing.sm,
    padding: tokens.spacing.lg,
    marginHorizontal: -tokens.layout.screenPadding,
    marginTop: -tokens.layout.screenPadding,
    backgroundColor: tokens.color.brand.deep,
    overflow: 'hidden',
    position: 'relative',
  },
  logoWrap: {
    zIndex: 1,
    alignSelf: 'flex-start',
    marginBottom: tokens.spacing.xs,
  },
  kicker: {
    fontFamily: tokens.typography.family.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: { fontSize: tokens.typography.size.xxl },
  card: {
    gap: tokens.spacing.md,
    padding: tokens.spacing.lg,
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    shadowColor: tokens.color.brand.deep,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  devCode: {
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.surface.mint,
  },
});
