"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const PASSCODE = "0507";
const DISTANCE_KM = 1258;

const MOODS = [
  "Free to talk 🎙️",
  "In a meeting 💻",
  "Having food 🍜",
  "Stepped out 🛵",
  "Winding down 🌙",
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

// Map Open-Meteo WMO weather codes to rich icons & descriptions
function decodeWeatherCode(code) {
  if (code === 0) return { icon: "☀️", label: "Clear Sky" };
  if (code === 1) return { icon: "🌤️", label: "Mostly Clear" };
  if (code === 2) return { icon: "⛅", label: "Partly Cloudy" };
  if (code === 3) return { icon: "☁️", label: "Overcast" };
  if (code === 45 || code === 48) return { icon: "🌫️", label: "Misty / Haze" };
  if (code >= 51 && code <= 57) return { icon: "🌦️", label: "Light Drizzle" };
  if (code >= 61 && code <= 67) return { icon: "🌧️", label: "Rainy" };
  if (code >= 80 && code <= 82) return { icon: "🌦️", label: "Rain Showers" };
  if (code >= 95) return { icon: "⛈️", label: "Thunderstorm" };
  return { icon: "🌤️", label: "Pleasant" };
}

// Synthesized Walkie-Talkie Radio Static + Click (Web Audio API)
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
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationMs / 1000);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  } catch (e) {}
}

// Synthesized 72 BPM "Lub-Dub" Heartbeat Thump for Biometric Fingerprint Sync
function playHeartbeatLubDub() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();

    const triggerBeat = (delaySec, freq, gainPeak) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delaySec);
      osc.frequency.exponentialRampToValueAtTime(32, ctx.currentTime + delaySec + 0.14);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + delaySec);
      gain.gain.linearRampToValueAtTime(gainPeak, ctx.currentTime + delaySec + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delaySec + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delaySec);
      osc.stop(ctx.currentTime + delaySec + 0.17);
    };

    // Lub-dub
    triggerBeat(0, 95, 0.35);
    triggerBeat(0.18, 75, 0.25);
  } catch (e) {}
}

// Helper to fire native phone / browser notification
function sendPhoneNotification(title, body) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        vibrate: [100, 80, 150],
      });
    } catch (e) {}
  }
}

export default function WalkieTalkieApp() {
  // Auth & Station Identity ('bbi' or 'greno')
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [myStation, setMyStation] = useState("bbi");
  const [notifEnabled, setNotifEnabled] = useState(false);

  // Detailed Live Weather State for Bhubaneswar & Greater Noida
  const [weather, setWeather] = useState({
    bbi: { temp: "29°C", feels: "32°C", humidity: "68%", wind: "12 km/h", icon: "⛅", condition: "Partly Cloudy" },
    greno: { temp: "28°C", feels: "29°C", humidity: "45%", wind: "9 km/h", icon: "☀️", condition: "Clear Sky" },
  });

  // Station Statuses (Supabase synced)
  const [stations, setStations] = useState({
    bbi: { station_id: "bbi", display_name: "Sarthak • BBI", city: "Bhubaneswar", current_mood: "Free to talk 🎙️", heart_active: false, heart_updated_at: null },
    greno: { station_id: "greno", display_name: "Jaai • GreNo", city: "Greater Noida", current_mood: "Free to talk 🎙️", heart_active: false, heart_updated_at: null },
  });

  // All Transmissions from DB (filtered so you ONLY see incoming from partner)
  const [tapes, setTapes] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("tape"); // 'tape' | 'polaroid'
  const [isPlaying, setIsPlaying] = useState(false);
  const [nowTs, setNowTs] = useState(Date.now());
  const [sentToast, setSentToast] = useState("");

  // Recording & Composer State
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [noteText, setNoteText] = useState("");
  const [polaroidFile, setPolaroidFile] = useState(null);
  const [polaroidPreview, setPolaroidPreview] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("instant"); // 'instant' | 'scheduled'
  const [unlockTimeStr, setUnlockTimeStr] = useState("23:30");
  const [dailyRitualOn, setDailyRitualOn] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Realtime Presence & Exclusive Biometric Fingerprint Sync
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [myThumbDown, setMyThumbDown] = useState(false);
  const [partnerThumbDown, setPartnerThumbDown] = useState(false);
  const [syncSeconds, setSyncSeconds] = useState(0);
  const [lastPartnerTouchAt, setLastPartnerTouchAt] = useState(null);

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
  const partnerCity = myStation === "bbi" ? "Greater Noida" : "Bhubaneswar";

  const todayPrompt = useMemo(() => {
    const dayIndex = new Date().getDate() % DAILY_PROMPTS.length;
    return DAILY_PROMPTS[dayIndex];
  }, []);

  // Load saved PIN + Station + Notification status
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
      alert("Install this app via 'Add to Home Screen' on your phone to enable system alerts.");
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifEnabled(perm === "granted");
    if (perm === "granted") {
      sendPhoneNotification("12.10 MHz Alerts Active 📻", `You'll be notified whenever ${partnerName} transmits!`);
    }
  };

  // Fetch Rich Live Weather for Bhubaneswar & Greater Noida (Temp, Feels Like, Humidity, Wind, Sky Condition)
  useEffect(() => {
    async function fetchDetailedWeather() {
      try {
        const urlBbi =
          "https://api.open-meteo.com/v1/forecast?latitude=20.2961&longitude=85.8245&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m";
        const urlGreno =
          "https://api.open-meteo.com/v1/forecast?latitude=28.4744&longitude=77.5040&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m";

        const [bbiRes, grenoRes] = await Promise.all([
          fetch(urlBbi).then((r) => r.json()),
          fetch(urlGreno).then((r) => r.json()),
        ]);

        const formatCityWeather = (res, fallback) => {
          if (!res?.current) return fallback;
          const c = res.current;
          const decoded = decodeWeatherCode(c.weather_code);
          return {
            temp: `${Math.round(c.temperature_2m)}°C`,
            feels: `${Math.round(c.apparent_temperature)}°C`,
            humidity: `${Math.round(c.relative_humidity_2m)}%`,
            wind: `${Math.round(c.wind_speed_10m)} km/h`,
            icon: decoded.icon,
            condition: decoded.label,
          };
        };

        setWeather((prev) => ({
          bbi: formatCityWeather(bbiRes, prev.bbi),
          greno: formatCityWeather(grenoRes, prev.greno),
        }));
      } catch (e) {}
    }
    fetchDetailedWeather();
  }, []);

  // Load Supabase Data + Realtime Subscriptions + Notifications
  useEffect(() => {
    if (!unlocked || !supabase) return;

    async function loadInitialData() {
      const { data: statusData } = await supabase.from("station_status").select("*");
      if (statusData) {
        const map = {};
        statusData.forEach((s) => (map[s.station_id] = s));
        setStations((prev) => ({ ...prev, ...map }));
      }

      const { data: tapeData } = await supabase
        .from("transmissions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);
      if (tapeData) {
        setTapes(tapeData);
        setCurrentIndex(0);
      }
    }

    loadInitialData();

    const dbChannel = supabase
      .channel("db-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "station_status" }, (payload) => {
        if (payload.new) {
          const updated = payload.new;
          setStations((prev) => {
            const oldPartner = prev[updated.station_id];
            // Notify ONLY when partner turns on their heart or updates their mood
            if (updated.station_id !== myStation && oldPartner) {
              if (!oldPartner.heart_active && updated.heart_active) {
                playRadioBurst(120);
                if (navigator.vibrate) navigator.vibrate([80, 100, 140]);
                sendPhoneNotification(
                  `💓 ${partnerName}'s heart is beating for you!`,
                  `${partnerName} just turned ON the Heart Signal on 12.10 MHz.`
                );
              } else if (oldPartner.current_mood !== updated.current_mood) {
                sendPhoneNotification(
                  `📻 ${partnerName}'s Status Updated`,
                  `${partnerName} is now: ${updated.current_mood}`
                );
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
            const hasPhoto = Boolean(newTape.polaroid_url || newTape.note_text);
            sendPhoneNotification(
              `🎙️ New Transmission from ${partnerName}!`,
              hasPhoto
                ? `${partnerName} sent a Voice Tape + Polaroid Note on 12.10 MHz!`
                : `${partnerName} sent a ${newTape.duration_sec || 5}s Voice Tape on 12.10 MHz!`
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
          if (payload.down) {
            setLastPartnerTouchAt(new Date());
            if (navigator.vibrate) navigator.vibrate([70, 100, 120]);
            sendPhoneNotification(
              `👆 ${partnerName}'s thumb is on the Biometric Scanner!`,
              `Place your thumb on the 12.10 MHz scanner to lock heartbeats.`
            );
          }
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

  // Live 72 BPM Heartbeat Loop & Timer when BOTH thumbs touch the Biometric Scanner
  useEffect(() => {
    if (!myThumbDown || !partnerThumbDown) {
      setSyncSeconds(0);
      return;
    }

    // Immediate lub-dub + vibration upon connection
    playHeartbeatLubDub();
    if (navigator.vibrate) navigator.vibrate([70, 120, 110]);

    const beatInterval = setInterval(() => {
      playHeartbeatLubDub();
      if (navigator.vibrate) navigator.vibrate([60, 110, 95]);
    }, 850); // ~70 BPM heartbeat rhythm

    const timerInterval = setInterval(() => {
      setSyncSeconds((s) => +(s + 0.1).toFixed(1));
    }, 100);

    return () => {
      clearInterval(beatInterval);
      clearInterval(timerInterval);
    };
  }, [myThumbDown, partnerThumbDown]);

  // STRICT FILTER: You ONLY see incoming tapes from your partner (never your own sent notes)
  const incomingTapes = useMemo(() => {
    return tapes.filter((t) => t.sender !== myStation);
  }, [tapes, myStation]);

  const myLastSentTape = useMemo(() => {
    return tapes.find((t) => t.sender === myStation) || null;
  }, [tapes, myStation]);

  // Calculate Day Streak only (No KM Bridged counter)
  const streakDays = useMemo(() => {
    const uniqueDays = new Set(tapes.map((t) => new Date(t.created_at).toDateString())).size;
    return Math.max(uniqueDays, tapes.length > 0 ? 1 : 0);
  }, [tapes]);

  const currentTape = incomingTapes[currentIndex] || null;
  const isUnreadPartnerTape = Boolean(currentTape && !currentTape.is_listened);

  // Check if current incoming tape is Time-Locked or Daily Ritual Locked
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
        type: "time",
        reason: `This message can be opened after ${formattedTime}`,
      };
    }

    if (currentTape.require_reply_unlock) {
      const tapeSentTime = new Date(currentTape.created_at).getTime();
      const iRepliedAfter = tapes.some(
        (t) => t.sender === myStation && new Date(t.created_at).getTime() > tapeSentTime
      );
      if (!iRepliedAfter) {
        return {
          locked: true,
          type: "double_blind",
          reason: `Daily Ritual Lock! Record & send your own voice note below to unlock ${partnerName}'s tape.`,
        };
      }
    }

    return { locked: false, reason: "" };
  }, [currentTape, nowTs, myStation, tapes, partnerName]);

  // Initialize Scratch-to-Develop Darkroom Canvas when viewing an undeveloped Polaroid
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
    ctx.font = "bold 14px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("✨ UNEXPOSED DARKROOM FILM ✨", canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = "12px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "#c084fc";
    ctx.fillText("Rub across with your thumb to develop", canvas.width / 2, canvas.height / 2 + 16);
  }, [activeTab, currentTape]);

  const handleScratchMove = async (e) => {
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
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.fill();

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparentPixels = 0;
    for (let i = 3; i < imgData.length; i += 16) {
      if (imgData[i] < 128) transparentPixels++;
    }
    const ratio = transparentPixels / (imgData.length / 16);
    if (ratio > 0.45) {
      if (navigator.vibrate) navigator.vibrate(40);
      setTapes((prev) =>
        prev.map((t) => (t.id === currentTape.id ? { ...t, polaroid_developed: true } : t))
      );
      if (supabase) {
        await supabase.from("transmissions").update({ polaroid_developed: true }).eq("id", currentTape.id);
      }
    }
  };

  // Update Mood
  const updateMyMood = async (mood) => {
    setStations((prev) => ({
      ...prev,
      [myStation]: { ...prev[myStation], current_mood: mood },
    }));
    if (supabase) {
      await supabase
        .from("station_status")
        .update({ current_mood: mood, updated_at: new Date().toISOString() })
        .eq("station_id", myStation);
    }
  };

  // Toggle Thinking of You Heart (Sends signal to Partner's UI)
  const toggleHeartSignal = async () => {
    const currentVal = Boolean(stations[myStation]?.heart_active);
    const nextVal = !currentVal;
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

  // Broadcast Biometric Thumb-Touch Radar
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

  // Play / Stop Incoming Partner Voice Tape & Mark as Listened
  const togglePlayTape = async () => {
    if (!currentTape || lockStatus.locked) return;
    if (!audioPlayerRef.current) return;

    if (isPlaying) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      playRadioBurst(160);
      audioPlayerRef.current.src = currentTape.audio_url;
      audioPlayerRef.current.play();
      setIsPlaying(true);

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

  // Start / Stop Push-to-Talk Recording
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
        await uploadAndSendTransmission(blob, recorder.mimeType || "audio/webm");
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch (err) {
      alert("Please allow microphone access to transmit on 12.10 MHz.");
    }
  };

  const stopRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;
    clearInterval(recTimerRef.current);
    setIsRecording(false);
    mediaRecorderRef.current.stop();
  };

  // Upload Audio + Optional Polaroid to Partner's Receiver
  const uploadAndSendTransmission = async (audioBlob, mimeType) => {
    setIsUploading(true);
    try {
      let unlockIso = new Date().toISOString();
      if (deliveryMode === "scheduled" && unlockTimeStr) {
        const [hh, mm] = unlockTimeStr.split(":").map(Number);
        const target = new Date();
        target.setHours(hh, mm, 0, 0);
        if (target.getTime() <= Date.now()) {
          target.setDate(target.getDate() + 1);
        }
        unlockIso = target.toISOString();
      }

      let audioPublicUrl = URL.createObjectURL(audioBlob);
      let polaroidPublicUrl = polaroidPreview || null;

      if (supabase) {
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const fileName = `${myStation}-${Date.now()}.${ext}`;
        const { error: audioErr } = await supabase.storage
          .from("voice-notes")
          .upload(fileName, audioBlob, { contentType: mimeType });

        if (!audioErr) {
          const { data } = supabase.storage.from("voice-notes").getPublicUrl(fileName);
          audioPublicUrl = data.publicUrl;
        }

        if (polaroidFile) {
          const imgName = `${myStation}-polaroid-${Date.now()}`;
          const { error: imgErr } = await supabase.storage
            .from("polaroids")
            .upload(imgName, polaroidFile);
          if (!imgErr) {
            const { data } = supabase.storage.from("polaroids").getPublicUrl(imgName);
            polaroidPublicUrl = data.publicUrl;
          }
        }

        const newRow = {
          sender: myStation,
          audio_url: audioPublicUrl,
          duration_sec: Math.max(recSeconds, 1),
          note_text: noteText.trim() || null,
          polaroid_url: polaroidPublicUrl,
          polaroid_developed: false,
          unlock_at: unlockIso,
          require_reply_unlock: dailyRitualOn,
          prompt_text: dailyRitualOn ? todayPrompt : null,
          is_listened: false,
        };

        await supabase.from("transmissions").insert([newRow]);
      }

      setNoteText("");
      setPolaroidFile(null);
      setPolaroidPreview("");
      setDeliveryMode("instant");
      setDailyRitualOn(false);
      setSentToast(`✓ Transmitted to ${partnerName}'s radio!`);
      setTimeout(() => setSentToast(""), 4500);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle PIN Keypad
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
  // RENDER 1: 0507 FREQUENCY LOCK SCREEN
  // -------------------------------------------------------------------------
  if (!unlocked) {
    return (
      <div style={styles.screenWrap}>
        <div style={styles.lockCard}>
          <div style={styles.freqBadge}>PRIVATE FREQUENCY • 12.10 MHz</div>
          <h1 style={{ margin: "10px 0 4px", fontSize: 22, fontWeight: 800 }}>BBI ↔ GreNo Radio</h1>
          <p style={{ margin: "0 0 18px", fontSize: 13, color: "#c4b5fd" }}>
            Select your station & enter the 4-digit frequency lock
          </p>

          <div style={styles.stationSwitchRow}>
            <button
              onClick={() => setMyStation("bbi")}
              style={{
                ...styles.stationSelectBtn,
                ...(myStation === "bbi" ? styles.stationSelectBtnActive : {}),
              }}
            >
              📡 Sarthak • BBI
            </button>
            <button
              onClick={() => setMyStation("greno")}
              style={{
                ...styles.stationSelectBtn,
                ...(myStation === "greno" ? styles.stationSelectBtnActive : {}),
              }}
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
  // RENDER 2: MAIN 12.10 MHz WALKIE-TALKIE CHASSIS
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
        {/* TOP BAR: STREAK + PHONE ALERTS + STATION SWITCH */}
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

        {/* BHUBANESWAR <-> GREATER NOIDA BRIDGE WITH DETAILED WEATHER */}
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
            {/* SARTHAK - BHUBANESWAR WEATHER CARD */}
            <div
              style={{
                ...styles.cityBox,
                borderColor: myStation === "bbi" ? "#a855f7" : "#2e1759",
              }}
            >
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

            {/* JAAI - GREATER NOIDA WEATHER CARD */}
            <div
              style={{
                ...styles.cityBox,
                borderColor: myStation === "greno" ? "#a855f7" : "#2e1759",
              }}
            >
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

          {/* WRAPPED MOOD CHIPS */}
          <div style={styles.moodWrapRow}>
            {MOODS.map((mood) => {
              const active = stations[myStation]?.current_mood === mood;
              return (
                <button
                  key={mood}
                  onClick={() => updateMyMood(mood)}
                  style={{
                    ...styles.moodChip,
                    ...(active ? styles.moodChipActive : {}),
                  }}
                >
                  {mood}
                </button>
              );
            })}
          </div>
        </div>

        {/* PERSPECTIVE-AWARE "THINKING OF YOU" HEART BAR */}
        <div
          style={{
            ...styles.heartSectionCard,
            borderColor: partnerHeartOn ? "#ec4899" : myHeartOn ? "#9333ea" : "#3b1d6e",
            background: partnerHeartOn
              ? "linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(147, 51, 234, 0.18))"
              : "#190e30",
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {/* Receiver Heart LED: Pulses on YOUR screen when PARTNER's heart is ON */}
              <span
                style={{
                  display: "inline-block",
                  fontSize: 15,
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
                  ? `Beating on ${partnerName}'s Screen...`
                  : `Thinking of You Signal`}
              </span>
            </div>

            <div style={{ fontSize: 11, color: "#d8b4fe", marginTop: 3, lineHeight: 1.35 }}>
              {myHeartOn && partnerHeartOn
                ? `You & ${partnerName} both have your heart signals switched ON right now 💞`
                : partnerHeartOn
                ? `Incoming live signal from ${partnerCity} • Tap your button to beat back!`
                : myHeartOn
                ? `${partnerName}'s UI now shows: "${myName}'s heart is beating for you 💓"`
                : `Tap ON so ${partnerName} sees "${myName}'s heart is beating for you 💓" on her UI`}
            </div>
          </div>

          <button
            onClick={toggleHeartSignal}
            style={{
              ...styles.heartToggleBtn,
              background: myHeartOn
                ? "linear-gradient(135deg, #ec4899, #9333ea)"
                : "#1e1336",
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
              style={{
                animation: myHeartOn ? "pulseHeart 1.2s infinite ease-in-out" : "none",
              }}
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span style={{ fontSize: 11, fontWeight: 800 }}>
              {myHeartOn ? "SENT: ON" : "SEND"}
            </span>
          </button>
        </div>

        {/* EXCLUSIVE BIOMETRIC FINGERPRINT SYNC MODULE (ALWAYS AVAILABLE) */}
        <div
          style={{
            ...styles.biometricCard,
            borderColor: bothThumbsSynced
              ? "#f472b6"
              : partnerThumbDown
              ? "#c084fc"
              : "#3b1d6e",
            animation: bothThumbsSynced ? "biometricPulse 1.2s infinite ease-in-out" : "none",
          }}
        >
          <div style={styles.biometricHeader}>
            <span style={styles.biometricExclusiveTag}>
              🔒 EXCLUSIVE BIOMETRIC SYNC • SARTHAK × JAAI
            </span>
            <span style={styles.biometricBpmBadge}>
              {bothThumbsSynced
                ? `💞 72 BPM • ${syncSeconds.toFixed(1)}s`
                : partnerThumbDown
                ? `⚡ ${partnerName.toUpperCase()} WAITING`
                : "12.10 MHz LINK"}
            </span>
          </div>

          <div style={styles.biometricScannerRow}>
            {/* SARTHAK (BBI) THUMB STATUS */}
            <div
              style={{
                ...styles.thumbNode,
                borderColor:
                  (myStation === "bbi" ? myThumbDown : partnerThumbDown) ? "#ec4899" : "#2e1759",
                background:
                  (myStation === "bbi" ? myThumbDown : partnerThumbDown)
                    ? "rgba(236, 72, 153, 0.18)"
                    : "#120924",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 800, color: "#f5d0fe" }}>SARTHAK</div>
              <div style={{ fontSize: 9, color: "#a78bfa", marginTop: 2 }}>
                {(myStation === "bbi" ? myThumbDown : partnerThumbDown)
                  ? "🟢 THUMB ON"
                  : "⚪ STANDBY"}
              </div>
            </div>

            {/* CENTER INTERACTIVE FINGERPRINT PAD */}
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
                borderColor: bothThumbsSynced
                  ? "#fbcfe8"
                  : myThumbDown || partnerThumbDown
                  ? "#e879f9"
                  : "#6b21a8",
              }}
            >
              {/* Intricate Biometric Fingerprint SVG */}
              <svg
                width="34"
                height="34"
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
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.4, marginTop: 3 }}>
                {bothThumbsSynced
                  ? "PULSE LOCKED"
                  : myThumbDown
                  ? "SCANNING..."
                  : "HOLD THUMB"}
              </span>
            </div>

            {/* JAAI (GRENO) THUMB STATUS */}
            <div
              style={{
                ...styles.thumbNode,
                borderColor:
                  (myStation === "greno" ? myThumbDown : partnerThumbDown) ? "#ec4899" : "#2e1759",
                background:
                  (myStation === "greno" ? myThumbDown : partnerThumbDown)
                    ? "rgba(236, 72, 153, 0.18)"
                    : "#120924",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 800, color: "#f5d0fe" }}>JAAI</div>
              <div style={{ fontSize: 9, color: "#a78bfa", marginTop: 2 }}>
                {(myStation === "greno" ? myThumbDown : partnerThumbDown)
                  ? "🟢 THUMB ON"
                  : "⚪ STANDBY"}
              </div>
            </div>
          </div>

          <div style={styles.biometricFooterText}>
            {bothThumbsSynced
              ? `💞 Biometric bridge active across 1,258 KM! Feel the live 72 BPM heartbeat pulse.`
              : partnerThumbDown
              ? `👆 ${partnerName}'s thumb is on the sensor right now! Hold the fingerprint pad to sync.`
              : myThumbDown
              ? `📡 Pinging ${partnerName}'s walkie-talkie... keep holding your thumb on the sensor.`
              : lastPartnerTouchAt
              ? `Last biometric touch from ${partnerName} at ${lastPartnerTouchAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })}`
              : `Hold your thumb on the scanner simultaneously with ${partnerName} for live heartbeat haptics`}
          </div>
        </div>

        {/* SEPARATE TABS FOR INCOMING PARTNER MESSAGES ONLY */}
        <div style={styles.tabBar}>
          <button
            onClick={() => setActiveTab("tape")}
            style={{
              ...styles.tabBtn,
              ...(activeTab === "tape" ? styles.tabBtnActive : {}),
            }}
          >
            📻 {partnerName}&apos;s Voice Tape
            {isUnreadPartnerTape && <span style={styles.unreadDot}>NEW</span>}
          </button>
          <button
            onClick={() => setActiveTab("polaroid")}
            style={{
              ...styles.tabBtn,
              ...(activeTab === "polaroid" ? styles.tabBtnActive : {}),
            }}
          >
            📸 {partnerName}&apos;s Polaroid
            {currentTape && (currentTape.note_text || currentTape.polaroid_url) && (
              <span style={styles.unreadDot}>✦</span>
            )}
          </button>
        </div>

        {/* INCOMING RECEIVER DECK (HIGHLIGHTS WHEN NEW MESSAGE FROM PARTNER ARRIVES) */}
        <div
          style={{
            ...styles.deckContainer,
            animation: isUnreadPartnerTape ? "incomingGlow 2s infinite ease-in-out" : "none",
            borderColor: isUnreadPartnerTape ? "#ec4899" : "#3b1d6e",
          }}
        >
          {!currentTape ? (
            <div style={{ textAlign: "center", padding: "22px 12px", color: "#c4b5fd", fontSize: 13 }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>📻</div>
              Waiting for incoming transmissions from <strong>{partnerName}</strong>...
              <div style={{ fontSize: 11, color: "#a78bfa", marginTop: 4 }}>
                (One-way walkie-talkie: voice notes & Polaroids you send appear only on {partnerName}&apos;s receiver)
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
                  INCOMING {String(currentIndex + 1).padStart(2, "0")}/
                  {String(incomingTapes.length).padStart(2, "0")} • FROM {partnerName.toUpperCase()}
                </span>
                <span>
                  {new Date(currentTape.created_at).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
              </div>

              {currentTape.prompt_text && (
                <div style={styles.promptReplyTag}>
                  🎲 Ritual Prompt: &ldquo;{currentTape.prompt_text}&rdquo;
                </div>
              )}

              {/* CASSETTE REELS WINDOW */}
              <div style={styles.cassetteWindow}>
                <div
                  style={{
                    ...styles.reelWheel,
                    animation: isPlaying ? "spinReel 2.2s linear infinite" : "none",
                  }}
                >
                  <div style={styles.reelCore} />
                </div>

                <div style={styles.cassetteCenterLabel}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#f5d0fe" }}>12.10 MHz</div>
                  <div style={{ fontSize: 9, color: "#a78bfa", marginTop: 2 }}>
                    {isPlaying ? "PLAYING AUDIO..." : `${currentTape.duration_sec || 5}s VOICE TAPE`}
                  </div>
                </div>

                <div
                  style={{
                    ...styles.reelWheel,
                    animation: isPlaying ? "spinReel 2.2s linear infinite" : "none",
                  }}
                >
                  <div style={styles.reelCore} />
                </div>
              </div>

              {/* LOCK STATUS OR PLAY CONTROLS */}
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
                      background: isUnreadPartnerTape
                        ? "linear-gradient(135deg, #ec4899, #9333ea)"
                        : "linear-gradient(135deg, #9333ea, #7e22ce)",
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
            /* DEDICATED POLAROID TAB (ONLY FOR PARTNER'S INCOMING POLAROIDS) */
            <div style={styles.polaroidTabWrap}>
              {lockStatus.locked ? (
                <div style={styles.lockedBanner}>
                  🔒 Polaroid is locked: {lockStatus.reason}
                </div>
              ) : !currentTape.polaroid_url && !currentTape.note_text ? (
                <div style={{ padding: "24px 12px", textAlign: "center", color: "#a78bfa", fontSize: 12 }}>
                  No Polaroid photo or note was attached to this voice tape from {partnerName}.
                </div>
              ) : (
                <div style={styles.polaroidFrame}>
                  <div style={styles.polaroidPhotoArea}>
                    {currentTape.polaroid_url ? (
                      <img
                        src={currentTape.polaroid_url}
                        alt="Polaroid memory"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={styles.polaroidDefaultArt}>
                        <div style={{ fontSize: 28 }}>💜 📻 ✨</div>
                        <div style={{ fontSize: 12, marginTop: 6, color: "#e9d5ff" }}>
                          Note from {partnerName}
                        </div>
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

                  <div style={styles.polaroidCaption}>
                    {currentTape.note_text || `From ${partnerName} 💜`}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* TRANSMIT COMPOSER (SENDS ONE-WAY TO PARTNER) */}
        <div style={styles.composerCard}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#d8b4fe", marginBottom: 8 }}>
            🎙️ TRANSMIT TO {partnerName.toUpperCase()} (ONE-WAY RADIO)
          </div>

          {/* UNIFIED DAILY RITUAL + RECORD-TO-UNLOCK CARD */}
          <div
            onClick={() => setDailyRitualOn((v) => !v)}
            style={{
              ...styles.ritualUnifiedCard,
              borderColor: dailyRitualOn ? "#ec4899" : "#4c1d95",
              background: dailyRitualOn ? "rgba(236, 72, 153, 0.15)" : "#211140",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#f5d0fe" }}>
                🎲 Daily Ritual • Record-to-Unlock
              </span>
              <span
                style={{
                  ...styles.ritualToggleBadge,
                  background: dailyRitualOn ? "#ec4899" : "#3b1d6e",
                }}
              >
                {dailyRitualOn ? "ACTIVE 🔒" : "TAP TO ATTACH"}
              </span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#ffffff", marginTop: 4 }}>
              &ldquo;{todayPrompt}&rdquo;
            </div>
            <div style={{ fontSize: 10, color: "#d8b4fe", marginTop: 3 }}>
              {dailyRitualOn
                ? `✓ ${partnerName} must record her own answer to this prompt before your voice tape unlocks!`
                : `Optional: Tap this card so ${partnerName} must record a reply before hearing your tape.`}
            </div>
          </div>

          {/* OPTIONAL POLAROID NOTE & PHOTO INPUT */}
          <div style={styles.composerInputRow}>
            <input
              type="text"
              placeholder={`Optional Polaroid note for ${partnerName}...`}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              style={styles.textInput}
            />
            <label style={styles.photoUploadBtn}>
              📷 {polaroidFile ? "Photo Added ✓" : "Add Photo"}
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

          {/* CLEAN 2-BUTTON DELIVERY TIMING: INSTANT vs OPEN AFTER TIME */}
          <div style={styles.deliveryModeRow}>
            <button
              onClick={() => setDeliveryMode("instant")}
              style={{
                ...styles.modePill,
                ...(deliveryMode === "instant" ? styles.modePillActive : {}),
              }}
            >
              ⚡ Instant Delivery (Default)
            </button>

            <button
              onClick={() => setDeliveryMode("scheduled")}
              style={{
                ...styles.modePill,
                ...(deliveryMode === "scheduled" ? styles.modePillActive : {}),
              }}
            >
              🔒 Open After Time...
            </button>
          </div>

          {deliveryMode === "scheduled" && (
            <div style={styles.customTimePickerRow}>
              <span style={{ fontSize: 12, color: "#e9d5ff" }}>
                {partnerName} can open after:
              </span>
              <input
                type="time"
                value={unlockTimeStr}
                onChange={(e) => setUnlockTimeStr(e.target.value)}
                style={styles.timeInput}
              />
            </div>
          )}

          {/* PUSH TO TALK BUTTON */}
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
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 0.5 }}>
              {isUploading
                ? `SENDING TO ${partnerName.toUpperCase()}...`
                : isRecording
                ? `🔴 RECORDING (${recSeconds}s) — RELEASE TO SEND`
                : `🎙️ HOLD TO TALK TO ${partnerName.toUpperCase()}`}
            </div>
            <div style={{ fontSize: 11, color: "#f3e8ff", opacity: 0.85, marginTop: 3 }}>
              Once released, voice & Polaroid go strictly to {partnerName}&apos;s receiver
            </div>
          </button>

          {/* SENT CONFIRMATION */}
          {(sentToast || myLastSentTape) && (
            <div style={styles.sentFooterStatus}>
              {sentToast ||
                `✓ Your last transmission was sent to ${partnerName} at ${new Date(
                  myLastSentTape.created_at
                ).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })}`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CLEAN MIDNIGHT PURPLE & LAVENDER STYLES
// ---------------------------------------------------------------------------
const styles = {
  screenWrap: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "14px",
    background: "radial-gradient(circle at top, #1e1035 0%, #090512 100%)",
  },
  radioChassis: {
    width: "100%",
    maxWidth: 430,
    background: "#130b24",
    border: "1.5px solid #3b1d6e",
    borderRadius: 28,
    padding: 16,
    boxShadow: "0 20px 60px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.08)",
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
    padding: "4px 10px",
    borderRadius: 999,
  },
  notifBtn: {
    fontSize: 11,
    fontWeight: 700,
    background: "#1b1033",
    border: "1px solid",
    padding: "4px 9px",
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
    padding: 12,
    marginBottom: 12,
  },
  bridgeHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  freqDialText: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 18,
    fontWeight: 800,
    color: "#e9d5ff",
    letterSpacing: 1,
  },
  livePresenceBadge: {
    fontSize: 10,
    fontWeight: 800,
    padding: "4px 9px",
    borderRadius: 999,
    border: "1px solid",
  },
  citiesGrid: {
    display: "flex",
    alignItems: "stretch",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 10,
  },
  cityBox: {
    flex: 1,
    background: "#120924",
    border: "1.5px solid #2e1759",
    borderRadius: 12,
    padding: "8px 9px",
  },
  cityHeaderLine: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cityTitle: { fontSize: 12, fontWeight: 800, color: "#f3e8ff" },
  tempHighlight: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13,
    fontWeight: 800,
    color: "#f472b6",
  },
  weatherConditionLine: {
    fontSize: 11,
    color: "#d8b4fe",
    marginTop: 3,
    fontWeight: 600,
  },
  weatherMicroMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    fontSize: 9.5,
    color: "#a78bfa",
    marginTop: 4,
  },
  cityMoodPill: {
    marginTop: 6,
    display: "inline-block",
    fontSize: 10.5,
    fontWeight: 600,
    color: "#e9d5ff",
    background: "#26154a",
    padding: "3px 8px",
    borderRadius: 8,
  },
  cityDivider: {
    display: "flex",
    alignItems: "center",
    fontSize: 15,
    color: "#a855f7",
    fontWeight: 800,
  },
  moodWrapRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  moodChip: {
    fontSize: 11,
    padding: "5px 10px",
    borderRadius: 999,
    background: "#120924",
    color: "#c4b5fd",
    border: "1px solid #2e1759",
    cursor: "pointer",
  },
  moodChipActive: {
    background: "#7e22ce",
    color: "#ffffff",
    borderColor: "#c084fc",
    fontWeight: 700,
  },
  heartSectionCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    border: "1.5px solid #3b1d6e",
    borderRadius: 16,
    padding: "10px 12px",
    marginBottom: 12,
  },
  heartToggleBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "9px 12px",
    borderRadius: 999,
    border: "1.5px solid",
    color: "#fff",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  biometricCard: {
    background: "#170c2e",
    border: "1.5px solid #3b1d6e",
    borderRadius: 18,
    padding: "10px 12px",
    marginBottom: 12,
  },
  biometricHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  biometricExclusiveTag: {
    fontSize: 9.5,
    fontWeight: 800,
    color: "#e9d5ff",
    letterSpacing: 0.4,
  },
  biometricBpmBadge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9.5,
    fontWeight: 800,
    color: "#fbcfe8",
    background: "#2e1065",
    border: "1px solid #7e22ce",
    padding: "2px 7px",
    borderRadius: 999,
  },
  biometricScannerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  thumbNode: {
    flex: 1,
    textAlign: "center",
    padding: "8px 6px",
    borderRadius: 12,
    border: "1px solid #2e1759",
  },
  fingerprintPad: {
    width: 108,
    height: 68,
    borderRadius: 16,
    border: "1.5px dashed #a855f7",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#ffffff",
    cursor: "pointer",
    userSelect: "none",
    WebkitUserSelect: "none",
  },
  biometricFooterText: {
    fontSize: 10.5,
    color: "#c4b5fd",
    textAlign: "center",
    marginTop: 8,
  },
  tabBar: {
    display: "flex",
    gap: 8,
    marginBottom: 10,
  },
  tabBtn: {
    flex: 1,
    padding: "9px",
    borderRadius: 12,
    background: "#190e30",
    border: "1px solid #2e1759",
    color: "#a78bfa",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  tabBtnActive: {
    background: "#3b156b",
    borderColor: "#a855f7",
    color: "#ffffff",
  },
  unreadDot: {
    background: "#ec4899",
    color: "#fff",
    fontSize: 9,
    fontWeight: 800,
    padding: "2px 6px",
    borderRadius: 999,
  },
  deckContainer: {
    background: "#0f071e",
    border: "1.5px solid #3b1d6e",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  incomingHighlightBanner: {
    background: "linear-gradient(90deg, #ec4899, #9333ea)",
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 800,
    textAlign: "center",
    padding: "5px 10px",
    borderRadius: 8,
    marginBottom: 10,
    letterSpacing: 0.4,
  },
  tapeMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    color: "#c4b5fd",
    marginBottom: 8,
  },
  promptReplyTag: {
    fontSize: 11,
    color: "#f5d0fe",
    background: "#231142",
    border: "1px solid #581c87",
    borderRadius: 8,
    padding: "5px 8px",
    marginBottom: 10,
  },
  cassetteWindow: {
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    background: "#190d30",
    border: "1px solid #4c1d95",
    borderRadius: 14,
    padding: "14px 10px",
    marginBottom: 12,
  },
  reelWheel: {
    width: 54,
    height: 54,
    borderRadius: "50%",
    border: "4px dashed #a855f7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#100720",
  },
  reelCore: {
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: "#c084fc",
  },
  cassetteCenterLabel: {
    textAlign: "center",
    padding: "6px 10px",
    borderRadius: 10,
    background: "#120824",
    border: "1px solid #3b1d6e",
  },
  lockedBanner: {
    background: "rgba(147, 51, 234, 0.16)",
    border: "1px dashed #a855f7",
    borderRadius: 12,
    padding: "12px",
    textAlign: "center",
  },
  playerControlsRow: {
    display: "flex",
    gap: 8,
  },
  navTapeBtn: {
    padding: "10px 12px",
    borderRadius: 10,
    background: "#1b1033",
    border: "1px solid #3b1d6e",
    color: "#d8b4fe",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  },
  playMainBtn: {
    flex: 1,
    padding: "10px",
    borderRadius: 10,
    border: "1px solid #f472b6",
    color: "#ffffff",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  polaroidTabWrap: {
    display: "flex",
    justifyContent: "center",
    padding: "4px 0",
  },
  polaroidFrame: {
    width: 280,
    background: "#faf5ff",
    borderRadius: 12,
    padding: "10px 10px 16px",
    boxShadow: "0 10px 28px rgba(0,0,0,0.5)",
  },
  polaroidPhotoArea: {
    position: "relative",
    width: "100%",
    height: 170,
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
  polaroidCaption: {
    marginTop: 10,
    fontFamily: "'Caveat', cursive",
    fontSize: 21,
    color: "#2e1065",
    textAlign: "center",
  },
  composerCard: {
    background: "#190e30",
    border: "1px solid #3b1d6e",
    borderRadius: 18,
    padding: 12,
  },
  ritualUnifiedCard: {
    border: "1.5px solid",
    borderRadius: 12,
    padding: "9px 11px",
    marginBottom: 10,
    cursor: "pointer",
    userSelect: "none",
  },
  ritualToggleBadge: {
    fontSize: 9,
    fontWeight: 800,
    color: "#ffffff",
    padding: "3px 8px",
    borderRadius: 999,
  },
  composerInputRow: {
    display: "flex",
    gap: 6,
    marginBottom: 8,
  },
  textInput: {
    flex: 1,
    background: "#100821",
    border: "1px solid #3b1d6e",
    borderRadius: 10,
    padding: "8px 10px",
    color: "#f3e8ff",
    fontSize: 12,
  },
  photoUploadBtn: {
    background: "#261447",
    border: "1px solid #581c87",
    borderRadius: 10,
    padding: "8px 10px",
    fontSize: 11,
    fontWeight: 700,
    color: "#e9d5ff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    whiteSpace: "nowrap",
  },
  deliveryModeRow: {
    display: "flex",
    gap: 6,
    marginBottom: 10,
  },
  modePill: {
    flex: 1,
    padding: "7px 6px",
    fontSize: 11,
    borderRadius: 8,
    background: "#100821",
    border: "1px solid #2e1759",
    color: "#c4b5fd",
    cursor: "pointer",
  },
  modePillActive: {
    background: "#581c87",
    borderColor: "#c084fc",
    color: "#fff",
    fontWeight: 700,
  },
  customTimePickerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#100821",
    border: "1px solid #4c1d95",
    borderRadius: 10,
    padding: "6px 10px",
    marginBottom: 10,
  },
  timeInput: {
    background: "#261447",
    color: "#fff",
    border: "1px solid #9333ea",
    borderRadius: 6,
    padding: "4px 8px",
    fontFamily: "'JetBrains Mono', monospace",
  },
  pttButton: {
    width: "100%",
    border: "1.5px solid #e9d5ff",
    borderRadius: 16,
    padding: "14px 12px",
    color: "#ffffff",
    cursor: "pointer",
    boxShadow: "0 8px 25px rgba(147, 51, 234, 0.45)",
    userSelect: "none",
  },
  sentFooterStatus: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 11,
    color: "#c4b5fd",
  },
  lockCard: {
    width: "100%",
    maxWidth: 360,
    background: "#140b26",
    border: "1.5px solid #4c1d95",
    borderRadius: 24,
    padding: 22,
    textAlign: "center",
  },
  freqBadge: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 800,
    color: "#e9d5ff",
    background: "#2e1065",
    padding: "4px 12px",
    borderRadius: 999,
  },
  stationSwitchRow: {
    display: "flex",
    gap: 8,
    marginBottom: 18,
  },
  stationSelectBtn: {
    flex: 1,
    padding: "10px",
    borderRadius: 12,
    background: "#1c1033",
    border: "1px solid #3b1d6e",
    color: "#c4b5fd",
    fontSize: 12,
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
    gap: 14,
    marginBottom: 18,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: "50%",
    border: "1px solid #a855f7",
  },
  keypadGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
  },
  keypadBtn: {
    padding: "14px 0",
    fontSize: 16,
    fontWeight: 800,
    borderRadius: 12,
    background: "#1e1138",
    border: "1px solid #3b1d6e",
    color: "#f3e8ff",
    cursor: "pointer",
  },
};
