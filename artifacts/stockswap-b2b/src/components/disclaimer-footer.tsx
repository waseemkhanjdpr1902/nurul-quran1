import { Link } from "wouter";

export function DisclaimerFooter() {
  return (
    <footer className="mt-8 px-4 py-6 bg-gray-100 text-center text-xs text-gray-500 border-t border-gray-200" data-testid="disclaimer-footer">
      <p className="mb-2">
        StockSwap is a discovery platform. We do not handle the physical goods or guarantee the quality of the stock.
      </p>
      <div className="flex justify-center gap-4">
        <Link href="/stockswap/terms" className="underline hover:text-gray-800" data-testid="link-terms">
          Terms
        </Link>
        <Link href="/stockswap/privacy" className="underline hover:text-gray-800" data-testid="link-privacy">
          Privacy
        </Link>
      </div>
    </footer>
  );
}
