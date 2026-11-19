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
// up as a solid square. The accent color tints it in the notification shade. It is declared in
// the app manifest (overriding the library's default) and not in firebase.json: the library's
// own resource check cannot see a color that only exists in the app and fails the release build.
const ICON_NAME = 'notification_icon';
const COLOR_NAME = 'notification_accent';
const ACCENT = '#35A8E0';
const SOURCE_DIR = 'assets/notification-icon';
const ICON_META = 'com.google.firebase.messaging.default_notification_icon';
const COLOR_META = 'com.google.firebase.messaging.default_notification_color';

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

function applyNotificationMetaData(manifest) {
  AndroidConfig.Manifest.ensureToolsAvailable(manifest);
  const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
  AndroidConfig.Manifest.addMetaDataItemToMainApplication(
    application,
    ICON_META,
    `@drawable/${ICON_NAME}`,
    'resource',
  );
  AndroidConfig.Manifest.addMetaDataItemToMainApplication(
    application,
    COLOR_META,
    `@color/${COLOR_NAME}`,
    'resource',
  );
  // The messaging library declares this same entry with its own default; ours must win the merge.
  const colorItem = application['meta-data'].find(item => item.$['android:name'] === COLOR_META);
  colorItem.$['tools:replace'] = 'android:resource';
  return manifest;
}

function withIconMetaData(config) {
  return withAndroidManifest(config, cfg => {
    cfg.modResults = applyNotificationMetaData(cfg.modResults);
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

module.exports.applyNotificationMetaData = applyNotificationMetaData;
