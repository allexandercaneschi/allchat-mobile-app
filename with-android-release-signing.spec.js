const { applyReleaseSigning } = require('./with-android-release-signing');

// Trecho do android/app/build.gradle gerado pelo prebuild do Expo.
const GENERATED_GRADLE = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            signingConfig signingConfigs.debug
            minifyEnabled enableMinifyInReleaseBuilds
        }
    }
}
`;

describe('applyReleaseSigning', () => {
  it('cria a assinatura release lendo o keystore das variáveis de ambiente', () => {
    const result = applyReleaseSigning(GENERATED_GRADLE);

    expect(result).toContain("System.getenv('ALLCHAT_KEYSTORE_FILE')");
    expect(result).toContain("System.getenv('ALLCHAT_KEYSTORE_PASSWORD')");
    expect(result).toContain("System.getenv('ALLCHAT_KEY_ALIAS')");
    expect(result).toContain("System.getenv('ALLCHAT_KEY_PASSWORD')");
  });

  it('usa a chave release só no buildType release e mantém a debug no debug', () => {
    const result = applyReleaseSigning(GENERATED_GRADLE);
    const [debugBuildType, releaseBuildType] = result.split('release {\n            // Caution');

    expect(debugBuildType).toContain('debug {\n            signingConfig signingConfigs.debug');
    expect(releaseBuildType).toContain('signingConfigs.release : signingConfigs.debug');
    expect(releaseBuildType).not.toMatch(/signingConfig signingConfigs\.debug/);
  });

  it('não altera um arquivo que já foi ajustado', () => {
    const once = applyReleaseSigning(GENERATED_GRADLE);

    expect(applyReleaseSigning(once)).toBe(once);
  });

  it('falha de forma clara quando o template do Expo muda', () => {
    expect(() => applyReleaseSigning('android { }')).toThrow('signingConfigs.debug não encontrado');
    expect(() =>
      applyReleaseSigning(
        "android { signingConfigs { debug {\n storeFile file('x')\n }\n } buildTypes { release { } } }",
      ),
    ).toThrow('signingConfig do buildType release não encontrado');
  });
});
