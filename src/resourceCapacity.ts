import type { ResourceCapacity, UserId } from "./types";

export const resourceCapacityMd = (capacities: readonly ResourceCapacity[] | undefined, userId: UserId, date: string): number =>
  capacities?.find((capacity) => capacity.userId === userId && capacity.date === date)?.md ?? 1;
