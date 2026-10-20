// الأيقونات كلها هنا، بنمط Lucide الخطي (سمك 1.75). أيقونة جديدة تُضاف في هذا الملف، لا من مكتبة خارجية.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 20, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export const IconHome = (p: P) => <Base {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></Base>;
export const IconCalendar = (p: P) => <Base {...p}><rect x="3" y="4.5" width="18" height="16.5" rx="2" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></Base>;
export const IconFile = (p: P) => <Base {...p}><path d="M14 2.5H6a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.5z" /><path d="M14 2.5v6h6M8 13h8M8 17h5" /></Base>;
export const IconUsers = (p: P) => <Base {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20.5a6.5 6.5 0 0 1 13 0" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M21.5 20.5a6.5 6.5 0 0 0-4-6" /></Base>;
export const IconShield = (p: P) => <Base {...p}><path d="M12 2.5 4 5.5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10v-6z" /><path d="m9 12 2 2 4-4" /></Base>;
export const IconWallet = (p: P) => <Base {...p}><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" /><path d="M21 11h-5a2 2 0 0 0 0 4h5z" /></Base>;
export const IconQr = (p: P) => <Base {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" /></Base>;
export const IconStar = (p: P) => <Base {...p}><path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" /></Base>;
export const IconScale = (p: P) => <Base {...p}><path d="M12 3v18M7 21h10M5 7h14" /><path d="m5 7-3 7a3.5 3.5 0 0 0 6 0zM19 7l-3 7a3.5 3.5 0 0 0 6 0z" /></Base>;
export const IconSettings = (p: P) => <Base {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Base>;
export const IconLogout = (p: P) => <Base {...p}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l-5-5 5-5M5 12h12" /></Base>;
export const IconBell = (p: P) => <Base {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></Base>;
export const IconCheck = (p: P) => <Base {...p}><path d="M20 6 9 17l-5-5" /></Base>;
export const IconX = (p: P) => <Base {...p}><path d="M18 6 6 18M6 6l12 12" /></Base>;
export const IconPlus = (p: P) => <Base {...p}><path d="M12 5v14M5 12h14" /></Base>;
export const IconPin = (p: P) => <Base {...p}><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></Base>;
export const IconMic = (p: P) => <Base {...p}><rect x="9" y="2.5" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" /></Base>;
export const IconBuilding = (p: P) => <Base {...p}><rect x="4" y="2.5" width="16" height="19" rx="1.5" /><path d="M9 21.5v-4h6v4M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01M8 15h.01M16 15h.01" /></Base>;
export const IconChart = (p: P) => <Base {...p}><path d="M3 3v18h18" /><path d="M7 16v-4M12 16V8M17 16v-7" /></Base>;
export const IconClock = (p: P) => <Base {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Base>;
export const IconSearch = (p: P) => <Base {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Base>;
export const IconAlert = (p: P) => <Base {...p}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0" /><path d="M12 9v4M12 17h.01" /></Base>;
export const IconArrowLeft = (p: P) => <Base {...p}><path d="M19 12H5M12 19l-7-7 7-7" /></Base>;
export const IconBadge = (p: P) => <Base {...p}><circle cx="12" cy="9" r="6" /><path d="m8.5 14.2-1.5 7.3 5-3 5 3-1.5-7.3" /></Base>;
export const IconHandshake = (p: P) => <Base {...p}><path d="m11 17 2 2a1.4 1.4 0 0 0 2-2" /><path d="m14 14 2.5 2.5a1.4 1.4 0 0 0 2-2l-3.9-3.9a2 2 0 0 0-2.8 0l-.9.9a1.4 1.4 0 0 1-2-2l2.8-2.8a5 5 0 0 1 6.1-.8l.5.3a2 2 0 0 0 1.4.3L21 6" /><path d="m21 3 1 11h-2M3 3 2 14l6.5 6.5a1.4 1.4 0 0 0 2-2M3 4h8" /></Base>;
export const IconBook = (p: P) => <Base {...p}><path d="M4 19.5V4.5A2 2 0 0 1 6 2.5h14v17H6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h14" /></Base>;
export const IconPhone = (p: P) => <Base {...p}><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><path d="M11 18.5h2" /></Base>;
export const IconDownload = (p: P) => <Base {...p}><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></Base>;
export const IconShare = (p: P) => <Base {...p}><path d="M12 3v12M8 7l4-4 4 4" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></Base>;
export const IconList =(p: P) => <Base {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></Base>;
