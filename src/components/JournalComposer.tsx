/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * JournalComposer Component
 * Serene multiline text input with character limits, keyboard handling,
 * loading animations, and accessibility labels.
 */

import React, { useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";

interface JournalComposerProps {
  value: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  maxLength?: number;
  placeholder?: string;
}

export const JournalComposer: React.FC<JournalComposerProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
  maxLength = 5000,
  placeholder = "Write freely about what's on your mind... (Press Enter to send, Shift + Enter for newline)"
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const charCount = value.length;
  const isExceeded = charCount > maxLength;
  const isApproaching = charCount > maxLength * 0.85;

  // Auto-resize textarea height up to a max
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim() && !isExceeded) {
        onSubmit();
      }
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!disabled && value.trim() && !isExceeded) {
            onSubmit();
          }
        }}
        className="relative bg-[#14161B] border border-[#222630] focus-within:border-[#2DD4BF]/60 rounded-2xl p-4 shadow-xl transition-colors duration-150"
      >
        <label htmlFor="journal-reflection-input" className="sr-only">
          Journal reflection text
        </label>

        <textarea
          id="journal-reflection-input"
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={3}
          className="w-full bg-transparent text-[#E5E7EB] placeholder-[#6B7280] text-sm sm:text-base leading-relaxed resize-none outline-none pr-14 disabled:opacity-50 font-sans"
        />

        {/* Footer controls: counter & submit */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#1F232C] text-xs text-[#6B7280]">
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[11px] font-mono text-[#4B5563]">
              <kbd className="px-1.5 py-0.5 rounded bg-[#1C1F26] border border-[#2A2E39] text-[#9CA3AF]">
                Enter
              </kbd>{" "}
              to send,{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-[#1C1F26] border border-[#2A2E39] text-[#9CA3AF]">
                Shift + Enter
              </kbd>{" "}
              for line
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`font-mono text-xs ${
                isExceeded
                  ? "text-red-400 font-bold"
                  : isApproaching
                  ? "text-yellow-400"
                  : "text-[#6B7280]"
              }`}
            >
              {charCount} / {maxLength}
            </span>

            <button
              type="submit"
              disabled={disabled || !value.trim() || isExceeded}
              className="p-2.5 rounded-xl bg-[#2DD4BF] hover:bg-[#26bba8] text-[#0C0D0E] font-medium transition-all shadow-[0_2px_12px_rgba(45,212,191,0.25)] disabled:opacity-40 disabled:hover:bg-[#2DD4BF] disabled:shadow-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]"
              title="Submit your reflection"
              aria-label="Send reflection"
            >
              {disabled ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#0C0D0E]" />
              ) : (
                <Send className="w-4 h-4 text-[#0C0D0E]" />
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
