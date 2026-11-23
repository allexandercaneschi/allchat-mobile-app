const fs = require('fs');
const path = require('path');
const {
  withMainApplication,
  withDangerousMod,
  createRunOncePlugin,
} = require('@expo/config-plugins');

const CHANNEL_ID = 'default';
const CHANNEL_NAME = 'Default';
const MARKER = 'CW-3883 default notification channel';

// ALLChat internal team chat: urgent messages and "call attention" arrive with
// `android.notification.channel_id: "urgent"` and `sound: "urgent"` (see
// InternalChat::PushNotificationService on the server). Android only plays a sound and shows a
// heads-up for a channel that exists, so the app has to create it.
const URGENT_CHANNEL_ID = 'urgent';
const URGENT_CHANNEL_NAME = 'Urgente (chat interno)';
const URGENT_CHANNEL_DESCRIPTION = 'Mensagens urgentes e chamadas de atenção do chat interno';
const URGENT_MARKER = 'ALLChat urgent notification channel';
// res/raw/urgent.wav: the name has to match the `sound` the server sends.
const URGENT_SOUND_SOURCE = path.join('assets', 'sounds', 'urgent.wav');
const URGENT_SOUND_TARGET = path.join('app', 'src', 'main', 'res', 'raw', 'urgent.wav');

const DEFAULT_ANCHOR = 'ApplicationLifecycleDispatcher.onApplicationCreate(this)';

// The manifest meta-data pointing FCM at this channel comes from the
// `messaging_android_notification_channel_id` key in firebase.json, which
// @react-native-firebase reads into its own manifest entry.

const defaultChannelCode = `${DEFAULT_ANCHOR}
    // ${MARKER}
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
      val notificationChannel = android.app.NotificationChannel(
        "${CHANNEL_ID}",
        "${CHANNEL_NAME}",
        android.app.NotificationManager.IMPORTANCE_HIGH
      )
      notificationChannel.enableVibration(true)
      getSystemService(android.app.NotificationManager::class.java)?.createNotificationChannel(notificationChannel)
    }`;

// High importance (heads-up), own sound, long vibration, visible on the lock screen. The sound of a
// channel can not be changed by the app after the channel exists on the device.
const urgentChannelCode = `// ${URGENT_MARKER}
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
      val urgentChannel = android.app.NotificationChannel(
        "${URGENT_CHANNEL_ID}",
        "${URGENT_CHANNEL_NAME}",
        android.app.NotificationManager.IMPORTANCE_HIGH
      )
      urgentChannel.description = "${URGENT_CHANNEL_DESCRIPTION}"
      urgentChannel.enableVibration(true)
      urgentChannel.vibrationPattern = longArrayOf(0, 400, 200, 400, 200, 400)
      urgentChannel.lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
      urgentChannel.setSound(
        android.net.Uri.parse("android.resource://" + packageName + "/raw/urgent"),
        android.media.AudioAttributes.Builder()
          .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION)
          .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
      )
      getSystemService(android.app.NotificationManager::class.java)?.createNotificationChannel(urgentChannel)
    }
    `;

// Pure text transform (so it can be tested): adds each channel once to MainApplication.kt.
function injectChannelCode(contents) {
  let result = contents;
  if (!result.includes(MARKER)) {
    result = result.replace(DEFAULT_ANCHOR, defaultChannelCode);
  }
  if (!result.includes(URGENT_MARKER) && result.includes(`// ${MARKER}`)) {
    result = result.replace(`// ${MARKER}`, `${urgentChannelCode}// ${MARKER}`);
  }
  return result;
}

// notifee is not autolinked on Android, so create the channels with the platform API.
// A high-importance channel with vibration enabled plays the default notification sound and
// vibrates (Android 8+ ties both to the channel; vibration is off unless enabled explicitly).
function withChannelCreation(config) {
  return withMainApplication(config, cfg => {
    if (cfg.modResults.language !== 'kt') {
      return cfg;
    }
    cfg.modResults.contents = injectChannelCode(cfg.modResults.contents);
    return cfg;
  });
}

// Copies the sound of the urgent channel to res/raw (it is also what Android < 8 plays).
function withUrgentSound(config) {
  return withDangerousMod(config, [
    'android',
    async cfg => {
      const source = path.join(cfg.modRequest.projectRoot, URGENT_SOUND_SOURCE);
      const target = path.join(cfg.modRequest.platformProjectRoot, URGENT_SOUND_TARGET);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(source, target);
      return cfg;
    },
  ]);
}

function withAndroidNotificationChannel(config) {
  return withUrgentSound(withChannelCreation(config));
}

const plugin = createRunOncePlugin(
  withAndroidNotificationChannel,
  'with-android-notification-channel',
  '1.1.0',
);

module.exports = plugin;
module.exports.injectChannelCode = injectChannelCode;
