const { applyNotificationMetaData } = require('./with-android-notification-icon');

const manifest = () => ({
  manifest: {
    $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
    application: [{ $: { 'android:name': '.MainApplication' }, activity: [] }],
  },
});

const metaData = (result, name) =>
  result.manifest.application[0]['meta-data'].find(item => item.$['android:name'] === name);

describe('applyNotificationMetaData', () => {
  it('points the notification icon and accent color at the app resources', () => {
    const result = applyNotificationMetaData(manifest());

    expect(metaData(result, 'com.google.firebase.messaging.default_notification_icon').$).toEqual({
      'android:name': 'com.google.firebase.messaging.default_notification_icon',
      'android:resource': '@drawable/notification_icon',
    });
    expect(
      metaData(result, 'com.google.firebase.messaging.default_notification_color').$[
        'android:resource'
      ],
    ).toBe('@color/notification_accent');
  });

  it('makes the app color override the messaging library default when manifests merge', () => {
    const result = applyNotificationMetaData(manifest());

    expect(result.manifest.$['xmlns:tools']).toBe('http://schemas.android.com/tools');
    expect(
      metaData(result, 'com.google.firebase.messaging.default_notification_color').$[
        'tools:replace'
      ],
    ).toBe('android:resource');
  });

  it('is idempotent', () => {
    const once = applyNotificationMetaData(manifest());
    const twice = applyNotificationMetaData(once);

    expect(twice.manifest.application[0]['meta-data']).toHaveLength(2);
  });
});
