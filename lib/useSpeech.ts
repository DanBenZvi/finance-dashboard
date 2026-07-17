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

// Split into sentence-sized chunks so playback has natural pauses between
// sentences (instead of one flat monotone block) and so Chrome doesn't hit
// its bug where utterances longer than ~15s silently stop mid-speech.
function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z"“֐-׿])|\n{2,}/)
    .map(s => s.trim())
    .filter(Boolean);
}

// Quality markers, best first. Voices are scored by the earliest marker
// found in their name — "Online (Natural)" are Edge's free cloud neural
// voices, "Premium"/"Enhanced" are macOS/iOS's higher-quality downloadable
// system voices (System Settings → Accessibility → Spoken Content → System
// Voice → Manage Voices), far more natural than the default "Compact" ones.
const QUALITY_MARKERS = ["Online (Natural)", "Premium", "Enhanced", "Neural", "Natural"];

function voiceQualityScore(v: SpeechSynthesisVoice): number {
  const idx = QUALITY_MARKERS.findIndex(m => v.name.includes(m));
  return idx === -1 ? QUALITY_MARKERS.length : idx;
}

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const enVoices = voices.filter(v => v.lang.startsWith("en"));
  if (!enVoices.length) return null;

  const sorted = [...enVoices].sort((a, b) => {
    const scoreDiff = voiceQualityScore(a) - voiceQualityScore(b);
    if (scoreDiff !== 0) return scoreDiff;
    if (a.lang === "en-US" && b.lang !== "en-US") return -1;
    if (b.lang === "en-US" && a.lang !== "en-US") return 1;
    return 0;
  });
  return sorted[0] ?? null;
}

const HE_PATTERNS = ["Carmit", "Tamar", "he-IL"];

function pickVoiceForLang(lang: "en" | "he"): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (lang === "he") {
    const heVoices = voices.filter(v => v.lang.startsWith("he") || HE_PATTERNS.some(p => v.name.includes(p)));
    if (!heVoices.length) return null;
    return [...heVoices].sort((a, b) => voiceQualityScore(a) - voiceQualityScore(b))[0] ?? null;
  }
  return pickVoice(voices);
}

export function useSpeech() {
  const [state, setState] = useState<SpeechState>("idle");
  const queueRef = useRef<string[]>([]);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const langRef = useRef<"en" | "he">("en");
  const stoppedRef = useRef(false);

  const stop = useCallback(() => {
    if (typeof window === "undefined") return;
    stoppedRef.current = true;
    queueRef.current = [];
    window.speechSynthesis?.cancel();
    setState("idle");
  }, []);

  const speakNextChunk = useCallback(() => {
    if (stoppedRef.current || typeof window === "undefined") return;
    const next = queueRef.current.shift();
    if (next === undefined) {
      setState("idle");
      return;
    }

    const utt = new SpeechSynthesisUtterance(next);
    utt.rate  = 0.95;
    utt.pitch = 1.0;
    utt.lang  = langRef.current === "he" ? "he-IL" : "en-US";
    if (voiceRef.current) utt.voice = voiceRef.current;

    utt.onstart = () => setState("speaking");
    utt.onend   = () => speakNextChunk();
    utt.onerror = () => speakNextChunk();

    window.speechSynthesis.speak(utt);
  }, []);

  const speak = useCallback((text: string, lang: "en" | "he" = "en") => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    stop();
    stoppedRef.current = false;

    const chunks = splitIntoSentences(stripForSpeech(text));
    if (!chunks.length) return;

    langRef.current = lang;
    queueRef.current = chunks;
    voiceRef.current = pickVoiceForLang(lang);

    if (!voiceRef.current) {
      // Voice list can load asynchronously on first call in some browsers.
      setTimeout(() => {
        if (stoppedRef.current) return;
        voiceRef.current = pickVoiceForLang(lang);
        speakNextChunk();
      }, 150);
    } else {
      speakNextChunk();
    }
  }, [stop, speakNextChunk]);

  useEffect(() => () => stop(), [stop]);

  return { state, speak, stop };
}
