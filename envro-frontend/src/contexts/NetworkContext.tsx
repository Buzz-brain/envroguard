import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { NetworkService } from '../services/network';

type NetworkContextType = {
  isConnected: boolean;
  wasOffline: boolean;
  clearReconnected: () => void;
};

const NetworkContext = createContext<NetworkContextType>({
  isConnected: true,
  wasOffline: false,
  clearReconnected: () => {},
});

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const prevRef = useRef(true);

  useEffect(() => {
    const unsub = NetworkService.subscribe((connected) => {
      setIsConnected(connected);
      if (!prevRef.current && connected) {
        setWasOffline(true);
      }
      prevRef.current = connected;
    });
    return unsub;
  }, []);

  const clearReconnected = useCallback(() => {
    setWasOffline(false);
  }, []);

  return (
    <NetworkContext.Provider value={{ isConnected, wasOffline, clearReconnected }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}

export function useIsConnected() {
  return useContext(NetworkContext).isConnected;
}
