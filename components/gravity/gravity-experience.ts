export function createGravityExperience() {
  let status: "loading" | "ready" | "unavailable" = "loading";
  let finished = false;
  let entrance: (() => void) | undefined;
  const listeners = new Set<() => void>();
  return {
    begin() {
      status = "loading";
      finished = false;
      entrance = undefined;
    },
    getStatus: () => status,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    report(next: "ready" | "unavailable") {
      status = next;
      listeners.forEach((listener) => listener());
    },
    register(start: () => void) {
      entrance = start;
      if (finished) start();
      return () => {
        if (entrance === start) entrance = undefined;
      };
    },
    finish() {
      if (finished) return;
      finished = true;
      entrance?.();
    },
  };
}
export type GravityExperience = ReturnType<typeof createGravityExperience>;
