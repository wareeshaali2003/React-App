import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock, CalendarCheck, FileText, Contact2, CheckSquare,
  CalendarDays, BookOpen, TrendingUp, TrendingDown,
  ArrowUpRight, Users, BarChart3, Activity,
  AlertCircle, RefreshCw, ChevronDown,
} from "lucide-react";
import { api } from "../services/api";
import { useEmployee } from "../hooks/useEmployee";
import { sidebarConfig, getIcon, isNavItemVisible } from "../config/layout.config";

// ── Types ─────────────────────────────────────────────────────────────────────
type DashData = {
  attendance_score?: number;
  leave_balance?: number;
  pending_leaves?: number;
  latest_net_pay?: number;
  employee_name?: string;
  designation?: string;
  company?: string;
};

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 80; const h = 28;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} />
      <circle cx={pts.split(" ").pop()!.split(",")[0]} cy={pts.split(" ").pop()!.split(",")[1]} r="3" fill={color} />
    </svg>
  );
}

// ── Mini bar chart ─────────────────────────────────────────────────────────────
function MiniBarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const hasAnyData = data.some(d => d.value > 0);
  return (
    <div className="space-y-1">
      <div className="flex items-end gap-1.5 h-14">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-0.5">
            {d.value > 0 && (
              <span className="text-[9px] font-black leading-none" style={{ color }}>{d.value}</span>
            )}
            <div
              className="w-full rounded-t-md transition-all duration-700"
              style={{
                height: hasAnyData
                  ? `${Math.max((d.value / max) * 44, d.value > 0 ? 8 : 3)}px`
                  : "3px",
                backgroundColor: d.value > 0 ? color : "#e5e7eb",
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-[9px] text-gray-400 font-bold">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Donut chart ────────────────────────────────────────────────────────────────
function DonutChart({ value, max, color, size = 80 }: { value: number; max: number; color: string; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dasharray 0.8s ease" }} />
    </svg>
  );
}

// ── Module Card ────────────────────────────────────────────────────────────────
function ModuleCard({ icon: Icon, label, desc, color, onClick }: {
  icon: any; label: string; desc: string; color: string; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 p-5 text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group shadow-sm">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
        style={{ backgroundColor: `${color}15` }}>
        <Icon size={22} style={{ color }} />
      </div>
      <p className="text-sm font-black text-gray-800 mb-1">{label}</p>
      <p className="text-[11px] text-gray-400 font-medium leading-relaxed line-clamp-2">{desc}</p>
      <div className="mt-3 flex items-center gap-1 text-[11px] font-bold" style={{ color }}>
        Open Module <ArrowUpRight size={12} />
      </div>
    </button>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, trend, sparkline }: {
  label: string; value: string | number; sub?: string;
  icon: any; color: string; trend?: number; sparkline?: number[];
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-[11px] font-black px-2 py-1 rounded-lg ${
            trend >= 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
          }`}>
            {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-black text-gray-800 mb-0.5">{value ?? "—"}</p>
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
      {sparkline && <div className="mt-3"><Sparkline values={sparkline} color={color} /></div>}
    </div>
  );
}

// ── Module meta ───────────────────────────────────────────────────────────────
const MODULE_COLORS: Record<string, string> = {
  "/attendance":  "#3B82F6",
  "/leave":       "#10B981",
  "/salary-slip": "#F59E0B",
  "/directory":   "#8B5CF6",
  "/todo":        "#EC4899",
  "/calendar":    "#06B6D4",
  "/faculty":     "#84CC16",
  "/profile":     "#16a34a",
};

const MODULE_DESC: Record<string, string> = {
  "/attendance":  "View your monthly attendance log, check-in/out times, and score.",
  "/leave":       "Apply for leave, track applications, and check remaining balances.",
  "/salary-slip": "Download payslips, review net/gross pay, and request letters.",
  "/directory":   "Search colleagues by name, find contact details and department.",
  "/todo":        "Manage your personal task list and track progress.",
  "/calendar":    "View and manage your schedule and upcoming events.",
  "/faculty":     "Manage classes, attendance, and assessment results.",
  "/profile":     "Update personal information, view employment details.",
};

// ── Main Page ──────────────────────────────────────────────────────────────────
export const EssDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { employee } = useEmployee();

  const [dash, setDash] = useState<DashData | null>(null);
  const [todos, setTodos] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modulesOpen, setModulesOpen] = useState(false);

  const now = new Date();

  // ── Designation from useEmployee ──
  const designation: string = (employee as any)?.designation || "";
  const isTeacher = designation.toLowerCase() === "teacher";

  const loadAll = async () => {
    setError(null);
    try {
      const [dashRes, todosRes, attRes, leaveRes] = await Promise.allSettled([
        api.getDashboard(),
        api.getTodos(),
        api.getAttendance(now.getFullYear(), now.getMonth() + 1),
        api.getLeaveSummary(),
      ]);
      if (dashRes.status === "fulfilled" && dashRes.value.ok) setDash(dashRes.value.data as DashData);
      if (todosRes.status === "fulfilled" && todosRes.value.ok) setTodos((todosRes.value.data as any[]) ?? []);
      if (attRes.status === "fulfilled" && attRes.value.ok) setAttendance((attRes.value.data as any[]) ?? []);
      if (leaveRes.status === "fulfilled" && leaveRes.value.ok) setLeaves((leaveRes.value.data as any[]) ?? []);
    } catch { setError("Failed to load dashboard data"); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { loadAll(); }, []);

  // ── Helpers ──
  const isPresent = (a: any) =>
    (a.status || a.attendance_status || "").toLowerCase().includes("present");

  // ── Stats ──
  const attStats = useMemo(() => {
    const present = attendance.filter(isPresent).length;
    const total   = attendance.length;
    const pct     = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, total, pct };
  }, [attendance]);

  const attSparkline = useMemo(() =>
    [60, 72, 68, 80, 75, attStats.pct], [attStats.pct]);

  const leaveStats = useMemo(() => ({
    total: leaves.reduce((sum, l) => sum + Number(l.available ?? l.remaining_leaves ?? 0), 0),
    leaves,
  }), [leaves]);

  const todoStats = useMemo(() => ({
    total:  todos.length,
    open:   todos.filter(t => t.status === "Open").length,
    closed: todos.filter(t => t.status === "Closed").length,
    high:   todos.filter(t => t.priority === "High" && t.status === "Open").length,
  }), [todos]);

  const monthBars = useMemo(() => {
    // Count total records (not just present) per week — show all days worked
    const weeks: Record<string, { present: number; total: number }> = {};

    attendance.forEach(a => {
      // Try multiple date field names ERPNext might use
      const dateStr = a.date || a.attendance_date || a.posting_date || "";
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;

      const wk = `W${Math.ceil(d.getDate() / 7)}`;
      if (!weeks[wk]) weeks[wk] = { present: 0, total: 0 };
      weeks[wk].total += 1;
      if (isPresent(a)) weeks[wk].present += 1;
    });

    const entries = Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b));

    if (entries.length > 0) {
      return entries.map(([label, v]) => ({ label, value: v.present }));
    }

    // Fallback: show 4 empty weeks but with 0 not random
    return [1, 2, 3, 4].map((_, i) => ({ label: `W${i + 1}`, value: 0 }));
  }, [attendance]);

  // ── Modules — filter by designation ──
  // Only show Teacher Dashboard if user is a Teacher
  const moduleItems = useMemo(() =>
    sidebarConfig.filter(item =>
      item.to !== "/" &&
      item.to !== "/ess" &&
      isNavItemVisible(item, designation)
    ),
  [designation]);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = dash?.employee_name?.split(" ")[0] ??
    (employee as any)?.employee_name?.split(" ")[0] ?? "there";

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gray-100 rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-gray-100 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 to-green-800 p-6 text-white shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-green-200 text-xs font-semibold uppercase tracking-widest mb-1">Employee Self Service</p>
            <h1 className="text-2xl font-black mb-1">{greeting}, {firstName}! 👋</h1>
            <p className="text-green-200 text-sm font-medium">
              {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
            {dash?.designation && (
              <p className="mt-1 text-green-100 text-xs font-bold uppercase tracking-widest">
                {dash.designation} · {dash.company || "Learn Academy"}
              </p>
            )}
          </div>
          <div className="hidden sm:flex flex-col items-end gap-2">
            <button type="button" onClick={() => { setRefreshing(true); loadAll(); }}
              className={`flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-all border border-white/20 ${refreshing ? "opacity-60" : ""}`}>
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-red-200 bg-red-500/20 px-3 py-1.5 rounded-lg">
                <AlertCircle size={12} /> {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Attendance" value={`${attStats.pct}%`}
          sub={`${attStats.present} present / ${attStats.total} days`}
          icon={Clock} color="#3B82F6" trend={attStats.pct > 75 ? 8 : -5} sparkline={attSparkline} />
        <StatCard label="Leave Balance" value={leaveStats.total}
          sub="Days remaining" icon={CalendarCheck} color="#10B981" trend={2} />
        <StatCard label="Open Tasks" value={todoStats.open}
          sub={`${todoStats.closed} completed`} icon={CheckSquare} color="#F59E0B" />
        <StatCard label="Net Pay"
          value={dash?.latest_net_pay ? `PKR ${Number(dash.latest_net_pay).toLocaleString()}` : "—"}
          sub="Latest salary slip" icon={FileText} color="#8B5CF6" />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Attendance bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-black text-gray-800">Attendance</p>
              <p className="text-[11px] text-gray-400 font-medium">This month by week</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <BarChart3 size={16} className="text-blue-500" />
            </div>
          </div>
          <MiniBarChart data={monthBars} color="#3B82F6" />
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[10px] text-gray-400 font-semibold">Present days</span>
            </div>
            <span className="text-xs font-black text-blue-600">{attStats.present} days</span>
          </div>
        </div>

        {/* Leave donut */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-black text-gray-800">Leave Balance</p>
              <p className="text-[11px] text-gray-400 font-medium">Remaining leaves</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
              <CalendarCheck size={16} className="text-green-500" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <DonutChart value={leaveStats.total} max={Math.max(leaveStats.total + 5, 30)} color="#10B981" size={80} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-black text-gray-800">{leaveStats.total}</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              {leaveStats.leaves.slice(0, 3).map((l: any, i: number) => {
                const name = l.leave_type || l.type || `Leave ${i+1}`;
                const bal  = Number(l.available ?? l.remaining_leaves ?? 0);
                const tot  = Number(l.total ?? l.total_leaves ?? bal + 2);
                return (
                  <div key={i}>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[10px] font-bold text-gray-500 truncate max-w-[80px]">{name}</span>
                      <span className="text-[10px] font-black text-gray-700">{bal}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-green-400 transition-all duration-700"
                        style={{ width: `${tot > 0 ? (bal/tot)*100 : 0}%` }} />
                    </div>
                  </div>
                );
              })}
              {leaveStats.leaves.length === 0 && <p className="text-[11px] text-gray-400">No leave data</p>}
            </div>
          </div>
        </div>

        {/* Todo summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-black text-gray-800">My Tasks</p>
              <p className="text-[11px] text-gray-400 font-medium">Current overview</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center">
              <Activity size={16} className="text-pink-500" />
            </div>
          </div>
          <div className="mb-4">
            <div className="flex justify-between mb-1.5">
              <span className="text-[11px] font-bold text-gray-500">Completion</span>
              <span className="text-[11px] font-black text-gray-700">
                {todoStats.total > 0 ? Math.round((todoStats.closed / todoStats.total) * 100) : 0}%
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-700"
                style={{ width: `${todoStats.total > 0 ? (todoStats.closed / todoStats.total) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Total",   value: todoStats.total,  cls: "bg-gray-50 text-gray-700" },
              { label: "Open",    value: todoStats.open,   cls: "bg-amber-50 text-amber-700" },
              { label: "Done",    value: todoStats.closed, cls: "bg-green-50 text-green-700" },
              { label: "High ⚠", value: todoStats.high,   cls: "bg-red-50 text-red-600" },
            ].map(s => (
              <div key={s.label} className={`${s.cls} rounded-xl p-2.5 text-center`}>
                <p className="text-lg font-black">{s.value}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{s.label}</p>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => navigate("/todo")}
            className="mt-3 w-full py-2 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-600 text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
            View All Tasks <ArrowUpRight size={12} />
          </button>
        </div>
      </div>

      {/* ── Access Your Modules — Accordion ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button type="button" onClick={() => setModulesOpen(v => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-black text-gray-800">Access Your Modules</p>
              <p className="text-[11px] text-gray-400 font-medium">{moduleItems.length} modules available</p>
            </div>
          </div>
          <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${modulesOpen ? "rotate-180" : ""}`} />
        </button>

        {modulesOpen && (
          <div className="px-5 pb-5 border-t border-gray-50">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-4">
              {moduleItems.map(item => {
                const Icon = getIcon(item.iconName);
                const color = MODULE_COLORS[item.to] ?? "#16a34a";
                const desc  = MODULE_DESC[item.to]  ?? "Open this module to get started.";
                return (
                  <ModuleCard
                    key={item.to}
                    icon={Icon}
                    label={item.label}
                    desc={desc}
                    color={color}
                    onClick={() => navigate(item.to)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};