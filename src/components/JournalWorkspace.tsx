/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * JournalWorkspace Component
 * Central authenticated workspace orchestrating sidebar history, conversation timeline,
 * multiline composer, error notifications, and responsiveness.
 */

import React, { useState, useCallback } from "react";
import { User } from "firebase/auth";
import { UserMenu } from "./UserMenu";
import { JournalSidebar } from "./JournalSidebar";
import { JournalConversation } from "./JournalConversation";
import { JournalComposer } from "./JournalComposer";
import { ErrorState } from "./ErrorState";
import { useJournal } from "../hooks/useJournal";

interface JournalWorkspaceProps {
  user: User;
  onSignOut: () => void;
}

export const JournalWorkspace: React.FC<JournalWorkspaceProps> = ({
  user,
  onSignOut
}) => {
  const [promptText, setPromptText] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const {
    messages,
    isSubmitting,
    error,
    setError,
    activeModel,
    submitReflection
  } = useJournal(user);

  const handleSubmit = useCallback(async () => {
    const textToSubmit = promptText.trim();
    if (!textToSubmit || isSubmitting) return;

    // Temporarily clear to avoid duplicate submissions
    setPromptText("");

    const success = await submitReflection(textToSubmit);
    if (!success) {
      // Restore prompt text on failure so the user never loses their writing
      setPromptText(textToSubmit);
    }
  }, [promptText, isSubmitting, submitReflection]);

  const handleSelectPrompt = (starter: string) => {
    setPromptText(starter);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0C0D0E] text-[#EDEDED] overflow-hidden selection:bg-[#2DD4BF]/25 selection:text-[#2DD4BF]">
      {/* Top Header Navigation */}
      <UserMenu
        user={user}
        onSignOut={onSignOut}
        activeModel={activeModel}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Collapsible Journal Sidebar */}
        <JournalSidebar
          messages={messages}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Backdrop for mobile drawer */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden fixed inset-0 bg-black/60 z-10 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />
        )}

        {/* Conversation & Composer Column */}
        <main className="flex-1 flex flex-col justify-between overflow-hidden bg-[#0C0D0E]">
          {/* Scrollable Conversation Stream */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <JournalConversation
              messages={messages}
              isSubmitting={isSubmitting}
              onSelectPrompt={handleSelectPrompt}
            />
          </div>

          {/* Error Notification Banner */}
          {error && (
            <ErrorState
              message={error}
              onDismiss={() => setError(null)}
              onRetry={promptText.trim() ? handleSubmit : undefined}
            />
          )}

          {/* Persistent Floating Composer */}
          <footer className="w-full border-t border-[#1C1F26] bg-[#0C0D0E]/90 backdrop-blur-md">
            <JournalComposer
              value={promptText}
              onChange={setPromptText}
              onSubmit={handleSubmit}
              disabled={isSubmitting}
            />
          </footer>
        </main>
      </div>
    </div>
  );
};
