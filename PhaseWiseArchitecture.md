# Spotify "Drive AI" MVP: Beginner-Friendly Architecture & Production Plan

This document provides a simplified, step-by-step technical architecture for the Spotify Drive AI MVP. It is specifically designed to be easy to build for someone new to coding, while still delivering a high-quality AI experience for your academic submission.

## 1. Simplified Technology Stack
To keep development easy and avoid complex setups, we are building a **Web App** (styled to look like a mobile car interface) rather than a native mobile app.

- **Frontend (Client):** React.js (Web App)
  - *Why:* Easiest to learn, massive community support, and can be tested right in your browser.
  - *Voice Requirements:* We will use the built-in **Web Speech API** in the browser. It requires zero external libraries and easily converts your voice to text.
- **Backend (Server):** Node.js with Express
  - *Why:* Uses JavaScript (just like the frontend). We will use the `spotify-web-api-node` library which makes talking to Spotify super easy.
- **AI Engine:** Groq API (Llama 3)
  - *Why:* Extremely fast AI responses, essential for a voice app.
- **Database (Simplified):** In-Memory Variables
  - *Why:* Since this is an MVP for your grading, we don't need a complex database like Redis or SQL. We will just store the active `Drive Session` data inside a temporary variable in our Node.js server!

---

## 2. Data Extraction: How We Get Spotify Songs
We will not host or download any MP3s. Spotify acts as our "Database". Here is exactly how we get the data:

1. **User Login:** The user logs in via Spotify on our frontend. We get an `access_token`.
2. **Finding the User's Taste (Familiar Data):** We call Spotify's `GET /v1/me/top/tracks`. This gives us a list of songs the user already loves.
3. **Getting AI "Vibe" Data (Audio Features):** We pass song IDs to Spotify's `GET /v1/audio-features/{id}` endpoint. It returns math scores (0.0 to 1.0) for *Valence* (happiness), *Energy*, and *Acousticness*.
4. **Getting New AI Recommendations (New Data):** Based on the Groq AI's decision (e.g., "User wants more energy"), we call Spotify's `GET /v1/recommendations` and pass our target energy score. Spotify sends back brand new song data.
5. **Playing the Music:** We send a list of Song URIs to `PUT /v1/me/player/play`. The user's active Spotify app instantly plays them.

---

## 3. Voice Feature Requirements
To make the voice feature work simply:
1. **Frontend Capture:** We use the browser's native `SpeechRecognition` interface. When the user taps the Mic button, the browser listens and converts speech to text automatically.
2. **Sending to Backend:** The frontend sends this text string (e.g., "Play something relaxing") to our Node.js backend.
3. **Groq AI Parsing:** The backend sends the text to Groq API with instructions to return a JSON object (e.g., `{"mood": "relaxing", "energy": "low"}`).
4. **Spotify Execution:** The backend reads the JSON, translates it into Spotify Audio Features, fetches the new songs, and updates the player.

---

## 4. Phase-Wise Production Plan (Your Step-by-Step Guide)

### Phase 1: Basic Setup & Spotify Login
- **Step 1:** Create a Spotify Developer Account and get your `Client ID` and `Client Secret`.
- **Step 2:** Set up a basic Node.js Express server.
- **Step 3:** Implement Spotify Login so you can get an `access_token` and prove you can pause/play your own music via code.

### Phase 2: Frontend UI & Voice Input
- **Step 4:** Set up a React.js project.
- **Step 5:** Build a simple black screen with a "Now Playing" text box and a giant Microphone button.
- **Step 6:** Hook up the Web Speech API so clicking the mic converts your speech to text and prints it on the screen.

### Phase 3: The AI Brain (Groq + Spotify Recommendations)
- **Step 7:** Connect your Node.js server to the Groq API.
- **Step 8:** Send the transcribed voice text from Step 6 to Groq, and have Groq return a JSON decision.
- **Step 9:** Use Groq's decision to fetch matching songs from Spotify's Recommendations API and add them to your queue.

### Phase 4: Easy Deployment (Going Live)
- **Frontend Hosting:** Deploy the React app for free on **Vercel** or **Netlify**. (Takes 2 minutes, connects directly to GitHub).
- **Backend Hosting:** Deploy the Node.js server for free on **Render.com**.
- **Environment Variables:** Securely add your Spotify and Groq API keys into the Render dashboard so they aren't public on GitHub.

---

## 5. Simplified System Data Flow

```mermaid
graph TD
    %% Frontend (Browser)
    subgraph Browser Web App (React)
        UI[Simple UI Screen]
        Mic[Web Speech API]
    end

    %% Backend (Node.js)
    subgraph Backend Server (Node.js on Render)
        Auth[Spotify Auth Controller]
        Logic[Node.js AI Logic]
        State[(In-Memory Session Variable)]
    end

    %% External APIs
    subgraph External APIs
        Spotify[Spotify Web API]
        Groq[Groq Llama 3 API]
    end

    %% Flow
    Mic -->|Voice to Text String| Logic
    UI --> Auth
    Auth <--> Spotify
    
    Logic --> State
    Logic <-->|Send Text / Get JSON| Groq
    Logic <-->|Fetch Audio Features & Play| Spotify
```
