/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pain-Pal Serene Landing Page
 * Welcomes users with calm, editorial design, clear value proposition,
 * Google SSO button, and transparent privacy & safety assurances.
 */

import React from "react";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { Lock, Shield, Sparkles, HeartHandshake, AlertCircle } from "lucide-react";

interface LandingPageProps {
  onSignIn: () => void;
  loading: boolean;
  authError?: string | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignIn,
  loading,
  authError
}) => {
  return (
    <div className="min-h-screen bg-[#0C0D0E] text-[#EDEDED] flex flex-col justify-between selection:bg-[#2DD4BF]/25 selection:text-[#2DD4BF]">
      {/* Subtle Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[400px] bg-[#2DD4BF]/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -right-32 w-[480px] h-[360px] bg-[#0D9488]/5 rounded-full blur-[100px]" />
      </div>

      {/* Header Bar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#2DD4BF] to-[#0D9488] flex items-center justify-center text-[#0C0D0E] shadow-[0_0_24px_rgba(45,212,191,0.3)]">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white font-serif">Pain-Pal</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
          <Lock className="w-3.5 h-3.5 text-[#2DD4BF]" />
          <span>Private Workspace</span>
        </div>
      </header>

      {/* Main Hero Card */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl text-center space-y-8">

          {/* Subtitle Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#181A1F] border border-[#262A33] text-xs text-[#2DD4BF] font-mono shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#2DD4BF]" />
            <span>AI-Guided Reflection Companion</span>
          </div>

          {/* Headline & Editorial Copy */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-medium tracking-tight text-white leading-[1.15]">
              Your private space to reflect, talk, and understand.
            </h1>
            <p className="text-base sm:text-lg text-[#9CA3AF] max-w-xl mx-auto font-sans leading-relaxed font-light">
              Untangle thoughts, process difficult moments, and see emotional patterns over time in a secure, unhurried environment.
            </p>
          </div>

          {/* CTA Box */}
          <div className="pt-2 flex flex-col items-center gap-3">
            <GoogleSignInButton onClick={onSignIn} loading={loading} />

            {authError && (
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <p className="text-xs text-[#6B7280] font-light mt-2 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#2DD4BF]" />
              <span>Your journal is tied to your account and stored privately.</span>
            </p>
          </div>

          {/* Value Highlights Grid */}
          <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="p-5 rounded-2xl bg-[#131519] border border-[#20242D] space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#2DD4BF]">01. Multi-Turn Context</span>
              <h3 className="text-sm font-semibold text-white">Thoughtful Dialogue</h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Gemini remembers your recent reflection turns, offering empathetic continuity across entries.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#131519] border border-[#20242D] space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#2DD4BF]">02. Complete Isolation</span>
              <h3 className="text-sm font-semibold text-white">Owner-Bound Privacy</h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Entries are cryptographically isolated by your Firebase UID. No cross-user access or data sharing.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#131519] border border-[#20242D] space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#2DD4BF]">03. Safety Safeguard</span>
              <h3 className="text-sm font-semibold text-white">Human-First Crisis Layer</h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Automated pre-AI safety routing detects acute distress and connects you with verified crisis resources.
              </p>
            </div>
          </div>

          {/* Medical Notice */}
          <div className="max-w-xl mx-auto p-4 rounded-xl bg-[#111317] border border-[#1E2128] text-[11px] text-[#6B7280] leading-relaxed">
            <span className="text-[#9CA3AF] font-medium">Important Disclaimer: </span>
            Pain-Pal is an AI journaling and personal reflection companion. It is not a therapist, doctor, or diagnostic system, and cannot provide medical care. In acute crisis, please reach out to emergency services (112 / 911) or Tele-MANAS (14416).
          </div>
        </div>
      </main>

      {/* Footer Bar */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 border-t border-[#1C1F26] flex flex-wrap items-center justify-between text-xs text-[#6B7280] gap-4">
        <span>Pain-Pal • Built for Cloud Run Social Challenge</span>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span>Gemini 2.0 Flash</span>
          <span>•</span>
          <span>Google Cloud Run</span>
        </div>
      </footer>
    </div>
  );
};
