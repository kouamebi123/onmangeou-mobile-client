import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { deleteMyAccount, fetchConsents, fetchMe, logout, setConsent } from '@/api/auth';
import { ApiError } from '@/api/envelope';
import {
  cancelReservation,
  createAddress,
  createSupportTicket,
  deleteAddress,
  fetchAddresses,
  fetchMyReservations,
  fetchNotifications,
  markNotificationsRead,
} from '@/api/commerce';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Appear, Expandable } from '@/components/motion';
import { HintRow, PageHero } from '@/components/page-hero';
import { Screen } from '@/components/screen';
import { Signature } from '@/components/signature';
import { StatusChip } from '@/components/status-chip';
import { reservationStatusTone } from '@/features/orders/order-progress';
import { TextField } from '@/components/text-field';
import { t } from '@/i18n';
import { useAuthStore } from '@/store/auth-store';
import { tokens } from '@/theme';
import { PushSettings } from '@/features/notifications/push-settings';

export function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const clear = useAuthStore((state) => state.clear);
  const [ticketBody, setTicketBody] = useState('');
  const [addressLabel, setAddressLabel] = useState(t('profile.addressHome'));
  const [addressLine, setAddressLine] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const me = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: Boolean(accessToken),
  });
  const inbox = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    enabled: Boolean(accessToken),
  });
  const consents = useQuery({
    queryKey: ['me', 'consents'],
    queryFn: fetchConsents,
    enabled: Boolean(accessToken),
  });
  const addresses = useQuery({
    queryKey: ['me', 'addresses'],
    queryFn: fetchAddresses,
    enabled: Boolean(accessToken),
  });
  const reservations = useQuery({
    queryKey: ['reservations', 'mine'],
    queryFn: fetchMyReservations,
    enabled: Boolean(accessToken),
    // Le restaurant confirme ou refuse de son côté : l'état doit suivre sans tirer pour rafraîchir.
    staleTime: 0,
    refetchInterval: 20_000,
  });
  const support = useMutation({
    mutationFn: () => createSupportTicket(t('profile.helpSubject'), ticketBody.trim()),
    onSuccess: () => {
      setTicketBody('');
    },
  });
  const cancelResa = useMutation({
    mutationFn: (id: string) => cancelReservation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
  const action = useMutation({ mutationFn: (run: () => Promise<unknown>) => run() });
  const actionError = action.error ?? support.error ?? cancelResa.error;

  const displayName = me.data?.fullName?.trim() || t('profile.title');
  const phoneDigits = me.data?.phoneE164?.replace(/\D/g, '') ?? '';
  const initial = (me.data?.fullName?.trim() || phoneDigits.slice(-1) || 'P').slice(0, 1).toUpperCase();

  return (
    <Screen>
      <PageHero
        icon="person"
        hideIcon={Boolean(accessToken)}
        kicker={t('app.name')}
        title={accessToken ? displayName : t('profile.title')}
        subtitle={accessToken ? (me.data?.phoneE164 ?? t('profile.signedIn')) : t('profile.guestLead')}
      >
        {accessToken ? (
          <View style={styles.avatar}>
            <AppText color={tokens.color.brand.deep} style={styles.avatarLetter}>
              {initial}
            </AppText>
          </View>
        ) : null}
      </PageHero>
      {actionError ? (
        <Appear>
          <AppText accessibilityRole="alert" color={tokens.color.feedback.error}>
            {actionError instanceof ApiError ? actionError.problem.detail : t('errors.generic')}
          </AppText>
        </Appear>
      ) : null}

      {!accessToken ? (
        <Appear key="guest">
          <View style={styles.panel}>
            <View style={styles.mark}>
              <Ionicons name="sparkles-outline" size={32} color={tokens.color.text.onBrand} />
            </View>
            <AppText variant="subtitle" style={styles.center}>
              {t('profile.guestTitle')}
            </AppText>
            <AppText variant="muted" style={styles.center}>
              {t('profile.anonymous')}
            </AppText>
            <Button label={t('common.signIn')} onPress={() => router.push('/auth')} />
          </View>
          <HintRow icon="heart-outline" title={t('profile.benefitFavorites')} detail={t('profile.benefitFavoritesDetail')} />
          <HintRow icon="map-outline" title={t('profile.benefitPlaces')} detail={t('profile.benefitPlacesDetail')} />
          <HintRow icon="receipt-outline" title={t('profile.benefitSoon')} detail={t('profile.benefitSoonDetail')} />
        </Appear>
      ) : (
        <Appear key="member">
          <View style={styles.card}>
            <InfoLine icon="call-outline" label={t('profile.phone')} value={me.data?.phoneE164 ?? '—'} />
            <View style={styles.divider} />
            <InfoLine icon="person-outline" label={t('profile.name')} value={me.data?.fullName ?? '—'} />
            {me.data?.defaultCity ? (
              <Appear style={styles.cardStack}>
                <View style={styles.divider} />
                <InfoLine icon="location-outline" label={t('common.city')} value={me.data.defaultCity} />
              </Appear>
            ) : null}
          </View>

          {inbox.data && inbox.data.length > 0 ? (
            <Appear style={styles.card}>
              <AppText variant="subtitle">{t('profile.notifications')}</AppText>
              {inbox.data.slice(0, 4).map((item) => (
                <Appear key={item.id} style={styles.notice}>
                  <View style={[styles.noticeDot, item.read_at ? styles.noticeDotRead : null]} />
                  <View style={styles.infoBody}>
                    {/* The title is often just the app name: the message itself is in the body. */}
                    <AppText style={item.read_at ? undefined : styles.noticeUnread}>{item.body || item.title}</AppText>
                    {item.body && item.title && item.title !== t('app.name') ? (
                      <AppText variant="caption">{item.title}</AppText>
                    ) : null}
                  </View>
                </Appear>
              ))}
              <Button label={t('profile.markAllRead')} variant="ghost" disabled={action.isPending} onPress={() => action.mutate(async () => {
                await markNotificationsRead();
                await queryClient.invalidateQueries({ queryKey: ['notifications'] });
              })} />
            </Appear>
          ) : null}
          {/* Clés stables (identifiant de réservation) : le rafraîchissement périodique ne rejoue pas l'apparition. */}
          {reservations.data && reservations.data.length > 0 ? (
            <Appear style={styles.card}>
              <AppText variant="subtitle">{t('profile.reservations')}</AppText>
              {reservations.data.slice(0, 4).map((item, index) => (
                <Appear key={item.id} style={[styles.reservation, index > 0 ? styles.reservationNext : null]}>
                  <View style={styles.infoBody}>
                    <StatusChip label={t(`reservation.${item.status}`)} tone={reservationStatusTone(item.status)} />
                    <AppText style={styles.reservationName}>{item.establishment_name}</AppText>
                    <AppText variant="muted">
                      {[
                        new Date(item.starts_at).toLocaleString('fr-FR', {
                          timeZone: item.timezone ?? 'Africa/Abidjan',
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit',
                        }),
                        t('reservation.party', { count: String(item.party_size) }),
                      ].join(' · ')}
                    </AppText>
                  </View>
                  {item.status === 'REQUESTED' || item.status === 'CONFIRMED' ? (
                    <Button
                      label={t('common.cancel')}
                      variant="ghost"
                      disabled={cancelResa.isPending}
                      onPress={() => cancelResa.mutate(item.id)}
                    />
                  ) : null}
                </Appear>
              ))}
            </Appear>
          ) : null}

          <View style={styles.card}>
            <AppText variant="subtitle">{t('profile.help')}</AppText>
            <TextField
              label={t('profile.helpDescribe')}
              value={ticketBody}
              onChangeText={setTicketBody}
              multiline
            />
            <Button
              label={t('profile.helpSend')}
              variant="outline"
              loading={support.isPending}
              disabled={ticketBody.trim().length < 4}
              onPress={() => support.mutate()}
            />
            {support.isSuccess ? (
              <Appear>
                <AppText color={tokens.color.brand.primary}>{t('profile.helpSent')}</AppText>
              </Appear>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('profile.openFavorites')}
            onPress={() => router.push('/favorites')}
            style={styles.link}
          >
            <View style={styles.linkIcon}>
              <Ionicons name="heart-outline" size={18} color={tokens.color.brand.primary} />
            </View>
            <AppText variant="subtitle" style={styles.linkLabel}>
              {t('profile.openFavorites')}
            </AppText>
            <Ionicons name="chevron-forward" size={18} color={tokens.color.text.muted} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('profile.openExplore')}
            onPress={() => router.push('/explorer')}
            style={styles.link}
          >
            <View style={styles.linkIcon}>
              <Ionicons name="map-outline" size={18} color={tokens.color.brand.primary} />
            </View>
            <AppText variant="subtitle" style={styles.linkLabel}>
              {t('profile.openExplore')}
            </AppText>
            <Ionicons name="chevron-forward" size={18} color={tokens.color.text.muted} />
          </Pressable>

          <View style={styles.card}>
            <AppText variant="subtitle">{t('profile.addresses')}</AppText>
            {addresses.data?.map((item) => (
              <Appear key={item.id} style={styles.info}>
                <View style={styles.infoBody}>
                  <AppText>
                    {item.label} · {item.line}
                  </AppText>
                  <Button label={t('profile.addressRemove')} variant="ghost" disabled={action.isPending} onPress={() => action.mutate(async () => {
                    await deleteAddress(item.id);
                    await queryClient.invalidateQueries({ queryKey: ['me', 'addresses'] });
                  })} />
                </View>
              </Appear>
            ))}
            <TextField label={t('profile.addressLabel')} value={addressLabel} onChangeText={setAddressLabel} />
            <TextField label={t('profile.addressLine')} value={addressLine} onChangeText={setAddressLine} />
            <Button
              label={t('profile.addressSave')}
              variant="outline"
              disabled={addressLine.trim().length < 4 || action.isPending}
              onPress={() =>
                action.mutate(async () => {
                  await createAddress(addressLabel.trim() || t('profile.addressFallback'), addressLine.trim());
                  setAddressLine('');
                  await queryClient.invalidateQueries({ queryKey: ['me', 'addresses'] });
                })
              }
            />
          </View>

          <View style={styles.card}>
            <AppText variant="subtitle">{t('profile.consents')}</AppText>
            {(['MARKETING', 'LOCATION'] as const).map((type) => {
              const current = consents.data?.find((item) => item.type === type);
              const label = type === 'MARKETING' ? t('profile.consentMarketing') : t('profile.consentLocation');
              return (
                <View key={type} style={styles.consent}>
                  <AppText style={styles.linkLabel}>{label}</AppText>
                  <Switch
                    accessibilityLabel={label}
                    value={Boolean(current?.granted)}
                    disabled={action.isPending || !consents.data}
                    onValueChange={(granted) =>
                      action.mutate(async () => {
                        await setConsent(type, granted);
                        await queryClient.invalidateQueries({ queryKey: ['me', 'consents'] });
                      })
                    }
                    trackColor={{ false: tokens.color.border.default, true: tokens.color.brand.primary }}
                    thumbColor={tokens.color.surface.white}
                  />
                </View>
              );
            })}
          </View>

          <PushSettings />
          <Button
            label={t('common.signOut')}
            variant="outline"
            disabled={action.isPending}
            onPress={() => action.mutate(async () => {
              try {
                await logout();
              } finally {
                await clear();
              }
            })}
          />
          <Button
            label={t('profile.deleteAccount')}
            variant="ghost"
            accessibilityState={{ expanded: deleteOpen }}
            onPress={() => setDeleteOpen((open) => !open)}
          />
          <Expandable open={deleteOpen} gap={tokens.spacing.md}>
            <View style={styles.card}>
              <AppText variant="muted">{t('profile.deleteWarning')}</AppText>
              <TextField label={t('profile.deleteReason')} value={deleteReason} onChangeText={setDeleteReason} />
              <Button
                label={t('profile.deleteConfirm')}
                variant="destructive"
                disabled={deleteReason.trim().length < 4 || action.isPending}
                onPress={() =>
                  action.mutate(async () => {
                    await deleteMyAccount(deleteReason.trim());
                    await clear();
                  })
                }
              />
            </View>
          </Expandable>
        </Appear>
      )}
      <Signature />
    </Screen>
  );
}

function InfoLine({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.info}>
      <View style={styles.linkIcon}>
        <Ionicons name={icon} size={16} color={tokens.color.brand.primary} />
      </View>
      <View style={styles.infoBody}>
        <AppText variant="caption">{label}</AppText>
        <AppText>{value}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: tokens.color.surface.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.xxs,
  },
  avatarLetter: { fontFamily: tokens.typography.family.bold, fontSize: 22 },
  panel: {
    alignItems: 'center',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.xl,
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    shadowColor: tokens.color.brand.deep,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  mark: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: tokens.color.brand.deep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
  card: {
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
    shadowColor: tokens.color.brand.deep,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  cardStack: { gap: tokens.spacing.sm },
  info: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  infoBody: { flex: 1, gap: 2 },
  divider: { height: 1, backgroundColor: tokens.color.border.default },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.spacing.sm },
  noticeDot: { width: 8, height: 8, borderRadius: 4, marginTop: 7, backgroundColor: tokens.color.brand.accent },
  noticeDotRead: { backgroundColor: tokens.color.border.default },
  noticeUnread: { fontFamily: tokens.typography.family.semibold, color: tokens.color.brand.deep },
  reservation: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  reservationNext: {
    paddingTop: tokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: tokens.color.border.default,
  },
  reservationName: { fontFamily: tokens.typography.family.semibold, color: tokens.color.brand.deep },
  consent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    minHeight: tokens.layout.minTouchTarget,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    minHeight: tokens.layout.minTouchTarget,
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.color.surface.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabel: { flex: 1, fontSize: tokens.typography.size.md },
});
