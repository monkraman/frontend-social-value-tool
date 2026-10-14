import { useState, useEffect, useCallback } from 'react';
import { checkBackendHealth } from '../api/client';

export interface BackendHealthState {
  online: boolean;
  message: string;
  isChecking: boolean;
  checkHealth: () => Promise<void>;
}

export function useBackendHealth(): BackendHealthState {
  const [online, setOnline] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('Connecting to backend...');
  const [isChecking, setIsChecking] = useState<boolean>(true);

  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    try {
      const res = await checkBackendHealth();
      setOnline(res.online);
      setMessage(res.message);
    } catch {
      setOnline(false);
      setMessage('Backend offline (using local engine fallback)');
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    checkBackendHealth()
      .then((res) => {
        if (isSubscribed) {
          setOnline(res.online);
          setMessage(res.message);
          setIsChecking(false);
        }
      })
      .catch(() => {
        if (isSubscribed) {
          setOnline(false);
          setMessage('Backend offline (using local engine fallback)');
          setIsChecking(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, []);

  return { online, message, isChecking, checkHealth };
}
