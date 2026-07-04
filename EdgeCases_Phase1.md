# Edge Cases & Mitigation Strategies: Phase 1
**Phase:** Foundation & Core Integrations

This document outlines the potential edge cases for Phase 1 of the Spotify Drive AI MVP (Spotify OAuth, Mock Commute Detection, and the UI Shell) and how the system should handle them to maintain a seamless driving experience.

## 1. Spotify Authentication & Playback Control

### 1.1 Non-Premium Account Restriction
- **Edge Case:** The user attempts to use the app with a Spotify Free account. The Spotify Web API requires a Premium account to control playback via the `/v1/me/player/play` and `/queue` endpoints.
- **Mitigation:** During the OAuth flow, immediately query the `/v1/me` endpoint. If `product !== "premium"`, display a clear blocking UI screen explaining that Spotify Premium is required for Drive AI to function.

### 1.2 Token Expiration During a Drive
- **Edge Case:** The Spotify `access_token` expires (typically after 1 hour) while the user is driving, causing playback or queue additions to fail with a `401 Unauthorized`.
- **Mitigation:** Implement a preemptive token refresh mechanism. Set a background timer to silently hit the `/api/token` refresh endpoint every 45 minutes. If a `401` still occurs, intercept the error globally, refresh the token, and retry the original request without notifying the user.

### 1.3 No Active Device Found
- **Edge Case:** The Spotify API returns a `404 Not Found` when attempting to play a song because no active Spotify session is open on the user's phone or car.
- **Mitigation:** Before initiating playback, check `/v1/me/player/devices`. If no device is active, display a persistent, non-intrusive banner on the UI Shell: *"Please open the Spotify app once to connect."*

## 2. The Commute Detection Engine (Mocked)

### 2.1 Overlapping Commute Triggers
- **Edge Case:** The tester taps "Trigger Morning Commute" while an "Evening Commute" session is currently active and playing.
- **Mitigation:** The `POST /api/session/start` route must check for an active `DriveSession` in Redis. If one exists, gracefully clear the Spotify queue, reset the Redis session context, and fade out the current track before transitioning to the new commute mood to avoid jarring audio shifts.

### 2.2 Offline at Startup
- **Edge Case:** The app boots up, and the user triggers a commute session, but there is no internet connection.
- **Mitigation:** The Commute Detection Engine cannot fetch initial recommendations. The UI Shell should immediately fall back to playing downloaded/cached local tracks (if supported) or display a large, easily readable "Waiting for Network..." state without crashing.

## 3. Persistent UI Shell

### 3.1 App Backgrounding & OS Suspensions
- **Edge Case:** The user switches to Google Maps, and the mobile OS suspends the React Native app. When returning, the UI state is out of sync with what is actually playing on Spotify.
- **Mitigation:** Implement `AppState` listeners in React Native. Upon transitioning from `background` to `active`, immediately trigger a silent fetch to `GET /v1/me/player/currently-playing` to re-sync the UI (Album Art, Title, Progress Bar) with the source of truth.
