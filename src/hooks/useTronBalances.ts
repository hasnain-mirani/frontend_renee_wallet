// src/hooks/useTronBalances.ts
import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@/wallet/store";

/** NEW: normalize API base so `${API}/api/...` is always correct */
const RAW_API = (import.meta.env.VITE_API_BASE || "/api").trim().replace(/\/+$/, "");
const API = RAW_API.replace(/\/api$/i, ""); // strip trailing /api; we append /api below

type TrxResp = { ok?: boolean; balanceSun: number; balanceTRX: number };
type Trc20Meta = { name: string; symbol: string; decimals: number };
type Trc20BalResp = { ok?: boolean; meta: Trc20Meta; balance: { raw: string; decimals: number; balance: number } };

const USDT_TRC20 = "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj";

export function useTronBalances(pollMs = 15_000) {
  const { tron } = useWallet();
  const address = tron?.address ?? "";

  const [loading, setLoading] = useState(false);
  const [trx, setTrx] = useState<{ trx: number } | null>(null);
  const [usdt, setUsdt] = useState<{ usdt: number; meta: Trc20Meta } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enabled = useMemo(() => !!address, [address]);

  async function fetchOnce() {
    if (!enabled) return;
    try {
      setLoading(true);
      setError(null);

      // TRX
      const r1 = await fetch(`${API}/api/tron/account/${address}`);
      const j1: TrxResp | any = await r1.json();
      if (!r1.ok || j1?.ok === false) throw new Error(j1?.error || "TRX fetch failed");
      const trxBal = (j1?.balanceTRX ?? j1?.balanceTRX === 0) ? j1.balanceTRX : j1?.balanceSun / 1_000_000;

      // USDT (TRC20)
      const r2 = await fetch(`${API}/api/trc20/balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: USDT_TRC20, holder: address }),
      });
      const j2: Trc20BalResp | any = await r2.json();
      if (!r2.ok || j2?.ok === false) throw new Error(j2?.error || "USDT fetch failed");

      setTrx({ trx: Number(trxBal || 0) });
      setUsdt({ usdt: Number(j2?.balance?.balance ?? 0), meta: j2?.meta || { name: "Tether USD", symbol: "USDT", decimals: 6 } });
    } catch (e: any) {
      setError(e?.message || "Failed to load balances");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOnce(); // initial
    if (!enabled) return;
    const id = setInterval(fetchOnce, pollMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, address, pollMs]);

  return {
    address,
    loading,
    error,
    trx: trx?.trx ?? 0,
    usdt: usdt?.usdt ?? 0,
    usdtMeta: usdt?.meta ?? { name: "Tether USD", symbol: "USDT", decimals: 6 },
    refetch: fetchOnce,
  };
}
