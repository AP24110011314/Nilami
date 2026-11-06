import { create } from 'zustand';

interface ClockState {
  offset: number; // in milliseconds: serverTime - localTime
  bestRtt: number;
  syncTime: (serverTimeStr: string, rtt?: number) => void;
}

export const useClockStore = create<ClockState>((set, get) => ({
  offset: 0,
  bestRtt: Infinity,
  syncTime: (serverTimeStr: string, rtt = 0) => {
    try {
      const serverTimeMs = new Date(serverTimeStr).getTime();
      const localTimeMs = Date.now();
      const adjustedServerTime = serverTimeMs + Math.round(rtt / 2);
      const computedOffset = adjustedServerTime - localTimeMs;

      // Retain sample if RTT is lower than current best or initial
      if (rtt < get().bestRtt || get().bestRtt === Infinity) {
        set({ offset: computedOffset, bestRtt: rtt });
      }
    } catch {
      // ignore parsing error
    }
  },
}));
