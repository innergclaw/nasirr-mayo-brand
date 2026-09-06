import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const allowedOrigins = new Set([
  "https://innergclaw.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
]);
const sectors = [
  { id: "ai-compute", name: "AI + Compute" },
  { id: "platforms", name: "Platforms + Fintech" },
  { id: "crypto", name: "Crypto" },
  { id: "energy", name: "Energy + Commodities" },
  { id: "materials", name: "Agriculture + Materials" },
  { id: "core-funds", name: "Core Funds" },
];
const assets = [
  ["SKHY", "SK hynix ADR", "ai-compute", "SKHY"],
  ["ARM", "Arm Holdings", "ai-compute", "ARM"],
  ["DRAM", "Themes Generative AI ETF", "ai-compute", "DRAM"],
  ["IREN", "IREN Limited", "ai-compute", "IREN"],
  ["MRVL", "Marvell Technology", "ai-compute", "MRVL"],
  ["CRWV", "CoreWeave", "ai-compute", "CRWV"],
  ["WDC", "Western Digital", "ai-compute", "WDC"],
  ["HOOD", "Robinhood Markets", "platforms", "HOOD"],
  ["OPEN", "Opendoor Technologies", "platforms", "OPEN"],
  ["ZEC", "Zcash", "crypto", "ZEC-USD"],
  ["HYPE", "Hyperliquid", "crypto", "HYPE"],
  ["BTC", "Bitcoin", "crypto", "BTC-USD"],
  ["SOL", "Solana", "crypto", "SOL-USD"],
  ["USO", "United States Oil Fund", "energy", "USO"],
  ["GSG", "iShares S&P GSCI Commodity Trust", "energy", "GSG"],
  ["OXY", "Occidental Petroleum", "energy", "OXY"],
  ["MTDR", "Matador Resources", "energy", "MTDR"],
  ["COP", "ConocoPhillips", "energy", "COP"],
  ["CORN", "Teucrium Corn Fund", "materials", "CORN"],
  ["CANE", "Teucrium Sugar Fund", "materials", "CANE"],
  ["EMN", "Eastman Chemical", "materials", "EMN"],
  ["LYB", "LyondellBasell Industries", "materials", "LYB"],
  ["OLN", "Olin Corporation", "materials", "OLN"],
  ["NTR", "Nutrien", "materials", "NTR"],
  ["MOS", "The Mosaic Company", "materials", "MOS"],
  ["SCHD", "Schwab U.S. Dividend Equity ETF", "core-funds", "SCHD"],
  ["VOO", "Vanguard S&P 500 ETF", "core-funds", "VOO"],
  ["QQQ", "Invesco QQQ Trust", "core-funds", "QQQ"],
  ["VTV", "Vanguard Value ETF", "core-funds", "VTV"],
  ["VTI", "Vanguard Total Stock Market ETF", "core-funds", "VTI"],
  ["FXAIX", "Fidelity 500 Index Fund", "core-funds", "FXAIX"],
] as const;

const clean = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const change = (current: number | null, previous: number | null) =>
  current === null || previous === null || previous === 0 ? null : Math.round((current / previous - 1) * 1_000_000) / 10_000;
const priorClose = (points: Array<[number, number]>, target: number) => {
  const match = points.filter(([timestamp]) => timestamp <= target).at(-1);
  return match?.[1] ?? null;
};

async function yahooAsset(symbol: string, name: string, sector: string, providerSymbol: string) {
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(providerSymbol)}?range=1y&interval=1d&includePrePost=true&events=div%2Csplits`, {
    headers: { "User-Agent": "InnerG-Watchlist/3.0" },
  });
  if (!response.ok) throw new Error(`Yahoo returned ${response.status}`);
  const payload = await response.json();
  const result = payload.chart?.result?.[0];
  if (!result) throw new Error("No market history returned");
  const meta = result.meta ?? {};
  const quote = result.indicators?.quote?.[0] ?? {};
  const points: Array<[number, number]> = (result.timestamp ?? []).flatMap((timestamp: number, index: number) => {
    const close = clean(quote.close?.[index]);
    return close === null ? [] : [[timestamp, close] as [number, number]];
  });
  if (!points.length) throw new Error("No closing prices returned");
  const current = clean(meta.regularMarketPrice) ?? points.at(-1)![1];
  const highs = (quote.high ?? []).map(clean).filter((value: number | null): value is number => value !== null);
  const lows = (quote.low ?? []).map(clean).filter((value: number | null): value is number => value !== null);
  const now = Math.floor(Date.now() / 1000);
  return {
    symbol, name, sector, price: current, currency: meta.currency || "USD",
    dayHigh: clean(meta.regularMarketDayHigh) ?? highs.at(-1) ?? current,
    dayLow: clean(meta.regularMarketDayLow) ?? lows.at(-1) ?? current,
    yearHigh: clean(meta.fiftyTwoWeekHigh) ?? Math.max(...highs, current),
    yearLow: clean(meta.fiftyTwoWeekLow) ?? Math.min(...lows, current),
    weekSeries: points.slice(-7).map(([, close]) => close),
    returns: {
      day: clean(meta.regularMarketChangePercent) ?? change(current, points.at(-2)?.[1] ?? null),
      week: change(current, priorClose(points, now - 7 * 86400)),
      month: change(current, priorClose(points, now - 30 * 86400)),
    },
    historySessions: points.length,
    status: "ok",
  };
}

async function hyperliquidAsset(symbol: string, name: string, sector: string, providerSymbol: string) {
  const now = Date.now();
  const response = await fetch("https://api.hyperliquid.xyz/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "candleSnapshot", req: { coin: providerSymbol, interval: "1d", startTime: now - 370 * 86400000, endTime: now } }),
  });
  if (!response.ok) throw new Error(`Hyperliquid returned ${response.status}`);
  const candles = await response.json();
  const points: Array<[number, number]> = candles.map((item: Record<string, string>) => [Number(item.t) / 1000, Number(item.c)]);
  if (!points.length) throw new Error(`No ${providerSymbol} history returned`);
  const current = points.at(-1)![1];
  const highs = candles.map((item: Record<string, string>) => Number(item.h));
  const lows = candles.map((item: Record<string, string>) => Number(item.l));
  const nowSeconds = Math.floor(now / 1000);
  return {
    symbol, name, sector, price: current, currency: "USD",
    dayHigh: highs.at(-1), dayLow: lows.at(-1), yearHigh: Math.max(...highs), yearLow: Math.min(...lows),
    weekSeries: points.slice(-7).map(([, close]) => close),
    returns: {
      day: change(current, points.at(-2)?.[1] ?? null),
      week: change(current, priorClose(points, nowSeconds - 7 * 86400)),
      month: change(current, priorClose(points, nowSeconds - 30 * 86400)),
    },
    historySessions: points.length,
    status: "ok",
  };
}

async function refreshSnapshot(previous: Record<string, unknown> | null) {
  const previousAssets = new Map(((previous?.assets as Array<Record<string, unknown>>) ?? []).map((item) => [item.symbol, item]));
  const nextAssets = await Promise.all(assets.map(async ([symbol, name, sector, provider]) => {
    try {
      if (symbol === "HYPE") return await hyperliquidAsset(symbol, name, sector, provider);
      return await yahooAsset(symbol, name, sector, provider);
    } catch (error) {
      const fallback = previousAssets.get(symbol);
      if (fallback) return fallback;
      return {
        symbol, name, sector, price: null, currency: "USD", dayHigh: null, dayLow: null,
        yearHigh: null, yearLow: null, weekSeries: [], returns: { day: null, week: null, month: null },
        historySessions: 0, status: "unavailable",
      };
    }
  }));
  const weeklyReturn = (item: { returns?: unknown }) => {
    const value = (item.returns as { week?: unknown } | undefined)?.week;
    return typeof value === "number" ? value : null;
  };
  const leaders = [...nextAssets]
    .filter((item) => weeklyReturn(item) !== null)
    .sort((a, b) => (weeklyReturn(b) ?? 0) - (weeklyReturn(a) ?? 0))
    .slice(0, 3);
  return {
    generatedAt: new Date().toISOString(),
    marketLabel: "Private member snapshot",
    sources: ["Yahoo Finance chart data", "Hyperliquid public API"],
    sectors,
    assets: nextAssets,
    leaders,
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin") ?? "";
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://innergclaw.github.io",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Vary": "Origin",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userError } = await authClient.auth.getUser(token);
  if (userError || !user) {
    return Response.json({ error: "Member sign in required." }, { status: 401, headers: corsHeaders });
  }

  const service = createClient(url, serviceKey);
  const { data: membership, error: membershipError } = await service
    .from("watchlist_memberships")
    .select("status,access_source")
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: innergMembership, error: innergError } = await service
    .from("innerg_memberships")
    .select("status,access_source,access_expires_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const innergActive = innergMembership?.status === "active" && (innergMembership.access_source === "grandfathered" || !innergMembership.access_expires_at || Date.parse(innergMembership.access_expires_at) > Date.now());
  const watchlistActive = membership?.status === "active" && membership.access_source !== "innerg_membership";
  if ((membershipError && membershipError.code !== "PGRST116") || (innergError && innergError.code !== "PGRST116") || (!watchlistActive && !innergActive)) {
    return Response.json({ error: "Paid watchlist membership required." }, { status: 402, headers: corsHeaders });
  }
  const { data: cached } = await service.from("member_watchlist_snapshots").select("payload, generated_at").eq("id", 1).maybeSingle();
  const generatedAt = cached?.generated_at ? new Date(cached.generated_at).getTime() : 0;
  let payload = cached?.payload ?? null;
  const hasChartData = Array.isArray(payload?.leaders) && payload.leaders.every((item: Record<string, unknown>) => Array.isArray(item.weekSeries));
  if (!payload || !hasChartData || Date.now() - generatedAt > 20 * 60 * 1000) {
    payload = await refreshSnapshot(payload);
    const { error } = await service.from("member_watchlist_snapshots").upsert({
      id: 1,
      generated_at: payload.generatedAt,
      payload,
    });
    if (error && !cached?.payload) {
      return Response.json({ error: "Member snapshot is temporarily unavailable." }, { status: 503, headers: corsHeaders });
    }
  }
  return Response.json(payload, { headers: { ...corsHeaders, "Cache-Control": "private, no-store" } });
});
