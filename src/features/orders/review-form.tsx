import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { createReview, fetchMyReview, type MyReview } from '@/api/commerce';
import { createIdempotencyKey } from '@/api/device';
import { ApiError } from '@/api/envelope';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { t } from '@/i18n';
import { tokens } from '@/theme';
import { useAuthStore } from '@/store/auth-store';

export function ReviewForm({ orderId, establishmentId }: { orderId: string; establishmentId: string }) {
  const sessionId = useAuthStore((s) => s.sessionId);
  const review = useQuery({
    queryKey: ['my-review', sessionId, orderId],
    queryFn: () => fetchMyReview(orderId),
  });
  if (review.isPending) return <AppText>{t('common.loading')}</AppText>;
  if (review.isError) return <View><AppText>{t('review.loadError')}</AppText><Button label={t('review.retry')} onPress={() => void review.refetch()} /></View>;
  return <ReviewEditor key={orderId + (review.data?.id ?? '')} orderId={orderId} establishmentId={establishmentId} existing={review.data} />;
}

function ReviewEditor({ orderId, establishmentId, existing }: { orderId: string; establishmentId: string; existing: MyReview | null }) {
  const queryClient = useQueryClient();
  const [score, setScore] = useState(existing?.score ?? 0);
  const [body, setBody] = useState(existing?.body ?? '');
  const request = useRef({ payload: '', key: '' });
  const save = useMutation({
    mutationFn: () => {
      const input = { orderId, score, body: body.trim() || undefined };
      const payload = JSON.stringify(input);
      if (payload !== request.current.payload) request.current = { payload, key: createIdempotencyKey() };
      return createReview(input, request.current.key);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-review'] });
      void queryClient.invalidateQueries({ queryKey: ['reviews', establishmentId] });
    },
  });
  return <View style={{ gap: tokens.spacing.sm }}>
    <AppText variant="subtitle">{existing ? t('review.edit') : t('review.title')}</AppText>
    <AppText variant="caption">{t('review.verified')}</AppText>
    <AppText variant="muted">{t('review.help')}</AppText>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xs }}>
      {[1, 2, 3, 4, 5].map((value) => <Button key={value} label={value <= score ? '★' : '☆'}
        accessibilityLabel={t('review.score', { score: String(value) })} accessibilityState={{ selected: score === value }}
        variant={value <= score ? 'primary' : 'outline'} disabled={save.isPending}
        onPress={() => { setScore(value); save.reset(); }} />)}
    </View>
    <TextField label={t('review.body')} value={body} multiline maxLength={2000} editable={!save.isPending}
      onChangeText={(value) => { setBody(value); save.reset(); }} />
    <Button label={existing ? t('review.save') : t('review.publish')} disabled={score < 1}
      loading={save.isPending} onPress={() => save.mutate()} />
    {save.isSuccess ? <AppText>{t('review.success')}</AppText> : null}
    {save.isError ? <AppText color={tokens.color.feedback.error}>
      {save.error instanceof ApiError ? save.error.problem.detail : t('errors.generic')}
    </AppText> : null}
  </View>;
}
