"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechState = "idle" | "speaking";

export function stripForSpeech(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")   // bold
    .replace(/^#+\s+/gm, "")              // headings
    .replace(/^─+$/gm, "")               // horizontal rules
    .replace(/^\s*\d+\.\s+/gm, "")       // numbered list markers
    .replace(/^\s*[•\-]\s+/gm, "")       // bullet markers
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Ranked voice preference: more natural voices first
const PREFERRED_VOICE_PATTERNS = [
  // macOS / iOS natural voices
  "Samantha (Enhanced)",
  "Samantha",
  "Karen (Enhanced)",
  "Karen",
  "Daniel (Enhanced)",
  "Daniel",
  "Moira",
  // Google TTS (Chrome)
  "Google US English",
  "Google UK English Female",
  "Google UK English Male",
  // Microsoft Neural (Edge)
  "Microsoft Aria",
  "Microsoft Jenny",
  "Microsoft Guy",
  "Microsoft Zira",
  // Fallback: any enhanced / premium / neural en-US
];

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  for (const pattern of PREFERRED_VOICE_PATTERNS) {
    const match = voices.find(v => v.name === pattern);
    if (match) return match;
  }
  // Any voice containing "Enhanced", "Neural", "Natural"
  const enhanced = voices.find(v =>
    v.lang.startsWith("en") &&
    (v.name.includes("Enhanced") || v.name.includes("Neural") || v.name.includes("Natural"))
  );
  if (enhanced) return enhanced;
  // Any en-US, then any en
  return voices.find(v => v.lang === "en-US") ?? voices.find(v => v.lang.startsWith("en")) ?? null;
}

const HE_PATTERNS = ["Carmit", "Tamar", "he-IL"];

function pickVoiceForLang(lang: "en" | "he"): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (lang === "he") {
    for (const p of HE_PATTERNS) {
      const v = voices.find(v => v.name.includes(p) || v.lang.startsWith("he"));
      if (v) return v;
    }
    // fallback: any Hebrew
    return voices.find(v => v.lang.startsWith("he")) ?? null;
  }
  return pickVoice(voices);
}

export function useSpeech() {
  const [state, setState] = useState<SpeechState>("idle");
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis?.cancel();
    uttRef.current = null;
    setState("idle");
  }, []);

  const speak = useCallback((text: string, lang: "en" | "he" = "en") => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    stop();

    const cleaned = stripForSpeech(text);
    const utt = new SpeechSynthesisUtterance(cleaned);
    utt.rate  = 0.92;
    utt.pitch = 1.0;
    utt.lang  = lang === "he" ? "he-IL" : "en-US";

    const applyVoice = () => {
      const v = pickVoiceForLang(lang);
      if (v) utt.voice = v;
    };

    applyVoice();
    const t = setTimeout(applyVoice, 150);

    utt.onstart = () => setState("speaking");
    utt.onend   = () => { clearTimeout(t); uttRef.current = null; setState("idle"); };
    utt.onerror = () => { clearTimeout(t); uttRef.current = null; setState("idle"); };

    uttRef.current = utt;
    window.speechSynthesis.speak(utt);
    setState("speaking");
  }, [stop]);

  useEffect(() => () => stop(), [stop]);

  return { state, speak, stop };
}
