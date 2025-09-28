// src/components/wallet/WalletModalContext.tsx
import React, { createContext, useCallback, useMemo, useState } from "react";

/** NEW: normalize backend base so `${BACKEND}/api/...` is always correct */
const RAW_BACKEND = (import.meta.env.VITE_BACKEND_BASE || "/api").trim().replace(/\/+$/, "");
const BACKEND = RAW_BACKEND.replace(/\/api$/i, ""); // strip trailing /api; we append /api below

export type Chain = "evm" | "solana" | "tron";
export type ProviderId = "metamask" | "alchemy" | "trongrid";
export type Mode = "wallet" | "rpc";

export type WalletModalContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;

  isConnecting: boolean;
  mode?: Mode;
  chain?: Chain;
  provider?: ProviderId;
  address?: string | null;

  connect: () => Promise<void>;
  connectSolanaRpc: () => Promise<void>;
  connectTronRpc: () => Promise<void>;
  disconnect: () => void;
};

export const WalletModalCtx = createContext<WalletModalContextValue | null>(null);

export function WalletModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [isConnecting, setConnecting] = useState(false);
  const [mode, setMode] = useState<Mode>();
  const [chain, setChain] = useState<Chain>();
  const [provider, setProvider] = useState<ProviderId>();
  const [address, setAddress] = useState<string | null>(null);

  const open = () => setOpen(true);
  const close = () => setOpen(false);

  const disconnect = () => {
    setAddress(null);
    setMode(undefined);
    setChain(undefined);
    setProvider(undefined);
  };

  // ---- MetaMask
  const connect = useCallback(async () => {
    const eth = (window as any).ethereum;
    if (!eth) throw new Error("MetaMask not detected");
    setConnecting(true);
    try {
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      setAddress(accounts?.[0] ?? null);
      setMode("wallet");
      setChain("evm");
      setProvider("metamask");
    } finally {
      setConnecting(false);
    }
  }, []);

  // ---- Solana via backend proxy
  const connectSolanaRpc = useCallback(async () => {
    setConnecting(true);
    try {
      const r = await fetch(`${BACKEND}/api/rpc/solana`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: "ping", method: "getSlot" }),
      });
      if (!r.ok) throw new Error(`Solana RPC ${r.status}`);
      setMode("rpc");
      setChain("solana");
      setProvider("alchemy");
      setAddress(null);
    } finally {
      setConnecting(false);
    }
  }, []);

  // ---- TRON via backend proxy
  const connectTronRpc = useCallback(async () => {
    setConnecting(true);
    try {
      const r = await fetch(`${BACKEND}/api/rpc/tron/wallet/getnowblock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!r.ok) throw new Error(`TRON RPC ${r.status}`);
      setMode("rpc");
      setChain("tron");
      setProvider("trongrid");
      setAddress(null);
    } finally {
      setConnecting(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      isOpen, open, close,
      isConnecting, mode, chain, provider, address,
      connect,
      connectSolanaRpc, connectTronRpc,
      disconnect,
    }),
    [isOpen, isConnecting, mode, chain, provider, address, connect, connectSolanaRpc, connectTronRpc]
  );

  return <WalletModalCtx.Provider value={value}>{children}</WalletModalCtx.Provider>;
}
