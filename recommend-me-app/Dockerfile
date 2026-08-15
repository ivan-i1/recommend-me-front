# syntax=docker/dockerfile:1

# Bingepick's web target (react-native-web + webpack) plus the JS-level gates,
# containerised so the app can be run and verified with nothing installed
# locally but Docker.
#
# SCOPE: web + Android. iOS cannot be containerised at all -- there is no Darwin
# container runtime and Xcode is macOS-only. README.md carries the native macOS
# setup for it.
#
#   docker compose up web        -> http://localhost:3005
#   docker compose run --rm test -> jest
#   docker compose run --rm tsc  -> tsc --noEmit
#   docker compose run --rm apk  -> android/app/build/outputs/apk/...


# ---------------------------------------------------------------------------
# deps: resolve node_modules once, on Linux, so the layer caches independently
# of application source. Only the manifests are copied in, so editing App.tsx
# does not re-run the install.
# ---------------------------------------------------------------------------
# node 22 LTS: package.json declares "engines": { "node": ">=20" }, and RN 0.83
# supports 20/22. -slim (Debian) rather than -alpine: the RN toolchain expects
# glibc, and musl is a needless source of native-module surprises.
FROM node:22-slim AS deps

WORKDIR /app

# package-lock.json is committed, so `ci` gives every container an identical
# dependency tree rather than whatever `install` resolves that day.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund


# ---------------------------------------------------------------------------
# dev: the default target. Runs the webpack dev server, and is also the image
# the test/tsc compose services run their commands in.
# ---------------------------------------------------------------------------
FROM node:22-slim AS dev

WORKDIR /app

# NODE_ENV is deliberately NOT set here. Jest only defaults it to "test" when it
# is unset, so baking in "development" silently put React Native into dev-only
# code paths and made three MovieReel tests fail in the container while passing
# on the host. `webpack serve --mode development` sets the bundle's mode itself,
# so nothing needed the variable in the first place.

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3005

# --host 0.0.0.0 lives here and not in webpack.config.js on purpose: inside a
# container the default (localhost) binds only the loopback interface, so the
# published port answers nothing -- but flipping the config's default would
# start advertising a developer's host-machine `npm run web` on their LAN.
CMD ["npx", "webpack", "serve", \
     "--mode", "development", \
     "--config", "webpack.config.js", \
     "--host", "0.0.0.0", \
     "--port", "3005"]


# ---------------------------------------------------------------------------
# android: builds an APK. Carries the JDK, Node and the SDK command-line tools;
# the SDK platform, build-tools and NDK are installed at run time into a named
# volume by docker/android-build.sh -- see that script for why they are not
# baked in here.
# ---------------------------------------------------------------------------
FROM node:22-slim AS android

# JDK 17: android/app/build.gradle pins sourceCompatibility 17 and a Kotlin
# jvmToolchain(17), so a newer JDK is not a drop-in substitute.
# git is here because the React Native Gradle plugin shells out to it.
RUN apt-get update && apt-get install -y --no-install-recommends \
      openjdk-17-jdk-headless \
      unzip \
      curl \
      ca-certificates \
      git \
    && rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 \
    ANDROID_HOME=/opt/android-sdk \
    CMDLINE_TOOLS=/opt/cmdline-tools \
    GRADLE_USER_HOME=/root/.gradle

# The command-line tools are small (~150MB) and change rarely, so unlike the rest
# of the SDK they are worth baking into a cached layer.
ARG CMDLINE_TOOLS_VERSION=13114758
RUN curl -fsSL -o /tmp/tools.zip \
      "https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS_VERSION}_latest.zip" \
    && mkdir -p /opt \
    && unzip -q /tmp/tools.zip -d /opt \
    && rm /tmp/tools.zip \
    && test -x /opt/cmdline-tools/bin/sdkmanager

ENV PATH="${CMDLINE_TOOLS}/bin:${ANDROID_HOME}/platform-tools:${PATH}"

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Invoked through bash rather than executed directly: the compose service bind
# mounts the host checkout over /app, so it is the HOST file that runs and any
# `chmod +x` applied here is invisible at run time. This way the exec bit is
# irrelevant. (It is also set in git, but that is the belt, and this is braces.)
ENTRYPOINT ["bash", "/app/docker/android-build.sh"]
