import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

type Listener = (connected: boolean) => void;

let listeners: Listener[] = [];
let currentState: boolean = true;
let unsubscribe: (() => void) | null = null;

export const NetworkService = {
  init() {
    if (unsubscribe) return;
    unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? true;
      const wasOffline = !currentState;
      currentState = connected;
      listeners.forEach((fn) => fn(connected));
      if (wasOffline && connected) {
        listeners.forEach((fn) => fn(connected));
      }
    });
  },

  destroy() {
    unsubscribe?.();
    unsubscribe = null;
    listeners = [];
  },

  isConnected(): boolean {
    return currentState;
  },

  subscribe(fn: Listener) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  },

  async checkConnection(): Promise<boolean> {
    const state = await NetInfo.fetch();
    currentState = state.isConnected ?? true;
    return currentState;
  },
};

NetworkService.init();
