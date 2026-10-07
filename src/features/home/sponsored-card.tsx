import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { apiRequest } from "@/api/client";
import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { Expandable } from "@/components/motion";
import { t } from "@/i18n";
import { tokens } from "@/theme";
interface Sponsored {
  viewId: string;
  title: string;
  name: string;
  slug: string;
}
export function SponsoredCard() {
  const router = useRouter();
  const ad = useQuery({
    queryKey: ["sponsored"],
    queryFn: async () =>
      (await apiRequest<Sponsored | null>("/sponsored", { auth: false })).data,
    staleTime: 300_000,
    retry: false,
  });
  const seen = useRef<Promise<unknown> | null>(null);
  useEffect(() => {
    seen.current = null;
  }, [ad.data?.viewId]);
  const record = (event: "IMPRESSION" | "CLICK") =>
    apiRequest(`/sponsored/${ad.data!.viewId}/events`, {
      method: "POST",
      auth: false,
      body: { event },
    });
  // La carte arrive au-dessus de l'accueil : elle s'ouvre en poussant le reste en douceur.
  return (
    <Expandable open={Boolean(ad.data)} gap={tokens.spacing.md}>
      {ad.data ? (
        <View
          style={{ gap: tokens.spacing.xs }}
          onLayout={() => {
            if (!seen.current)
              seen.current = record("IMPRESSION").catch(() => undefined);
          }}
        >
          <AppText variant="caption">{t("ads.sponsored")}</AppText>
          <AppText variant="subtitle">{ad.data.title}</AppText>
          <Button
            variant="outline"
            label={ad.data.name}
            onPress={() => {
              void (seen.current ?? record("IMPRESSION"))
                .then(() => record("CLICK"))
                .catch(() => undefined);
              router.push(`/restaurants/${encodeURIComponent(ad.data!.slug)}`);
            }}
          />
        </View>
      ) : null}
    </Expandable>
  );
}
