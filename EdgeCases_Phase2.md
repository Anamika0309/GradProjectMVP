# Edge Cases & Mitigation Strategies: Phase 2
**Phase:** The AI "Brain" (Adaptive Discovery Engine)

This document outlines the critical edge cases for the LLM voice integration, discovery algorithms, and the AI queue generation logic.

## 1. Voice-First Intent Parsing Pipeline

### 1.1 Conflicting or Nonsensical Voice Commands
- **Edge Case:** The user says something contradictory like, "Play some relaxing heavy metal" or "Play music by Taylor Swift but make it a podcast."
- **Mitigation:** The system prompt for the Groq API must include strict guardrails instructing it to prioritize the *mood/energy* over the specific genre if a conflict arises, or to fallback to a generic `surprise_me` action. The backend should log these conflicts for future fine-tuning.

### 1.2 Groq API Timeout / STT Failure
- **Edge Case:** The Speech-To-Text library misinterprets the user due to road noise, or the Groq API takes longer than 2 seconds to respond due to network throttling.
- **Mitigation:**
  1. **STT:** Use a local STT model where possible, or pass a confidence threshold. If confidence is <60%, trigger an audio prompt: *"Sorry, the road noise is a bit loud, could you repeat that?"*
  2. **API Timeout:** Set a strict 1.5s timeout on the Groq API request. If it fails, fallback immediately to the previous `DriveSession` state and do not interrupt the current song.

### 1.3 LLM Hallucinations & Invalid JSON
- **Edge Case:** The LLM ignores the system prompt and returns conversational text (e.g., *"Sure, I can help with that! Here is the JSON..."*) instead of a raw JSON object, crashing the parser.
- **Mitigation:** Use Groq's strict JSON mode if available. On the backend, use `Zod` or `Joi` to validate the schema. If validation fails, attempt to strip markdown formatting (` ```json `). If it still fails, silently discard the request and maintain the current playlist.

## 2. Adaptive Discovery Engine

### 2.1 The "Cold Start" Problem (No Listening History)
- **Edge Case:** The Discovery Slider logic relies on fetching `GET /v1/me/top/tracks` to provide "Familiar" music. If the user is a brand new Spotify account, this endpoint returns an empty array.
- **Mitigation:** The backend must catch the empty array response. When a cold start is detected, the Adaptive Discovery Engine should fallback to querying `GET /v1/browse/new-releases` or top global hits in the genres specified by the current `DriveSession` commute type.

### 2.2 Spotify API Rate Limiting (HTTP 429)
- **Edge Case:** Rapidly requesting `/v1/audio-features` for every single track during high discovery phases triggers Spotify's rate limiter, causing subsequent recommendation requests to fail.
- **Mitigation:** 
  1. **Redis Caching:** Cache every `audio-feature` response in Redis keyed by the `track_id` with a TTL of 30 days. 
  2. **Backoff Strategy:** If a `429` is hit, immediately halt the AI Discovery Queue generation for 60 seconds and rely entirely on the user's cached top tracks.

## 3. AI Discovery Queue ("Trust Anchor" Algorithm)

### 3.1 Extremely Short Songs
- **Edge Case:** The "Trust Anchor" queue is designed to trigger 30 seconds before a song ends. If a song is a 20-second interlude, the trigger logic will misfire or overlap.
- **Mitigation:** Before setting the queue webhook/timer, verify `track.duration_ms`. If the duration is less than 60 seconds, skip the AI Queue generation for this specific track and allow Spotify's default autoplay to handle the transition, or immediately queue a safe track upon start.

### 3.2 Race Conditions with Manual Skips
- **Edge Case:** The AI Queue logic fires at the 30-second mark, but the user presses "Skip" at the 29-second mark. The backend pushes 4 tracks into the queue *after* the skip resolves, causing a disjointed playback experience.
- **Mitigation:** Use a Redis locking mechanism. When a "Skip" event is detected, lock the queue mutation for 2 seconds. Any in-flight AI Queue pushes that attempt to resolve during this lock will be safely discarded.
