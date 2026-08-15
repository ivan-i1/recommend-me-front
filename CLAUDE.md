# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This directory holds two unrelated projects:

- **`recommend-me-app/`** — Bingepick, the React Native (iOS / Android / web) app. **This is the real project**, and it has its own `recommend-me-app/CLAUDE.md` with the commands and architecture — read that file before working on the app. All npm commands must be run from `recommend-me-app/`, not from here.
- **`MovieEndpointTest/`** — a throwaway Express 5 mock of the movie backend (`node server.js`, port 3000). It fabricates a random movie DB in memory (`utils.js`) and serves `/generate-stack`, `/details/genres`, `/movies/start_movies`, `/pair`. Only some of its route shapes match the real backend, and the app does not point at it by default.
