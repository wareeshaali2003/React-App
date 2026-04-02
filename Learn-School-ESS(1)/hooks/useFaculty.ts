import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../services/api";

// ── TYPES ──
export type FacultyProgram  = { name: string; program_name?: string };
export type FacultyCourse   = { name: string; course_name?: string };
export type ScheduleEntry   = {
  name: string; student_group: string; instructor: string;
  instructor_name: string; program: string; course: string;
  schedule_date: string; room?: string; from_time: string;
  to_time: string; title?: string; color?: string; class_schedule_color?: string;
};
export type StudentGroup    = {
  name: string; student_group_name?: string; program?: string;
  course?: string; batch?: string; activeCount?: number; totalCount?: number;
};
export type GroupStudent    = {
  name?: string; student: string; student_name: string;
  active?: number; group_roll_number?: number;
};
export type StudentAttendance = {
  name: string; student: string; student_name: string;
  course_schedule: string; student_group: string; date: string; status: string;
};
export type AssessmentCriteria = {
  name: string; assessment_criteria: string; maximum_score: number;
};
export type AssessmentPlan = {
  name: string; student_group?: string; program?: string; course?: string;
  academic_year?: string; academic_term?: string; assessment_group?: string;
  grading_scale?: string; maximum_assessment_score?: number;
  assessment_criteria?: AssessmentCriteria[];
};

// ── PROGRAMS ──
export const usePrograms = () => {
  const [programs, setPrograms] = useState<FacultyProgram[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    const res = await api.getFacultyPrograms();
    if (res.ok) {
      const raw = Array.isArray(res.data) ? res.data : (res.data as any)?.data ?? [];
      setPrograms(raw);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { programs, loading, error, refetch: fetchData };
};

// ── COURSES ──
export const useCourses = () => {
  const [courses, setCourses] = useState<FacultyCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    const res = await api.getFacultyCourses();
    if (res.ok) {
      const raw = Array.isArray(res.data) ? res.data : (res.data as any)?.data ?? [];
      setCourses(raw);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { courses, loading, error, refetch: fetchData };
};

// ── COURSE SCHEDULE ──
export const useSchedule = (programFilter?: string) => {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    const res = await api.getCourseSchedule(programFilter);
    if (res.ok) {
      const raw = Array.isArray(res.data) ? res.data : (res.data as any)?.data ?? [];
      setSchedule(raw);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, [programFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { schedule, loading, error, refetch: fetchData };
};

// ── STUDENT GROUPS ──
export const useStudentGroups = (programFilter?: string) => {
  const [groups, setGroups]   = useState<StudentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    const res = await api.getStudentGroups(programFilter);
    if (!res.ok) { setError(res.error); setLoading(false); return; }

    const raw: StudentGroup[] = Array.isArray(res.data) ? res.data : (res.data as any)?.data ?? [];

    const withCounts = await Promise.all(
      raw.map(async (g) => {
        const detail = await api.getStudentGroupDetail(g.name);
        if (!detail.ok) return { ...g, totalCount: 0, activeCount: 0 };
        const studs: any[] = Array.isArray(detail.data?.students) ? detail.data.students : [];
        return { ...g, totalCount: studs.length, activeCount: studs.filter((s) => s.active === 1).length };
      })
    );
    setGroups(withCounts);
    setLoading(false);
  }, [programFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { groups, loading, error, refetch: fetchData };
};

// ── GROUP STUDENTS ──
export const useGroupStudents = (groupName?: string) => {
  const [students, setStudents] = useState<GroupStudent[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!groupName) { setStudents([]); return; }
    setLoading(true); setError(null);
    const res = await api.getStudentGroupDetail(groupName);
    if (res.ok) {
      const raw: any[] = Array.isArray(res.data?.students) ? res.data.students : [];
      setStudents(raw.map((s) => ({
        name: s.name,
        student: s.student || "",
        student_name: s.student_name || "",
        active: s.active,
        group_roll_number: s.group_roll_number,
      })));
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, [groupName]);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { students, loading, error, refetch: fetchData };
};

// ── STUDENT ATTENDANCE ──
export const useStudentAttendance = (courseSchedule?: string) => {
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!courseSchedule) return;
    setLoading(true); setError(null);
    const res = await api.getStudentAttendance(courseSchedule);
    if (res.ok) {
      const raw = Array.isArray(res.data) ? res.data : (res.data as any)?.data ?? [];
      setAttendance(raw);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, [courseSchedule]);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { attendance, loading, error, refetch: fetchData };
};

// ── ASSESSMENT PLANS ──
export const useAssessmentPlans = () => {
  const [plans, setPlans]     = useState<AssessmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    api.getAssessmentPlans().then((res) => {
      if (res.ok) {
        const raw = Array.isArray(res.data) ? res.data : (res.data as any)?.data ?? [];
        setPlans(raw);
      } else {
        setError(res.error);
      }
      setLoading(false);
    });
  }, []);

  return { plans, loading, error };
};

// ── ASSESSMENT PLAN DETAIL ──
export const useAssessmentPlanDetail = (planName: string | null) => {
  const [plan, setPlan]       = useState<AssessmentPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!planName) { setPlan(null); return; }
    setLoading(true);
    api.getAssessmentPlanDetail(planName).then((res) => {
      if (res.ok) setPlan(res.data as AssessmentPlan);
      else setError(res.error);
      setLoading(false);
    });
  }, [planName]);

  return { plan, loading, error };
};