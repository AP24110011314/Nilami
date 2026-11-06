import React, { useState } from 'react';
import { CreditCard, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';

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
        <h1 className="text-2xl font-black text-slate-900">Payment Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage saved cards, auto-charge preferences, and consent terms.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Saved Cards &amp; Fast Checkout</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Securely store card details for one-click auction settlements.
            </p>
          </div>
        </div>

        {/* RBI E-mandate Notice */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Important Notice regarding Indian Card Regulations (RBI)</span>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-950/80">
            Under Reserve Bank of India (RBI) e-mandate guidelines, off-session automatic debit without OTP
            is strictly restricted for amounts exceeding ₹15,000. When an auction closing amount exceeds
            ₹15,000 or your bank requires verification, the platform will automatically send a prompt to complete
            authenticated 3-D Secure checkout.
          </p>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6 pt-2">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <input
              type="checkbox"
              id="consent"
              checked={saveCardConsent}
              onChange={(e) => setSaveCardConsent(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="consent" className="text-xs text-slate-700 leading-relaxed cursor-pointer">
              <span className="font-semibold block text-slate-900 mb-0.5">
                Authorize Off-Session Auto-Charge Consent (v1.2)
              </span>
              I agree and authorize Nilami to securely save my payment method and initiate off-session charges
              for auctions I win, up to the final winning bid amount plus applicable statutory taxes, adhering to RBI
              guidelines and merchant terms.
            </label>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>256-bit encrypted via Stripe Payments</span>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              Save Preferences
            </button>
          </div>

          {consentSaved && (
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
              <span>Payment consent preferences saved successfully!</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
