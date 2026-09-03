/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pain-Pal — Private AI Journaling & Reflection Companion
 * "Your private space to reflect, talk, and understand your thoughts."
 */

import React from "react";
import { useAuth } from "./hooks/useAuth";
import { LandingPage } from "./components/LandingPage";
import { JournalWorkspace } from "./components/JournalWorkspace";
import { Loader2, HeartHandshake } from "lucide-react";

export default function App() {
  const { user, loading, authError, signIn, signOut } = useAuth();

  // Initial Auth Loading Screen
  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0C0D0E] flex flex-col items-center justify-center text-[#9CA3AF] space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#181A1F] border border-[#262A33] flex items-center justify-center text-[#2DD4BF] shadow-[0_0_24px_rgba(45,212,191,0.2)]">
          <HeartHandshake className="w-6 h-6 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-[#6B7280]">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2DD4BF]" />
          <span>Opening your private space...</span>
        </div>
      </div>
    );
  }

  // Logged-out Landing & Sign-in Experience
  if (!user) {
    return (
      <LandingPage
        onSignIn={signIn}
        loading={loading}
        authError={authError}
      />
    );
  }

  // Authenticated Journal Workspace
  return (
    <JournalWorkspace
      user={user}
      onSignOut={signOut}
    />
  );
}
