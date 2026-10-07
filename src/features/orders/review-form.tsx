import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { createReview, fetchMyReview, type MyReview } from "@/api/commerce";
import { createIdempotencyKey } from "@/api/device";
import { ApiError } from "@/api/envelope";
import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { Appear } from "@/components/motion";
import { TextField } from "@/components/text-field";
import { t } from "@/i18n";
import { tokens } from "@/theme";
import { useAuthStore } from "@/store/auth-store";
import { ReviewPhotos } from "./review-photos";

export function ReviewForm({
  orderId,
  establishmentId,
  delivery = false,
}: {
  orderId: string;
  establishmentId: string;
  delivery?: boolean;
}) {
  const sessionId = useAuthStore((s) => s.sessionId);
  const review = useQuery({
    queryKey: ["my-review", sessionId, orderId],
    queryFn: () => fetchMyReview(orderId),
  });
  if (review.isPending) return <AppText>{t("common.loading")}</AppText>;
  if (review.isError)
    return (
      <Appear style={{ gap: 0 }}>
        <AppText>{t("review.loadError")}</AppText>
        <Button
          label={t("review.retry")}
          onPress={() => void review.refetch()}
        />
      </Appear>
    );
  return (
    <ReviewEditor
      key={orderId + (review.data?.id ?? "")}
      orderId={orderId}
      establishmentId={establishmentId}
      existing={review.data}
      delivery={delivery}
    />
  );
}

function ReviewEditor({
  orderId,
  establishmentId,
  existing,
  delivery,
}: {
  orderId: string;
  establishmentId: string;
  existing: MyReview | null;
  delivery: boolean;
}) {
  const queryClient = useQueryClient();
  const [score, setScore] = useState(existing?.score ?? 0);
  const [deliveryScore, setDeliveryScore] = useState(
    existing?.deliveryScore ?? 0,
  );
  const [body, setBody] = useState(existing?.body ?? "");
  const request = useRef({ payload: "", key: "" });
  const save = useMutation({
    mutationFn: () => {
      const input = {
        orderId,
        score,
        deliveryScore: delivery && deliveryScore ? deliveryScore : undefined,
        body: body.trim() || undefined,
      };
      const payload = JSON.stringify(input);
      if (payload !== request.current.payload)
        request.current = { payload, key: createIdempotencyKey() };
      return createReview(input, request.current.key);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-review"] });
      void queryClient.invalidateQueries({
        queryKey: ["reviews", establishmentId],
      });
    },
  });
  return (
    <Appear style={{ gap: tokens.spacing.sm }}>
      <AppText variant="subtitle">
        {existing ? t("review.edit") : t("review.title")}
      </AppText>
      <AppText variant="caption">{t("review.verified")}</AppText>
      <AppText variant="muted">{t("review.help")}</AppText>
      {existing ? (
        <ReviewPhotos
          reviewId={existing.id}
          photos={existing.photos}
          editable={existing.status === "PUBLISHED"}
        />
      ) : (
        <AppText variant="caption">{t("reviewPhotos.afterPublish")}</AppText>
      )}
      <View style={{ flexDirection: "row", gap: tokens.spacing.xs }}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={t("review.score", { score: String(value) })}
            accessibilityState={{ selected: score === value }}
            disabled={save.isPending}
            hitSlop={4}
            onPress={() => {
              setScore(value);
              save.reset();
            }}
            style={{
              width: tokens.layout.minTouchTarget,
              height: tokens.layout.minTouchTarget,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={value <= score ? "star" : "star-outline"}
              size={30}
              color={
                value <= score
                  ? tokens.color.brand.accent
                  : tokens.color.text.muted
              }
            />
          </Pressable>
        ))}
      </View>
      {delivery ? (
        <View style={{ gap: tokens.spacing.xs }}>
          <AppText>{t("review.deliveryTitle")}</AppText>
          <View style={{ flexDirection: "row", gap: tokens.spacing.xs }}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Button
                key={value}
                label={String(value)}
                accessibilityLabel={t("review.deliveryScore", {
                  score: String(value),
                })}
                accessibilityState={{ selected: deliveryScore === value }}
                variant={deliveryScore === value ? "primary" : "outline"}
                disabled={save.isPending}
                onPress={() => {
                  setDeliveryScore(value === deliveryScore ? 0 : value);
                  save.reset();
                }}
              />
            ))}
          </View>
        </View>
      ) : null}
      <TextField
        label={t("review.body")}
        value={body}
        multiline
        maxLength={2000}
        editable={!save.isPending}
        onChangeText={(value) => {
          setBody(value);
          save.reset();
        }}
      />
      <Button
        label={existing ? t("review.save") : t("review.publish")}
        disabled={score < 1}
        loading={save.isPending}
        onPress={() => save.mutate()}
      />
      {save.isSuccess ? (
        <Appear>
          <AppText>{t("review.success")}</AppText>
        </Appear>
      ) : null}
      {save.isError ? (
        <Appear>
          <AppText color={tokens.color.feedback.error}>
            {save.error instanceof ApiError
              ? save.error.problem.detail
              : t("errors.generic")}
          </AppText>
        </Appear>
      ) : null}
    </Appear>
  );
}
