import { useState, useCallback } from 'react';
import type { OpportunityRequest, ResponseGenerationResult, PromptSubmissionResponse } from '../types';
import { generateRfpResponse, submitPromptToBackend } from '../api/client';
import { exportAsJson } from '../utils/export';

export function useOpportunityGenerator() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResponseGenerationResult | null>(null);

  const generate = useCallback(async (request: OpportunityRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await generateRfpResponse(request);
      setResult(data);
      return data;
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to generate Social Value response package.';
      setError(errMsg);
      console.error('Error generating RFP response:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitPrompt = useCallback(async (promptText: string): Promise<PromptSubmissionResponse | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await submitPromptToBackend(promptText);
      if (data.is_rfp_prompt && data.result) {
        setResult(data.result);
        setError(null);
      }
      return data;
    } catch (err: any) {
      const errMsg = err?.message || 'AI prompt processing failed.';
      console.error('Backend prompt submission failed:', err);
      setError(errMsg);
      setResult(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const exportResponse = useCallback(() => {
    if (!result) return;
    const clientSanitized = result.opportunity.client.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Infosys_Social_Value_RFP_${clientSanitized}_${new Date().toISOString().slice(0, 10)}.json`;
    exportAsJson(result, filename);
  }, [result]);

  const targetAmount = result?.opportunity
    ? (result.opportunity.contract_value_gbp * (result.opportunity.social_value_weighting_percent || 10)) / 100
    : 0;

  const clearError = useCallback(() => setError(null), []);

  return {
    isLoading,
    error,
    clearError,
    result,
    targetAmount,
    generate,
    submitPrompt,
    exportResponse,
    setResult,
    setIsLoading
  };
}
