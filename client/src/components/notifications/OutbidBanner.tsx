import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, X, ArrowRight } from 'lucide-react';
import { getSocket } from '../../lib/socket.js';
import { formatINR } from '../../lib/money.js';

export interface OutbidPayload {
  auctionId: string;
  title: string;
  yourLastBid: number;
  currentPrice: number;
  minNextBid: number;
}

export function OutbidBanner() {
  const [alert, setAlert] = useState<OutbidPayload | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const onOutbid = (payload: OutbidPayload) => {
      setAlert(payload);
    };

    socket.on('outbid-notification', onOutbid);
    return () => {
      socket.off('outbid-notification', onOutbid);
    };
  }, []);

  if (!alert) return null;

  return (
    <div
      role="alert"
      className="bg-nilami-danger-subtle/90 dark:bg-nilami-danger-dark/30 border-b border-nilami-danger/40 px-4 py-3 text-nilami-danger-dark dark:text-nilami-danger-light sticky top-18 z-40 backdrop-blur shadow-md animate-in fade-in slide-in-from-top-2 duration-300"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-nilami-danger/20 rounded-full text-nilami-danger-dark dark:text-nilami-danger shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-nilami-danger-dark dark:text-nilami-danger-light">
              You have been outbid on &quot;{alert.title}&quot;!
            </p>
            <p className="text-xs text-nilami-text/80 dark:text-nilami-dark-text/80">
              Your bid of {formatINR(alert.yourLastBid)} was surpassed. Current high bid:{' '}
              <span className="font-bold text-nilami-danger-dark dark:text-nilami-danger-light">{formatINR(alert.currentPrice)}</span>. Next min:{' '}
              <span className="font-bold text-nilami-green-dark dark:text-nilami-sand">{formatINR(alert.minNextBid)}</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Link
            to={`/auctions/${alert.auctionId}`}
            onClick={() => setAlert(null)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-nilami-danger-dark hover:bg-nilami-danger text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            <span>Rebid Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => setAlert(null)}
            className="p-1.5 text-nilami-text/50 hover:text-nilami-text hover:bg-nilami-danger/10 rounded-lg transition-colors cursor-pointer"
            title="Dismiss notification"
            aria-label="Dismiss outbid banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
