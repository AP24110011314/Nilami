import { useCallback, useEffect } from 'react';
import { useClockStore } from '../store/clock';
import { getSocket } from '../lib/socket';

export function useServerClock() {
  const { offset, syncTime } = useClockStore();

  const now = useCallback(() => Date.now() + offset, [offset]);

  const syncWithServer = useCallback(() => {
    const socket = getSocket();
    const t0 = performance.now();

    socket.emit('time-sync', null, (res: { serverTime: string }) => {
      const rtt = Math.round(performance.now() - t0);
      if (res?.serverTime) {
        syncTime(res.serverTime, rtt);
      }
    });
  }, [syncTime]);

  useEffect(() => {
    const socket = getSocket();
    if (socket.connected) {
      syncWithServer();
    } else {
      socket.once('connect', syncWithServer);
    }

    // Periodic time sync every 60s
    const interval = setInterval(syncWithServer, 60000);
    return () => clearInterval(interval);
  }, [syncWithServer]);

  return { offset, now, syncWithServer };
}
