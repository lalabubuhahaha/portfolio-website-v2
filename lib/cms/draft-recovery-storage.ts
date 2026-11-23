export const RECOVERY_PREFIX = "lala-cms-recovery:v1:";
export const RECOVERY_LIMIT = 250_000;
export const RECOVERY_TTL = 24 * 60 * 60 * 1000;
export const RECOVERY_DELAY = 750;
const maxSnapshots = 12;

export const consentKey = (userId: string) => RECOVERY_PREFIX + "consent:" + userId;
export const snapshotPrefix = (userId: string, projectId: string) =>
  RECOVERY_PREFIX + "draft:" + userId + ":" + projectId + ":";

type Snapshot = { expiresAt: number; raw: string };
export type RecoveryItem = Snapshot & { key: string };
function keys(store: Storage) {
  return Array.from({ length: store.length }, (_, index) => store.key(index) ?? "");
}
function snapshots(store: Storage, now = Date.now()): RecoveryItem[] {
  const items: RecoveryItem[] = [];
  for (const key of keys(store).filter((key) => key.startsWith(RECOVERY_PREFIX + "draft:"))) {
    const raw = store.getItem(key);
    if (!raw || raw.length > RECOVERY_LIMIT * 2) { store.removeItem(key); continue; }
    try {
      const item = JSON.parse(raw) as Snapshot;
      if (!Number.isFinite(item.expiresAt) || item.expiresAt <= now || typeof item.raw !== "string") {
        store.removeItem(key);
      } else items.push({ key, ...item });
    } catch { store.removeItem(key); }
  }
  return items;
}
export function listSnapshots(store: Storage, user: string, project: string, now = Date.now()) {
  return snapshots(store, now).filter(({ key }) => key.startsWith(snapshotPrefix(user, project)))
    .sort((a, b) => b.expiresAt - a.expiresAt);
}
export function writeSnapshot(store: Storage, user: string, key: string, raw: string, now = Date.now()) {
  if (store.getItem(consentKey(user)) !== "enabled") return false;
  if (new TextEncoder().encode(raw).length > RECOVERY_LIMIT) throw new Error("Snapshot too large");
  if (snapshots(store, now).length >= maxSnapshots && store.getItem(key) === null)
    throw new Error("Snapshot limit reached");
  store.setItem(key, JSON.stringify({ expiresAt: now + RECOVERY_TTL, raw }));
  return true;
}
export function disableUserRecovery(store: Storage, user: string) {
  store.removeItem(consentKey(user));
  for (const key of keys(store).filter((key) => key.startsWith(RECOVERY_PREFIX + "draft:" + user + ":")))
    store.removeItem(key);
}
export function clearBrowserRecovery(store: Storage) {
  const all = keys(store).filter((key) => key.startsWith(RECOVERY_PREFIX));
  if (all.some((key) => key.startsWith(RECOVERY_PREFIX + "draft:")) &&
      !window.confirm("Signing out clears browser recovery snapshots on this device. Sign out?")) return false;
  for (const key of all.filter((key) => key.startsWith(RECOVERY_PREFIX + "consent:"))) store.removeItem(key);
  for (const key of all) store.removeItem(key);
  return true;
}
