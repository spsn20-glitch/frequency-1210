"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const PASSCODE = "0507";
const DISTANCE_KM = 1258;

const STATUS_PRESETS = [
  {
    group: "Romantic & Cozy",
    items: [
      "Missing you tons 🥺",
      "Craving chai & your voice ☕",
      "Listening to our songs 🎧",
      "Winding down for bed 🌙",
      "Half asleep, send me a voice note 🥱",
    ],
  },
  {
    group: "Daily & Busy",
    items: [
      "Free to talk right now! 🎙️",
      "In a boring meeting, thinking of you 🤫",
      "Deep in work grind 💻",
      "Having delicious food 🍜",
      "Stuck in traffic 🛵",
      "Out with friends 🍕",
      "Working out 💪",
    ],
  },
];

// ============================================================================
// MASTER CATALOG OF ALL 20 ASYMMETRIC BOMB PUZZLES (6 EASY, 6 MEDIUM, 8 HARD)
// ============================================================================
const PUZZLE_CATALOG = [
  // -------------------- 6 EASY PUZZLES (#01 - #06) --------------------
  {
    id: 1,
    code: "#01",
    title: "BBI–GreNo Power Wires",
    difficulty: "EASY",
    type: "wires",
    rules: [
      "If Serial Number last digit is ODD → Cut WIRE #1.",
      "Otherwise, if there are 2 or more Batteries → Cut WIRE #4.",
      "Otherwise → Cut WIRE #2.",
    ],
    setup: (bomb) => {
      const colors = [
        { name: "RED", bg: "#ef4444", text: "#fff" },
        { name: "BLUE", bg: "#3b82f6", text: "#fff" },
        { name: "YELLOW", bg: "#eab308", text: "#1e1b4b" },
        { name: "PURPLE", bg: "#a855f7", text: "#fff" },
      ];
      const wires = colors.map((c, i) => ({ ...c, label: `WIRE #${i + 1} (${c.name})`, cut: false }));
      const correctIndex = bomb.serialOdd ? 0 : bomb.batteries >= 2 ? 3 : 1;
      return { telemetry: "4 HIGH-VOLTAGE WIRES", wires, correctIndex };
    },
  },
  {
    id: 2,
    code: "#02",
    title: "12.10 MHz Frequency Tuner",
    difficulty: "EASY",
    type: "choice",
    rules: [
      "SIGNAL: ALPHA → Tap 12.10 MHz",
      "SIGNAL: BRAVO → If Batteries ≥ 2 tap 14.02 MHz, else tap 19.99 MHz",
      "SIGNAL: DELTA → Tap 24.07 MHz",
    ],
    setup: (bomb) => {
      const signals = ["SIGNAL: ALPHA", "SIGNAL: BRAVO", "SIGNAL: DELTA"];
      const sig = signals[Math.floor(Math.random() * signals.length)];
      const options = ["12.10 MHz", "14.02 MHz", "19.99 MHz", "24.07 MHz"];
      let answer = "12.10 MHz";
      if (sig === "SIGNAL: BRAVO") answer = bomb.batteries >= 2 ? "14.02 MHz" : "19.99 MHz";
      if (sig === "SIGNAL: DELTA") answer = "24.07 MHz";
      return { telemetry: sig, options, answer };
    },
  },
  {
    id: 3,
    code: "#03",
    title: "Emergency Love Button",
    difficulty: "EASY",
    type: "choice",
    rules: [
      "If LED is LIT and display says PINK: HUG → Tap OVERRIDE ALPHA.",
      "If LED is LIT (any other prompt) → Tap OVERRIDE BETA.",
      "If LED is UNLIT → Tap OVERRIDE GAMMA.",
    ],
    setup: (bomb) => {
      const prompts = ["PINK: HUG", "PURPLE: CALL", "GOLD: WAIT"];
      const p = prompts[Math.floor(Math.random() * prompts.length)];
      const options = ["OVERRIDE ALPHA", "OVERRIDE BETA", "OVERRIDE GAMMA", "OVERRIDE DELTA"];
      let answer = "OVERRIDE GAMMA";
      if (bomb.ledLit && p === "PINK: HUG") answer = "OVERRIDE ALPHA";
      else if (bomb.ledLit) answer = "OVERRIDE BETA";
      return { telemetry: p, options, answer };
    },
  },
  {
    id: 4,
    code: "#04",
    title: "Weather Bridge Valve",
    difficulty: "EASY",
    type: "choice",
    rules: [
      "MONSOON IN BBI → ODD Serial: CYAN VALVE | EVEN Serial: AMBER VALVE",
      "FOG IN GRENO → ODD Serial: VIOLET VALVE | EVEN Serial: ROSE VALVE",
      "HEATWAVE → Always tap CYAN VALVE",
    ],
    setup: (bomb) => {
      const alerts = ["MONSOON IN BBI", "FOG IN GRENO", "HEATWAVE"];
      const a = alerts[Math.floor(Math.random() * alerts.length)];
      const options = ["CYAN VALVE", "AMBER VALVE", "VIOLET VALVE", "ROSE VALVE"];
      let answer = "CYAN VALVE";
      if (a === "MONSOON IN BBI") answer = bomb.serialOdd ? "CYAN VALVE" : "AMBER VALVE";
      if (a === "FOG IN GRENO") answer = bomb.serialOdd ? "VIOLET VALVE" : "ROSE VALVE";
      return { telemetry: a, options, answer };
    },
  },
  {
    id: 5,
    code: "#05",
    title: "Cassette Tape Splice",
    difficulty: "EASY",
    type: "wires",
    rules: [
      "If LED is LIT and Batteries ≥ 2 → Cut TRACK C (ROSE).",
      "Otherwise, if LED is LIT → Cut TRACK A (VIOLET).",
      "Otherwise → Cut TRACK D (CYAN).",
    ],
    setup: (bomb) => {
      const tracks = [
        { label: "TRACK A (VIOLET)", bg: "#9333ea", text: "#fff", cut: false },
        { label: "TRACK B (GOLD)", bg: "#eab308", text: "#1e1b4b", cut: false },
        { label: "TRACK C (ROSE)", bg: "#ec4899", text: "#fff", cut: false },
        { label: "TRACK D (CYAN)", bg: "#06b6d4", text: "#fff", cut: false },
      ];
      let correctIndex = 3;
      if (bomb.ledLit && bomb.batteries >= 2) correctIndex = 2;
      else if (bomb.ledLit) correctIndex = 0;
      return { telemetry: "CASSETTE REEL ALIGNMENT", wires: tracks, correctIndex };
    },
  },
  {
    id: 6,
    code: "#06",
    title: "Late-Night Craving Dispatch",
    difficulty: "EASY",
    type: "choice",
    rules: [
      "MASALA CHAI ☕ → Tap DRONE NORTH",
      "HOT MOMOS 🥟 → Tap DRONE WEST",
      "BIRYANI 🍲 → If Batteries == 1 tap DRONE EAST, else tap EXPRESS DROP",
    ],
    setup: (bomb) => {
      const items = ["MASALA CHAI ☕", "HOT MOMOS 🥟", "BIRYANI 🍲"];
      const item = items[Math.floor(Math.random() * items.length)];
      const options = ["DRONE NORTH", "DRONE WEST", "DRONE EAST", "EXPRESS DROP"];
      let answer = "DRONE NORTH";
      if (item === "HOT MOMOS 🥟") answer = "DRONE WEST";
      if (item === "BIRYANI 🍲") answer = bomb.batteries === 1 ? "DRONE EAST" : "EXPRESS DROP";
      return { telemetry: item, options, answer };
    },
  },

  // -------------------- 6 MEDIUM PUZZLES (#07 - #12) --------------------
  {
    id: 7,
    code: "#07",
    title: "Constellation Symbol Keypad",
    difficulty: "MEDIUM",
    type: "sequence",
    rules: [
      "Find which row has all 4 symbols, then press them LEFT-TO-RIGHT:",
      "ROW 1: ⚡ → 🌙 → ⭐ → 🪐",
      "ROW 2: 🔥 → 💜 → 🎧 → ✈️",
      "ROW 3: 📻 → 📸 → 🔑 → 💎",
    ],
    setup: () => {
      const rows = [
        ["⚡", "🌙", "⭐", "🪐"],
        ["🔥", "💜", "🎧", "✈️"],
        ["📻", "📸", "🔑", "💎"],
      ];
      const chosen = rows[Math.floor(Math.random() * rows.length)];
      const scrambled = [...chosen].sort(() => Math.random() - 0.5);
      return { telemetry: "PRESS ALL 4 IN MANUAL ORDER", sequenceOrder: chosen, buttons: scrambled, step: 0 };
    },
  },
  {
    id: 8,
    code: "#08",
    title: "Flight Path BBI ✈️ DEL",
    difficulty: "MEDIUM",
    type: "multistage",
    rules: [
      "Stage 1: If sky says CLEAR tap VEC-10, if STORM tap VEC-20.",
      "Stage 2: If Batteries ≥ 2 tap VEC-30, else tap VEC-40.",
      "Stage 3: If Serial is ODD tap VEC-10, else tap VEC-40.",
    ],
    setup: (bomb) => {
      const cond = Math.random() > 0.5 ? "CLEAR" : "STORM";
      const options = ["VEC-10", "VEC-20", "VEC-30", "VEC-40"];
      const stages = [
        { prompt: `STAGE 1 // SKY: ${cond}`, answer: cond === "CLEAR" ? "VEC-10" : "VEC-20" },
        { prompt: `STAGE 2 // CHECK BATTERIES`, answer: bomb.batteries >= 2 ? "VEC-30" : "VEC-40" },
        { prompt: `STAGE 3 // CHECK SERIAL`, answer: bomb.serialOdd ? "VEC-10" : "VEC-40" },
      ];
      return { stages, options, currentStage: 0 };
    },
  },
  {
    id: 9,
    code: "#09",
    title: "Polaroid Darkroom Chemicals",
    difficulty: "MEDIUM",
    type: "sequence",
    rules: [
      "Tap all 4 chemical baths in exact order for the Film ISO:",
      "ISO-100: DEV → STOP → FIX → WASH",
      "ISO-400: STOP → DEV → WASH → FIX",
      "ISO-800: FIX → WASH → DEV → STOP",
    ],
    setup: () => {
      const table = {
        "FILM: ISO-100": ["DEV", "STOP", "FIX", "WASH"],
        "FILM: ISO-400": ["STOP", "DEV", "WASH", "FIX"],
        "FILM: ISO-800": ["FIX", "WASH", "DEV", "STOP"],
      };
      const keys = Object.keys(table);
      const k = keys[Math.floor(Math.random() * keys.length)];
      const order = table[k];
      const scrambled = [...order].sort(() => Math.random() - 0.5);
      return { telemetry: k, sequenceOrder: order, buttons: scrambled, step: 0 };
    },
  },
  {
    id: 10,
    code: "#10",
    title: "Who Said What? Audio Paradox",
    difficulty: "MEDIUM",
    type: "multistage",
    rules: [
      '"MISSING YOU" → Stage 1: OKAY | Stage 2: SOON | Stage 3: WAIT',
      '"ON MY WAY" → Stage 1: WAIT | Stage 2: HERE | Stage 3: OKAY',
      '"CALL ME" → Always tap HERE in every stage.',
    ],
    setup: () => {
      const map = {
        "MISSING YOU": ["OKAY", "SOON", "WAIT"],
        "ON MY WAY": ["WAIT", "HERE", "OKAY"],
        "CALL ME": ["HERE", "HERE", "HERE"],
      };
      const words = Object.keys(map);
      const options = ["WAIT", "OKAY", "HERE", "SOON"];
      const stages = [0, 1, 2].map((idx) => {
        const w = words[Math.floor(Math.random() * words.length)];
        return { prompt: `DISPLAY: "${w}"`, answer: map[w][idx] };
      });
      return { stages, options, currentStage: 0 };
    },
  },
  {
    id: 11,
    code: "#11",
    title: "Biometric Heartbeat ECG",
    difficulty: "MEDIUM",
    type: "sequence",
    rules: [
      "60 BPM: P-WAVE → QRS → T-WAVE → SYNC",
      "72 BPM: QRS → P-WAVE → SYNC → T-WAVE",
      "96 BPM: SYNC → T-WAVE → QRS → P-WAVE",
    ],
    setup: () => {
      const map = {
        "PULSE: 60 BPM": ["P-WAVE", "QRS", "T-WAVE", "SYNC"],
        "PULSE: 72 BPM": ["QRS", "P-WAVE", "SYNC", "T-WAVE"],
        "PULSE: 96 BPM": ["SYNC", "T-WAVE", "QRS", "P-WAVE"],
      };
      const keys = Object.keys(map);
      const k = keys[Math.floor(Math.random() * keys.length)];
      const order = map[k];
      return {
        telemetry: k,
        sequenceOrder: order,
        buttons: [...order].sort(() => Math.random() - 0.5),
        step: 0,
      };
    },
  },
  {
    id: 12,
    code: "#12",
    title: "Encrypted Callsign PIN",
    difficulty: "MEDIUM",
    type: "sequence",
    rules: [
      "CODE: BBI-1 → Press 1 → 2 → 5 → 7",
      "CODE: GRN-2 → Press 7 → 5 → 2 → 1",
      "CODE: FRQ-3 → Press 2 → 7 → 1 → 5",
    ],
    setup: () => {
      const cleanMap = {
        "CODE: BBI-1": ["1", "2", "5", "7"],
        "CODE: GRN-2": ["7", "5", "2", "1"],
        "CODE: FRQ-3": ["2", "7", "1", "5"],
      };
      const keys = Object.keys(cleanMap);
      const k = keys[Math.floor(Math.random() * keys.length)];
      const order = cleanMap[k];
      return { telemetry: k, sequenceOrder: order, buttons: ["1", "2", "5", "7"], step: 0 };
    },
  },

  // -------------------- 8 HARD PUZZLES (#13 - #20) --------------------
  {
    id: 13,
    code: "#13",
    title: "Stealth Laser Grid: BBI ↔ GreNo",
    difficulty: "HARD",
    type: "maze",
    rules: [
      "Guide 🟢 from A1 to 🎯 at E5 without hitting Mines:",
      "Beacons B1 & D4 → Safe Path: A1→A2→A3→A4→B4→B5→C5→D5→E5",
      "Beacons A3 & E2 → Safe Path: A1→B1→B2→B3→B4→B5→C5→D5→E5",
      "Beacons C1 & C5 → Safe Path: A1→B1→C1→C2→C3→C4→C5→D5→E5",
    ],
    setup: () => {
      const bps = [
        { beacons: [[0, 1], [3, 3]], mines: [[0, 3], [1, 1], [1, 3], [2, 1], [3, 2], [4, 0]] },
        { beacons: [[2, 0], [1, 4]], mines: [[0, 2], [1, 2], [2, 2], [2, 4], [3, 0], [3, 2]] },
        { beacons: [[0, 2], [4, 2]], mines: [[1, 0], [1, 1], [1, 3], [3, 1], [3, 3], [3, 4]] },
      ];
      const bp = bps[Math.floor(Math.random() * bps.length)];
      return { bp, player: [0, 0], goal: [4, 4], hitMines: [] };
    },
  },
  {
    id: 14,
    code: "#14",
    title: "3-Stage Memory Core",
    difficulty: "HARD",
    type: "multistage",
    rules: [
      "Stage 1: If Serial is ODD tap CORE-A, else tap CORE-B.",
      "Stage 2: If LED is LIT tap CORE-C, else tap CORE-D.",
      "Stage 3: If Batteries ≥ 2 AND Serial is ODD tap CORE-D, else tap CORE-A.",
    ],
    setup: (bomb) => {
      const options = ["CORE-A", "CORE-B", "CORE-C", "CORE-D"];
      const stages = [
        { prompt: "MEMORY STAGE 1 // SERIAL PARITY", answer: bomb.serialOdd ? "CORE-A" : "CORE-B" },
        { prompt: "MEMORY STAGE 2 // LED STATUS", answer: bomb.ledLit ? "CORE-C" : "CORE-D" },
        {
          prompt: "MEMORY STAGE 3 // COMBINED CHECK",
          answer: bomb.batteries >= 2 && bomb.serialOdd ? "CORE-D" : "CORE-A",
        },
      ];
      return { stages, options, currentStage: 0 };
    },
  },
  {
    id: 15,
    code: "#15",
    title: "12.10 MHz Morse Decoder",
    difficulty: "HARD",
    type: "choice",
    rules: [
      "••• —•—• (SC) → Lock 12.05 MHz",
      "•——— •— (JA) → Lock 12.10 MHz",
      "•—•• ••— (LU) → Lock 12.25 MHz",
      "•••• ••— (HU) → Lock 12.50 MHz",
    ],
    setup: () => {
      const map = {
        "MORSE: •••  —•—•": "12.05 MHz",
        "MORSE: •———  •—": "12.10 MHz",
        "MORSE: •—••  ••—": "12.25 MHz",
        "MORSE: ••••  ••—": "12.50 MHz",
      };
      const keys = Object.keys(map);
      const k = keys[Math.floor(Math.random() * keys.length)];
      return {
        telemetry: k,
        options: ["12.05 MHz", "12.10 MHz", "12.25 MHz", "12.50 MHz"],
        answer: map[k],
      };
    },
  },
  {
    id: 16,
    code: "#16",
    title: "6-Wire High-Tension Matrix",
    difficulty: "HARD",
    type: "wires",
    rules: [
      "1. If Serial is ODD and Batteries == 3 → Cut WIRE #6.",
      "2. Else if LED is LIT and Serial is EVEN → Cut WIRE #5.",
      "3. Else if Batteries == 1 → Cut WIRE #2.",
      "4. Otherwise → Cut WIRE #4.",
    ],
    setup: (bomb) => {
      const list = [
        { label: "WIRE #1 (RED-STRIPE)", bg: "#dc2626", text: "#fff", cut: false },
        { label: "WIRE #2 (BLUE-CORE)", bg: "#2563eb", text: "#fff", cut: false },
        { label: "WIRE #3 (GOLD-LINE)", bg: "#eab308", text: "#1e1b4b", cut: false },
        { label: "WIRE #4 (VIOLET-MAIN)", bg: "#7e22ce", text: "#fff", cut: false },
        { label: "WIRE #5 (ROSE-AUX)", bg: "#ec4899", text: "#fff", cut: false },
        { label: "WIRE #6 (WHITE-NEUTRAL)", bg: "#e2e8f0", text: "#0f172a", cut: false },
      ];
      let correctIndex = 3;
      if (bomb.serialOdd && bomb.batteries === 3) correctIndex = 5;
      else if (bomb.ledLit && !bomb.serialOdd) correctIndex = 4;
      else if (bomb.batteries === 1) correctIndex = 1;
      return { telemetry: "6-WIRE HIGH-TENSION MATRIX", wires: list, correctIndex };
    },
  },
  {
    id: 17,
    code: "#17",
    title: "Time-Zone Drift Calculator",
    difficulty: "HARD",
    type: "choice",
    rules: [
      "Formula: (Base Voltage × Batteries) + (10 if Serial is ODD, else 5)",
      "Example: Base 12V, 2 Batteries, ODD Serial → (12 × 2) + 10 = 34.",
    ],
    setup: (bomb) => {
      const bases = [10, 12, 15];
      const base = bases[Math.floor(Math.random() * bases.length)];
      const bonus = bomb.serialOdd ? 10 : 5;
      const correctVal = base * bomb.batteries + bonus;
      const set = new Set([correctVal, correctVal + 5, correctVal - 5, base * 2 + 10, base + 15]);
      const options = Array.from(set)
        .slice(0, 4)
        .sort((a, b) => a - b)
        .map(String);
      if (!options.includes(String(correctVal))) options[0] = String(correctVal);
      return { telemetry: `BASE VOLTAGE: ${base}V`, options, answer: String(correctVal) };
    },
  },
  {
    id: 18,
    code: "#18",
    title: "Simon's Frequency Echo",
    difficulty: "HARD",
    type: "multistage",
    rules: [
      "FLASH: PINK → Tap CYAN",
      "FLASH: CYAN → Tap GOLD",
      "FLASH: GOLD → Tap VIOLET",
      "FLASH: VIOLET → Tap PINK",
    ],
    setup: () => {
      const map = { PINK: "CYAN", CYAN: "GOLD", GOLD: "VIOLET", VIOLET: "PINK" };
      const colors = ["PINK", "CYAN", "GOLD", "VIOLET"];
      const stages = [0, 1, 2].map((i) => {
        const c = colors[Math.floor(Math.random() * colors.length)];
        return { prompt: `ECHO ${i + 1} // FLASH: ${c}`, answer: map[c] };
      });
      return { stages, options: colors, currentStage: 0 };
    },
  },
  {
    id: 19,
    code: "#19",
    title: "Dual-Key Safehouse Cipher",
    difficulty: "HARD",
    type: "choice",
    rules: [
      "LOCK-RED: If LED is LIT → KEY-05 | If LED is UNLIT → KEY-07",
      "LOCK-BLUE: If Serial is ODD → KEY-10 | If Serial is EVEN → KEY-12",
      "LOCK-GOLD: If Batteries ≥ 2 → KEY-12 | Else → KEY-05",
    ],
    setup: (bomb) => {
      const locks = ["LOCK-RED", "LOCK-BLUE", "LOCK-GOLD"];
      const l = locks[Math.floor(Math.random() * locks.length)];
      let answer = "KEY-05";
      if (l === "LOCK-RED") answer = bomb.ledLit ? "KEY-05" : "KEY-07";
      if (l === "LOCK-BLUE") answer = bomb.serialOdd ? "KEY-10" : "KEY-12";
      if (l === "LOCK-GOLD") answer = bomb.batteries >= 2 ? "KEY-12" : "KEY-05";
      return { telemetry: l, options: ["KEY-05", "KEY-07", "KEY-10", "KEY-12"], answer };
    },
  },
  {
    id: 20,
    code: "#20",
    title: "12.10 MHz Master Core Gauntlet",
    difficulty: "HARD",
    type: "multistage",
    rules: [
      "Step 1 (Power): If Batteries ≥ 2 tap SYNC-A, else tap SYNC-B.",
      "Step 2 (Signal): If LED is LIT tap SYNC-C, else tap SYNC-D.",
      "Step 3 (Final Core): If Serial is ODD tap SYNC-D, else tap SYNC-A.",
    ],
    setup: (bomb) => {
      const options = ["SYNC-A", "SYNC-B", "SYNC-C", "SYNC-D"];
      const stages = [
        { prompt: "GAUNTLET 1/3 // AUX POWER", answer: bomb.batteries >= 2 ? "SYNC-A" : "SYNC-B" },
        { prompt: "GAUNTLET 2/3 // LED POLARITY", answer: bomb.ledLit ? "SYNC-C" : "SYNC-D" },
        { prompt: "GAUNTLET 3/3 // FINAL CORE", answer: bomb.serialOdd ? "SYNC-D" : "SYNC-A" },
      ];
      return { stages, options, currentStage: 0 };
    },
  },
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

function fileToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function compressImageToDataUrl(file, maxWidth = 600) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

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

function playTone(freq, durationMs, type = "sine", vol = 0.2) {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch (e) {}
}

function soundBeep() {
  playTone(880, 80, "square", 0.12);
}
function soundSuccess() {
  playTone(587, 110, "triangle", 0.25);
  setTimeout(() => playTone(880, 240, "triangle", 0.25), 110);
}
function soundStrike() {
  playTone(150, 300, "sawtooth", 0.28);
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([120, 60, 140]);
}

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

function createFreshBombInstance(puzzleObj) {
  const chosenPuzzle = puzzleObj || PUZZLE_CATALOG[0];
  const lastDigit = Math.floor(Math.random() * 9) + 1;
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const l1 = letters[Math.floor(Math.random() * letters.length)];
  const l2 = letters[Math.floor(Math.random() * letters.length)];
  const serialOdd = lastDigit % 2 === 1;
  const batteries = Math.floor(Math.random() * 3) + 1;
  const ledLit = Math.random() > 0.45;
  const timeLeft =
    chosenPuzzle.difficulty === "EASY" ? 120 : chosenPuzzle.difficulty === "MEDIUM" ? 150 : 180;

  const baseBomb = {
    timeLeft,
    strikes: 0,
    solved: false,
    gameOver: false,
    endMessage: "",
    serial: `12X-${l1}${l2}${lastDigit}`,
    serialOdd,
    batteries,
    ledLit,
    puzzleId: chosenPuzzle.id,
  };

  return {
    ...baseBomb,
    puzzleData: chosenPuzzle.setup(baseBomb),
  };
}

export default function WalkieTalkieApp() {
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [myStation, setMyStation] = useState("bbi");
  const [notifEnabled, setNotifEnabled] = useState(false);

  // Top-Level Section Navigation: 'radio' | 'bomb'
  const [appSection, setAppSection] = useState("radio");

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

  // Transmissions & Local Read/Vault Tracking
  const [tapes, setTapes] = useState([]);
  const [readTapeIds, setReadTapeIds] = useState([]);
  const [readPolaroidIds, setReadPolaroidIds] = useState([]);
  const [vaultedTapeIds, setVaultedTapeIds] = useState([]);

  const [activeTab, setActiveTab] = useState("tape");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingVaultId, setPlayingVaultId] = useState(null);
  const [nowTs, setNowTs] = useState(Date.now());

  // Modals
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [customStatusInput, setCustomStatusInput] = useState("");
  const [vaultModalOpen, setVaultModalOpen] = useState(false);
  const [vaultTab, setVaultTab] = useState("tapes");
  const [viewSentArchive, setViewSentArchive] = useState(false);

  // Recording & Composer State
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [noteText, setNoteText] = useState("");
  const [polaroidDataUrl, setPolaroidDataUrl] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("instant");
  const [unlockTimeStr, setUnlockTimeStr] = useState("23:30");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState("");

  // Live Camera Modal
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState("user");

  // Presence & Biometric Sync
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [myThumbDown, setMyThumbDown] = useState(false);
  const [partnerThumbDown, setPartnerThumbDown] = useState(false);
  const [syncSeconds, setSyncSeconds] = useState(0);

  // =========================================================================
  // 20-PUZZLE BOMB CO-OP STATE
  // =========================================================================
  const [bombRole, setBombRole] = useState("defuser"); // 'defuser' | 'expert'
  const [poolFilter, setPoolFilter] = useState("ALL"); // 'ALL' | 'EASY' | 'MEDIUM' | 'HARD'
  const [manualFilter, setManualFilter] = useState("ALL");
  const [manualSearch, setManualSearch] = useState("");
  const [bombState, setBombState] = useState(() => createFreshBombInstance(PUZZLE_CATALOG[0]));

  // Refs
  const scratchCanvasRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const isRecordingCancelledRef = useRef(false);
  const audioChunksRef = useRef([]);
  const recTimerRef = useRef(null);
  const presenceChannelRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  const partnerStation = myStation === "bbi" ? "greno" : "bbi";
  const myName = myStation === "bbi" ? "Sarthak" : "Jaai";
  const partnerName = myStation === "bbi" ? "Jaai" : "Sarthak";

  // Load saved state from localStorage
  useEffect(() => {
    const savedPin = localStorage.getItem("freq1210_pin");
    const savedStation = localStorage.getItem("freq1210_station");
    const savedReadTapes = JSON.parse(localStorage.getItem("freq1210_read_tapes") || "[]");
    const savedReadPolaroids = JSON.parse(localStorage.getItem("freq1210_read_polaroids") || "[]");
    const savedVaulted = JSON.parse(localStorage.getItem("freq1210_vaulted_tapes") || "[]");

    if (savedStation) setMyStation(savedStation);
    if (savedPin === PASSCODE) setUnlocked(true);
    setReadTapeIds(savedReadTapes);
    setReadPolaroidIds(savedReadPolaroids);
    setVaultedTapeIds(savedVaulted);

    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifEnabled(Notification.permission === "granted");
    }

    const clock = setInterval(() => setNowTs(Date.now()), 10000);
    return () => clearInterval(clock);
  }, []);

  // Bomb Countdown Timer Effect (Runs when inside Bomb Co-Op section)
  useEffect(() => {
    if (appSection !== "bomb" || bombState.gameOver) return;
    const interval = setInterval(() => {
      setBombState((prev) => {
        if (prev.gameOver) return prev;
        if (prev.timeLeft <= 1) {
          soundStrike();
          return {
            ...prev,
            timeLeft: 0,
            gameOver: true,
            solved: false,
            endMessage: "⏰ TIME EXPIRED! THE BOMB DETONATED!",
          };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [appSection, bombState.gameOver]);

  const spawnRandomBomb = (overrideFilter) => {
    const activeFilter = overrideFilter || poolFilter;
    const pool =
      activeFilter === "ALL"
        ? PUZZLE_CATALOG
        : PUZZLE_CATALOG.filter((p) => p.difficulty === activeFilter);
    const chosen = pool[Math.floor(Math.random() * pool.length)] || PUZZLE_CATALOG[0];
    setBombState(createFreshBombInstance(chosen));
  };

  const spawnSpecificBomb = (idNum) => {
    const found = PUZZLE_CATALOG.find((p) => p.id === Number(idNum));
    if (found) setBombState(createFreshBombInstance(found));
  };

  const activeBombPuzzle = useMemo(() => {
    return PUZZLE_CATALOG.find((p) => p.id === bombState.puzzleId) || PUZZLE_CATALOG[0];
  }, [bombState.puzzleId]);

  const registerBombStrike = (updatedPuzzleData) => {
    soundStrike();
    setBombState((prev) => {
      const nextStrikes = prev.strikes + 1;
      const exploded = nextStrikes >= 3;
      return {
        ...prev,
        strikes: nextStrikes,
        gameOver: exploded,
        solved: false,
        endMessage: exploded ? "💥 3 STRIKES! THE BOMB DETONATED!" : "",
        puzzleData: updatedPuzzleData || prev.puzzleData,
      };
    });
  };

  const registerBombVictory = (updatedPuzzleData) => {
    soundSuccess();
    setBombState((prev) => ({
      ...prev,
      solved: true,
      gameOver: true,
      endMessage: `🎉 PUZZLE ${activeBombPuzzle.code} SOLVED! BOMB DEFUSED!`,
      puzzleData: updatedPuzzleData || prev.puzzleData,
    }));
  };

  const handleBombWireCut = (idx) => {
    if (bombState.gameOver) return;
    const pd = bombState.puzzleData;
    if (pd.wires[idx].cut) return;
    const nextWires = pd.wires.map((w, i) => (i === idx ? { ...w, cut: true } : w));
    const nextPd = { ...pd, wires: nextWires };

    if (idx === pd.correctIndex) {
      registerBombVictory(nextPd);
    } else {
      registerBombStrike(nextPd);
    }
  };

  const handleBombChoiceTap = (opt) => {
    if (bombState.gameOver) return;
    if (opt === bombState.puzzleData.answer) {
      registerBombVictory();
    } else {
      registerBombStrike();
    }
  };

  const handleBombSequenceTap = (btnVal) => {
    if (bombState.gameOver) return;
    const pd = bombState.puzzleData;
    const expected = pd.sequenceOrder[pd.step];
    if (btnVal === expected) {
      soundBeep();
      const nextStep = pd.step + 1;
      const nextPd = { ...pd, step: nextStep };
      if (nextStep >= pd.sequenceOrder.length) {
        registerBombVictory(nextPd);
      } else {
        setBombState((prev) => ({ ...prev, puzzleData: nextPd }));
      }
    } else {
      registerBombStrike();
    }
  };

  const handleBombMultistageTap = (opt) => {
    if (bombState.gameOver) return;
    const pd = bombState.puzzleData;
    const curStage = pd.stages[pd.currentStage];
    if (opt === curStage.answer) {
      soundBeep();
      const nextStage = pd.currentStage + 1;
      const nextPd = { ...pd, currentStage: nextStage };
      if (nextStage >= pd.stages.length) {
        registerBombVictory(nextPd);
      } else {
        setBombState((prev) => ({ ...prev, puzzleData: nextPd }));
      }
    } else {
      registerBombStrike();
    }
  };

  const handleBombMazeMove = (dr, dc) => {
    if (bombState.gameOver) return;
    const pd = bombState.puzzleData;
    const nr = pd.player[0] + dr;
    const nc = pd.player[1] + dc;
    if (nr < 0 || nr > 4 || nc < 0 || nc > 4) return;

    const hit = pd.bp.mines.some((m) => m[0] === nr && m[1] === nc);
    if (hit) {
      const nextPd = { ...pd, hitMines: [...pd.hitMines, `${nr},${nc}`] };
      registerBombStrike(nextPd);
    } else {
      soundBeep();
      const nextPd = { ...pd, player: [nr, nc] };
      if (nr === pd.goal[0] && nc === pd.goal[1]) {
        registerBombVictory(nextPd);
      } else {
        setBombState((prev) => ({ ...prev, puzzleData: nextPd }));
      }
    }
  };

  const filteredManualPuzzles = useMemo(() => {
    const q = manualSearch.toLowerCase().trim();
    return PUZZLE_CATALOG.filter((p) => {
      const diffOk = manualFilter === "ALL" || p.difficulty === manualFilter;
      const searchOk = !q || p.code.toLowerCase().includes(q) || p.title.toLowerCase().includes(q);
      return diffOk && searchOk;
    });
  }, [manualFilter, manualSearch]);

  // -------------------------------------------------------------------------
  // RADIO HELPERS
  // -------------------------------------------------------------------------
  const markTapeReadLocal = (id) => {
    if (!id) return;
    setReadTapeIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem("freq1210_read_tapes", JSON.stringify(next));
      return next;
    });
  };

  const markPolaroidReadLocal = (id) => {
    if (!id) return;
    setReadPolaroidIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem("freq1210_read_polaroids", JSON.stringify(next));
      return next;
    });
  };

  const moveTapeToVaultLocal = (id) => {
    if (!id) return;
    markTapeReadLocal(id);
    markPolaroidReadLocal(id);
    setVaultedTapeIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem("freq1210_vaulted_tapes", JSON.stringify(next));
      return next;
    });
  };

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

  // Weather Fetching
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

  // Supabase Realtime Sync
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
        .limit(80);

      if (tapeData && !tapeErr) {
        setTapes(tapeData);
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
            setActiveTab("tape");
            sendPhoneNotification(
              `🎙️ New Transmission from ${partnerName}!`,
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

  // Spotlight vs Vault Filtering
  const incomingTapes = useMemo(() => {
    return tapes.filter((t) => t.sender !== myStation);
  }, [tapes, myStation]);

  const sentTapes = useMemo(() => {
    return tapes.filter((t) => t.sender === myStation);
  }, [tapes, myStation]);

  const latestIncoming = incomingTapes[0] || null;
  const spotlightTape =
    latestIncoming && !vaultedTapeIds.includes(latestIncoming.id) ? latestIncoming : null;

  const vaultTapes = useMemo(() => {
    if (!incomingTapes.length) return [];
    if (spotlightTape) {
      return incomingTapes.slice(1);
    }
    return incomingTapes;
  }, [incomingTapes, spotlightTape]);

  const vaultPolaroids = useMemo(() => {
    return vaultTapes.filter((t) => t.polaroid_url || t.note_text);
  }, [vaultTapes]);

  const isSpotlightVoiceUnread = Boolean(
    spotlightTape &&
      spotlightTape.is_listened !== true &&
      !readTapeIds.includes(spotlightTape.id)
  );

  const hasSpotlightPolaroid = Boolean(
    spotlightTape && (spotlightTape.polaroid_url || spotlightTape.note_text)
  );

  const isSpotlightPolaroidUnread = Boolean(
    hasSpotlightPolaroid &&
      spotlightTape.polaroid_developed !== true &&
      !readPolaroidIds.includes(spotlightTape.id)
  );

  const isAnySpotlightNew = isSpotlightVoiceUnread || isSpotlightPolaroidUnread;

  const streakDays = useMemo(() => {
    const uniqueDays = new Set(tapes.map((t) => new Date(t.created_at).toDateString())).size;
    return Math.max(uniqueDays, tapes.length > 0 ? 1 : 0);
  }, [tapes]);

  const lockStatus = useMemo(() => {
    if (!spotlightTape || !spotlightTape.unlock_at) return { locked: false, reason: "" };

    const unlockMs = new Date(spotlightTape.unlock_at).getTime();
    if (unlockMs > nowTs) {
      const formattedTime = new Date(spotlightTape.unlock_at).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return {
        locked: true,
        reason: `This message can be opened after ${formattedTime}`,
      };
    }

    return { locked: false, reason: "" };
  }, [spotlightTape, nowTs]);

  // Darkroom Scratch Canvas
  useEffect(() => {
    if (appSection !== "radio" || activeTab !== "polaroid" || !spotlightTape || !isSpotlightPolaroidUnread) return;
    const canvas = scratchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.globalCompositeOperation = "source-over";

    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, "#2e1065");
    grad.addColorStop(0.5, "#4c1d95");
    grad.addColorStop(1, "#1e1b4b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#fbcfe8";
    ctx.font = "bold 13px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("✨ NEW MYSTERY POLAROID ✨", canvas.width / 2, canvas.height / 2 - 8);
    ctx.font = "11px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "#e9d5ff";
    ctx.fillText("Rub across with finger or tap 'Instant Reveal'", canvas.width / 2, canvas.height / 2 + 14);
  }, [appSection, activeTab, spotlightTape, isSpotlightPolaroidUnread]);

  const markPolaroidRevealed = async () => {
    if (!spotlightTape) return;
    if (navigator.vibrate) navigator.vibrate(40);
    markPolaroidReadLocal(spotlightTape.id);
    setTapes((prev) =>
      prev.map((t) => (t.id === spotlightTape.id ? { ...t, polaroid_developed: true } : t))
    );
    if (supabase) {
      await supabase.from("transmissions").update({ polaroid_developed: true }).eq("id", spotlightTape.id);
    }
  };

  const handleScratchMove = (e) => {
    if (!spotlightTape || !isSpotlightPolaroidUnread) return;
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
    if (transparent / (imgData.length / 16) > 0.42) {
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

  const togglePlaySpotlightTape = async () => {
    if (!spotlightTape || lockStatus.locked || !audioPlayerRef.current) return;

    if (isPlaying && !playingVaultId) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      playRadioBurst(160);
      setPlayingVaultId(null);
      audioPlayerRef.current.src = spotlightTape.audio_url;
      try {
        await audioPlayerRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        alert("Audio playback failed. Please tap Play again.");
      }

      markTapeReadLocal(spotlightTape.id);
      if (!spotlightTape.polaroid_url) {
        markPolaroidReadLocal(spotlightTape.id);
      }
      setTapes((prev) =>
        prev.map((t) => (t.id === spotlightTape.id ? { ...t, is_listened: true } : t))
      );
      if (supabase) {
        await supabase.from("transmissions").update({ is_listened: true }).eq("id", spotlightTape.id);
      }
    }
  };

  const togglePlayVaultTape = async (tape) => {
    if (!audioPlayerRef.current) return;
    if (isPlaying && playingVaultId === tape.id) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      setIsPlaying(false);
      setPlayingVaultId(null);
    } else {
      playRadioBurst(120);
      audioPlayerRef.current.src = tape.audio_url;
      try {
        await audioPlayerRef.current.play();
        setIsPlaying(true);
        setPlayingVaultId(tape.id);
      } catch (err) {
        alert("Could not play archived tape.");
      }
    }
  };

  // Live Camera Capture
  const openLiveCamera = async (facing = cameraFacing) => {
    setCameraModalOpen(true);
    try {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: false,
      });
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Could not access camera. Please allow camera permission or use Album.");
      setCameraModalOpen(false);
    }
  };

  const closeLiveCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    setCameraModalOpen(false);
  };

  const flipCamera = () => {
    const nextFacing = cameraFacing === "user" ? "environment" : "user";
    setCameraFacing(nextFacing);
    openLiveCamera(nextFacing);
  };

  const snapCameraPhoto = () => {
    if (!cameraVideoRef.current) return;
    const video = cameraVideoRef.current;
    const canvas = document.createElement("canvas");
    const maxW = 600;
    const scale = Math.min(1, maxW / (video.videoWidth || 600));
    canvas.width = Math.round((video.videoWidth || 600) * scale);
    canvas.height = Math.round((video.videoHeight || 450) * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    setPolaroidDataUrl(dataUrl);
    if (navigator.vibrate) navigator.vibrate(40);
    closeLiveCamera();
  };

  // Recording with Explicit Cancel and Send
  const startRecording = async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      isRecordingCancelledRef.current = false;
      playRadioBurst(130);

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
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
        if (isRecordingCancelledRef.current) {
          audioChunksRef.current = [];
          setUploadNotice("Recording cancelled.");
          setTimeout(() => setUploadNotice(""), 2500);
          return;
        }

        playRadioBurst(160);
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

  const cancelRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;
    isRecordingCancelledRef.current = true;
    clearInterval(recTimerRef.current);
    setIsRecording(false);
    setRecSeconds(0);
    mediaRecorderRef.current.stop();
  };

  const finishAndSendRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;
    isRecordingCancelledRef.current = false;
    clearInterval(recTimerRef.current);
    setIsRecording(false);
    mediaRecorderRef.current.stop();
  };

  const uploadAndSend = async (audioBlob, mimeType) => {
    setIsUploading(true);
    setUploadNotice("Encoding & transmitting across 1,258 KM...");

    try {
      let finalAudioUrl = "";

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

      if (!finalAudioUrl) {
        finalAudioUrl = await fileToBase64(audioBlob);
      }

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

      const fullRow = {
        sender: myStation,
        audio_url: finalAudioUrl,
        duration_sec: Math.max(recSeconds, 1),
        note_text: noteText.trim() || null,
        polaroid_url: polaroidDataUrl || null,
        polaroid_developed: false,
        unlock_at: unlockIso,
        is_listened: false,
      };

      if (supabase) {
        const { error: dbErr } = await supabase.from("transmissions").insert([fullRow]);
        if (dbErr) {
          const minimalRow = {
            sender: myStation,
            audio_url: finalAudioUrl,
            duration_sec: Math.max(recSeconds, 1),
            note_text: noteText.trim() || null,
            polaroid_url: polaroidDataUrl || null,
            unlock_at: unlockIso,
          };
          const { error: retryErr } = await supabase.from("transmissions").insert([minimalRow]);
          if (retryErr) {
            alert(`Transmission error: ${retryErr.message}`);
            return;
          }
        }
      }

      setNoteText("");
      setPolaroidDataUrl("");
      setDeliveryMode("instant");
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
  const bombMinutes = String(Math.floor(bombState.timeLeft / 60)).padStart(2, "0");
  const bombSeconds = String(bombState.timeLeft % 60).padStart(2, "0");

  // -------------------------------------------------------------------------
  // SCREEN 2: MAIN CHASSIS (WITH 2 SECTIONS: RADIO & 20-PUZZLE BOMB CO-OP)
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
        @keyframes spotlightGlow {
          0%, 100% {
            box-shadow: 0 0 18px rgba(236, 72, 153, 0.55), inset 0 0 18px rgba(236, 72, 153, 0.2);
            border-color: #f472b6;
          }
          50% {
            box-shadow: 0 0 34px rgba(244, 114, 182, 0.9), inset 0 0 26px rgba(236, 72, 153, 0.35);
            border-color: #fde047;
          }
        }
        @keyframes badgePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
      `}</style>

      <audio
        ref={audioPlayerRef}
        onEnded={() => {
          playRadioBurst(140);
          setIsPlaying(false);
          setPlayingVaultId(null);
        }}
      />

      <div style={styles.radioChassis}>
        {/* TOP 2-SECTION NAVIGATION BAR: 12.10 MHz RADIO vs BOMB CO-OP */}
        <div style={styles.sectionNavWrap}>
          <button
            type="button"
            onClick={() => setAppSection("radio")}
            style={{
              ...styles.sectionNavBtn,
              ...(appSection === "radio" ? styles.sectionNavBtnActive : {}),
            }}
          >
            📻 12.10 MHz Radio
            {isAnySpotlightNew && <span style={styles.unreadDot}>NEW</span>}
          </button>
          <button
            type="button"
            onClick={() => setAppSection("bomb")}
            style={{
              ...styles.sectionNavBtn,
              ...(appSection === "bomb" ? styles.sectionNavBtnActive : {}),
            }}
          >
            💣 Bomb Co-Op (20)
          </button>
        </div>

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
              localStorage.setItem("freq1210_station", next);
            }}
            style={styles.miniSwitchBtn}
          >
            {myStation === "bbi" ? "Sarthak • BBI" : "Jaai • GreNo"} ⇄
          </button>
        </div>

        {/* ================================================================= */}
        {/* SECTION 1: 12.10 MHz WALKIE-TALKIE RADIO                          */}
        {/* ================================================================= */}
        {appSection === "radio" ? (
          <>
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

              <button onClick={() => setStatusModalOpen(true)} style={styles.openStatusModalBtn}>
                <span>
                  📍 My Status: <strong>{stations[myStation]?.current_mood}</strong>
                </span>
                <span style={{ fontSize: 11, color: "#c084fc", fontWeight: 700 }}>Change ▾</span>
              </button>
            </div>

            {/* THINKING OF YOU HEART BAR */}
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
                    ? `Incoming live signal • Tap your button to beat back!`
                    : myHeartOn
                    ? `${partnerName}'s screen shows: "${myName}'s heart is beating for you 💓"`
                    : `Tap SEND so ${partnerName} sees "${myName}'s heart is beating for you 💓"`}
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
                  {bothThumbsSynced
                    ? `💞 72 BPM • ${syncSeconds.toFixed(1)}s`
                    : partnerThumbDown
                    ? `⚡ ${partnerName.toUpperCase()} WAITING`
                    : "12.10 MHz"}
                </span>
              </div>

              <div style={styles.biometricScannerRow}>
                <div
                  style={{
                    ...styles.thumbNode,
                    borderColor: (myStation === "bbi" ? myThumbDown : partnerThumbDown) ? "#ec4899" : "#2e1759",
                    background: (myStation === "bbi" ? myThumbDown : partnerThumbDown)
                      ? "rgba(236, 72, 153, 0.2)"
                      : "#120924",
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
                    borderColor: bothThumbsSynced
                      ? "#fbcfe8"
                      : myThumbDown || partnerThumbDown
                      ? "#e879f9"
                      : "#6b21a8",
                  }}
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={
                      bothThumbsSynced ? "#ffffff" : myThumbDown || partnerThumbDown ? "#f472b6" : "#c084fc"
                    }
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
                    background: (myStation === "greno" ? myThumbDown : partnerThumbDown)
                      ? "rgba(236, 72, 153, 0.2)"
                      : "#120924",
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#f5d0fe" }}>JAAI</div>
                  <div style={{ fontSize: 9, color: "#a78bfa", marginTop: 2 }}>
                    {(myStation === "greno" ? myThumbDown : partnerThumbDown) ? "🟢 TOUCHING" : "⚪ STANDBY"}
                  </div>
                </div>
              </div>
            </div>

            {/* MAIN SPOTLIGHT STAGE */}
            <div style={styles.tabBar}>
              <button
                onClick={() => setActiveTab("tape")}
                style={{
                  ...styles.tabBtn,
                  ...(activeTab === "tape" ? styles.tabBtnActive : {}),
                  ...(isSpotlightVoiceUnread ? styles.tabBtnUnreadGlow : {}),
                }}
              >
                📻 {partnerName}&apos;s Latest Tape
                {isSpotlightVoiceUnread && <span style={styles.unreadDot}>🔥 NEW</span>}
              </button>

              <button
                onClick={() => {
                  setActiveTab("polaroid");
                  if (spotlightTape && !spotlightTape.polaroid_url && spotlightTape.note_text) {
                    markPolaroidReadLocal(spotlightTape.id);
                  }
                }}
                style={{
                  ...styles.tabBtn,
                  ...(activeTab === "polaroid" ? styles.tabBtnActive : {}),
                  ...(isSpotlightPolaroidUnread ? styles.tabBtnUnreadGlow : {}),
                }}
              >
                📸 {partnerName}&apos;s Polaroid
                {isSpotlightPolaroidUnread ? (
                  <span style={styles.unreadDot}>🔥 NEW PHOTO</span>
                ) : (
                  hasSpotlightPolaroid && <span style={styles.attachedDot}>✦</span>
                )}
              </button>
            </div>

            <div
              style={{
                ...styles.deckContainer,
                background: isAnySpotlightNew
                  ? "linear-gradient(160deg, #2b0c3d 0%, #140726 100%)"
                  : "#0f071e",
                animation: isAnySpotlightNew ? "spotlightGlow 2s infinite ease-in-out" : "none",
                borderColor: isAnySpotlightNew ? "#f472b6" : "#3b1d6e",
              }}
            >
              {!spotlightTape ? (
                <div style={{ textAlign: "center", padding: "22px 12px", color: "#c4b5fd", fontSize: 13 }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>✨📻</div>
                  <div style={{ fontWeight: 700, color: "#f3e8ff" }}>
                    Main Stage Clear — Waiting for {partnerName}&apos;s Next Transmission
                  </div>
                  <div style={{ fontSize: 11, color: "#a78bfa", marginTop: 4 }}>
                    {vaultTapes.length > 0
                      ? `All ${vaultTapes.length} earlier messages are safely stored in your Memory Vault below.`
                      : `As soon as ${partnerName} sends a voice note or Polaroid, it will spotlight right here!`}
                  </div>
                </div>
              ) : activeTab === "tape" ? (
                <>
                  {isAnySpotlightNew ? (
                    <div style={styles.incomingHighlightBanner}>
                      <span>🚨 FRESH TRANSMISSION FROM {partnerName.toUpperCase()}</span>
                      <span style={styles.liveTagPill}>SPOTLIGHT</span>
                    </div>
                  ) : (
                    <div style={styles.listenedStageBanner}>
                      <span>✓ LATEST TRANSMISSION PLAYED</span>
                      <button
                        type="button"
                        onClick={() => moveTapeToVaultLocal(spotlightTape.id)}
                        style={styles.moveToVaultMiniBtn}
                      >
                        📥 Move to Vault
                      </button>
                    </div>
                  )}

                  <div style={styles.tapeMetaRow}>
                    <span style={{ color: isAnySpotlightNew ? "#fbcfe8" : "#c4b5fd", fontWeight: 800 }}>
                      🎙️ LATEST ON 12.10 MHz • FROM {partnerName.toUpperCase()}
                    </span>
                    <span style={{ color: "#e9d5ff" }}>
                      {new Date(spotlightTape.created_at).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                  </div>

                  {hasSpotlightPolaroid && (
                    <div
                      onClick={() => setActiveTab("polaroid")}
                      style={{
                        ...styles.polaroidAlertStrip,
                        background: isSpotlightPolaroidUnread
                          ? "linear-gradient(90deg, rgba(236,72,153,0.3), rgba(168,85,247,0.3))"
                          : "#1a0e33",
                        borderColor: isSpotlightPolaroidUnread ? "#f472b6" : "#4c1d95",
                      }}
                    >
                      <span>
                        {isSpotlightPolaroidUnread
                          ? `📸 ${partnerName} attached a Mystery Polaroid to this voice note!`
                          : `📸 Polaroid Note attached to this transmission`}
                      </span>
                      <span style={{ fontWeight: 800, color: "#fde047" }}>Open Polaroid →</span>
                    </div>
                  )}

                  <div
                    style={{
                      ...styles.cassetteWindow,
                      borderColor: isAnySpotlightNew ? "#ec4899" : "#4c1d95",
                      background: isAnySpotlightNew ? "#240d3d" : "#190d30",
                    }}
                  >
                    <div
                      style={{
                        ...styles.reelWheel,
                        borderColor: isAnySpotlightNew ? "#f472b6" : "#a855f7",
                        animation: isPlaying && !playingVaultId ? "spinReel 2.2s linear infinite" : "none",
                      }}
                    >
                      <div style={styles.reelCore} />
                    </div>

                    <div style={styles.cassetteCenterLabel}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#fde047" }}>
                        {isAnySpotlightNew ? "★ NEW TAPE ★" : "12.10 MHz"}
                      </div>
                      <div style={{ fontSize: 9.5, color: "#f3e8ff", marginTop: 2, fontWeight: 700 }}>
                        {isPlaying && !playingVaultId
                          ? "🔊 PLAYING NOW..."
                          : `${spotlightTape.duration_sec || 5}s VOICE NOTE`}
                      </div>
                    </div>

                    <div
                      style={{
                        ...styles.reelWheel,
                        borderColor: isAnySpotlightNew ? "#f472b6" : "#a855f7",
                        animation: isPlaying && !playingVaultId ? "spinReel 2.2s linear infinite" : "none",
                      }}
                    >
                      <div style={styles.reelCore} />
                    </div>
                  </div>

                  {lockStatus.locked ? (
                    <div style={styles.lockedBanner}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#f5d0fe" }}>🔒 {lockStatus.reason}</div>
                    </div>
                  ) : (
                    <div style={styles.playerControlsRow}>
                      <button
                        onClick={togglePlaySpotlightTape}
                        style={{
                          ...styles.playMainBtn,
                          background: isAnySpotlightNew
                            ? "linear-gradient(135deg, #ec4899, #d946ef, #9333ea)"
                            : "linear-gradient(135deg, #7e22ce, #581c87)",
                          boxShadow: isAnySpotlightNew ? "0 6px 22px rgba(236, 72, 153, 0.55)" : "none",
                        }}
                      >
                        {isPlaying && !playingVaultId
                          ? "⏹ STOP VOICE TAPE"
                          : isSpotlightVoiceUnread
                          ? `▶ PLAY NEW VOICE TAPE (${spotlightTape.duration_sec || 5}s)`
                          : `▶ REPLAY VOICE TAPE (${spotlightTape.duration_sec || 5}s)`}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div style={styles.polaroidTabWrap}>
                  {lockStatus.locked ? (
                    <div style={styles.lockedBanner}>🔒 Polaroid is locked: {lockStatus.reason}</div>
                  ) : !hasSpotlightPolaroid ? (
                    <div style={{ padding: "20px 10px", textAlign: "center", color: "#a78bfa", fontSize: 12 }}>
                      No Polaroid photo or note was attached to {partnerName}&apos;s latest voice tape.
                    </div>
                  ) : (
                    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
                      {isSpotlightPolaroidUnread && (
                        <div style={{ ...styles.incomingHighlightBanner, width: "100%", marginBottom: 10 }}>
                          <span>✨ NEW UNOPENED POLAROID FROM {partnerName.toUpperCase()}</span>
                        </div>
                      )}

                      <div style={styles.polaroidFrame}>
                        <div style={styles.polaroidPhotoArea}>
                          {spotlightTape.polaroid_url ? (
                            <img
                              src={spotlightTape.polaroid_url}
                              alt="Polaroid"
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

                          {isSpotlightPolaroidUnread && spotlightTape.polaroid_url && (
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

                        {isSpotlightPolaroidUnread && spotlightTape.polaroid_url && (
                          <button onClick={markPolaroidRevealed} style={styles.instantRevealBtn}>
                            ✨ Instant Reveal Photo
                          </button>
                        )}

                        <div style={styles.polaroidCaption}>
                          {spotlightTape.note_text || `From ${partnerName} with love 💜`}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* MEMORY VAULT LAUNCHER */}
            <button type="button" onClick={() => setVaultModalOpen(true)} style={styles.vaultLauncherBtn}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>🗄️</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#f3e8ff" }}>
                    {partnerName}&apos;s Memory Vault (Older Tapes & Polaroids)
                  </div>
                  <div style={{ fontSize: 10, color: "#a78bfa" }}>
                    {vaultTapes.length} archived voice {vaultTapes.length === 1 ? "tape" : "tapes"} •{" "}
                    {vaultPolaroids.length} saved {vaultPolaroids.length === 1 ? "Polaroid" : "Polaroids"}
                  </div>
                </div>
              </div>
              <span style={styles.vaultOpenPill}>Open Vault ▸</span>
            </button>

            {/* COMPOSER */}
            <div style={styles.composerCard}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#d8b4fe", marginBottom: 8 }}>
                🎙️ TRANSMIT TO {partnerName.toUpperCase()}
              </div>

              <div style={styles.composerInputRow}>
                <input
                  type="text"
                  placeholder={`Optional Polaroid note for ${partnerName}...`}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  style={styles.textInput}
                />

                <button type="button" onClick={() => openLiveCamera("user")} style={styles.photoUploadBtn}>
                  📸 Camera
                </button>

                <label style={styles.photoUploadBtn}>
                  🖼️ Album
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const compressed = await compressImageToDataUrl(file);
                        setPolaroidDataUrl(compressed);
                      }
                    }}
                  />
                </label>
              </div>

              {polaroidDataUrl && (
                <div style={styles.photoPreviewRow}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <img
                      src={polaroidDataUrl}
                      alt="Preview"
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 6,
                        objectFit: "cover",
                        border: "1px solid #c084fc",
                      }}
                    />
                    <span>✓ Polaroid photo ready to send</span>
                  </div>
                  <span
                    onClick={() => setPolaroidDataUrl("")}
                    style={{ cursor: "pointer", color: "#f472b6", fontWeight: 700 }}
                  >
                    Remove ✕
                  </span>
                </div>
              )}

              <div style={styles.deliveryBox}>
                <div style={styles.deliveryModeRow}>
                  <button
                    type="button"
                    onClick={() => setDeliveryMode("instant")}
                    style={{
                      ...styles.modePill,
                      ...(deliveryMode === "instant" ? styles.modePillActive : {}),
                    }}
                  >
                    ⚡ Send Instantly
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMode("scheduled")}
                    style={{
                      ...styles.modePill,
                      ...(deliveryMode === "scheduled" ? styles.modePillActive : {}),
                    }}
                  >
                    ⏰ Open After This Time
                  </button>
                </div>

                {deliveryMode === "scheduled" && (
                  <div style={styles.customTimePickerRow}>
                    <span style={{ fontSize: 11.5, color: "#f5d0fe", fontWeight: 600 }}>
                      🔒 {partnerName} can open this after:
                    </span>
                    <input
                      type="time"
                      value={unlockTimeStr}
                      onChange={(e) => setUnlockTimeStr(e.target.value)}
                      style={styles.timeInput}
                    />
                  </div>
                )}
              </div>

              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={isUploading}
                  style={{
                    ...styles.pttButton,
                    background: "linear-gradient(135deg, #9333ea, #6b21a8)",
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 800 }}>
                    {isUploading ? "TRANSMITTING..." : `🎙️ TAP TO RECORD TO ${partnerName.toUpperCase()}`}
                  </div>
                  <div style={{ fontSize: 10.5, color: "#f3e8ff", opacity: 0.85, marginTop: 2 }}>
                    Tap once to start recording • You can Cancel or Send before it goes out
                  </div>
                </button>
              ) : (
                <div style={styles.activeRecordBox}>
                  <div style={styles.recordingIndicatorText}>
                    🔴 Recording voice note... <strong>{recSeconds}s</strong>
                  </div>
                  <div style={styles.recordActionsRow}>
                    <button type="button" onClick={cancelRecording} style={styles.cancelRecBtn}>
                      🗑️ Cancel
                    </button>
                    <button type="button" onClick={finishAndSendRecording} style={styles.sendRecBtn}>
                      ➤ Send to {partnerName} ({recSeconds}s)
                    </button>
                  </div>
                </div>
              )}

              {uploadNotice && <div style={styles.sentFooterStatus}>{uploadNotice}</div>}

              <div style={{ marginTop: 10, textAlign: "center" }}>
                <button onClick={() => setViewSentArchive((v) => !v)} style={styles.sentArchiveToggle}>
                  {viewSentArchive ? "Hide My Sent Log ▲" : `View My Sent Log (${sentTapes.length}) ▼`}
                </button>

                {viewSentArchive && (
                  <div style={styles.sentArchiveList}>
                    {sentTapes.length === 0 ? (
                      <div style={{ padding: 8, fontSize: 11, color: "#a78bfa" }}>No sent transmissions yet.</div>
                    ) : (
                      sentTapes.slice(0, 5).map((tape, idx) => (
                        <div key={tape.id || idx} style={styles.sentArchiveItem}>
                          <span>
                            {new Date(tape.created_at).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                            {tape.note_text ? ` • "${tape.note_text}"` : ` • ${tape.duration_sec}s audio`}
                          </span>
                          <span style={{ color: tape.is_listened ? "#4ade80" : "#fbbf24", fontWeight: 700 }}>
                            {tape.is_listened ? `✓ Heard by ${partnerName}` : `Sent to ${partnerName}`}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* =============================================================== */
          /* SECTION 2: 20-PUZZLE SINGLE-MODULE BOMB CO-OP GAME              */
          /* =============================================================== */
          <div>
            {/* ROLE SWITCHER: DEFUSER vs EXPERT */}
            <div style={styles.bombRoleBar}>
              <button
                type="button"
                onClick={() => setBombRole("defuser")}
                style={{
                  ...styles.bombRoleBtn,
                  ...(bombRole === "defuser" ? styles.bombRoleDefuserActive : {}),
                }}
              >
                💣 DEFUSER (1-Puzzle Bomb)
              </button>
              <button
                type="button"
                onClick={() => setBombRole("expert")}
                style={{
                  ...styles.bombRoleBtn,
                  ...(bombRole === "expert" ? styles.bombRoleExpertActive : {}),
                }}
              >
                📖 EXPERT (20-Puzzle Manual)
              </button>
            </div>

            {/* DIFFICULTY POOL SELECTOR */}
            <div style={styles.bombDiffBar}>
              {[
                { key: "ALL", label: "🎲 Any (20)" },
                { key: "EASY", label: "🟢 Easy (6)" },
                { key: "MEDIUM", label: "🟡 Med (6)" },
                { key: "HARD", label: "🔴 Hard (8)" },
              ].map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => {
                    setPoolFilter(d.key);
                    spawnRandomBomb(d.key);
                  }}
                  style={{
                    ...styles.bombDiffChip,
                    ...(poolFilter === d.key ? styles.bombDiffChipActive : {}),
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* BOMB HUD (COUNTDOWN, STRIKES, EDGEWORK CLUES) */}
            <div style={styles.bombHudCard}>
              <div style={styles.bombHudTopRow}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#a78bfa" }}>COUNTDOWN</div>
                  <div style={styles.digitalTimer}>
                    {bombMinutes}:{bombSeconds}
                  </div>
                </div>

                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#a78bfa", marginBottom: 4 }}>STRIKES</div>
                  <div style={{ display: "flex", gap: 5 }}>
                    {[1, 2, 3].map((s) => (
                      <div
                        key={s}
                        style={{
                          ...styles.strikeBox,
                          ...(bombState.strikes >= s ? styles.strikeBoxHit : {}),
                        }}
                      >
                        X
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-end" }}>
                  <button type="button" onClick={() => spawnRandomBomb()} style={styles.newBombBtn}>
                    🔄 New 1-Puzzle Bomb
                  </button>
                  <select
                    value={bombState.puzzleId}
                    onChange={(e) => spawnSpecificBomb(e.target.value)}
                    style={styles.puzzleSelectDropdown}
                  >
                    {PUZZLE_CATALOG.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} ({p.difficulty}) {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.edgeworkRow}>
                <span style={{ ...styles.edgePill, background: "#2e1065", borderColor: "#a855f7", color: "#fde047" }}>
                  SN: {bombState.serial} ({bombState.serialOdd ? "ODD" : "EVEN"})
                </span>
                <span style={styles.edgePill}>
                  🔋 {bombState.batteries} {bombState.batteries === 1 ? "Battery" : "Batteries"}
                </span>
                <span style={styles.edgePill}>💡 LED: {bombState.ledLit ? "LIT" : "UNLIT"}</span>
              </div>
            </div>

            {/* WIN / LOSS BANNER */}
            {bombState.gameOver && (
              <div
                style={{
                  ...styles.bombEndBanner,
                  background: bombState.solved
                    ? "linear-gradient(135deg, rgba(16,185,129,0.28), rgba(147,51,234,0.28))"
                    : "linear-gradient(135deg, rgba(244,63,94,0.3), rgba(136,19,55,0.4))",
                  borderColor: bombState.solved ? "#10b981" : "#f43f5e",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{bombState.endMessage}</div>
              </div>
            )}

            {/* ROLE VIEW 1: DEFUSER (1 SINGLE PUZZLE) */}
            {bombRole === "defuser" ? (
              <div
                style={{
                  ...styles.singleModuleCard,
                  borderColor: bombState.solved ? "#10b981" : "#6b21a8",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 800, color: "#f5d0fe" }}>
                    {activeBombPuzzle.code} // {activeBombPuzzle.title.toUpperCase()}
                  </span>
                  <span
                    style={{
                      ...styles.diffTag,
                      ...(activeBombPuzzle.difficulty === "EASY"
                        ? styles.diffEasy
                        : activeBombPuzzle.difficulty === "MEDIUM"
                        ? styles.diffMed
                        : styles.diffHard),
                    }}
                  >
                    {activeBombPuzzle.difficulty}
                  </span>
                </div>

                <div style={{ fontSize: 11.5, color: "#c4b5fd", marginBottom: 12 }}>
                  Tell {partnerName} to check <strong>{activeBombPuzzle.code} ({activeBombPuzzle.title})</strong> in the Expert Manual!
                </div>

                {/* RENDER WIRES PUZZLE */}
                {activeBombPuzzle.type === "wires" && (
                  <div>
                    <div style={styles.telemetryBox}>
                      <div style={styles.telemetryLabel}>MODULE TELEMETRY</div>
                      <div style={styles.telemetryValue}>{bombState.puzzleData.telemetry}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {bombState.puzzleData.wires.map((w, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleBombWireCut(idx)}
                          style={{
                            ...styles.wireBtn,
                            background: w.bg,
                            color: w.text,
                            opacity: w.cut ? 0.3 : 1,
                            textDecoration: w.cut ? "line-through" : "none",
                          }}
                        >
                          <span>{w.label}</span>
                          <span>{w.cut ? "✂️ CUT" : "✂️ TAP TO CUT"}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* RENDER CHOICE PUZZLE */}
                {activeBombPuzzle.type === "choice" && (
                  <div>
                    <div style={styles.telemetryBox}>
                      <div style={styles.telemetryLabel}>LIVE DISPLAY CLUE</div>
                      <div style={styles.telemetryValue}>{bombState.puzzleData.telemetry}</div>
                    </div>
                    <div style={styles.choicesGrid}>
                      {bombState.puzzleData.options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleBombChoiceTap(opt)}
                          style={styles.choiceBtn}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* RENDER SEQUENCE PUZZLE */}
                {activeBombPuzzle.type === "sequence" && (
                  <div>
                    <div style={styles.telemetryBox}>
                      <div style={styles.telemetryLabel}>
                        SEQUENCE CLUE ({bombState.puzzleData.step}/4 PRESSED)
                      </div>
                      <div style={styles.telemetryValue}>{bombState.puzzleData.telemetry}</div>
                    </div>
                    <div style={styles.choicesGrid}>
                      {bombState.puzzleData.buttons.map((bVal) => {
                        const alreadyDone = bombState.puzzleData.sequenceOrder
                          .slice(0, bombState.puzzleData.step)
                          .includes(bVal);
                        return (
                          <button
                            key={bVal}
                            type="button"
                            onClick={() => !alreadyDone && handleBombSequenceTap(bVal)}
                            style={{
                              ...styles.choiceBtn,
                              fontSize: 16,
                              ...(alreadyDone
                                ? { background: "#064e3b", borderColor: "#10b981", color: "#6ee7b7" }
                                : {}),
                            }}
                          >
                            {bVal}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* RENDER MULTISTAGE PUZZLE */}
                {activeBombPuzzle.type === "multistage" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 10 }}>
                      {bombState.puzzleData.stages.map((_, idx) => {
                        const isDone = idx < bombState.puzzleData.currentStage;
                        const isCur = idx === bombState.puzzleData.currentStage;
                        return (
                          <span
                            key={idx}
                            style={{
                              ...styles.stagePill,
                              ...(isDone
                                ? { background: "#064e3b", borderColor: "#10b981", color: "#6ee7b7" }
                                : isCur
                                ? { background: "#581c87", borderColor: "#f472b6", color: "#fff" }
                                : {}),
                            }}
                          >
                            STAGE {idx + 1}
                          </span>
                        );
                      })}
                    </div>
                    <div style={styles.telemetryBox}>
                      <div style={styles.telemetryLabel}>STAGE TELEMETRY</div>
                      <div style={styles.telemetryValue}>
                        {
                          bombState.puzzleData.stages[
                            Math.min(
                              bombState.puzzleData.currentStage,
                              bombState.puzzleData.stages.length - 1
                            )
                          ].prompt
                        }
                      </div>
                    </div>
                    <div style={styles.choicesGrid}>
                      {bombState.puzzleData.options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleBombMultistageTap(opt)}
                          style={styles.choiceBtn}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* RENDER MAZE PUZZLE */}
                {activeBombPuzzle.type === "maze" && (() => {
                  const cols = ["A", "B", "C", "D", "E"];
                  const pd = bombState.puzzleData;
                  const b1 = `${cols[pd.bp.beacons[0][1]]}${pd.bp.beacons[0][0] + 1}`;
                  const b2 = `${cols[pd.bp.beacons[1][1]]}${pd.bp.beacons[1][0] + 1}`;
                  return (
                    <div>
                      <div style={styles.telemetryBox}>
                        <div style={styles.telemetryLabel}>YELLOW BEACON COORDINATES</div>
                        <div style={styles.telemetryValue}>
                          🟡 {b1} &amp; {b2}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <div style={styles.mazeBoard}>
                          {[0, 1, 2, 3, 4].map((r) =>
                            [0, 1, 2, 3, 4].map((c) => {
                              const isBeacon = pd.bp.beacons.some((b) => b[0] === r && b[1] === c);
                              const isPlayer = pd.player[0] === r && pd.player[1] === c;
                              const isGoal = pd.goal[0] === r && pd.goal[1] === c;
                              const wasHit = pd.hitMines.includes(`${r},${c}`);
                              return (
                                <div
                                  key={`${r}-${c}`}
                                  style={{
                                    ...styles.mazeCell,
                                    borderColor: isBeacon ? "#fde047" : "#2e1759",
                                  }}
                                >
                                  {isPlayer ? (
                                    "🟢"
                                  ) : isGoal ? (
                                    "🎯"
                                  ) : wasHit ? (
                                    "💥"
                                  ) : isBeacon ? (
                                    "🟡"
                                  ) : (
                                    <span style={{ fontSize: 8, color: "#4c1d95" }}>
                                      {cols[c]}
                                      {r + 1}
                                    </span>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>

                        <div>
                          <div
                            style={{
                              textAlign: "center",
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 11,
                              color: "#fde047",
                              marginBottom: 6,
                            }}
                          >
                            POS: {cols[pd.player[1]]}
                            {pd.player[0] + 1}
                          </div>
                          <div style={styles.dpadGrid}>
                            <div />
                            <button type="button" onClick={() => handleBombMazeMove(-1, 0)} style={styles.dpadBtn}>
                              ▲
                            </button>
                            <div />
                            <button type="button" onClick={() => handleBombMazeMove(0, -1)} style={styles.dpadBtn}>
                              ◀
                            </button>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>🟢</div>
                            <button type="button" onClick={() => handleBombMazeMove(0, 1)} style={styles.dpadBtn}>
                              ▶
                            </button>
                            <div />
                            <button type="button" onClick={() => handleBombMazeMove(1, 0)} style={styles.dpadBtn}>
                              ▼
                            </button>
                            <div />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* ROLE VIEW 2: EXPERT 20-PUZZLE MANUAL */
              <div style={styles.manualContainer}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 800, color: "#38bdf8" }}>
                    📖 20-PUZZLE DEFUSAL MANUAL
                  </span>
                  <input
                    type="text"
                    placeholder="Search #01–#20 or name..."
                    value={manualSearch}
                    onChange={(e) => setManualSearch(e.target.value)}
                    style={styles.manualSearchField}
                  />
                </div>

                <div style={styles.bombDiffBar}>
                  {[
                    { key: "ALL", label: "All (20)" },
                    { key: "EASY", label: "🟢 Easy (#01–06)" },
                    { key: "MEDIUM", label: "🟡 Med (#07–12)" },
                    { key: "HARD", label: "🔴 Hard (#13–20)" },
                  ].map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setManualFilter(d.key)}
                      style={{
                        ...styles.bombDiffChip,
                        ...(manualFilter === d.key ? styles.bombDiffChipActive : {}),
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                <div style={{ maxHeight: 420, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                  {filteredManualPuzzles.map((p) => (
                    <div key={p.id} style={styles.manualCard}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 800, color: "#38bdf8" }}>
                          {p.code} // {p.title}
                        </span>
                        <span
                          style={{
                            ...styles.diffTag,
                            ...(p.difficulty === "EASY"
                              ? styles.diffEasy
                              : p.difficulty === "MEDIUM"
                              ? styles.diffMed
                              : styles.diffHard),
                          }}
                        >
                          {p.difficulty}
                        </span>
                      </div>
                      <div style={{ fontSize: 11.5, lineHeight: 1.5, color: "#e9d5ff" }}>
                        {p.rules.map((line, i) => (
                          <div key={i}>• {line}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MEMORY VAULT MODAL */}
      {vaultModalOpen && (
        <div style={styles.modalBackdrop} onClick={() => setVaultModalOpen(false)}>
          <div style={styles.modalSheet} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#f5d0fe" }}>
                  🗄️ {partnerName}&apos;s Memory Vault
                </div>
                <div style={{ fontSize: 11, color: "#a78bfa" }}>
                  Past voice notes &amp; Polaroids off the main stage
                </div>
              </div>
              <button onClick={() => setVaultModalOpen(false)} style={styles.closeModalBtn}>
                ✕
              </button>
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              <button
                onClick={() => setVaultTab("tapes")}
                style={{
                  ...styles.tabBtn,
                  ...(vaultTab === "tapes" ? styles.tabBtnActive : {}),
                }}
              >
                📼 Past Voice Tapes ({vaultTapes.length})
              </button>
              <button
                onClick={() => setVaultTab("polaroids")}
                style={{
                  ...styles.tabBtn,
                  ...(vaultTab === "polaroids" ? styles.tabBtnActive : {}),
                }}
              >
                🖼️ Polaroid Wall ({vaultPolaroids.length})
              </button>
            </div>

            {vaultTab === "tapes" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {vaultTapes.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 10px", color: "#a78bfa", fontSize: 12 }}>
                    No older voice tapes in the Vault yet.
                  </div>
                ) : (
                  vaultTapes.map((tape, idx) => {
                    const isThisPlaying = isPlaying && playingVaultId === tape.id;
                    return (
                      <div key={tape.id || idx} style={styles.vaultTapeRow}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#f3e8ff" }}>
                            Tape #{vaultTapes.length - idx} •{" "}
                            {new Date(tape.created_at).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            at{" "}
                            {new Date(tape.created_at).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </div>
                          {tape.note_text && (
                            <div style={{ fontSize: 11, color: "#d8b4fe", marginTop: 2 }}>
                              📝 &ldquo;{tape.note_text}&rdquo;
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => togglePlayVaultTape(tape)}
                          style={{
                            ...styles.vaultPlayBtn,
                            background: isThisPlaying ? "#ec4899" : "#581c87",
                          }}
                        >
                          {isThisPlaying ? "⏹ Stop" : `▶ Play (${tape.duration_sec || 5}s)`}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                {vaultPolaroids.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 10px", color: "#a78bfa", fontSize: 12 }}>
                    No past Polaroids in the Vault yet.
                  </div>
                ) : (
                  vaultPolaroids.map((tape, idx) => (
                    <div key={tape.id || idx} style={styles.polaroidFrame}>
                      {tape.polaroid_url && (
                        <div style={styles.polaroidPhotoArea}>
                          <img
                            src={tape.polaroid_url}
                            alt="Archived Polaroid"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </div>
                      )}
                      <div style={styles.polaroidCaption}>
                        {tape.note_text || `From ${partnerName} 💜`}
                      </div>
                      <div style={{ textAlign: "center", fontSize: 10, color: "#6b21a8", marginTop: 4 }}>
                        {new Date(tape.created_at).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        •{" "}
                        {new Date(tape.created_at).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* LIVE IN-APP CAMERA MODAL */}
      {cameraModalOpen && (
        <div style={styles.modalBackdrop} onClick={closeLiveCamera}>
          <div style={styles.cameraModalBox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#f5d0fe" }}>📸 Snap Polaroid Photo</span>
              <button onClick={closeLiveCamera} style={styles.closeModalBtn}>
                ✕
              </button>
            </div>

            <div style={styles.cameraViewportWrap}>
              <video ref={cameraVideoRef} autoPlay playsInline muted style={styles.cameraVideo} />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button type="button" onClick={flipCamera} style={styles.flipCameraBtn}>
                🔄 Flip Camera
              </button>
              <button type="button" onClick={snapCameraPhoto} style={styles.snapPhotoBtn}>
                📸 Capture Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATUS SELECTOR BOTTOM SHEET */}
      {statusModalOpen && (
        <div style={styles.modalBackdrop} onClick={() => setStatusModalOpen(false)}>
          <div style={styles.modalSheet} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#f5d0fe" }}>Update Your Radio Status</span>
              <button onClick={() => setStatusModalOpen(false)} style={styles.closeModalBtn}>
                ✕
              </button>
            </div>

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
    alignItems: "flex-start",
    padding: "12px",
    background: "radial-gradient(circle at top, #1e1035 0%, #090512 100%)",
  },
  radioChassis: {
    width: "100%",
    maxWidth: 440,
    background: "#130b24",
    border: "1.5px solid #3b1d6e",
    borderRadius: 28,
    padding: 14,
    boxShadow: "0 20px 60px rgba(0,0,0,0.75)",
  },
  sectionNavWrap: {
    display: "flex",
    gap: 6,
    background: "#0c0618",
    padding: 5,
    borderRadius: 16,
    border: "1px solid #2e1759",
    marginBottom: 12,
  },
  sectionNavBtn: {
    flex: 1,
    padding: "9px 10px",
    borderRadius: 12,
    border: "none",
    background: "transparent",
    color: "#a78bfa",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  sectionNavBtnActive: {
    background: "linear-gradient(135deg, #9333ea, #ec4899)",
    color: "#ffffff",
    boxShadow: "0 4px 14px rgba(236, 72, 153, 0.35)",
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
  tabBtnUnreadGlow: {
    borderColor: "#f472b6",
    boxShadow: "0 0 12px rgba(236, 72, 153, 0.4)",
  },
  unreadDot: {
    background: "linear-gradient(90deg, #ec4899, #f59e0b)",
    color: "#fff",
    fontSize: 8.5,
    fontWeight: 800,
    padding: "2px 6px",
    borderRadius: 999,
    animation: "badgePulse 1s infinite ease-in-out",
  },
  attachedDot: {
    background: "#7e22ce",
    color: "#fde047",
    fontSize: 9,
    fontWeight: 800,
    padding: "1px 5px",
    borderRadius: 999,
  },
  deckContainer: {
    border: "2px solid #3b1d6e",
    borderRadius: 18,
    padding: "12px",
    marginBottom: 8,
  },
  incomingHighlightBanner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "linear-gradient(90deg, #ec4899, #9333ea)",
    color: "#ffffff",
    fontSize: 10.5,
    fontWeight: 800,
    padding: "5px 10px",
    borderRadius: 8,
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  liveTagPill: {
    background: "#fde047",
    color: "#1e1b4b",
    fontSize: 8.5,
    fontWeight: 900,
    padding: "2px 6px",
    borderRadius: 999,
  },
  listenedStageBanner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#190d30",
    border: "1px solid #3b1d6e",
    color: "#a78bfa",
    fontSize: 10,
    fontWeight: 700,
    padding: "4px 8px",
    borderRadius: 8,
    marginBottom: 8,
  },
  moveToVaultMiniBtn: {
    background: "#2e1065",
    border: "1px solid #7e22ce",
    color: "#e9d5ff",
    fontSize: 9.5,
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: 6,
    cursor: "pointer",
  },
  polaroidAlertStrip: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    border: "1px solid",
    borderRadius: 8,
    padding: "6px 9px",
    fontSize: 10.5,
    color: "#f5d0fe",
    marginBottom: 8,
    cursor: "pointer",
  },
  tapeMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9.5,
    marginBottom: 6,
  },
  cassetteWindow: {
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
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
    padding: "5px 10px",
    borderRadius: 8,
    background: "#120824",
    border: "1px solid #4c1d95",
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
  playMainBtn: {
    flex: 1,
    padding: "11px",
    borderRadius: 10,
    border: "1.5px solid #fbcfe8",
    color: "#ffffff",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    letterSpacing: 0.4,
  },
  vaultLauncherBtn: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#170d2e",
    border: "1px solid #4c1d95",
    borderRadius: 14,
    padding: "9px 12px",
    marginBottom: 10,
    cursor: "pointer",
  },
  vaultOpenPill: {
    background: "#2e1065",
    border: "1px solid #7e22ce",
    color: "#e9d5ff",
    fontSize: 10.5,
    fontWeight: 700,
    padding: "4px 9px",
    borderRadius: 999,
  },
  vaultTapeRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#1c1036",
    border: "1px solid #3b1d6e",
    borderRadius: 10,
    padding: "9px 11px",
  },
  vaultPlayBtn: {
    border: "1px solid #c084fc",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    padding: "6px 10px",
    borderRadius: 8,
    cursor: "pointer",
    whiteSpace: "nowrap",
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
    padding: "5px",
    fontSize: 10.5,
    fontWeight: 800,
    color: "#ffffff",
    background: "linear-gradient(90deg, #ec4899, #9333ea)",
    border: "none",
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
  composerInputRow: {
    display: "flex",
    gap: 5,
    marginBottom: 8,
  },
  textInput: {
    flex: 1,
    background: "#100821",
    border: "1px solid #3b1d6e",
    borderRadius: 8,
    padding: "7px 9px",
    color: "#f3e8ff",
    fontSize: 11.5,
    minWidth: 0,
  },
  photoUploadBtn: {
    background: "#261447",
    border: "1px solid #581c87",
    borderRadius: 8,
    padding: "7px 8px",
    fontSize: 10.5,
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
    alignItems: "center",
    fontSize: 11,
    color: "#d8b4fe",
    background: "#120924",
    border: "1px solid #3b1d6e",
    borderRadius: 8,
    padding: "5px 8px",
    marginBottom: 8,
  },
  deliveryBox: {
    marginBottom: 8,
  },
  deliveryModeRow: {
    display: "flex",
    gap: 6,
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
    background: "#22113e",
    border: "1px solid #ec4899",
    borderRadius: 8,
    padding: "6px 10px",
    marginTop: 6,
  },
  timeInput: {
    background: "#130826",
    color: "#fff",
    border: "1px solid #f472b6",
    borderRadius: 6,
    padding: "4px 8px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11.5,
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
  activeRecordBox: {
    background: "#230f38",
    border: "1.5px solid #ec4899",
    borderRadius: 14,
    padding: "10px",
    textAlign: "center",
  },
  recordingIndicatorText: {
    fontSize: 13,
    color: "#fbcfe8",
    marginBottom: 8,
  },
  recordActionsRow: {
    display: "flex",
    gap: 8,
  },
  cancelRecBtn: {
    flex: 1,
    padding: "10px",
    borderRadius: 10,
    background: "#31102f",
    border: "1px solid #f43f5e",
    color: "#fda4af",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  sendRecBtn: {
    flex: 2,
    padding: "10px",
    borderRadius: 10,
    background: "linear-gradient(135deg, #ec4899, #9333ea)",
    border: "1px solid #fbcfe8",
    color: "#ffffff",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
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

  // -------------------------------------------------------------------------
  // BOMB CO-OP STYLES
  // -------------------------------------------------------------------------
  bombRoleBar: {
    display: "flex",
    gap: 6,
    marginBottom: 10,
  },
  bombRoleBtn: {
    flex: 1,
    padding: "9px",
    borderRadius: 12,
    border: "1px solid #3b1d6e",
    background: "#190e30",
    color: "#c4b5fd",
    fontSize: 11.5,
    fontWeight: 800,
    cursor: "pointer",
  },
  bombRoleDefuserActive: {
    background: "#3b1130",
    borderColor: "#f43f5e",
    color: "#fda4af",
  },
  bombRoleExpertActive: {
    background: "#172554",
    borderColor: "#38bdf8",
    color: "#bae6fd",
  },
  bombDiffBar: {
    display: "flex",
    gap: 5,
    marginBottom: 10,
  },
  bombDiffChip: {
    flex: 1,
    padding: "6px 4px",
    borderRadius: 8,
    border: "1px solid #2e1759",
    background: "#120924",
    color: "#c4b5fd",
    fontSize: 10.5,
    fontWeight: 800,
    cursor: "pointer",
  },
  bombDiffChipActive: {
    background: "#4c1d95",
    borderColor: "#c084fc",
    color: "#fff",
  },
  bombHudCard: {
    background: "#0b0514",
    border: "1.5px solid #4c1d95",
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
  },
  bombHudTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  digitalTimer: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 26,
    fontWeight: 800,
    color: "#f43f5e",
    background: "#1a0510",
    border: "1px solid #881337",
    padding: "4px 10px",
    borderRadius: 10,
    letterSpacing: 2,
  },
  strikeBox: {
    width: 25,
    height: 25,
    borderRadius: 6,
    background: "#190d29",
    border: "1px solid #3b1d6e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    fontWeight: 800,
    color: "#3b1d6e",
  },
  strikeBoxHit: {
    background: "#4c0519",
    borderColor: "#f43f5e",
    color: "#f43f5e",
  },
  newBombBtn: {
    background: "linear-gradient(135deg, #9333ea, #ec4899)",
    border: "1px solid #fbcfe8",
    color: "#fff",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 10.5,
    fontWeight: 800,
    cursor: "pointer",
  },
  puzzleSelectDropdown: {
    background: "#190d30",
    color: "#e9d5ff",
    border: "1px solid #4c1d95",
    borderRadius: 6,
    padding: "3px 6px",
    fontSize: 10,
    maxWidth: 155,
  },
  edgeworkRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    paddingTop: 8,
    borderTop: "1px dashed #2e1759",
  },
  edgePill: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    fontWeight: 700,
    padding: "4px 8px",
    borderRadius: 6,
    background: "#1b1033",
    border: "1px solid #4c1d95",
    color: "#e9d5ff",
  },
  bombEndBanner: {
    textAlign: "center",
    padding: "12px",
    borderRadius: 14,
    border: "1.5px solid",
    marginBottom: 12,
  },
  singleModuleCard: {
    background: "#180d2c",
    border: "2px solid #6b21a8",
    borderRadius: 20,
    padding: 14,
  },
  diffTag: {
    fontSize: 9.5,
    fontWeight: 900,
    padding: "3px 8px",
    borderRadius: 999,
  },
  diffEasy: { background: "rgba(16,185,129,0.2)", color: "#6ee7b7", border: "1px solid #10b981" },
  diffMed: { background: "rgba(245,158,11,0.2)", color: "#fcd34d", border: "1px solid #f59e0b" },
  diffHard: { background: "rgba(244,63,94,0.2)", color: "#fda4af", border: "1px solid #f43f5e" },
  telemetryBox: {
    background: "#0b0514",
    border: "1.5px solid #4c1d95",
    borderRadius: 14,
    padding: "12px",
    textAlign: "center",
    marginBottom: 12,
  },
  telemetryLabel: {
    fontSize: 9.5,
    color: "#a78bfa",
    fontWeight: 700,
    letterSpacing: 0.5,
  },
  telemetryValue: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 18,
    fontWeight: 800,
    color: "#fde047",
    marginTop: 4,
  },
  wireBtn: {
    width: "100%",
    height: 34,
    borderRadius: 999,
    border: "2px solid rgba(255,255,255,0.28)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 14px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    fontWeight: 800,
  },
  choicesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 10,
  },
  choiceBtn: {
    padding: "13px 10px",
    borderRadius: 12,
    background: "#251347",
    border: "1.5px solid #6b21a8",
    color: "#f3e8ff",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  stagePill: {
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 800,
    background: "#120824",
    border: "1px solid #3b1d6e",
    color: "#a78bfa",
  },
  mazeBoard: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 34px)",
    gridTemplateRows: "repeat(5, 34px)",
    gap: 4,
    background: "#0d061a",
    padding: 6,
    borderRadius: 12,
    border: "1px solid #3b1d6e",
  },
  mazeCell: {
    width: 34,
    height: 34,
    borderRadius: 6,
    background: "#1a0f30",
    border: "1px solid #2e1759",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
  },
  dpadGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 36px)",
    gridTemplateRows: "repeat(3, 34px)",
    gap: 4,
  },
  dpadBtn: {
    background: "#261447",
    border: "1px solid #6b21a8",
    borderRadius: 8,
    color: "#fff",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },
  manualContainer: {
    background: "#100820",
    border: "1.5px solid #38bdf8",
    borderRadius: 18,
    padding: 12,
  },
  manualSearchField: {
    background: "#190e30",
    border: "1px solid #38bdf8",
    color: "#fff",
    borderRadius: 6,
    padding: "4px 8px",
    fontSize: 11,
    width: 150,
  },
  manualCard: {
    background: "#1a1030",
    border: "1px solid #3b1d6e",
    borderRadius: 12,
    padding: "10px 12px",
  },

  // -------------------------------------------------------------------------
  // MODALS & LOCK SCREEN
  // -------------------------------------------------------------------------
  modalBackdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.8)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: 14,
  },
  cameraModalBox: {
    width: "100%",
    maxWidth: 380,
    background: "#150c29",
    border: "1.5px solid #a855f7",
    borderRadius: 20,
    padding: 14,
  },
  cameraViewportWrap: {
    width: "100%",
    height: 260,
    background: "#090512",
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid #3b1d6e",
  },
  cameraVideo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  flipCameraBtn: {
    flex: 1,
    padding: "10px",
    borderRadius: 10,
    background: "#261447",
    border: "1px solid #581c87",
    color: "#e9d5ff",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  snapPhotoBtn: {
    flex: 2,
    padding: "10px",
    borderRadius: 10,
    background: "linear-gradient(135deg, #ec4899, #9333ea)",
    border: "1px solid #fbcfe8",
    color: "#ffffff",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  modalSheet: {
    width: "100%",
    maxWidth: 430,
    background: "#150c29",
    border: "1.5px solid #581c87",
    borderRadius: 20,
    padding: "16px",
    maxHeight: "82vh",
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
