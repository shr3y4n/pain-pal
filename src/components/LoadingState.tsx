/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LoadingState Component
 * Restrained, serene thinking indicator for ongoing reflection formulation.
 */

import React from "react";
import { Loader2, HeartHandshake } from "lucide-react";

export const LoadingState: React.FC = () => {
  return (
    <div className="w-full flex justify-start my-4 animate-fadeIn">
      <div className="max-w-[85%] sm:max-w-[70%] rounded-2xl rounded-tl-md p-5 bg-[#131519] border border-[#222630] flex items-center gap-3.5 text-[#9CA3AF] text-sm">
        <div className="w-8 h-8 rounded-xl bg-[#2DD4BF]/10 border border-[#2DD4BF]/20 flex items-center justify-center text-[#2DD4BF] shrink-0">
          <HeartHandshake className="w-4 h-4 animate-pulse" />
        </div>
        <div className="space-y-0.5">
          <div className="text-xs font-medium text-white flex items-center gap-2">
            <span>Pain-Pal is reflecting</span>
            <span className="flex gap-1">
              <span className="w-1 h-1 rounded-full bg-[#2DD4BF] animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1 h-1 rounded-full bg-[#2DD4BF] animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1 h-1 rounded-full bg-[#2DD4BF] animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          </div>
          <p className="text-xs text-[#6B7280]">
            Reviewing context and preparing a calm perspective...
          </p>
        </div>
      </div>
    </div>
  );
};
