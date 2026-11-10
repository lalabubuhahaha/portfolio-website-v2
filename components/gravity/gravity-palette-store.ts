"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_HERO_PALETTE, type HeroPaletteId } from "./gravity-palettes";
let selected: HeroPaletteId = DEFAULT_HERO_PALETTE;
const listeners = new Set<() => void>();
export function getSelectedPalette() {
  return selected;
}
export function selectHeroPalette(id: HeroPaletteId) {
  if (id === selected) return;
  selected = id;
  for (const listener of listeners) listener();
}
export function subscribeHeroPalette(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function useHeroPalette() {
  return useSyncExternalStore(
    subscribeHeroPalette,
    getSelectedPalette,
    () => DEFAULT_HERO_PALETTE,
  );
}
