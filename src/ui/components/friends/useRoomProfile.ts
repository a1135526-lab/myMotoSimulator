import { useMemo } from 'react';
import { useAuthStore, useCurrentBike, type RoomProfile } from '@/application';

/** You, as a friend room would know you: nickname and the garage bike. */
export function useRoomProfile(): RoomProfile {
  const bike = useCurrentBike();
  const nickname = useAuthStore((s) => s.nickname);
  return useMemo(
    () => ({
      name: nickname ?? '玩家',
      bike: `${bike.brand} ${bike.model}`,
      manual: bike.kind === 'manual',
      cylinders: bike.engine.cylinders,
      ...(nickname && { accountName: nickname }),
    }),
    [bike, nickname],
  );
}
