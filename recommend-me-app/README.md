# Bingepick (`recommendmeapp`)

A [React Native](https://reactnative.dev) 0.83 app that runs on iOS, Android and the web
(via [react-native-web](https://necolas.github.io/react-native-web/) + Webpack). Almost the
entire UI lives in `App.tsx`; see [`CLAUDE.md`](./CLAUDE.md) for the architecture.

There are two ways to run it, and they cover different ground:

| | Docker | Native toolchain |
|---|---|---|
| Web app in a browser | ✅ | ✅ |
| `npm test` / `tsc` | ✅ | ✅ |
| Android build (`.apk`) | ✅ | ✅ |
| Android emulator | ❌ | ✅ |
| iOS build / Simulator | ❌ — see below | ✅ (macOS only) |
| Setup effort | Docker only | Xcode + JDK + SDKs + Ruby |

**Docker cannot build or run the iOS app.** There is no Darwin container runtime, and Xcode is
macOS-only and licensed against it. Docker on a Mac runs a Linux VM, so an iOS build is
impossible inside it regardless of configuration. If you need the iOS app, use the
[native macOS setup](#native-macos-setup) below; if you only need to *see and use* the app,
the Docker web target is the fastest route on any host.

Android is different: the container **builds** an APK, it just cannot **run** one. Emulators need
KVM, which Docker Desktop on macOS does not expose, so install the APK on a real device or on an
emulator running on your host.

---

## Running with Docker

The only prerequisite is Docker (Desktop, or any daemon + `docker compose` v2). Run everything
from this directory — `recommend-me-app/`, not the repository root.

```sh
docker compose up web              # http://localhost:3005
docker compose run --rm test       # jest
docker compose run --rm tsc        # tsc --noEmit
docker compose run --rm apk        # Android APK
```

First web build takes a couple of minutes (one `npm ci` on Linux); afterwards it is cached. Source
is bind-mounted, so edits on the host hot-reload in the browser without a rebuild. The APK build is
much heavier — see [Building the APK](#building-the-apk).

### Configuration

All plain environment variables — set them in the shell, or in a `.env` file beside this README
(which is gitignored and excluded from the image).

| Variable | Default | Purpose |
|---|---|---|
| `BACKEND_URL` | `http://188.166.155.92` | Where the dev server proxies `/details` and `/movies`. The API host has moved once already (`:8000` → `:80`), so it is not baked into the image. |
| `WEB_PORT` | `3005` | Host port to publish. Container-side stays 3005. |
| `WATCH_POLL` | `1000` (ms) | Bind mounts routinely drop the inotify events Webpack watches for, so the container polls instead. `0` disables polling. |
| `ANDROID_VARIANT` | `Release` | `Release` or `Debug`. |
| `ANDROID_ABIS` | `arm64-v8a,x86_64` | Which native ABIs to compile. The single biggest build-time knob. |
| `ANDROID_NDK_VERSION` | `27.1.12297006` | Set to empty to skip the ~2.5 GB NDK install. |

```sh
BACKEND_URL=http://10.0.0.5:8000 docker compose up web
ANDROID_ABIS=arm64-v8a docker compose run --rm apk
```

Outside Docker these are unset, and the config falls back to exactly the values it always had —
`npm run web` on a host machine is unaffected by any of this.

### Building the APK

```sh
docker compose run --rm --build apk
# -> dist-apk/app-release.apk
```

**`--build` matters.** Unlike the other services, this one does **not** bind-mount your checkout,
so it builds whatever source is in the image — `--build` refreshes that. The reason is that your
`android/build` holds a Gradle autolinking cache recording absolute macOS paths; mounted into
Linux it makes the build fail configuring `:react-native-svg` against a directory that doesn't
exist there. Building from the image sidesteps it entirely and leaves your host's Android build
state alone. The finished APK is copied to `dist-apk/` (gitignored), which is the one directory
mounted back to the host.

**Budget for it.** Measured on an Intel Mac, two ABIs, Docker Desktop:

| | Time | Gradle tasks |
|---|---|---|
| First run (downloads SDK + NDK, full compile) | ~12 min | 245 executed |
| Later runs | ~5 min | 172 executed, 73 up-to-date |

Expect several GB of disk. Later runs are quicker mostly because the SDK, NDK and Gradle
distribution are already in volumes — the build is only **partially** incremental, since the React
Native codegen and native-compile tasks re-run each time. `ANDROID_ABIS=arm64-v8a` cuts the native
compile substantially if you only need real devices.

**Release needs a keystore.** `android/app/build.gradle` signs release builds with
`android/app/release.keystore`, which is **not** in git — only `debug.keystore` is. If you cloned
fresh you will not have it, and the build stops with a message saying so. Either supply the
keystore or build `ANDROID_VARIANT=Debug` — but note a debug APK contains no JS bundle and will not
launch without Metro reachable from the device.

**Docker builds the APK; it cannot run it.** Emulators need KVM, which Docker Desktop on macOS does
not provide. Install the output on a real device (`adb install <path>`) or on an emulator running
on your host.

**Reclaiming the space.** The SDK and Gradle caches live in named volumes rather than image layers,
precisely so you can get the disk back without rebuilding anything:

```sh
docker volume rm bingepick-android-sdk bingepick-gradle-cache \
                 bingepick-android-dot-gradle bingepick-android-build \
                 bingepick-android-app-build
```

### Notes and limits

- **Everything but `web` sits behind a profile** (`tools` for test/tsc, `android` for apk), so a
  bare `docker compose up` starts the app and nothing else. `docker compose run` activates the
  profile by itself.
- **Dependencies live in an anonymous volume.** The bind mount would otherwise cover the image's
  Linux-built `node_modules` with the host's (macOS-built) tree. The cost is that after changing
  `package.json` you must clear it: `docker compose down -v && docker compose build`.
- **Files the container writes into the bind mount are owned by root on Linux hosts.** Docker
  Desktop on macOS remaps ownership, so this only bites on Linux.
- **The `apk` service does not bind-mount the checkout**, unlike the others — see
  [Building the APK](#building-the-apk). Your `npm run android`, your `android/build` and your
  `android/local.properties` are all untouched by it.

---

## Native macOS setup

Everything below is required to run the app on the iOS Simulator (`npm run ios`). Versions in
parentheses are what this project is known to build with, not hard floors unless stated.

### 1. Xcode

```sh
xcode-select --install                      # Command Line Tools
sudo xcodebuild -license accept
xcode-select -p                             # must print .../Xcode.app/Contents/Developer
```

Install Xcode from the App Store first (**26.2** verified). If `xcode-select -p` points at
`/Library/Developer/CommandLineTools`, repoint it:

```sh
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

Then open Xcode once to let it finish installing components, and add an iOS Simulator runtime
under **Xcode ▸ Settings ▸ Components**. The deployment target is **iOS 15.1** (React Native
0.83's `min_ios_version_supported`), so any runtime at or above that works.

### 2. Node

**Node ≥ 20 is required** (`package.json` → `engines`). Install via
[nvm](https://github.com/nvm-sh/nvm) or `brew install node@22`.

### 3. Watchman

```sh
brew install watchman
```

⚠️ **Repo-specific gotcha:** this repository lives under `~/Documents`, which macOS protects with
TCC. Watchman will fail with `Operation not permitted` unless its daemon was started from a
process that has Documents access. Fix either way:

```sh
watchman shutdown-server && watchman watch-project .   # restart from a capable shell
```

or grant your terminal/IDE **Full Disk Access** in System Settings ▸ Privacy & Security. Do **not**
add `node_modules` to `.watchmanconfig` — it breaks Metro's module resolution.

### 4. Ruby and CocoaPods

CocoaPods is installed through Bundler, not globally, so everyone gets the pinned versions
(`Gemfile` excludes the CocoaPods releases that break RN builds). System Ruby works
(**3.3.10** verified; the `Gemfile` requires ≥ 2.6.10).

```sh
bundle install                # installs into vendor/bundle, per .bundle/config
```

### 5. JavaScript dependencies

```sh
npm install
```

### 6. Pods

Run after the first clone and after any change to native dependencies:

```sh
bundle exec pod install --project-directory=ios
```

### 7. Run it

```sh
npm start        # Metro, in one terminal
npm run ios      # build + launch the Simulator, in another
```

`npm run ios -- --simulator="iPhone 16"` picks a specific device. Alternatively open
`ios/RecommendMeApp.xcworkspace` in Xcode and run from there — **the `.xcworkspace`, never the
`.xcodeproj`**, or the Pods will not be linked.

#### If the build cannot find Node

`ios/.xcode.env` resolves Node with `command -v node`, which is empty inside Xcode's build
environment when Node comes from nvm. Pin it explicitly (this file is gitignored):

```sh
echo "export NODE_BINARY=$(command -v node)" > ios/.xcode.env.local
```

### Android (also native-only)

```sh
brew install --cask zulu@17        # JDK 17; Zulu 17.0.19 verified
```

Install Android Studio, then via **SDK Manager** add: **SDK Platform 36**, **Build Tools 36.0.0**,
and **NDK 27.1.12297006** (the exact versions in `android/build.gradle`; the NDK is required
because `newArchEnabled=true`). Then point Gradle at the SDK — `android/local.properties` is
gitignored, so a fresh clone has none:

```sh
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
export ANDROID_HOME=$HOME/Library/Android/sdk
npm run android
```

Gradle 9.0.0 comes from the committed wrapper; do not install it separately.

---

## Everyday commands

| Command | What it does |
|---|---|
| `npm start` | Metro bundler (native only) |
| `npm run ios` / `npm run android` | Build and launch on a simulator/emulator or device |
| `npm run web` | Webpack dev server on **:3005**, proxying the API |
| `npm test` | Jest suite |
| `npx jest MovieReel` | A single suite |
| `npx jest -t 'loops'` | A single test by name |
| `npx tsc --noEmit` | Typecheck — clean, and a real pass/fail gate |
| ~~`npm run lint`~~ | **Broken.** ESLint crashes while loading its config *and still exits 0*, so it reports a false pass. Use `npx tsc --noEmit` + `npm test` as the gates instead. |

Edit `App.tsx` and save — Fast Refresh applies the change live. For a full reload: **R** twice on
Android, **R** in the iOS Simulator, or just refresh the browser tab on web.

## Troubleshooting

Start with React Native's [troubleshooting page](https://reactnative.dev/docs/troubleshooting) and
the [environment setup guide](https://reactnative.dev/docs/set-up-your-environment). For anything
specific to this codebase, see [`CLAUDE.md`](./CLAUDE.md).
