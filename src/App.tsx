/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pain-Pal — Private AI Journaling & Reflection Companion
 * "Your private space to reflect, talk, and understand your thoughts."
 *
 * Important Disclaimer:
 * Pain-Pal is an AI reflection and journaling companion. It is NOT a therapist,
 * doctor, diagnostic tool, or replacement for professional healthcare or crisis services.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  HeartHandshake,
  LogOut,
  Loader2,
  Send,
  Shield,
  Sparkles,
  Lock,
  MessageCircle,
  HelpCircle,
  AlertTriangle,
  Compass,
  PhoneCall,
  Flame,
  ChevronDown
} from "lucide-react";
import { auth, signInWithGoogle, logout, db } from "./lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  query,
  orderBy,
  onSnapshot
} from "firebase/firestore";

// ── Types ─────────────────────────────────────────────────────────────────
interface InteractionMessage {
  id: string;
  role: "user" | "model";
  text: string;
  createdAt: number;
  modelUsed?: string;
  mood?: string;
  moodEmoji?: string;
  tags?: string[];
  insight?: string;
  safetyRouted?: boolean;
}

const MAX_CHARS = 5000;

const STARTER_PROMPTS = [
  "What has been weighing on your mind lately?",
  "What happened today that you keep thinking about?",
  "What is something you wish you could say out loud?",
  "What is one thing you can control right now?"
];

// Mood badge styling
const MOOD_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  Reflective:  { bg: "bg-blue-500/15",    text: "text-blue-300",    border: "border-blue-500/30" },
  Hopeful:     { bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/30" },
  Content:     { bg: "bg-teal-500/15",    text: "text-teal-300",    border: "border-teal-500/30" },
  Calm:        { bg: "bg-cyan-500/15",    text: "text-cyan-300",    border: "border-cyan-500/30" },
  Grateful:    { bg: "bg-pink-500/15",    text: "text-pink-300",    border: "border-pink-500/30" },
  Anxious:     { bg: "bg-yellow-500/15",  text: "text-yellow-300",  border: "border-yellow-500/30" },
  Stressed:    { bg: "bg-red-500/15",     text: "text-red-300",     border: "border-red-500/30" },
  Sad:         { bg: "bg-indigo-500/15",  text: "text-indigo-300",  border: "border-indigo-500/30" },
  Overwhelmed: { bg: "bg-orange-500/15",  text: "text-orange-300",  border: "border-orange-500/30" },
  Motivated:   { bg: "bg-green-500/15",   text: "text-green-300",   border: "border-green-500/30" }
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<InteractionMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // ── Authentication State Listener ───────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      setAuthError(null);
      if (!currentUser) {
        setMessages([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // ── Real-Time Firestore Subscription (User Isolated) ────────────────────
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "interactions"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: InteractionMessage[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();

          // Support modern dual-turn format or legacy paired-record format
          if (data.role && data.text) {
            loaded.push({
              id: doc.id,
              role: data.role,
              text: data.text,
              createdAt: Number(data.createdAt) || Date.now(),
              modelUsed: data.modelUsed,
              mood: data.mood,
              moodEmoji: data.moodEmoji,
              tags: data.tags,
              insight: data.insight,
              safetyRouted: data.safetyRouted
            });
          } else if (data.prompt && data.response) {
            // Legacy schema backward-compatibility
            loaded.push({
              id: `${doc.id}-user`,
              role: "user",
              text: data.prompt,
              createdAt: Number(data.createdAt) || Date.now()
            });
            loaded.push({
              id: `${doc.id}-model`,
              role: "model",
              text: data.response,
              createdAt: (Number(data.createdAt) || Date.now()) + 1,
              modelUsed: data.modelUsed,
              mood: data.mood,
              moodEmoji: data.moodEmoji,
              tags: data.tags,
              insight: data.insight
            });
          }
        });

        setMessages(loaded);

        // Update active model badge from latest model turn
        const lastModelTurn = [...loaded].reverse().find((m) => m.role === "model" && m.modelUsed);
        if (lastModelTurn?.modelUsed) {
          setActiveModel(lastModelTurn.modelUsed);
        }
      },
      (err) => {
        console.error("Firestore history listener error:", err);
        setError("Unable to sync your private journal history from secure storage.");
      }
    );

    return () => unsubscribe();
  }, [user]);

  // ── Auto-scroll to newest message ───────────────────────────────────────
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isSubmitting]);

  // ── Google SSO Handler ──────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user") {
        setAuthError("Sign-in window was closed. Please click sign-in to try again.");
      } else if (err.code === "auth/popup-blocked") {
        setAuthError("Sign-in popup was blocked by your browser. Please enable popups for this site.");
      } else {
        setAuthError("Unable to complete Google sign-in. Please try again.");
      }
    }
  };

  // ── Journal Submission Handler ──────────────────────────────────────────
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmed = prompt.trim();
    if (!trimmed || !user || isSubmitting) return;

    if (trimmed.length > MAX_CHARS) {
      setError(`Your reflection cannot exceed ${MAX_CHARS} characters.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const originalText = trimmed;
    setPrompt(""); // Cleanly reset input to prevent duplicate sends

    try {
      const idToken = await user.getIdToken();

      const response = await fetch("/api/journal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ prompt: originalText })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to receive reflection from Pain-Pal.");
      }

      if (data.modelUsed) {
        setActiveModel(data.modelUsed);
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      setError(err.message || "Failed to connect to reflection service. Please try again.");
      // Restore user text on error so their thoughts are never lost
      setPrompt(originalText);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcut: Enter to submit, Shift+Enter for newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Populate prompt from starter suggestions
  const handleSelectStarter = (starterText: string) => {
    setPrompt(starterText);
    textareaRef.current?.focus();
  };

  // Derived user statistics
  const journalStats = useMemo(() => {
    const userEntries = messages.filter((m) => m.role === "user");
    const todayDateStr = new Date().toDateString();
    const todayCount = userEntries.filter(
      (m) => new Date(m.createdAt).toDateString() === todayDateStr
    ).length;

    // Calculate unique active days streak
    const activeDays = new Set(
      userEntries.map((m) => new Date(m.createdAt).toDateString())
    );
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (activeDays.has(d.toDateString())) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return {
      totalEntries: userEntries.length,
      todayEntries: todayCount,
      streak
    };
  }, [messages]);

  const charCount = prompt.length;
  const isCharLimitApproaching = charCount > MAX_CHARS * 0.85;
  const isCharLimitExceeded = charCount > MAX_CHARS;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-[#09090B] text-[#EDEDED] font-sans selection:bg-[#2DD4BF]/30 selection:text-[#2DD4BF]">

      {/* ── Top Header ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b border-[#1E1E24] bg-[#09090B]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2DD4BF] to-[#0D9488] flex items-center justify-center text-[#09090B] shadow-[0_0_20px_rgba(45,212,191,0.25)]">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">Pain-Pal</h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#1E1E24] text-[#A1A1AA] border border-[#27272A]">
                Reflection Companion
              </span>
            </div>
            <p className="text-xs text-[#71717A] hidden sm:block">
              Your private space to reflect, talk, and understand your thoughts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Model Indicator */}
          {activeModel && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1E1E24] border border-[#27272A] text-[11px] font-mono text-[#2DD4BF]">
              <Sparkles className="w-3 h-3 text-[#2DD4BF]" />
              <span>{activeModel}</span>
            </div>
          )}

          {/* User Profile & Sign Out */}
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-medium text-[#E4E4E7]">
                  {user.displayName || user.email || "Journaler"}
                </span>
                <span className="text-[10px] text-[#2DD4BF] font-mono flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> End-to-End Isolated
                </span>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#A1A1AA] hover:text-white bg-[#16161A] hover:bg-[#202026] border border-[#27272A] rounded-lg transition-colors"
                title="Sign out of Pain-Pal"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 bg-[#16161A] border border-[#27272A] rounded-full text-xs text-[#A1A1AA]">
              <span className="w-2 h-2 rounded-full bg-[#2DD4BF] animate-pulse" />
              <span>Awaiting Sign In</span>
            </div>
          )}
        </div>
      </header>

      {/* ── Unauthenticated Welcome Screen ── */}
      {!user ? (
        <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full">
          <div className="w-full max-w-xl bg-[#111115] border border-[#202026] rounded-2xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#2DD4BF]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="w-14 h-14 rounded-2xl bg-[#2DD4BF]/10 border border-[#2DD4BF]/20 flex items-center justify-center text-[#2DD4BF] mb-6">
              <Shield className="w-7 h-7" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
              Your safe, unhurried space to reflect.
            </h2>
            <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed mb-6">
              Pain-Pal helps you untangle thoughts, reflect on daily experiences, and process difficult emotions with empathetic AI responses, protected by Google SSO and strict user-isolated storage.
            </p>

            {/* Medical Disclaimer Callout */}
            <div className="bg-[#18181D] border border-[#27272A] rounded-xl p-4 mb-6 text-xs text-[#8A8A93] leading-relaxed flex items-start gap-3">
              <HelpCircle className="w-4 h-4 text-[#2DD4BF] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#E4E4E7]">Important Notice: </span>
                Pain-Pal is a journaling companion for personal reflection. It is not a therapist, doctor, or medical diagnostic system. If you are experiencing acute crisis, professional and emergency services are available.
              </div>
            </div>

            {authError && (
              <div className="mb-6 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              className="w-full py-3.5 px-6 rounded-xl bg-[#2DD4BF] hover:bg-[#26bba8] text-[#09090B] font-semibold text-sm flex items-center justify-center gap-3 transition-all hover:shadow-[0_0_25px_rgba(45,212,191,0.3)] disabled:opacity-50"
            >
              {authLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Sign in with Google</span>
                </>
              )}
            </button>

            {/* Privacy Guarantee Note */}
            <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[#52525B]">
              <Lock className="w-3 h-3 text-[#2DD4BF]" />
              <span>Entries strictly bound to your authenticated Firebase UID</span>
            </div>
          </div>
        </main>
      ) : (

        /* ── Authenticated Journal Interface ── */
        <main className="flex-1 flex flex-col md:grid md:grid-cols-12 gap-6 p-4 sm:p-6 max-w-7xl mx-auto w-full overflow-hidden">

          {/* Left Column: Interactive Journal Conversation (8 Cols) */}
          <section className="md:col-span-8 flex flex-col bg-[#111115] border border-[#1E1E24] rounded-2xl overflow-hidden shadow-xl min-h-[620px]">

            {/* Panel Top Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E1E24] bg-[#141419]">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#2DD4BF]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#E4E4E7]">
                  Private Reflection Timeline
                </h2>
              </div>
              <span className="text-[11px] font-mono text-[#71717A]">
                {messages.length === 0 ? "Ready to begin" : `${messages.length} interaction turns`}
              </span>
            </div>

            {/* Conversation Timeline Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6 scrollbar-thin">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#1C1C22] border border-[#27272A] flex items-center justify-center text-[#2DD4BF] mb-4">
                    <Compass className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">
                    Welcome to your reflection space
                  </h3>
                  <p className="text-xs text-[#71717A] max-w-md mb-6 leading-relaxed">
                    Pain-Pal is here to listen without judgment. Share whatever has been occupying your thoughts today.
                  </p>

                  {/* Starter Prompt Buttons */}
                  <div className="w-full max-w-md grid grid-cols-1 gap-2 text-left">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#52525B] mb-1">
                      Optional Reflection Starters
                    </span>
                    {STARTER_PROMPTS.map((starter) => (
                      <button
                        key={starter}
                        onClick={() => handleSelectStarter(starter)}
                        className="p-3 text-xs bg-[#16161C] hover:bg-[#1D1D24] border border-[#27272E] hover:border-[#2DD4BF]/40 rounded-xl text-[#A1A1AA] hover:text-white transition-all text-left flex items-center justify-between group"
                      >
                        <span>"{starter}"</span>
                        <span className="text-[#2DD4BF] opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono">
                          Use →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    {/* Speaker Header */}
                    <div className="flex items-center gap-2 mb-1.5 px-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717A]">
                        {msg.role === "user" ? "Your Reflection" : "Pain-Pal Companion"}
                      </span>
                      <span className="text-[10px] text-[#52525B] font-mono">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    {/* Safety-Routed Card Variant */}
                    {msg.safetyRouted ? (
                      <div className="max-w-[92%] sm:max-w-[85%] rounded-2xl p-5 bg-[#1F1717] border border-red-500/40 text-red-200 text-xs sm:text-sm leading-relaxed space-y-3 shadow-lg">
                        <div className="flex items-center gap-2 text-red-400 font-semibold text-xs uppercase tracking-wider">
                          <PhoneCall className="w-4 h-4" />
                          <span>Immediate Support Available</span>
                        </div>
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    ) : msg.role === "user" ? (
                      /* User Message Bubble */
                      <div className="max-w-[90%] sm:max-w-[80%] rounded-2xl rounded-tr-sm p-4 bg-[#1B2827] border border-[#2DD4BF]/30 text-[#E6FAF7] text-xs sm:text-sm leading-relaxed shadow-sm">
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    ) : (
                      /* Model Response Card */
                      <div className="max-w-[95%] sm:max-w-[88%] rounded-2xl rounded-tl-sm p-5 bg-[#17171D] border border-[#27272F] text-[#D4D4D8] text-xs sm:text-sm leading-relaxed space-y-4 shadow-md">
                        {/* Reflection Content */}
                        <p className="whitespace-pre-wrap">{msg.text}</p>

                        {/* Insight Callout */}
                        {msg.insight && (
                          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#2DD4BF]/10 border border-[#2DD4BF]/25 text-[#2DD4BF]">
                            <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                            <span className="text-xs italic leading-snug">"{msg.insight}"</span>
                          </div>
                        )}

                        {/* Footer Badges: Mood & Tags */}
                        {(msg.mood || (msg.tags && msg.tags.length > 0)) && (
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#23232B]">
                            {msg.mood && (
                              <span
                                className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
                                  MOOD_COLOR_MAP[msg.mood]?.bg || "bg-[#27272A]"
                                } ${MOOD_COLOR_MAP[msg.mood]?.text || "text-white"} ${
                                  MOOD_COLOR_MAP[msg.mood]?.border || "border-[#3F3F46]"
                                }`}
                              >
                                {msg.moodEmoji} {msg.mood}
                              </span>
                            )}
                            {msg.tags?.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#202026] text-[#A1A1AA] border border-[#2C2C34]"
                              >
                                #{tag}
                              </span>
                            ))}
                            {msg.modelUsed && (
                              <span className="ml-auto text-[9px] font-mono text-[#52525B]">
                                via {msg.modelUsed}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Ongoing Generation Skeleton */}
              {isSubmitting && (
                <div className="flex flex-col items-start space-y-2 animate-pulse">
                  <span className="text-[10px] font-mono text-[#2DD4BF]">Pain-Pal is reflecting...</span>
                  <div className="w-3/4 h-16 rounded-2xl bg-[#17171D] border border-[#27272F] p-4 flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-[#2DD4BF] animate-spin shrink-0" />
                    <span className="text-xs text-[#71717A]">
                      Formulating a thoughtful, private reflection...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mx-6 mb-3 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-xs underline hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Input Submission Area */}
            <div className="p-4 border-t border-[#1E1E24] bg-[#141419]">
              <form onSubmit={handleSubmit} className="relative">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="What is occupying your thoughts right now? (Press Enter to send, Shift+Enter for newline)"
                  rows={3}
                  disabled={isSubmitting}
                  className="w-full bg-[#1A1A22] border border-[#272732] focus:border-[#2DD4BF] rounded-xl p-3.5 pr-14 text-sm text-[#F4F4F5] placeholder-[#52525B] resize-none outline-none transition-colors disabled:opacity-50"
                />

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !prompt.trim() || isCharLimitExceeded}
                  className="absolute bottom-3 right-3 p-2.5 rounded-lg bg-[#2DD4BF] hover:bg-[#20b2a0] text-[#09090B] font-bold transition-all disabled:opacity-40 disabled:hover:bg-[#2DD4BF] hover:shadow-[0_0_15px_rgba(45,212,191,0.3)]"
                  title="Send reflection turn"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>

              {/* Character Limit and Shortcuts Bar */}
              <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-[#71717A]">
                <span>
                  <kbd className="px-1.5 py-0.5 rounded bg-[#202026] text-[#A1A1AA] border border-[#2C2C34]">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 rounded bg-[#202026] text-[#A1A1AA] border border-[#2C2C34]">Shift + Enter</kbd> for newline
                </span>
                <span
                  className={`font-mono ${
                    isCharLimitExceeded
                      ? "text-red-400 font-bold"
                      : isCharLimitApproaching
                      ? "text-yellow-400"
                      : "text-[#52525B]"
                  }`}
                >
                  {charCount} / {MAX_CHARS}
                </span>
              </div>
            </div>
          </section>

          {/* Right Column: Context, Insights & Privacy Panels (4 Cols) */}
          <aside className="md:col-span-4 flex flex-col gap-4">

            {/* Reflection Insights & Streaks */}
            <div className="bg-[#111115] border border-[#1E1E24] rounded-2xl p-5 shadow-lg">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#E4E4E7] flex items-center gap-2 mb-4">
                <Flame className="w-4 h-4 text-[#2DD4BF]" />
                <span>Journal Continuity</span>
              </h3>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#17171D] border border-[#23232B] rounded-xl p-3">
                  <div className="text-lg font-bold text-white">{journalStats.totalEntries}</div>
                  <div className="text-[9px] uppercase tracking-wider text-[#71717A]">Total Entries</div>
                </div>
                <div className="bg-[#17171D] border border-[#23232B] rounded-xl p-3">
                  <div className="text-lg font-bold text-white">{journalStats.todayEntries}</div>
                  <div className="text-[9px] uppercase tracking-wider text-[#71717A]">Today</div>
                </div>
                <div className="bg-[#17171D] border border-[#23232B] rounded-xl p-3">
                  <div className="text-lg font-bold text-[#2DD4BF] flex items-center justify-center gap-0.5">
                    <span>{journalStats.streak}</span>
                    <span className="text-xs">🔥</span>
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-[#71717A]">Day Streak</div>
                </div>
              </div>
            </div>

            {/* Starter Suggestions Panel */}
            <div className="bg-[#111115] border border-[#1E1E24] rounded-2xl p-5 shadow-lg">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#E4E4E7] flex items-center gap-2 mb-3">
                <Compass className="w-4 h-4 text-[#2DD4BF]" />
                <span>Need Inspiration?</span>
              </h3>
              <p className="text-[11px] text-[#71717A] mb-3">
                Click any starter question to bring it into your reflection composer:
              </p>
              <div className="space-y-2">
                {STARTER_PROMPTS.map((promptText) => (
                  <button
                    key={promptText}
                    onClick={() => handleSelectStarter(promptText)}
                    className="w-full text-left p-2.5 rounded-xl bg-[#17171D] hover:bg-[#1E1E26] border border-[#23232B] text-xs text-[#A1A1AA] hover:text-white transition-colors"
                  >
                    "{promptText}"
                  </button>
                ))}
              </div>
            </div>

            {/* Privacy & Security Card (Requirement 14) */}
            <div className="bg-[#111115] border border-[#1E1E24] rounded-2xl p-5 shadow-lg text-xs leading-relaxed">
              <div
                onClick={() => setShowPrivacyDetails(!showPrivacyDetails)}
                className="flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs text-[#E4E4E7]">
                  <Lock className="w-4 h-4 text-[#2DD4BF]" />
                  <span>Privacy & Storage Notice</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-[#71717A] transition-transform ${
                    showPrivacyDetails ? "rotate-180" : ""
                  }`}
                />
              </div>

              <p className="text-[11px] text-[#8A8A93] mt-2">
                Pain-Pal associates reflections exclusively with your verified Google Auth UID (
                <span className="font-mono text-[#2DD4BF]">{user.uid.substring(0, 8)}...</span>
                ). Entries are stored securely in Firestore and never shared.
              </p>

              {showPrivacyDetails && (
                <div className="mt-3 pt-3 border-t border-[#1E1E24] text-[11px] text-[#71717A] space-y-2">
                  <p>• Data isolation is enforced both on the server and via Firestore Security Rules.</p>
                  <p>• User prompts are evaluated for safety before invoking Gemini AI.</p>
                  <p>• Please avoid pasting sensitive credentials or API keys into your entries.</p>
                  <p>• Pain-Pal is a reflection companion, not a clinical healthcare service.</p>
                </div>
              )}
            </div>

            {/* Verified Crisis Support Hotline Card */}
            <div className="bg-[#141419] border border-[#1E1E24] rounded-2xl p-5 text-xs">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs text-[#E4E4E7] mb-2">
                <PhoneCall className="w-4 h-4 text-[#2DD4BF]" />
                <span>Verified Crisis Resources</span>
              </div>
              <p className="text-[11px] text-[#71717A] mb-2 leading-relaxed">
                If you or someone you know is in immediate danger:
              </p>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="text-white">
                  • Tele-MANAS (India): <span className="text-[#2DD4BF]">14416</span> (24/7 Toll-Free)
                </div>
                <div className="text-white">
                  • Kiran Helpline (India): <span className="text-[#2DD4BF]">1800-599-0019</span>
                </div>
                <div className="text-white">
                  • 988 Lifeline (US/Canada): <span className="text-[#2DD4BF]">988</span> (Call/Text)
                </div>
                <div className="text-white">
                  • Emergency Services: <span className="text-[#2DD4BF]">112 / 911</span>
                </div>
              </div>
            </div>

          </aside>
        </main>
      )}

      {/* ── Footer ── */}
      <footer className="px-6 py-4 border-t border-[#1E1E24] bg-[#09090B] flex flex-wrap items-center justify-between text-[11px] text-[#52525B] gap-4">
        <div className="flex items-center gap-2">
          <span>Pain-Pal AI Reflection Companion</span>
          <span>•</span>
          <span>Google Cloud Run Challenge</span>
        </div>
        <div className="flex items-center gap-4">
          <span>dev-tutorial=cloud-run-ai-challenge</span>
          <span>•</span>
          <span>Zero Insecure Defaults</span>
        </div>
      </footer>
    </div>
  );
}
