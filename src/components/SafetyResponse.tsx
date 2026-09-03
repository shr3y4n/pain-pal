/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SafetyResponse Component
 * Displays a calm, empathetic card with verified crisis helplines when the
 * safety-routing layer detects elevated distress or risk.
 */

import React from "react";
import { PhoneCall, ShieldAlert, Heart, ExternalLink } from "lucide-react";
import { CrisisResource } from "../types/journal";

interface SafetyResponseProps {
  messageText: string;
  crisisResources?: CrisisResource[];
  createdAt: number;
}

export const SafetyResponse: React.FC<SafetyResponseProps> = ({
  messageText,
  crisisResources,
  createdAt
}) => {
  const timestamp = new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div className="w-full max-w-2xl my-4 rounded-2xl bg-[#1C1414] border border-red-500/30 p-6 shadow-xl space-y-4 text-left">
      {/* Safety Header */}
      <div className="flex items-center justify-between border-b border-red-500/20 pb-3">
        <div className="flex items-center gap-2.5 text-red-300 font-medium text-xs sm:text-sm">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <span>Care & Crisis Support Resources</span>
        </div>
        <span className="text-[11px] font-mono text-red-300/60">{timestamp}</span>
      </div>

      {/* Main Message Text */}
      <div className="text-xs sm:text-sm text-red-100/90 leading-relaxed whitespace-pre-wrap font-sans">
        {messageText}
      </div>

      {/* Verified Hotline Numbers */}
      <div className="pt-2 space-y-2">
        <div className="text-[11px] uppercase tracking-wider font-mono text-red-300/70 flex items-center gap-1.5">
          <PhoneCall className="w-3.5 h-3.5" />
          <span>Verified 24/7 Helplines</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-black/40 border border-red-500/20 text-white space-y-0.5">
            <span className="text-[10px] text-red-400 font-mono">India (Toll-Free, 24/7)</span>
            <div className="font-semibold text-sm">Tele-MANAS: 14416</div>
            <p className="text-[10px] text-[#9CA3AF]">National mental health tele-counseling</p>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-red-500/20 text-white space-y-0.5">
            <span className="text-[10px] text-red-400 font-mono">India (Toll-Free, 24/7)</span>
            <div className="font-semibold text-sm">Kiran: 1800-599-0019</div>
            <p className="text-[10px] text-[#9CA3AF]">Govt. social justice helpline</p>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-red-500/20 text-white space-y-0.5">
            <span className="text-[10px] text-red-400 font-mono">US & Canada (Call/Text)</span>
            <div className="font-semibold text-sm">988 Suicide & Crisis Lifeline</div>
            <p className="text-[10px] text-[#9CA3AF]">Free & confidential crisis counselors</p>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-red-500/20 text-white space-y-0.5">
            <span className="text-[10px] text-red-400 font-mono">Urgent Physical Safety</span>
            <div className="font-semibold text-sm">Emergency: 112 or 911</div>
            <p className="text-[10px] text-[#9CA3AF]">Immediate medical/police emergency</p>
          </div>
        </div>
      </div>

      <div className="pt-2 text-[11px] text-red-300/60 italic flex items-center gap-1.5">
        <Heart className="w-3.5 h-3.5 text-red-400 shrink-0" />
        <span>You don't have to navigate this alone. Human support is available right now.</span>
      </div>
    </div>
  );
};
