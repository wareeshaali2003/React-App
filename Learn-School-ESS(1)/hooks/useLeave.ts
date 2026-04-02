import { useState, useEffect, useCallback } from "react";
import type { LeaveApplication, LeaveBalance } from "../types";
import { api } from "../services/api";

type ActionResult =
  | { success: true }
  | { success: false; error: string };

function asArray<T>(val: any): T[] {
  return Array.isArray(val) ? (val as T[]) : [];
}

export const useLeave = () => {
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
  setLoading(true);
  setError(null);

  try {
    const [historyRes, summaryRes] = await Promise.all([
      api.getLeaveHistory(),
      api.getLeaveSummary(),
    ]);

    // ✅ Leave history - data.taken se nikalo
    if (historyRes.ok) {
      const rawData = historyRes.data as any;
      const taken = Array.isArray(rawData?.taken) ? rawData.taken : 
                    Array.isArray(rawData) ? rawData : [];
      
      const mapped = taken.map((item: any) => ({
        id: item.name || "",
        type: item.leave_type || "Leave",
        startDate: item.from_date || "",
        endDate: item.to_date || "",
        status: item.status || "Pending",
        reason: item.description || item.reason || "",
      }));
      setLeaves(mapped as LeaveApplication[]);
    } else {
      setLeaves([]);
      setError(historyRes.error || "Failed to load leave history");
    }

    // ✅ Leave balances - get_leave_type se
    if (summaryRes.ok) {
      const raw = Array.isArray(summaryRes.data) ? summaryRes.data : [];
      const mapped = raw.map((item: any) => ({
        type: item.name || "Leave",
        total: item.total || item.balance || 0,
        used: item.used || 0,
        available: item.balance ?? item.available ?? 0,
      }));
      setBalances(mapped as LeaveBalance[]);
    } else {
      setBalances([]);
      setError((prev) => prev || summaryRes.error || "Failed to load leave balances");
    }

  } catch (e: any) {
    setLeaves([]);
    setBalances([]);
    setError(e?.message || "Failed to load leave data");
  } finally {
    setLoading(false);
  }
}, []);
  const applyLeave = useCallback(
    async (application: any): Promise<ActionResult> => {
      try {
        const res = await api.makeLeave(application);

        if (!res.ok) {
          return { success: false, error: res.error || "Failed to apply leave" };
        }

        await fetchData();
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e?.message || "Failed to apply leave" };
      }
    },
    [fetchData]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    leaves,
    balances,
    loading,
    error, // ✅ use this to show error in LeavePage if needed
    applyLeave,
    refetch: fetchData,
  };
};
