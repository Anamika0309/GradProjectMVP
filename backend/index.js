require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 8080;

// In-Memory Database (Feature 1: Drive Sessions)
let currentDriveSession = {
    commuteType: 'morning', // default
    sliderLevel: 2 // 1: Familiar, 2: Balanced, 3: New
};

// Helper: Search iTunes API for a track
async function searchITunes(query, badge = "") {
    try {
        const res = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`);
        if (res.data && res.data.results && res.data.results.length > 0) {
            const track = res.data.results[0];
            return {
                name: track.trackName,
                artist: track.artistName,
                albumArt: track.artworkUrl100, // 100x100 artwork
                previewUrl: track.previewUrl,  // 30 second MP3!
                badge: badge
            };
        }
    } catch (err) {
        console.error("iTunes Search Error for", query, err.message);
    }
    return null;
}

// Drive Session Endpoint
app.get('/api/session', (req, res) => {
    res.json(currentDriveSession);
});

app.post('/api/session/start', (req, res) => {
    const { commuteType, sliderLevel } = req.body;
    if (commuteType) currentDriveSession.commuteType = commuteType;
    if (sliderLevel) currentDriveSession.sliderLevel = sliderLevel;
    console.log("Drive Session updated:", currentDriveSession);
    res.json({ success: true, session: currentDriveSession });
});

// Instant Queue Generation (AI Discovery Queue)
app.post('/api/queue/generate', async (req, res) => {
    const { commuteType, sliderLevel } = req.body;
    if (!commuteType) return res.status(400).json({ error: "No commute type provided" });

    try {
        let sliderText = "familiar favorites";
        if (sliderLevel == 2) sliderText = "a mix of familiar and some new";
        if (sliderLevel == 3) sliderText = "completely new discovery";

        const prompt = `
        You are an AI generating a progressive discovery playlist. 
        The user selected the commute card: "${commuteType}".
        The user's discovery slider is set to: ${sliderText}.
        
        Generate exactly 5 highly specific song recommendations that perfectly match this mood.
        Return ONLY a JSON object exactly like this (use REAL song titles and REAL artists):
        {
            "anchor_song": "Song Name Artist Name",
            "similar_song": "Song Name Artist Name",
            "mood_song": "Song Name Artist Name",
            "exploratory_song": "Song Name Artist Name",
            "gem_song": "Song Name Artist Name"
        }`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.1-8b-instant",
            temperature: 0.7,
            response_format: { type: "json_object" }
        });

        const intent = JSON.parse(completion.choices[0].message.content);
        console.log("Queue Generation Intent:", intent);
        
        const queries = [
            { query: intent.anchor_song, badge: "Trust Anchor" },
            { query: intent.similar_song, badge: "Similar Sound" },
            { query: intent.mood_song, badge: "Same Mood" },
            { query: intent.exploratory_song, badge: "Slightly Exploratory" },
            { query: intent.gem_song, badge: "Hidden Gem" }
        ];

        // Execute 5 parallel searches to fetch tracks from iTunes
        const promises = queries.map(q => searchITunes(q.query, q.badge));
        const results = await Promise.all(promises);
        
        // Filter out nulls
        const newSongs = results.filter(song => song !== null);

        res.json({ success: true, newSongs, search_queries: intent });
    } catch (error) {
        console.error("Error generating queue:", error);
        res.status(500).json({ error: "Failed to generate queue" });
    }
});

// Voice Intent Parsing (Groq Llama 3)
app.post('/api/voice/intent', async (req, res) => {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: "No command provided" });

    try {
        const prompt = `
        You are an AI for a car music player. The user is on a ${currentDriveSession.commuteType} commute.
        The user just said: "${command}"
        
        Convert this into 3 specific song recommendations that fit the request perfectly.
        Return ONLY a JSON object with this exact structure, nothing else:
        {
            "action": "play_new_queue",
            "reason": "Brief explanation of your choice",
            "song_1": "Real Song Name Artist Name",
            "song_2": "Real Song Name Artist Name",
            "song_3": "Real Song Name Artist Name"
        }`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.1-8b-instant",
            temperature: 0,
            response_format: { type: "json_object" }
        });

        const intent = JSON.parse(completion.choices[0].message.content);
        console.log("Parsed Intent:", intent);
        
        let newSongs = [];
        if (intent.action === 'play_new_queue') {
            const queries = [intent.song_1, intent.song_2, intent.song_3].filter(Boolean);
            const promises = queries.map(q => searchITunes(q, "Voice Request"));
            const results = await Promise.all(promises);
            newSongs = results.filter(song => song !== null);
            console.log("Fetched songs from iTunes successfully!");
        }

        res.json({ success: true, intent, newSongs });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Failed to process request" });
    }
});

app.get('/health', (req, res) => res.json({ status: "OK" }));

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
