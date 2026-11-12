import React from 'react';

// Small, dependency-free outline icon collection for the PerPoly UI.
const shapes = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  receipt: <><path d="M4 3h16v18l-4-2-4 2-4-2-4 2V3Z"/><path d="M8 8h8M8 12h8"/></>,
  flask: <><path d="M9 3h6M10 3v7l-5.4 8.1A2 2 0 0 0 6.3 21h11.4a2 2 0 0 0 1.7-2.9L14 10V3"/><path d="M8 15h8"/></>,
  boxes: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4.5 7.7 7.5 4.5 7.5-4.5M12 12.2V21"/></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/><path d="M15 8l3-3 3 3"/></>,
  income: <><path d="M3 17l6-6 4 4 8-8"/><path d="M16 7h5v5"/><path d="M3 21h18"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .36 2l-1.6 1.6a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1.1 1.65H9a1.8 1.8 0 0 0-1.1-1.65 1.8 1.8 0 0 0-2 .36l-1.6-1.6a1.8 1.8 0 0 0 .36-2A1.8 1.8 0 0 0 3 13.9v-3.8A1.8 1.8 0 0 0 4.65 9a1.8 1.8 0 0 0-.36-2l1.6-1.6a1.8 1.8 0 0 0 2 .36A1.8 1.8 0 0 0 9 4.1h6a1.8 1.8 0 0 0 1.1 1.65 1.8 1.8 0 0 0 2-.36l1.6 1.6a1.8 1.8 0 0 0-.36 2A1.8 1.8 0 0 0 21 10.1v3.8A1.8 1.8 0 0 0 19.4 15Z"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1M17 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1"/></>,
  logout: <><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M16 17l5-5-5-5M21 12H9"/></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
  close: <><path d="M5 5l14 14M19 5 5 19"/></>,
  chevron: <><path d="m9 18 6-6-6-6"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
  shield: <><path d="M12 2 20 6v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4Z"/><path d="m9 12 2 2 4-4"/></>,
  pulse: <><path d="M2 12h4l3-6 4 12 3-6h6"/></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
  eye: <><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
  eyeoff: <><path d="M3 3l18 18M10.6 6.1A12.3 12.3 0 0 1 12 6c6 0 10 6 10 6a16.7 16.7 0 0 1-3.3 3.7M6.1 6.5C3.5 8.1 2 12 2 12s4 6 10 6c1.4 0 2.7-.3 3.8-.8"/><path d="M10 10a3 3 0 0 0 4 4"/></>,
  sparkle: <><path d="m12 2 2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2Z"/></>,
  arrow: <><path d="M4 12h16M14 6l6 6-6 6"/></>
};

export default function Icon({ name, size = 20, className = '', strokeWidth = 1.85, ...props }) {
  return (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={className} {...props}>
      {shapes[name] || shapes.grid}
    </svg>
  );
}
