/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * UserMenu Component
 * Header navigation bar presenting product brand, model status indicator,
 * user identity, and sign-out controls.
 */

import React from "react";
import { User } from "firebase/auth";
import { HeartHandshake, LogOut, Sparkles, Lock } from "lucide-react";

interface UserMenuProps {
  user: User;
  onSignOut: () => void;
  activeModel?: string | null;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  user,
  onSignOut,
  activeModel,
  onToggleSidebar,
  isSidebarOpen
}) => {
  return (
    <header className="sticky top-0 z-30 w-full px-4 sm:px-6 py-3.5 bg-[#0C0D0E]/90 backdrop-blur-md border-b border-[#1E2128] flex items-center justify-between">
      {/* Brand & Toggle */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-xl bg-[#14161B] hover:bg-[#1A1D24] border border-[#222630] text-[#9CA3AF] hover:text-white transition-colors"
            aria-label={isSidebarOpen ? "Close history" : "Open history"}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
        )}

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2DD4BF] to-[#0D9488] flex items-center justify-center text-[#0C0D0E] shadow-[0_0_16px_rgba(45,212,191,0.25)]">
            <HeartHandshake className="w-4 h-4" />
          </div>
          <div>
            <span className="font-serif font-semibold text-sm sm:text-base text-white tracking-tight">
              Pain-Pal
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-mono uppercase tracking-wider text-[#6B7280]">
              Reflection Space
            </span>
          </div>
        </div>
      </div>

      {/* Model Indicator & Profile Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {activeModel && (
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#16181E] border border-[#222733] text-[10px] font-mono text-[#2DD4BF]">
            <Sparkles className="w-3 h-3 text-[#2DD4BF]" />
            <span>{activeModel}</span>
          </div>
        )}

        <div className="flex items-center gap-2 pl-2 border-l border-[#1E2128]">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs font-medium text-[#E5E7EB] max-w-[150px] truncate">
              {user.displayName || user.email || "Journaler"}
            </span>
            <span className="text-[10px] font-mono text-[#2DD4BF] flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> Isolated
            </span>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#9CA3AF] hover:text-white bg-[#14161B] hover:bg-[#1C1F26] border border-[#222630] transition-colors cursor-pointer"
            title="Sign out of Pain-Pal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
