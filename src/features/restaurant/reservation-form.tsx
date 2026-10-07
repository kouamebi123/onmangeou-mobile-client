import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { createReservation, fetchReservationSlots } from '@/api/commerce';
import { createIdempotencyKey } from '@/api/device';
import { ApiError } from '@/api/envelope';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Expandable } from '@/components/motion';
import { TextField } from '@/components/text-field';
import { useAuthStore } from '@/store/auth-store';
import { t } from '@/i18n';
import { tokens } from '@/theme';

import { groupSlotsByDay, reservationInstant, wallDate, type SlotDay } from './reservation-time';

const QUARTER_HOURS = Array.from(
  { length: 96 },
  (_, index) => `${String(Math.floor(index / 4)).padStart(2, '0')}:${String((index % 4) * 15).padStart(2, '0')}`,
);

/**
 * Jours et heures libres, utilisés tant que le restaurant n'a saisi aucun
 * horaire ou que le serveur ne publie pas encore ses créneaux.
 */
function openDays(timezone: string, now: Date): SlotDay[] {
  const start = new Date(`${wallDate(now, timezone)}T12:00:00Z`);
  return Array.from({ length: 31 }, (_, offset) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + offset);
    const day = date.toISOString().slice(0, 10);
    const times = QUARTER_HOURS.flatMap((label) => {
      const instant = reservationInstant(day, label, timezone);
      return instant && instant.getTime() > now.getTime() ? [{ label, iso: instant.toISOString() }] : [];
    });
    return { day, times };
  }).filter((entry) => entry.times.length > 0);
}

function dayLabel(day: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC', ...options });
}

export function ReservationForm({
  establishmentId,
  timezone = 'Africa/Abidjan',
}: {
  establishmentId: string;
  timezone?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.accessToken);
  const [expanded, setExpanded] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState('');
  const request = useRef({ payload: '', key: '' });

  const schedule = useQuery({
    queryKey: ['reservation-slots', establishmentId],
    queryFn: () => fetchReservationSlots(establishmentId),
    enabled: expanded,
    staleTime: 60_000,
    retry: false,
  });

  const days = useMemo(() => {
    if (schedule.data?.hoursConfigured) {
      return groupSlotsByDay(schedule.data.slots, schedule.data.timezone || timezone);
    }
    // Aucun horaire saisi, ou serveur plus ancien : le choix reste libre et le restaurant tranche.
    return schedule.isSuccess || schedule.isError ? openDays(timezone, new Date()) : [];
  }, [schedule.data, schedule.isError, schedule.isSuccess, timezone]);

  const activeDay = days.find((entry) => entry.day === day) ?? days[0];
  const chosen = activeDay?.times.find((entry) => entry.iso === slot);
  const valid = chosen !== undefined && new Date(chosen.iso).getTime() > Date.now();

  const reserve = useMutation({
    mutationFn: async () => {
      if (!chosen || new Date(chosen.iso).getTime() <= Date.now()) throw new Error(t('reservation.invalidTime'));
      const input = { establishmentId, startsAt: chosen.iso, partySize, notes: notes.trim() || undefined };
      const payload = JSON.stringify(input);
      if (request.current.payload !== payload) request.current = { payload, key: createIdempotencyKey() };
      return createReservation(input, request.current.key);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
  const reset = () => reserve.reset();
  const error = reserve.error instanceof ApiError ? reserve.error.problem.detail : reserve.error?.message;

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={t('reservation.title')}
        onPress={() => setExpanded((open) => !open)}
        style={styles.head}
      >
        <View style={styles.headIcon}>
          <Ionicons name="calendar" size={18} color={tokens.color.brand.primary} />
        </View>
        <View style={styles.headBody}>
          <AppText variant="subtitle">{t('reservation.title')}</AppText>
          <AppText variant="caption">
            {chosen && activeDay
              ? t('reservation.selected', {
                  day: dayLabel(activeDay.day, { weekday: 'long', day: 'numeric', month: 'long' }),
                  time: chosen.label,
                })
              : t('reservation.hint')}
          </AppText>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={tokens.color.text.muted} />
      </Pressable>

      {/* Les blocs conditionnels du formulaire sont eux-mêmes repliables : ils poussent la suite sans à-coup. */}
      <Expandable open={expanded} gap={tokens.spacing.sm} style={styles.body}>
        <AppText variant="caption">{t('reservation.timezone', { timezone })}</AppText>

        <Expandable open={schedule.isLoading} gap={tokens.spacing.sm}>
          <AppText variant="muted">{t('reservation.loadingSlots')}</AppText>
        </Expandable>
        <Expandable open={!schedule.isLoading && days.length === 0} gap={tokens.spacing.sm}>
          <AppText variant="muted">{t('reservation.noSlots')}</AppText>
        </Expandable>

        <Expandable open={days.length > 0 && activeDay !== undefined} gap={tokens.spacing.sm} style={styles.body}>
          {activeDay ? (
            <>
              <AppText>{t('reservation.date')}</AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chips}>
                  {days.map((entry) => {
                    const selected = entry.day === activeDay.day;
                    return (
                      <Pressable
                        key={entry.day}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={dayLabel(entry.day, { weekday: 'long', day: 'numeric', month: 'long' })}
                        disabled={reserve.isPending}
                        onPress={() => {
                          setDay(entry.day);
                          setSlot(null);
                          reset();
                        }}
                        style={[styles.dayChip, selected ? styles.chipOn : null]}
                      >
                        <AppText variant="caption" color={selected ? tokens.color.text.onBrand : tokens.color.text.muted}>
                          {dayLabel(entry.day, { weekday: 'short' })}
                        </AppText>
                        <AppText
                          color={selected ? tokens.color.text.onBrand : tokens.color.brand.deep}
                          style={styles.chipStrong}
                        >
                          {dayLabel(entry.day, { day: 'numeric', month: 'short' })}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              <AppText>{t('reservation.time')}</AppText>
              <ScrollView style={styles.times} nestedScrollEnabled>
                <View style={styles.timeGrid}>
                  {activeDay.times.map((entry) => {
                    const selected = entry.iso === slot;
                    return (
                      <Pressable
                        key={entry.iso}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={entry.label}
                        disabled={reserve.isPending}
                        onPress={() => {
                          setDay(activeDay.day);
                          setSlot(entry.iso);
                          reset();
                        }}
                        style={[styles.timeChip, selected ? styles.chipOn : null]}
                      >
                        <AppText
                          color={selected ? tokens.color.text.onBrand : tokens.color.brand.deep}
                          style={styles.chipStrong}
                        >
                          {entry.label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </>
          ) : null}
        </Expandable>

        <View style={styles.party}>
          <AppText style={styles.partyLabel}>{t('reservation.party', { count: String(partySize) })}</AppText>
          <Button
            label="−"
            variant="outline"
            accessibilityLabel={t('reservation.less')}
            disabled={partySize <= 1 || reserve.isPending}
            onPress={() => {
              setPartySize(partySize - 1);
              reset();
            }}
          />
          <Button
            label="+"
            variant="outline"
            accessibilityLabel={t('reservation.more')}
            disabled={partySize >= 20 || reserve.isPending}
            onPress={() => {
              setPartySize(partySize + 1);
              reset();
            }}
          />
        </View>
        <TextField
          label={t('reservation.notes')}
          value={notes}
          maxLength={500}
          editable={!reserve.isPending}
          onChangeText={(value) => {
            setNotes(value);
            reset();
          }}
        />
        <AppText variant="caption">{t('reservation.pendingNotice')}</AppText>
        {token ? (
          <Button
            label={t('reservation.send')}
            loading={reserve.isPending}
            disabled={!valid || reserve.isSuccess}
            onPress={() => reserve.mutate()}
          />
        ) : (
          <Button label={t('reservation.login')} onPress={() => router.push('/auth')} />
        )}
        <Expandable open={reserve.isSuccess} gap={tokens.spacing.sm}>
          <AppText accessibilityLiveRegion="polite" color={tokens.color.feedback.success}>
            {t('reservation.success')}
          </AppText>
        </Expandable>
        <Expandable open={Boolean(error)} gap={tokens.spacing.sm}>
          <AppText accessibilityLiveRegion="polite" color={tokens.color.feedback.error}>
            {error}
          </AppText>
        </Expandable>
      </Expandable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm, minHeight: tokens.layout.minTouchTarget },
  headIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.color.surface.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headBody: { flex: 1, gap: 2 },
  body: { gap: tokens.spacing.sm },
  chips: { flexDirection: 'row', gap: tokens.spacing.xs },
  dayChip: {
    minWidth: 68,
    minHeight: 56,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    backgroundColor: tokens.color.surface.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeChip: {
    minWidth: 72,
    minHeight: tokens.layout.minTouchTarget,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    backgroundColor: tokens.color.surface.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: tokens.color.brand.primary, borderColor: tokens.color.brand.primary },
  chipStrong: { fontFamily: tokens.typography.family.semibold },
  times: { maxHeight: 176 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xs },
  party: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  partyLabel: { flex: 1 },
});
