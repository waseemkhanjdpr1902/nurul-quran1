import { useState, useEffect } from "react";

const DISCLAIMER_KEY = "trademaster_disclaimer_accepted";

export function DisclaimerModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(DISCLAIMER_KEY);
    if (!accepted) setOpen(true);
  }, []);

  const accept = () => {
    localStorage.setItem(DISCLAIMER_KEY, "true");
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[hsl(220,13%,12%)] border border-yellow-500/50 rounded-xl max-w-lg w-full p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-yellow-400 text-2xl">⚠️</div>
          <h2 className="text-yellow-400 text-xl font-bold">Important Disclaimer</h2>
        </div>
        <div className="text-sm text-gray-300 space-y-3">
          <p>
            <strong className="text-white">Educational Purpose Only:</strong> All trading signals, analysis, and information provided on TradeMaster Pro are strictly for <strong className="text-yellow-400">educational and informational purposes only</strong>.
          </p>
          <p>
            TradeMaster Pro is <strong className="text-red-400">NOT a SEBI-registered investment advisor</strong>. We do not provide personalized investment advice or recommendations.
          </p>
          <p>
            Trading in equity markets, derivatives (F&O), commodities, and currencies involves <strong className="text-red-400">substantial risk of loss</strong>. Past performance is not indicative of future results.
          </p>
          <p>
            Please consult a SEBI-registered investment advisor before making any investment decisions. By proceeding, you confirm that you understand and accept these risks.
          </p>
        </div>
        <button
          onClick={accept}
          className="mt-6 w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-6 rounded-lg transition-colors"
        >
          I Understand & Accept
        </button>
      </div>
    </div>
  );
}
