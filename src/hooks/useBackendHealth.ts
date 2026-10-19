import { useState, useEffect, useCallback } from 'react';
import { checkBackendHealth } from '../api/client';
import type { BackendHealthData } from '../types';

export interface BackendHealthState {
  online: boolean;
  message: string;
  isChecking: boolean;
  data?: BackendHealthData;
  checkHealth: () => Promise<void>;
}

export function useBackendHealth(): BackendHealthState {
  const [online, setOnline] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('Connecting to backend...');
  const [data, setData] = useState<BackendHealthData | undefined>(undefined);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    try {
      const res = await checkBackendHealth();
      setOnline(res.online);
      setMessage(res.message);
      setData(res.data);
    } catch {
      setOnline(false);
      setMessage('Backend offline');
      setData(undefined);
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
          setData(res.data);
          setIsChecking(false);
        }
      })
      .catch(() => {
        if (isSubscribed) {
          setOnline(false);
          setMessage('Backend offline');
          setData(undefined);
          setIsChecking(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, []);

  return { online, message, isChecking, data, checkHealth };
}
