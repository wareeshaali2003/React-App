import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  BookOpen, GraduationCap, Calendar, Users, Clock,
  ChevronRight, ChevronDown, CheckCircle2, XCircle, AlertCircle,
  Search, Filter, RefreshCw, BookMarked, LayoutGrid, List,
  User, MapPin, UserRound, School, ClipboardCheck, Save, RotateCcw, ClipboardList, FileCheck,
} from "lucide-react";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type Program = { name: string; program_name?: string };
type Course  = { name: string; course_name?: string };

type ScheduleEntry = {
  name: string;
  student_group: string;
  instructor: string;
  instructor_name: string;
  program: string;
  course: string;
  color?: string;
  class_schedule_color?: string;
  schedule_date: string;
  room?: string;
  from_time: string;
  to_time: string;
  title?: string;
};

type StudentAttendance = {
  name: string;
  student: string;
  student_name: string;
  course_schedule: string;
  student_group: string;
  date: string;
  status: string;
  link_nvfk?: string;
};

type StudentGroup = {
  name: string;
  student_group_name?: string;
  program?: string;
  course?: string;
  batch?: string;
  activeCount?: number;
  totalCount?: number;
};

type GroupStudent = {
  name?: string;
  student: string;
  student_name: string;
  active?: number;
  group_roll_number?: number;
};

type AssessmentCriteria = {
  name: string;
  assessment_criteria: string;
  maximum_score: number;
};

type AssessmentPlan = {
  name: string;
  student_group?: string;
  program?: string;
  course?: string;
  academic_year?: string;
  academic_term?: string;
  assessment_group?: string;
  grading_scale?: string;
  maximum_assessment_score?: number;
  assessment_criteria?: AssessmentCriteria[];
};

type StudentScoreRow = {
  student: string;
  student_name: string;
  group_roll_number?: number;
  scores: Record<string, string>;
  comments: string;
};

// ─────────────────────────────────────────────
// API HELPER
// ─────────────────────────────────────────────
const PROD_HOST = "learnschool.online";
const BASE =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "/api/resource"
    : `https://${PROD_HOST}/api/resource`;

function authHeader(): Record<string, string> {
  const t = localStorage.getItem("erpnext_auth_token");
  return t ? { Authorization: t.startsWith("token ") ? t : `token ${t}` } : {};
}

function csrfHeader(): Record<string, string> {
  const isToken = !!localStorage.getItem("erpnext_auth_token");
  if (isToken) return {};
  // Frappe window object se bhi try karo
  const w = window as any;
  const fromWindow = w?.frappe?.csrf_token || w?.csrf_token;
  if (fromWindow && fromWindow !== "Guest") {
    return { "X-Frappe-CSRF-Token": fromWindow };
  }
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? { "X-Frappe-CSRF-Token": decodeURIComponent(match[1]) } : {};
}

async function erpList<T>(doctype: string, fields: string[], filters?: any[], limit = 200): Promise<T[]> {
  const url = new URL(`${BASE}/${encodeURIComponent(doctype.trim())}`, window.location.origin);
  url.searchParams.set("fields", JSON.stringify(fields));
  url.searchParams.set("limit_page_length", String(limit));
  if (filters) url.searchParams.set("filters", JSON.stringify(filters));
  const res = await fetch(url.toString(), {
    credentials: "include",
    headers: { Accept: "application/json", ...authHeader() },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const json = await res.json();
  return Array.isArray(json.data) ? json.data : [];
}

async function erpGet<T>(doctype: string, docname: string): Promise<T> {
  const url = `${BASE}/${encodeURIComponent(doctype.trim())}/${encodeURIComponent(docname.trim())}`;
  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json", ...authHeader() },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const json = await res.json();
  return json.data as T;
}

// ─────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────
function usePrograms() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try { setPrograms(await erpList<Program>("Program", ["name", "program_name"])); }
    catch (e: any) { setError(e?.message || "Failed"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);
  return { programs, loading, error, refetch: fetchData };
}

function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try { setCourses(await erpList<Course>("Course", ["name", "course_name"])); }
    catch (e: any) { setError(e?.message || "Failed"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);
  return { courses, loading, error, refetch: fetchData };
}

function useSchedule(programFilter?: string) {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const filters = programFilter ? [["Course Schedule", "program", "=", programFilter]] : undefined;
      setSchedule(await erpList<ScheduleEntry>("Course Schedule", [
        "name", "student_group", "instructor", "instructor_name",
        "program", "course", "schedule_date", "room",
        "from_time", "to_time", "title", "color", "class_schedule_color",
      ], filters));
    } catch (e: any) { setError(e?.message || "Failed"); }
    finally { setLoading(false); }
  }, [programFilter]);
  useEffect(() => { fetchData(); }, [fetchData]);
  return { schedule, loading, error, refetch: fetchData };
}

function useStudentAttendance(courseSchedule?: string) {
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchData = useCallback(async () => {
    if (!courseSchedule) return;
    setLoading(true); setError(null);
    try {
      setAttendance(await erpList<StudentAttendance>("Student Attendance",
        ["name", "student", "student_name", "course_schedule", "student_group", "date", "status", "link_nvfk"],
        [["Student Attendance", "course_schedule", "=", courseSchedule]]
      ));
    } catch (e: any) { setError(e?.message || "Failed"); }
    finally { setLoading(false); }
  }, [courseSchedule]);
  useEffect(() => { fetchData(); }, [fetchData]);
  return { attendance, loading, error, refetch: fetchData };
}

function useStudentGroups(programFilter?: string) {
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const filters = programFilter
        ? [["Student Group", "program", "=", programFilter]]
        : undefined;
      const list = await erpList<StudentGroup>("Student Group",
        ["name", "student_group_name", "program", "course", "batch"], filters);
      const withCounts = await Promise.all(
        list.map(async (g) => {
          try {
            const doc = await erpGet<any>("Student Group", g.name);
            const studs: any[] = Array.isArray(doc.students) ? doc.students : [];
            return { ...g, totalCount: studs.length, activeCount: studs.filter((s) => s.active === 1).length };
          } catch {
            return { ...g, totalCount: 0, activeCount: 0 };
          }
        })
      );
      setGroups(withCounts);
    } catch (e: any) {
      setError(e?.message || "Failed to load student groups");
    } finally {
      setLoading(false);
    }
  }, [programFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { groups, loading, error, refetch: fetchData };
}

function useGroupStudents(groupName?: string) {
  const [students, setStudents] = useState<GroupStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchData = useCallback(async () => {
    if (!groupName) { setStudents([]); return; }
    setLoading(true); setError(null);
    try {
      const doc = await erpGet<any>("Student Group", groupName);
      const raw: any[] = Array.isArray(doc.students) ? doc.students : [];
      setStudents(raw.map((s) => ({
        name: s.name,
        student: s.student || s.student_id || "",
        student_name: s.student_name || s.name || "",
        active: s.active,
        group_roll_number: s.group_roll_number,
      })));
    } catch (e: any) { setError(e?.message || "Failed to load students"); }
    finally { setLoading(false); }
  }, [groupName]);
  useEffect(() => { fetchData(); }, [fetchData]);
  return { students, loading, error, refetch: fetchData };
}

function useAssessmentPlans() {
  const [plans, setPlans] = useState<AssessmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    erpList<AssessmentPlan>("Assessment Plan", ["name", "student_group", "program", "course"], undefined, 500)
      .then(async (list) => {
        const needsDetail = list.some((p) => !p.student_group);
        if (!needsDetail) { setPlans(list); return; }
        const withDetails = await Promise.all(
          list.map(async (p) => {
            try {
              const doc = await erpGet<AssessmentPlan>("Assessment Plan", p.name);
              return { ...p, student_group: doc.student_group, program: doc.program, course: doc.course };
            } catch { return p; }
          })
        );
        setPlans(withDetails);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  return { plans, loading, error };
}

function useAssessmentPlan(planName: string | null) {
  const [plan, setPlan] = useState<AssessmentPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!planName) { setPlan(null); return; }
    setLoading(true);
    erpGet<AssessmentPlan>("Assessment Plan", planName)
      .then(setPlan)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [planName]);
  return { plan, loading, error };
}

// ─────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────
function formatTime(t?: string) {
  if (!t) return "--";
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return t;
  let h = parseInt(m[1]);
  const min = m[2];
  const ampm = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${ampm}`;
}

function formatDate(d?: string) {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function getWeekday(dateStr?: string) {
  if (!dateStr) return "Other";
  const d = new Date(dateStr + "T00:00:00");
  return isNaN(d.getTime()) ? "Other" : d.toLocaleDateString("en-US", { weekday: "long" });
}

function scheduleColorClass(color?: string) {
  const c = (color || "").toLowerCase();
  if (c === "blue")   return { border: "border-blue-200",   bg: "bg-blue-50/60",   badge: "bg-blue-100 text-blue-700" };
  if (c === "green")  return { border: "border-green-200",  bg: "bg-green-50/60",  badge: "bg-green-100 text-green-700" };
  if (c === "red")    return { border: "border-red-200",    bg: "bg-red-50/60",    badge: "bg-red-100 text-red-700" };
  if (c === "yellow") return { border: "border-yellow-200", bg: "bg-yellow-50/60", badge: "bg-yellow-100 text-yellow-700" };
  if (c === "purple") return { border: "border-purple-200", bg: "bg-purple-50/60", badge: "bg-purple-100 text-purple-700" };
  return { border: "border-gray-200", bg: "bg-gray-50/40", badge: "bg-gray-100 text-gray-600" };
}

function avatarColor(name: string) {
  const colors = ["bg-green-500","bg-blue-500","bg-purple-500","bg-amber-500","bg-pink-500","bg-cyan-500","bg-red-500","bg-indigo-500"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function gradeFromPct(pct: number): string {
  if (pct >= 93) return "A+";
  if (pct >= 86) return "A";
  if (pct >= 80) return "B+";
  if (pct >= 73) return "B";
  if (pct >= 65) return "C+";
  if (pct >= 58) return "C";
  if (pct >= 50) return "D+";
  if (pct >= 40) return "D";
  return "F";
}

function gradeBadgeColor(grade: string): string {
  if (grade === "A+" || grade === "A")  return "bg-green-100 text-green-700 border-green-200";
  if (grade === "B+" || grade === "B")  return "bg-blue-100 text-blue-700 border-blue-200";
  if (grade === "C+" || grade === "C")  return "bg-amber-100 text-amber-700 border-amber-200";
  if (grade === "D+" || grade === "D")  return "bg-orange-100 text-orange-700 border-orange-200";
  return "bg-red-100 text-red-700 border-red-200";
}

// ─────────────────────────────────────────────
// SHARED UI
// ─────────────────────────────────────────────
function StatusBadge({ status }: { status?: string }) {
  const s = (status || "").toLowerCase();
  if (s === "present") return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-green-100 text-green-700"><CheckCircle2 size={10} /> Present</span>;
  if (s === "absent")  return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-700"><XCircle size={10} /> Absent</span>;
  if (s === "late")    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-700"><AlertCircle size={10} /> Late</span>;
  return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-500">{status || "—"}</span>;
}

function SectionHeader({ icon, title, subtitle, action }: {
  icon: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">{icon}</div>
        <div>
          <h3 className="font-bold text-gray-800 text-base">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-xl" />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// TAB 1: PROGRAMS & COURSES
// ─────────────────────────────────────────────
const CARD_COLORS = ["#16a34a","#15803d","#059669","#0d9488","#10b981","#22c55e","#4ade80","#34d399"];

function ProgramsTab() {
  const { programs, loading: pLoading, error: pError, refetch } = usePrograms();
  const { courses, loading: cLoading, error: cError } = useCourses();
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const displayCourses = useMemo(() => {
    if (!selectedProgram) return courses;
    const slug = selectedProgram.replace(/\s+/g, "-");
    return courses.filter((c) => c.name.includes(slug) || (c.course_name || "").includes(slug));
  }, [courses, selectedProgram]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <SectionHeader icon={<GraduationCap size={20} />} title="Programs"
          subtitle={`${programs.length} program${programs.length !== 1 ? "s" : ""}`}
          action={<button type="button" onClick={refetch} className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"><RefreshCw size={15} /></button>}
        />
        {pLoading ? <Skeleton rows={1} /> : pError ? (
          <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">⚠ {pError}</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setSelectedProgram(null)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${!selectedProgram ? "border-green-500 bg-green-50 text-green-700 shadow-sm" : "border-gray-100 bg-gray-50 text-gray-500 hover:border-green-200"}`}>
              All
            </button>
            {programs.map((p) => (
              <button key={p.name} type="button" onClick={() => setSelectedProgram(selectedProgram === p.name ? null : p.name)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${selectedProgram === p.name ? "border-green-500 bg-green-50 text-green-700 shadow-sm" : "border-gray-100 bg-gray-50 text-gray-600 hover:border-green-200 hover:bg-green-50/40"}`}>
                <GraduationCap size={14} />
                {p.program_name || p.name}
                {selectedProgram === p.name && <ChevronDown size={13} />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <SectionHeader icon={<BookOpen size={20} />}
          title={selectedProgram ? `Courses — ${selectedProgram}` : "All Courses"}
          subtitle={`${displayCourses.length} course${displayCourses.length !== 1 ? "s" : ""}`}
          action={
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {(["grid","list"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setViewMode(m)}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === m ? "bg-white shadow-sm text-green-600" : "text-gray-400"}`}>
                  {m === "grid" ? <LayoutGrid size={14} /> : <List size={14} />}
                </button>
              ))}
            </div>
          }
        />
        {cLoading ? <Skeleton rows={2} /> : cError ? (
          <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">⚠ {cError}</p>
        ) : displayCourses.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No courses found.</p>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayCourses.map((c, i) => (
              <div key={c.name} className="p-4 rounded-xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white hover:border-green-200 hover:shadow-sm transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: CARD_COLORS[i % CARD_COLORS.length] }}>
                    {(c.course_name || c.name).slice(0, 2).toUpperCase()}
                  </div>
                  <ChevronRight size={14} className="text-gray-200 group-hover:text-green-400 transition-colors" />
                </div>
                <p className="font-semibold text-gray-800 text-sm">{c.course_name || c.name}</p>
                <p className="text-[11px] text-gray-400 mt-1 font-mono">{c.name}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {displayCourses.map((c) => (
              <div key={c.name} className="flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <BookMarked size={15} className="text-green-500 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{c.course_name || c.name}</p>
                    <p className="text-[11px] text-gray-400 font-mono">{c.name}</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-gray-300" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TAB 2: COURSE SCHEDULE
// ─────────────────────────────────────────────
function ScheduleTab() {
  const { programs } = usePrograms();
  const [programFilter, setProgramFilter] = useState<string>("");
  const { schedule, loading, error, refetch } = useSchedule(programFilter || undefined);
  const today = new Date().toISOString().slice(0, 10);

  const byDate = useMemo(() => {
    const map: Record<string, ScheduleEntry[]> = {};
    schedule.forEach((s) => { const key = s.schedule_date || "Unknown"; if (!map[key]) map[key] = []; map[key].push(s); });
    return Object.entries(map).sort(([a],[b]) => a.localeCompare(b)).map(([date, entries]) => ({
      date, weekday: getWeekday(date), isToday: date === today,
      entries: [...entries].sort((a,b) => a.from_time.localeCompare(b.from_time)),
    }));
  }, [schedule, today]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-1">Program:</span>
        <button type="button" onClick={() => setProgramFilter("")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${!programFilter ? "border-green-400 bg-green-50 text-green-700" : "border-gray-200 text-gray-500 hover:border-green-200"}`}>All</button>
        {programs.map((p) => (
          <button key={p.name} type="button" onClick={() => setProgramFilter(p.name)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${programFilter === p.name ? "border-green-400 bg-green-50 text-green-700" : "border-gray-200 text-gray-500 hover:border-green-200"}`}>
            {p.program_name || p.name}
          </button>
        ))}
        <button type="button" onClick={refetch} className="ml-auto p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"><RefreshCw size={15} /></button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <SectionHeader icon={<Calendar size={20} />} title="Course Schedule"
          subtitle={`${schedule.length} session${schedule.length !== 1 ? "s" : ""}${programFilter ? ` · ${programFilter}` : ""}`} />
        {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl mb-4">⚠ {error}</p>}
        {loading ? <Skeleton rows={4} /> : byDate.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No schedule entries found.</p>
        ) : (
          <div className="space-y-8">
            {byDate.map(({ date, weekday, isToday, entries }) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${isToday ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600"}`}>
                    <span className="text-[9px] font-bold uppercase">{weekday.slice(0,3)}</span>
                    <span className="text-lg font-bold leading-tight">{new Date(date+"T00:00:00").getDate()}</span>
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${isToday ? "text-green-600" : "text-gray-700"}`}>{isToday ? "Today" : weekday}</p>
                    <p className="text-[11px] text-gray-400">{formatDate(date)}</p>
                  </div>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-[11px] text-gray-400 font-semibold">{entries.length} session{entries.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {entries.map((entry) => {
                    const cls = scheduleColorClass(entry.class_schedule_color);
                    return (
                      <div key={entry.name} className={`p-4 rounded-xl border ${cls.border} ${cls.bg} hover:shadow-sm transition-all`}>
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-bold text-gray-800 text-sm leading-snug">{entry.course}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${cls.badge}`}>{entry.student_group}</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 font-semibold"><Clock size={11} /> {formatTime(entry.from_time)} — {formatTime(entry.to_time)}</div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500"><User size={11} /> {entry.instructor_name || entry.instructor}</div>
                          {entry.room && <div className="flex items-center gap-1.5 text-xs text-gray-400"><MapPin size={11} /> {entry.room}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TAB 3: STUDENT ATTENDANCE
// ─────────────────────────────────────────────
function AttendanceTab() {
  const { schedule, loading: schLoading } = useSchedule();
  const [selectedSchedule, setSelectedSchedule] = useState<string>("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { attendance, loading, error } = useStudentAttendance(selectedSchedule || undefined);

  const filtered = useMemo(() => attendance.filter((a) => {
    const matchSearch = !search || a.student_name.toLowerCase().includes(search.toLowerCase()) || a.student.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status.toLowerCase() === statusFilter;
    return matchSearch && matchStatus;
  }), [attendance, search, statusFilter]);

  const stats = useMemo(() => {
    const total   = attendance.length;
    const present = attendance.filter((a) => a.status?.toLowerCase() === "present").length;
    const absent  = attendance.filter((a) => a.status?.toLowerCase() === "absent").length;
    return { total, present, absent, pct: total ? Math.round((present/total)*100) : 0 };
  }, [attendance]);

  const selectedEntry = useMemo(() => schedule.find((s) => s.name === selectedSchedule), [schedule, selectedSchedule]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <SectionHeader icon={<Users size={20} />} title="Student Attendance" subtitle="Select a course schedule" />
        {schLoading ? <Skeleton rows={1} /> : (
          <select value={selectedSchedule} onChange={(e) => setSelectedSchedule(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100">
            <option value="">— Select a course schedule —</option>
            {schedule.map((s) => <option key={s.name} value={s.name}>{s.title || s.name}  ·  {formatDate(s.schedule_date)}  ·  {formatTime(s.from_time)}</option>)}
          </select>
        )}
        {selectedEntry && (
          <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-xl flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-green-700 font-bold"><BookOpen size={13} /> {selectedEntry.course}</span>
            <span className="flex items-center gap-1.5 text-green-600"><User size={13} /> {selectedEntry.instructor_name}</span>
            <span className="flex items-center gap-1.5 text-green-600"><Clock size={13} /> {formatTime(selectedEntry.from_time)} – {formatTime(selectedEntry.to_time)}</span>
            <span className="flex items-center gap-1.5 text-green-600"><Users size={13} /> {selectedEntry.student_group}</span>
            {selectedEntry.room && <span className="flex items-center gap-1.5 text-green-600"><MapPin size={13} /> {selectedEntry.room}</span>}
          </div>
        )}
      </div>

      {selectedSchedule && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label:"Total",   value:stats.total,   bar:"bg-gray-400",  card:"bg-gray-50 text-gray-700" },
              { label:"Present", value:stats.present, bar:"bg-green-500", card:"bg-green-50 text-green-700" },
              { label:"Absent",  value:stats.absent,  bar:"bg-red-500",   card:"bg-red-50 text-red-700" },
            ].map((s) => (
              <div key={s.label} className={`${s.card} rounded-xl p-4 flex items-center gap-3`}>
                <div className={`w-1.5 h-10 rounded-full ${s.bar} flex-shrink-0`} />
                <div><p className="text-2xl font-bold">{s.value}</p><p className="text-[11px] font-bold uppercase tracking-wide opacity-60">{s.label}</p></div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-8 pt-7 pb-2 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Average Attendance</p>
                <div className="flex items-end gap-3">
                  <span className="text-5xl font-black leading-none" style={{ color: stats.pct >= 75 ? "#16a34a" : stats.pct >= 50 ? "#d97706" : "#dc2626" }}>{stats.pct}%</span>
                  <span className="text-sm font-semibold mb-1.5" style={{ color: stats.pct >= 75 ? "#16a34a" : stats.pct >= 50 ? "#d97706" : "#dc2626" }}>
                    {stats.pct >= 75 ? "Good" : stats.pct >= 50 ? "Average" : "Low"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{stats.present} present out of {stats.total} students</p>
              </div>
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                  <circle cx="40" cy="40" r="32" fill="none"
                    stroke={stats.pct >= 75 ? "#22c55e" : stats.pct >= 50 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(stats.pct / 100) * 201} 201`}
                    style={{ transition: "stroke-dasharray 1s ease" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-black text-gray-700">{stats.pct}%</span>
                </div>
              </div>
            </div>
            <div className="px-8 pb-6 pt-4">
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                {stats.total > 0 ? (
                  <>
                    <div className="bg-green-500 transition-all duration-700 rounded-l-full" style={{ width: `${(stats.present / stats.total) * 100}%` }} />
                    <div className="bg-red-400 transition-all duration-700 rounded-r-full" style={{ width: `${(stats.absent / stats.total) * 100}%` }} />
                  </>
                ) : <div className="bg-gray-100 w-full rounded-full" />}
              </div>
              <div className="flex items-center gap-4 mt-3">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />Present {stats.present}</span>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />Absent {stats.absent}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search student…" value={search} onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 w-48" />
            </div>
            <div className="relative">
              <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-8 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-green-400 appearance-none">
                <option value="all">All Status</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
              </select>
            </div>
            {(search || statusFilter !== "all") && (
              <button type="button" onClick={() => { setSearch(""); setStatusFilter("all"); }}
                className="text-xs text-red-500 border border-red-200 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors font-semibold">Clear</button>
            )}
            <span className="text-xs text-gray-400 ml-auto">{filtered.length} of {attendance.length} records</span>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {error && <p className="text-sm text-red-500 bg-red-50 px-6 py-3">⚠ {error}</p>}
            {loading ? <div className="p-8"><Skeleton rows={5} /></div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-widest font-bold">
                    <tr>
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Group</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">No records found.</td></tr>
                    ) : filtered.map((a) => (
                      <tr key={a.name} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full ${avatarColor(a.student_name)} text-white flex items-center justify-center text-[11px] font-bold uppercase flex-shrink-0`}>
                              {a.student_name.slice(0,2)}
                            </div>
                            <span className="font-semibold text-gray-800 text-sm">{a.student_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400 font-mono">{a.student}</td>
                        <td className="px-6 py-4"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg font-semibold">{a.student_group}</span></td>
                        <td className="px-6 py-4 text-sm text-gray-500">{formatDate(a.date)}</td>
                        <td className="px-6 py-4"><StatusBadge status={a.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// TAB 4: STUDENTS
// ─────────────────────────────────────────────
function StudentsTab() {
  const { programs } = usePrograms();
  const [programFilter, setProgramFilter] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [search, setSearch] = useState("");

  const { groups, loading: gLoading, error: gError, refetch } = useStudentGroups(programFilter || undefined);
  const { students, loading: sLoading, error: sError } = useGroupStudents(selectedGroup || undefined);

  const handleProgramChange = (p: string) => { setProgramFilter(p); setSelectedGroup(""); };

  const filteredStudents = useMemo(() =>
    students.filter((s) =>
      !search || s.student_name.toLowerCase().includes(search.toLowerCase()) || s.student.toLowerCase().includes(search.toLowerCase())
    ), [students, search]);

  const activeCount = students.filter((s) => s.active !== 0).length;
  const totalActiveAll  = useMemo(() => groups.reduce((sum, g) => sum + (g.activeCount ?? 0), 0), [groups]);
  const totalStudentsAll = useMemo(() => groups.reduce((sum, g) => sum + (g.totalCount ?? 0), 0), [groups]);

  return (
    <div className="space-y-6">
      {!gLoading && groups.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Active Students", value: totalActiveAll,   icon: <Users size={20} className="text-green-600" />,   bg: "bg-green-50",   border: "border-green-100" },
            { label: "Total Enrolled",  value: totalStudentsAll, icon: <UserRound size={20} className="text-green-600" />, bg: "bg-green-50", border: "border-green-100" },
            { label: `Groups${programFilter ? ` · ${programFilter}` : ""}`, value: groups.length, icon: <School size={20} className="text-green-600" />, bg: "bg-green-50", border: "border-green-100" },
          ].map((s) => (
            <div key={s.label} className={`bg-white rounded-2xl border ${s.border} shadow-sm p-5 flex items-center gap-4`}>
              <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>{s.icon}</div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <SectionHeader icon={<School size={20} />} title="Student Groups"
          subtitle="Select a program and group to view students"
          action={<button type="button" onClick={refetch} className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"><RefreshCw size={15} /></button>}
        />
        <div className="flex flex-wrap gap-2 mb-5">
          <button type="button" onClick={() => handleProgramChange("")}
            className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${!programFilter ? "border-green-500 bg-green-50 text-green-700" : "border-gray-100 bg-gray-50 text-gray-500 hover:border-green-200"}`}>
            All Programs
          </button>
          {programs.map((p) => (
            <button key={p.name} type="button" onClick={() => handleProgramChange(p.name)}
              className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${programFilter === p.name ? "border-green-500 bg-green-50 text-green-700" : "border-gray-100 bg-gray-50 text-gray-600 hover:border-green-200"}`}>
              {p.program_name || p.name}
            </button>
          ))}
        </div>

        {gLoading ? <Skeleton rows={1} /> : gError ? (
          <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">⚠ {gError}</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No student groups found.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {groups.map((g) => {
              const isSelected = selectedGroup === g.name;
              return (
                <button key={g.name} type="button" onClick={() => setSelectedGroup(isSelected ? "" : g.name)}
                  className={`p-4 rounded-xl border-2 text-left transition-all group ${isSelected ? "border-green-500 bg-green-50 shadow-sm" : "border-gray-100 bg-white hover:border-green-200 hover:shadow-sm"}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isSelected ? "bg-green-500" : "bg-gray-100 group-hover:bg-green-100"} transition-colors`}>
                      <Users size={16} className={isSelected ? "text-white" : "text-gray-500"} />
                    </div>
                    {g.activeCount !== undefined && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isSelected ? "bg-green-200 text-green-800" : "bg-green-50 text-green-600"}`}>
                        {g.activeCount} active
                      </span>
                    )}
                  </div>
                  <p className={`font-bold text-sm ${isSelected ? "text-green-700" : "text-gray-700"}`}>{g.student_group_name || g.name}</p>
                  {g.totalCount !== undefined && <p className="text-[11px] text-gray-400 mt-1">{g.totalCount} total students</p>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedGroup && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600"><UserRound size={20} /></div>
              <div>
                <h3 className="font-bold text-gray-800">{selectedGroup}</h3>
                <p className="text-xs text-gray-400">{sLoading ? "Loading..." : `${activeCount} active · ${students.length} total`}</p>
              </div>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search student…" value={search} onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 w-48" />
            </div>
          </div>
          {sError && <p className="text-sm text-red-500 bg-red-50 px-6 py-3">⚠ {sError}</p>}
          {sLoading ? <div className="p-8"><Skeleton rows={6} /></div> : filteredStudents.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Users size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm font-semibold">No students found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-widest font-bold">
                  <tr>
                    <th className="px-6 py-4">#</th>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredStudents.map((s, i) => (
                    <tr key={s.student} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 text-xs text-gray-400 font-mono">{s.group_roll_number ?? i + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full ${avatarColor(s.student_name)} text-white flex items-center justify-center text-xs font-bold uppercase flex-shrink-0`}>
                            {s.student_name.slice(0, 2)}
                          </div>
                          <span className="font-semibold text-gray-800 text-sm">{s.student_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400 font-mono">{s.student}</td>
                      <td className="px-6 py-4">
                        {s.active === 0
                          ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-500">Inactive</span>
                          : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-green-100 text-green-700"><CheckCircle2 size={10} /> Active</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// TAB 5: MARK ATTENDANCE
// ── FIX: docstatus check + cancel before update ──
// ─────────────────────────────────────────────
async function createAttendance(payload: {
  student: string; student_name: string; course_schedule: string;
  student_group: string; date: string; status: "Present" | "Absent";
}): Promise<{ success: boolean; error?: string }> {
  try {
    // ── Step 1: Check karo existing record hai ya nahi (docstatus bhi fetch karo) ──
    const checkUrl = new URL(`${BASE}/Student%20Attendance`, window.location.origin);
    checkUrl.searchParams.set("fields", JSON.stringify(["name", "status", "docstatus"]));
    checkUrl.searchParams.set("filters", JSON.stringify([
      ["course_schedule", "=", payload.course_schedule],
      ["student", "=", payload.student],
    ]));
    checkUrl.searchParams.set("limit_page_length", "1");

    const checkRes = await fetch(checkUrl.toString(), {
      credentials: "include",
      headers: { Accept: "application/json", ...authHeader() },
    });
    const checkJson = await checkRes.json().catch(() => ({ data: [] }));
    const existing: any[] = Array.isArray(checkJson.data) ? checkJson.data : [];

    if (existing.length > 0) {
      const rec = existing[0];

      // ── Step 2: Agar record submitted (docstatus=1) hai toh pehle cancel karo ──
      if (rec.docstatus === 1) {
        const cancelRes = await fetch(
          `${BASE}/Student%20Attendance/${encodeURIComponent(rec.name)}`,
          {
            method: "PUT",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              ...authHeader(),
              ...csrfHeader(),
            },
            body: JSON.stringify({ docstatus: 2 }), // 2 = Cancelled
          }
        );
        if (!cancelRes.ok) {
          const cancelErr = await cancelRes.json().catch(() => ({}));
          return {
            success: false,
            error: cancelErr?.exception || "Could not cancel existing submitted record",
          };
        }
      }

      // ── Step 3: Ab update karo (docstatus=0 = Draft, status update) ──
      const putRes = await fetch(
        `${BASE}/Student%20Attendance/${encodeURIComponent(rec.name)}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...authHeader(),
            ...csrfHeader(),
          },
          body: JSON.stringify({ status: payload.status, docstatus: 0 }),
        }
      );
      if (!putRes.ok) {
        const err = await putRes.json().catch(() => ({}));
        return {
          success: false,
          error: err?.exception || err?._server_messages || `${putRes.status} ${putRes.statusText}`,
        };
      }
      return { success: true };
    }

    // ── Step 4: Naya record create karo ──
    const res = await fetch(`${BASE}/Student%20Attendance`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...authHeader(),
        ...csrfHeader(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        error: err?.exception || err?._server_messages || `${res.status} ${res.statusText}`,
      };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "Network error" };
  }
}

function MarkAttendanceTab() {
  const { schedule, loading: schLoading } = useSchedule();
  const [selectedSchedule, setSelectedSchedule] = useState<string>("");
  const selectedEntry = useMemo(() => schedule.find((s) => s.name === selectedSchedule), [schedule, selectedSchedule]);
  const { students, loading: stuLoading, error: stuError } = useGroupStudents(selectedEntry?.student_group);
  const [statusMap, setStatusMap] = useState<Record<string, "Present" | "Absent">>({});
  const [saving, setSaving] = useState(false);
  const [saveResults, setSaveResults] = useState<{ success: number; failed: string[] } | null>(null);

  const activeStudents = useMemo(() => students.filter((s) => s.active !== 0), [students]);
  const presentCount = Object.values(statusMap).filter((v) => v === "Present").length;
  const absentCount  = Object.values(statusMap).filter((v) => v === "Absent").length;

  useEffect(() => {
    if (activeStudents.length > 0) {
      const init: Record<string, "Present" | "Absent"> = {};
      activeStudents.forEach((s) => { init[s.student] = "Present"; });
      setStatusMap(init);
    }
  }, [activeStudents]);

  const handleToggle  = (id: string) => setStatusMap((p) => ({ ...p, [id]: p[id] === "Present" ? "Absent" : "Present" }));
  const handleMarkAll = (status: "Present" | "Absent") => {
    const next: Record<string, "Present" | "Absent"> = {};
    activeStudents.forEach((s) => { next[s.student] = status; });
    setStatusMap(next);
  };

  const handleSave = async () => {
    if (!selectedEntry) return;
    setSaving(true); setSaveResults(null);
    const results = await Promise.all(
      activeStudents.map((s) => createAttendance({
        student: s.student, student_name: s.student_name,
        course_schedule: selectedEntry.name, student_group: selectedEntry.student_group,
        date: selectedEntry.schedule_date, status: statusMap[s.student] ?? "Present",
      }))
    );
    const failed = results.map((r, i) => (!r.success ? `${activeStudents[i].student_name}: ${r.error}` : null)).filter(Boolean) as string[];
    setSaveResults({ success: results.filter((r) => r.success).length, failed });
    setSaving(false);
  };

  const handleReset = () => { setSelectedSchedule(""); setStatusMap({}); setSaveResults(null); };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <SectionHeader icon={<ClipboardCheck size={20} />} title="Mark Attendance" subtitle="Select a course schedule to mark attendance" />
        {schLoading ? <Skeleton rows={1} /> : (
          <select value={selectedSchedule} onChange={(e) => { setSelectedSchedule(e.target.value); setSaveResults(null); }}
            className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100">
            <option value="">— Select a course schedule —</option>
            {schedule.map((s) => <option key={s.name} value={s.name}>{s.title || s.name}  ·  {formatDate(s.schedule_date)}  ·  {formatTime(s.from_time)}</option>)}
          </select>
        )}
        {selectedEntry && (
          <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-xl flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-green-700 font-bold"><BookOpen size={13} /> {selectedEntry.course}</span>
            <span className="flex items-center gap-1.5 text-green-600"><Users size={13} /> {selectedEntry.student_group}</span>
            <span className="flex items-center gap-1.5 text-green-600"><Clock size={13} /> {formatTime(selectedEntry.from_time)} – {formatTime(selectedEntry.to_time)}</span>
            <span className="flex items-center gap-1.5 text-green-600"><Calendar size={13} /> {formatDate(selectedEntry.schedule_date)}</span>
          </div>
        )}
      </div>

      {selectedSchedule && (
        <>
          {stuError && <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">⚠ {stuError}</p>}
          {stuLoading ? <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8"><Skeleton rows={6} /></div>
          : activeStudents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center text-gray-400">
              <Users size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm font-semibold">No active students in this group</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-bold"><CheckCircle2 size={11} /> Present {presentCount}</span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-600 text-xs font-bold"><XCircle size={11} /> Absent {absentCount}</span>
                  <span className="text-xs text-gray-400 ml-1">/ {activeStudents.length} total</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => handleMarkAll("Present")} className="px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-700 text-xs font-bold hover:bg-green-100 transition-colors">All Present</button>
                  <button type="button" onClick={() => handleMarkAll("Absent")}  className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors">All Absent</button>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {activeStudents.map((s, i) => {
                  const isPresent = (statusMap[s.student] ?? "Present") === "Present";
                  return (
                    <div key={s.student} className={`flex items-center justify-between px-6 py-4 transition-colors ${isPresent ? "hover:bg-green-50/30" : "hover:bg-red-50/30 bg-red-50/20"}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 font-mono w-6 text-center flex-shrink-0">{s.group_roll_number ?? i + 1}</span>
                        <div className={`w-9 h-9 rounded-full text-white flex items-center justify-center text-xs font-bold uppercase flex-shrink-0 ${isPresent ? avatarColor(s.student_name) : "bg-gray-300"}`}>
                          {s.student_name.slice(0, 2)}
                        </div>
                        <div>
                          <p className={`font-semibold text-sm ${isPresent ? "text-gray-800" : "text-gray-400"}`}>{s.student_name}</p>
                          <p className="text-[11px] text-gray-400 font-mono">{s.student}</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => handleToggle(s.student)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${isPresent ? "border-green-400 bg-green-50 text-green-700 hover:bg-green-100" : "border-red-300 bg-red-50 text-red-600 hover:bg-red-100"}`}>
                        {isPresent ? <><CheckCircle2 size={13} /> Present</> : <><XCircle size={13} /> Absent</>}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {saveResults && (
            <div className={`rounded-2xl px-6 py-4 flex items-start gap-3 ${saveResults.failed.length === 0 ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
              {saveResults.failed.length === 0 ? (
                <><CheckCircle2 size={18} className="text-green-600 flex-shrink-0 mt-0.5" /><div><p className="font-bold text-green-700 text-sm">Attendance saved!</p><p className="text-xs text-green-600 mt-0.5">{saveResults.success} records created in ERPNext.</p></div></>
              ) : (
                <><AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" /><div><p className="font-bold text-amber-700 text-sm">{saveResults.success} saved · {saveResults.failed.length} failed</p><ul className="text-xs text-amber-600 mt-1 space-y-0.5">{saveResults.failed.slice(0,5).map((f,i)=><li key={i}>• {f}</li>)}{saveResults.failed.length>5&&<li>…and {saveResults.failed.length-5} more</li>}</ul></div></>
              )}
            </div>
          )}

          {activeStudents.length > 0 && (
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={handleReset} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-500 text-sm font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all"><RotateCcw size={14} /> Reset</button>
              <button type="button" onClick={handleSave} disabled={saving}
                className={`flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${saving ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-green-500 hover:bg-green-600 text-white shadow-green-100"}`}>
                <Save size={15} />
                {saving ? `Saving… (${activeStudents.length} records)` : `Save Attendance (${activeStudents.length})`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// TAB 6: ASSESSMENT RESULT
// ─────────────────────────────────────────────
async function createAssessmentResult(payload: {
  student: string; student_name: string; assessment_plan: string; student_group: string;
  program?: string; course?: string; academic_year?: string; academic_term?: string;
  assessment_group?: string; grading_scale?: string; maximum_score?: number; grade?: string; comment?: string;
  details: { assessment_criteria: string; score: number; maximum_score: number }[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    const checkUrl = new URL(`${BASE}/Assessment%20Result`, window.location.origin);
    checkUrl.searchParams.set("fields", JSON.stringify(["name", "docstatus"]));
    checkUrl.searchParams.set("filters", JSON.stringify([
      ["assessment_plan", "=", payload.assessment_plan],
      ["student", "=", payload.student],
    ]));
    checkUrl.searchParams.set("limit_page_length", "1");

    const checkRes = await fetch(checkUrl.toString(), {
      credentials: "include",
      headers: { Accept: "application/json", ...authHeader() },
    });
    const checkJson = await checkRes.json().catch(() => ({ data: [] }));
    const existing: any[] = Array.isArray(checkJson.data) ? checkJson.data : [];

    if (existing.length > 0) {
      const docname = encodeURIComponent(existing[0].name);
      const putRes = await fetch(`${BASE}/Assessment%20Result/${docname}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...authHeader(), ...csrfHeader() },
        body: JSON.stringify({
          doctype: "Assessment Result",
          comment: payload.comment,
          maximum_score: payload.maximum_score,
          grade: payload.grade,
          details: payload.details.map((d) => ({
            doctype: "Assessment Result Detail",
            parenttype: "Assessment Result",
            parentfield: "details",
            assessment_criteria: d.assessment_criteria,
            score: d.score,
            maximum_score: d.maximum_score,
          })),
        }),
      });
      if (!putRes.ok) {
        const err = await putRes.json().catch(() => ({}));
        return { success: false, error: err?.exception || err?._server_messages || `${putRes.status} ${putRes.statusText}` };
      }
      return { success: true };
    }

    const res = await fetch(`${BASE}/Assessment%20Result`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...authHeader(), ...csrfHeader() },
      body: JSON.stringify({
        ...payload,
        details: payload.details.map((d) => ({
          doctype: "Assessment Result Detail",
          parenttype: "Assessment Result",
          parentfield: "details",
          assessment_criteria: d.assessment_criteria,
          score: d.score,
          maximum_score: d.maximum_score,
        })),
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err?.exception || err?._server_messages || `${res.status} ${res.statusText}` };
    }

    const newDoc = await res.json().catch(() => ({}));
    const newName = newDoc?.data?.name;
    if (newName) {
      const METHOD_BASE = window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
        ? "/api/method"
        : `https://learnschool.online/api/method`;

      const submitRes = await fetch(
        `${METHOD_BASE}/frappe.client.submit`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...authHeader(),
            ...csrfHeader(),
          },
          body: JSON.stringify({
            doc: {
              doctype: "Assessment Result",
              name: newName,
              docstatus: 1,
            },
          }),
        }
      );
      if (!submitRes.ok) {
        console.warn("Submit failed for", newName);
      }
    }

    return { success: true };
  } catch (e: any) { return { success: false, error: e?.message || "Network error" }; }
}

function AssessmentResultTab() {
  const { groups, loading: groupsLoading } = useStudentGroups();
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const { plans, loading: plansLoading } = useAssessmentPlans();
  const [selectedPlanName, setSelectedPlanName] = useState<string>("");
  const filteredPlans = useMemo(
    () => selectedGroup ? plans.filter((p) => p.student_group === selectedGroup) : [],
    [plans, selectedGroup]
  );
  const { plan, loading: planLoading } = useAssessmentPlan(selectedPlanName || null);
  const { students, loading: stuLoading } = useGroupStudents(selectedGroup || undefined);
  const activeStudents = useMemo(() => students.filter((s) => s.active !== 0), [students]);
  const [scoreMap,   setScoreMap]   = useState<Record<string, Record<string, string>>>({});
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveResults, setSaveResults] = useState<{ success: number; failed: string[] } | null>(null);

  useEffect(() => { setSelectedPlanName(""); setScoreMap({}); setCommentMap({}); setSaveResults(null); }, [selectedGroup]);
  useEffect(() => { setScoreMap({}); setCommentMap({}); setSaveResults(null); }, [selectedPlanName]);

  const criteria: AssessmentCriteria[] = plan?.assessment_criteria || [];
  const maxTotal = criteria.reduce((sum, c) => sum + (c.maximum_score || 0), 0);

  const handleScoreChange = (studentId: string, criteriaName: string, value: string) =>
    setScoreMap((prev) => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [criteriaName]: value } }));
  const handleCommentChange = (studentId: string, value: string) =>
    setCommentMap((prev) => ({ ...prev, [studentId]: value }));
  const getTotal = (studentId: string) =>
    criteria.reduce((sum, c) => sum + (parseFloat(scoreMap[studentId]?.[c.assessment_criteria] || "0") || 0), 0);

  const handleSave = async () => {
    if (!plan || activeStudents.length === 0) return;
    setSaving(true); setSaveResults(null);
    const results = await Promise.all(
      activeStudents.map((s) => {
        const row = scoreMap[s.student] || {};
        const totalScore = criteria.reduce((sum, c) => sum + (parseFloat(row[c.assessment_criteria] || "0") || 0), 0);
        const maxScore = plan.maximum_assessment_score ?? criteria.reduce((sum, c) => sum + (c.maximum_score || 0), 0);
        const pct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
        const grade = gradeFromPct(pct);
        return createAssessmentResult({
          student: s.student, student_name: s.student_name,
          assessment_plan: plan.name, student_group: selectedGroup,
          program: plan.program, course: plan.course,
          academic_year: plan.academic_year, academic_term: plan.academic_term,
          assessment_group: plan.assessment_group, grading_scale: plan.grading_scale,
          maximum_score: maxScore,
          grade,
          comment: commentMap[s.student] || "",
          details: criteria.map((c) => ({
            assessment_criteria: c.assessment_criteria,
            score: parseFloat(row[c.assessment_criteria] || "0") || 0,
            maximum_score: c.maximum_score,
          })),
        });
      })
    );
    const failed = results.map((r, i) => (!r.success ? `${activeStudents[i].student_name}: ${r.error}` : null)).filter(Boolean) as string[];
    setSaveResults({ success: results.filter((r) => r.success).length, failed });
    setSaving(false);
  };

  const handleReset = () => { setSelectedGroup(""); setSelectedPlanName(""); setScoreMap({}); setCommentMap({}); setSaveResults(null); };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <SectionHeader icon={<ClipboardList size={20} />} title="Assessment Result"
          subtitle="Select a student group, then choose the assessment plan" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Step 1 — Student Group</label>
            {groupsLoading ? <Skeleton rows={1} /> : (
              <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100">
                <option value="">— Select a Student Group —</option>
                {groups.map((g) => (
                  <option key={g.name} value={g.name}>{g.student_group_name || g.name}{g.activeCount !== undefined ? ` (${g.activeCount} active)` : ""}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Step 2 — Assessment Plan</label>
            {plansLoading ? <Skeleton rows={1} /> : (
              <select value={selectedPlanName} onChange={(e) => setSelectedPlanName(e.target.value)} disabled={!selectedGroup}
                className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 disabled:opacity-50 disabled:cursor-not-allowed">
                <option value="">{!selectedGroup ? "— Select a group first —" : filteredPlans.length === 0 ? "— No plans for this group —" : "— Select an Assessment Plan —"}</option>
                {filteredPlans.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            )}
          </div>
        </div>
        {plan && (
          <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-xl flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-green-700 font-bold"><FileCheck size={13} /> {plan.name}</span>
            <span className="flex items-center gap-1.5 text-green-600"><Users size={13} /> {selectedGroup}</span>
            {plan.course && <span className="flex items-center gap-1.5 text-green-600"><BookOpen size={13} /> {plan.course}</span>}
            <span className="flex items-center gap-1.5 text-green-600 font-semibold">{criteria.length} criteria · Max: {maxTotal} marks</span>
          </div>
        )}
      </div>

      {selectedPlanName && planLoading && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8"><Skeleton rows={4} /></div>}

      {plan && !planLoading && (
        <>
          {stuLoading ? <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8"><Skeleton rows={6} /></div>
          : activeStudents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center text-gray-400">
              <Users size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm font-semibold">No active students in {selectedGroup}</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex flex-wrap gap-2">
                {criteria.map((c) => (
                  <span key={c.assessment_criteria} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold border border-green-100">
                    {c.assessment_criteria}<span className="ml-1 text-green-400">/{c.maximum_score}</span>
                  </span>
                ))}
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold ml-auto">Total /{maxTotal}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-widest font-bold">
                    <tr>
                      <th className="px-4 py-3 w-8">#</th>
                      <th className="px-4 py-3 min-w-[160px]">Student</th>
                      {criteria.map((c) => (
                        <th key={c.assessment_criteria} className="px-3 py-3 text-center min-w-[100px]">
                          <div>{c.assessment_criteria}</div>
                          <div className="text-[9px] text-gray-300 font-normal">max {c.maximum_score}</div>
                        </th>
                      ))}
                      <th className="px-3 py-3 text-center min-w-[80px]">Total</th>
                      <th className="px-3 py-3 min-w-[140px]">Comments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {activeStudents.map((s, i) => {
                      const total = getTotal(s.student);
                      const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
                      const totalColor = pct >= 75 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-500";
                      return (
                        <tr key={s.student} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 text-xs text-gray-400 font-mono">{s.group_roll_number ?? i + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold uppercase flex-shrink-0 ${avatarColor(s.student_name)}`}>
                                {s.student_name.slice(0, 2)}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800 text-xs leading-tight">{s.student_name}</p>
                                <p className="text-[10px] text-gray-400 font-mono">{s.student}</p>
                              </div>
                            </div>
                          </td>
                          {criteria.map((c) => {
                            const val = scoreMap[s.student]?.[c.assessment_criteria] ?? "";
                            const over = !isNaN(parseFloat(val)) && parseFloat(val) > c.maximum_score;
                            return (
                              <td key={c.assessment_criteria} className="px-3 py-3 text-center">
                                <input type="number" min={0} max={c.maximum_score} step="0.5" value={val}
                                  onChange={(e) => handleScoreChange(s.student, c.assessment_criteria, e.target.value)}
                                  placeholder="—"
                                  className={`w-16 text-center px-2 py-1.5 rounded-lg border text-sm font-semibold focus:outline-none focus:ring-2 transition-colors ${over ? "border-red-300 bg-red-50 text-red-600 focus:ring-red-100" : "border-gray-200 bg-gray-50 text-gray-800 focus:border-green-400 focus:ring-green-100"}`}
                                />
                                {over && <p className="text-[9px] text-red-500 mt-0.5">Max {c.maximum_score}</p>}
                              </td>
                            );
                          })}
                          <td className="px-3 py-3 text-center">
                            <span className={`font-bold text-sm ${totalColor}`}>{total}</span>
                            <span className="text-[10px] text-gray-400">/{maxTotal}</span>
                            {maxTotal > 0 && (
                              <div className="mt-1">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${gradeBadgeColor(gradeFromPct(pct))}`}>
                                  {gradeFromPct(pct)}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <input type="text" value={commentMap[s.student] ?? ""} onChange={(e) => handleCommentChange(s.student, e.target.value)}
                              placeholder="Optional…"
                              className="w-full px-2 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-700 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {saveResults && (
            <div className={`rounded-2xl px-6 py-4 flex items-start gap-3 ${saveResults.failed.length === 0 ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
              {saveResults.failed.length === 0 ? (
                <><CheckCircle2 size={18} className="text-green-600 flex-shrink-0 mt-0.5" /><div><p className="font-bold text-green-700 text-sm">Assessment results saved!</p><p className="text-xs text-green-600 mt-0.5">{saveResults.success} records saved & submitted in ERPNext.</p></div></>
              ) : (
                <><AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" /><div><p className="font-bold text-amber-700 text-sm">{saveResults.success} saved · {saveResults.failed.length} failed</p><ul className="text-xs text-amber-600 mt-1 space-y-0.5">{saveResults.failed.slice(0,5).map((f,idx)=><li key={idx}>• {f}</li>)}{saveResults.failed.length>5&&<li>…and {saveResults.failed.length-5} more</li>}</ul></div></>
              )}
            </div>
          )}

          {activeStudents.length > 0 && (
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={handleReset} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-500 text-sm font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all"><RotateCcw size={14} /> Reset</button>
              <button type="button" onClick={handleSave} disabled={saving}
                className={`flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${saving ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-green-500 hover:bg-green-600 text-white shadow-green-100"}`}>
                <Save size={15} />
                {saving ? `Saving… (${activeStudents.length})` : `Save Results (${activeStudents.length} students)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// TAB 7: VIEW RESULTS
// ─────────────────────────────────────────────
type AssessmentResultRecord = {
  name: string;
  student: string;
  student_name: string;
  assessment_plan: string;
  student_group: string;
  program?: string;
  course?: string;
  total_score?: number;
  maximum_score?: number;
  grade?: string;
  comment?: string;
};

function useAssessmentResults(planName?: string, groupName?: string) {
  const [results, setResults] = useState<AssessmentResultRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!planName && !groupName) { setResults([]); return; }
    setLoading(true); setError(null);
    try {
      const filters: any[] = [];
      if (planName)  filters.push(["assessment_plan", "=", planName]);
      if (groupName) filters.push(["student_group", "=", groupName]);
      const list = await erpList<AssessmentResultRecord>(
        "Assessment Result",
        ["name", "student", "student_name", "assessment_plan", "student_group", "program", "course", "total_score", "maximum_score", "grade", "comment"],
        filters, 500
      );
      setResults(list);
    } catch (e: any) { setError(e?.message || "Failed to load results"); }
    finally { setLoading(false); }
  }, [planName, groupName]);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { results, loading, error, refetch: fetchData };
}

function ViewResultsTab() {
  const { groups, loading: groupsLoading } = useStudentGroups();
  const { plans, loading: plansLoading } = useAssessmentPlans();
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedPlan,  setSelectedPlan]  = useState<string>("");
  const [search, setSearch] = useState("");

  const filteredPlans = useMemo(
    () => selectedGroup ? plans.filter((p) => p.student_group === selectedGroup) : plans,
    [plans, selectedGroup]
  );

  const { results, loading, error, refetch } = useAssessmentResults(
    selectedPlan || undefined,
    selectedGroup || undefined
  );

  const filtered = useMemo(() =>
    results.filter((r) =>
      !search ||
      r.student_name.toLowerCase().includes(search.toLowerCase()) ||
      r.student.toLowerCase().includes(search.toLowerCase())
    ), [results, search]);

  const avgScore = useMemo(() => {
    const valid = results.filter((r) => r.maximum_score && r.maximum_score > 0);
    if (!valid.length) return null;
    const sum = valid.reduce((s, r) => s + ((r.total_score ?? 0) / (r.maximum_score ?? 1)) * 100, 0);
    return Math.round(sum / valid.length);
  }, [results]);

  const topScore = useMemo(() => {
    if (!results.length) return null;
    return results.reduce((best, r) => (r.total_score ?? 0) > (best.total_score ?? 0) ? r : best, results[0]);
  }, [results]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <SectionHeader icon={<FileCheck size={20} />} title="View Assessment Results"
          subtitle="Filter by student group and assessment plan"
          action={<button type="button" onClick={refetch} className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"><RefreshCw size={15} /></button>}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Student Group</label>
            {groupsLoading ? <Skeleton rows={1} /> : (
              <select value={selectedGroup} onChange={(e) => { setSelectedGroup(e.target.value); setSelectedPlan(""); }}
                className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100">
                <option value="">— All Groups —</option>
                {groups.map((g) => <option key={g.name} value={g.name}>{g.student_group_name || g.name}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Assessment Plan</label>
            {plansLoading ? <Skeleton rows={1} /> : (
              <select value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100">
                <option value="">— All Plans —</option>
                {filteredPlans.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Records", value: results.length, color: "text-gray-800", bg: "bg-gray-50", border: "border-gray-100" },
            { label: "Class Average", value: avgScore !== null ? `${avgScore}%` : "—", color: avgScore !== null ? (avgScore >= 75 ? "text-green-600" : avgScore >= 50 ? "text-amber-600" : "text-red-500") : "text-gray-400", bg: "bg-green-50", border: "border-green-100" },
            { label: "Top Score", value: topScore ? `${topScore.total_score ?? 0}/${topScore.maximum_score ?? 0}` : "—", color: "text-green-700", bg: "bg-green-50", border: "border-green-100" },
            { label: "Top Student", value: topScore?.student_name || "—", color: "text-gray-700", bg: "bg-green-50", border: "border-green-100" },
          ].map((s) => (
            <div key={s.label} className={`bg-white rounded-2xl border ${s.border} shadow-sm p-4`}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
              <p className={`text-xl font-black truncate ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {(selectedGroup || selectedPlan) && (
        <>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search student…" value={search} onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 w-52" />
            </div>
            {search && (
              <button type="button" onClick={() => setSearch("")}
                className="text-xs text-red-500 border border-red-200 px-3 py-2 rounded-xl hover:bg-red-50 font-semibold">Clear</button>
            )}
            <span className="text-xs text-gray-400 ml-auto">{filtered.length} of {results.length} records</span>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {error && <p className="text-sm text-red-500 bg-red-50 px-6 py-3">⚠ {error}</p>}
            {loading ? <div className="p-8"><Skeleton rows={6} /></div> : filtered.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <FileCheck size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm font-semibold">No results found</p>
                <p className="text-xs mt-1">Select a group or plan above to load data</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-widest font-bold">
                    <tr>
                      <th className="px-6 py-4">#</th>
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">Group</th>
                      <th className="px-6 py-4">Assessment Plan</th>
                      <th className="px-6 py-4 text-center">Score</th>
                      <th className="px-6 py-4 text-center">%</th>
                      <th className="px-6 py-4 text-center">Grade</th>
                      <th className="px-6 py-4">Comment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((r, i) => {
                      const pct = r.maximum_score && r.maximum_score > 0
                        ? Math.round(((r.total_score ?? 0) / r.maximum_score) * 100) : null;
                      const pctColor = pct === null ? "text-gray-400" : pct >= 75 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-500";
                      return (
                        <tr key={r.name} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-6 py-4 text-xs text-gray-400 font-mono">{i + 1}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full ${avatarColor(r.student_name)} text-white flex items-center justify-center text-[11px] font-bold uppercase flex-shrink-0`}>
                                {r.student_name.slice(0, 2)}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800 text-sm">{r.student_name}</p>
                                <p className="text-[11px] text-gray-400 font-mono">{r.student}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg font-semibold">{r.student_group}</span>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500 font-medium max-w-[160px] truncate">{r.assessment_plan}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-bold text-gray-800">{r.total_score ?? "—"}</span>
                            {r.maximum_score ? <span className="text-[11px] text-gray-400">/{r.maximum_score}</span> : null}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`font-bold text-sm ${pctColor}`}>{pct !== null ? `${pct}%` : "—"}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {r.grade
                              ? <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${gradeBadgeColor(r.grade)}`}>{r.grade}</span>
                              : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-400 max-w-[160px] truncate">{r.comment || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {!selectedGroup && !selectedPlan && !loading && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center text-gray-400">
          <FileCheck size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-bold">Select a group or plan to view results</p>
          <p className="text-xs mt-1 text-gray-300">All saved assessment records will appear here</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
type Tab = "home" | "programs" | "schedule" | "attendance" | "students" | "mark" | "assessment" | "viewresults";

const MODULE_CARDS: {
  id: Tab; label: string; description: string;
  icon: React.ReactNode; iconBg: string; gradient: string; accent: string;
}[] = [
  { id: "programs", label: "Programs & Courses", description: "View and manage academic programs and assigned courses", icon: <GraduationCap size={28} />, iconBg: "bg-green-500", gradient: "from-green-50 to-green-50", accent: "border-green-100" },
  { id: "schedule", label: "Course Schedule", description: "View teaching timetable and upcoming sessions", icon: <Calendar size={28} />, iconBg: "bg-green-500", gradient: "from-green-50 to-green-50", accent: "border-green-100" },
  { id: "students", label: "Student Groups", description: "View student classes, sections and enrolled students", icon: <Users size={28} />, iconBg: "bg-green-500", gradient: "from-green-50 to-green-50", accent: "border-green-100" },
  { id: "attendance", label: "Student Attendance", description: "View and track student attendance records", icon: <ClipboardCheck size={28} />, iconBg: "bg-green-500", gradient: "from-green-50 to-lime-50", accent: "border-green-100" },
  { id: "mark", label: "Mark Attendance", description: "Mark present / absent for today's sessions quickly", icon: <UserRound size={28} />, iconBg: "bg-green-500", gradient: "from-green-50 to-green-50", accent: "border-green-100" },
  { id: "assessment", label: "Assessment Tool", description: "Enter and manage student assessment results", icon: <ClipboardList size={28} />, iconBg: "bg-green-500", gradient: "from-green-50 to-green-50", accent: "border-green-100" },
  { id: "viewresults", label: "View Results", description: "Browse saved assessment results by group and plan", icon: <FileCheck size={28} />, iconBg: "bg-green-500", gradient: "from-green-50 to-green-50", accent: "border-green-100" },
];

function useQuickStats() {
  const { courses } = useCourses();
  const { groups }  = useStudentGroups();
  const totalStudents = useMemo(() => groups.reduce((sum, g) => sum + (g.activeCount ?? 0), 0), [groups]);
  const [avgAttendance, setAvgAttendance] = useState<string>("—");
  useEffect(() => {
    const today = new Date();
    const year  = today.getFullYear();
    const month = today.getMonth() + 1;
    erpList<{ status: string }>("Student Attendance", ["status"], [
      ["date", ">=", `${year}-${String(month).padStart(2, "0")}-01`],
      ["date", "<=", today.toISOString().slice(0, 10)],
    ], 1000).then((records) => {
      if (records.length === 0) { setAvgAttendance("—"); return; }
      const present = records.filter((r) => r.status?.toLowerCase() === "present").length;
      setAvgAttendance(`${Math.round((present / records.length) * 100)}%`);
    }).catch(() => setAvgAttendance("—"));
  }, []);
  return { activeCourses: courses.length, totalStudents, avgAttendance };
}

function HomeView({ onOpen }: { onOpen: (tab: Tab) => void }) {
  const { activeCourses, totalStudents, avgAttendance } = useQuickStats();

  const statCards = [
    { label: "Active Courses", value: activeCourses || "—", icon: <BookOpen size={22} className="text-green-600" />, iconBg: "bg-green-50", bar: "bg-green-500", barWidth: "w-3/4", onClick: () => onOpen("programs"), hoverBorder: "hover:border-green-300", hoverShadow: "hover:shadow-green-100" },
    { label: "Total Students", value: totalStudents || "—", icon: <Users size={22} className="text-green-600" />, iconBg: "bg-green-50", bar: "bg-green-500", barWidth: "w-2/3", onClick: () => onOpen("students"), hoverBorder: "hover:border-green-300", hoverShadow: "hover:shadow-green-100" },
    { label: "Avg. Attendance (This Month)", value: avgAttendance, icon: <CheckCircle2 size={22} className="text-green-600" />, iconBg: "bg-green-50", bar: "bg-green-500", barWidth: "w-11/12", onClick: () => onOpen("attendance"), hoverBorder: "hover:border-green-300", hoverShadow: "hover:shadow-green-100" },
  ];

  return (
    <div className="space-y-10">
      <div className="rounded-2xl bg-gradient-to-br from-green-600 to-green-500 p-8 text-white flex items-center justify-between gap-6 shadow-lg shadow-green-200">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center font-black text-lg select-none">FP</div>
            <div>
              <h1 className="text-2xl font-black leading-tight">Teacher Dashboard</h1>
              <p className="text-green-100 text-sm font-medium">Learn Academy Teacher Portal</p>
            </div>
          </div>
          <p className="text-green-50/90 text-sm max-w-lg leading-relaxed">
            Access all your teaching tools and resources in one unified platform.
            Manage courses, track attendance, and assess student performance with ease.
          </p>
        </div>
        <BookOpen size={72} className="text-white/15 hidden md:block flex-shrink-0" />
      </div>

      <div>
        <h2 className="text-base font-bold text-gray-700 uppercase tracking-widest mb-4">Quick Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statCards.map((s) => (
            <button key={s.label} type="button" onClick={s.onClick}
              className={`relative bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between overflow-hidden transition-all duration-200 cursor-pointer group ${s.hoverBorder} ${s.hoverShadow} hover:shadow-md hover:-translate-y-0.5`}>
              <div className="text-left">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
                <p className="text-3xl font-black text-gray-800 group-hover:text-green-700 transition-colors">{s.value}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl ${s.iconBg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>{s.icon}</div>
              <div className={`absolute bottom-0 left-0 h-1 ${s.barWidth} ${s.bar} rounded-full opacity-70 group-hover:opacity-100 group-hover:w-full transition-all duration-500`} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-base font-bold text-gray-700 uppercase tracking-widest mb-4">Access Your Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {MODULE_CARDS.map((card) => (
            <div key={card.id}
              className="relative bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4 hover:shadow-lg hover:border-green-200 hover:-translate-y-1 transition-all duration-200 group cursor-pointer"
              onClick={() => onOpen(card.id)}>
              <div className="absolute top-0 left-6 right-6 h-0.5 bg-green-500 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              <div className={`w-14 h-14 rounded-2xl ${card.iconBg} text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200`}>{card.icon}</div>
              <div>
                <h3 className="font-bold text-gray-800 text-base group-hover:text-green-700 transition-colors">{card.label}</h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">{card.description}</p>
              </div>
              <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(card.id); }}
                className="mt-auto w-full py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm shadow-green-100">
                Open Module <ChevronRight size={16} />
              </button>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-gray-400 mt-8">
          All modules are integrated with ERPNext. Your data is secure and synchronized across the platform.
        </p>
      </div>
    </div>
  );
}

const TAB_LABELS: Record<Tab, string> = {
  home: "Home", programs: "Programs & Courses", schedule: "Course Schedule",
  attendance: "Student Attendance", students: "Student Groups",
  mark: "Mark Attendance", assessment: "Assessment Tool", viewresults: "View Results",
};

export const FacultyPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("home");

  const handleOpen = (tab: Tab) => setActiveTab(tab);
  const handleBack = () => setActiveTab("home");

  if (activeTab === "home") {
    return (
      <div className="animate-in fade-in duration-300">
        <HomeView onOpen={handleOpen} />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <button type="button" onClick={handleBack}
        className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-green-600 transition-colors group w-fit">
        <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-green-50 flex items-center justify-center transition-colors">
          <ChevronRight size={16} className="rotate-180 text-gray-500 group-hover:text-green-600 transition-colors" />
        </div>
        Back to Teacher Dashboard
      </button>

      {activeTab === "programs"    && <ProgramsTab />}
      {activeTab === "schedule"    && <ScheduleTab />}
      {activeTab === "attendance"  && <AttendanceTab />}
      {activeTab === "students"    && <StudentsTab />}
      {activeTab === "mark"        && <MarkAttendanceTab />}
      {activeTab === "assessment"  && <AssessmentResultTab />}
      {activeTab === "viewresults" && <ViewResultsTab />}
    </div>
  );
};

export default FacultyPage;