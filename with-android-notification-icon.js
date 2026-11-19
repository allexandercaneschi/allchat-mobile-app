const fs = require('fs');
const path = require('path');
const {
  withAndroidManifest,
  withAndroidColors,
  withDangerousMod,
  AndroidConfig,
  createRunOncePlugin,
} = require('@expo/config-plugins');

// Small status-bar icon for push notifications. Android draws it using only the alpha channel,
// so it has to be a white silhouette on a transparent background; the launcher icon would show
// up as a solid square. The accent color (read by @react-native-firebase/messaging through
// `messaging_android_notification_color` in firebase.json) tints it in the notification shade.
const ICON_NAME = 'notification_icon';
const COLOR_NAME = 'notification_accent';
const ACCENT = '#35A8E0';
const SOURCE_DIR = 'assets/notification-icon';
const ICON_META = 'com.google.firebase.messaging.default_notification_icon';

function withIconFiles(config) {
  return withDangerousMod(config, [
    'android',
    async cfg => {
      const { projectRoot, platformProjectRoot } = cfg.modRequest;
      const sourceRoot = path.join(projectRoot, SOURCE_DIR);
      for (const density of fs.readdirSync(sourceRoot)) {
        const from = path.join(sourceRoot, density, `${ICON_NAME}.png`);
        if (!fs.existsSync(from)) {
          continue;
        }
        const targetDir = path.join(platformProjectRoot, 'app/src/main/res', density);
        fs.mkdirSync(targetDir, { recursive: true });
        fs.copyFileSync(from, path.join(targetDir, `${ICON_NAME}.png`));
      }
      return cfg;
    },
  ]);
}

function withAccentColor(config) {
  return withAndroidColors(config, cfg => {
    cfg.modResults = AndroidConfig.Colors.assignColorValue(cfg.modResults, {
      name: COLOR_NAME,
      value: ACCENT,
    });
    return cfg;
  });
}

function withIconMetaData(config) {
  return withAndroidManifest(config, cfg => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      application,
      ICON_META,
      `@drawable/${ICON_NAME}`,
      'resource',
    );
    return cfg;
  });
}

function withAndroidNotificationIcon(config) {
  return withIconMetaData(withAccentColor(withIconFiles(config)));
}

module.exports = createRunOncePlugin(
  withAndroidNotificationIcon,
  'with-android-notification-icon',
  '1.0.0',
);
