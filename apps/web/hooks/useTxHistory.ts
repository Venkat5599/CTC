"use client";

/**
 * Persistent verification-tx history per wallet.
 *
 * Every submitBatch this wallet has sent through this browser is recorded here
 * against the connected address. On load the list is reconciled with chain
 * state so an old "pending" entry does not persist forever if the transaction
 * eventually confirmed or dropped.
 *
 * Storage is localStorage keyed by wallet. We never persist for a wallet that
 * is not connected, and we never share state between wallets that share the
 * same browser -- switching accounts loads that account's own history.
 */

import { useCallback, useEffect, useState } from "react";
import type { Hex } from "viem";

import { creditcoinClient } from "@/lib/viem";

const KEY_PREFIX = "vouch:tx-history:";
const MAX_ENTRIES = 50;

export type TxStatus = "pending" | "success" | "reverted" | "dropped";

export interface TxRecord {
  hash: Hex;
  submittedAt: number;
  subject: string;
  factType: string;
  status: TxStatus;
  gasUsed?: string;
  blockNumber?: string;
}

function storageKey(wallet?: string): string | null {
  if (!wallet) return null;
  return KEY_PREFIX + wallet.toLowerCase();
}

function load(wallet?: string): TxRecord[] {
  const key = storageKey(wallet);
  if (!key || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as TxRecord[];
  } catch {
    return [];
  }
}

function save(wallet: string, records: TxRecord[]): void {
  const key = storageKey(wallet);
  if (!key || typeof window === "undefined") return;
  const trimmed = records.slice(0, MAX_ENTRIES);
  window.localStorage.setItem(key, JSON.stringify(trimmed));
}

export function useTxHistory(wallet?: string) {
  const [records, setRecords] = useState<TxRecord[]>([]);

  // Load on mount / wallet change.
  useEffect(() => {
    setRecords(load(wallet));
  }, [wallet]);

  // Reconcile pending entries against the chain, once per load. Never blindly
  // trust a persisted "pending" — a receipt may have landed between sessions.
  useEffect(() => {
    if (!wallet) return;
    const pending = records.filter((r) => r.status === "pending");
    if (pending.length === 0) return;

    let cancelled = false;
    void (async () => {
      const updates = await Promise.all(
        pending.map(async (r) => {
          try {
            const receipt = await creditcoinClient.getTransactionReceipt({
              hash: r.hash,
            });
            return {
              hash: r.hash,
              status: (receipt.status === "success"
                ? "success"
                : "reverted") as TxStatus,
              gasUsed: receipt.gasUsed.toString(),
              blockNumber: receipt.blockNumber.toString(),
            };
          } catch {
            // Receipt not found — leave the record pending. It may still land.
            return null;
          }
        }),
      );

      if (cancelled) return;
      const next = records.map((r) => {
        const update = updates.find((u) => u && u.hash === r.hash);
        return update
          ? {
              ...r,
              status: update.status,
              gasUsed: update.gasUsed,
              blockNumber: update.blockNumber,
            }
          : r;
      });
      if (JSON.stringify(next) !== JSON.stringify(records)) {
        setRecords(next);
        save(wallet, next);
      }
    })();

    return () => {
      cancelled = true;
    };
    // records intentionally excluded — we only reconcile once per wallet load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  const append = useCallback(
    (record: Omit<TxRecord, "submittedAt" | "status"> & { status?: TxStatus }) => {
      if (!wallet) return;
      const entry: TxRecord = {
        ...record,
        status: record.status ?? "pending",
        submittedAt: Date.now(),
      };
      setRecords((prev) => {
        const next = [entry, ...prev.filter((r) => r.hash !== entry.hash)];
        save(wallet, next);
        return next;
      });
    },
    [wallet],
  );

  const update = useCallback(
    (hash: Hex, patch: Partial<TxRecord>) => {
      if (!wallet) return;
      setRecords((prev) => {
        const next = prev.map((r) => (r.hash === hash ? { ...r, ...patch } : r));
        save(wallet, next);
        return next;
      });
    },
    [wallet],
  );

  const clear = useCallback(() => {
    if (!wallet) return;
    setRecords([]);
    save(wallet, []);
  }, [wallet]);

  return { records, append, update, clear };
}
