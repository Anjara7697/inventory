import { SVGProps } from 'react';

/** 1.5px stroke icons (Lucide-like), 18px by default, color inherited from text. */
const make = (paths: React.ReactNode) => function Icon({ size = 18, ...p }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
      {paths}
    </svg>
  );
};

export const IconDashboard = make(<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>);
export const IconProduct = make(<><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="M3 8l9 5 9-5M12 13v8" /></>);
export const IconMaterial = make(<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>);
export const IconStock = make(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />);
export const IconFactory = make(<path d="M3 21V10l6 4V10l6 4V5h6v16z" />);
export const IconCart = make(<><path d="M3 4h2l2.5 11h11L21 7H6.5" /><circle cx="9" cy="19" r="1.5" /><circle cx="18" cy="19" r="1.5" /></>);
export const IconReport = make(<><path d="M6 3h9l4 4v14H6z" /><path d="M9 13h6M9 17h4" /></>);
export const IconSettings = make(<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>);
export const IconLogout = make(<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11" />);
export const IconMenu = make(<path d="M4 7h16M4 12h16M4 17h16" />);
export const IconClose = make(<path d="M6 6l12 12M18 6 6 18" />);
export const IconPlus = make(<path d="M12 5v14M5 12h14" />);
export const IconPencil = make(<path d="M4 20h4L19 9l-4-4L4 16z" />);
export const IconTrash = make(<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />);
export const IconCheck = make(<path d="M5 12l5 5 9-10" />);
