import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const symbols = (req.query.symbols as string) || "";
  if (!symbols) {
    return res.status(400).json({ error: "symbols query param required" });
  }

  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const url = `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(symbols)}?apikey=${apiKey}`;
    const response = await fetch(url, { const response = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!response.ok) {
      return res.status(502).json({ error: "upstream error" });
    }

    const data = await response.json();

    const result: Record<string, { price: number | null; change: number | null; changePercent: number | null; marketCap: number | null; currency: string }> = {};

    if (Array.isArray(data)) {
      data.forEach((q) => {
        result[q.symbol] = {
          price: q.price ?? null,
          change: q.change ?? null,
          changePercent: q.changesPercentage ?? null,
          marketCap: q.marketCap ?? null,
          currency: "USD",
        };
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: "fetch failed" });
  }
}
