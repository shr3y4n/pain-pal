/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Google SSO Action Button
 * Accessible, clean button implementing federated sign-in with SVG logo and loading state.
 */

import React from "react";
import { Loader2 } from "lucide-react";

interface GoogleSignInButtonProps {
  onClick: () => void;
  loading?: boolean;
  className?: string;
  label?: string;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onClick,
  loading = false,
  className = "",
  label = "Continue with Google"
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`relative inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-medium text-sm text-[#0C0D0E] bg-[#2DD4BF] hover:bg-[#26bba8] active:scale-[0.99] transition-all duration-150 shadow-[0_2px_16px_rgba(45,212,191,0.25)] hover:shadow-[0_4px_24px_rgba(45,212,191,0.35)] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#2DD4BF] focus:ring-offset-2 focus:ring-offset-[#0C0D0E] ${className}`}
      aria-label={label}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-[#0C0D0E]" />
          <span>Connecting to Google...</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{label}</span>
        </>
      )}
    </button>
  );
};
