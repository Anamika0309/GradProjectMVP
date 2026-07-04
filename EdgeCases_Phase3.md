# Edge Cases & Mitigation Strategies: Phase 3
**Phase:** Frontend Experiences & Feedback Loop

This document outlines the UX-specific edge cases surrounding the Commute Cards, Discovery Slider, and explicit user feedback mechanisms.

## 1. Smart Commute Cards UI

### 1.1 Incomplete Data for Card Generation
- **Edge Case:** The Commute Detection Engine detects a commute, but the backend fails to fetch personalized seed tracks for the "Monday Morning Boost" card due to an API timeout.
- **Mitigation:** The frontend should be designed to accept "Fallback Cards." If personalized seeds fail, the backend returns pre-compiled generic but reliable playlists (e.g., Spotify's official "Morning Commute" playlist URI). The user should never see an empty screen or a loading spinner that lasts longer than 3 seconds.

### 1.2 Accidental Multiple Taps
- **Edge Case:** A driver taps a Commute Card, but due to a slow network, nothing happens immediately, prompting them to tap 3 other cards in rapid succession.
- **Mitigation:** Implement strict UI debouncing on all Commute Cards. Upon the first tap, disable all cards visually (e.g., lower opacity) and show a micro-loading state on the selected card until the Spotify player acknowledges the `PUT /play` request.

## 2. Discovery Slider

### 2.1 Slider Adjustments During Offline/Poor Connectivity
- **Edge Case:** The user drags the Discovery Slider to "Mostly New" while driving through a cellular dead zone.
- **Mitigation:** The frontend must optimistically update the UI so the user feels in control, but queue the `PUT /api/session/slider` network request in a local async task queue. Once connectivity is restored, the latest slider state is pushed to the backend. 

### 2.2 Constant Fiddling
- **Edge Case:** The user repeatedly drags the slider back and forth out of curiosity, sending 20 API requests in 5 seconds and triggering backend race conditions.
- **Mitigation:** Use a UI throttle/debounce of at least 800ms before dispatching the state change to the backend. Only the *final* resting position of the slider should trigger a recommendation recalculation.

## 3. Discovery Feedback Integration

### 3.1 Unintended Feedback Triggers
- **Edge Case:** A passenger accidentally taps the "Too different" button while trying to view the Album Art.
- **Mitigation:** 
  1. Make the touch targets large but place them in deliberate UI zones (e.g., bottom corners) away from primary scrolling areas.
  2. Implement an "Undo" toast notification that persists for 4 seconds after feedback is given. If tapped, it reverses the feedback signal sent to the Adaptive Discovery Engine.

### 3.2 Chronic Negative Feedback (The Frustration Loop)
- **Edge Case:** The AI suggests 4 new tracks. The user taps "Too different" on the first track, skips it, gets the second track, and taps "Too different" again. They are trapped in a loop of bad recommendations.
- **Mitigation:** Implement a frustration threshold in the `DriveSession` Redis state. If `recent_skips > 3` or `negative_feedback > 2` within a 5-minute window, the backend must immediately override the Discovery Slider, set the state to "Mostly Familiar," clear the upcoming queue, and inject 3 of the user's all-time most played tracks to rebuild trust.
