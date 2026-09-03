/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ErrorState Component
 * Polite, non-technical error notification banner with dismiss and retry options.
 */

import React from "react";
import { AlertCircle, X } from "lucide-react";

interface ErrorStateProps {
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  onDismiss,
  onRetry
}) => {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 my-2 animate-fadeIn">
      <div className="p-4 rounded-xl bg-[#231515] border border-red-500/30 text-red-200 text-xs sm:text-sm flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3 pr-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="leading-snug">{message}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-medium transition-colors"
            >
              Retry
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded-lg text-red-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Dismiss error notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
