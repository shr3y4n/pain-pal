/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * JournalMessage Component
 * Renders an editorial conversation turn with distinct typography and layout
 * for personal user entries vs. Pain-Pal reflections.
 */

import React from "react";
import { InteractionMessage } from "../types/journal";
import { SafetyResponse } from "./SafetyResponse";
import { Sparkles, HeartHandshake } from "lucide-react";

interface JournalMessageProps {
  message: InteractionMessage;
}

const MOOD_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Reflective:  { bg: "bg-blue-500/10",    text: "text-blue-300",    border: "border-blue-500/25" },
  Hopeful:     { bg: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/25" },
  Content:     { bg: "bg-teal-500/10",    text: "text-teal-300",    border: "border-teal-500/25" },
  Calm:        { bg: "bg-cyan-500/10",    text: "text-cyan-300",    border: "border-cyan-500/25" },
  Grateful:    { bg: "bg-pink-500/10",    text: "text-pink-300",    border: "border-pink-500/25" },
  Anxious:     { bg: "bg-yellow-500/10",  text: "text-yellow-300",  border: "border-yellow-500/25" },
  Stressed:    { bg: "bg-red-500/10",     text: "text-red-300",     border: "border-red-500/25" },
  Sad:         { bg: "bg-indigo-500/10",  text: "text-indigo-300",  border: "border-indigo-500/25" },
  Overwhelmed: { bg: "bg-orange-500/10",  text: "text-orange-300",  border: "border-orange-500/25" },
  Motivated:   { bg: "bg-green-500/10",   text: "text-green-300",   border: "border-green-500/25" }
};

export const JournalMessage: React.FC<JournalMessageProps> = ({ message }) => {
  const isUser = message.role === "user";
  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  // Delegated safety response view
  if (message.safetyRouted) {
    return (
      <div className="w-full flex justify-start">
        <SafetyResponse
          messageText={message.text}
          crisisResources={message.crisisResources}
          createdAt={message.createdAt}
        />
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="w-full flex flex-col items-end my-3 group">
        {/* Timestamp & Tag Header */}
        <div className="flex items-center gap-2 mb-1 px-1 text-[11px] font-mono text-[#6B7280]">
          <span>You</span>
          <span>•</span>
          <span>{formattedTime}</span>
        </div>

        {/* User Entry Card */}
        <div className="max-w-[90%] sm:max-w-[78%] rounded-2xl rounded-tr-md p-4 sm:p-5 bg-[#172023] border border-[#2DD4BF]/25 text-[#E6FAF7] text-sm sm:text-base leading-relaxed font-sans shadow-sm whitespace-pre-wrap selection:bg-[#2DD4BF]/30">
          {message.text}
        </div>
      </div>
    );
  }

  // Model Reflection Turn
  const moodStyle = (message.mood && MOOD_STYLES[message.mood]) || {
    bg: "bg-[#20242D]",
    text: "text-[#D1D5DB]",
    border: "border-[#2E3442]"
  };

  return (
    <div className="w-full flex flex-col items-start my-4 group">
      {/* Speaker Header */}
      <div className="flex items-center gap-2 mb-1.5 px-1 text-[11px] font-mono text-[#6B7280]">
        <span className="flex items-center gap-1 text-[#2DD4BF]">
          <HeartHandshake className="w-3.5 h-3.5" />
          <span className="font-sans font-medium text-xs text-[#E5E7EB]">Pain-Pal</span>
        </span>
        <span>•</span>
        <span>{formattedTime}</span>
        {message.modelUsed && (
          <span className="hidden sm:inline text-[10px] text-[#4B5563]">
            via {message.modelUsed}
          </span>
        )}
      </div>

      {/* Editorial Reflection Card */}
      <div className="max-w-[96%] sm:max-w-[85%] rounded-2xl rounded-tl-md p-5 sm:p-6 bg-[#131519] border border-[#222630] text-[#D1D5DB] text-sm sm:text-base leading-relaxed space-y-4 shadow-md whitespace-pre-wrap font-sans">
        <div className="prose prose-invert max-w-none text-[#E5E7EB] font-light leading-relaxed">
          {message.text}
        </div>

        {/* Constructive Insight Marginalia */}
        {message.insight && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#2DD4BF]/5 border border-[#2DD4BF]/20 text-[#2DD4BF]">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="text-xs sm:text-sm font-serif italic leading-snug">
              "{message.insight}"
            </span>
          </div>
        )}

        {/* Mood & Tags Footer */}
        {(message.mood || (message.tags && message.tags.length > 0)) && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#1F232C]">
            {message.mood && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-mono px-3 py-1 rounded-full border ${moodStyle.bg} ${moodStyle.text} ${moodStyle.border}`}
              >
                <span>{message.moodEmoji || "💭"}</span>
                <span>{message.mood}</span>
              </span>
            )}

            {message.tags?.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#181B21] border border-[#262B36] text-[#9CA3AF]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
