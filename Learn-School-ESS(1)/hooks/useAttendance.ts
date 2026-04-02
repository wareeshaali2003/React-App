import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../services/api";

// ── Type defined locally ─────────────────────────────────────────────────────
export type AttendanceRecord = {
  id: string;
  date: string;
  inTime: string;
  outTime: string;
  status: string; // ERPNext: "Present" | "Absent" | "Late" | "Half Day" | "On Leave"
};

type RegularizeResult = { success: true } | { success: false; error: string };

function makeMonthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export const useAttendance = (selectedYear?: number, selectedMonth?: number) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [apiStats, setApiStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    totalDays: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const year = selectedYear ?? now.getFullYear();
  const month = selectedMonth ?? now.getMonth() + 1;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAttendanceList(year, month);

      if (res.ok) {
        // ERPNext /api/method response (after unwrap via handleResponse):
        // body.message = { attendance_list: [...], attendance_details: { present, absent, late, days_in_month } }
        // unwrap() returns body.message, so res.data = { attendance_list, attendance_details }
        const rawData = res.data as any;

        // 🔍 TEMPORARY DEBUG — check browser console
        console.group("🔍 Attendance API Debug");
        console.log("Type of res.data:", typeof rawData);
        console.log("Is array?", Array.isArray(rawData));
        console.log("Keys:", rawData && typeof rawData === "object" ? Object.keys(rawData) : "N/A");
        console.log("attendance_list:", rawData?.attendance_list);
        console.log("data key:", rawData?.data);
        console.log("Full response (first 500 chars):", JSON.stringify(rawData)?.slice(0, 500));
        console.groupEnd();

        // ── Extract records — try all possible shapes ────────────────────────
        const rawList: any[] =
          Array.isArray(rawData?.attendance_list)
            ? rawData.attendance_list          // { attendance_list: [...] }
            : Array.isArray(rawData?.data)
            ? rawData.data                     // { data: [...] }
            : Array.isArray(rawData)
            ? rawData                          // [...]
            : [];
        

        const mapped: AttendanceRecord[] = rawList.map((item: any, idx: number) => ({
          id: item.name || `rec-${idx}`,
          date: item.attendance_date || "",
          inTime: item.in_time
            ? (item.in_time.includes(" ")
                ? item.in_time.split(" ")[1]?.slice(0, 5)
                : item.in_time.slice(0, 5)) ?? "--:--"
            : "--:--",
          outTime: item.out_time
            ? (item.out_time.includes(" ")
                ? item.out_time.split(" ")[1]?.slice(0, 5)
                : item.out_time.slice(0, 5)) ?? "--:--"
            : "--:--",
          status: item.status || "Other",
        }));

        setRecords(mapped);

        // ── Extract stats ────────────────────────────────────────────────────
        const details = rawData?.attendance_details;
        if (details) {
          setApiStats({
            present: Number(details.present) || 0,
            absent: Number(details.absent) || 0,
            late: Number(details.late) || 0,
            totalDays: Number(details.days_in_month) || 0,
          });
        } else {
          // Fallback: compute stats from records if attendance_details missing
          const p = mapped.filter(r => r.status === "Present").length;
          const a = mapped.filter(r => r.status === "Absent").length;
          const l = mapped.filter(r => r.status === "Late").length;
          setApiStats({ present: p, absent: a, late: l, totalDays: p + a + l });
        }
      } else {
        // ERPNext returns 500 with "no attendance found" when month has no records
        // Treat this as empty data, not a real error
        const isEmptyMonth = res.error?.toLowerCase().includes("no attendance found") ||
                             res.error?.toLowerCase().includes("no attendance") ||
                             res.status === 500;
        setRecords([]);
        if (!isEmptyMonth) {
          setError(res.error || "Failed to load attendance");
        }
        // Reset stats to 0 for empty months
        setApiStats({ present: 0, absent: 0, late: 0, totalDays: 0 });
      }
    } catch (e: any) {
      setRecords([]);
      setError(e?.message || "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  const regularize = useCallback(
    async (data: any): Promise<RegularizeResult> => {
      try {
        const res = await api.createLog(data);
        if (!res.ok) return { success: false, error: res.error || "Request failed" };
        await fetchData();
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e?.message || "Request failed" };
      }
    },
    [fetchData]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = useMemo(
    () => ({
      present: apiStats.present,
      absent: apiStats.absent,
      late: apiStats.late,
      totalDays: apiStats.totalDays,
      percentage: apiStats.totalDays
        ? Math.round((apiStats.present / apiStats.totalDays) * 100)
        : 0,
      monthLabel: makeMonthLabel(year, month),
    }),
    [apiStats, year, month]
  );

  return { records, loading, error, stats, regularize, refetch: fetchData };
};