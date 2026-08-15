# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Bingepick (package name `recommendmeapp`) — a React Native 0.83 / React 19 app where the
user picks movies off a spotlight "reel"; each pick refines a 43-dimensional recommendation
vector that drives the next batch. Ships to **iOS, Android, and web** from one codebase
(web via react-native-web + Webpack).

## Commands

Run from `recommend-me-app/` (the actual project root; the parent `recommend-me-front/`
also contains an unrelated `MovieEndpointTest/`).

```sh
npm start                    # Metro bundler (native)
npm run android              # build + run Android
npm run ios                  # build + run iOS (first run: bundle install && bundle exec pod install)
npm run web                  # webpack dev server on http://localhost:3005
npm test                     # jest (9 suites / 47 tests)
npx jest MovieReel           # run a single test file by name pattern
npx jest -t 'loops'          # run a single test by name
npx tsc --noEmit             # typecheck (no npm script for it)
```

**`npm run lint` is broken** — eslint 8 crashes at config load
(`TypeError: Cannot set properties of undefined (setting 'defaultMeta')` from
`@eslint/eslintrc` + ajv, despite the `overrides` block in `package.json`) and still exits 0,
so it silently proves nothing. Use `npx tsc --noEmit` as the static gate instead. It is now
**clean and binary** — zero output, exit 0. (It used to emit a permanent
`tsconfig.json(2,3): error TS5095` and exit 2; that was a local `"module": "commonjs"` in
`tsconfig.json` fighting the `"moduleResolution": "bundler"` inherited from
`@react-native/typescript-config`. Removing the override fixed it, and required adding `node`
to `types` for `global` in the tests. Any output at all is now a real failure.)

### Docker

```sh
docker compose up web              # http://localhost:3005
docker compose run --rm test       # jest
docker compose run --rm tsc        # tsc --noEmit
docker compose run --rm apk        # Android APK (slow first run, several GB)
```

`Dockerfile` has three stages on `node:22-slim`: `deps` (one `npm ci`) → `dev` (web server;
`test`/`tsc` are the same image behind a `tools` profile) and `android` (JDK 17 + SDK
command-line tools, behind an `android` profile). **iOS cannot be containerised at all** — no
Darwin containers, Xcode is macOS-only — so `README.md` carries the native macOS setup for it.

Android specifics, all of them deliberate:

- **The SDK platform/build-tools/NDK are installed at run time into named volumes**
  (`bingepick-android-sdk`, `bingepick-gradle-cache`) by `docker/android-build.sh`, not baked
  into image layers. They are several GB; in a layer that weight is stored twice during the build
  and can only be reclaimed by deleting the image, whereas a volume is one `docker volume rm`.
- **The `apk` service does NOT bind-mount the checkout**, unlike every other service. The host's
  `android/build/generated/autolinking/autolinking.json` records absolute macOS paths, so a bind
  mount makes Gradle configure `:react-native-svg` against
  `/Users/.../node_modules/react-native-svg/android` — nonexistent inside Linux — and the build
  fails at configuration time. Source comes from the image (`.dockerignore` already strips the
  generated dirs), so **use `docker compose run --rm --build apk` to pick up source edits**.
  Gradle's `android/build` and `android/app/build` are volumes, and the APK is copied to the
  bind-mounted `dist-apk/` to reach the host.
- **The SDK path comes from `$ANDROID_HOME`, never from a written `local.properties`.** Gradle
  prefers `sdk.dir` over the env var, so the script *refuses to build* if a foreign
  `local.properties` appears rather than rewriting it — on a bind mount that file is the host's,
  and clobbering it would break the host's `npm run android`.
- **The entrypoint is `["bash", "/app/docker/android-build.sh"]`, not the script directly.** The
  bind mount replaces `/app`, so a `chmod +x` in the Dockerfile applies to a file that never runs.
- **Release is the default variant** and needs `android/app/release.keystore`, which is untracked
  (only `debug.keystore` is in git). The script fails early with an explanation rather than a deep
  Gradle stack trace. A Debug APK bundles no JS and needs Metro to launch.

Two env vars, both read in `webpack.config.js` and both **inert when unset**, so a host-machine
`npm run web` behaves exactly as before: `BACKEND_URL` re-points the API proxy (default is the
usual `http://188.166.155.92`), and `WATCH_POLL` turns on poll-based file watching, which bind
mounts need because they drop inotify events. `--host 0.0.0.0` is passed by the container's `CMD`
rather than set in the config, so host runs don't start binding every interface.

The bind mount is paired with an anonymous volume on `/app/node_modules` to stop the host's
macOS-built dependencies shadowing the image's Linux-built ones — so after a `package.json`
change, `docker compose down -v` before rebuilding.

## Architecture

**Almost the entire app is `App.tsx`** — ~3,100 lines. Don't go looking for a full
components/ or screens/ tree; it doesn't exist. The main `StyleSheet` lives at the bottom of
the file. `src/` holds only the small extracted modules: `i18n/` (localization), `theme.ts`
(the `COLORS` palette), `youtube.ts` (`extractYouTubeId`), and `TrailerPlayer` (below).

Many components and helpers in `App.tsx` are `export`ed **solely so the test suite can import
them** (`MovieReel`, `FilterMenu`, `SelectionScreen`, `toReelMovies`, `centeredIndexFromOffset`,
`wrapIndex`, `splitPeople`, `PeopleLinks`). Export new units the same way rather than testing
them through the whole app tree.

**Platform-split modules (`.web.tsx` / `.tsx`):** when a component needs a native-only
dependency, split it so the native dep never reaches the web bundle. `TrailerPlayer` is the
pattern: `src/TrailerPlayer.tsx` (native — inline YouTube via `react-native-youtube-iframe` +
`react-native-webview`) and `src/TrailerPlayer.web.tsx` (web — a plain `<iframe>` embed).
Webpack resolves `.web.tsx` first; Metro resolves `.tsx`. Anything shared between the two
variants (e.g. `extractYouTubeId`, `COLORS`) must live in a third, dependency-free module
(`src/youtube.ts`, `src/theme.ts`) so the web variant never transitively imports the native one.

### State & data flow

Global state lives in `App()` as `useState` and is distributed through **nine React Contexts**
declared at the top of `App.tsx` (no Redux/Zustand). New cross-screen state should follow the
same pattern:

| Context | Holds |
| --- | --- |
| `GenresContext` / `GenresListContext` | raw genre objects (id+name) / deduped sorted name list |
| `StackContext` | the running history of picks (push / remove-one / clear) |
| `PairContext` | the current movie batch. **Legacy name** — it is the whole reel batch (up to 12), not a pair |
| `VectorContext` | the 43-dim recommendation vector |
| `FiltersContext` | genre, year range, providers, languages, country, actors, directors |
| `FilterOptionsContext` | provider/country/language lookup lists fetched once on mount |
| `FilterUIContext` | filter side-panel open/close, lifted to `App()` so the nav-bar trigger (rendered by the navigator, outside `SelectionScreen`) can open a panel `SelectionScreen` renders |
| `LocaleContext` | active language + detected ISO region |

Four screens on a native-stack navigator: **`Pick a movie`** (`SelectionScreen`, initial
route), **`Details`**, **`Recommendations`**, **`SearchResults`**.

### The recommendation loop

1. **Cold start** → `GET /movies/start_movies/` (query params). Returns a small array (~2).
2. Picking a movie (tap the reel **title**) pushes it onto the stack and updates the vector in
   `handleSelection`: empty vector → replace with the movie's; both 43-dim → element-wise
   **average**; otherwise keep the old one.
3. **Every subsequent batch** → `POST /movies/twelve_options/` with
   `{ vector, min_year, max_year, genres, adult, ids, country_code, original_language, providers, actors, directors }`.
   `ids` carries the already-seen movies so they're excluded.

**The endpoint split is dictated by the backend, not by preference:** `twelve_options`
*requires* a non-empty vector (an empty one 400s with `{"vector":["This list may not be empty."]}`),
so cold start / "Start Over" / "Apply Filters" — which have no vector yet — must go through
`start_movies`. The vector is sent only when it is exactly length 43, else `[]`.

Because a bad request returns an error **object** rather than an array and `pair` is set
straight from the JSON, `toReelMovies()` guards non-arrays — without it `.map` throws and
white-screens the app on every platform. Keep that guard.

Fetch handlers track three independent flags — `isLoading`, `isError`, `isEmpty`. The
`useEffect` on `[pair.length, isEmpty]` is intentionally guarded on `isEmpty` so an empty API
response doesn't retrigger an infinite fetch loop.

Filter changes only **stage** values; the request fires on an explicit action. Because request
builders read filter values out of the `FiltersContext` closure, any handler that clears
filters *and* refetches in the same render must defer via the `pendingResetRequest` flag,
otherwise it fires with stale values.

### The reel (`MovieReel`)

A horizontal snap carousel showing one spotlit movie at a time. It **loops** by rendering
three back-to-back copies of the batch and silently recentering on the middle copy at
momentum-end (`wrapIndex` maps rendered index → real index); looping is off for a single
movie. Interactions: tap the **title** to pick, tap the centered **poster** to play the
trailer in an embedded miniplayer, **Details** button to open `DetailsScreen`. The spotlight
beam's opacity is driven off the live scroll *phase* (`Animated.modulo`), not the
last-settled index, so the beam lights the poster under it immediately.

### Backend API

Base URL is `localTest`: empty string on web (the Webpack dev server **proxies** `/details`
and `/movies` to the backend — see `webpack.config.js`), and `http://188.166.155.92`
(port 80) on native. There is no env-var config; the host is hardcoded. The old `:8000` host
is dead.

Wired endpoints:

- `GET /movies/start_movies/` — cold-start batch
- `POST /movies/twelve_options/` — every later batch (also backs `RecommendationsScreen`,
  which slices the first 4 and refetches on every vector change)
- `GET /details/genres/` — genre list
- `GET /details/providers`, `/details/countries`, `/details/lenguages` — filter lookup lists,
  fetched once on mount. **`lenguages` is the backend's misspelling** — intentional, don't "fix" it.
- `GET /movies/searchMovie/`, `GET /details/searchActor`, `GET /details/searchDirector` —
  typeahead + search results (`?q=` plus a `*_selected=[]` param)
- `POST /movies/details/` — full movie objects by `ids`; used when a search hit only carries
  `{movie__id, movie__title}` and Details needs the whole record

`country_code` comes from `selectedCountry || region || 'US'`.

Movie fields are loosely typed and quirky: `vote_average` is a **string** ("7.488"), `actors`
is a **Python-stringified list** (`"['A','B']"` — see `splitPeople`), the language field is
`original_language`, and `trailer_path` + `providers[]` arrive only from the detail endpoints.
Movie objects are typed `any` throughout.

### Filters

The side panel drives genre + year range plus providers / languages / country / actors /
directors. Providers and languages use an **"all" sentinel**: `null` = all/unfiltered,
`[]` = none, non-empty array = explicit subset — both `null` and `[]` mean "no constraint"
when building a request. Actors/directors are stored as `{id, name}` so chips can show the
name while only the id goes to the API. "Reset Filters" and "Start Over" clear only the
side-panel extras, keeping genre + year (`clearExtraFilters`).

### i18n (`src/i18n/`)

`i18next` + `react-i18next`, languages `en` / `es` (JSON resource files). Language is
auto-detected from the device/browser locale via `Intl.DateTimeFormat().resolvedOptions()` —
**no native locale module**, so it behaves identically on web and native. `detectLanguage()`
clamps to a supported language; `detectRegion()` extracts the ISO region (also used as
`country_code`). UI copy uses a film-projector theme ("PROJECTOR JAMMED", "LOADING REELS…").
Add user-facing strings to **both** `en.json` and `es.json` and reference via `t('key')`.

### Web specifics

`webpack.config.js` aliases `react-native` → `react-native-web`, resolves `.web.tsx` first,
and entries at `index.web.js` (native entry is `index.js`). Its `exclude` regex whitelists the
node_modules that ship untranspiled JSX/ESM (`@react-navigation`, `react-native-safe-area-context`,
`react-native-screens`, `react-native-shadow-2`, `react-native-svg`) — adding another such
dependency means adding it there **and** to the matching `transformIgnorePatterns` list in
`jest.config.js`. When adding a dependency with native code, confirm it works under
react-native-web or provide a `.web` variant.

The dev server proxies `/details` and `/movies` to the backend, so browser requests are
same-origin (`localTest = ''` on web). That proxy target and the watch mode are the config's only
env-dependent parts — `BACKEND_URL` and `WATCH_POLL`, both defaulting to the previous hardcoded
behaviour, covered under Docker above and locked down by `__tests__/webpackConfig.test.js`.

## Testing

`react-test-renderer` + `act()`, no React Native Testing Library. Conventions:

- Network is stubbed by swapping `global.fetch` for a `jest.fn()` in `beforeEach` and
  restoring it in `afterEach`; assertions read `(global.fetch as jest.Mock).mock.calls` to
  check the URL/body that was built.
- `__mocks__/react-native-youtube-iframe.js` is a manual node-module mock, auto-applied in
  every suite, so the real webview never loads. It renders a host element carrying the props
  tests assert on.
- Animated/interpolated behaviour is not asserted; the deterministic index math is extracted
  into pure functions (`centeredIndexFromOffset`, `wrapIndex`) and unit-tested directly.
  Prefer that split for new reel/geometry logic.

## Conventions observed in the codebase

- Components and movie data are typed as `any` throughout; this is the existing style.
- When navigating with a movie object, the handler/closure props (`selectionHandler`,
  `detailsHandler`) are stripped before passing through navigation params — keep doing this to
  avoid serializing functions into route state.
- Raw API objects are normalized through `mapRawMovieForDetails` before reaching the reel or
  `DetailsScreen`; route to that helper rather than hand-mapping fields at each call site.
