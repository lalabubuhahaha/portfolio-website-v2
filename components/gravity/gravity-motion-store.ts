"use client";
import { useSyncExternalStore } from "react";
export type MotionPreference = "auto" | "full" | "static";
let preference: MotionPreference = "auto";
const listeners = new Set<() => void>();
export const getMotionPreference = () => preference;
export function selectMotionPreference(next: MotionPreference) {
  if (next === preference) return;
  preference = next;
  listeners.forEach((listener) => listener());
}
export function subscribeMotionPreference(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function useMotionPreference() {
  return useSyncExternalStore(
    subscribeMotionPreference,
    getMotionPreference,
    () => "auto" as const,
  );
}
