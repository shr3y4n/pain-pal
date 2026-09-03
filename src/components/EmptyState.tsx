/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EmptyState Component
 * Thoughtful, serene welcome screen for new or uninitiated reflection sessions.
 */

import React from "react";
import { Compass, Sparkles } from "lucide-react";

interface EmptyStateProps {
  onSelectPrompt: (promptText: string) => void;
}

export const STARTER_PROMPTS = [
  "What has been weighing on you lately?",
  "What happened today that you keep thinking about?",
  "What is something you wish you could say out loud?",
  "What is one thing you can control right now?"
];

export const EmptyState: React.FC<EmptyStateProps> = ({ onSelectPrompt }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-4 py-16 max-w-xl mx-auto space-y-8 animate-fadeIn">
      {/* Icon Emblem */}
      <div className="w-14 h-14 rounded-2xl bg-[#181A1F] border border-[#262A33] flex items-center justify-center text-[#2DD4BF] shadow-[0_4px_20px_rgba(45,212,191,0.12)]">
        <Compass className="w-6 h-6" />
      </div>

      {/* Welcoming Header */}
      <div className="space-y-3">
        <h2 className="text-2xl sm:text-3xl font-serif text-white tracking-tight">
          What's on your mind?
        </h2>
        <p className="text-sm text-[#9CA3AF] font-light leading-relaxed max-w-md mx-auto">
          You don't need to have the right words. Start wherever you are. Write a single sentence, a memory, or an unfinished thought.
        </p>
      </div>

      {/* Starter Prompts */}
      <div className="w-full space-y-2.5 text-left">
        <div className="flex items-center gap-2 px-1 text-[11px] uppercase tracking-wider font-mono text-[#6B7280]">
          <Sparkles className="w-3.5 h-3.5 text-[#2DD4BF]" />
          <span>Gentle reflection starters</span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSelectPrompt(prompt)}
              className="w-full p-4 rounded-xl bg-[#14161B] hover:bg-[#1A1D24] border border-[#222630] hover:border-[#2DD4BF]/40 text-left text-xs sm:text-sm text-[#D1D5DB] hover:text-white transition-all duration-150 flex items-center justify-between group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/50"
            >
              <span className="font-light leading-snug">"{prompt}"</span>
              <span className="text-xs font-mono text-[#2DD4BF] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3">
                Use prompt →
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
