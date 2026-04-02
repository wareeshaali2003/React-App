import { useState, useEffect, useCallback, useMemo } from "react";
import type { Employee } from "../types";
import { api } from "../services/api";

type ActionResult =
  | { success: true }
  | { success: false; error: string };

function safeString(v: any, fallback = "N/A") {
  if (v === undefined || v === null) return fallback;
  const s = String(v).trim();
  return s.length ? s : fallback;
}

function getInitials(name: string) {
  const clean = (name || "").trim();
  if (!clean) return "U";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const useEmployee = () => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployee = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.getProfile();

      if (result.ok) {
        setEmployee(result.data ?? null);
      } else {
        setEmployee(null);
        setError(result.error || "Failed to load profile");
      }
    } catch (e: any) {
      setEmployee(null);
      setError(e?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAvatar = useCallback(
    async (file: File): Promise<ActionResult> => {
      try {
        const formData = new FormData();
        // Some endpoints expect "file" only, some expect "file" + "is_private"
        formData.append("file", file);

        const result = await api.updateProfilePicture(formData);

        if (!result.ok) {
          return { success: false, error: result.error || "Failed to update avatar" };
        }

        await fetchEmployee();
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e?.message || "Failed to update avatar" };
      }
    },
    [fetchEmployee]
  );

  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string): Promise<ActionResult> => {
      try {
        const result = await api.changePassword({
          old_password: oldPassword,
          new_password: newPassword,
        });

        if (!result.ok) {
          return { success: false, error: result.error || "Failed to change password" };
        }

        return { success: true };
      } catch (e: any) {
        return { success: false, error: e?.message || "Failed to change password" };
      }
    },
    []
  );

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  // ---- Derived helpers for UI ----
  const displayName = useMemo(() => {
    // Nesscale profile usually contains something like employee_name/full_name
    const e: any = employee;
    return (
      e?.employee_name ||
      e?.full_name ||
      e?.first_name ||
      e?.name || // fallback (could be LA-00001)
      "User"
    );
  }, [employee]);

  const initials = useMemo(() => getInitials(displayName), [displayName]);

  const imageUrl = useMemo(() => {
    const e: any = employee;
    // common keys: user_image, image, avatar, employee_image
    return e?.user_image || e?.image || e?.avatar || e?.employee_image || "";
  }, [employee]);

  const getVal = useCallback(
    (field: keyof Employee | string, fallback = "N/A") => {
      const val = (employee as any)?.[field];
      return safeString(val, fallback);
    },
    [employee]
  );

  return {
    employee,
    loading,
    error, // ✅ expose error to show "profile failed" in UI if needed

    // actions
    updateAvatar,
    changePassword,
    refetch: fetchEmployee,

    // helpers
    getVal,
    displayName,
    initials,
    imageUrl,
  };
};
