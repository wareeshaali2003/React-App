import axios, { AxiosError, AxiosInstance } from "axios";

const PROD_HOST = "learnschool.online";

const isLocalDev =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const isSameDomain = window.location.hostname === PROD_HOST;

const BASE_URL = (isSameDomain || isLocalDev) ? "/api/method" : `https://${PROD_HOST}/api/method`;
const RESOURCE_BASE = (isSameDomain || isLocalDev) ? "" : `https://${PROD_HOST}`;

const AUTH_TOKEN_KEY = "erpnext_auth_token";
const DEV_ADMIN_TOKEN = "token e559cde874cdf6d:355b4f41e87a77c";

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (!token) localStorage.removeItem(AUTH_TOKEN_KEY);
  else localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number; raw?: unknown };

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { Accept: "application/json" },
  timeout: 20000,
});

function readCsrfToken(): string | null {
  const w = window as any;
  const t1 = w?.frappe?.csrf_token;
  if (typeof t1 === "string" && t1.trim()) return t1;
  const t2 = w?.csrf_token;
  if (typeof t2 === "string" && t2.trim()) return t2;
  const meta =
    document.querySelector('meta[name="csrf-token"]') ||
    document.querySelector('meta[name="csrf_token"]');
  const t3 = meta?.getAttribute("content");
  if (typeof t3 === "string" && t3.trim()) return t3;
  const m = document.cookie.match(/(^|;\s*)csrf_token=([^;]+)/);
  if (m?.[2]) return decodeURIComponent(m[2]);
  return null;
}

apiClient.interceptors.request.use((config) => {
  const t = getAuthToken();
  if (t) {
    if (!config.headers) config.headers = {} as any;
    const value = t.startsWith("token ") ? t : `token ${t}`;
    (config.headers as any)["Authorization"] = value;
  }
  const method = (config.method || "get").toLowerCase();
  if (["post", "put", "delete", "patch"].includes(method)) {
    if (!config.headers) config.headers = {} as any;
    const csrf = readCsrfToken();
    if (csrf) (config.headers as any)["X-Frappe-CSRF-Token"] = csrf;
    (config.headers as any)["X-Requested-With"] = "XMLHttpRequest";
  }
  return config;
});

function extractError(err: unknown): { status?: number; message: string; raw?: unknown } {
  if (!axios.isAxiosError(err)) return { message: "Unknown error", raw: err };
  const ae = err as AxiosError<any>;
  const status = ae.response?.status;
  const data = ae.response?.data;
  const message =
    (typeof data === "string" ? data : undefined) ||
    data?.message ||
    data?.exception ||
    ae.message ||
    "Request failed";
  return { status, message: String(message), raw: data ?? ae };
}

function unwrap<T>(body: any): T {
  if (body && typeof body === "object") {
    if ("data" in body && body.data !== undefined) return body.data as T;
    if ("message" in body && body.message !== undefined) return body.message as T;
  }
  return body as T;
}

const handleResponse = async <T>(promise: Promise<any>): Promise<ApiResult<T>> => {
  try {
    const res = await promise;
    return { ok: true, data: unwrap<T>(res.data) };
  } catch (err) {
    const { status, message, raw } = extractError(err);
    console.warn(`[API Error] ${status ?? "Network"}: ${message}`);
    return { ok: false, status, error: message, raw };
  }
};

function asArray<T>(val: any): T[] {
  return Array.isArray(val) ? (val as T[]) : [];
}

// ── Safely extract any list from ERPNext response ────────────────────────────
// ERPNext can return: { data: [...] } | { message: [...] } | [...] | { attendance_list: [...] } etc.
function extractList(raw: any, ...keys: string[]): any[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    // Try specific keys first
    for (const key of keys) {
      if (Array.isArray(raw[key])) return raw[key];
    }
    // Then generic wrappers
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.message)) return raw.message;
    if (Array.isArray(raw.result)) return raw.result;
  }
  return [];
}

// ── Resource Client (/api/resource) → proxy → learnschool.online ─────────────
const resourceClient: AxiosInstance = axios.create({
  baseURL: `${RESOURCE_BASE}/api/resource`,
  withCredentials: true,
  headers: { Accept: "application/json" },
  timeout: 20000,
});

resourceClient.interceptors.request.use((config) => {
  const t = getAuthToken();
  if (t) {
    if (!config.headers) config.headers = {} as any;
    const value = t.startsWith("token ") ? t : `token ${t}`;
    (config.headers as any)["Authorization"] = value;
  }
  const method = (config.method || "get").toLowerCase();
  if (["post", "put", "delete", "patch"].includes(method)) {
    if (!config.headers) config.headers = {} as any;
    const csrf = readCsrfToken();
    if (csrf) (config.headers as any)["X-Frappe-CSRF-Token"] = csrf;
    (config.headers as any)["X-Requested-With"] = "XMLHttpRequest";
  }
  return config;
});

// ── Types ────────────────────────────────────────────────────────────────────
export type DirectoryEmployee = {
  name: string;
  employee_name: string;
  designation?: string;
  department?: string;
  company_email?: string;
  cell_number?: string;
  image?: string;
};

export type AttendanceRecord = {
  id: string;
  date: string;
  inTime: string;
  outTime: string;
  status: string;
};

export type TodoRecord = {
  name: string;
  description: string;
  status: "Open" | "Closed" | "Cancelled";
  priority: "Low" | "Medium" | "High";
  date?: string;
  owner?: string;
  assigned_by_full_name?: string;
  reference_type?: string;
  reference_name?: string;
  color?: string;
};

export type CalendarEvent = {
  name: string;
  subject: string;
  starts_on: string;
  ends_on?: string;
  color?: string;
  event_type?: string;
  status?: string;
  description?: string;
  all_day?: number;
};

// ── Time extraction helper ────────────────────────────────────────────────────
// ERPNext returns times as "2024-03-15 09:30:00" or just "09:30:00" or "09:30"
function extractTime(raw: any): string {
  if (!raw || typeof raw !== "string") return "--:--";
  const trimmed = raw.trim();
  if (!trimmed) return "--:--";
  // If contains space (datetime), take time part
  const timePart = trimmed.includes(" ") ? trimmed.split(" ")[1] : trimmed;
  if (!timePart) return "--:--";
  // Return HH:MM
  return timePart.slice(0, 5) || "--:--";
}

// ── API ──────────────────────────────────────────────────────────────────────
export const api = {

  // ---------- Session ----------
  logout: async () => {
    setAuthToken(null);
    return handleResponse<any>(apiClient.get("logout"));
  },

  loginAsEmployee: (usr: string, pwd: string) => {
    const fd = new FormData();
    fd.append("usr", usr);
    fd.append("pwd", pwd);
    return handleResponse<any>(
      apiClient.post("login", fd, {
        headers: { Authorization: DEV_ADMIN_TOKEN },
      })
    );
  },

  // ---------- Profile ----------
  getProfile: () =>
    handleResponse<any>(apiClient.get("employee_self_service.mobile.v1.ess.get_profile")),

  updateProfilePicture: (formData: FormData) =>
    handleResponse<any>(
      apiClient.post("employee_self_service.mobile.v1.ess.update_profile_picture", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ),

  changePassword: (data: { old_password: string; new_password: string }) =>
    handleResponse<any>(
      apiClient.post("employee_self_service.mobile.v1.ess.change_password", {
        data: JSON.stringify(data),
      })
    ),

  // ---------- Attendance ----------
  getAttendanceList: (year: number, month: number) =>
    handleResponse<any>(
      apiClient.get("employee_self_service.mobile.v1.ess.get_attendance_list", {
        params: { year, month },
      })
    ),

  getAttendance: async (year: number, month: number): Promise<ApiResult<AttendanceRecord[]>> => {
    const res = await handleResponse<any>(
      apiClient.get("employee_self_service.mobile.v1.ess.get_attendance_list", {
        params: { year, month },
      })
    );
    if (!res.ok) return res as ApiResult<AttendanceRecord[]>;

    // ERPNext ESS returns: { attendance_list: [...] } OR { data: [...] } OR [...]
    const rawList = extractList(res.data, "attendance_list", "attendance");

    console.log("[API] getAttendance raw sample:", rawList.slice(0, 2));

    const mapped: AttendanceRecord[] = rawList.map((item: any, idx: number) => ({
      id: item.name || `rec-${idx}`,
      // ERPNext field is attendance_date
      date: item.attendance_date || item.date || "",
      inTime:  extractTime(item.in_time),
      outTime: extractTime(item.out_time),
      // status: "Present" | "Absent" | "Half Day" | "On Leave" — keep as-is
      status: item.status || "Other",
    }));

    console.log("[API] getAttendance mapped:", mapped.length, "records, statuses:", [...new Set(mapped.map(r => r.status))]);

    return { ok: true, data: mapped };
  },

  createLog: (data: any) =>
    handleResponse<any>(
      apiClient.post("employee_self_service.mobile.v1.ess.create_employee_log", data)
    ),

  // ---------- Dashboard ----------
  getDashboard: () =>
    handleResponse<any>(apiClient.get("employee_self_service.mobile.v1.ess.get_dashboard")),

  // ---------- Leaves ----------
  getLeaveSummary: async () => {
    const res = await handleResponse<any>(
      apiClient.get("employee_self_service.mobile.v1.ess.get_leave_type")
    );
    if (!res.ok) return res;

    // ERPNext may return: [...] | { leave_types: [...] } | { data: [...] }
    const list = extractList(res.data, "leave_types", "leave_type");
    console.log("[API] getLeaveSummary:", list.length, "leave types");
    return { ok: true as const, data: list };
  },

  getLeaveHistory: async () => {
    const res = await handleResponse<any>(
      apiClient.get("employee_self_service.mobile.v1.ess.get_leave_application_list")
    );
    if (!res.ok) return res;

    // May return: { leave_application_list: [...] } | [...]
    const list = extractList(res.data, "leave_application_list", "applications");
    return { ok: true as const, data: list };
  },

  makeLeave: (payload: {
    leave_type: string;
    from_date: string;
    to_date: string;
    reason?: string;
  }) =>
    handleResponse<any>(
      apiClient.post("employee_self_service.mobile.v1.ess.make_leave_application", payload)
    ),

  getLeaveTypes: async (): Promise<ApiResult<string[]>> => {
    const res = await handleResponse<any>(
      resourceClient.get("Leave Type", {
        params: { fields: JSON.stringify(["name"]) },
      })
    );
    if (!res.ok) return res as ApiResult<string[]>;
    const rows = asArray<any>(res.data?.data ?? res.data);
    return { ok: true, data: rows.map((r: any) => r.name).filter(Boolean) };
  },

  // ---------- Payroll ----------
  getSalarySlips: async () => {
    const res = await handleResponse<any[]>(
      apiClient.get("employee_self_service.mobile.v1.ess.get_salary_sllip")
    );
    if (!res.ok) return res;
    const list = extractList(res.data, "salary_slips", "slips");
    return { ok: true as const, data: list };
  },

  getSalarySlipDownloadUrl: (ss_id: string) =>
    `${BASE_URL}/employee_self_service.mobile.v1.ess.download_salary_slip?ss_id=${encodeURIComponent(ss_id)}`,

  // ---------- Notifications ----------
  getNotifications: async () => {
    const res = await handleResponse<any[]>(
      apiClient.get("employee_self_service.mobile.v1.ess.notification_list")
    );
    if (!res.ok) return res;
    const list = extractList(res.data, "notifications");
    return { ok: true as const, data: list };
  },

  markRead: (id: string) =>
    handleResponse<any>(
      apiClient.post("employee_self_service.mobile.v1.ess.mark_read_notification", { name: id })
    ),

  // ---------- Directory ----------
  getDirectory: async (search?: string): Promise<ApiResult<DirectoryEmployee[]>> => {
    const filters = search
      ? JSON.stringify([["Employee", "employee_name", "like", `%${search}%`]])
      : undefined;
    const res = await handleResponse<any>(
      resourceClient.get("Employee", {
        params: {
          fields: JSON.stringify([
            "name", "employee_name", "designation", "department",
            "company_email", "cell_number", "image",
          ]),
          ...(filters ? { filters } : {}),
          limit_page_length: 50,
        },
      })
    );
    if (!res.ok) return res as ApiResult<DirectoryEmployee[]>;
    const rows = asArray<DirectoryEmployee>(res.data?.data ?? res.data);
    return { ok: true, data: rows };
  },

  // ---------- ToDo ----------
  getTodos: async (): Promise<ApiResult<TodoRecord[]>> => {
    const res = await handleResponse<any>(
      resourceClient.get("ToDo", {
        params: {
          fields: JSON.stringify([
            "name", "description", "status", "priority",
            "date", "owner", "assigned_by_full_name",
            "reference_type", "reference_name", "color",
          ]),
          limit_page_length: 100,
          order_by: "modified desc",
        },
      })
    );
    if (!res.ok) return res as ApiResult<TodoRecord[]>;
    const rows = asArray<TodoRecord>(res.data?.data ?? res.data);
    return { ok: true, data: rows };
  },

  createTodo: (payload: {
    description: string;
    status?: string;
    priority?: string;
    date?: string;
  }) =>
    handleResponse<any>(resourceClient.post("ToDo", payload)),

  updateTodo: (name: string, payload: {
    status?: string;
    priority?: string;
    description?: string;
    date?: string;
  }) =>
    handleResponse<any>(
      resourceClient.put(`ToDo/${encodeURIComponent(name)}`, payload)
    ),

  deleteTodo: (name: string) =>
    handleResponse<any>(
      resourceClient.delete(`ToDo/${encodeURIComponent(name)}`)
    ),

  // ---------- Calendar Events ----------
  getEvents: async (): Promise<ApiResult<CalendarEvent[]>> => {
    const res = await handleResponse<any>(
      resourceClient.get("Event", {
        params: {
          fields: JSON.stringify([
            "name", "subject", "starts_on", "ends_on",
            "color", "event_type", "status", "all_day",
          ]),
          limit_page_length: 200,
          order_by: "starts_on asc",
        },
      })
    );
    if (!res.ok) return res as ApiResult<CalendarEvent[]>;
    const rows = asArray<CalendarEvent>(res.data?.data ?? res.data);
    return { ok: true, data: rows };
  },

  createEvent: (payload: {
    subject: string;
    starts_on: string;
    ends_on?: string;
    color?: string;
    event_type?: string;
    description?: string;
    all_day?: number;
  }) =>
    handleResponse<any>(resourceClient.post("Event", payload)),

  deleteEvent: (name: string) =>
    handleResponse<any>(
      resourceClient.delete(`Event/${encodeURIComponent(name)}`)
    ),

  // ---------- Faculty ----------
  getFacultyPrograms: async () => {
    const res = await handleResponse<any>(
      resourceClient.get("Program", {
        params: {
          fields: JSON.stringify(["name", "program_name"]),
          limit_page_length: 200,
        },
      })
    );
    if (!res.ok) return res;
    const rows = asArray<any>(res.data?.data ?? res.data);
    return { ok: true as const, data: rows };
  },

  getFacultyCourses: async () => {
    const res = await handleResponse<any>(
      resourceClient.get("Course", {
        params: {
          fields: JSON.stringify(["name", "course_name"]),
          limit_page_length: 200,
        },
      })
    );
    if (!res.ok) return res;
    const rows = asArray<any>(res.data?.data ?? res.data);
    return { ok: true as const, data: rows };
  },

  getCourseSchedule: async (filters?: any[]) => {
    const res = await handleResponse<any>(
      resourceClient.get("Course Schedule", {
        params: {
          fields: JSON.stringify([
            "name", "student_group", "instructor", "instructor_name",
            "program", "course", "schedule_date", "room",
            "from_time", "to_time", "title", "color",
          ]),
          ...(filters ? { filters: JSON.stringify(filters) } : {}),
          limit_page_length: 200,
        },
      })
    );
    if (!res.ok) return res;
    const rows = asArray<any>(res.data?.data ?? res.data);
    return { ok: true as const, data: rows };
  },

  getStudentGroups: async (programFilter?: string) => {
    const filters = programFilter
      ? JSON.stringify([["Student Group", "program", "=", programFilter]])
      : undefined;
    const res = await handleResponse<any>(
      resourceClient.get("Student Group", {
        params: {
          fields: JSON.stringify(["name", "student_group_name", "program", "course", "batch"]),
          ...(filters ? { filters } : {}),
          limit_page_length: 200,
        },
      })
    );
    if (!res.ok) return res;
    const rows = asArray<any>(res.data?.data ?? res.data);
    return { ok: true as const, data: rows };
  },

  getStudentGroupDetail: (groupName: string) =>
    handleResponse<any>(
      resourceClient.get(`Student Group/${encodeURIComponent(groupName)}`)
    ),

  getStudentAttendance: async (courseSchedule: string) => {
    const res = await handleResponse<any>(
      resourceClient.get("Student Attendance", {
        params: {
          fields: JSON.stringify([
            "name", "student", "student_name",
            "course_schedule", "student_group", "date", "status",
          ]),
          filters: JSON.stringify([
            ["Student Attendance", "course_schedule", "=", courseSchedule],
          ]),
          limit_page_length: 200,
        },
      })
    );
    if (!res.ok) return res;
    const rows = asArray<any>(res.data?.data ?? res.data);
    return { ok: true as const, data: rows };
  },

  createStudentAttendance: (payload: {
    student: string;
    student_name: string;
    course_schedule: string;
    student_group: string;
    date: string;
    status: "Present" | "Absent";
  }) =>
    handleResponse<any>(resourceClient.post("Student Attendance", payload)),

  getAssessmentPlans: async () => {
    const res = await handleResponse<any>(
      resourceClient.get("Assessment Plan", {
        params: {
          fields: JSON.stringify([
            "name", "student_group", "program", "course",
            "academic_year", "academic_term", "assessment_group",
            "grading_scale", "maximum_assessment_score"
          ]),
          limit_page_length: 500,
        },
      })
    );
    if (!res.ok) return res;
    const rows = asArray<any>(res.data?.data ?? res.data);
    return { ok: true as const, data: rows };
  },

  getAssessmentPlanDetail: (planName: string) =>
    handleResponse<any>(
      resourceClient.get(`Assessment Plan/${encodeURIComponent(planName)}`)
    ),

  createAssessmentResult: (payload: any) =>
    handleResponse<any>(resourceClient.post("Assessment Result", payload)),

  getAssessmentResults: async (filters?: any[]) => {
    const res = await handleResponse<any>(
      resourceClient.get("Assessment Result", {
        params: {
          fields: JSON.stringify([
            "name", "student", "student_name",
            "assessment_plan", "student_group",
            "total_score", "grade", "comments"
          ]),
          ...(filters ? { filters: JSON.stringify(filters) } : {}),
          limit_page_length: 500,
        },
      })
    );
    if (!res.ok) return res;
    const rows = asArray<any>(res.data?.data ?? res.data);
    return { ok: true as const, data: rows };
  },

  updateAssessmentResult: (resultName: string, payload: any) =>
    handleResponse<any>(
      resourceClient.put(`Assessment Result/${encodeURIComponent(resultName)}`, payload)
    ),
};

export default apiClient;