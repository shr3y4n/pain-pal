/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * JournalConversation Component
 * Scrollable conversation stream rendering turns and managing auto-scroll.
 */

import React, { useEffect, useRef } from "react";
import { InteractionMessage } from "../types/journal";
import { JournalMessage } from "./JournalMessage";
import { EmptyState } from "./EmptyState";
import { LoadingState } from "./LoadingState";

interface JournalConversationProps {
  messages: InteractionMessage[];
  isSubmitting: boolean;
  onSelectPrompt: (promptText: string) => void;
}

export const JournalConversation: React.FC<JournalConversationProps> = ({
  messages,
  isSubmitting,
  onSelectPrompt
}) => {
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (bottomAnchorRef.current) {
      bottomAnchorRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isSubmitting]);

  if (messages.length === 0 && !isSubmitting) {
    return <EmptyState onSelectPrompt={onSelectPrompt} />;
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      {messages.map((message) => (
        <JournalMessage key={message.id} message={message} />
      ))}

      {isSubmitting && <LoadingState />}

      <div ref={bottomAnchorRef} aria-hidden="true" />
    </div>
  );
};
