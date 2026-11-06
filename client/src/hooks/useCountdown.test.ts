import { describe, it, expect, beforeEach } from 'vitest';
import { formatDuration } from './useCountdown';
import { useClockStore } from '../store/clock';

describe('Countdown and Server Clock Unit Tests', () => {
  beforeEach(() => {
    useClockStore.setState({ offset: 0, bestRtt: Infinity });
  });

  describe('formatDuration', () => {
    it('returns "Ended" for non-positive milliseconds', () => {
      expect(formatDuration(0)).toBe('Ended');
      expect(formatDuration(-1000)).toBe('Ended');
    });

    it('formats days, hours, and minutes correctly', () => {
      const ms = (2 * 24 * 3600 + 5 * 3600 + 30 * 60) * 1000;
      expect(formatDuration(ms)).toBe('2d 5h 30m');
    });

    it('formats hours, minutes, and seconds when under 24 hours', () => {
      const ms = (3 * 3600 + 15 * 60 + 42) * 1000;
      expect(formatDuration(ms)).toBe('3h 15m 42s');
    });

    it('formats mm:ss when under 1 hour', () => {
      const ms = (4 * 60 + 9) * 1000;
      expect(formatDuration(ms)).toBe('04:09');
    });

    it('formats 00:ss when under 1 minute', () => {
      const ms = 7 * 1000;
      expect(formatDuration(ms)).toBe('00:07');
    });
  });

  describe('Server Clock Sync (useClockStore)', () => {
    it('corrects server clock offset considering network RTT', () => {
      const localNow = Date.now();
      // Server clock is 5 seconds ahead of local
      const serverTimeStr = new Date(localNow + 5000).toISOString();
      const rtt = 100; // 100ms round trip

      useClockStore.getState().syncTime(serverTimeStr, rtt);

      const offset = useClockStore.getState().offset;
      // Adjusted server time is (localNow + 5000) + 50ms = 5050ms offset from localNow
      expect(offset).toBeGreaterThanOrEqual(5000);
      expect(offset).toBeLessThanOrEqual(5100);
    });

    it('retains the offset with the lowest RTT', () => {
      const localNow = Date.now();
      const serverTime1 = new Date(localNow + 1000).toISOString();
      const serverTime2 = new Date(localNow + 3000).toISOString();

      // First sync with 200ms RTT
      useClockStore.getState().syncTime(serverTime1, 200);
      expect(useClockStore.getState().bestRtt).toBe(200);

      // Second sync with worse RTT (400ms) should be ignored
      useClockStore.getState().syncTime(serverTime2, 400);
      expect(useClockStore.getState().bestRtt).toBe(200);

      // Third sync with better RTT (50ms) should overwrite
      useClockStore.getState().syncTime(serverTime2, 50);
      expect(useClockStore.getState().bestRtt).toBe(50);
    });
  });
});

