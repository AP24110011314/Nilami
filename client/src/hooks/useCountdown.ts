import { useState, useEffect, useCallback } from 'react';
import { useClockStore } from '../store/clock';

export type CountdownPhase = 'normal' | 'amber' | 'red' | 'ended';

export interface CountdownResult {
  remainingMs: number;
  formatted: string;
  phase: CountdownPhase;
  isEnded: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return 'Ended';

  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function useCountdown(targetDate: string | Date | undefined): CountdownResult {
  const offset = useClockStore((state) => state.offset);

  const calculate = useCallback((): {
    remainingMs: number;
    phase: CountdownPhase;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } => {
    if (!targetDate) {
      return { remainingMs: 0, phase: 'ended', days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const targetMs = typeof targetDate === 'string' ? new Date(targetDate).getTime() : targetDate.getTime();
    const serverNow = Date.now() + offset;
    const diff = Math.max(0, targetMs - serverNow);

    let phase: CountdownPhase = 'normal';
    if (diff <= 0) {
      phase = 'ended';
    } else if (diff <= 10000) {
      phase = 'red';
    } else if (diff <= 60000) {
      phase = 'amber';
    }

    const totalSeconds = Math.floor(diff / 1000);
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const totalHours = Math.floor(totalMinutes / 60);
    const hours = totalHours % 24;
    const days = Math.floor(totalHours / 24);

    return { remainingMs: diff, phase, days, hours, minutes, seconds };
  }, [targetDate, offset]);

  const [state, setState] = useState(calculate);

  useEffect(() => {
    setState(calculate());

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startTimer = () => {
      if (!intervalId) {
        intervalId = setInterval(() => {
          const next = calculate();
          setState(next);
          if (next.remainingMs <= 0 && intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }, 250);
      }
    };

    const stopTimer = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopTimer();
      } else {
        setState(calculate());
        startTimer();
      }
    };

    if (!document.hidden) {
      startTimer();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [calculate]);

  return {
    ...state,
    formatted: formatDuration(state.remainingMs),
    isEnded: state.remainingMs <= 0,
  };
}

