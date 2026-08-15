# syntax=docker/dockerfile:1

# Bingepick's web target (react-native-web + webpack) plus the JS-level gates,
# containerised so the app can be run and verified with nothing installed
# locally but Docker.
#
# SCOPE: web only. Android needs the SDK/NDK/Gradle toolchain, and iOS cannot be
# containerised at all -- there is no Darwin container runtime and Xcode is
# macOS-only. README.md carries the native macOS setup for both.
#
#   docker compose up web        -> http://localhost:3005
#   docker compose run --rm test -> jest
#   docker compose run --rm tsc  -> tsc --noEmit


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
