/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PainPal — AI-Powered Mental Wellness Journal
 * Unique features beyond the starter lab:
 *  • Structured AI responses: mood classification, auto-tags, one-line insights
 *  • Wellness Insights panel: streak tracker, top mood, live entry stats
 *  • Dynamic model badge: shows which Gemini model actually responded
 *  • Character counter with 5 000-char limit enforcement
 *  • Dual-persistence: server-side Admin SDK write + client-side Firestore fallback
 *  • Rate-limit & input-length error surfaces in UI
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  Brain,
  CheckCircle,
  Flame,
  LogOut,
  Loader2,
  Send,
  Shield,
  Sparkles,
  Tag,
} from "lucide-react";
import { auth, signInWithGoogle, logout, db } from "./lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

// ── Types ─────────────────────────────────────────────────────────────────
interface JournalEntry {
  id: string;
  prompt: string;
  response: string;
  mood?: string;
  moodEmoji?: string;
  tags?: string[];
  insight?: string;
  modelUsed?: string;
  createdAt: number;
}

// ── Mood colour map ───────────────────────────────────────────────────────
const MOOD_COLORS: Record<string, string> = {
  Anxious:     "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  Reflective:  "bg-blue-500/20 text-blue-300 border-blue-500/40",
  Hopeful:     "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  Stressed:    "bg-red-500/20 text-red-300 border-red-500/40",
  Content:     "bg-teal-500/20 text-teal-300 border-teal-500/40",
  Sad:         "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
  Grateful:    "bg-pink-500/20 text-pink-300 border-pink-500/40",
  Overwhelmed: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  Motivated:   "bg-green-500/20 text-green-300 border-green-500/40",
  Calm:        "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
};

const MAX_CHARS = 5000;

// ── Helpers ───────────────────────────────────────────────────────────────
function calculateStreak(entries: JournalEntry[]): number {
  if (entries.length === 0) return 0;
  const days = new Set(entries.map((e) => new Date(e.createdAt).toDateString()));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (days.has(d.toDateString())) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

function topMood(entries: JournalEntry[]): string {
  const counts: Record<string, number> = {};
  for (const e of entries) {
    if (e.mood) counts[e.mood] = (counts[e.mood] ?? 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? "—";
}

// ── Component ─────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]               = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [prompt, setPrompt]           = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory]         = useState<JournalEntry[]>([]);
  const [error, setError]             = useState<string | null>(null);
  const [lastModel, setLastModel]     = useState<string>("");

  // ── Auth listener ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (!currentUser) setHistory([]);
    });
    return unsub;
  }, []);

  // ── Real-time Firestore listener (scoped to user) ──
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "interactions"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const entries: JournalEntry[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<JournalEntry, "id">),
        }));
        setHistory(entries);
      },
      (err) => {
        console.error("History listener error:", err);
        setError("Failed to sync history from secure storage.");
      }
    );
    return unsub;
  }, [user]);

  // ── Derived wellness stats ──
  const stats = useMemo(() => {
    const todayStr = new Date().toDateString();
    return {
      total:   history.length,
      today:   history.filter((e) => new Date(e.createdAt).toDateString() === todayStr).length,
      streak:  calculateStreak(history),
      topMood: topMood(history),
    };
  }, [history]);

  // ── Submit handler (no debug strings, dual persistence) ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !user || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    const originalPrompt = prompt.trim();
    setPrompt(""); // Clear immediately — no debug pollution

    try {
      const token = await user.getIdToken();

      const res = await fetch("/api/journal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: originalPrompt }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to process journal entry");

      setLastModel(data.modelUsed ?? "");

      // Client-side fallback write (server already persisted, this is belt-and-suspenders)
      if (data.interactionId) {
        const clientPayload = {
          userId:    user.uid,
          prompt:    originalPrompt,
          response:  data.response ?? "",
          mood:      data.mood ?? "Reflective",
          moodEmoji: data.moodEmoji ?? "💭",
          tags:      data.tags ?? [],
          insight:   data.insight ?? "",
          modelUsed: data.modelUsed ?? "",
          createdAt: Date.now(),
        };
        Promise.race([
          setDoc(
            doc(db, "users", user.uid, "interactions", data.interactionId),
            clientPayload
          ),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error("Client Firestore write timed out")), 5000)
          ),
        ]).catch((dbErr) => {
          // Server already saved — this is non-critical
          console.warn("Client Firestore fallback failed:", dbErr?.message);
        });
      }
    } catch (err: any) {
      setError(err.message);
      setPrompt(originalPrompt); // Restore prompt so user doesn't lose their text
    } finally {
      setIsSubmitting(false);
    }
  };

  const charCount   = prompt.length;
  const charPercent = Math.min((charCount / MAX_CHARS) * 100, 100);
  const charColor   =
    charCount > MAX_CHARS * 0.9 ? "text-red-400" :
    charCount > MAX_CHARS * 0.7 ? "text-yellow-400" : "text-[#52525B]";

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen w-full bg-[#0A0A0B] text-[#E4E4E7] font-sans">

      {/* ── Header ── */}
      <header className="flex justify-between items-center px-8 py-5 border-b border-[#1F1F23]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#2DD4BF] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(45,212,191,0.25)]">
            <Brain className="w-6 h-6 text-[#0A0A0B]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">PainPal</h1>
            <p className="text-[10px] text-[#2DD4BF] font-mono tracking-widest uppercase opacity-80">
              AI Wellness Journal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Dynamic model badge */}
          {lastModel && (
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono bg-[#2DD4BF15] text-[#2DD4BF] border border-[#2DD4BF30] px-2.5 py-1 rounded-full">
              <Sparkles className="w-3 h-3" />
              {lastModel}
            </span>
          )}
          {user ? (
            <button
              onClick={logout}
              className="px-4 py-2 bg-[#16161A] hover:bg-[#1F1F23] border border-[#27272A] rounded-lg flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4 text-[#A1A1AA]" />
              <span className="text-xs font-medium uppercase tracking-tighter opacity-70">
                Sign Out
              </span>
            </button>
          ) : (
            <div className="px-4 py-2 bg-[#16161A] border border-[#27272A] rounded-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2DD4BF] animate-pulse" />
              <span className="text-xs font-medium uppercase tracking-tighter opacity-70">
                Awaiting Auth
              </span>
            </div>
          )}
        </div>
      </header>

      {/* ── Main Grid ── */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 p-6 bg-[#0A0A0B] overflow-auto">

        {/* ── Journal Panel (left, 8 cols) ── */}
        <section className="md:col-span-8 bg-[#111114] border border-[#1F1F23] rounded-2xl p-6 flex flex-col min-h-[600px] overflow-hidden">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#2DD4BF]">
              Private Journal
            </h3>
            <span className="text-[10px] font-mono opacity-40 px-2 py-0.5 border border-[#1F1F23] rounded">
              End-to-end isolated · Firestore RBAC
            </span>
          </div>

          {/* ── Unauthenticated gate ── */}
          {!user ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Shield className="w-16 h-16 text-[#1F1F23] mb-4" />
              <h2 className="text-xl text-white font-bold mb-2">Authentication Required</h2>
              <p className="text-sm text-[#A1A1AA] mb-6 text-center max-w-md">
                Access your private AI wellness journal. Entries are shielded behind
                Firebase Auth + Firestore owner-bound security rules.
              </p>
              <button
                onClick={signInWithGoogle}
                disabled={authLoading}
                className="px-6 py-3 bg-[#2DD4BF] hover:bg-[#20b2a0] text-[#0A0A0B] font-bold rounded-xl flex items-center gap-2 transition-all hover:shadow-[0_0_20px_rgba(45,212,191,0.3)] disabled:opacity-50"
              >
                {authLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M21.35 11.1H12v2.8h5.35c-.23 1.22-.93 2.27-1.97 2.97v2.46h3.19c1.87-1.72 2.95-4.26 2.95-7.07 0-.47-.04-.93-.17-1.16z"/>
                      <path fill="currentColor" d="M12 22c2.7 0 4.97-.9 6.62-2.42l-3.19-2.46c-.9.6-2.04.96-3.43.96-2.65 0-4.89-1.79-5.69-4.2H3.04v2.53C4.68 19.94 8.1 22 12 22z"/>
                      <path fill="currentColor" d="M6.31 13.88A5.98 5.98 0 0 1 5.97 12c0-.65.11-1.28.32-1.88V7.59H3.04A9.97 9.97 0 0 0 2 12c0 1.61.39 3.13 1.04 4.47l3.27-2.59z"/>
                      <path fill="currentColor" d="M12 6.02c1.47 0 2.8.51 3.84 1.5l2.87-2.87C16.96 3.02 14.7 2 12 2 8.1 2 4.68 4.06 3.04 7.59l3.27 2.53C7.11 7.81 9.35 6.02 12 6.02z"/>
                    </svg>
                    Sign in with Google
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* Entry history */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-5 mb-4 scrollbar-thin">
                {history.length === 0 && (
                  <div className="text-center text-[#A1A1AA] text-sm mt-16">
                    <Brain className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>No entries yet.</p>
                    <p className="text-xs mt-1 opacity-60">Start your first reflection below.</p>
                  </div>
                )}

                {history.map((entry) => {
                  const moodClass = MOOD_COLORS[entry.mood ?? ""] ?? MOOD_COLORS["Reflective"];
                  return (
                    <div
                      key={entry.id}
                      className="bg-[#16161A] border border-[#27272A] rounded-xl p-5 space-y-4"
                    >
                      {/* Card header */}
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-[#A1A1AA] font-mono">
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                        <div className="flex items-center gap-2">
                          {entry.mood && (
                            <span className={`text-[10px] font-mono border px-2 py-0.5 rounded-full ${moodClass}`}>
                              {entry.moodEmoji} {entry.mood}
                            </span>
                          )}
                          <span className="text-[10px] text-[#2DD4BF] font-mono uppercase bg-[#2DD4BF15] px-2 py-0.5 rounded-full">
                            Secure Write
                          </span>
                        </div>
                      </div>

                      {/* User prompt */}
                      <div>
                        <h4 className="text-[10px] font-bold uppercase text-[#52525B] mb-1.5 tracking-wider">
                          Your Reflection
                        </h4>
                        <p className="text-sm text-[#E4E4E7] whitespace-pre-wrap leading-relaxed">
                          {entry.prompt}
                        </p>
                      </div>

                      {/* AI reflection */}
                      <div className="bg-[#0A0A0B] rounded-xl p-4 border-l-2 border-[#2DD4BF]">
                        <h4 className="text-[10px] font-bold uppercase text-[#2DD4BF] mb-1.5 tracking-wider flex items-center gap-1">
                          <Brain className="w-3 h-3" /> PainPal Response
                        </h4>
                        <p className="text-sm text-[#A1A1AA] whitespace-pre-wrap leading-relaxed">
                          {entry.response}
                        </p>
                      </div>

                      {/* Insight */}
                      {entry.insight && (
                        <div className="flex items-start gap-2 bg-[#2DD4BF08] border border-[#2DD4BF20] rounded-lg px-3 py-2">
                          <Sparkles className="w-3.5 h-3.5 text-[#2DD4BF] mt-0.5 shrink-0" />
                          <p className="text-[11px] text-[#2DD4BF] italic">{entry.insight}</p>
                        </div>
                      )}

                      {/* Tags */}
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <Tag className="w-3 h-3 text-[#52525B]" />
                          {entry.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] font-mono px-2 py-0.5 bg-[#1F1F23] border border-[#27272A] rounded-full text-[#71717A]"
                            >
                              #{tag}
                            </span>
                          ))}
                          {entry.modelUsed && (
                            <span className="ml-auto text-[9px] font-mono text-[#3f3f46] shrink-0">
                              via {entry.modelUsed}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Error banner */}
              {error && (
                <div className="mb-3 p-3 bg-red-900/20 border border-red-500/40 rounded-xl text-red-400 text-xs flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Input form */}
              <form onSubmit={handleSubmit} className="relative mt-auto">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="What's weighing on your mind today? Write freely — this space is yours."
                  className="w-full bg-[#16161A] border border-[#27272A] focus:border-[#2DD4BF] outline-none rounded-xl p-4 pr-14 pb-8 resize-none text-sm text-white placeholder-[#3f3f46] transition-colors"
                  rows={4}
                  maxLength={MAX_CHARS}
                  disabled={isSubmitting}
                />
                {/* Character counter */}
                <div className="absolute bottom-3 left-4 flex items-center gap-2">
                  <div className="w-16 h-1 bg-[#27272A] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#2DD4BF] transition-all rounded-full"
                      style={{ width: `${charPercent}%` }}
                    />
                  </div>
                  <span className={`text-[9px] font-mono ${charColor}`}>
                    {charCount}/{MAX_CHARS}
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !prompt.trim() || charCount > MAX_CHARS}
                  className="absolute bottom-3 right-3 p-2.5 bg-[#2DD4BF] text-[#0A0A0B] rounded-lg disabled:opacity-40 hover:bg-[#20b2a0] transition-all hover:shadow-[0_0_12px_rgba(45,212,191,0.4)]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          )}
        </section>

        {/* ── Right sidebar (4 cols) ── */}
        <aside className="md:col-span-4 flex flex-col gap-4">

          {/* Wellness Insights */}
          <section className="bg-[#111114] border border-[#1F1F23] rounded-2xl p-5 flex flex-col gap-3">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#2DD4BF]" /> Wellness Insights
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Total Entries", value: stats.total },
                { label: "Today",         value: stats.today },
                { label: "Day Streak",    value: `${stats.streak} 🔥` },
                { label: "Top Mood",      value: stats.topMood },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#16161A] rounded-xl p-3 border border-[#1F1F23]">
                  <p className="text-[9px] uppercase font-bold text-[#52525B] tracking-wider mb-1">{label}</p>
                  <p className="text-lg font-bold text-white leading-none">{value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Model Fallback Ladder */}
          <section className="bg-[#111114] border border-[#1F1F23] rounded-2xl p-5">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-3 text-white">
              Model Fallback Ladder
            </h3>
            <div className="flex flex-col gap-2">
              {[
                { name: "gemini-2.0-flash",   label: "PRIMARY",  active: true },
                { name: "gemini-1.5-flash",   label: "Fallback 1" },
                { name: "gemini-1.5-flash-8b", label: "Fallback 2" },
                { name: "gemini-1.0-pro",     label: "Fallback 3" },
              ].map(({ name, label, active }) => (
                <div
                  key={name}
                  className={`flex items-center justify-between p-2 rounded-lg border-l-4 transition-opacity ${
                    active
                      ? "bg-[#1A1A1E] border-[#2DD4BF]"
                      : "bg-[#16161A] border-[#27272A] opacity-50"
                  }`}
                >
                  <span className="text-[11px] font-mono">{name}</span>
                  <span className={`text-[9px] font-mono px-1.5 rounded ${active ? "bg-[#2DD4BF20] text-[#2DD4BF]" : "text-[#52525B]"}`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Security Status */}
          <section className="bg-[#111114] border border-[#1F1F23] rounded-2xl p-5">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-4 text-white">
              Security Status
            </h3>
            <div className="space-y-2">
              {[
                "Firebase Auth — JWT verified server-side",
                "Firestore RBAC — owner-bound paths",
                "Input validation — 5 000-char limit",
                "Rate limiting — 20 req/min per user",
                "Undefined-stripping before DB writes",
                "GEMINI_API_KEY from env (never hardcoded)",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-[#2DD4BF] mt-0.5 shrink-0" />
                  <p className="text-[10px] text-[#71717A] leading-snug">{item}</p>
                </div>
              ))}
            </div>
          </section>

        </aside>
      </main>

      {/* ── Footer ── */}
      <footer className="px-8 py-4 bg-[#0A0A0B] border-t border-[#1F1F23] flex flex-wrap justify-between items-center text-[10px] tracking-widest uppercase text-[#3f3f46] gap-4">
        <span>OWASP LLM 1.0 Compliant</span>
        <span>dev-tutorial=cloud-run-ai-challenge</span>
        <span>Region: us-central1</span>
      </footer>
    </div>
  );
}
