import { LOCK_GRACE_MS, shouldLockOnReturn } from '../appLock';

describe('shouldLockOnReturn', () => {
  const base = { enabled: true, backgroundedAt: 1_000_000 };

  it('does not lock when the option is off', () => {
    expect(
      shouldLockOnReturn({
        ...base,
        enabled: false,
        now: base.backgroundedAt + LOCK_GRACE_MS * 10,
      }),
    ).toBe(false);
  });

  it('does not lock when the app never went to the background', () => {
    expect(shouldLockOnReturn({ enabled: true, backgroundedAt: null, now: 5_000_000 })).toBe(false);
  });

  it('keeps the app open for a short trip out of it', () => {
    expect(shouldLockOnReturn({ ...base, now: base.backgroundedAt + LOCK_GRACE_MS - 1 })).toBe(
      false,
    );
  });

  it('locks once the grace period is over', () => {
    expect(shouldLockOnReturn({ ...base, now: base.backgroundedAt + LOCK_GRACE_MS })).toBe(true);
  });

  it('locks when the clock went backwards', () => {
    expect(shouldLockOnReturn({ ...base, now: base.backgroundedAt - 1 })).toBe(true);
  });

  it('honours a custom grace period', () => {
    expect(shouldLockOnReturn({ ...base, now: base.backgroundedAt + 5_000, graceMs: 5_000 })).toBe(
      true,
    );
  });
});
