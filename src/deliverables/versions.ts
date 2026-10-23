import type { Deliverable } from "@/domain/models";
export function isOutdated(
  deliverable: Deliverable,
  currentMapVersion: number,
) {
  return deliverable.mapVersion !== currentMapVersion;
}
