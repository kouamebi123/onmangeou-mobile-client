import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { createReservation } from '@/api/commerce';
import { createIdempotencyKey } from '@/api/device';
import { ApiError } from '@/api/envelope';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { useAuthStore } from '@/store/auth-store';
import { t } from '@/i18n';
import { tokens } from '@/theme';
import { reservationInstant, wallDate } from './reservation-time';

export function ReservationForm({ establishmentId, timezone = 'Africa/Abidjan' }: { establishmentId: string; timezone?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.accessToken);
  const [day, setDay] = useState(() => wallDate(new Date(), timezone));
  const [time, setTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState('');
  const request = useRef({ payload: '', key: '' });
  const reserve = useMutation({
    mutationFn: async () => {
      const instant = reservationInstant(day, time, timezone);
      if (!instant || instant.getTime() <= Date.now()) throw new Error(t('reservation.invalidTime'));
      const input = { establishmentId, startsAt: instant.toISOString(), partySize, notes: notes.trim() || undefined };
      const payload = JSON.stringify(input);
      if (request.current.payload !== payload) request.current = { payload, key: createIdempotencyKey() };
      return createReservation(input, request.current.key);
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['reservations'] }); },
  });
  const reset = () => reserve.reset();
  const dates = Array.from({ length: 31 }, (_, i) => {
    const date = new Date(`${wallDate(new Date(), timezone)}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + i);
    return date.toISOString().slice(0, 10);
  });
  const times = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String(i % 4 * 15).padStart(2, '0')}`);
  const chosen = reservationInstant(day, time, timezone);
  const valid = chosen !== null && chosen.getTime() > Date.now();
  const error = reserve.error instanceof ApiError ? reserve.error.problem.detail : reserve.error?.message;
  return <View style={{ gap: tokens.spacing.sm }}>
    <AppText variant="subtitle">{t('reservation.title')}</AppText>
    <AppText variant="caption">{t('reservation.timezone', { timezone })}</AppText>
    <AppText>{t('reservation.date')}</AppText>
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View style={{ flexDirection: 'row', gap: tokens.spacing.xs }}>
        {dates.map((value) => <Button key={value} disabled={reserve.isPending} variant={day === value ? 'primary' : 'outline'}
          label={new Date(`${value}T12:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })}
          accessibilityState={{ selected: day === value }} onPress={() => { setDay(value); setTime(''); reset(); }} />)}
      </View>
    </ScrollView>
    <AppText>{t('reservation.time')}</AppText>
    <ScrollView style={{ maxHeight: 170 }} nestedScrollEnabled>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xs }}>
        {times.map((value) => {
          const instant = reservationInstant(day, value, timezone);
          if (!instant || instant.getTime() <= Date.now()) return null;
          return <Button key={value} label={value} disabled={reserve.isPending}
            variant={time === value ? 'primary' : 'outline'} accessibilityState={{ selected: time === value }}
            onPress={() => { setTime(value); reset(); }} />;
        })}
      </View>
    </ScrollView>
    <AppText>{t('reservation.party', { count: String(partySize) })}</AppText>
    <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
      <Button label="−" accessibilityLabel={t('reservation.less')} disabled={partySize <= 1 || reserve.isPending} onPress={() => { setPartySize(partySize - 1); reset(); }} />
      <Button label="+" accessibilityLabel={t('reservation.more')} disabled={partySize >= 20 || reserve.isPending} onPress={() => { setPartySize(partySize + 1); reset(); }} />
    </View>
    <TextField label={t('reservation.notes')} value={notes} maxLength={500} editable={!reserve.isPending}
      onChangeText={(value) => { setNotes(value); reset(); }} />
    <AppText variant="caption">{t('reservation.pendingNotice')}</AppText>
    {token ? <Button label={t('reservation.send')} loading={reserve.isPending} disabled={!valid || reserve.isSuccess}
      onPress={() => reserve.mutate()} /> :
      <Button label={t('reservation.login')} onPress={() => router.push('/auth')} />}
    {reserve.isSuccess ? <AppText accessibilityLiveRegion="polite">{t('reservation.success')}</AppText> : null}
    {error ? <AppText accessibilityLiveRegion="polite" color={tokens.color.feedback.error}>{error}</AppText> : null}
  </View>;
}
