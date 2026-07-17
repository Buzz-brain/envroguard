import { useEffect, useRef } from 'react';
import { useNetwork } from '../contexts/NetworkContext';

export function useAutoRetry(fn: () => void, enabled: boolean = true) {
  const { isConnected, wasOffline } = useNetwork();
  const prevConnected = useRef(isConnected);
  const hasReconnected = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (!prevConnected.current && isConnected && !hasReconnected.current) {
      hasReconnected.current = true;
      fn();
    }
    if (wasOffline) {
      hasReconnected.current = false;
    }
    prevConnected.current = isConnected;
  }, [isConnected, wasOffline, enabled]);
}
