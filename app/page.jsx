"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const PASSCODE = "0507";
const DISTANCE_KM = 1258;

// Curated & Engaging Statuses
const STATUS_PRESETS = [
  { group: "Romantic & Cozy", items: ["Missing you tons 🥺", "Craving chai & your voice ☕", "Listening to our songs 🎧", "Winding down for bed 🌙", "Half asleep, send me a voice note 🥱"] },
  { group: "Daily & Busy", items: ["Free to talk right now! 🎙️", "In a boring meeting, thinking of you 🤫", "Deep in work grind 💻", "Having delicious food 🍜", "Stuck in traffic 🛵", "Out with friends 🍕", "Working out 💪"] },
];

const DAILY_PROMPTS = [
  "15-sec highlight of your day so far ✨",
  "What were you doing at 4:00 PM today? 🕓",
  "One random thing that made you smile today 😊",
  "Sing or hum one line of a song stuck in your head 🎵",
  "Mini rant or funniest moment from today 🗣️",
  "First thing we're eating next time we meet 🍜",
  "Describe your current mood in 10 seconds 🌙",
];

function decodeWeatherCode(code) {
  if (code === 0) return { icon: "☀️", label: "Clear Sky" };
  if (code === 1) return { icon: "🌤️", label: "Mostly Clear" };
  if (code === 2) return { icon: "⛅", label: "Partly Cloudy" };
  if (code === 3) return { icon: "☁️", label: "Overcast" };
  if (code === 45 || code === 48) return { icon: "🌫️", label: "Misty" };
  if (code >= 51 && code <= 57) return { icon: "🌦️", label: "Light Drizzle" };
  if (code >= 61 && code <= 67) return { icon: "🌧️", label: "Rainy" };
  if (code >= 80 && code <= 82) return { icon: "🌦️", label: "Rain Showers" };
  if (code >= 95) return { icon: "⛈️", label: "Thunderstorm" };
  return { icon: "🌤️", label: "Pleasant" };
}

// Convert Blob / File to Base64 (Fail-safe for cross-device media delivery)
function fileToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Synthesized Walkie-Talkie Static Burst
function playRadioBurst(durationMs = 150) {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const bufferSize = ctx.sampleRate * (durationMs / 1000);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.18;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1400;
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationMs / 1000);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  } catch (e) {}
}

// Synthesized 72 BPM Heartbeat Sound
function playHeartbeatSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const beat = (delay, freq, peak) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + delay + 0.14);
      gain.gain.setValueAtTime(0.001, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(peak, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.16);
    };
    beat(0, 90, 0.3);
    beat(0.18, 70, 0.22);
  } catch (e) {}
}

function sendPhoneNotification(title, body) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try {
      new Notification(title, { body, vibrate: [100, 80, 150] });
    } catch (e) {}
  }
}

export default function WalkieTalkieApp() {
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [myStation, setMyStation] = useState("bbi");
  const [notifEnabled, setNotifEnabled] = useState(false);

  // Weather
  const [weather, setWeather] = useState({
    bbi: { temp: "29°C", feels: "32°C", humidity: "65%", wind: "11 km/h", icon: "⛅", condition: "Partly Cloudy" },
    greno: { temp: "28°C", feels: "29°C", humidity: "42%", wind: "8 km/h", icon: "☀️", condition: "Clear Sky" },
  });

  // Stations
  const [stations, setStations] = useState({
    bbi: { station_id: "bbi", display_name: "Sarthak • BBI", city: "Bhubaneswar", current_mood: "Free to talk right now! 🎙️", heart_active: false },
    greno: { station_id: "greno", display_name: "Jaai • GreNo", city: "Greater Noida", current_mood: "Free to talk right now! 🎙️", heart_active: false },
  });

  // Messages (Transmissions)
  const [tapes, setTapes] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("tape"); // 'tape' | 'polaroid'
  const [isPlaying, setIsPlaying] = useState(false);
  const [nowTs, setNowTs] = useState(Date.now());
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [customStatusInput, setCustomStatusInput] = useState("");
  const [viewSentArchive, setViewSentArchive] = useState(false);

  // Composer
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [noteText, setNoteText] = useState("");
  const [polaroidFile, setPolaroidFile] = useState(null);
  const [polaroidPreview, setPolaroidPreview] = useState("");
  const [isPromptAttached, setIsPromptAttached] = useState(false);
  const [isTimeLockAttached, setIsTimeLockAttached] = useState(false);
  const [unlockTimeStr, setUnlockTimeStr] = useState("23:30");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState("");

  // Presence & Biometric Sync
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [myThumbDown, setMyThumbDown] = useState(false);
  const [partnerThumbDown, setPartnerThumbDown] = useState(false);
  const [syncSeconds, setSyncSeconds] = useState(0);

  // Refs
  const scratchCanvasRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recTimerRef = useRef(null);
  const presenceChannelRef = useRef(null);

  const partnerStation = myStation === "bbi" ? "greno" : "bbi";
  const myName = myStation === "bbi" ? "Sarthak" : "Jaai";
  const partnerName = myStation === "bbi" ? "Jaai" : "Sarthak";

  const todayPrompt = useMemo(() => {
    const dayIndex = new Date().getDate() % DAILY_PROMPTS.length;
    return DAILY_PROMPTS[dayIndex];
  }, []);

  // Check stored auth
  useEffect(() => {
    const savedPin = localStorage.getItem("freq1210_pin");
    const savedStation = localStorage.getItem("freq1210_station");
    if (savedStation) setMyStation(savedStation);
    if (savedPin === PASSCODE) setUnlocked(true);
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifEnabled(Notification.permission === "granted");
    }

    const clock = setInterval(() => setNowTs(Date.now()), 10000);
    return () => clearInterval(clock);
  }, []);

  const requestNotificationAccess = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      alert("Add this app to your Home Screen to enable alerts.");
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifEnabled(perm === "granted");
    if (perm === "granted") {
      sendPhoneNotification("12.10 MHz Radio Connected 📻", `You'll be alerted when ${partnerName} transmits!`);
    }
  };

  // Live Weather Fetching
  useEffect(() => {
    async function fetchDetailedWeather() {
      try {
        const [bbiRes, grenoRes] = await Promise.all([
          fetch("https://api.open-meteo.com/v1/forecast?latitude=20.2961&longitude=85.8245&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m").then((r) => r.json()),
          fetch("https://api.open-meteo.com/v1/forecast?latitude=28.4744&longitude=77.5040&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m").then((r) => r.json()),
        ]);

        const formatW = (res, fallback) => {
          if (!res?.current) return fallback;
          const c = res.current;
          const dec = decodeWeatherCode(c.weather_code);
          return {
            temp: `${Math.round(c.temperature_2m)}°C`,
            feels: `${Math.round(c.apparent_temperature)}°C`,
            humidity: `${Math.round(c.relative_humidity_2m)}%`,
            wind: `${Math.round(c.wind_speed_10m)} km/h`,
            icon: dec.icon,
            condition: dec.label,
          };
        };

        setWeather((prev) => ({
          bbi: formatW(bbiRes, prev.bbi),
          greno: formatW(grenoRes, prev.greno),
        }));
      } catch (e) {}
    }
    fetchDetailedWeather();
  }, []);

  // Supabase Data & Realtime Sync
  useEffect(() => {
    if (!unlocked || !supabase) return;

    async function loadData() {
      const { data: statusData } = await supabase.from("station_status").select("*");
      if (statusData) {
        const map = {};
        statusData.forEach((s) => (map[s.station_id] = s));
        setStations((prev) => ({ ...prev, ...map }));
      }

      const { data: tapeData, error: tapeErr } = await supabase
        .from("transmissions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);

      if (tapeData && !tapeErr) {
        setTapes(tapeData);
        setCurrentIndex(0);
      }
    }

    loadData();

    const dbChannel = supabase
      .channel("db-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "station_status" }, (payload) => {
        if (payload.new) {
          const updated = payload.new;
          setStations((prev) => {
            const oldPartner = prev[updated.station_id];
            if (updated.station_id !== myStation && oldPartner) {
              if (!oldPartner.heart_active && updated.heart_active) {
                playRadioBurst(120);
                if (navigator.vibrate) navigator.vibrate([80, 100, 140]);
                sendPhoneNotification(`💓 ${partnerName}'s heart is beating for you!`, `${partnerName} turned ON the Heart Signal.`);
              } else if (oldPartner.current_mood !== updated.current_mood) {
                sendPhoneNotification(`📻 ${partnerName}'s Status Updated`, `${partnerName} is now: ${updated.current_mood}`);
              }
            }
            return { ...prev, [updated.station_id]: updated };
          });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "transmissions" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const newTape = payload.new;
          setTapes((prev) => [newTape, ...prev]);

          if (newTape.sender !== myStation) {
            playRadioBurst(190);
            if (navigator.vibrate) navigator.vibrate([120, 80, 160]);
            setCurrentIndex(0);
            sendPhoneNotification(
              `🎙️ New Tape from ${partnerName}!`,
              newTape.polaroid_url ? `${partnerName} sent a Voice Tape + Polaroid on 12.10 MHz!` : `${partnerName} sent a Voice Tape!`
            );
          }
        } else if (payload.eventType === "UPDATE") {
          setTapes((prev) => prev.map((t) => (t.id === payload.new.id ? payload.new : t)));
        }
      })
      .subscribe();

    const liveChannel = supabase.channel("freq-1210-live", {
      config: { presence: { key: myStation } },
    });

    liveChannel
      .on("presence", { event: "sync" }, () => {
        const state = liveChannel.presenceState();
        setPartnerOnline(Boolean(state[partnerStation] && state[partnerStation].length > 0));
      })
      .on("broadcast", { event: "thumb" }, ({ payload }) => {
        if (payload.station !== myStation) {
          setPartnerThumbDown(payload.down);
          if (payload.down && navigator.vibrate) navigator.vibrate([70, 100, 120]);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await liveChannel.track({ online_at: new Date().toISOString() });
        }
      });

    presenceChannelRef.current = liveChannel;

    return () => {
      supabase.removeChannel(dbChannel);
      supabase.removeChannel(liveChannel);
    };
  }, [unlocked, myStation, partnerStation, partnerName]);

  // Biometric Heartbeat Loop
  useEffect(() => {
    if (!myThumbDown || !partnerThumbDown) {
      setSyncSeconds(0);
      return;
    }
    playHeartbeatSound();
    if (navigator.vibrate) navigator.vibrate([70, 120, 110]);

    const beatInterval = setInterval(() => {
      playHeartbeatSound();
      if (navigator.vibrate) navigator.vibrate([60, 110, 95]);
    }, 840);

    const timerInterval = setInterval(() => {
      setSyncSeconds((s) => +(s + 0.1).toFixed(1));
    }, 100);

    return () => {
      clearInterval(beatInterval);
      clearInterval(timerInterval);
    };
  }, [myThumbDown, partnerThumbDown]);

  // Incoming Messages from Partner
  const incomingTapes = useMemo(() => {
    return tapes.filter((t) => t.sender !== myStation);
  }, [tapes, myStation]);

  // Sent Messages by You
  const sentTapes = useMemo(() => {
    return tapes.filter((t) => t.sender === myStation);
  }, [tapes, myStation]);

  const streakDays = useMemo(() => {
    const uniqueDays = new Set(tapes.map((t) => new Date(t.created_at).toDateString())).size;
    return Math.max(uniqueDays, tapes.length > 0 ? 1 : 0);
  }, [tapes]);

  const currentTape = incomingTapes[currentIndex] || null;
  const isUnreadPartnerTape = Boolean(currentTape && !currentTape.is_listened);

  // Check Lock Status
  const lockStatus = useMemo(() => {
    if (!currentTape) return { locked: false, reason: "" };

    const unlockMs = new Date(currentTape.unlock_at).getTime();
    if (unlockMs > nowTs) {
      const formattedTime = new Date(currentTape.unlock_at).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return {
        locked: true,
        reason: `This message can be opened after ${formattedTime}`,
      };
    }

    if (currentTape.require_reply_unlock) {
      const tapeSentTime = new Date(currentTape.created_at).getTime();
      const iRepliedAfter = sentTapes.some(
        (t) => new Date(t.created_at).getTime() > tapeSentTime
      );
      if (!iRepliedAfter) {
        return {
          locked: true,
          reason: `Daily Prompt Lock! Record a reply below to unlock ${partnerName}'s tape.`,
        };
      }
    }

    return { locked: false, reason: "" };
  }, [currentTape, nowTs, sentTapes, partnerName]);

  // Darkroom Scratch Canvas
  useEffect(() => {
    if (activeTab !== "polaroid" || !currentTape || currentTape.polaroid_developed) return;
    const canvas = scratchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.globalCompositeOperation = "source-over";

    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, "#1c1033");
    grad.addColorStop(0.5, "#2e1a4f");
    grad.addColorStop(1, "#140b24");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#e9d5ff";
    ctx.font = "bold 13px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("✨ UNEXPOSED DARKROOM FILM ✨", canvas.width / 2, canvas.height / 2 - 8);
    ctx.font = "11px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "#c084fc";
    ctx.fillText("Scratch with finger or tap 'Instant Reveal'", canvas.width / 2, canvas.height / 2 + 14);
  }, [activeTab, currentTape]);

  const markPolaroidRevealed = async () => {
    if (!currentTape) return;
    if (navigator.vibrate) navigator.vibrate(40);
    setTapes((prev) =>
      prev.map((t) => (t.id === currentTape.id ? { ...t, polaroid_developed: true } : t))
    );
    if (supabase) {
      await supabase.from("transmissions").update({ polaroid_developed: true }).eq("id", currentTape.id);
    }
  };

  const handleScratchMove = (e) => {
    if (!currentTape || currentTape.polaroid_developed) return;
    const canvas = scratchCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    const ctx = canvas.getContext("2d");
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0;
    for (let i = 3; i < imgData.length; i += 16) {
      if (imgData[i] < 128) transparent++;
    }
    if (transparent / (imgData.length / 16) > 0.45) {
      markPolaroidRevealed();
    }
  };

  const selectStatus = async (status) => {
    setStations((prev) => ({
      ...prev,
      [myStation]: { ...prev[myStation], current_mood: status },
    }));
    setStatusModalOpen(false);
    if (supabase) {
      await supabase
        .from("station_status")
        .update({ current_mood: status, updated_at: new Date().toISOString() })
        .eq("station_id", myStation);
    }
  };

  const toggleHeartSignal = async () => {
    const nextVal = !Boolean(stations[myStation]?.heart_active);
    const nowIso = new Date().toISOString();
    if (nextVal && navigator.vibrate) navigator.vibrate([50, 80, 100]);

    setStations((prev) => ({
      ...prev,
      [myStation]: { ...prev[myStation], heart_active: nextVal, heart_updated_at: nowIso },
    }));

    if (supabase) {
      await supabase
        .from("station_status")
        .update({ heart_active: nextVal, heart_updated_at: nowIso })
        .eq("station_id", myStation);
    }
  };

  const handleThumbState = (down) => {
    setMyThumbDown(down);
    if (down && navigator.vibrate) navigator.vibrate(35);
    if (presenceChannelRef.current) {
      presenceChannelRef.current.send({
        type: "broadcast",
        event: "thumb",
        payload: { station: myStation, down },
      });
    }
  };

  const togglePlayTape = async () => {
    if (!currentTape || lockStatus.locked || !audioPlayerRef.current) return;

    if (isPlaying) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      playRadioBurst(160);
      audioPlayerRef.current.src = currentTape.audio_url;
      try {
        await audioPlayerRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        alert("Audio playback failed. Please tap again.");
      }

      if (!currentTape.is_listened) {
        setTapes((prev) =>
          prev.map((t) => (t.id === currentTape.id ? { ...t, is_listened: true } : t))
        );
        if (supabase) {
          await supabase.from("transmissions").update({ is_listened: true }).eq("id", currentTape.id);
        }
      }
    }
  };

  // Push-to-Talk Recording
  const startRecording = async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      playRadioBurst(140);
      const mimeType = MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        playRadioBurst(160);
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        await uploadAndSend(blob, recorder.mimeType || "audio/webm");
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch (err) {
      alert("Please allow microphone permissions to record your voice note.");
    }
  };

  const stopRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;
    clearInterval(recTimerRef.current);
    setIsRecording(false);
    mediaRecorderRef.current.stop();
  };

  // BULLETPROOF SEND: Storage first, with automatic Base64 fallback if storage bucket fails
  const uploadAndSend = async (audioBlob, mimeType) => {
    setIsUploading(true);
    setUploadNotice("Encoding & transmitting across 1,258 KM...");

    try {
      let finalAudioUrl = "";
      let finalPolaroidUrl = "";

      // 1. Process Voice Note
      try {
        if (supabase) {
          const ext = mimeType.includes("mp4") ? "mp4" : "webm";
          const fileName = `${myStation}-${Date.now()}.${ext}`;
          const { error: storeErr } = await supabase.storage
            .from("voice-notes")
            .upload(fileName, audioBlob, { contentType: mimeType });

          if (!storeErr) {
            const { data } = supabase.storage.from("voice-notes").getPublicUrl(fileName);
            finalAudioUrl = data.publicUrl;
          }
        }
      } catch (e) {}

      // Fallback: If Supabase Storage failed/blocked, convert to Base64 data URI
      if (!finalAudioUrl) {
        finalAudioUrl = await fileToBase64(audioBlob);
      }

      // 2. Process Polaroid
      if (polaroidFile) {
        try {
          if (supabase) {
            const imgName = `${myStation}-polaroid-${Date.now()}`;
            const { error: imgErr } = await supabase.storage.from("polaroids").upload(imgName, polaroidFile);
            if (!imgErr) {
              const { data } = supabase.storage.from("polaroids").getPublicUrl(imgName);
              finalPolaroidUrl = data.publicUrl;
            }
          }
        } catch (e) {}

        if (!finalPolaroidUrl) {
          finalPolaroidUrl = await fileToBase64(polaroidFile);
        }
      }

      // 3. Time Lock Calculation
      let unlockIso = new Date().toISOString();
      if (isTimeLockAttached && unlockTimeStr) {
        const [hh, mm] = unlockTimeStr.split(":").map(Number);
        const target = new Date();
        target.setHours(hh, mm, 0, 0);
        if (target.getTime() <= Date.now()) {
          target.setDate(target.getDate() + 1);
        }
        unlockIso = target.toISOString();
      }

      // 4. Save into Database
      const newRow = {
        sender: myStation,
        audio_url: finalAudioUrl,
        duration_sec: Math.max(recSeconds, 1),
        note_text: noteText.trim() || null,
        polaroid_url: finalPolaroidUrl || null,
        polaroid_developed: false,
        unlock_at: unlockIso,
        require_reply_unlock: isPromptAttached,
        prompt_text: isPromptAttached ? todayPrompt : null,
        is_listened: false,
      };

      if (supabase) {
        const { error: dbErr } = await supabase.from("transmissions").insert([newRow]);
        if (dbErr) {
          alert(`Transmission error: ${dbErr.message}`);
          return;
        }
      }

      // Success Reset
      setNoteText("");
      setPolaroidFile(null);
      setPolaroidPreview("");
      setIsPromptAttached(false);
      setIsTimeLockAttached(false);
      setUploadNotice(`✓ Sent directly to ${partnerName}'s radio!`);
      setTimeout(() => setUploadNotice(""), 4500);
    } catch (err) {
      alert("Failed to send transmission. Please check your internet connection.");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePinDigit = (digit) => {
    const next = (pinInput + digit).slice(0, 4);
    setPinInput(next);
    setPinError(false);
    if (next.length === 4) {
      if (next === PASSCODE) {
        localStorage.setItem("freq1210_pin", PASSCODE);
        localStorage.setItem("freq1210_station", myStation);
        playRadioBurst(160);
        setUnlocked(true);
      } else {
        setPinError(true);
        setTimeout(() => setPinInput(""), 500);
      }
    }
  };

  // -------------------------------------------------------------------------
  // SCREEN 1: 0507 FREQUENCY LOCK
  // -------------------------------------------------------------------------
  if (!unlocked) {
    return (
      <div style={styles.screenWrap}>
        <div style={styles.lockCard}>
          <div style={styles.freqBadge}>PRIVATE FREQUENCY • 12.10 MHz</div>
          <h1 style={{ margin: "10px 0 4px", fontSize: 22, fontWeight: 800 }}>BBI ↔ GreNo Radio</h1>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "#c4b5fd" }}>
            Select your station & enter the 4-digit passcode
          </p>

          <div style={styles.stationSwitchRow}>
            <button
              onClick={() => setMyStation("bbi")}
              style={{ ...styles.stationSelectBtn, ...(myStation === "bbi" ? styles.stationSelectBtnActive : {}) }}
            >
              📡 Sarthak • BBI
            </button>
            <button
              onClick={() => setMyStation("greno")}
              style={{ ...styles.stationSelectBtn, ...(myStation === "greno" ? styles.stationSelectBtnActive : {}) }}
            >
              📻 Jaai • GreNo
            </button>
          </div>

          <div style={styles.pinDotsRow}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  ...styles.pinDot,
                  background: pinError ? "#f43f5e" : pinInput.length > i ? "#c084fc" : "#24173d",
                }}
              />
            ))}
          </div>

          <div style={styles.keypadGrid}>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "CLR", "0", "⌫"].map((key) => (
              <button
                key={key}
                onClick={() => {
                  if (key === "CLR") setPinInput("");
                  else if (key === "⌫") setPinInput((p) => p.slice(0, -1));
                  else handlePinDigit(key);
                }}
                style={styles.keypadBtn}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const myHeartOn = Boolean(stations[myStation]?.heart_active);
  const partnerHeartOn = Boolean(stations[partnerStation]?.heart_active);
  const bothThumbsSynced = myThumbDown && partnerThumbDown;

  // -------------------------------------------------------------------------
  // SCREEN 2: MAIN 12.10 MHz INTERFACE
  // -------------------------------------------------------------------------
  return (
    <div style={styles.screenWrap}>
      <style>{`
        @keyframes pulseHeart {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 6px #f472b6); }
          50% { transform: scale(1.24); filter: drop-shadow(0 0 18px #ec4899); }
        }
        @keyframes spinReel {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes biometricPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 15px rgba(236, 72, 153, 0.5); }
          50% { transform: scale(1.06); box-shadow: 0 0 32px rgba(236, 72, 153, 0.95); }
        }
        @keyframes incomingGlow {
          0%, 100% { box-shadow: 0 0 12px rgba(236, 72, 153, 0.35), inset 0 0 12px rgba(236, 72, 153, 0.15); border-color: #ec4899; }
          50% { box-shadow: 0 0 24px rgba(236, 72, 153, 0.7), inset 0 0 18px rgba(236, 72, 153, 0.28); border-color: #f472b6; }
        }
      `}</style>

      <audio
        ref={audioPlayerRef}
        onEnded={() => {
          playRadioBurst(140);
          setIsPlaying(false);
        }}
      />

      <div style={styles.radioChassis}>
        {/* TOP STATUS BAR */}
        <div style={styles.topUtilityBar}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={styles.streakPill}>🔥 {streakDays}d Streak</div>
            <button
              onClick={requestNotificationAccess}
              style={{
                ...styles.notifBtn,
                borderColor: notifEnabled ? "#a855f7" : "#3b1d6e",
                color: notifEnabled ? "#e9d5ff" : "#a78bfa",
              }}
            >
              {notifEnabled ? "🔔 Alerts ON" : "🔕 Enable Alerts"}
            </button>
          </div>

          <button
            onClick={() => {
              const next = myStation === "bbi" ? "greno" : "bbi";
              setMyStation(next);
              setCurrentIndex(0);
              localStorage.setItem("freq1210_station", next);
            }}
            style={styles.miniSwitchBtn}
          >
            {myStation === "bbi" ? "Sarthak • BBI" : "Jaai • GreNo"} ⇄
          </button>
        </div>

        {/* WEATHER BRIDGE & STATUS DISPLAY */}
        <div style={styles.bridgeCard}>
          <div style={styles.bridgeHeaderRow}>
            <span style={styles.freqDialText}>12.10 MHz</span>
            <span
              style={{
                ...styles.livePresenceBadge,
                background: partnerOnline ? "rgba(236, 72, 153, 0.2)" : "rgba(168, 85, 247, 0.14)",
                borderColor: partnerOnline ? "#f472b6" : "#4c1d95",
                color: partnerOnline ? "#fbcfe8" : "#c4b5fd",
              }}
            >
              {partnerOnline ? "✨ BOTH TUNED IN LIVE" : `${DISTANCE_KM.toLocaleString()} KM BRIDGE`}
            </span>
          </div>

          <div style={styles.citiesGrid}>
            {/* SARTHAK - BHUBANESWAR */}
            <div style={{ ...styles.cityBox, borderColor: myStation === "bbi" ? "#a855f7" : "#2e1759" }}>
              <div style={styles.cityHeaderLine}>
                <span style={styles.cityTitle}>Sarthak • BBI</span>
                <span style={styles.tempHighlight}>{weather.bbi.temp}</span>
              </div>
              <div style={styles.weatherConditionLine}>
                {weather.bbi.icon} Bhubaneswar • {weather.bbi.condition}
              </div>
              <div style={styles.weatherMicroMeta}>
                <span>Feels {weather.bbi.feels}</span>
                <span>💧 {weather.bbi.humidity}</span>
                <span>🌬️ {weather.bbi.wind}</span>
              </div>
              <div style={styles.cityMoodPill}>{stations.bbi?.current_mood}</div>
            </div>

            <div style={styles.cityDivider}>↔</div>

            {/* JAAI - GREATER NOIDA */}
            <div style={{ ...styles.cityBox, borderColor: myStation === "greno" ? "#a855f7" : "#2e1759" }}>
              <div style={styles.cityHeaderLine}>
                <span style={styles.cityTitle}>Jaai • GreNo</span>
                <span style={styles.tempHighlight}>{weather.greno.temp}</span>
              </div>
              <div style={styles.weatherConditionLine}>
                {weather.greno.icon} Greater Noida • {weather.greno.condition}
              </div>
              <div style={styles.weatherMicroMeta}>
                <span>Feels {weather.greno.feels}</span>
                <span>💧 {weather.greno.humidity}</span>
                <span>🌬️ {weather.greno.wind}</span>
              </div>
              <div style={styles.cityMoodPill}>{stations.greno?.current_mood}</div>
            </div>
          </div>

          {/* OPEN STATUS SHEET BUTTON */}
          <button onClick={() => setStatusModalOpen(true)} style={styles.openStatusModalBtn}>
            <span>📍 My Status: <strong>{stations[myStation]?.current_mood}</strong></span>
            <span style={{ fontSize: 11, color: "#c084fc", fontWeight: 700 }}>Change ▾</span>
          </button>
        </div>

        {/* PERSPECTIVE-AWARE "THINKING OF YOU" HEART BAR */}
        <div
          style={{
            ...styles.heartSectionCard,
            borderColor: partnerHeartOn ? "#ec4899" : myHeartOn ? "#9333ea" : "#3b1d6e",
            background: partnerHeartOn
              ? "linear-gradient(135deg, rgba(236, 72, 153, 0.22), rgba(147, 51, 234, 0.2))"
              : "#190e30",
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  display: "inline-block",
                  fontSize: 16,
                  animation: partnerHeartOn ? "pulseHeart 1.1s infinite ease-in-out" : "none",
                }}
              >
                {partnerHeartOn ? "💓" : myHeartOn ? "📡" : "💜"}
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#f5d0fe" }}>
                {myHeartOn && partnerHeartOn
                  ? `Both Hearts Beating Together!`
                  : partnerHeartOn
                  ? `${partnerName}'s heart is beating for you!`
                  : myHeartOn
                  ? `Pulsing on ${partnerName}'s Screen...`
                  : `Thinking of You Signal`}
              </span>
            </div>

            <div style={{ fontSize: 11, color: "#d8b4fe", marginTop: 3, lineHeight: 1.35 }}>
              {myHeartOn && partnerHeartOn
                ? `You & ${partnerName} both have your heart signals switched ON right now 💞`
                : partnerHeartOn
                ? `Incoming live signal from Greater Noida • Tap your button to beat back!`
                : myHeartOn
                ? `${partnerName}'s screen shows: "${myName}'s heart is beating for you 💓"`
                : `Tap ON so ${partnerName} sees "${myName}'s heart is beating for you 💓"`}
            </div>
          </div>

          <button
            onClick={toggleHeartSignal}
            style={{
              ...styles.heartToggleBtn,
              background: myHeartOn ? "linear-gradient(135deg, #ec4899, #9333ea)" : "#1e1336",
              borderColor: myHeartOn ? "#f472b6" : "#4c1d95",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill={myHeartOn ? "#fff" : "none"}
              stroke={myHeartOn ? "#fff" : "#c084fc"}
              strokeWidth="2.2"
              style={{ animation: myHeartOn ? "pulseHeart 1.2s infinite ease-in-out" : "none" }}
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span style={{ fontSize: 11, fontWeight: 800 }}>{myHeartOn ? "SENT: ON" : "SEND"}</span>
          </button>
        </div>

        {/* BIOMETRIC FINGERPRINT SYNC */}
        <div
          style={{
            ...styles.biometricCard,
            borderColor: bothThumbsSynced ? "#f472b6" : partnerThumbDown ? "#c084fc" : "#3b1d6e",
            animation: bothThumbsSynced ? "biometricPulse 1.2s infinite ease-in-out" : "none",
          }}
        >
          <div style={styles.biometricHeader}>
            <span style={styles.biometricExclusiveTag}>🔒 BIOMETRIC TOUCH • SARTHAK × JAAI</span>
            <span style={styles.biometricBpmBadge}>
              {bothThumbsSynced ? `💞 72 BPM • ${syncSeconds.toFixed(1)}s` : partnerThumbDown ? `⚡ ${partnerName.toUpperCase()} WAITING` : "12.10 MHz"}
            </span>
          </div>

          <div style={styles.biometricScannerRow}>
            <div
              style={{
                ...styles.thumbNode,
                borderColor: (myStation === "bbi" ? myThumbDown : partnerThumbDown) ? "#ec4899" : "#2e1759",
                background: (myStation === "bbi" ? myThumbDown : partnerThumbDown) ? "rgba(236, 72, 153, 0.2)" : "#120924",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 800, color: "#f5d0fe" }}>SARTHAK</div>
              <div style={{ fontSize: 9, color: "#a78bfa", marginTop: 2 }}>
                {(myStation === "bbi" ? myThumbDown : partnerThumbDown) ? "🟢 TOUCHING" : "⚪ STANDBY"}
              </div>
            </div>

            <div
              onMouseDown={() => handleThumbState(true)}
              onMouseUp={() => handleThumbState(false)}
              onMouseLeave={() => myThumbDown && handleThumbState(false)}
              onTouchStart={(e) => {
                e.preventDefault();
                handleThumbState(true);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleThumbState(false);
              }}
              style={{
                ...styles.fingerprintPad,
                background: bothThumbsSynced
                  ? "radial-gradient(circle, #ec4899 0%, #7e22ce 75%)"
                  : myThumbDown || partnerThumbDown
                  ? "radial-gradient(circle, rgba(192,132,252,0.35) 0%, #1c1036 80%)"
                  : "#150b29",
                borderColor: bothThumbsSynced ? "#fbcfe8" : myThumbDown || partnerThumbDown ? "#e879f9" : "#6b21a8",
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke={bothThumbsSynced ? "#ffffff" : myThumbDown || partnerThumbDown ? "#f472b6" : "#c084fc"}
                strokeWidth="1.6"
                strokeLinecap="round"
              >
                <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
                <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
                <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
                <path d="M2 12a10 10 0 0 1 18-6" />
                <path d="M2 16h.01" />
                <path d="M21.8 16c.2-2 .131-5.354 0-6" />
                <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
                <path d="M8.65 22c.21-.66.45-1.32.57-2" />
                <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
              </svg>
              <span style={{ fontSize: 9, fontWeight: 800, marginTop: 2 }}>
                {bothThumbsSynced ? "SYNCED" : myThumbDown ? "HOLDING..." : "HOLD THUMB"}
              </span>
            </div>

            <div
              style={{
                ...styles.thumbNode,
                borderColor: (myStation === "greno" ? myThumbDown : partnerThumbDown) ? "#ec4899" : "#2e1759",
                background: (myStation === "greno" ? myThumbDown : partnerThumbDown) ? "rgba(236, 72, 153, 0.2)" : "#120924",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 800, color: "#f5d0fe" }}>JAAI</div>
              <div style={{ fontSize: 9, color: "#a78bfa", marginTop: 2 }}>
                {(myStation === "greno" ? myThumbDown : partnerThumbDown) ? "🟢 TOUCHING" : "⚪ STANDBY"}
              </div>
            </div>
          </div>
        </div>

        {/* INCOMING RECEIVER TABS */}
        <div style={styles.tabBar}>
          <button
            onClick={() => setActiveTab("tape")}
            style={{ ...styles.tabBtn, ...(activeTab === "tape" ? styles.tabBtnActive : {}) }}
          >
            📻 {partnerName}&apos;s Voice Tape
            {isUnreadPartnerTape && <span style={styles.unreadDot}>NEW</span>}
          </button>
          <button
            onClick={() => setActiveTab("polaroid")}
            style={{ ...styles.tabBtn, ...(activeTab === "polaroid" ? styles.tabBtnActive : {}) }}
          >
            📸 {partnerName}&apos;s Polaroid
            {currentTape && (currentTape.note_text || currentTape.polaroid_url) && <span style={styles.unreadDot}>✦</span>}
          </button>
        </div>

        {/* INCOMING RECEIVER DECK */}
        <div
          style={{
            ...styles.deckContainer,
            animation: isUnreadPartnerTape ? "incomingGlow 2s infinite ease-in-out" : "none",
            borderColor: isUnreadPartnerTape ? "#ec4899" : "#3b1d6e",
          }}
        >
          {!currentTape ? (
            <div style={{ textAlign: "center", padding: "24px 12px", color: "#c4b5fd", fontSize: 13 }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>📻</div>
              Waiting for incoming transmissions from <strong>{partnerName}</strong>...
              <div style={{ fontSize: 11, color: "#a78bfa", marginTop: 4 }}>
                Hold the push-to-talk button below to send your voice note directly to {partnerName}.
              </div>
            </div>
          ) : activeTab === "tape" ? (
            <>
              {isUnreadPartnerTape && (
                <div style={styles.incomingHighlightBanner}>
                  ✨ NEW UNPLAYED TRANSMISSION FROM {partnerName.toUpperCase()}
                </div>
              )}

              <div style={styles.tapeMetaRow}>
                <span style={{ color: "#f5d0fe", fontWeight: 700 }}>
                  INCOMING {String(currentIndex + 1).padStart(2, "0")}/{String(incomingTapes.length).padStart(2, "0")} • FROM {partnerName.toUpperCase()}
                </span>
                <span>
                  {new Date(currentTape.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })}
                </span>
              </div>

              {currentTape.prompt_text && (
                <div style={styles.promptReplyTag}>
                  🎲 Ritual Prompt: &ldquo;{currentTape.prompt_text}&rdquo;
                </div>
              )}

              {/* CASSETTE WINDOW */}
              <div style={styles.cassetteWindow}>
                <div style={{ ...styles.reelWheel, animation: isPlaying ? "spinReel 2.2s linear infinite" : "none" }}>
                  <div style={styles.reelCore} />
                </div>
                <div style={styles.cassetteCenterLabel}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#f5d0fe" }}>12.10 MHz</div>
                  <div style={{ fontSize: 9, color: "#a78bfa", marginTop: 2 }}>
                    {isPlaying ? "PLAYING AUDIO..." : `${currentTape.duration_sec || 5}s VOICE TAPE`}
                  </div>
                </div>
                <div style={{ ...styles.reelWheel, animation: isPlaying ? "spinReel 2.2s linear infinite" : "none" }}>
                  <div style={styles.reelCore} />
                </div>
              </div>

              {lockStatus.locked ? (
                <div style={styles.lockedBanner}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#f5d0fe" }}>
                    🔒 {lockStatus.reason}
                  </div>
                </div>
              ) : (
                <div style={styles.playerControlsRow}>
                  <button
                    onClick={() => setCurrentIndex((i) => Math.min(incomingTapes.length - 1, i + 1))}
                    disabled={currentIndex >= incomingTapes.length - 1}
                    style={styles.navTapeBtn}
                  >
                    ◀ OLDER
                  </button>
                  <button
                    onClick={togglePlayTape}
                    style={{
                      ...styles.playMainBtn,
                      background: isUnreadPartnerTape ? "linear-gradient(135deg, #ec4899, #9333ea)" : "linear-gradient(135deg, #9333ea, #7e22ce)",
                    }}
                  >
                    {isPlaying ? "⏹ STOP TAPE" : `▶ PLAY (${currentTape.duration_sec || 5}s)`}
                  </button>
                  <button
                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                    disabled={currentIndex <= 0}
                    style={styles.navTapeBtn}
                  >
                    NEWER ▶
                  </button>
                </div>
              )}
            </>
          ) : (
            /* POLAROID TAB */
            <div style={styles.polaroidTabWrap}>
              {lockStatus.locked ? (
                <div style={styles.lockedBanner}>🔒 Polaroid is locked: {lockStatus.reason}</div>
              ) : !currentTape.polaroid_url && !currentTape.note_text ? (
                <div style={{ padding: "20px 10px", textAlign: "center", color: "#a78bfa", fontSize: 12 }}>
                  No photo or note was attached to this tape by {partnerName}.
                </div>
              ) : (
                <div style={styles.polaroidFrame}>
                  <div style={styles.polaroidPhotoArea}>
                    {currentTape.polaroid_url ? (
                      <img src={currentTape.polaroid_url} alt="Polaroid" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={styles.polaroidDefaultArt}>
                        <div style={{ fontSize: 28 }}>💜 📻 ✨</div>
                        <div style={{ fontSize: 12, marginTop: 6, color: "#e9d5ff" }}>Note from {partnerName}</div>
                      </div>
                    )}

                    {!currentTape.polaroid_developed && (
                      <canvas
                        ref={scratchCanvasRef}
                        width={280}
                        height={170}
                        onMouseMove={(e) => e.buttons === 1 && handleScratchMove(e)}
                        onTouchMove={handleScratchMove}
                        style={styles.scratchCanvas}
                      />
                    )}
                  </div>

                  {!currentTape.polaroid_developed && (
                    <button onClick={markPolaroidRevealed} style={styles.instantRevealBtn}>
                      ✨ Instant Reveal Photo
                    </button>
                  )}

                  <div style={styles.polaroidCaption}>
                    {currentTape.note_text || `From ${partnerName} with love 💜`}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CLEAN, STREAMLINED COMPOSER (REPLACING THE CLUTTERED PART) */}
        <div style={styles.composerCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#d8b4fe" }}>
              🎙️ RECORD TO {partnerName.toUpperCase()}
            </span>

            {/* Quick Add-on Toggles */}
            <div style={{ display: "flex", gap: 5 }}>
              <button
                onClick={() => setIsPromptAttached((v) => !v)}
                style={{
                  ...styles.chipToggle,
                  background: isPromptAttached ? "#a855f7" : "#190e30",
                  color: isPromptAttached ? "#ffffff" : "#c4b5fd",
                }}
              >
                🎲 {isPromptAttached ? "Prompt ON" : "+ Prompt"}
              </button>
              <button
                onClick={() => setIsTimeLockAttached((v) => !v)}
                style={{
                  ...styles.chipToggle,
                  background: isTimeLockAttached ? "#ec4899" : "#190e30",
                  color: isTimeLockAttached ? "#ffffff" : "#c4b5fd",
                }}
              >
                ⏰ {isTimeLockAttached ? "Locked" : "+ Time Lock"}
              </button>
            </div>
          </div>

          {/* Expandable Daily Prompt Card */}
          {isPromptAttached && (
            <div style={styles.expandedPromptCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: "#f5d0fe" }}>🎲 ATTACHED DAILY PROMPT</span>
                <span onClick={() => setIsPromptAttached(false)} style={{ cursor: "pointer", fontSize: 11, color: "#c4b5fd" }}>✕</span>
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#fff", marginTop: 2 }}>
                &ldquo;{todayPrompt}&rdquo;
              </div>
              <div style={{ fontSize: 9.5, color: "#d8b4fe", marginTop: 2 }}>
                {partnerName} must record an answer before hearing your voice tape.
              </div>
            </div>
          )}

          {/* Expandable Time Lock Row */}
          {isTimeLockAttached && (
            <div style={styles.expandedTimeLockRow}>
              <span style={{ fontSize: 11, color: "#f5d0fe" }}>Open after:</span>
              <input
                type="time"
                value={unlockTimeStr}
                onChange={(e) => setUnlockTimeStr(e.target.value)}
                style={styles.timeInput}
              />
              <span onClick={() => setIsTimeLockAttached(false)} style={{ cursor: "pointer", fontSize: 12, color: "#c4b5fd" }}>✕</span>
            </div>
          )}

          {/* Note Input + Photo Button */}
          <div style={styles.composerInputRow}>
            <input
              type="text"
              placeholder={`Optional note for ${partnerName}...`}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              style={styles.textInput}
            />
            <label style={styles.photoUploadBtn}>
              📷 {polaroidFile ? "Photo Added" : "Add Photo"}
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setPolaroidFile(file);
                    setPolaroidPreview(URL.createObjectURL(file));
                  }
                }}
              />
            </label>
          </div>

          {polaroidPreview && (
            <div style={styles.photoPreviewRow}>
              <span>✓ Photo attached: ready to develop</span>
              <span onClick={() => { setPolaroidFile(null); setPolaroidPreview(""); }} style={{ cursor: "pointer", color: "#f472b6", fontWeight: 700 }}>Remove ✕</span>
            </div>
          )}

          {/* Big Push-to-Talk Button */}
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={(e) => {
              e.preventDefault();
              startRecording();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              stopRecording();
            }}
            disabled={isUploading}
            style={{
              ...styles.pttButton,
              background: isRecording
                ? "linear-gradient(135deg, #ec4899, #be185d)"
                : "linear-gradient(135deg, #9333ea, #6b21a8)",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 800 }}>
              {isUploading
                ? "TRANSMITTING..."
                : isRecording
                ? `🔴 RECORDING (${recSeconds}s) — RELEASE TO SEND`
                : `🎙️ HOLD TO TALK TO ${partnerName.toUpperCase()}`}
            </div>
            <div style={{ fontSize: 10.5, color: "#f3e8ff", opacity: 0.85, marginTop: 2 }}>
              Release to send voice tape directly to {partnerName}&apos;s radio
            </div>
          </button>

          {uploadNotice && <div style={styles.sentFooterStatus}>{uploadNotice}</div>}

          {/* Expandable Sent Archive (To verify that your sent notes went through) */}
          <div style={{ marginTop: 10, textAlign: "center" }}>
            <button onClick={() => setViewSentArchive((v) => !v)} style={styles.sentArchiveToggle}>
              {viewSentArchive ? "Hide Sent Archive ▲" : `View My Sent Tapes (${sentTapes.length}) ▼`}
            </button>

            {viewSentArchive && (
              <div style={styles.sentArchiveList}>
                {sentTapes.length === 0 ? (
                  <div style={{ padding: 8, fontSize: 11, color: "#a78bfa" }}>No sent transmissions yet.</div>
                ) : (
                  sentTapes.slice(0, 5).map((tape, idx) => (
                    <div key={tape.id || idx} style={styles.sentArchiveItem}>
                      <span>
                        {new Date(tape.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })}
                        {tape.note_text ? ` • "${tape.note_text}"` : ` • ${tape.duration_sec}s audio`}
                      </span>
                      <span style={{ color: tape.is_listened ? "#4ade80" : "#fbbf24", fontWeight: 700 }}>
                        {tape.is_listened ? "✓ Heard by Jaai" : "Sent (Waiting for Jaai)"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STATUS SELECTOR BOTTOM SHEET / MODAL */}
      {statusModalOpen && (
        <div style={styles.modalBackdrop} onClick={() => setStatusModalOpen(false)}>
          <div style={styles.modalSheet} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#f5d0fe" }}>Update Your Radio Status</span>
              <button onClick={() => setStatusModalOpen(false)} style={styles.closeModalBtn}>✕</button>
            </div>

            {/* Custom Status Input */}
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Type your own custom status..."
                value={customStatusInput}
                onChange={(e) => setCustomStatusInput(e.target.value)}
                style={styles.customStatusField}
              />
              <button
                onClick={() => customStatusInput.trim() && selectStatus(customStatusInput.trim())}
                style={styles.saveCustomBtn}
              >
                Set
              </button>
            </div>

            {/* Presets */}
            {STATUS_PRESETS.map((group) => (
              <div key={group.group} style={{ marginBottom: 12 }}>
                <div style={styles.presetGroupTitle}>{group.group}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {group.items.map((item) => (
                    <button
                      key={item}
                      onClick={() => selectStatus(item)}
                      style={{
                        ...styles.statusListItem,
                        background: stations[myStation]?.current_mood === item ? "#4c1d95" : "#1a0f33",
                        borderColor: stations[myStation]?.current_mood === item ? "#c084fc" : "#2e1759",
                      }}
                    >
                      <span>{item}</span>
                      {stations[myStation]?.current_mood === item && <span style={{ color: "#f472b6" }}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// STYLES
// ---------------------------------------------------------------------------
const styles = {
  screenWrap: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "12px",
    background: "radial-gradient(circle at top, #1e1035 0%, #090512 100%)",
  },
  radioChassis: {
    width: "100%",
    maxWidth: 430,
    background: "#130b24",
    border: "1.5px solid #3b1d6e",
    borderRadius: 28,
    padding: 14,
    boxShadow: "0 20px 60px rgba(0,0,0,0.75)",
  },
  topUtilityBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  streakPill: {
    fontSize: 11,
    fontWeight: 700,
    color: "#f5d0fe",
    background: "#231242",
    border: "1px solid #581c87",
    padding: "3px 9px",
    borderRadius: 999,
  },
  notifBtn: {
    fontSize: 10.5,
    fontWeight: 700,
    background: "#1b1033",
    border: "1px solid",
    padding: "3px 8px",
    borderRadius: 999,
    cursor: "pointer",
  },
  miniSwitchBtn: {
    fontSize: 11,
    color: "#c4b5fd",
    background: "transparent",
    border: "1px solid #3b1d6e",
    padding: "4px 8px",
    borderRadius: 8,
    cursor: "pointer",
  },
  bridgeCard: {
    background: "#1b1033",
    border: "1px solid #3b1d6e",
    borderRadius: 18,
    padding: 11,
    marginBottom: 10,
  },
  bridgeHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  freqDialText: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 17,
    fontWeight: 800,
    color: "#e9d5ff",
    letterSpacing: 1,
  },
  livePresenceBadge: {
    fontSize: 9.5,
    fontWeight: 800,
    padding: "3px 8px",
    borderRadius: 999,
    border: "1px solid",
  },
  citiesGrid: {
    display: "flex",
    alignItems: "stretch",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 8,
  },
  cityBox: {
    flex: 1,
    background: "#120924",
    border: "1.5px solid #2e1759",
    borderRadius: 12,
    padding: "7px 8px",
  },
  cityHeaderLine: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cityTitle: { fontSize: 11.5, fontWeight: 800, color: "#f3e8ff" },
  tempHighlight: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12.5,
    fontWeight: 800,
    color: "#f472b6",
  },
  weatherConditionLine: {
    fontSize: 10.5,
    color: "#d8b4fe",
    marginTop: 2,
    fontWeight: 600,
  },
  weatherMicroMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: 5,
    fontSize: 9,
    color: "#a78bfa",
    marginTop: 3,
  },
  cityMoodPill: {
    marginTop: 5,
    display: "inline-block",
    fontSize: 10,
    fontWeight: 600,
    color: "#e9d5ff",
    background: "#26154a",
    padding: "2px 6px",
    borderRadius: 6,
  },
  cityDivider: {
    display: "flex",
    alignItems: "center",
    fontSize: 14,
    color: "#a855f7",
    fontWeight: 800,
  },
  openStatusModalBtn: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "7px 10px",
    borderRadius: 10,
    background: "#130826",
    border: "1px dashed #581c87",
    color: "#e9d5ff",
    fontSize: 11,
    cursor: "pointer",
  },
  heartSectionCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    border: "1.5px solid #3b1d6e",
    borderRadius: 16,
    padding: "9px 11px",
    marginBottom: 10,
  },
  heartToggleBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: 999,
    border: "1.5px solid",
    color: "#fff",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  biometricCard: {
    background: "#170c2e",
    border: "1.5px solid #3b1d6e",
    borderRadius: 16,
    padding: "9px 11px",
    marginBottom: 10,
  },
  biometricHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  biometricExclusiveTag: {
    fontSize: 9,
    fontWeight: 800,
    color: "#e9d5ff",
    letterSpacing: 0.3,
  },
  biometricBpmBadge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    fontWeight: 800,
    color: "#fbcfe8",
    background: "#2e1065",
    border: "1px solid #7e22ce",
    padding: "1px 6px",
    borderRadius: 999,
  },
  biometricScannerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  thumbNode: {
    flex: 1,
    textAlign: "center",
    padding: "6px",
    borderRadius: 10,
    border: "1px solid #2e1759",
  },
  fingerprintPad: {
    width: 98,
    height: 60,
    borderRadius: 14,
    border: "1.5px dashed #a855f7",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#ffffff",
    cursor: "pointer",
    userSelect: "none",
  },
  tabBar: {
    display: "flex",
    gap: 6,
    marginBottom: 8,
  },
  tabBtn: {
    flex: 1,
    padding: "8px",
    borderRadius: 10,
    background: "#190e30",
    border: "1px solid #2e1759",
    color: "#a78bfa",
    fontSize: 11.5,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  tabBtnActive: {
    background: "#3b156b",
    borderColor: "#a855f7",
    color: "#ffffff",
  },
  unreadDot: {
    background: "#ec4899",
    color: "#fff",
    fontSize: 8.5,
    fontWeight: 800,
    padding: "2px 5px",
    borderRadius: 999,
  },
  deckContainer: {
    background: "#0f071e",
    border: "1.5px solid #3b1d6e",
    borderRadius: 16,
    padding: "12px",
    marginBottom: 10,
  },
  incomingHighlightBanner: {
    background: "linear-gradient(90deg, #ec4899, #9333ea)",
    color: "#ffffff",
    fontSize: 10.5,
    fontWeight: 800,
    textAlign: "center",
    padding: "4px 8px",
    borderRadius: 6,
    marginBottom: 8,
  },
  tapeMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9.5,
    color: "#c4b5fd",
    marginBottom: 6,
  },
  promptReplyTag: {
    fontSize: 10.5,
    color: "#f5d0fe",
    background: "#231142",
    border: "1px solid #581c87",
    borderRadius: 6,
    padding: "4px 7px",
    marginBottom: 8,
  },
  cassetteWindow: {
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    background: "#190d30",
    border: "1px solid #4c1d95",
    borderRadius: 12,
    padding: "12px 8px",
    marginBottom: 10,
  },
  reelWheel: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    border: "3.5px dashed #a855f7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#100720",
  },
  reelCore: {
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: "#c084fc",
  },
  cassetteCenterLabel: {
    textAlign: "center",
    padding: "5px 8px",
    borderRadius: 8,
    background: "#120824",
    border: "1px solid #3b1d6e",
  },
  lockedBanner: {
    background: "rgba(147, 51, 234, 0.16)",
    border: "1px dashed #a855f7",
    borderRadius: 10,
    padding: "10px",
    textAlign: "center",
  },
  playerControlsRow: {
    display: "flex",
    gap: 6,
  },
  navTapeBtn: {
    padding: "8px 10px",
    borderRadius: 8,
    background: "#1b1033",
    border: "1px solid #3b1d6e",
    color: "#d8b4fe",
    fontSize: 10.5,
    fontWeight: 700,
    cursor: "pointer",
  },
  playMainBtn: {
    flex: 1,
    padding: "9px",
    borderRadius: 8,
    border: "1px solid #f472b6",
    color: "#ffffff",
    fontSize: 11.5,
    fontWeight: 800,
    cursor: "pointer",
  },
  polaroidTabWrap: {
    display: "flex",
    justifyContent: "center",
  },
  polaroidFrame: {
    width: 270,
    background: "#faf5ff",
    borderRadius: 10,
    padding: "8px 8px 14px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
  },
  polaroidPhotoArea: {
    position: "relative",
    width: "100%",
    height: 160,
    background: "#1c1033",
    borderRadius: 6,
    overflow: "hidden",
  },
  polaroidDefaultArt: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  scratchCanvas: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    cursor: "grab",
    touchAction: "none",
  },
  instantRevealBtn: {
    width: "100%",
    marginTop: 6,
    padding: "4px",
    fontSize: 10.5,
    fontWeight: 700,
    color: "#7e22ce",
    background: "#f3e8ff",
    border: "1px solid #d8b4fe",
    borderRadius: 6,
    cursor: "pointer",
  },
  polaroidCaption: {
    marginTop: 8,
    fontFamily: "'Caveat', cursive",
    fontSize: 20,
    color: "#2e1065",
    textAlign: "center",
  },
  composerCard: {
    background: "#190e30",
    border: "1px solid #3b1d6e",
    borderRadius: 16,
    padding: 11,
  },
  chipToggle: {
    fontSize: 10,
    fontWeight: 700,
    border: "1px solid #581c87",
    padding: "3px 8px",
    borderRadius: 999,
    cursor: "pointer",
  },
  expandedPromptCard: {
    background: "#22113e",
    border: "1px solid #a855f7",
    borderRadius: 10,
    padding: "7px 10px",
    marginBottom: 8,
  },
  expandedTimeLockRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#22113e",
    border: "1px solid #ec4899",
    borderRadius: 10,
    padding: "5px 10px",
    marginBottom: 8,
  },
  composerInputRow: {
    display: "flex",
    gap: 6,
    marginBottom: 6,
  },
  textInput: {
    flex: 1,
    background: "#100821",
    border: "1px solid #3b1d6e",
    borderRadius: 8,
    padding: "7px 9px",
    color: "#f3e8ff",
    fontSize: 11.5,
  },
  photoUploadBtn: {
    background: "#261447",
    border: "1px solid #581c87",
    borderRadius: 8,
    padding: "7px 9px",
    fontSize: 11,
    fontWeight: 700,
    color: "#e9d5ff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    whiteSpace: "nowrap",
  },
  photoPreviewRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 10.5,
    color: "#d8b4fe",
    marginBottom: 6,
    padding: "0 2px",
  },
  timeInput: {
    background: "#160b29",
    color: "#fff",
    border: "1px solid #a855f7",
    borderRadius: 6,
    padding: "3px 6px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
  },
  pttButton: {
    width: "100%",
    border: "1.5px solid #e9d5ff",
    borderRadius: 14,
    padding: "12px",
    color: "#ffffff",
    cursor: "pointer",
    boxShadow: "0 6px 20px rgba(147, 51, 234, 0.4)",
    userSelect: "none",
  },
  sentFooterStatus: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 11,
    color: "#f5d0fe",
  },
  sentArchiveToggle: {
    background: "transparent",
    border: "none",
    color: "#a78bfa",
    fontSize: 10.5,
    cursor: "pointer",
    textDecoration: "underline",
  },
  sentArchiveList: {
    marginTop: 6,
    background: "#110822",
    border: "1px solid #2e1759",
    borderRadius: 8,
    padding: "6px",
    textAlign: "left",
  },
  sentArchiveItem: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 10,
    color: "#d8b4fe",
    padding: "4px 2px",
    borderBottom: "1px solid #1c1033",
  },
  modalBackdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.75)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 100,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 430,
    background: "#150c29",
    borderTop: "2px solid #581c87",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: "16px",
    maxHeight: "80vh",
    overflowY: "auto",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  closeModalBtn: {
    background: "transparent",
    border: "none",
    color: "#c4b5fd",
    fontSize: 16,
    cursor: "pointer",
  },
  customStatusField: {
    flex: 1,
    background: "#1f103d",
    border: "1px solid #581c87",
    borderRadius: 8,
    padding: "7px 10px",
    color: "#fff",
    fontSize: 11.5,
  },
  saveCustomBtn: {
    padding: "7px 14px",
    borderRadius: 8,
    background: "#7e22ce",
    border: "none",
    color: "#fff",
    fontSize: 11.5,
    fontWeight: 700,
    cursor: "pointer",
  },
  presetGroupTitle: {
    fontSize: 10,
    fontWeight: 800,
    color: "#a78bfa",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  statusListItem: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid",
    color: "#f3e8ff",
    fontSize: 11.5,
    textAlign: "left",
    cursor: "pointer",
  },
  lockCard: {
    width: "100%",
    maxWidth: 350,
    background: "#140b26",
    border: "1.5px solid #4c1d95",
    borderRadius: 22,
    padding: 20,
    textAlign: "center",
  },
  freqBadge: {
    display: "inline-block",
    fontSize: 10.5,
    fontWeight: 800,
    color: "#e9d5ff",
    background: "#2e1065",
    padding: "3px 10px",
    borderRadius: 999,
  },
  stationSwitchRow: {
    display: "flex",
    gap: 6,
    marginBottom: 16,
  },
  stationSelectBtn: {
    flex: 1,
    padding: "9px",
    borderRadius: 10,
    background: "#1c1033",
    border: "1px solid #3b1d6e",
    color: "#c4b5fd",
    fontSize: 11.5,
    fontWeight: 700,
    cursor: "pointer",
  },
  stationSelectBtnActive: {
    background: "#6b21a8",
    borderColor: "#d8b4fe",
    color: "#fff",
  },
  pinDotsRow: {
    display: "flex",
    justifyContent: "center",
    gap: 12,
    marginBottom: 16,
  },
  pinDot: {
    width: 13,
    height: 13,
    borderRadius: "50%",
    border: "1px solid #a855f7",
  },
  keypadGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
  },
  keypadBtn: {
    padding: "12px 0",
    fontSize: 15,
    fontWeight: 800,
    borderRadius: 10,
    background: "#1e1138",
    border: "1px solid #3b1d6e",
    color: "#f3e8ff",
    cursor: "pointer",
  },
};
