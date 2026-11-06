import React, { useState, useEffect } from 'react';
import { Bookmark, BookmarkCheck, Bell, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router';
import { apiClient } from '../../api/client.js';
import { useAuthStore } from '../../store/auth.js';

interface WatchlistButtonProps {
  auctionId: string;
  className?: string;
}

export const WatchlistButton: React.FC<WatchlistButtonProps> = ({ auctionId, className = '' }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [isWatching, setIsWatching] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState<number>(15);
  const [loading, setLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (user && auctionId) {
      apiClient
        .getWatchlistStatus(auctionId)
        .then((res) => {
          if (mounted) {
            setIsWatching(res.watching);
            if (res.reminderMinutesBefore) {
              setReminderMinutes(res.reminderMinutesBefore);
            }
          }
        })
        .catch(() => {
          // Unauthenticated or network error
        });
    }
    return () => {
      mounted = false;
    };
  }, [user, auctionId]);

  const handleToggle = async (minutesToSet?: number) => {
    if (!user) {
      navigate('/login');
      return;
    }

    const targetMinutes = minutesToSet ?? reminderMinutes;
    setLoading(true);
    try {
      if (isWatching && minutesToSet === undefined) {
        // Unwatch
        await apiClient.unwatchAuction(auctionId);
        setIsWatching(false);
      } else {
        // Watch or update reminder
        const res = await apiClient.watchAuction(auctionId, targetMinutes);
        setIsWatching(res.watching);
        if (res.reminderMinutesBefore) {
          setReminderMinutes(res.reminderMinutesBefore);
        }
      }
      setShowOptions(false);
    } catch {
      // Failed to toggle
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <div className="inline-flex rounded-xl shadow-sm border border-slate-200 bg-white overflow-hidden">
        <button
          type="button"
          disabled={loading}
          onClick={() => handleToggle()}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
            isWatching
              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              : 'text-slate-700 hover:bg-slate-50'
          }`}
          title={isWatching ? 'Remove from Watchlist' : 'Add to Watchlist'}
        >
          {isWatching ? (
            <BookmarkCheck className="w-4 h-4 text-amber-600 fill-amber-500" />
          ) : (
            <Bookmark className="w-4 h-4 text-slate-500" />
          )}
          <span>{isWatching ? 'Watching' : 'Watch Lot'}</span>
        </button>

        {isWatching && (
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="px-2 py-1.5 bg-amber-50 text-amber-700 border-l border-amber-200 hover:bg-amber-100 transition cursor-pointer"
            title="Reminder Settings"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {showOptions && (
        <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-slate-200 p-2 z-30 text-xs">
          <div className="flex items-center gap-1 text-slate-500 font-semibold px-2 py-1 mb-1 border-b border-slate-100">
            <Bell className="w-3.5 h-3.5 text-indigo-600" />
            <span>Reminder alert:</span>
          </div>
          {[15, 30, 60].map((mins) => (
            <button
              key={mins}
              onClick={() => handleToggle(mins)}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer transition ${
                reminderMinutes === mins
                  ? 'bg-indigo-50 font-bold text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{mins} mins before</span>
              {reminderMinutes === mins && <span className="text-indigo-600">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

