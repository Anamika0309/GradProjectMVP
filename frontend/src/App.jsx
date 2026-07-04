import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Play, Mic, User, Loader2, Pause, Sparkles } from 'lucide-react';
import './index.css';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8080';

// Helper: Search iTunes API from the Frontend
async function searchITunesClient(query, badge = "") {
  try {
      const res = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`);
      if (res.data && res.data.results && res.data.results.length > 0) {
          const track = res.data.results[0];
          return {
              name: track.trackName,
              artist: track.artistName,
              albumArt: track.artworkUrl100, 
              previewUrl: track.previewUrl,
              badge: badge,
              isDiscovery: badge !== "" // Flag to indicate if it's an AI discovery track
          };
      }
  } catch (err) {
      console.error("iTunes Search Error for", query, err.message);
  }
  return null;
}

function App() {
  const [activeSession, setActiveSession] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [sliderValue, setSliderValue] = useState(2);
  const [generatedQueue, setGeneratedQueue] = useState([]);
  
  // Audio Player State
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (generatedQueue.length > 0 && currentSongIndex < generatedQueue.length) {
      const song = generatedQueue[currentSongIndex];
      if (song && song.previewUrl) {
        if (audioRef.current) {
          audioRef.current.src = song.previewUrl;
          audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error("Auto-play prevented", e));
        }
      } else {
        handleNextSong();
      }
    }
  }, [currentSongIndex, generatedQueue]);

  const handleNextSong = () => {
    if (currentSongIndex < generatedQueue.length - 1) {
      setCurrentSongIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // FEATURE 1: Initial Base Playlist (No Discovery Logic)
  const startCommute = async (type) => {
    setIsProcessing(true);
    try {
      await axios.post(`${API_BASE}/api/session/start`, { commuteType: type });
      setActiveSession(type);
      
      const res = await axios.post(`${API_BASE}/api/playlist/base`, { commuteType: type });
      if (res.data.base_playlist) {
        const i = res.data.base_playlist;
        const queries = [
            { query: i.song_1, badge: "" },
            { query: i.song_2, badge: "" },
            { query: i.song_3, badge: "" },
            { query: i.song_4, badge: "" },
            { query: i.song_5, badge: "" }
        ];
        const promises = queries.map(q => searchITunesClient(q.query, q.badge));
        const results = await Promise.all(promises);
        const newSongs = results.filter(song => song !== null);
        
        if (newSongs.length > 0) {
          setGeneratedQueue(newSongs);
          setCurrentSongIndex(0);
        }
      }
    } catch (err) {
      console.error("Failed to start commute on backend", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // FEATURE 2: Discovery Slider (Appends to Queue)
  const handleSliderChange = async (e) => {
    const val = e.target.value;
    setSliderValue(val);
    
    setIsProcessing(true);
    try {
      await axios.post(`${API_BASE}/api/session/start`, { commuteType: activeSession, sliderLevel: val });
      const res = await axios.post(`${API_BASE}/api/queue/generate`, { commuteType: activeSession, sliderLevel: val });
      
      if (res.data.search_queries) {
        const i = res.data.search_queries;
        const queries = [
            { query: i.anchor_song, badge: "Slider: Anchor" },
            { query: i.exploratory_song, badge: "Slider: Explore" },
            { query: i.gem_song, badge: "Slider: Gem" }
        ];
        const promises = queries.map(q => searchITunesClient(q.query, q.badge));
        const results = await Promise.all(promises);
        const newSongs = results.filter(song => song !== null);
        
        if (newSongs.length > 0) {
          setGeneratedQueue(prev => [...prev, ...newSongs]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // FEATURE 3: Voice Mic (Appends to Queue)
  useEffect(() => {
    if (recognition) {
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = async (event) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        setIsListening(false);
        await processVoiceCommand(text);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    }
  }, [activeSession]);

  const handleMicClick = () => {
    if (!recognition) {
      alert("Your browser does not support voice recognition. Try Chrome.");
      return;
    }
    
    if (isPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
    }

    setTranscript("");
    setIsListening(true);
    recognition.start();
  };

  const processVoiceCommand = async (text) => {
    setIsProcessing(true);
    try {
      const res = await axios.post(`${API_BASE}/api/voice/intent`, { command: text });
      
      if (res.data.intent && res.data.intent.action === 'play_new_queue') {
        const i = res.data.intent;
        const queries = [i.song_1, i.song_2, i.song_3].filter(Boolean);
        const promises = queries.map(q => searchITunesClient(q, "Voice Suggestion"));
        const results = await Promise.all(promises);
        const newSongs = results.filter(song => song !== null);
        
        if (newSongs.length > 0) {
          setGeneratedQueue(prev => [...prev, ...newSongs]);
        } else {
          alert("Couldn't find the requested songs on iTunes. Please try again.");
        }
      }
    } catch (err) {
      console.error("Failed to process voice command", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="app-container">
      <audio 
        ref={audioRef} 
        onEnded={handleNextSong} 
        onError={handleNextSong}
        hidden
      />

      <header className="header">
        <h2>AI Music Player</h2>
        <User size={24} />
      </header>

      <main className="main-content">
        {!activeSession ? (
          <div className="cards-container">
            <h3>Smart Commute Cards</h3>
            <div className="commute-card" onClick={() => startCommute('Monday Morning Boost')}>
              <h4>Monday Morning Boost ☕</h4>
              <p>High energy, motivating, coffee vibes</p>
              <button><Play size={16} /> Select</button>
            </div>
            <div className="commute-card" onClick={() => startCommute('Evening Wind Down')}>
              <h4>Evening Wind Down 🌙</h4>
              <p>Relaxing music, chill beats, de-stress</p>
              <button><Play size={16} /> Select</button>
            </div>
            <div className="commute-card" onClick={() => startCommute('Rainy Day Drive')}>
              <h4>Rainy Day Drive 🌧️</h4>
              <p>Acoustic, melancholy, cozy vocals</p>
              <button><Play size={16} /> Select</button>
            </div>
            <div className="commute-card" onClick={() => startCommute('Party Pre-Game')}>
              <h4>Party Pre-Game 🍻</h4>
              <p>Upbeat, dance, high energy party songs</p>
              <button><Play size={16} /> Select</button>
            </div>
          </div>
        ) : (
          <div className="active-session">
            <h3 style={{ marginBottom: '10px' }}>Active: {activeSession}</h3>
            
            {/* THE PLAYER */}
            {generatedQueue.length > 0 && generatedQueue[currentSongIndex] && (
              <div className="now-playing" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {generatedQueue[currentSongIndex].albumArt ? (
                    <img src={generatedQueue[currentSongIndex].albumArt} alt="Album Art" className="album-art" />
                    ) : (
                    <div className="album-art placeholder"></div>
                    )}
                    <div className="song-info">
                        <h4>{generatedQueue[currentSongIndex].name}</h4>
                        <p>{generatedQueue[currentSongIndex].artist}</p>
                        {generatedQueue[currentSongIndex].badge && (
                            <span className="badge anchor-badge">{generatedQueue[currentSongIndex].badge}</span>
                        )}
                    </div>
                </div>
                <button 
                    onClick={togglePlayPause} 
                    style={{ background: 'var(--spotify-green)', color: '#000', border: 'none', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(29, 185, 84, 0.4)' }}>
                    {isPlaying ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: '4px' }} />}
                </button>
              </div>
            )}

            {/* UP NEXT PLAYLIST */}
            {generatedQueue.length > 1 && (
              <div className="queue-container" style={{ marginBottom: '30px' }}>
                <h4>Up Next</h4>
                {generatedQueue.map((song, idx) => {
                  if (idx <= currentSongIndex) return null;
                  return (
                    <div key={idx} className="queue-item" style={{ borderLeft: song.isDiscovery ? '3px solid var(--spotify-green)' : 'none' }}>
                        {song.albumArt ? (
                        <img src={song.albumArt} alt="Album Art" className="queue-art" />
                        ) : (
                        <div className="queue-art placeholder"></div>
                        )}
                        <div className="queue-info">
                            <h5>{song.name}</h5>
                            <p>{song.artist}</p>
                        {song.badge && <span className="badge discovery-badge">{song.badge}</span>}
                        </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* VISUAL DIVIDER */}
            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', width: '100%', margin: '20px 0' }} />
            
            {/* AI DJ TOOLS SECTION */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h3 style={{ color: 'var(--spotify-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Sparkles size={20} /> AI DJ Tools <Sparkles size={20} />
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Use the slider or voice mic to append new songs to your queue!</p>
            </div>

            <div className="discovery-controls" style={{ marginBottom: '20px' }}>
              <h4>Discovery Level</h4>
              <input 
                type="range" 
                min="1" 
                max="3" 
                value={sliderValue} 
                onChange={handleSliderChange} 
                className="slider" 
                disabled={isProcessing}
              />
              <div className="slider-labels">
                <span>Familiar</span>
                <span>Balanced</span>
                <span>New</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                <button 
                className={`mic-button ${isListening ? 'listening' : ''}`} 
                onClick={handleMicClick}
                disabled={isListening || isProcessing}
                >
                {isProcessing ? <Loader2 size={32} className="spinner" /> : <Mic size={32} />}
                </button>
            </div>
            
            <p className="mic-hint" style={{ textAlign: 'center' }}>
              {isListening ? "Listening..." : isProcessing ? "AI is generating music..." : "Tap to voice search"}
            </p>

            {!isListening && !isProcessing && (
              <div className="suggestions-container" style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '15px' }}>
                <button className="suggestion-pill" onClick={() => processVoiceCommand("Keep the vibe")}>"Keep the vibe"</button>
                <button className="suggestion-pill" onClick={() => processVoiceCommand("Surprise me")}>"Surprise me"</button>
                <button className="suggestion-pill" onClick={() => processVoiceCommand("Play something new like Karan Aujhla")}>"Play something new like Karan Aujhla"</button>
              </div>
            )}

            {transcript && (
              <div className="transcript-box">
                <p><strong>You said:</strong> "{transcript}"</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
