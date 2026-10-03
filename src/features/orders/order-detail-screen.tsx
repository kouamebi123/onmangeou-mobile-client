import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef } from "react";
import { createIdempotencyKey } from "@/api/device";
import { StyleSheet, View } from "react-native";

import { confirmPayment, createPaymentIntent } from "@/api/commerce";
import { cancelOrder, confirmPickup, fetchOrder } from "@/api/orders";
import { ApiError } from "@/api/envelope";
import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { ReviewForm } from "./review-form";
import { ErrorState } from "@/components/error-state";
import { PageHero } from "@/components/page-hero";
import { Screen } from "@/components/screen";
import { Skeleton } from "@/components/skeleton";
import { t } from "@/i18n";
import { tokens } from "@/theme";
import { useAuthStore } from "@/store/auth-store";
import { orderKeys } from "./order-cache";
import { OrderTracker } from "./order-tracker";

export function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionId = useAuthStore((state) => state.sessionId);
  const paymentRequest = useRef({ payload: "", key: "", intentId: "" });

  const detail = useQuery({
    queryKey: orderKeys.detail(sessionId, id ?? ""),
    queryFn: () => fetchOrder(id ?? ""),
    enabled: Boolean(id),
    refetchInterval: 8000,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  const cancel = useMutation({
    mutationFn: () => cancelOrder(id ?? ""),
    onSuccess: invalidate,
  });

  const pickup = useMutation({
    mutationFn: () => confirmPickup(id ?? ""),
    onSuccess: invalidate,
  });

  const pay = useMutation({
    mutationFn: async () => {
      const method = detail.data?.paymentMethod;
      if (!method || method === "CASH")
        throw new Error(t("payments.unavailable"));
      const payload = JSON.stringify([id, method]);
      if (paymentRequest.current.payload !== payload) {
        paymentRequest.current = {
          payload,
          key: createIdempotencyKey(),
          intentId: "",
        };
      }
      if (!paymentRequest.current.intentId) {
        const intent = await createPaymentIntent(
          id ?? "",
          method,
          paymentRequest.current.key,
        );
        paymentRequest.current.intentId = intent.id;
      }
      return confirmPayment(paymentRequest.current.intentId);
    },
    onSuccess: invalidate,
  });

  if (detail.isLoading) {
    return (
      <Screen>
        <Skeleton height={160} />
        <Skeleton height={120} />
      </Screen>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <Screen>
        <ErrorState onRetry={() => void detail.refetch()} />
        <Button
          label={t("restaurant.back")}
          variant="ghost"
          onPress={() => router.back()}
        />
      </Screen>
    );
  }

  const order = detail.data;
  const actionError =
    cancel.error instanceof ApiError
      ? cancel.error.problem.detail
      : pickup.error instanceof ApiError
        ? pickup.error.problem.detail
        : pay.error instanceof ApiError
          ? pay.error.problem.detail
          : cancel.error || pickup.error || pay.error
            ? t("errors.generic")
            : undefined;

  const dateFormat = new Intl.DateTimeFormat("fr-FR", {
    timeZone: order.timezone ?? "Africa/Abidjan",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Screen>
      <PageHero
        icon="receipt-outline"
        kicker={t("orders.ref", { ref: order.publicRef })}
        title={order.establishmentName}
        subtitle={t("orders.placedAt", {
          date: dateFormat.format(new Date(order.placedAt)),
        })}
      />

      <OrderTracker
        status={order.status}
        delivery={order.service === "DELIVERY"}
      />

      <View style={styles.card}>
        <View style={styles.fact}>
          <AppText variant="muted">{t("orders.pickup")}</AppText>
          <AppText style={styles.factValue}>
            {[
              t(`orders.service.${order.service}`),
              order.scheduledFor
                ? dateFormat.format(new Date(order.scheduledFor))
                : t("schedule.immediate"),
            ].join(" · ")}
          </AppText>
        </View>
        {order.paymentMethod ? (
          <View style={styles.fact}>
            <AppText variant="muted">{t("orders.payment")}</AppText>
            <AppText style={styles.factValue}>
              {t(`orders.paymentMethod.${order.paymentMethod}`)}
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <AppText variant="muted">
          {t("orders.items", { count: String(itemCount) })}
        </AppText>
        {order.items.map((item) => (
          <View key={item.id} style={styles.line}>
            <AppText style={styles.quantity}>{item.quantity} ×</AppText>
            <AppText style={styles.lineBody}>{item.name}</AppText>
            <AppText style={styles.amount}>{item.linePrice.formatted}</AppText>
          </View>
        ))}
        {order.couponCode && order.discount && order.subtotal ? (
          <>
            <View style={[styles.line, styles.lineTop]}>
              <AppText style={styles.lineBody}>{t("coupon.subtotal")}</AppText>
              <AppText style={styles.amount}>{order.subtotal.formatted}</AppText>
            </View>
            <View style={styles.line}>
              <AppText style={styles.lineBody}>
                {t("coupon.discount", { code: order.couponCode })}
              </AppText>
              <AppText style={styles.amount}>−{order.discount.formatted}</AppText>
            </View>
          </>
        ) : null}
        <View style={[styles.line, styles.lineTop]}>
          <AppText variant="subtitle" style={styles.lineBody}>
            {t("orders.total")}
          </AppText>
          <AppText style={styles.totalAmount}>{order.total.formatted}</AppText>
        </View>
      </View>

      {order.notes ? (
        <View style={styles.card}>
          <AppText variant="muted">{t("orders.notes")}</AppText>
          <AppText>{order.notes}</AppText>
        </View>
      ) : null}

      {actionError ? (
        <AppText color={tokens.color.feedback.error}>{actionError}</AppText>
      ) : null}

      {order.status === "PENDING_PAYMENT" ? (
        <Button
          label={t("payments.simulate")}
          loading={pay.isPending}
          onPress={() => pay.mutate()}
        />
      ) : null}
      {order.status === "PENDING_RESTAURANT" ||
      order.status === "PENDING_PAYMENT" ? (
        <Button
          label={t("orders.cancel")}
          variant="outline"
          loading={cancel.isPending}
          onPress={() => cancel.mutate()}
        />
      ) : null}
      {order.status === "READY" && order.service !== "DELIVERY" ? (
        <Button
          label={t("orders.confirmPickup")}
          loading={pickup.isPending}
          onPress={() => pickup.mutate()}
        />
      ) : null}
      {order.status === "COMPLETED" ? (
        <ReviewForm
          orderId={order.id}
          establishmentId={order.establishmentId}
          delivery={order.service === "DELIVERY"}
        />
      ) : null}
      <Button
        label={t("restaurant.back")}
        variant="ghost"
        onPress={() => router.back()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: tokens.spacing.sm,
    padding: tokens.spacing.md,
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
  },
  fact: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: tokens.spacing.md,
  },
  factValue: {
    flex: 1,
    textAlign: "right",
    fontFamily: tokens.typography.family.semibold,
    color: tokens.color.brand.deep,
  },
  line: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: tokens.spacing.sm,
  },
  lineTop: {
    paddingTop: tokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: tokens.color.border.default,
  },
  quantity: {
    minWidth: 28,
    color: tokens.color.text.muted,
    fontVariant: ["tabular-nums"],
  },
  lineBody: { flex: 1 },
  amount: { fontVariant: ["tabular-nums"], color: tokens.color.brand.deep },
  totalAmount: {
    fontFamily: tokens.typography.family.bold,
    fontSize: tokens.typography.size.xl,
    fontVariant: ["tabular-nums"],
    color: tokens.color.brand.deep,
  },
});
