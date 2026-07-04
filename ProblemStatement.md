# Product Requirements Document (PRD): Spotify "Drive AI" MVP
**Target:** AI-Native In-Car Music Experience | **Goal:** 90%+ Academic Submission

## 1. Executive Summary
**The Vision:** To reimagine the in-car audio experience by transitioning Spotify from a *passive content repository* to an *active, intelligent audio co-pilot*. 
**The Problem:** Traditional in-car audio interfaces are distracting, rigid, and require high cognitive load, directly compromising driver safety. Current recommendation algorithms lack the immediate, real-time context of the driving environment.
**The AI-Native Solution:** "Spotify Drive AI" is a voice-first, context-aware MVP that leverages Large Language Models (LLMs) and sensor data to dynamically generate and adjust the perfect soundtrack for any journey, ensuring zero-UI interaction and maximum safety.

---

## 2. The Core Problem: Why Traditional Systems Fail in Cars
In a driving environment, traditional recommendation systems (collaborative filtering, historical data) are insufficient because:
1. **High Cognitive Load & Safety Risks:** Drivers must take their eyes off the road to navigate menus, select playlists, or skip tracks when the algorithm misses the mark.
2. **Context Blindness:** Traditional systems do not understand the *current* situation—the stress of an unexpected traffic jam, the fatigue of a late-night drive, or the presence of passengers.
3. **Rigid "Vibe Shifts":** If a user wants to slightly change the mood, they must manually search for a new playlist rather than just requesting a subtle adjustment.

---

## 3. MVP Feature Specifications (The 6 Core Features)
After analyzing user interviews, the features for the MVP are structured into a clear hierarchy to ensure an effortless, AI-native experience.

### Core Experience (Most Important)
These features form the fundamental backbone of the AI-Native driving experience.

#### 1. Drive Sessions ⭐
- **Purpose:** Automatically personalize Spotify's listening experience based on recurring commuting contexts instead of treating every listening session the same. Ensures recommendations feel relevant to the current journey without manual setup.
- **Problem It Solves:** Listening preferences change significantly depending on Morning vs Evening, Weekday vs Weekend, traffic conditions, energy levels, and the purpose of the drive. Current Spotify recommendations rely heavily on historical listening behavior and fail to consistently account for these changing contexts.
- **User Experience:** When the user enters their car and Spotify detects a familiar commute, it automatically starts a Drive Session. Instead of asking users to select a mode, Spotify quietly identifies the context and loads relevant recommendations.
  - *Morning Commute:* Calm but motivating songs, light discovery, positive energy.
  - *Evening Commute:* Relaxing music, familiar artists, wind-down playlists.
  - *Weekend Drive:* More energetic music, higher exploration, road-trip mixes.
- **Frontend Requirements:** Display the current Drive Session at the top of the screen with a small contextual label (e.g., Morning Commute, Evening Drive) with no additional user interaction required.
- **Backend Requirements:** Maintain independent recommendation behavior for different commute sessions (storing preferred genres, moods, average discovery preference, frequently skipped songs, and listening duration per session context).
- **AI Responsibilities:** Determine which commute session is currently active, which recommendation strategy should be used, and when recommendations should become more or less exploratory.

#### 2. Voice-First Discovery ⭐
- **Purpose:** Enable users to discover and control music entirely through natural voice interactions, minimizing the need to touch the screen while driving.
- **Problem It Solves:** Research consistently showed that users avoid browsing Spotify while driving because it is distracting and unsafe.
- **User Experience:** Users can naturally speak to Spotify without remembering rigid commands (e.g., "Play something new like Taylor Swift", "Surprise me", "Play relaxing devotional music", "Keep this vibe"). Spotify responds conversationally and immediately updates recommendations.
- **Frontend Requirements:** A persistent microphone button should always be accessible. After a command: brief listening animation, confirmation text, and updated recommendations.
- **Backend Requirements:** Voice commands should be converted into structured intents before reaching the recommendation engine.
- **AI Responsibilities:** Interpret conversational language to understand mood, genre, similar artists, discovery intent, energy level, and recommendation adjustments.

#### 3. AI Discovery Queue ⭐ (Flagship Feature)
- **Purpose:** Help users discover new music in a gradual, trustworthy way without overwhelming them with endless recommendations.
- **Problem It Solves:** Users trust familiar songs, hesitate to try unfamiliar music while driving, and feel recommendations become irrelevant after long sessions. This introduces discovery progressively.
- **User Experience:** Whenever the user is listening to a song they enjoy, Spotify automatically generates a queue of exactly four songs. The current song is the "trust anchor."
  - *Current Song* ↓
  - *Song 1:* Very similar artist or sound. ↓
  - *Song 2:* Same mood, different artist. ↓
  - *Song 3:* Slightly more exploratory. ↓
  - *Song 4:* Hidden gem selected by AI.
  When the queue finishes, Spotify generates another context queue based on behavior.
- **Frontend Requirements:** A dedicated "Up Next" screen displaying the Current Song and Next Four AI Picks, each with a small badge (Similar Artist, Same Mood, Hidden Gem, New Discovery).
- **Backend Requirements:** Continuously monitor listening behavior, generate four-song queues in real time, avoid sudden genre shifts, and preserve mood continuity.
- **AI Responsibilities:** Optimize for trust (not maximum novelty) using the current song, commute context, discovery slider, skip behavior, and mood consistency.

---

### Supporting Experience
These features empower the user with subtle control without overwhelming the core experience.

#### 4. Smart Commute Cards ⭐
- **Purpose:** Reduce decision fatigue by presenting personalized, context-aware listening suggestions before or at the start of every drive.
- **Problem It Solves:** Users spend unnecessary time deciding what to play before starting their journey.
- **User Experience:** As soon as Spotify detects a commute, it presents a few large recommendation cards (e.g., "Monday Morning Boost", "Continue Yesterday's Discoveries"). Each card immediately starts playback with one tap.
- **Frontend Requirements:** Large card-based interface with Title, Artwork, Estimated Duration, and a One-tap play button. Maximum of four cards shown.
- **Backend/AI Requirements:** Cards generated dynamically based on commute context, listening history, time, and discovery preference.

#### 5. Discovery Slider ⭐
- **Purpose:** Allow users to control how adventurous Spotify's recommendations should be during the current drive.
- **Problem It Solves:** Users avoid discovering new music due to fear of recommendations mismatching their taste.
- **User Experience:** A slider with three options: *Mostly Familiar, Balanced, Mostly New*. Adjustable via touch or voice (e.g., "A little more adventurous").
- **Frontend Requirements:** Simple horizontal slider with three labeled positions, visible throughout the Drive Session.
- **Backend/AI Requirements:** Dynamically change recommendation diversity (e.g., Mostly Familiar = 80% familiar / 20% new; Mostly New = 30% familiar / 70% discovery) while respecting mood and context.

#### 6. Discovery Feedback ⭐
- **Purpose:** Allow users to provide simple feedback to continuously improve future recommendations without interrupting the drive.
- **Problem It Solves:** Current systems learn passively (skips/likes). This enables direct, low-effort communication.
- **User Experience:** While listening, users provide optional feedback via touch or voice (e.g., "More like this", "Too different").
- **Frontend Requirements:** A compact feedback button below the Now Playing screen. Shows a small confirmation message without interrupting playback.
- **Backend/AI Requirements:** Store user feedback as part of the current Drive Session. The Adaptive Discovery Engine continuously refines recommendations combining explicit feedback with passive signals (skips, saves, song completion).

---

## 4. Backend / AI Architecture (What Powers the Experience)
These systems are not shown as separate features in the UI, keeping the user experience effortless and hiding technical complexity.

### 1. Commute Detection Engine
- **Purpose:** Automatically detects that the user has started a commute and identifies what kind of commute it is.
- **Powers:** Drive Sessions, Smart Commute Cards.
- **UX Impact:** The user never sees the engine; they simply notice Spotify has automatically started the right Drive Session.

### 2. Adaptive Discovery Engine
- **Purpose:** Continuously updates recommendations during the drive. 
- **Powers:** Discovery Slider, AI Discovery Queue, Discovery Feedback.
- **UX Impact:** Decides whether to become more adventurous, preserve the mood, or reduce exploration based on real-time feedback.

### Architecture Flowchart

```text
                    USER
                     │
        Opens Spotify in Car
                     │
                     ▼
        [Commute Detection Engine]
                     │
                     ▼
           Starts Drive Session
                     │
                     ▼
           Smart Commute Cards
                     │
                     ▼
          Voice-First Discovery
                     │
                     ▼
       [Adaptive Discovery Engine]
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
Discovery AI Queue   │     Discovery Slider
        │            │
        ▼            ▼
Discovery Feedback ──┘
        │
        ▼
Adaptive Discovery updates recommendations
```

**Why this architecture works:** The user sees only six intuitive features. The AI remains invisible, working behind the scenes, perfectly aligning with the design principle that the experience should feel effortless rather than exposing technical complexity.
