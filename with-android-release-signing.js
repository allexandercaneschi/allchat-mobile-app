const { withAppBuildGradle, createRunOncePlugin } = require('@expo/config-plugins');

// Signs the release build with the ALLChat keystore. The data comes from environment variables, so
// the keystore and its passwords stay out of the repository (in CI they are secrets):
//   ALLCHAT_KEYSTORE_FILE      absolute path of the .jks file
//   ALLCHAT_KEYSTORE_PASSWORD  keystore password
//   ALLCHAT_KEY_ALIAS          key alias inside the keystore
//   ALLCHAT_KEY_PASSWORD       key password
// Without ALLCHAT_KEYSTORE_FILE the release is signed with the debug key, as Expo does by default,
// so local release builds keep working. Such an APK must not be handed out: it can't update the one
// signed with the real key. The CI workflow checks the signature of the APK it builds.
const MARKER = '// allchat-release-signing';

const RELEASE_SIGNING_CONFIG = `        release {
            ${MARKER}
            def keystoreFile = System.getenv('ALLCHAT_KEYSTORE_FILE')
            if (keystoreFile) {
                storeFile file(keystoreFile)
                storePassword System.getenv('ALLCHAT_KEYSTORE_PASSWORD')
                keyAlias System.getenv('ALLCHAT_KEY_ALIAS')
                keyPassword System.getenv('ALLCHAT_KEY_PASSWORD')
            }
        }
`;

const RELEASE_SIGNING_USE =
  "signingConfig System.getenv('ALLCHAT_KEYSTORE_FILE') ? signingConfigs.release : signingConfigs.debug";

function applyReleaseSigning(contents) {
  if (contents.includes(MARKER)) {
    return contents;
  }

  // 1) New `release` signing config, right after the `debug` one inside `signingConfigs`.
  const signingConfigs = /(signingConfigs\s*\{\s*debug\s*\{[^}]*\}\n)/;
  if (!signingConfigs.test(contents)) {
    throw new Error(
      'with-android-release-signing: bloco signingConfigs.debug não encontrado em android/app/build.gradle. O template do Expo mudou?',
    );
  }
  const withConfig = contents.replace(signingConfigs, `$1${RELEASE_SIGNING_CONFIG}`);

  // 2) The `release` build type stops using the debug key.
  const releaseBuildType =
    /(buildTypes\s*\{[\s\S]*?\brelease\s*\{[^}]*?)signingConfig signingConfigs\.debug/;
  if (!releaseBuildType.test(withConfig)) {
    throw new Error(
      'with-android-release-signing: signingConfig do buildType release não encontrado em android/app/build.gradle. O template do Expo mudou?',
    );
  }
  return withConfig.replace(releaseBuildType, `$1${RELEASE_SIGNING_USE}`);
}

function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, cfg => {
    cfg.modResults.contents = applyReleaseSigning(cfg.modResults.contents);
    return cfg;
  });
}

module.exports = createRunOncePlugin(
  withAndroidReleaseSigning,
  'with-android-release-signing',
  '1.0.0',
);
module.exports.applyReleaseSigning = applyReleaseSigning;
