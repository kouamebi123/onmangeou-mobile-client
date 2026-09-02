import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { OrderSchedule } from '@/api/orders';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { t } from '@/i18n';
import { tokens } from '@/theme';

export function SchedulePicker({ data, loading, error, value, onChange, service, retry }: {
  data?: OrderSchedule; loading: boolean; error: boolean; value: string;
  onChange: (value: string) => void; service: string; retry: () => void;
}) {
  const [later, setLater] = useState(false);
  const [day, setDay] = useState('');
  if (loading) return <AppText>{t('schedule.loading')}</AppText>;
  if (error || !data) return <View><AppText>{t('schedule.error')}</AppText><Button label={t('schedule.retry')} onPress={retry} /></View>;
  const dateLabel = (iso: string) => new Intl.DateTimeFormat('fr-CI', { timeZone: data.timezone, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso));
  const timeLabel = (iso: string) => new Intl.DateTimeFormat('fr-CI', { timeZone: data.timezone, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  const days = [...new Set(data.slots.map(dateLabel))];
  const selectedDay = days.includes(day) ? day : days[0];
  const showLater = later || Boolean(value) || !data.asapAvailable;
  const activeDay = value && data.slots.includes(value) ? dateLabel(value) : selectedDay;
  return <View style={{ gap: tokens.spacing.sm }}>
    <AppText variant="subtitle">{t(`schedule.${service}`)}</AppText>
    <AppText variant="muted">{t('schedule.notice', { timezone: data.timezone })}</AppText>
    <Button label={t('schedule.asap')} disabled={!data.asapAvailable}
      variant={!showLater ? 'primary' : 'outline'} onPress={() => { setLater(false); onChange(''); }} />
    {!data.asapAvailable ? <AppText variant="caption" accessibilityLiveRegion="polite">
      {data.slots[0] ? t('schedule.asapClosedNext', { date: `${dateLabel(data.slots[0])} ${timeLabel(data.slots[0])}`, timezone: data.timezone }) : t('schedule.asapClosed')}
    </AppText> : null}
    <Button label={t('schedule.later')} variant={showLater ? 'primary' : 'outline'}
      disabled={data.slots.length === 0}
      onPress={() => { setLater(true); setDay(''); onChange(data.slots[0] ?? ''); }} />
    {showLater ? <>
      {!days.length ? <AppText>{t('schedule.empty')}</AppText> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: tokens.spacing.sm }}>
        {days.map((item) => <Button key={item} label={item} variant={item === activeDay ? 'primary' : 'outline'}
          onPress={() => { setDay(item); onChange(data.slots.find((slot) => dateLabel(slot) === item) ?? ''); }} />)}
      </ScrollView>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm }}>
        {data.slots.filter((slot) => dateLabel(slot) === activeDay).map((slot) =>
          <Button key={slot} label={timeLabel(slot)} variant={value === slot ? 'primary' : 'outline'} onPress={() => onChange(slot)} />)}
      </View>
    </> : null}
  </View>;
}
