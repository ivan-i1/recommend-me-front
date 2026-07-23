# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Bingepick (package name `recommendmeapp`) — a React Native 0.83 / React 19 app where the
user repeatedly picks "the better of two movies"; each pick refines a recommendation
vector that drives the next pair. Ships to **iOS, Android, and web** from one codebase
(web via react-native-web + Webpack).

## Commands

Run from `recommend-me-app/` (the actual project root; the parent `recommend-me-front/`
also contains an unrelated `MovieEndpointTest/`).

```sh
npm start            # Metro bundler (native)
npm run android      # build + run Android
npm run ios          # build + run iOS (first run: bundle install && bundle exec pod install)
npm run web          # webpack dev server on http://localhost:3005
npm run lint         # eslint .
npm test             # jest
npm test -- App      # run a single test file by name pattern
```

There is no build/typecheck npm script; `tsc --noEmit` can be run ad hoc.

## Architecture

**Almost the entire app is `App.tsx`** (one big file). Don't go looking for a full
components/ or screens/ tree — it doesn't exist. The main `StyleSheet` lives at the bottom
of `App.tsx`. `src/` holds the small shared/extracted modules: `i18n` (localization),
`theme.ts` (the `COLORS` palette — imported by `App.tsx`), `youtube.ts`
(`extractYouTubeId`), and `TrailerPlayer` (see below).

**Platform-split modules (`.web.tsx` / `.tsx`):** when a component needs a native-only
dependency, split it so the native dep never reaches the web bundle. `TrailerPlayer` is the
pattern: `src/TrailerPlayer.tsx` (native — inline YouTube via
`react-native-youtube-iframe` + `react-native-webview`) and `src/TrailerPlayer.web.tsx`
(web — a plain `<iframe>` embed). Webpack resolves `.web.tsx` first; Metro resolves `.tsx`.
Anything shared between the two variants (e.g. `extractYouTubeId`, `COLORS`) must live in a
third, dependency-free module (`src/youtube.ts`, `src/theme.ts`) so the web variant never
transitively imports the native one. In jest, `react-native-youtube-iframe` is auto-mocked
via `__mocks__/` so the real webview never loads.

### State & data flow

Global state is held in `App()` via `useState` and distributed through **seven React
Contexts** defined at the top of `App.tsx` (no Redux/Zustand): `GenresContext`,
`GenresListContext`, `StackContext`, `PairContext`, `VectorContext`, `FiltersContext`,
`LocaleContext`. New cross-screen state should follow this same context pattern.

Two screens registered on a native-stack navigator: `SelectionScreen` ("Pick a movie",
initial route) and `DetailsScreen` ("Details").

The recommendation loop:
1. First pair comes from **`GET /movies/start_movies/`** (filtered by genres/year/adult).
2. Picking a movie stores its **43-dimensional `vector`** (VectorContext) and pushes the
   movie onto the **stack** (the running history of picks, shown as a marquee; items are
   individually removable).
3. Subsequent pairs come from **`POST /movies/two_options/`** with body
   `{ vector, min_year, max_year, genres, adult, ids }` — `ids` excludes already-seen
   movies. The vector is only sent when it is exactly length 43, else `[]`.
4. Fetch handlers track three independent flags — `isLoading`, `isError`, `isEmpty`.
   Empty result (`< 2` movies) drives the "NO FILMS ON THIS REEL" state. Note the
   `useEffect` on `[pair.length, isEmpty]` is intentionally guarded on `isEmpty` so an
   empty API response doesn't retrigger an infinite fetch loop.

Filter changes (genre multi-select, year wheels) only **stage** values — the request
fires on an explicit "Request New Movies" action, not on every change.

### Backend API

Base URL is `localTest`: empty string on web (Webpack dev-server **proxies** `/details`
and `/movies` to the backend, configured in `webpack.config.js`), and
`http://188.166.155.92` (port 80) on native. There is no env-var config; the host is
hardcoded. **Note:** the old `:8000` host is dead — the API moved to port 80 (2026-06-10
spec). See the `bingepick-backend-api` auto-memory for the full endpoint catalog.

Only three endpoints are wired today: `GET /movies/start_movies` (first pair),
`POST /movies/two_options/` (next pair), and `GET /details/genres`. Both pair requests
take `genres, adult, min_year, max_year, country_code, providers, actors, directors`
(plus `vector`/`ids`/`original_language` on the POST). `country_code` comes from the
detected locale region (`region || 'US'`); the people/provider/language filter arrays are
sent **empty** because there's no UI for them yet — wire them when those filters get built.

Endpoints that exist but are NOT yet used: `twelve_options`, `searchMovie`,
`searchActor`/`searchDirector` (typeahead returning `{id,name,movie_count,movies[]}`),
the `providers`/`countries`/`lenguages` (sic) lookup lists, and `POST /movies/details/`
(full objects incl. `providers[]` + `trailer_path`). These back unbuilt search/filter and
streaming-row features.

Movie fields are loosely typed and quirky: `vote_average` is a **string** ("7.488"),
`actors` is a **Python-stringified list** (`"['A','B']"`), the language field is
`original_language` (the old `original_lenguaje` misspelling was fixed in the new spec),
and newer fields `trailer_path` + `providers[]` arrive only from the detail endpoints.
Code treats movie objects as `any`.

### i18n (`src/i18n/`)

`i18next` + `react-i18next`, languages `en` / `es` (JSON resource files). Language is
auto-detected from the device/browser locale via `Intl.DateTimeFormat().resolvedOptions()`
— **no native locale module** (so it works identically on web and native).
`detectLanguage()` clamps to a supported language; `detectRegion()` extracts the ISO
region. UI copy uses a film-projector theme ("PROJECTOR JAMMED", "LOADING REELS…"). Add
user-facing strings to both `en.json` and `es.json` and reference via `t('key')`.

### Web specifics

`webpack.config.js` aliases `react-native` → `react-native-web`, resolves `.web.tsx`
extensions first, and entry is `index.web.js` (native entry is `index.js`). When adding a
dependency with native code, confirm it works under react-native-web or provide a `.web`
variant.

## Conventions observed in the codebase

- Components and movie data are typed as `any` throughout; this is the existing style.
- When navigating with a movie object, the handler/closure props
  (`selectionHandler`, `detailsHandler`) are stripped before passing through navigation
  params — keep doing this to avoid serializing functions into route state.
