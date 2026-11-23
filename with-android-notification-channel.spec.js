const { injectChannelCode } = require('./with-android-notification-channel');

const MAIN_APPLICATION = `class MainApplication : Application(), ReactApplication {
  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, OpenSourceMergedSoMapping)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }
}`;

const countOf = (text, part) => text.split(part).length - 1;

describe('with-android-notification-channel', () => {
  it('creates the default and the urgent channels', () => {
    const result = injectChannelCode(MAIN_APPLICATION);
    expect(result).toContain('"default"');
    expect(result).toContain('"urgent"');
    expect(result).toContain('/raw/urgent');
  });

  it('gives the urgent channel high importance, vibration and its own sound', () => {
    const result = injectChannelCode(MAIN_APPLICATION);
    const urgent = result.slice(result.indexOf('ALLChat urgent notification channel'));
    expect(urgent).toContain('IMPORTANCE_HIGH');
    expect(urgent).toContain('enableVibration(true)');
    expect(urgent).toContain('setSound(');
  });

  it('keeps the lifecycle call and puts the channel code after it', () => {
    const result = injectChannelCode(MAIN_APPLICATION);
    expect(result.indexOf('onApplicationCreate(this)')).toBeLessThan(result.indexOf('"urgent"'));
  });

  it('is idempotent', () => {
    const once = injectChannelCode(MAIN_APPLICATION);
    expect(injectChannelCode(once)).toBe(once);
    expect(countOf(once, 'createNotificationChannel(urgentChannel)')).toBe(1);
    expect(countOf(once, 'createNotificationChannel(notificationChannel)')).toBe(1);
  });

  it('adds only the urgent channel to an app that already has the default one', () => {
    const onlyDefault = MAIN_APPLICATION.replace(
      'ApplicationLifecycleDispatcher.onApplicationCreate(this)',
      `ApplicationLifecycleDispatcher.onApplicationCreate(this)
    // CW-3883 default notification channel
    val old = 1`,
    );
    const result = injectChannelCode(onlyDefault);
    expect(countOf(result, 'CW-3883 default notification channel')).toBe(1);
    expect(result).toContain('"urgent"');
    expect(result).toContain('val old = 1');
  });
});
