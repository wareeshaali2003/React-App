import {
  LayoutDashboard,
  Clock,
  CalendarCheck,
  FileText,
  Contact2,
  GraduationCap,
  BookOpen,
  Layers,
  CheckSquare,
  CalendarDays,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  iconName: string;
  allowedDesignations?: string[];
  dashboardOnly?: boolean;
}

export const sidebarConfig: NavItem[] = [
  { to: '/',             label: 'Main Dashboard',     iconName: 'LayoutDashboard' },
  { to: '/ess',          label: 'ESS Dashboard',      iconName: 'Layers' },

  { to: '/attendance',   label: 'My Attendance',      iconName: 'Clock',         dashboardOnly: true },
  { to: '/leave',        label: 'Leave Applications', iconName: 'CalendarCheck', dashboardOnly: true },
  { to: '/salary-slip',  label: 'Salary Slips',       iconName: 'FileText',      dashboardOnly: true },
  { to: '/directory',    label: 'Contacts',            iconName: 'Contact2',      dashboardOnly: true },

  { to: '/todo',         label: 'To Do',              iconName: 'CheckSquare' },
  { to: '/calendar',     label: 'Calendar',           iconName: 'CalendarDays' },

  {
    to: '/faculty',
    label: 'Teacher Dashboard',
    iconName: 'BookOpen',
    allowedDesignations: ["Teacher"],
  },
  { to: '/profile',      label: 'My Profile',         iconName: 'GraduationCap' },
];

export const getIcon = (name: string) => {
  const icons: Record<string, any> = {
    LayoutDashboard,
    Clock,
    CalendarCheck,
    FileText,
    Contact2,
    GraduationCap,
    BookOpen,
    Layers,
    CheckSquare,
    CalendarDays,
  };
  return icons[name] || LayoutDashboard;
};

export const sidebarNavItems = sidebarConfig.filter((item) => !item.dashboardOnly);

export function isNavItemVisible(item: NavItem, designation: string): boolean {
  if (!item.allowedDesignations || item.allowedDesignations.length === 0) return true;
  return item.allowedDesignations.some(
    (d) => d.toLowerCase() === (designation || "").toLowerCase()
  );
}