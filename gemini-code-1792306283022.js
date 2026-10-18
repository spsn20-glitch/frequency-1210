"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const PASSCODE = "0507";
const DISTANCE_KM = 1258; // Aerial km between Bhubaneswar & Greater Noida

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
  } catch (e) {
    // Ignore audio context restriction if un-interacted
  }
}

export default function WalkieTalkieApp() {
  // Auth & Station Identity ('bbi' or 'greno')
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [myStation, setMyStation] = useState("bbi");

  // Live Weather
  const [weather, setWeather] = useState({ bbi: "29°C", greno: "26°C" });

  // Station Statuses (Supabase synced)
  const [stations, setStations] = useState({
    bbi: { station_id: "bbi", display_name: "Sarthak • BBI", city: "Bhubaneswar", current_mood: "Free to talk 🎙️", heart_active: false, heart_updated_at: null },
    greno: { station_id: "greno", display_name: "Jaai • GreNo", city: "Greater Noida", current_mood: "Free to talk 🎙️", heart_active: false, heart_updated_at: null },
  });

  // Transmissions (Cassettes)
  const [tapes, setTapes] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("tape"); // 'tape' | 'polaroid'
  const [isPlaying, setIsPlaying] = useState(false);
  const [nowTs, setNowTs] = useState(Date.now());

  // Recording & Composer State
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [noteText, setNoteText] = useState("");
  const [polaroidFile, setPolaroidFile] = useState(null);
  const [polaroidPreview, setPolaroidPreview] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("instant"); // 'instant' | 'scheduled'
  const [unlockTimeStr, setUnlockTimeStr] = useState("23:30");
  const [doubleBlind, setDoubleBlind] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Realtime Presence & Thumb-Touch Radar
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [myThumbDown, setMyThumbDown] = useState(false);
  const [partnerThumbDown, setPartnerThumbDown] = useState(false);

  // Scratch-to-Develop Polaroid Canvas Ref
  const scratchCanvasRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recTimerRef = useRef(null);
  const presenceChannelRef = useRef(null);

  const partnerStation = myStation === "bbi" ? "greno" : "bbi";
  const todayPrompt = useMemo(() => {
    const dayIndex = new Date().getDate() % DAILY_PROMPTS.length;
    return DAILY_PROMPTS[dayIndex];
  }, []);

  // Load saved PIN + Station from localStorage
  useEffect(() => {
    const savedPin = localStorage.getItem("freq1210_pin");
    const savedStation = localStorage.getItem("freq1210_station");
    if (savedStation) setMyStation(savedStation);
    if (savedPin === PASSCODE) setUnlocked(true);

    const clock = setInterval(() => setNowTs(Date.now()), 10000);
    return () => clearInterval(clock);
  }, []);

  // Fetch Live Weather for Bhubaneswar & Greater Noida (Open-Meteo, no key required)
  useEffect(() => {
    async function fetchWeather() {
      try {
        const [bbiRes, grenoRes] = await Promise.all([
          fetch("https://api.open-meteo.com/v1/forecast?latitude=20.2961&longitude=85.8245&current_weather=true").then((r) => r.json()),
          fetch("https://api.open-meteo.com/v1/forecast?latitude=28.4744&longitude=77.5040&current_weather=true").then((r) => r.json()),
        ]);
        setWeather({
          bbi: bbiRes?.current_weather ? `${Math.round(bbiRes.current_weather.temperature)}°C` : "29°C",
          greno: grenoRes?.current_weather ? `${Math.round(grenoRes.current_weather.temperature)}°C` : "26°C",
        });
      } catch (e) {
        // Fallback temperatures if offline
      }
    }
    fetchWeather();
  }, []);

  // Load Supabase Data + Realtime Subscriptions + Live Thumb Radar
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
        .limit(50);
      if (tapeData) {
        setTapes(tapeData);
        setCurrentIndex(0);
      }
    }

    loadInitialData();

    // Subscribe to Database Changes
    const dbChannel = supabase
      .channel("db-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "station_status" }, (payload) => {
        if (payload.new) {
          setStations((prev) => ({ ...prev, [payload.new.station_id]: payload.new }));
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "transmissions" }, (payload) => {
        if (payload.eventType === "INSERT") {
          playRadioBurst(180);
          setTapes((prev) => [payload.new, ...prev]);
          setCurrentIndex(0);
        } else if (payload.eventType === "UPDATE") {
          setTapes((prev) => prev.map((t) => (t.id === payload.new.id ? payload.new : t)));
        }
      })
      .subscribe();

    // Subscribe to Live Presence & Thumb-Touch Broadcast
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
          if (payload.down && navigator.vibrate) {
            navigator.vibrate([70, 100, 120]);
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
  }, [unlocked, myStation, partnerStation]);

  // Vibrate heartbeat when BOTH thumbs touch simultaneously
  useEffect(() => {
    if (myThumbDown && partnerThumbDown) {
      playRadioBurst(90);
      if (navigator.vibrate) {
        navigator.vibrate([80, 120, 160, 120, 80]);
      }
    }
  }, [myThumbDown, partnerThumbDown]);

  // Calculate Streak & Kilometers Bridged
  const stats = useMemo(() => {
    const totalTapes = tapes.length;
    const totalKm = totalTapes * DISTANCE_KM;
    const uniqueDays = new Set(tapes.map((t) => new Date(t.created_at).toDateString())).size;
    return {
      streak: Math.max(uniqueDays, totalTapes > 0 ? 1 : 0),
      km: totalKm.toLocaleString("en-IN"),
    };
  }, [tapes]);

  const currentTape = tapes[currentIndex] || null;

  // Check if current tape is Time-Locked or Double-Blind Locked
  const lockStatus = useMemo(() => {
    if (!currentTape) return { locked: false, reason: "" };

    // 1. Check Custom AM/PM Time Lock
    const unlockMs = new Date(currentTape.unlock_at).getTime();
    if (unlockMs > nowTs && currentTape.sender !== myStation) {
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

    // 2. Check Double-Blind "Record to Unlock"
    if (currentTape.require_reply_unlock && currentTape.sender !== myStation) {
      const tapeSentTime = new Date(currentTape.created_at).getTime();
      const iRepliedAfter = tapes.some(
        (t) => t.sender === myStation && new Date(t.created_at).getTime() > tapeSentTime
      );
      if (!iRepliedAfter) {
        return {
          locked: true,
          type: "double_blind",
          reason: "Double-Blind Tape! Record & send your own voice note to unlock this transmission.",
        };
      }
    }

    return { locked: false, reason: "" };
  }, [currentTape, nowTs, myStation, tapes]);

  // Initialize Scratch-to-Develop Darkroom Canvas when viewing an undeveloped Polaroid
  useEffect(() => {
    if (activeTab !== "polaroid" || !currentTape || currentTape.polaroid_developed) return;
    const canvas = scratchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.globalCompositeOperation = "source-over";

    // Draw darkroom film coating
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

    // Check percentage scratched
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

  // Toggle Thinking of You Heart (Pulses ONLY when ON)
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

  // Broadcast Thumb-Touch Radar
  const handleThumbState = (down) => {
    setMyThumbDown(down);
    if (presenceChannelRef.current) {
      presenceChannelRef.current.send({
        type: "broadcast",
        event: "thumb",
        payload: { station: myStation, down },
      });
    }
  };

  // Play / Stop Voice Tape
  const togglePlayTape = () => {
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

  // Upload Audio + Optional Polaroid to Supabase
  const uploadAndSendTransmission = async (audioBlob, mimeType) => {
    setIsUploading(true);
    try {
      // Calculate unlock timestamp if "Open After..." is active
      let unlockIso = new Date().toISOString();
      if (deliveryMode === "scheduled" && unlockTimeStr) {
        const [hh, mm] = unlockTimeStr.split(":").map(Number);
        const target = new Date();
        target.setHours(hh, mm, 0, 0);
        if (target.getTime() <= Date.now()) {
          target.setDate(target.getDate() + 1); // Next occurrence if time already passed today
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
          require_reply_unlock: doubleBlind,
          prompt_text: doubleBlind ? todayPrompt : null,
        };

        await supabase.from("transmissions").insert([newRow]);
      }

      // Reset composer defaults back to Instant
      setNoteText("");
      setPolaroidFile(null);
      setPolaroidPreview("");
      setDeliveryMode("instant");
      setDoubleBlind(false);
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

  const anyHeartOn = Boolean(stations.bbi?.heart_active || stations.greno?.heart_active);

  // -------------------------------------------------------------------------
  // RENDER 2: MAIN 12.10 MHz WALKIE-TALKIE CHASSIS
  // -------------------------------------------------------------------------
  return (
    <div style={styles.screenWrap}>
      <style>{`
        @keyframes pulseHeart {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 6px #f472b6); }
          50% { transform: scale(1.22); filter: drop-shadow(0 0 16px #ec4899); }
        }
        @keyframes spinReel {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes thumbAura {
          0%, 100% { transform: scale(1); opacity: 0.75; }
          50% { transform: scale(1.35); opacity: 1; }
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
        {/* TOP BAR: STREAK + KILOMETERS BRIDGED + STATION SWITCH */}
        <div style={styles.topUtilityBar}>
          <div style={styles.streakPill}>
            🔥 {stats.streak}d Streak • {stats.km} KM Bridged
          </div>
          <button
            onClick={() => {
              const next = myStation === "bbi" ? "greno" : "bbi";
              setMyStation(next);
              localStorage.setItem("freq1210_station", next);
            }}
            style={styles.miniSwitchBtn}
          >
            Viewing as: {myStation === "bbi" ? "Sarthak • BBI" : "Jaai • GreNo"} ⇄
          </button>
        </div>

        {/* BHUBANESWAR <-> GREATER NOIDA BRIDGE */}
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
            <div style={styles.cityBox}>
              <div style={styles.cityTitle}>Sarthak • BBI</div>
              <div style={styles.citySub}>Bhubaneswar • {weather.bbi}</div>
              <div style={styles.cityMoodPill}>{stations.bbi?.current_mood}</div>
            </div>

            <div style={styles.cityDivider}>↔</div>

            <div style={styles.cityBox}>
              <div style={styles.cityTitle}>Jaai • GreNo</div>
              <div style={styles.citySub}>Greater Noida • {weather.greno}</div>
              <div style={styles.cityMoodPill}>{stations.greno?.current_mood}</div>
            </div>
          </div>

          {/* PRACTICAL STATUS SELECTOR (NO "MISSING YOU" PILL) */}
          <div style={styles.moodScrollRow}>
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

        {/* THINKING OF YOU HEART BUTTON (PULSES ONLY WHEN ON) */}
        <div style={styles.heartSectionCard}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f5d0fe" }}>
              Thinking of You Signal
            </div>
            <div style={{ fontSize: 11, color: "#c4b5fd", marginTop: 2 }}>
              {stations.bbi?.heart_active && stations.greno?.heart_active
                ? "Both hearts are glowing on 12.10 MHz right now 💞"
                : stations.bbi?.heart_active
                ? "Sarthak's heart signal is glowing for you 💓"
                : stations.greno?.heart_active
                ? "Jaai's heart signal is glowing for you 💓"
                : "Tap the heart button to keep it pulsing on their radio"}
            </div>
          </div>

          <button
            onClick={toggleHeartSignal}
            style={{
              ...styles.heartToggleBtn,
              background: stations[myStation]?.heart_active
                ? "linear-gradient(135deg, #ec4899, #9333ea)"
                : "#1e1336",
              borderColor: stations[myStation]?.heart_active ? "#f472b6" : "#4c1d95",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={anyHeartOn ? "#fff" : "none"}
              stroke={anyHeartOn ? "#fff" : "#c084fc"}
              strokeWidth="2.2"
              style={{
                animation: anyHeartOn ? "pulseHeart 1.2s infinite ease-in-out" : "none",
              }}
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 700 }}>
              {stations[myStation]?.heart_active ? "ON" : "OFF"}
            </span>
          </button>
        </div>

        {/* SEPARATE TABS: VOICE TAPE vs POLAROID NOTE (ZERO OVERLAP) */}
        <div style={styles.tabBar}>
          <button
            onClick={() => setActiveTab("tape")}
            style={{
              ...styles.tabBtn,
              ...(activeTab === "tape" ? styles.tabBtnActive : {}),
            }}
          >
            📻 Voice Tape
          </button>
          <button
            onClick={() => setActiveTab("polaroid")}
            style={{
              ...styles.tabBtn,
              ...(activeTab === "polaroid" ? styles.tabBtnActive : {}),
            }}
          >
            📸 Polaroid Note{" "}
            {currentTape && (currentTape.note_text || currentTape.polaroid_url) ? "✦" : ""}
          </button>
        </div>

        {/* MAIN DECK: EITHER CASSETTE REELS OR SCRATCH-TO-DEVELOP POLAROID */}
        <div style={styles.deckContainer}>
          {!currentTape ? (
            <div style={{ textAlign: "center", padding: "30px 10px", color: "#a78bfa", fontSize: 13 }}>
              No transmissions on 12.10 MHz yet. Hold the button below to record your first tape!
            </div>
          ) : activeTab === "tape" ? (
            <>
              {/* TAPE HEADER */}
              <div style={styles.tapeMetaRow}>
                <span>
                  TAPE {String(currentIndex + 1).padStart(2, "0")}/{String(tapes.length).padStart(2, "0")} •{" "}
                  {currentTape.sender === "bbi" ? "FROM SARTHAK (BBI)" : "FROM JAAI (GRENO)"}
                </span>
                <span>
                  {new Date(currentTape.created_at).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
              </div>

              {/* CASSETTE REELS WINDOW + LIVE THUMB-TOUCH PAD */}
              <div style={styles.cassetteWindow}>
                <div
                  style={{
                    ...styles.reelWheel,
                    animation: isPlaying ? "spinReel 2.2s linear infinite" : "none",
                  }}
                >
                  <div style={styles.reelCore} />
                </div>

                {/* CENTER LIVE THUMB-TOUCH SYNC PAD */}
                <div
                  onMouseDown={() => handleThumbState(true)}
                  onMouseUp={() => handleThumbState(false)}
                  onTouchStart={() => handleThumbState(true)}
                  onTouchEnd={() => handleThumbState(false)}
                  style={{
                    ...styles.thumbRadarPad,
                    background:
                      myThumbDown && partnerThumbDown
                        ? "radial-gradient(circle, #f472b6 0%, #9333ea 70%)"
                        : myThumbDown || partnerThumbDown
                        ? "rgba(192, 132, 252, 0.28)"
                        : "rgba(30, 19, 54, 0.85)",
                    animation:
                      myThumbDown && partnerThumbDown ? "thumbAura 1s infinite ease-in-out" : "none",
                  }}
                  title="Hold thumb here when both online"
                >
                  <span style={{ fontSize: 10, fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>
                    {myThumbDown && partnerThumbDown
                      ? "💞 THUMBS CONNECTED"
                      : partnerThumbDown
                      ? "👆 PARTNER HOLDING!"
                      : "fingerprint sync"}
                  </span>
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
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f5d0fe" }}>
                    🔒 {lockStatus.reason}
                  </div>
                </div>
              ) : (
                <div style={styles.playerControlsRow}>
                  <button
                    onClick={() => setCurrentIndex((i) => Math.min(tapes.length - 1, i + 1))}
                    disabled={currentIndex >= tapes.length - 1}
                    style={styles.navTapeBtn}
                  >
                    ◀ OLDER
                  </button>

                  <button onClick={togglePlayTape} style={styles.playMainBtn}>
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
            /* DEDICATED POLAROID TAB WITH SCRATCH-TO-DEVELOP DARKROOM FILM */
            <div style={styles.polaroidTabWrap}>
              {lockStatus.locked ? (
                <div style={styles.lockedBanner}>
                  🔒 Polaroid is locked: {lockStatus.reason}
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
                          12.10 MHz Voice Memory
                        </div>
                      </div>
                    )}

                    {/* DARKROOM SCRATCH OVERLAY IF UNDEVELOPED */}
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
                    {currentTape.note_text || "Sent with love across 1,258 KM 💜"}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* TRANSMIT COMPOSER: INSTANT (DEFAULT) + CUSTOM AM/PM LOCK + DOUBLE-BLIND RITUAL */}
        <div style={styles.composerCard}>
          <div style={styles.dailyPromptBanner}>
            <span>🎲 Daily Ritual Prompt:</span> <strong>{todayPrompt}</strong>
          </div>

          <div style={styles.composerInputRow}>
            <input
              type="text"
              placeholder="Optional Polaroid note..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              style={styles.textInput}
            />
            <label style={styles.photoUploadBtn}>
              📷 {polaroidFile ? "Added" : "Photo"}
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

          {/* DELIVERY MODE: INSTANT DEFAULT vs OPEN AFTER X AM/PM vs DOUBLE-BLIND */}
          <div style={styles.deliveryModeRow}>
            <button
              onClick={() => setDeliveryMode("instant")}
              style={{
                ...styles.modePill,
                ...(deliveryMode === "instant" ? styles.modePillActive : {}),
              }}
            >
              ⚡ Instant (Default)
            </button>

            <button
              onClick={() => setDeliveryMode("scheduled")}
              style={{
                ...styles.modePill,
                ...(deliveryMode === "scheduled" ? styles.modePillActive : {}),
              }}
            >
              🔒 Open After...
            </button>

            <button
              onClick={() => setDoubleBlind((v) => !v)}
              style={{
                ...styles.modePill,
                ...(doubleBlind ? styles.modePillActive : {}),
              }}
            >
              🎭 Record-to-Unlock
            </button>
          </div>

          {deliveryMode === "scheduled" && (
            <div style={styles.customTimePickerRow}>
              <span style={{ fontSize: 12, color: "#e9d5ff" }}>
                Message can be opened after:
              </span>
              <input
                type="time"
                value={unlockTimeStr}
                onChange={(e) => setUnlockTimeStr(e.target.value)}
                style={styles.timeInput}
              />
            </div>
          )}

          {/* PUSH TO TALK BUTTON (NO "CHK-CHK" TEXT) */}
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
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 0.6 }}>
              {isUploading
                ? "TRANSMITTING TO 12.10 MHz..."
                : isRecording
                ? `🔴 RECORDING (${recSeconds}s) — RELEASE TO SEND`
                : "🎙️ HOLD TO TALK • PTT"}
            </div>
            <div style={{ fontSize: 11, color: "#f3e8ff", opacity: 0.85, marginTop: 3 }}>
              Hold to record voice note on 12.10 MHz
            </div>
          </button>
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
    maxWidth: 420,
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
    display: " flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
  },
  cityBox: {
    flex: 1,
    background: "#120924",
    border: "1px solid #2e1759",
    borderRadius: 12,
    padding: "8px 10px",
  },
  cityTitle: { fontSize: 13, fontWeight: 800, color: "#f3e8ff" },
  citySub: { fontSize: 11, color: "#a78bfa", marginTop: 2 },
  cityMoodPill: {
    marginTop: 6,
    display: "inline-block",
    fontSize: 11,
    fontWeight: 600,
    color: "#e9d5ff",
    background: "#26154a",
    padding: "3px 8px",
    borderRadius: 8,
  },
  cityDivider: { fontSize: 16, color: "#a855f7", fontWeight: 800 },
  moodScrollRow: {
    display: "flex",
    gap: 6,
    overflowX: "auto",
    paddingBottom: 2,
  },
  moodChip: {
    whiteSpace: "nowrap",
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
    gap: 12,
    background: "#190e30",
    border: "1px solid #3b1d6e",
    borderRadius: 16,
    padding: "10px 14px",
    marginBottom: 12,
  },
  heartToggleBtn: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "9px 14px",
    borderRadius: 999,
    border: "1.5px solid",
    color: "#fff",
    cursor: "pointer",
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
  },
  tabBtnActive: {
    background: "#3b156b",
    borderColor: "#a855f7",
    color: "#ffffff",
  },
  deckContainer: {
    background: "#0f071e",
    border: "1px solid #3b1d6e",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  tapeMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    color: "#c4b5fd",
    marginBottom: 10,
  },
  cassetteWindow: {
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    background: "#190d30",
    border: "1px solid #4c1d95",
    borderRadius: 14,
    padding: "16px 10px",
    marginBottom: 12,
  },
  reelWheel: {
    width: 58,
    height: 58,
    borderRadius: "50%",
    border: "4px dashed #a855f7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#100720",
  },
  reelCore: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#c084fc",
  },
  thumbRadarPad: {
    width: 92,
    height: 62,
    borderRadius: 14,
    border: "1px dashed #a855f7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    color: "#f5d0fe",
    cursor: "pointer",
    userSelect: "none",
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
    background: "linear-gradient(135deg, #9333ea, #7e22ce)",
    border: "1px solid #c084fc",
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
  dailyPromptBanner: {
    fontSize: 11,
    color: "#e9d5ff",
    background: "#251347",
    border: "1px solid #4c1d95",
    borderRadius: 10,
    padding: "6px 10px",
    marginBottom: 9,
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
  },
  deliveryModeRow: {
    display: "flex",
    gap: 6,
    marginBottom: 10,
  },
  modePill: {
    flex: 1,
    padding: "6px 4px",
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