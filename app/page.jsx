"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const PASSCODE = "0507";
const DISTANCE_KM = 1258;
const SILENT_AUDIO_CARRIER = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP8A";

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

const PUZZLE_CATALOG = [
  {
    id: 1,
    code: "#01",
    title: "BBI–GreNo Power Wires",
    difficulty: "EASY",
    timerSec: 50,
    type: "wires",
    rules: [
      "If Serial Number last digit is ODD -> Cut WIRE #1.",
      "Else if there are 2 or more Batteries -> Cut WIRE #4.",
      "Otherwise -> Cut WIRE #2.",
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
    timerSec: 50,
    type: "choice",
    rules: [
      "SIGNAL: ALPHA -> Tap 12.10 MHz",
      "SIGNAL: BRAVO -> If Batteries >= 2 tap 14.02 MHz, else tap 19.99 MHz",
      "SIGNAL: DELTA -> Tap 24.07 MHz",
    ],
    setup: (bomb) => {
      const sigs = ["SIGNAL: ALPHA", "SIGNAL: BRAVO", "SIGNAL: DELTA"];
      const sig = sigs[Math.floor(Math.random() * sigs.length)];
      let answer = "12.10 MHz";
      if (sig === "SIGNAL: BRAVO") answer = bomb.batteries >= 2 ? "14.02 MHz" : "19.99 MHz";
      if (sig === "SIGNAL: DELTA") answer = "24.07 MHz";
      return { telemetry: sig, options: ["12.10 MHz", "14.02 MHz", "19.99 MHz", "24.07 MHz"], answer };
    },
  },
  {
    id: 3,
    code: "#03",
    title: "Emergency Love Override",
    difficulty: "EASY",
    timerSec: 50,
    type: "choice",
    rules: [
      "If LED is LIT and prompt says PINK: HUG -> Tap OVERRIDE ALPHA.",
      "If LED is LIT (other prompt) -> Tap OVERRIDE BETA.",
      "If LED is UNLIT -> Tap OVERRIDE GAMMA.",
    ],
    setup: (bomb) => {
      const prompts = ["PINK: HUG", "PURPLE: CALL", "GOLD: WAIT"];
      const p = prompts[Math.floor(Math.random() * prompts.length)];
      let answer = "OVERRIDE GAMMA";
      if (bomb.ledLit && p === "PINK: HUG") answer = "OVERRIDE ALPHA";
      else if (bomb.ledLit) answer = "OVERRIDE BETA";
      return { telemetry: p, options: ["OVERRIDE ALPHA", "OVERRIDE BETA", "OVERRIDE GAMMA", "OVERRIDE DELTA"], answer };
    },
  },
  {
    id: 4,
    code: "#04",
    title: "Weather Bridge Valve",
    difficulty: "EASY",
    timerSec: 50,
    type: "choice",
    rules: [
      "MONSOON IN BBI -> ODD Serial: CYAN VALVE | EVEN Serial: AMBER VALVE",
      "FOG IN GRENO -> ODD Serial: VIOLET VALVE | EVEN Serial: ROSE VALVE",
      "HEATWAVE -> Always tap CYAN VALVE",
    ],
    setup: (bomb) => {
      const alerts = ["MONSOON IN BBI", "FOG IN GRENO", "HEATWAVE"];
      const a = alerts[Math.floor(Math.random() * alerts.length)];
      let answer = "CYAN VALVE";
      if (a === "MONSOON IN BBI") answer = bomb.serialOdd ? "CYAN VALVE" : "AMBER VALVE";
      if (a === "FOG IN GRENO") answer = bomb.serialOdd ? "VIOLET VALVE" : "ROSE VALVE";
      return { telemetry: a, options: ["CYAN VALVE", "AMBER VALVE", "VIOLET VALVE", "ROSE VALVE"], answer };
    },
  },
  {
    id: 5,
    code: "#05",
    title: "Cassette Tape Splice",
    difficulty: "EASY",
    timerSec: 50,
    type: "wires",
    rules: [
      "If LED is LIT and Batteries >= 2 -> Cut TRACK C (ROSE).",
      "Else if LED is LIT -> Cut TRACK A (VIOLET).",
      "Otherwise -> Cut TRACK D (CYAN).",
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
    timerSec: 50,
    type: "choice",
    rules: [
      "MASALA CHAI ☕ -> Tap DRONE NORTH",
      "HOT MOMOS 🥟 -> Tap DRONE WEST",
      "BIRYANI 🍲 -> If Batteries == 1 tap DRONE EAST, else tap EXPRESS DROP",
    ],
    setup: (bomb) => {
      const items = ["MASALA CHAI ☕", "HOT MOMOS 🥟", "BIRYANI 🍲"];
      const item = items[Math.floor(Math.random() * items.length)];
      let answer = "DRONE NORTH";
      if (item === "HOT MOMOS 🥟") answer = "DRONE WEST";
      if (item === "BIRYANI 🍲") answer = bomb.batteries === 1 ? "DRONE EAST" : "EXPRESS DROP";
      return { telemetry: item, options: ["DRONE NORTH", "DRONE WEST", "DRONE EAST", "EXPRESS DROP"], answer };
    },
  },
  {
    id: 7,
    code: "#07",
    title: "Constellation Symbol Keypad",
    difficulty: "MEDIUM",
    timerSec: 60,
    type: "sequence",
    rules: [
      "Find row containing all 4 symbols, press in exact order:",
      "ROW 1: ⚡ -> 🌙 -> ⭐ -> 🪐",
      "ROW 2: 🔥 -> 💜 -> 🎧 -> ✈️",
      "ROW 3: 📻 -> 📸 -> 🔑 -> 💎",
    ],
    setup: () => {
      const rows = [
        ["⚡", "🌙", "⭐", "🪐"],
        ["🔥", "💜", "🎧", "✈️"],
        ["📻", "📸", "🔑", "💎"],
      ];
      const chosen = rows[Math.floor(Math.random() * rows.length)];
      return { telemetry: "PRESS ALL 4 IN ORDER", sequenceOrder: chosen, buttons: [...chosen].sort(() => Math.random() - 0.5), step: 0 };
    },
  },
  {
    id: 8,
    code: "#08",
    title: "Flight Path BBI ✈️ DEL",
    difficulty: "MEDIUM",
    timerSec: 60,
    type: "multistage",
    rules: [
      "Stage 1: If sky is CLEAR tap VEC-10, if STORM tap VEC-20.",
      "Stage 2: If Batteries >= 2 tap VEC-30, else tap VEC-40.",
      "Stage 3: If Serial is ODD tap VEC-10, else tap VEC-40.",
    ],
    setup: (bomb) => {
      const cond = Math.random() > 0.5 ? "CLEAR" : "STORM";
      const stages = [
        { prompt: `STAGE 1 // SKY: ${cond}`, answer: cond === "CLEAR" ? "VEC-10" : "VEC-20" },
        { prompt: "STAGE 2 // CHECK BATTERIES", answer: bomb.batteries >= 2 ? "VEC-30" : "VEC-40" },
        { prompt: "STAGE 3 // CHECK SERIAL", answer: bomb.serialOdd ? "VEC-10" : "VEC-40" },
      ];
      return { stages, options: ["VEC-10", "VEC-20", "VEC-30", "VEC-40"], currentStage: 0 };
    },
  },
  {
    id: 9,
    code: "#09",
    title: "Polaroid Darkroom Chemicals",
    difficulty: "MEDIUM",
    timerSec: 60,
    type: "sequence",
    rules: [
      "ISO-100: DEV -> STOP -> FIX -> WASH",
      "ISO-400: STOP -> DEV -> WASH -> FIX",
      "ISO-800: FIX -> WASH -> DEV -> STOP",
    ],
    setup: () => {
      const table = {
        "FILM: ISO-100": ["DEV", "STOP", "FIX", "WASH"],
        "FILM: ISO-400": ["STOP", "DEV", "WASH", "FIX"],
        "FILM: ISO-800": ["FIX", "WASH", "DEV", "STOP"],
      };
      const keys = Object.keys(table);
      const k = keys[Math.floor(Math.random() * keys.length)];
      return { telemetry: k, sequenceOrder: table[k], buttons: [...table[k]].sort(() => Math.random() - 0.5), step: 0 };
    },
  },
  {
    id: 10,
    code: "#10",
    title: "Who Said What? Audio Paradox",
    difficulty: "MEDIUM",
    timerSec: 60,
    type: "multistage",
    rules: [
      '"MISSING YOU" -> Stage 1: OKAY | Stage 2: SOON | Stage 3: WAIT',
      '"ON MY WAY" -> Stage 1: WAIT | Stage 2: HERE | Stage 3: OKAY',
      '"CALL ME" -> Always tap HERE in every stage.',
    ],
    setup: () => {
      const map = {
        "MISSING YOU": ["OKAY", "SOON", "WAIT"],
        "ON MY WAY": ["WAIT", "HERE", "OKAY"],
        "CALL ME": ["HERE", "HERE", "HERE"],
      };
      const words = Object.keys(map);
      const stages = [0, 1, 2].map((idx) => {
        const w = words[Math.floor(Math.random() * words.length)];
        return { prompt: `DISPLAY: "${w}"`, answer: map[w][idx] };
      });
      return { stages, options: ["WAIT", "OKAY", "HERE", "SOON"], currentStage: 0 };
    },
  },
  {
    id: 11,
    code: "#11",
    title: "Biometric Heartbeat ECG",
    difficulty: "MEDIUM",
    timerSec: 60,
    type: "sequence",
    rules: [
      "60 BPM: P-WAVE -> QRS -> T-WAVE -> SYNC",
      "72 BPM: QRS -> P-WAVE -> SYNC -> T-WAVE",
      "96 BPM: SYNC -> T-WAVE -> QRS -> P-WAVE",
    ],
    setup: () => {
      const map = {
        "PULSE: 60 BPM": ["P-WAVE", "QRS", "T-WAVE", "SYNC"],
        "PULSE: 72 BPM": ["QRS", "P-WAVE", "SYNC", "T-WAVE"],
        "PULSE: 96 BPM": ["SYNC", "T-WAVE", "QRS", "P-WAVE"],
      };
      const keys = Object.keys(map);
      const k = keys[Math.floor(Math.random() * keys.length)];
      return { telemetry: k, sequenceOrder: map[k], buttons: [...map[k]].sort(() => Math.random() - 0.5), step: 0 };
    },
  },
  {
    id: 12,
    code: "#12",
    title: "Encrypted Callsign PIN",
    difficulty: "MEDIUM",
    timerSec: 60,
    type: "sequence",
    rules: [
      "CODE: BBI-1 -> Press 1 -> 2 -> 5 -> 7",
      "CODE: GRN-2 -> Press 7 -> 5 -> 2 -> 1",
      "CODE: FRQ-3 -> Press 2 -> 7 -> 1 -> 5",
    ],
    setup: () => {
      const map = {
        "CODE: BBI-1": ["1", "2", "5", "7"],
        "CODE: GRN-2": ["7", "5", "2", "1"],
        "CODE: FRQ-3": ["2", "7", "1", "5"],
      };
      const keys = Object.keys(map);
      const k = keys[Math.floor(Math.random() * keys.length)];
      return { telemetry: k, sequenceOrder: map[k], buttons: ["1", "2", "5", "7"], step: 0 };
    },
  },
  {
    id: 13,
    code: "#13",
    title: "Stealth Laser Grid: BBI ↔ GreNo",
    difficulty: "HARD",
    timerSec: 70,
    type: "maze",
    rules: [
      "Guide 🟢 from A1 to 🎯 at E5 without hitting hidden Mines:",
      "Beacons B1 & D4 -> Safe Path: A1->A2->A3->A4->B4->B5->C5->D5->E5",
      "Beacons A3 & E2 -> Safe Path: A1->B1->B2->B3->B4->B5->C5->D5->E5",
      "Beacons C1 & C5 -> Safe Path: A1->B1->C1->C2->C3->C4->C5->D5->E5",
    ],
    setup: () => {
      const bps = [
        { beacons: [[0, 1], [3, 3]], mines: [[0, 3], [1, 1], [1, 3], [2, 1], [3, 2], [4, 0]] },
        { beacons: [[2, 0], [1, 4]], mines: [[0, 2], [1, 2], [2, 2], [2, 4], [3, 0], [3, 2]] },
        { beacons: [[0, 2], [4, 2]], mines: [[1, 0], [1, 1], [1, 3], [3, 1], [3, 3], [3, 4]] },
      ];
      return { bp: bps[Math.floor(Math.random() * bps.length)], player: [0, 0], goal: [4, 4], hitMines: [] };
    },
  },
  {
    id: 14,
    code: "#14",
    title: "3-Stage Memory Core",
    difficulty: "HARD",
    timerSec: 70,
    type: "multistage",
    rules: [
      "Stage 1: If Serial is ODD tap CORE-A, else tap CORE-B.",
      "Stage 2: If LED is LIT tap CORE-C, else tap CORE-D.",
      "Stage 3: If Batteries >= 2 AND Serial is ODD tap CORE-D, else tap CORE-A.",
    ],
    setup: (bomb) => {
      const stages = [
        { prompt: "MEMORY 1 // SERIAL PARITY", answer: bomb.serialOdd ? "CORE-A" : "CORE-B" },
        { prompt: "MEMORY 2 // LED STATUS", answer: bomb.ledLit ? "CORE-C" : "CORE-D" },
        { prompt: "MEMORY 3 // COMBINED CHECK", answer: bomb.batteries >= 2 && bomb.serialOdd ? "CORE-D" : "CORE-A" },
      ];
      return { stages, options: ["CORE-A", "CORE-B", "CORE-C", "CORE-D"], currentStage: 0 };
    },
  },
  {
    id: 15,
    code: "#15",
    title: "12.10 MHz Morse Decoder",
    difficulty: "HARD",
    timerSec: 70,
    type: "choice",
    rules: [
      "••• —•—• (SC) -> Lock 12.05 MHz",
      "•——— •— (JA) -> Lock 12.10 MHz",
      "•—•• ••— (LU) -> Lock 12.25 MHz",
      "•••• ••— (HU) -> Lock 12.50 MHz",
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
      return { telemetry: k, options: ["12.05 MHz", "12.10 MHz", "12.25 MHz", "12.50 MHz"], answer: map[k] };
    },
  },
  {
    id: 16,
    code: "#16",
    title: "6-Wire High-Tension Matrix",
    difficulty: "HARD",
    timerSec: 70,
    type: "wires",
    rules: [
      "1. If Serial is ODD and Batteries == 3 -> Cut WIRE #6.",
      "2. Else if LED is LIT and Serial is EVEN -> Cut WIRE #5.",
      "3. Else if Batteries == 1 -> Cut WIRE #2.",
      "4. Otherwise -> Cut WIRE #4.",
    ],
    setup: (bomb) => {
      const list = [
        { label: "WIRE #1 (RED)", bg: "#dc2626", text: "#fff", cut: false },
        { label: "WIRE #2 (BLUE)", bg: "#2563eb", text: "#fff", cut: false },
        { label: "WIRE #3 (GOLD)", bg: "#eab308", text: "#1e1b4b", cut: false },
        { label: "WIRE #4 (VIOLET)", bg: "#7e22ce", text: "#fff", cut: false },
        { label: "WIRE #5 (ROSE)", bg: "#ec4899", text: "#fff", cut: false },
        { label: "WIRE #6 (WHITE)", bg: "#e2e8f0", text: "#0f172a", cut: false },
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
    timerSec: 70,
    type: "choice",
    rules: [
      "Formula: (Base Voltage × Batteries) + (10 if Serial is ODD, else 5)",
      "Example: Base 12V, 2 Batteries, ODD Serial -> (12 × 2) + 10 = 34.",
    ],
    setup: (bomb) => {
      const bases = [10, 12, 15];
      const base = bases[Math.floor(Math.random() * bases.length)];
      const bonus = bomb.serialOdd ? 10 : 5;
      const correctVal = base * bomb.batteries + bonus;
      const set = new Set([correctVal, correctVal + 5, correctVal - 5, base * 2 + 10, base + 15]);
      const options = Array.from(set).slice(0, 4).sort((a, b) => a - b).map(String);
      if (!options.includes(String(correctVal))) options[0] = String(correctVal);
      return { telemetry: `BASE VOLTAGE: ${base}V`, options, answer: String(correctVal) };
    },
  },
  {
    id: 18,
    code: "#18",
    title: "Simon's Frequency Echo",
    difficulty: "HARD",
    timerSec: 70,
    type: "multistage",
    rules: [
      "FLASH: PINK -> Tap CYAN",
      "FLASH: CYAN -> Tap GOLD",
      "FLASH: GOLD -> Tap VIOLET",
      "FLASH: VIOLET -> Tap PINK",
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
    timerSec: 70,
    type: "choice",
    rules: [
      "LOCK-RED: If LED is LIT -> KEY-05 | If LED is UNLIT -> KEY-07",
      "LOCK-BLUE: If Serial is ODD -> KEY-10 | If Serial is EVEN -> KEY-12",
      "LOCK-GOLD: If Batteries >= 2 -> KEY-12 | Else -> KEY-05",
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
    timerSec: 70,
    type: "multistage",
    rules: [
      "Step 1 (Power): If Batteries >= 2 tap SYNC-A, else tap SYNC-B.",
      "Step 2 (Signal): If LED is LIT tap SYNC-C, else tap SYNC-D.",
      "Step 3 (Final Core): If Serial is ODD tap SYNC-D, else tap SYNC-A.",
    ],
    setup: (bomb) => {
      const stages = [
        { prompt: "GAUNTLET 1/3 // AUX POWER", answer: bomb.batteries >= 2 ? "SYNC-A" : "SYNC-B" },
        { prompt: "GAUNTLET 2/3 // LED POLARITY", answer: bomb.ledLit ? "SYNC-C" : "SYNC-D" },
        { prompt: "GAUNTLET 3/3 // FINAL CORE", answer: bomb.serialOdd ? "SYNC-D" : "SYNC-A" },
      ];
      return { stages, options: ["SYNC-A", "SYNC-B", "SYNC-C", "SYNC-D"], currentStage: 0 };
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

function compressImageToDataUrl(file, maxWidth = 380) {
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
        resolve(canvas.toDataURL("image/jpeg", 0.55));
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

function soundBeep() { playTone(880, 80, "square", 0.12); }
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

export default function WalkieTalkieApp() {
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [myStation, setMyStation] = useState("bbi");
  const [notifEnabled, setNotifEnabled] = useState(false);

  const [appSection, setAppSection] = useState("radio");

  const [weather, setWeather] = useState({
    bbi: { temp: "29°C", feels: "32°C", humidity: "65%", wind: "11 km/h", icon: "⛅", condition: "Partly Cloudy" },
    greno: { temp: "28°C", feels: "29°C", humidity: "42%", wind: "8 km/h", icon: "☀️", condition: "Clear Sky" },
  });

  const [stations, setStations] = useState({
    bbi: { station_id: "bbi", display_name: "Sarthak • BBI", city: "Bhubaneswar", current_mood: "Free to talk right now! 🎙️", heart_active: false },
    greno: { station_id: "greno", display_name: "Jaai • GreNo", city: "Greater Noida", current_mood: "Free to talk right now! 🎙️", heart_active: false },
  });

  const [tapes, setTapes] = useState([]);
  const [readTapeIds, setReadTapeIds] = useState([]);
  const [readPolaroidIds, setReadPolaroidIds] = useState([]);
  const [vaultedTapeIds, setVaultedTapeIds] = useState([]);

  const [activeTab, setActiveTab] = useState("tape");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingVaultId, setPlayingVaultId] = useState(null);
  const [nowTs, setNowTs] = useState(Date.now());

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [customStatusInput, setCustomStatusInput] = useState("");
  const [vaultModalOpen, setVaultModalOpen] = useState(false);
  const [vaultTab, setVaultTab] = useState("tapes");
  const [viewSentArchive, setViewSentArchive] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [noteText, setNoteText] = useState("");
  const [polaroidDataUrl, setPolaroidDataUrl] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("instant");
  const [unlockTimeStr, setUnlockTimeStr] = useState("23:30");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState("");

  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState("user");

  const [partnerOnline, setPartnerOnline] = useState(false);
  const [myThumbDown, setMyThumbDown] = useState(false);
  const [partnerThumbDown, setPartnerThumbDown] = useState(false);
  const [syncSeconds, setSyncSeconds] = useState(0);

  const [bombRole, setBombRole] = useState("defuser");
  const [poolFilter, setPoolFilter] = useState("ALL");
  const [manualFilter, setManualFilter] = useState("ALL");
  const [manualSearch, setManualSearch] = useState("");

  const [bombSession, setBombSession] = useState({
    status: "idle",
    puzzleId: 1,
    serial: "12X-AB7",
    serialOdd: true,
    batteries: 2,
    ledLit: true,
    timerSec: 50,
    startTimeMs: 0,
    strikes: 0,
    endMessage: "",
    puzzleData: PUZZLE_CATALOG[0].setup({ serialOdd: true, batteries: 2, ledLit: true }),
  });

  const [secondsRemaining, setSecondsRemaining] = useState(50);

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

  const myHeartOn = Boolean(stations[myStation]?.heart_active);
  const partnerHeartOn = Boolean(stations[partnerStation]?.heart_active);
  const bothThumbsSynced = myThumbDown && partnerThumbDown;

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

  const broadcastSyncEvent = (event, payload) => {
    if (presenceChannelRef.current) {
      presenceChannelRef.current.send({ type: "broadcast", event, payload });
    }
  };

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
            if (!newTape.audio_url || newTape.audio_url === SILENT_AUDIO_CARRIER) {
              setActiveTab("polaroid");
            } else {
              setActiveTab("tape");
            }
            sendPhoneNotification(
              `🎙️ New Message from ${partnerName}!`,
              newTape.polaroid_url ? `${partnerName} sent a Polaroid on 12.10 MHz!` : `${partnerName} sent a Voice Tape!`
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
      .on("broadcast", { event: "bomb_action" }, ({ payload }) => {
        if (payload.type === "start") {
          soundBeep();
          setBombSession(payload.session);
          setSecondsRemaining(payload.session.timerSec);
        } else if (payload.type === "strike") {
          soundStrike();
          setBombSession(payload.session);
        } else if (payload.type === "defused") {
          soundSuccess();
          setBombSession(payload.session);
        } else if (payload.type === "abort") {
          setBombSession(payload.session);
        } else if (payload.type === "sync_update") {
          setBombSession(payload.session);
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

  useEffect(() => {
    if (bombSession.status !== "running") return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - bombSession.startTimeMs) / 1000);
      const remaining = Math.max(0, bombSession.timerSec - elapsed);
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        soundStrike();
        const explodedSession = {
          ...bombSession,
          status: "exploded",
          endMessage: "⏰ TIME EXPIRED! THE BOMB DETONATED!",
        };
        setBombSession(explodedSession);
        broadcastSyncEvent("bomb_action", { type: "strike", session: explodedSession });
      }
    }, 500);

    return () => clearInterval(interval);
  }, [bombSession]);

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

  const activePuzzle = useMemo(() => {
    return PUZZLE_CATALOG.find((p) => p.id === bombSession.puzzleId) || PUZZLE_CATALOG[0];
  }, [bombSession.puzzleId]);

  const startNewBombGame = (chosenId) => {
    const pool =
      poolFilter === "ALL" ? PUZZLE_CATALOG : PUZZLE_CATALOG.filter((p) => p.difficulty === poolFilter);
    const selectedPuzzle =
      (chosenId && PUZZLE_CATALOG.find((p) => p.id === Number(chosenId))) ||
      pool[Math.floor(Math.random() * pool.length)] ||
      PUZZLE_CATALOG[0];

    const lastDigit = Math.floor(Math.random() * 9) + 1;
    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const l1 = letters[Math.floor(Math.random() * letters.length)];
    const l2 = letters[Math.floor(Math.random() * letters.length)];
    const serialOdd = lastDigit % 2 === 1;
    const batteries = Math.floor(Math.random() * 3) + 1;
    const ledLit = Math.random() > 0.45;

    const baseBomb = { serial: `12X-${l1}${l2}${lastDigit}`, serialOdd, batteries, ledLit };

    const newSession = {
      status: "running",
      puzzleId: selectedPuzzle.id,
      serial: baseBomb.serial,
      serialOdd: baseBomb.serialOdd,
      batteries: baseBomb.batteries,
      ledLit: baseBomb.ledLit,
      timerSec: selectedPuzzle.timerSec,
      startTimeMs: Date.now(),
      strikes: 0,
      endMessage: "",
      puzzleData: selectedPuzzle.setup(baseBomb),
    };

    soundBeep();
    setBombSession(newSession);
    setSecondsRemaining(selectedPuzzle.timerSec);
    broadcastSyncEvent("bomb_action", { type: "start", session: newSession });
  };

  const abortBombGame = () => {
    const idleSession = { ...bombSession, status: "idle", endMessage: "Mission Aborted." };
    setBombSession(idleSession);
    broadcastSyncEvent("bomb_action", { type: "abort", session: idleSession });
  };

  const registerBombStrike = (nextPuzzleData) => {
    soundStrike();
    const nextStrikes = bombSession.strikes + 1;
    const isExploded = nextStrikes >= 3;
    const updated = {
      ...bombSession,
      strikes: nextStrikes,
      status: isExploded ? "exploded" : "running",
      endMessage: isExploded ? "💥 3 STRIKES! THE BOMB DETONATED!" : "",
      puzzleData: nextPuzzleData || bombSession.puzzleData,
    };
    setBombSession(updated);
    broadcastSyncEvent("bomb_action", { type: "strike", session: updated });
  };

  const registerBombDefused = (nextPuzzleData) => {
    soundSuccess();
    const updated = {
      ...bombSession,
      status: "defused",
      endMessage: `🎉 PUZZLE ${activePuzzle.code} SOLVED! BOMB DEFUSED!`,
      puzzleData: nextPuzzleData || bombSession.puzzleData,
    };
    setBombSession(updated);
    broadcastSyncEvent("bomb_action", { type: "defused", session: updated });
  };

  const handleBombWireCut = (idx) => {
    if (bombSession.status !== "running") return;
    const pd = bombSession.puzzleData;
    if (pd.wires[idx].cut) return;
    const nextWires = pd.wires.map((w, i) => (i === idx ? { ...w, cut: true } : w));
    const nextPd = { ...pd, wires: nextWires };

    if (idx === pd.correctIndex) {
      registerBombDefused(nextPd);
    } else {
      registerBombStrike(nextPd);
    }
  };

  const handleBombChoiceTap = (opt) => {
    if (bombSession.status !== "running") return;
    if (opt === bombSession.puzzleData.answer) {
      registerBombDefused();
    } else {
      registerBombStrike();
    }
  };

  const handleBombSequenceTap = (val) => {
    if (bombSession.status !== "running") return;
    const pd = bombSession.puzzleData;
    if (val === pd.sequenceOrder[pd.step]) {
      soundBeep();
      const nextStep = pd.step + 1;
      const nextPd = { ...pd, step: nextStep };
      if (nextStep >= pd.sequenceOrder.length) {
        registerBombDefused(nextPd);
      } else {
        const updated = { ...bombSession, puzzleData: nextPd };
        setBombSession(updated);
        broadcastSyncEvent("bomb_action", { type: "sync_update", session: updated });
      }
    } else {
      registerBombStrike();
    }
  };

  const handleBombMultistageTap = (opt) => {
    if (bombSession.status !== "running") return;
    const pd = bombSession.puzzleData;
    const curStage = pd.stages[pd.currentStage];
    if (opt === curStage.answer) {
      soundBeep();
      const nextStage = pd.currentStage + 1;
      const nextPd = { ...pd, currentStage: nextStage };
      if (nextStage >= pd.stages.length) {
        registerBombDefused(nextPd);
      } else {
        const updated = { ...bombSession, puzzleData: nextPd };
        setBombSession(updated);
        broadcastSyncEvent("bomb_action", { type: "sync_update", session: updated });
      }
    } else {
      registerBombStrike();
    }
  };

  const handleBombMazeMove = (dr, dc) => {
    if (bombSession.status !== "running") return;
    const pd = bombSession.puzzleData;
    const nr = pd.player[0] + dr;
    const nc = pd.player[1] + dc;
    if (nr < 0 || nr > 4 || nc < 0 || nc > 4) return;

    if (pd.bp.mines.some((m) => m[0] === nr && m[1] === nc)) {
      const nextPd = { ...pd, hitMines: [...pd.hitMines, `${nr},${nc}`] };
      registerBombStrike(nextPd);
    } else {
      soundBeep();
      const nextPd = { ...pd, player: [nr, nc] };
      if (nr === pd.goal[0] && nc === pd.goal[1]) {
        registerBombDefused(nextPd);
      } else {
        const updated = { ...bombSession, puzzleData: nextPd };
        setBombSession(updated);
        broadcastSyncEvent("bomb_action", { type: "sync_update", session: updated });
      }
    }
  };

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
    return spotlightTape ? incomingTapes.slice(1) : incomingTapes;
  }, [incomingTapes, spotlightTape]);

  const vaultPolaroids = useMemo(() => {
    return vaultTapes.filter((t) => t.polaroid_url || t.note_text);
  }, [vaultTapes]);

  const isSpotlightVoiceUnread = Boolean(
    spotlightTape &&
      !isPolaroidOnly &&
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
      return { locked: true, reason: `Opens after ${formattedTime}` };
    }
    return { locked: false, reason: "" };
  }, [spotlightTape, nowTs]);

  return (
    <div style={styles.screenWrap}>
      <style>{`
        @keyframes pulseHeart { 0%, 100% { transform: scale(1); filter: drop-shadow(0 0 6px #f472b6); } 50% { transform: scale(1.24); filter: drop-shadow(0 0 18px #ec4899); } }
        @keyframes spinReel { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spotlightGlow { 0%, 100% { box-shadow: 0 0 18px rgba(236,72,153,0.55), inset 0 0 18px rgba(236,72,153,0.2); border-color: #f472b6; } 50% { box-shadow: 0 0 34px rgba(244,114,182,0.9), inset 0 0 26px rgba(236,72,153,0.35); border-color: #fde047; } }
        @keyframes alarmPulse { 0%, 100% { box-shadow: 0 0 10px #f43f5e; } 50% { box-shadow: 0 0 26px #f43f5e; } }
      `}</style>

      <audio ref={audioPlayerRef} onEnded={() => { playRadioBurst(140); setIsPlaying(false); setPlayingVaultId(null); }} />

      <div style={styles.radioChassis}>
        <div style={styles.sectionNavWrap}>
          <button type="button" onClick={() => setAppSection("radio")} style={{ ...styles.sectionNavBtn, ...(appSection === "radio" ? styles.sectionNavBtnActive : {}) }}>
            📻 12.10 MHz Radio {isAnySpotlightNew && <span style={styles.unreadDot}>NEW</span>}
          </button>
          <button type="button" onClick={() => setAppSection("bomb")} style={{ ...styles.sectionNavBtn, ...(appSection === "bomb" ? styles.sectionNavBtnActive : {}), ...(bombSession.status === "running" ? { borderColor: "#f43f5e", animation: "alarmPulse 1.2s infinite" } : {}) }}>
            💣 Bomb Co-Op {bombSession.status === "running" ? "🔥 LIVE" : "(20)"}
          </button>
        </div>

        <div style={styles.topUtilityBar}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={styles.streakPill}>🔥 {streakDays}d Streak</div>
            <button onClick={requestNotificationAccess} style={{ ...styles.notifBtn, borderColor: notifEnabled ? "#a855f7" : "#3b1d6e", color: notifEnabled ? "#e9d5ff" : "#a78bfa" }}>
              {notifEnabled ? "🔔 Alerts ON" : "🔕 Enable Alerts"}
            </button>
          </div>
          <button onClick={() => { const next = myStation === "bbi" ? "greno" : "bbi"; setMyStation(next); localStorage.setItem("freq1210_station", next); }} style={styles.miniSwitchBtn}>
            {myStation === "bbi" ? "Sarthak • BBI" : "Jaai • GreNo"} ⇄
          </button>
        </div>

        {appSection === "radio" ? (
          <>
            <div style={styles.bridgeCard}>
              <div style={styles.bridgeHeaderRow}>
                <span style={styles.freqDialText}>12.10 MHz</span>
                <span style={{ ...styles.livePresenceBadge, background: partnerOnline ? "rgba(236, 72, 153, 0.2)" : "rgba(168, 85, 247, 0.14)", borderColor: partnerOnline ? "#f472b6" : "#4c1d95", color: partnerOnline ? "#fbcfe8" : "#c4b5fd" }}>
                  {partnerOnline ? "✨ BOTH TUNED IN LIVE" : `${DISTANCE_KM.toLocaleString()} KM BRIDGE`}
                </span>
              </div>

              <div style={styles.citiesGrid}>
                <div style={{ ...styles.cityBox, borderColor: myStation === "bbi" ? "#a855f7" : "#2e1759" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={styles.cityTitle}>Sarthak • BBI</span>
                    <span style={styles.tempHighlight}>{weather.bbi.temp}</span>
                  </div>
                  <div style={styles.weatherConditionLine}>{weather.bbi.icon} Bhubaneswar • {weather.bbi.condition}</div>
                  <div style={styles.weatherMicroMeta}><span>Feels {weather.bbi.feels}</span><span>💧 {weather.bbi.humidity}</span></div>
                  <div style={styles.cityMoodPill}>{stations.bbi?.current_mood}</div>
                </div>

                <div style={styles.cityDivider}>↔</div>

                <div style={{ ...styles.cityBox, borderColor: myStation === "greno" ? "#a855f7" : "#2e1759" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={styles.cityTitle}>Jaai • GreNo</span>
                    <span style={styles.tempHighlight}>{weather.greno.temp}</span>
                  </div>
                  <div style={styles.weatherConditionLine}>{weather.greno.icon} Greater Noida • {weather.greno.condition}</div>
                  <div style={styles.weatherMicroMeta}><span>Feels {weather.greno.feels}</span><span>💧 {weather.greno.humidity}</span></div>
                  <div style={styles.cityMoodPill}>{stations.greno?.current_mood}</div>
                </div>
              </div>

              <button onClick={() => setStatusModalOpen(true)} style={styles.openStatusModalBtn}>
                <span>📍 My Status: <strong>{stations[myStation]?.current_mood}</strong></span>
                <span style={{ fontSize: 11, color: "#c084fc", fontWeight: 700 }}>Change ▾</span>
              </button>
            </div>

            <div style={{ ...styles.heartSectionCard, borderColor: partnerHeartOn ? "#ec4899" : myHeartOn ? "#9333ea" : "#3b1d6e", background: partnerHeartOn ? "rgba(236, 72, 153, 0.18)" : "#190e30" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 16, animation: partnerHeartOn ? "pulseHeart 1.1s infinite" : "none" }}>{partnerHeartOn ? "💓" : myHeartOn ? "📡" : "💜"}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#f5d0fe" }}>
                    {myHeartOn && partnerHeartOn ? "Both Hearts Beating Together!" : partnerHeartOn ? `${partnerName}'s heart is beating for you!` : myHeartOn ? `Pulsing on ${partnerName}'s Screen...` : "Thinking of You Signal"}
                  </span>
                </div>
              </div>
              <button onClick={toggleHeartSignal} style={{ ...styles.heartToggleBtn, background: myHeartOn ? "linear-gradient(135deg, #ec4899, #9333ea)" : "#1e1336", borderColor: myHeartOn ? "#f472b6" : "#4c1d95" }}>
                <span style={{ fontSize: 11, fontWeight: 800 }}>{myHeartOn ? "SENT: ON" : "SEND"}</span>
              </button>
            </div>

            <div style={styles.tabBar}>
              <button onClick={() => setActiveTab("tape")} style={{ ...styles.tabBtn, ...(activeTab === "tape" ? styles.tabBtnActive : {}) }}>
                📻 {partnerName}&apos;s Latest Voice {isSpotlightVoiceUnread && <span style={styles.unreadDot}>NEW</span>}
              </button>
              <button onClick={() => setActiveTab("polaroid")} style={{ ...styles.tabBtn, ...(activeTab === "polaroid" ? styles.tabBtnActive : {}) }}>
                📸 {partnerName}&apos;s Polaroid {isSpotlightPolaroidUnread ? <span style={styles.unreadDot}>NEW PHOTO</span> : hasSpotlightPolaroid && <span style={{ color: "#fde047" }}>✦</span>}
              </button>
            </div>

            <div style={{ ...styles.deckContainer, borderColor: isAnySpotlightNew ? "#f472b6" : "#3b1d6e", animation: isAnySpotlightNew ? "spotlightGlow 2s infinite" : "none" }}>
              {!spotlightTape ? (
                <div style={{ textAlign: "center", padding: "20px 10px", color: "#c4b5fd", fontSize: 12 }}>Waiting for {partnerName}&apos;s next transmission...</div>
              ) : activeTab === "tape" ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#c4b5fd", marginBottom: 6 }}>
                    <span>FROM {partnerName.toUpperCase()}</span>
                    <span>{new Date(spotlightTape.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })}</span>
                  </div>

                  {isPolaroidOnly ? (
                    <div style={{ textAlign: "center", padding: "16px 10px", background: "#1a0f30", borderRadius: 12, border: "1px solid #4c1d95" }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>📸</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#f5d0fe" }}>Polaroid-Only Transmission</div>
                      <div style={{ fontSize: 11, color: "#c4b5fd", marginTop: 4 }}>{partnerName} sent a Polaroid note without voice audio.</div>
                      <button onClick={() => setActiveTab("polaroid")} style={{ ...styles.instantRevealBtn, width: "auto", padding: "6px 14px", marginTop: 10 }}>
                        Open Polaroid Photo →
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={styles.cassetteWindow}>
                        <div style={{ ...styles.reelWheel, animation: isPlaying && !playingVaultId ? "spinReel 2.2s linear infinite" : "none" }}><div style={styles.reelCore} /></div>
                        <div style={styles.cassetteCenterLabel}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: "#fde047" }}>12.10 MHz</div>
                          <div style={{ fontSize: 9.5, color: "#f3e8ff" }}>{isPlaying && !playingVaultId ? "PLAYING..." : `${spotlightTape.duration_sec || 5}s VOICE TAPE`}</div>
                        </div>
                        <div style={{ ...styles.reelWheel, animation: isPlaying && !playingVaultId ? "spinReel 2.2s linear infinite" : "none" }}><div style={styles.reelCore} /></div>
                      </div>

                      {lockStatus.locked ? (
                        <div style={styles.lockedBanner}>🔒 {lockStatus.reason}</div>
                      ) : (
                        <button onClick={togglePlaySpotlightTape} style={{ ...styles.playMainBtn, background: isAnySpotlightNew ? "linear-gradient(135deg, #ec4899, #9333ea)" : "linear-gradient(135deg, #7e22ce, #581c87)" }}>
                          {isPlaying && !playingVaultId ? "⏹ STOP TAPE" : isSpotlightVoiceUnread ? `▶ PLAY NEW TAPE (${spotlightTape.duration_sec || 5}s)` : `▶ REPLAY TAPE (${spotlightTape.duration_sec || 5}s)`}
                        </button>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  {!hasSpotlightPolaroid ? (
                    <div style={{ padding: "16px", color: "#a78bfa", fontSize: 12 }}>No photo was attached.</div>
                  ) : (
                    <div style={styles.polaroidFrame}>
                      <div style={styles.polaroidPhotoArea}>
                        {spotlightTape.polaroid_url ? <img src={spotlightTape.polaroid_url} alt="Polaroid" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>💜 📻 ✨</div>}
                        {isSpotlightPolaroidUnread && spotlightTape.polaroid_url && (
                          <canvas ref={scratchCanvasRef} width={280} height={170} style={styles.scratchCanvas} onMouseMove={(e) => e.buttons === 1 && handleScratchMove(e)} onTouchMove={handleScratchMove} />
                        )}
                      </div>
                      {isSpotlightPolaroidUnread && spotlightTape.polaroid_url && (
                        <button onClick={markPolaroidRevealed} style={styles.instantRevealBtn}>✨ Instant Reveal Photo</button>
                      )}
                      <div style={styles.polaroidCaption}>{spotlightTape.note_text || `From ${partnerName} with love 💜`}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button type="button" onClick={() => setVaultModalOpen(true)} style={styles.vaultLauncherBtn}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>🗄️</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: "#f3e8ff" }}>Open Memory Vault</div>
                  <div style={{ fontSize: 9.5, color: "#a78bfa" }}>{vaultTapes.length} archived tapes • {vaultPolaroids.length} Polaroids</div>
                </div>
              </div>
              <span style={{ fontSize: 10, color: "#d8b4fe" }}>View ▸</span>
            </button>

            <div style={styles.composerCard}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#d8b4fe", marginBottom: 8 }}>🎙️ TRANSMIT TO {partnerName.toUpperCase()}</div>

              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <input type="text" placeholder="Optional Polaroid note..." value={noteText} onChange={(e) => setNoteText(e.target.value)} style={styles.textInput} />
                <button type="button" onClick={() => openLiveCamera("user")} style={styles.photoUploadBtn}>📸 Camera</button>
                <label style={styles.photoUploadBtn}>
                  🖼️ Album
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => { const file = e.target.files?.[0]; if (file) { const compressed = await compressImageToDataUrl(file); setPolaroidDataUrl(compressed); } }} />
                </label>
              </div>

              {polaroidDataUrl && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, background: "#100821", padding: "6px 8px", borderRadius: 8, border: "1px solid #3b1d6e" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5 }}>
                    <img src={polaroidDataUrl} alt="Preview" style={{ width: 30, height: 30, borderRadius: 4, objectFit: "cover" }} />
                    <span>✓ Photo ready to transmit</span>
                  </div>
                  <span onClick={() => setPolaroidDataUrl("")} style={{ cursor: "pointer", color: "#f43f5e", fontSize: 11, fontWeight: 700 }}>Remove ✕</span>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                <button type="button" onClick={sendPolaroidOnly} disabled={isUploading || isRecording || (!polaroidDataUrl && !noteText.trim())} style={{ ...styles.sendPolaroidOnlyBtn, opacity: !polaroidDataUrl && !noteText.trim() ? 0.45 : 1 }}>
                  📸 Send Polaroid Only
                </button>

                {!isRecording ? (
                  <button type="button" onClick={startRecording} disabled={isUploading} style={styles.pttButton}>
                    🎙️ Record Voice Tape
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 6, flex: 2 }}>
                    <button type="button" onClick={cancelRecording} style={styles.cancelRecBtn}>🗑️</button>
                    <button type="button" onClick={finishAndSendRecording} style={styles.sendRecBtn}>➤ Send Voice ({recSeconds}s)</button>
                  </div>
                )}
              </div>

              {uploadNotice && <div style={{ textAlign: "center", fontSize: 11, color: "#f5d0fe", marginTop: 6 }}>{uploadNotice}</div>}
            </div>
          </>
        ) : (
          /* =============================================================== */
          /* SECTION 2: SYNCHRONIZED 20-PUZZLE BOMB CO-OP                    */
          /* =============================================================== */
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <button type="button" onClick={() => setBombRole("defuser")} style={{ ...styles.bombRoleBtn, ...(bombRole === "defuser" ? styles.bombRoleDefuserActive : {}) }}>
                💣 DEFUSER (The Bomb)
              </button>
              <button type="button" onClick={() => setBombRole("expert")} style={{ ...styles.bombRoleBtn, ...(bombRole === "expert" ? styles.bombRoleExpertActive : {}) }}>
                📖 EXPERT (Defusal Manual)
              </button>
            </div>

            <div style={{ ...styles.bombHudCard, borderColor: bombSession.status === "running" ? "#f43f5e" : "#4c1d95" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#a78bfa" }}>{bombSession.status === "running" ? "LIVE COUNTDOWN" : "STATUS: STANDBY"}</div>
                  <div style={styles.digitalTimer}>
                    {bombSession.status === "running" ? `${String(Math.floor(secondsRemaining / 60)).padStart(2, "0")}:${String(secondsRemaining % 60).padStart(2, "0")}` : "00:00"}
                  </div>
                </div>

                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#a78bfa", marginBottom: 3 }}>STRIKES</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[1, 2, 3].map((s) => (
                      <div key={s} style={{ ...styles.strikeBox, ...(bombSession.strikes >= s ? styles.strikeBoxHit : {}) }}>X</div>
                    ))}
                  </div>
                </div>

                <div>
                  {bombSession.status === "running" ? (
                    <button type="button" onClick={abortBombGame} style={styles.abortBombBtn}>⏹ ABORT</button>
                  ) : (
                    <button type="button" onClick={() => startNewBombGame()} style={styles.startBombBtn}>▶ START</button>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 5, borderTop: "1px dashed #2e1759" }}>
                <span style={{ ...styles.edgePill, color: "#fde047" }}>SN: {bombSession.serial} ({bombSession.serialOdd ? "ODD" : "EVEN"})</span>
                <span style={styles.edgePill}>🔋 {bombSession.batteries} Batt</span>
                <span style={styles.edgePill}>💡 LED: {bombSession.ledLit ? "LIT" : "UNLIT"}</span>
              </div>
            </div>

            {bombSession.status !== "running" && bombSession.status !== "idle" && (
              <div style={{ textAlign: "center", padding: "8px", borderRadius: 10, marginBottom: 8, border: "1.5px solid", background: bombSession.status === "defused" ? "rgba(16,185,129,0.2)" : "rgba(244,63,94,0.25)", borderColor: bombSession.status === "defused" ? "#10b981" : "#f43f5e" }}>
                <div style={{ fontSize: 12, fontWeight: 800 }}>{bombSession.endMessage}</div>
              </div>
            )}

            {bombRole === "defuser" ? (
              <div style={{ ...styles.singleModuleCard, borderColor: bombSession.status === "defused" ? "#10b981" : "#6b21a8" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 800, color: "#f5d0fe" }}>{activePuzzle.code} // {activePuzzle.title.toUpperCase()}</span>
                  <span style={styles.diffTag}>{activePuzzle.difficulty} ({activePuzzle.timerSec}s)</span>
                </div>

                <div style={{ fontSize: 10.5, color: "#c4b5fd", marginBottom: 8 }}>
                  Tell {partnerName} to check <strong>{activePuzzle.code} ({activePuzzle.title})</strong> in the Manual!
                </div>

                {bombSession.status !== "running" && bombSession.status !== "defused" ? (
                  <div style={{ textAlign: "center", padding: "20px 10px", color: "#a78bfa", fontSize: 11.5 }}>
                    Bomb is inactive. Tap <strong>▶ START</strong> above when you and {partnerName} are ready!
                  </div>
                ) : (
                  <>
                    {activePuzzle.type === "wires" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                        {bombSession.puzzleData.wires.map((w, idx) => (
                          <button key={idx} type="button" onClick={() => handleBombWireCut(idx)} style={{ ...styles.wireBtn, background: w.bg, color: w.text, opacity: w.cut ? 0.3 : 1, textDecoration: w.cut ? "line-through" : "none" }}>
                            <span>{w.label}</span>
                            <span>{w.cut ? "✂️ CUT" : "✂️ CUT WIRE"}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {activePuzzle.type === "choice" && (
                      <div>
                        <div style={styles.telemetryBox}>
                          <div style={{ fontSize: 9, color: "#a78bfa" }}>CLUE</div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: "#fde047", marginTop: 2 }}>{bombSession.puzzleData.telemetry}</div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 7 }}>
                          {bombSession.puzzleData.options.map((opt) => (
                            <button key={opt} type="button" onClick={() => handleBombChoiceTap(opt)} style={styles.choiceBtn}>{opt}</button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activePuzzle.type === "sequence" && (
                      <div>
                        <div style={styles.telemetryBox}>
                          <div style={{ fontSize: 9, color: "#a78bfa" }}>PROGRESS ({bombSession.puzzleData.step}/4)</div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#fde047", marginTop: 2 }}>{bombSession.puzzleData.telemetry}</div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 7 }}>
                          {bombSession.puzzleData.buttons.map((bVal) => {
                            const done = bombSession.puzzleData.sequenceOrder.slice(0, bombSession.puzzleData.step).includes(bVal);
                            return (
                              <button key={bVal} type="button" onClick={() => !done && handleBombSequenceTap(bVal)} style={{ ...styles.choiceBtn, ...(done ? { background: "#064e3b", borderColor: "#10b981", color: "#6ee7b7" } : {}) }}>
                                {bVal}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {activePuzzle.type === "multistage" && (
                      <div>
                        <div style={styles.telemetryBox}>
                          <div style={{ fontSize: 9, color: "#a78bfa" }}>STAGE {bombSession.puzzleData.currentStage + 1} / {bombSession.puzzleData.stages.length}</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "#fde047", marginTop: 2 }}>
                            {bombSession.puzzleData.stages[Math.min(bombSession.puzzleData.currentStage, bombSession.puzzleData.stages.length - 1)].prompt}
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 7 }}>
                          {bombSession.puzzleData.options.map((opt) => (
                            <button key={opt} type="button" onClick={() => handleBombMultistageTap(opt)} style={styles.choiceBtn}>{opt}</button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activePuzzle.type === "maze" && (() => {
                      const cols = ["A", "B", "C", "D", "E"];
                      const pd = bombSession.puzzleData;
                      return (
                        <div>
                          <div style={styles.telemetryBox}>
                            <div style={{ fontSize: 9, color: "#a78bfa" }}>BEACONS</div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: "#fde047" }}>
                              🟡 {cols[pd.bp.beacons[0][1]]}{pd.bp.beacons[0][0] + 1} &amp; {cols[pd.bp.beacons[1][1]]}{pd.bp.beacons[1][0] + 1}
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={styles.mazeBoard}>
                              {[0, 1, 2, 3, 4].map((r) =>
                                [0, 1, 2, 3, 4].map((c) => {
                                  const isBeacon = pd.bp.beacons.some((b) => b[0] === r && b[1] === c);
                                  const isPlayer = pd.player[0] === r && pd.player[1] === c;
                                  const isGoal = pd.goal[0] === r && pd.goal[1] === c;
                                  const hit = pd.hitMines.includes(`${r},${c}`);
                                  return (
                                    <div key={`${r}-${c}`} style={{ ...styles.mazeCell, borderColor: isBeacon ? "#fde047" : "#2e1759" }}>
                                      {isPlayer ? "🟢" : isGoal ? "🎯" : hit ? "💥" : isBeacon ? "🟡" : <span style={{ fontSize: 7.5, color: "#4c1d95" }}>{cols[c]}{r + 1}</span>}
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            <div style={styles.dpadGrid}>
                              <div />
                              <button type="button" onClick={() => handleBombMazeMove(-1, 0)} style={styles.dpadBtn}>▲</button>
                              <div />
                              <button type="button" onClick={() => handleBombMazeMove(0, -1)} style={styles.dpadBtn}>◀</button>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>🟢</div>
                              <button type="button" onClick={() => handleBombMazeMove(0, 1)} style={styles.dpadBtn}>▶</button>
                              <div />
                              <button type="button" onClick={() => handleBombMazeMove(1, 0)} style={styles.dpadBtn}>▼</button>
                              <div />
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            ) : (
              <div style={styles.manualContainer}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: "#38bdf8" }}>📖 DEFUSAL MANUAL</span>
                  <input type="text" placeholder="Search #01–#20..." value={manualSearch} onChange={(e) => setManualSearch(e.target.value)} style={styles.manualSearchField} />
                </div>

                <div style={{ maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 7 }}>
                  {PUZZLE_CATALOG.filter((p) => !manualSearch || p.code.includes(manualSearch) || p.title.toLowerCase().includes(manualSearch.toLowerCase())).map((p) => (
                    <div key={p.id} style={styles.manualCard}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#38bdf8" }}>{p.code} // {p.title}</span>
                        <span style={styles.diffTag}>{p.difficulty} ({p.timerSec}s)</span>
                      </div>
                      <div style={{ fontSize: 10.5, color: "#e9d5ff", lineHeight: 1.35 }}>
                        {p.rules.map((r, i) => (
                          <div key={i}>• {r}</div>
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

      {vaultModalOpen && (
        <div style={styles.modalBackdrop} onClick={() => setVaultModalOpen(false)}>
          <div style={styles.modalSheet} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#f5d0fe" }}>🗄️ Memory Vault</div>
              <button onClick={() => setVaultModalOpen(false)} style={styles.closeModalBtn}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {vaultTapes.map((tape, idx) => (
                <div key={tape.id || idx} style={styles.vaultTapeRow}>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 700 }}>Tape #{vaultTapes.length - idx}</div>
                    {tape.note_text && <div style={{ fontSize: 9.5, color: "#c4b5fd" }}>&ldquo;{tape.note_text}&rdquo;</div>}
                  </div>
                  {tape.audio_url && tape.audio_url !== SILENT_AUDIO_CARRIER && (
                    <button onClick={() => togglePlayVaultTape(tape)} style={styles.vaultPlayBtn}>▶ Play</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {cameraModalOpen && (
        <div style={styles.modalBackdrop} onClick={closeLiveCamera}>
          <div style={styles.cameraModalBox} onClick={(e) => e.stopPropagation()}>
            <video ref={cameraVideoRef} autoPlay playsInline muted style={styles.cameraVideo} />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="button" onClick={closeLiveCamera} style={styles.cancelRecBtn}>Close</button>
              <button type="button" onClick={snapCameraPhoto} style={styles.sendRecBtn}>📸 Capture</button>
            </div>
          </div>
        </div>
      )}

      {statusModalOpen && (
        <div style={styles.modalBackdrop} onClick={() => setStatusModalOpen(false)}>
          <div style={styles.modalSheet} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800 }}>Update Status</span>
              <button onClick={() => setStatusModalOpen(false)} style={styles.closeModalBtn}>✕</button>
            </div>
            {STATUS_PRESETS.map((group) => (
              <div key={group.group} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, color: "#a78bfa", marginBottom: 3 }}>{group.group}</div>
                {group.items.map((item) => (
                  <button key={item} onClick={() => selectStatus(item)} style={styles.statusListItem}>{item}</button>
                ))}
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
  screenWrap: { minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "10px", background: "radial-gradient(circle at top, #1e1035 0%, #090512 100%)" },
  radioChassis: { width: "100%", maxWidth: 440, background: "#130b24", border: "1.5px solid #3b1d6e", borderRadius: 24, padding: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.75)" },
  sectionNavWrap: { display: "flex", gap: 6, background: "#0c0618", padding: 4, borderRadius: 14, border: "1px solid #2e1759", marginBottom: 10 },
  sectionNavBtn: { flex: 1, padding: "8px 10px", borderRadius: 10, border: "none", background: "transparent", color: "#a78bfa", fontSize: 11.5, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 },
  sectionNavBtnActive: { background: "linear-gradient(135deg, #9333ea, #ec4899)", color: "#ffffff" },
  topUtilityBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  streakPill: { fontSize: 10.5, fontWeight: 700, color: "#f5d0fe", background: "#231242", border: "1px solid #581c87", padding: "3px 8px", borderRadius: 999 },
  notifBtn: { fontSize: 10, fontWeight: 700, background: "#1b1033", border: "1px solid", padding: "3px 7px", borderRadius: 999, cursor: "pointer" },
  miniSwitchBtn: { fontSize: 10.5, color: "#c4b5fd", background: "transparent", border: "1px solid #3b1d6e", padding: "3px 7px", borderRadius: 6, cursor: "pointer" },
  bridgeCard: { background: "#1b1033", border: "1px solid #3b1d6e", borderRadius: 16, padding: 10, marginBottom: 8 },
  bridgeHeaderRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  freqDialText: { fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 800, color: "#e9d5ff" },
  livePresenceBadge: { fontSize: 9, fontWeight: 800, padding: "3px 7px", borderRadius: 999, border: "1px solid" },
  citiesGrid: { display: "flex", alignItems: "stretch", justifyContent: "space-between", gap: 6, marginBottom: 6 },
  cityBox: { flex: 1, background: "#120924", border: "1px solid #2e1759", borderRadius: 10, padding: "6px 8px" },
  cityTitle: { fontSize: 11, fontWeight: 800, color: "#f3e8ff" },
  tempHighlight: { fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 800, color: "#f472b6" },
  weatherConditionLine: { fontSize: 10, color: "#d8b4fe", marginTop: 2 },
  weatherMicroMeta: { display: "flex", gap: 5, fontSize: 8.5, color: "#a78bfa", marginTop: 2 },
  cityMoodPill: { marginTop: 4, display: "inline-block", fontSize: 9.5, color: "#e9d5ff", background: "#26154a", padding: "2px 5px", borderRadius: 4 },
  cityDivider: { display: "flex", alignItems: "center", fontSize: 12, color: "#a855f7", fontWeight: 800 },
  openStatusModalBtn: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", borderRadius: 8, background: "#130826", border: "1px dashed #581c87", color: "#e9d5ff", fontSize: 10.5, cursor: "pointer" },
  heartSectionCard: { display: "flex", alignItems: "center", justifyContent: "space-between", border: "1.5px solid #3b1d6e", borderRadius: 14, padding: "8px 10px", marginBottom: 8 },
  heartToggleBtn: { padding: "6px 10px", borderRadius: 999, border: "1.5px solid", color: "#fff", cursor: "pointer" },
  tabBar: { display: "flex", gap: 6, marginBottom: 6 },
  tabBtn: { flex: 1, padding: "7px", borderRadius: 8, background: "#190e30", border: "1px solid #2e1759", color: "#a78bfa", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 },
  tabBtnActive: { background: "#3b156b", borderColor: "#a855f7", color: "#ffffff" },
  unreadDot: { background: "linear-gradient(90deg, #ec4899, #f59e0b)", color: "#fff", fontSize: 8, fontWeight: 800, padding: "1px 5px", borderRadius: 999 },
  deckContainer: { border: "2px solid #3b1d6e", borderRadius: 16, padding: 10, marginBottom: 8 },
  cassetteWindow: { display: "flex", justifyContent: "space-around", alignItems: "center", border: "1px solid #4c1d95", borderRadius: 10, padding: "10px 8px", marginBottom: 8, background: "#190d30" },
  reelWheel: { width: 44, height: 44, borderRadius: "50%", border: "3px dashed #a855f7", display: "flex", alignItems: "center", justifyContent: "center" },
  reelCore: { width: 12, height: 12, borderRadius: "50%", background: "#c084fc" },
  cassetteCenterLabel: { textAlign: "center", padding: "4px 8px", borderRadius: 6, background: "#120824" },
  playMainBtn: { width: "100%", padding: "10px", borderRadius: 8, border: "none", color: "#fff", fontSize: 11.5, fontWeight: 800, cursor: "pointer" },
  polaroidFrame: { width: 250, background: "#faf5ff", borderRadius: 8, padding: "6px 6px 12px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" },
  polaroidPhotoArea: { position: "relative", width: "100%", height: 150, background: "#1c1033", borderRadius: 4, overflow: "hidden" },
  scratchCanvas: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", touchAction: "none" },
  instantRevealBtn: { width: "100%", marginTop: 6, padding: "4px", fontSize: 10, fontWeight: 800, color: "#fff", background: "linear-gradient(90deg, #ec4899, #9333ea)", border: "none", borderRadius: 4, cursor: "pointer" },
  polaroidCaption: { marginTop: 6, fontFamily: "'Caveat', cursive", fontSize: 18, color: "#2e1065", textAlign: "center" },
  vaultLauncherBtn: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#170d2e", border: "1px solid #4c1d95", borderRadius: 12, padding: "8px 10px", marginBottom: 8, cursor: "pointer" },
  composerCard: { background: "#190e30", border: "1px solid #3b1d6e", borderRadius: 14, padding: 10 },
  textInput: { flex: 1, background: "#100821", border: "1px solid #3b1d6e", borderRadius: 8, padding: "6px 8px", color: "#f3e8ff", fontSize: 11, minWidth: 0 },
  photoUploadBtn: { background: "#261447", border: "1px solid #581c87", borderRadius: 8, padding: "6px 8px", fontSize: 10, fontWeight: 700, color: "#e9d5ff", cursor: "pointer", display: "flex", alignItems: "center", whiteSpace: "nowrap" },
  sendPolaroidOnlyBtn: { flex: 1, padding: "10px", borderRadius: 10, background: "#3b156b", border: "1.5px solid #a855f7", color: "#f5d0fe", fontSize: 11, fontWeight: 800, cursor: "pointer" },
  pttButton: { flex: 1.2, padding: "10px", borderRadius: 10, background: "linear-gradient(135deg, #9333ea, #6b21a8)", border: "1.5px solid #e9d5ff", color: "#ffffff", fontSize: 11, fontWeight: 800, cursor: "pointer" },
  cancelRecBtn: { padding: "10px 14px", borderRadius: 8, background: "#31102f", border: "1px solid #f43f5e", color: "#fda4af", fontSize: 12, cursor: "pointer" },
  sendRecBtn: { flex: 1, padding: "10px", borderRadius: 8, background: "linear-gradient(135deg, #ec4899, #9333ea)", border: "none", color: "#fff", fontSize: 11.5, fontWeight: 800, cursor: "pointer" },

  // BOMB STYLES
  bombRoleBar: { display: "flex", gap: 6, marginBottom: 8 },
  bombRoleBtn: { flex: 1, padding: "8px", borderRadius: 10, border: "1px solid #3b1d6e", background: "#190e30", color: "#c4b5fd", fontSize: 11, fontWeight: 800, cursor: "pointer" },
  bombRoleDefuserActive: { background: "#3b1130", borderColor: "#f43f5e", color: "#fda4af" },
  bombRoleExpertActive: { background: "#172554", borderColor: "#38bdf8", color: "#bae6fd" },
  bombHudCard: { background: "#0b0514", border: "1.5px solid #4c1d95", borderRadius: 14, padding: 10, marginBottom: 8 },
  digitalTimer: { fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 800, color: "#f43f5e", letterSpacing: 1 },
  strikeBox: { width: 22, height: 22, borderRadius: 5, background: "#190d29", border: "1px solid #3b1d6e", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 800, color: "#3b1d6e" },
  strikeBoxHit: { background: "#4c0519", borderColor: "#f43f5e", color: "#f43f5e" },
  startBombBtn: { background: "linear-gradient(135deg, #10b981, #059669)", border: "none", color: "#fff", padding: "8px 12px", borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: "pointer" },
  abortBombBtn: { background: "linear-gradient(135deg, #ef4444, #b91c1c)", border: "none", color: "#fff", padding: "8px 12px", borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: "pointer" },
  edgePill: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, padding: "3px 6px", borderRadius: 4, background: "#1b1033", border: "1px solid #4c1d95", color: "#e9d5ff" },
  singleModuleCard: { background: "#180d2c", border: "2px solid #6b21a8", borderRadius: 16, padding: 12 },
  diffTag: { fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 999, background: "rgba(244,63,94,0.2)", color: "#fda4af", border: "1px solid #f43f5e" },
  telemetryBox: { background: "#0b0514", border: "1px solid #4c1d95", borderRadius: 8, padding: "8px", textAlign: "center", marginBottom: 8 },
  wireBtn: { width: "100%", height: 32, borderRadius: 999, border: "1.5px solid rgba(255,255,255,0.25)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 800 },
  choiceBtn: { padding: "10px", borderRadius: 8, background: "#251347", border: "1px solid #6b21a8", color: "#f3e8ff", fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, fontWeight: 800, cursor: "pointer" },
  mazeBoard: { display: "grid", gridTemplateColumns: "repeat(5, 30px)", gridTemplateRows: "repeat(5, 30px)", gap: 3, background: "#0d061a", padding: 5, borderRadius: 8, border: "1px solid #3b1d6e" },
  mazeCell: { width: 30, height: 30, borderRadius: 4, background: "#1a0f30", border: "1px solid #2e1759", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 },
  dpadGrid: { display: "grid", gridTemplateColumns: "repeat(3, 32px)", gridTemplateRows: "repeat(3, 30px)", gap: 3 },
  dpadBtn: { background: "#261447", border: "1px solid #6b21a8", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer" },
  manualContainer: { background: "#100820", border: "1.5px solid #38bdf8", borderRadius: 14, padding: 10 },
  manualSearchField: { background: "#190e30", border: "1px solid #38bdf8", color: "#fff", borderRadius: 6, padding: "3px 6px", fontSize: 10.5, width: 130 },
  manualCard: { background: "#1a1030", border: "1px solid #3b1d6e", borderRadius: 8, padding: "8px 10px" },

  // MODALS
  modalBackdrop: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 12 },
  modalSheet: { width: "100%", maxWidth: 400, background: "#150c29", border: "1.5px solid #581c87", borderRadius: 16, padding: 14, maxHeight: "80vh", overflowY: "auto" },
  closeModalBtn: { background: "transparent", border: "none", color: "#c4b5fd", fontSize: 16, cursor: "pointer" },
  vaultTapeRow: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1c1036", padding: "8px 10px", borderRadius: 8 },
  vaultPlayBtn: { border: "1px solid #c084fc", color: "#fff", background: "#581c87", fontSize: 10.5, padding: "5px 8px", borderRadius: 6, cursor: "pointer" },
  cameraModalBox: { width: "100%", maxWidth: 360, background: "#150c29", borderRadius: 16, padding: 12 },
  cameraVideo: { width: "100%", height: 240, objectFit: "cover", borderRadius: 8 },
  statusListItem: { width: "100%", padding: "7px 9px", borderRadius: 6, background: "#1a0f33", border: "1px solid #2e1759", color: "#f3e8ff", fontSize: 11, textAlign: "left", marginBottom: 4, cursor: "pointer" },
  lockCard: { width: "100%", maxWidth: 340, background: "#140b26", border: "1.5px solid #4c1d95", borderRadius: 20, padding: 16, textAlign: "center" },
  freqBadge: { fontSize: 10, fontWeight: 800, color: "#e9d5ff", background: "#2e1065", padding: "3px 8px", borderRadius: 999 },
  stationSelectBtn: { flex: 1, padding: "8px", borderRadius: 8, background: "#1c1033", border: "1px solid #3b1d6e", color: "#c4b5fd", fontSize: 11, fontWeight: 700, cursor: "pointer" },
  stationSelectBtnActive: { background: "#6b21a8", color: "#fff" },
  pinDot: { width: 12, height: 12, borderRadius: "50%", border: "1px solid #a855f7" },
  keypadBtn: { padding: "10px 0", fontSize: 14, fontWeight: 800, borderRadius: 8, background: "#1e1138", border: "1.5px solid #3b1d6e", color: "#f3e8ff", cursor: "pointer" },
};
