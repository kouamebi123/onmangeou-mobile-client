import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { deleteMyAccount, fetchConsents, fetchMe, logout, setConsent } from '@/api/auth';
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
import { HintRow, PageHero } from '@/components/page-hero';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { t } from '@/i18n';
import { useAuthStore } from '@/store/auth-store';
import { tokens } from '@/theme';

export function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const clear = useAuthStore((state) => state.clear);
  const [ticketBody, setTicketBody] = useState('');
  const [addressLabel, setAddressLabel] = useState('Maison');
  const [addressLine, setAddressLine] = useState('');
  const [deleteReason, setDeleteReason] = useState('');

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
  });
  const support = useMutation({
    mutationFn: () => createSupportTicket('Aide depuis l’application', ticketBody.trim()),
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

      {!accessToken ? (
        <>
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
        </>
      ) : (
        <>
          <View style={styles.card}>
            <InfoLine icon="call-outline" label={t('profile.phone')} value={me.data?.phoneE164 ?? '—'} />
            <View style={styles.divider} />
            <InfoLine icon="person-outline" label={t('profile.name')} value={me.data?.fullName ?? '—'} />
            {me.data?.defaultCity ? (
              <>
                <View style={styles.divider} />
                <InfoLine icon="location-outline" label={t('common.city')} value={me.data.defaultCity} />
              </>
            ) : null}
          </View>

          {inbox.data && inbox.data.length > 0 ? (
            <View style={styles.card}>
              <AppText variant="subtitle">Notifications</AppText>
              {inbox.data.slice(0, 4).map((item) => (
                <AppText key={item.id} variant="muted">
                  {item.title}
                </AppText>
              ))}
              <Button label="Tout marquer lu" variant="ghost" onPress={() => void markNotificationsRead()} />
            </View>
          ) : null}
          {reservations.data && reservations.data.length > 0 ? (
            <View style={styles.card}>
              <AppText variant="subtitle">Réservations</AppText>
              {reservations.data.slice(0, 4).map((item) => (
                <View key={item.id} style={styles.info}>
                  <View style={styles.infoBody}>
                    <AppText>
                      {item.establishment_name} · {item.status}
                    </AppText>
                    {item.status === 'REQUESTED' || item.status === 'CONFIRMED' ? (
                      <Button
                        label="Annuler"
                        variant="ghost"
                        onPress={() => cancelResa.mutate(item.id)}
                      />
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.card}>
            <AppText variant="subtitle">Aide</AppText>
            <TextField
              label="Décrire le problème"
              value={ticketBody}
              onChangeText={setTicketBody}
              multiline
            />
            <Button
              label="Envoyer un ticket"
              variant="outline"
              loading={support.isPending}
              disabled={ticketBody.trim().length < 4}
              onPress={() => support.mutate()}
            />
            {support.isSuccess ? <AppText color={tokens.color.brand.primary}>Ticket envoyé.</AppText> : null}
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
            <AppText variant="subtitle">Adresses</AppText>
            {addresses.data?.map((item) => (
              <View key={item.id} style={styles.info}>
                <View style={styles.infoBody}>
                  <AppText>
                    {item.label} · {item.line}
                  </AppText>
                  <Button label="Retirer" variant="ghost" onPress={() => deleteAddress(item.id).then(() => void queryClient.invalidateQueries({ queryKey: ['me', 'addresses'] }))} />
                </View>
              </View>
            ))}
            <TextField label="Libellé" value={addressLabel} onChangeText={setAddressLabel} />
            <TextField label="Adresse ou repère" value={addressLine} onChangeText={setAddressLine} />
            <Button
              label="Enregistrer l’adresse"
              variant="outline"
              disabled={addressLine.trim().length < 4}
              onPress={() =>
                createAddress(addressLabel.trim() || 'Adresse', addressLine.trim()).then(() => {
                  setAddressLine('');
                  void queryClient.invalidateQueries({ queryKey: ['me', 'addresses'] });
                })
              }
            />
          </View>

          <View style={styles.card}>
            <AppText variant="subtitle">Consentements</AppText>
            {(['MARKETING', 'LOCATION'] as const).map((type) => {
              const current = consents.data?.find((item) => item.type === type);
              return (
                <Button
                  key={type}
                  label={`${type === 'MARKETING' ? 'Offres et bons plans' : 'Localisation'} · ${current?.granted ? 'activé' : 'désactivé'}`}
                  variant="ghost"
                  onPress={() =>
                    setConsent(type, !current?.granted).then(() => void queryClient.invalidateQueries({ queryKey: ['me', 'consents'] }))
                  }
                />
              );
            })}
          </View>

          <Button
            label={t('common.signOut')}
            variant="outline"
            onPress={async () => {
              try {
                await logout();
              } finally {
                await clear();
              }
            }}
          />
          <TextField label="Motif de suppression du compte" value={deleteReason} onChangeText={setDeleteReason} />
          <Button
            label="Supprimer mon compte"
            variant="destructive"
            disabled={deleteReason.trim().length < 4}
            onPress={async () => {
              await deleteMyAccount(deleteReason.trim());
              await clear();
            }}
          />
        </>
      )}
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
  info: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  infoBody: { flex: 1, gap: 2 },
  divider: { height: 1, backgroundColor: tokens.color.border.default },
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
