import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, X, ArrowRight } from 'lucide-react';
import { getSocket } from '../../lib/socket';
import { formatINR } from '../../lib/money';

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
      className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-3 text-amber-200 sticky top-16 z-40 backdrop-blur shadow-md animate-fade-in"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-amber-500/20 rounded-full text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-100">
              You have been outbid on &quot;{alert.title}&quot;!
            </p>
            <p className="text-xs text-amber-300/80">
              Your bid of {formatINR(alert.yourLastBid)} was surpassed. Current high bid:{' '}
              <span className="font-semibold text-amber-200">{formatINR(alert.currentPrice)}</span>. Next min:{' '}
              <span className="font-semibold text-white">{formatINR(alert.minNextBid)}</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/auctions/${alert.auctionId}`}
            onClick={() => setAlert(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-lg transition-colors"
          >
            Rebid Now <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => setAlert(null)}
            className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
