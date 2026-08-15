#!/usr/bin/env bash
#
# Builds an Android APK inside the container.
#
# The SDK components (platform, build-tools, NDK) are NOT baked into the image.
# They land in a named volume mounted at $ANDROID_HOME, because together they are
# several GB: in an image layer that weight is stored twice while building (layer
# + build cache), and it can only be reclaimed by deleting the image. In a volume
# it is stored once and `docker volume rm bingepick-android-sdk` gets it all back.
#
set -euo pipefail

ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
CMDLINE_TOOLS="${CMDLINE_TOOLS:-/opt/cmdline-tools}"
SDKMANAGER="$CMDLINE_TOOLS/bin/sdkmanager"

# Defaults mirror android/build.gradle. Overriding them here rather than editing
# gradle files keeps the container's choices out of everyone else's builds.
COMPILE_SDK="${ANDROID_COMPILE_SDK:-36}"
BUILD_TOOLS="${ANDROID_BUILD_TOOLS:-36.0.0}"
NDK_VERSION="${ANDROID_NDK_VERSION:-27.1.12297006}"
VARIANT="${ANDROID_VARIANT:-Release}"
ABIS="${ANDROID_ABIS:-arm64-v8a,x86_64}"

echo "==> Variant=$VARIANT  ABIs=$ABIS  SDK=$COMPILE_SDK  NDK=${NDK_VERSION:-<none>}"

# ---------------------------------------------------------------------------
# SDK packages. sdkmanager is idempotent, so this is a no-op on later runs; the
# first run is the slow one because it downloads.
# ---------------------------------------------------------------------------
mkdir -p "$ANDROID_HOME"

packages=(
  "platform-tools"
  "platforms;android-${COMPILE_SDK}"
  "build-tools;${BUILD_TOOLS}"
)
# The New Architecture (newArchEnabled=true) compiles C++ from the RN libraries,
# so the NDK is required. ANDROID_NDK_VERSION="" skips it deliberately.
if [ -n "$NDK_VERSION" ]; then
  packages+=("ndk;${NDK_VERSION}")
fi

echo "==> Accepting SDK licences"
yes | "$SDKMANAGER" --sdk_root="$ANDROID_HOME" --licenses > /dev/null 2>&1 || true

echo "==> Installing: ${packages[*]}"
"$SDKMANAGER" --sdk_root="$ANDROID_HOME" "${packages[@]}"

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
# A release APK is signed with android/app/release.keystore, which is NOT in git
# (only debug.keystore is). Fail with a useful message instead of a Gradle stack
# trace forty lines deep.
# The SDK location comes from $ANDROID_HOME. android/local.properties is excluded
# by .dockerignore so it should not exist in here at all -- but Gradle reads its
# sdk.dir in PREFERENCE to $ANDROID_HOME, so if one ever appears (someone adds a
# bind mount) it would silently point the build at a host path. Refuse rather
# than guess, and never rewrite it: on a bind mount that is the host's own file.
if [ -f /app/android/local.properties ] \
   && ! grep -qx "sdk.dir=${ANDROID_HOME}" /app/android/local.properties; then
  echo "ERROR: /app/android/local.properties exists and does not point at $ANDROID_HOME." >&2
  echo "       Gradle prefers it over \$ANDROID_HOME, so this build would use a path" >&2
  echo "       that does not exist in the container. The apk service must not" >&2
  echo "       bind-mount the checkout -- see docker-compose.yml." >&2
  exit 1
fi

if [ "$VARIANT" = "Release" ] && [ ! -f /app/android/app/release.keystore ]; then
  echo "ERROR: android/app/release.keystore is missing." >&2
  echo "       It is untracked, so a fresh clone will not have it. Either supply it," >&2
  echo "       or build the debug variant: ANDROID_VARIANT=Debug docker compose run --rm apk" >&2
  echo "       (note a debug APK bundles no JS and needs Metro running to launch)." >&2
  exit 1
fi

cd /app/android

echo "==> gradlew assemble${VARIANT}"
./gradlew "assemble${VARIANT}" \
  -PreactNativeArchitectures="$ABIS" \
  --no-daemon \
  "$@"

# Gradle's output dir is a volume, so copy the artefacts into the one bind-mounted
# directory to get them onto the host.
mkdir -p /app/dist-apk
mapfile -t apks < <(find /app/android/app/build/outputs/apk -name '*.apk' 2>/dev/null)

if [ ${#apks[@]} -eq 0 ]; then
  echo "ERROR: Gradle reported success but produced no APK." >&2
  exit 1
fi

cp -f "${apks[@]}" /app/dist-apk/

echo
echo "==> APKs written to dist-apk/ :"
ls -lh /app/dist-apk/*.apk
