/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * JournalSidebar Component
 * Clean, serene session history navigator grouping reflections chronologically
 * into Today, Yesterday, and Earlier.
 */

import React, { useMemo } from "react";
import { InteractionMessage } from "../types/journal";
import { Clock, Calendar, Lock, ShieldCheck, Flame } from "lucide-react";

interface JournalSidebarProps {
  messages: InteractionMessage[];
  isOpen?: boolean;
  onClose?: () => void;
  onSelectMessage?: (id: string) => void;
}

interface GroupedSessions {
  today: InteractionMessage[];
  yesterday: InteractionMessage[];
  earlier: InteractionMessage[];
}

export const JournalSidebar: React.FC<JournalSidebarProps> = ({
  messages,
  isOpen = true,
  onClose,
  onSelectMessage
}) => {
  // Group user turns chronologically
  const groups: GroupedSessions = useMemo(() => {
    const userTurns = messages.filter((m) => m.role === "user");
    const today = new Date();
    const todayDateString = today.toDateString();

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDateString = yesterday.toDateString();

    const res: GroupedSessions = { today: [], yesterday: [], earlier: [] };

    userTurns.forEach((m) => {
      const msgDate = new Date(m.createdAt).toDateString();
      if (msgDate === todayDateString) {
        res.today.push(m);
      } else if (msgDate === yesterdayDateString) {
        res.yesterday.push(m);
      } else {
        res.earlier.push(m);
      }
    });

    return res;
  }, [messages]);

  const totalTurns = messages.length;
  const userTurnsCount = messages.filter((m) => m.role === "user").length;

  return (
    <aside
      className={`fixed md:static inset-y-0 left-0 z-20 w-72 md:w-64 lg:w-72 bg-[#0F1013] border-r border-[#1C1F26] flex flex-col justify-between transition-transform duration-200 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-[#1C1F26] flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
          <Clock className="w-3.5 h-3.5 text-[#2DD4BF]" />
          <span>Journal History</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden p-1 rounded-lg text-[#6B7280] hover:text-white"
            aria-label="Close sidebar"
          >
            ✕
          </button>
        )}
      </div>

      {/* Grouped History List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
        {userTurnsCount === 0 ? (
          <div className="text-center py-8 text-xs text-[#6B7280] font-light">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#2DD4BF]" />
            <p>No entries yet.</p>
            <p className="text-[11px] mt-1 text-[#4B5563]">Your reflections will organize here.</p>
          </div>
        ) : (
          <>
            {/* Today */}
            {groups.today.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B7280] px-1">
                  Today
                </span>
                <div className="space-y-1">
                  {groups.today.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectMessage?.(item.id)}
                      className="w-full text-left p-2.5 rounded-xl bg-[#14161C] hover:bg-[#1C1E26] border border-[#20232D] text-xs text-[#D1D5DB] hover:text-white transition-colors truncate block"
                    >
                      {item.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Yesterday */}
            {groups.yesterday.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B7280] px-1">
                  Yesterday
                </span>
                <div className="space-y-1">
                  {groups.yesterday.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectMessage?.(item.id)}
                      className="w-full text-left p-2.5 rounded-xl bg-[#14161C] hover:bg-[#1C1E26] border border-[#20232D] text-xs text-[#9CA3AF] hover:text-white transition-colors truncate block"
                    >
                      {item.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Earlier */}
            {groups.earlier.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B7280] px-1">
                  Earlier
                </span>
                <div className="space-y-1">
                  {groups.earlier.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectMessage?.(item.id)}
                      className="w-full text-left p-2.5 rounded-xl bg-[#14161C] hover:bg-[#1C1E26] border border-[#20232D] text-xs text-[#9CA3AF] hover:text-white transition-colors truncate block"
                    >
                      {item.text}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sidebar Footer — Privacy Verification */}
      <div className="p-4 border-t border-[#1C1F26] bg-[#0B0C0E] space-y-2 text-[11px] text-[#6B7280]">
        <div className="flex items-center gap-1.5 text-[#2DD4BF] font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Encrypted at Rest</span>
        </div>
        <p className="leading-snug">
          Entries are stored under your private Firestore collection path.
        </p>
      </div>
    </aside>
  );
};
