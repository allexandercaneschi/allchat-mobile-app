/**
 * How long the app can stay in the background before it asks to be unlocked
 * again. Short trips out of the app (the camera, a file picker, a share sheet)
 * stay under it, so attaching a photo does not ask for the fingerprint twice.
 */
export const LOCK_GRACE_MS = 30_000;

type ReturnCheck = {
  enabled: boolean;
  /** When the app went to the background, or null if it did not. */
  backgroundedAt: number | null;
  now: number;
  graceMs?: number;
};

/**
 * Whether coming back to the foreground must lock the app. A clock that moved
 * backwards while the app was away counts as expired, since the elapsed time
 * cannot be trusted.
 */
export const shouldLockOnReturn = ({
  enabled,
  backgroundedAt,
  now,
  graceMs = LOCK_GRACE_MS,
}: ReturnCheck): boolean => {
  if (!enabled || backgroundedAt === null) {
    return false;
  }
  const elapsed = now - backgroundedAt;
  return elapsed < 0 || elapsed >= graceMs;
};
