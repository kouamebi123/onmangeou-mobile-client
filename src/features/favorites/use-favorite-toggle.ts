import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { addFavorite, removeFavorite, type RestaurantDetail, type RestaurantSummary } from '@/api/discovery';
import { ApiError } from '@/api/envelope';
import { hapticLight } from '@/feedback/haptics';
import { useAuthStore } from '@/store/auth-store';

function patchFavoriteCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  restaurant: Pick<RestaurantSummary, 'id' | 'slug'>,
  isFavorite: boolean,
) {
  queryClient.setQueryData<RestaurantDetail>(['restaurant', restaurant.slug], (current) =>
    current ? { ...current, isFavorite } : current,
  );

  queryClient.setQueriesData<{ items: RestaurantSummary[]; nextCursor: string | null }>(
    { queryKey: ['discovery'] },
    (current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        items: current.items.map((item) => (item.id === restaurant.id ? { ...item, isFavorite } : item)),
      };
    },
  );

  queryClient.setQueryData<RestaurantSummary[]>(['favorites'], (current) => {
    if (!current) {
      return current;
    }
    if (!isFavorite) {
      return current.filter((item) => item.id !== restaurant.id);
    }
    if (current.some((item) => item.id === restaurant.id)) {
      return current.map((item) => (item.id === restaurant.id ? { ...item, isFavorite: true } : item));
    }
    return current;
  });
}

export function useFavoriteToggle(restaurant: Pick<RestaurantSummary, 'id' | 'slug' | 'isFavorite'>) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);

  const mutation = useMutation({
    mutationFn: async (nextFavorite: boolean) => {
      if (nextFavorite) {
        await addFavorite(restaurant.id);
      } else {
        await removeFavorite(restaurant.id);
      }
    },
    onMutate: async (nextFavorite) => {
      await queryClient.cancelQueries({ queryKey: ['restaurant', restaurant.slug] });
      await queryClient.cancelQueries({ queryKey: ['favorites'] });
      await queryClient.cancelQueries({ queryKey: ['discovery'] });
      const previousDetail = queryClient.getQueryData<RestaurantDetail>(['restaurant', restaurant.slug]);
      const previousFavorites = queryClient.getQueryData<RestaurantSummary[]>(['favorites']);
      patchFavoriteCaches(queryClient, restaurant, nextFavorite);
      return { previousDetail, previousFavorites };
    },
    onError: (error, _next, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(['restaurant', restaurant.slug], context.previousDetail);
      }
      if (context?.previousFavorites) {
        queryClient.setQueryData(['favorites'], context.previousFavorites);
      }
      if (error instanceof ApiError && error.problem.status === 401) {
        router.push('/auth');
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['restaurant', restaurant.slug] });
      void queryClient.invalidateQueries({ queryKey: ['favorites'] });
      void queryClient.invalidateQueries({ queryKey: ['discovery'] });
    },
  });

  return {
    toggle: () => {
      if (!accessToken) {
        router.push('/auth');
        return;
      }
      if (mutation.isPending) {
        return;
      }
      hapticLight();
      mutation.mutate(!restaurant.isFavorite);
    },
    pending: mutation.isPending,
  };
}
