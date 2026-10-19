import type { NavItem } from "./dashboard-shell";
import {
  IconBadge, IconBuilding, IconCalendar, IconChart, IconFile, IconHome, IconList, IconQr, IconScale, IconSettings, IconShield, IconStar, IconUsers, IconWallet,
} from "./icons";

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "نظرة عامة", icon: <IconChart size={18} /> },
  { href: "/admin/licenses", label: "التراخيص", icon: <IconBadge size={18} /> },
  { href: "/admin/events", label: "الفعاليات", icon: <IconCalendar size={18} /> },
  { href: "/admin/parties", label: "الأطراف والتحقق", icon: <IconUsers size={18} /> },
  { href: "/admin/cases", label: "الحالات والتعارضات", icon: <IconShield size={18} /> },
  { href: "/admin/grievances", label: "التظلمات", icon: <IconScale size={18} /> },
  { href: "/admin/finance", label: "الدفتر المالي", icon: <IconWallet size={18} /> },
  { href: "/admin/parameters", label: "معاملات القواعد", icon: <IconSettings size={18} /> },
  { href: "/admin/audit", label: "سجل النشاط", icon: <IconList size={18} /> },
];

export const ORGANIZER_NAV: NavItem[] = [
  { href: "/organizer", label: "نظرة عامة", icon: <IconHome size={18} /> },
  { href: "/organizer/events", label: "فعالياتي", icon: <IconCalendar size={18} /> },
  { href: "/organizer/events/new", label: "فعالية جديدة", icon: <IconFile size={18} /> },
  { href: "/organizer/licenses", label: "التراخيص", icon: <IconBadge size={18} /> },
  { href: "/organizer/finance", label: "المدفوعات", icon: <IconWallet size={18} /> },
];

export const PARTICIPANT_NAV: NavItem[] = [
  { href: "/poet", label: "نظرة عامة", icon: <IconHome size={18} /> },
  { href: "/poet/offers", label: "الدعوات والعروض", icon: <IconFile size={18} /> },
  { href: "/poet/contracts", label: "عقودي", icon: <IconList size={18} /> },
  { href: "/poet/attendance", label: "رموز الحضور", icon: <IconQr size={18} /> },
  { href: "/poet/licenses", label: "تراخيصي", icon: <IconBadge size={18} /> },
  { href: "/poet/profile", label: "ملفي وأسعاري", icon: <IconStar size={18} /> },
  { href: "/poet/row", label: "صفي", icon: <IconUsers size={18} /> },
  { href: "/poet/finance", label: "مستحقاتي", icon: <IconWallet size={18} /> },
  { href: "/poet/record", label: "سجلي والتظلمات", icon: <IconScale size={18} /> },
];

export const HOST_NAV: NavItem[] = [
  { href: "/host", label: "نظرة عامة", icon: <IconHome size={18} /> },
  { href: "/host/venues", label: "مواقعي", icon: <IconBuilding size={18} /> },
  { href: "/host/events", label: "الحجوزات", icon: <IconCalendar size={18} /> },
  { href: "/host/licenses", label: "ترخيص الموقع", icon: <IconBadge size={18} /> },
];
