import React, { useState } from 'react';
import { CreditCard, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const PaymentSettingsPage: React.FC = () => {
  const [saveCardConsent, setSaveCardConsent] = useState(false);
  const [consentSaved, setConsentSaved] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setConsentSaved(true);
    setTimeout(() => setConsentSaved(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="font-display font-black text-2xl text-nilami-text">
          Payment Settings
        </h1>
        <p className="text-xs text-nilami-text-muted mt-1">
          Manage saved cards, auto-charge preferences, and consent terms.
        </p>
      </div>

      <div className="bg-nilami-sand-surface rounded-3xl p-6 sm:p-8 border border-nilami-border shadow-sm space-y-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-nilami-green-subtle text-nilami-green-dark rounded-2xl border border-nilami-border-strong">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base text-nilami-text">
              Saved Cards &amp; Fast Checkout
            </h2>
            <p className="text-xs text-nilami-text-muted mt-0.5">
              Securely store card details for one-click auction settlements.
            </p>
          </div>
        </div>

        {/* RBI E-mandate Notice */}
        <div className="p-4 rounded-2xl bg-nilami-tan/65 border border-nilami-border-strong text-xs text-nilami-text space-y-2">
          <div className="flex items-center gap-2 font-bold text-nilami-warning-dark">
            <AlertTriangle className="w-4 h-4 text-nilami-warning-dark shrink-0" />
            <span>Important Notice regarding Indian Card Regulations (RBI)</span>
          </div>
          <p className="text-[11px] leading-relaxed text-nilami-text-secondary">
            Under Reserve Bank of India (RBI) e-mandate guidelines, off-session automatic debit without OTP
            is restricted for amounts exceeding ₹15,000. When an auction closing amount exceeds
            ₹15,000 or your bank requires verification, the platform will automatically provide an authenticated 3-D Secure checkout.
          </p>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6 pt-2">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-nilami-ivory-surface border border-nilami-border">
            <input
              type="checkbox"
              id="consent"
              checked={saveCardConsent}
              onChange={(e) => setSaveCardConsent(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-nilami-border text-nilami-green-dark focus:ring-nilami-green-dark cursor-pointer"
            />
            <label htmlFor="consent" className="text-xs text-nilami-text-secondary leading-relaxed cursor-pointer">
              <span className="font-bold block text-nilami-text mb-0.5">
                Enable 1-Click Auto-Charge for Won Auctions
              </span>
              I authorize Nilami to automatically initiate charging my default card when I win an auction lot, subject to RBI 3DS guidelines.
            </label>
          </div>

          {consentSaved && (
            <div className="p-3 bg-nilami-green-subtle border border-nilami-border-strong text-nilami-green-dark text-xs flex items-center gap-2 rounded-xl font-bold">
              <CheckCircle2 className="w-4 h-4 text-nilami-green-dark" />
              <span>Preferences saved successfully!</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 bg-nilami-green-dark hover:bg-nilami-green-pressed text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            Save Payment Preferences
          </button>
        </form>
      </div>
    </div>
  );
};
