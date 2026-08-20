# Publishing Noctis

Theme plugins are uploaded to [JetBrains Marketplace](https://plugins.jetbrains.com). The first listing must be created in the browser; later versions can use Gradle.

## Before you upload

1. Run `./gradlew buildPlugin` and install the ZIP from disk in your licensed WebStorm.
2. Capture Marketplace screenshots **in WebStorm** (do not reuse the VS Code gallery images). Suggested set:
   - Noctis Islands with `samples/preview.ts` open
   - Noctis Azureus Islands
   - Noctis Bordo Islands
   - Noctis Lux Islands (light)
   - One Classic variant so reviewers see both looks
3. Put PNG/JPEG files in [`docs/screenshots/`](screenshots/).
4. Confirm plugin identity:
   - ID: `com.manvendrask.noctis.jetbrains` (immutable after the first upload)
   - Name: **Noctis**
   - License: MIT
   - `since-build`: `253` (2025.3)

## First upload (manual)

1. Sign in at [https://plugins.jetbrains.com](https://plugins.jetbrains.com) with your JetBrains Account.
2. **Upload plugin** and attach `build/distributions/noctis-jetbrains-1.0.0.zip` (filename may include the plugin name).
3. Fill vendor, license, repository URL, and description. Paste screenshots.
4. Submit for review. Review often takes a few days.

## Later versions (Gradle)

Create a [Marketplace permanent token](https://plugins.jetbrains.com/author/me/tokens) and export it:

```bash
export PUBLISH_TOKEN="perm:…"
./gradlew publishPlugin
```

`build.gradle.kts` already reads `PUBLISH_TOKEN`. Do not commit the token.

Optional plugin signing (avoids an install warning) is documented at [Plugin Signing](https://plugins.jetbrains.com/docs/intellij/plugin-signing.html). Configure `CERTIFICATE_CHAIN`, `PRIVATE_KEY`, and `PRIVATE_KEY_PASSWORD` if you add a `signing {}` block later.

## Bumping a release

1. Edit `pluginVersion` in `gradle.properties`.
2. Add notes to `CHANGELOG.md` (and regenerate `plugin.xml` change-notes in `tools/generate.mjs` if you keep them in sync).
3. `./gradlew buildPlugin` then `./gradlew publishPlugin`.
