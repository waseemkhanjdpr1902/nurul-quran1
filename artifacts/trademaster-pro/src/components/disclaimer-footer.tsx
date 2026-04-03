export function DisclaimerFooter() {
  return (
    <div>
      <div className="bg-yellow-900/20 border-t border-yellow-600/30 py-2 overflow-hidden">
        <div className="flex items-center gap-2 px-4">
          <span className="text-yellow-400 text-xs font-bold shrink-0">⚠️ DISCLAIMER:</span>
          <div className="overflow-hidden flex-1">
            <div className="disclaimer-scroll text-yellow-300/80 text-xs">
              All signals and analysis on TradeMaster Pro are for educational purposes only. We are NOT a SEBI-registered investment advisor. Trading involves substantial risk of loss. Please consult a qualified financial advisor before making any investment decisions. Past performance is not indicative of future results. Options trading involves significant risk and is not suitable for all investors. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; All signals and analysis on TradeMaster Pro are for educational purposes only. We are NOT a SEBI-registered investment advisor. Trading involves substantial risk of loss.
            </div>
          </div>
        </div>
      </div>
      <div className="bg-[hsl(220,13%,8%)] border-t border-[hsl(220,13%,15%)] py-3 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-600">
          <span>© {new Date().getFullYear()} TradeMaster Pro. For educational purposes only.</span>
          <div className="flex gap-4">
            <a href="/trademaster/privacy-policy" className="hover:text-gray-400 transition-colors">Privacy Policy</a>
            <a href="/trademaster/terms" className="hover:text-gray-400 transition-colors">Terms of Use</a>
            <span>Ads by Google AdMob</span>
          </div>
        </div>
      </div>
    </div>
  );
}
