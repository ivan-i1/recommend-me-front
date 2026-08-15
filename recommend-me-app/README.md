# Bingepick (`recommendmeapp`)

A [React Native](https://reactnative.dev) 0.83 app that runs on iOS, Android and the web
(via [react-native-web](https://necolas.github.io/react-native-web/) + Webpack). Almost the
entire UI lives in `App.tsx`; see [`CLAUDE.md`](./CLAUDE.md) for the architecture.

There are two ways to run it, and they cover different ground:

| | Docker | Native toolchain |
|---|---|---|
| Web app in a browser | ✅ | ✅ |
| `npm test` / `tsc` | ✅ | ✅ |
| Android build (`.apk`) | ❌ | ✅ |
| iOS build / Simulator | ❌ — see below | ✅ (macOS only) |
| Setup effort | Docker only | Xcode + JDK + SDKs + Ruby |

**Docker cannot build or run the iOS app.** There is no Darwin container runtime, and Xcode is
macOS-only and licensed against it. Docker on a Mac runs a Linux VM, so an iOS build is
impossible inside it regardless of configuration. If you need the iOS app, use the
[native macOS setup](#native-macos-setup) below; if you only need to *see and use* the app,
the Docker web target is the fastest route on any host.

---

## Running with Docker

The only prerequisite is Docker (Desktop, or any daemon + `docker compose` v2). Run everything
from this directory — `recommend-me-app/`, not the repository root.

```sh
docker compose up web              # http://localhost:3005
docker compose run --rm test       # jest
docker compose run --rm tsc        # tsc --noEmit
```

First build takes a couple of minutes (one `npm ci` on Linux); afterwards it is cached. Source is
bind-mounted, so edits on the host hot-reload in the browser without a rebuild.

### Configuration

Both are plain environment variables — set them in the shell, or in a `.env` file beside this
README (which is gitignored and excluded from the image).

| Variable | Default | Purpose |
|---|---|---|
| `BACKEND_URL` | `http://188.166.155.92` | Where the dev server proxies `/details` and `/movies`. The API host has moved once already (`:8000` → `:80`), so it is not baked into the image. |
| `WEB_PORT` | `3005` | Host port to publish. Container-side stays 3005. |
| `WATCH_POLL` | `1000` (ms) | Bind mounts routinely drop the inotify events Webpack watches for, so the container polls instead. `0` disables polling. |

```sh
BACKEND_URL=http://10.0.0.5:8000 docker compose up web
```

Outside Docker these are unset, and the config falls back to exactly the values it always had —
`npm run web` on a host machine is unaffected by any of this.

### Notes and limits

- **`test` and `tsc` sit behind a `tools` profile**, so a bare `docker compose up` starts the app
  and nothing else. `docker compose run` activates the profile by itself.
- **Dependencies live in an anonymous volume.** The bind mount would otherwise cover the image's
  Linux-built `node_modules` with the host's (macOS-built) tree. The cost is that after changing
  `package.json` you must clear it: `docker compose down -v && docker compose build`.
- **Files the container writes into the bind mount are owned by root on Linux hosts.** Docker
  Desktop on macOS remaps ownership, so this only bites on Linux.
- The image covers the web target only. Native sources are kept in the build context so an
  Android stage could be added later, but no such stage exists today.

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
