import { useState, useEffect, useCallback, useRef } from 'react';
import type { PromptHistoryItem, ResponseGenerationResult } from '../types';
import { fetchPromptHistory, refineRfpResponse } from '../api/client';

/**
 * A single turn in the in-memory conversation thread.
 * role = 'user' (prompt / feedback) | 'assistant' (AI result summary)
 */
export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * useChatHistory
 *
 * Manages:
 *  1. Sidebar history list (last 10 RFP prompts from backend)
 *  2. In-memory conversation thread (ALL turns of the current session)
 *  3. Refinement API calls — always sends the FULL thread to the backend
 *     so the AI never forgets ANY previous instruction.
 */
export function useChatHistory() {
  const [history, setHistory] = useState<PromptHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [refineError, setRefineError] = useState<string | null>(null);

  // ─── Session thread (in-memory, full conversation) ────────────────────────
  // This is THE key — every user message and every AI reply is appended here.
  // On each refinement the full array is sent to the backend.
  const conversationThread = useRef<ConversationTurn[]>([]);

  // Session IDs for DB linkage
  const currentSessionId = useRef<string | undefined>(undefined);
  const currentPromptId = useRef<string | undefined>(undefined);
  const turnIndex = useRef<number>(1);

  // ─── History loading ───────────────────────────────────────────────────────
  const loadHistory = useCallback(async (limit = 10) => {
    setIsLoadingHistory(true);
    try {
      const items = await fetchPromptHistory(limit);
      setHistory(items);
    } catch {
      setHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory(10);
  }, [loadHistory]);

  // ─── Called when a brand-new prompt is successfully generated ─────────────
  /**
   * Initialise (or re-initialise) the conversation thread after a fresh
   * prompt-generation succeeds.
   *
   * @param promptText  The original RFP prompt the user submitted
   * @param result      The generated ResponseGenerationResult
   * @param promptId    The DB id of the new PromptHistory record
   */
  const initThread = useCallback(
    (promptText: string, result: ResponseGenerationResult, promptId?: string) => {
      // Build a compact but rich summary of the AI's first response
      const opp = result.opportunity;
      const localised = result.localised_package;
      const svTotal = localised?.financial_calculation?.total_social_value_gbp ?? 0;
      const initiatives = (localised?.initiatives ?? [])
        .slice(0, 6)
        .map((i) => `${i.name} [${i.toms_metric_code ?? 'TOMs'}]`)
        .join('; ');

      const assistantSummary =
        `Generated Social Value proposal for ${opp.client} (${opp.location}). ` +
        `Contract: ${opp.duration_years}-year, £${opp.contract_value_gbp?.toLocaleString()}, ` +
        `${opp.social_value_weighting_percent}% SV weighting. ` +
        `Localised Package total: £${svTotal.toLocaleString()}. ` +
        `Key initiatives: ${initiatives || 'See full result'}.`;

      conversationThread.current = [
        { role: 'user', content: promptText },
        { role: 'assistant', content: assistantSummary }
      ];

      turnIndex.current = 1;
      currentSessionId.current = undefined;
      if (promptId) currentPromptId.current = promptId;

      setRefineError(null);
    },
    []
  );

  // ─── Main refine function ──────────────────────────────────────────────────
  /**
   * Refine the current result with new user feedback.
   *
   * The FULL conversation thread (every prior user message + AI reply)
   * is sent to the backend on every call — so the AI has perfect memory
   * of the entire session and NEVER forgets earlier instructions.
   */
  const refine = useCallback(
    async (
      feedbackText: string,
      previousResult: ResponseGenerationResult,
      previousPrompt: string,
      onSuccess: (newResult: ResponseGenerationResult, refinementNote: string) => void
    ) => {
      setIsRefining(true);
      setRefineError(null);

      // If the thread is empty (e.g., restored from history without initThread),
      // build a minimal 2-turn baseline before appending the new feedback.
      if (conversationThread.current.length === 0) {
        const opp = previousResult.opportunity;
        const localised = previousResult.localised_package;
        const svTotal = localised?.financial_calculation?.total_social_value_gbp ?? 0;
        const initiatives = (localised?.initiatives ?? [])
          .slice(0, 6)
          .map((i) => `${i.name} [${i.toms_metric_code ?? 'TOMs'}]`)
          .join('; ');

        conversationThread.current = [
          {
            role: 'user',
            content: previousPrompt || `Build Social Value bid for ${opp.client} in ${opp.location}`
          },
          {
            role: 'assistant',
            content:
              `Previous result for ${opp.client} (${opp.location}). ` +
              `Contract: ${opp.duration_years}-year, £${opp.contract_value_gbp?.toLocaleString()}, ` +
              `${opp.social_value_weighting_percent}% SV. Total SV: £${svTotal.toLocaleString()}. ` +
              `Initiatives: ${initiatives || 'none listed'}.`
          }
        ];
      }

      // The thread at this point has all previous turns.
      // The backend will append the feedback as the last user turn internally,
      // but we send the thread WITHOUT the new feedback so the backend can
      // control the append — OR we send it including the new feedback.
      // (We include it here so callers get the full picture if they inspect.)
      const threadToSend = conversationThread.current; // snapshot before mutation
      const turnNum = turnIndex.current + 1;

      try {
        const data = await refineRfpResponse(
          feedbackText,
          previousResult as any,
          previousPrompt,
          currentSessionId.current,
          currentPromptId.current,
          turnNum,
          threadToSend // ← FULL thread sent to backend
        );

        if (data.is_rfp_prompt && data.result) {
          // Update session refs
          if (data.session_id) currentSessionId.current = data.session_id;
          currentPromptId.current = data.prompt_id;
          turnIndex.current = data.turn_index ?? turnNum;

          // ── Append this round to the local thread so next refine is cumulative ──
          const opp = data.result.opportunity;
          const localised = data.result.localised_package;
          const svTotal = localised?.financial_calculation?.total_social_value_gbp ?? 0;
          const newInitiatives = (localised?.initiatives ?? [])
            .slice(0, 6)
            .map((i: any) => `${i.name} [${i.toms_metric_code ?? 'TOMs'}]`)
            .join('; ');

          // Append user feedback turn
          conversationThread.current = [
            ...conversationThread.current,
            { role: 'user', content: `Refinement feedback (turn ${turnIndex.current}): ${feedbackText}` },
            {
              role: 'assistant',
              content:
                `Refined result (turn ${turnIndex.current}) for ${opp.client} (${opp.location}). ` +
                `Total SV: £${svTotal.toLocaleString()}. ` +
                `Updated initiatives: ${newInitiatives || 'see result'}.`
            }
          ];

          onSuccess(
            data.result,
            data.refinement_note ||
              `✓ Turn ${turnIndex.current} — AI used ${conversationThread.current.length} conversation turns as context`
          );

          // Refresh sidebar history
          await loadHistory(10);
        } else {
          setRefineError(
            data.explanation ||
              'Refinement did not produce a valid result. Try again with more detail.'
          );
        }
      } catch (err: any) {
        setRefineError(err?.message || 'Refinement failed. Please check your connection.');
      } finally {
        setIsRefining(false);
      }
    },
    [loadHistory]
  );

  // ─── Reset (New Prompt button) ─────────────────────────────────────────────
  const resetSession = useCallback(() => {
    conversationThread.current = [];
    currentSessionId.current = undefined;
    currentPromptId.current = undefined;
    turnIndex.current = 1;
    setRefineError(null);
  }, []);

  // ─── Restore from history ──────────────────────────────────────────────────
  /**
   * When user clicks a past chat in sidebar — seed the thread from the
   * stored result so further refinements have context.
   */
  const setSessionFromHistory = useCallback(
    (promptId: string, restoredPrompt?: string, restoredResult?: ResponseGenerationResult) => {
      currentPromptId.current = promptId;
      turnIndex.current = 1;
      setRefineError(null);

      if (restoredPrompt && restoredResult) {
        const opp = restoredResult.opportunity;
        const localised = restoredResult.localised_package;
        const svTotal = localised?.financial_calculation?.total_social_value_gbp ?? 0;
        const initiatives = (localised?.initiatives ?? [])
          .slice(0, 6)
          .map((i) => `${i.name} [${i.toms_metric_code ?? 'TOMs'}]`)
          .join('; ');

        // Seed thread with this restored session
        conversationThread.current = [
          { role: 'user', content: restoredPrompt },
          {
            role: 'assistant',
            content:
              `Restored result for ${opp.client} (${opp.location}). ` +
              `Contract: ${opp.duration_years}-year, £${opp.contract_value_gbp?.toLocaleString()}, ` +
              `${opp.social_value_weighting_percent}% SV. Total SV: £${svTotal.toLocaleString()}. ` +
              `Initiatives: ${initiatives || 'see result'}.`
          }
        ];
      } else {
        conversationThread.current = [];
      }
    },
    []
  );

  // ─── Expose current thread length for UI display ──────────────────────────
  const [threadLength, setThreadLength] = useState(0);
  // Sync threadLength state after mutations (used for display in UI)
  const syncThreadLength = useCallback(() => {
    setThreadLength(conversationThread.current.length);
  }, []);

  return {
    history,
    isLoadingHistory,
    isRefining,
    refineError,
    loadHistory,
    refine,
    initThread,
    resetSession,
    setSessionFromHistory,
    syncThreadLength,
    threadLength,
    currentTurn: turnIndex.current
  };
}
