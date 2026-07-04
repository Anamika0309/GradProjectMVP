require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 8080;

let currentDriveSession = {
    commuteType: 'morning',
    sliderLevel: 2
};

app.get('/api/session', (req, res) => {
    res.json(currentDriveSession);
});

app.post('/api/session/start', (req, res) => {
    const { commuteType, sliderLevel } = req.body;
    if (commuteType) currentDriveSession.commuteType = commuteType;
    if (sliderLevel) currentDriveSession.sliderLevel = sliderLevel;
    res.json({ success: true, session: currentDriveSession });
});

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
        // Return only the intent, let the frontend search iTunes
        res.json({ success: true, search_queries: intent });
    } catch (error) {
        console.error("Error generating queue:", error);
        res.status(500).json({ error: "Failed to generate queue" });
    }
});

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
            "song_1": "Song Name Artist Name",
            "song_2": "Song Name Artist Name",
            "song_3": "Song Name Artist Name"
        }`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.1-8b-instant",
            temperature: 0,
            response_format: { type: "json_object" }
        });

        const intent = JSON.parse(completion.choices[0].message.content);
        // Return only the intent, let the frontend search iTunes
        res.json({ success: true, intent });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Failed to process request" });
    }
});

app.get('/health', (req, res) => res.json({ status: "OK" }));

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
