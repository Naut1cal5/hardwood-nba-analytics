// Minimal SF-style line icons
const Icon = ({ name, size = 16, stroke = 1.5 }) => {
  const common = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: stroke,
    strokeLinecap: 'round', strokeLinejoin: 'round',
  };
  switch (name) {
    case 'player':
      return <svg {...common}><circle cx="12" cy="8" r="3.2"/><path d="M5 20c1.2-3.2 4-5 7-5s5.8 1.8 7 5"/></svg>;
    case 'team':
      return <svg {...common}><circle cx="9" cy="9" r="2.6"/><circle cx="17" cy="10" r="2.2"/><path d="M3 19c.8-2.6 3-4 6-4s5.2 1.4 6 4"/><path d="M14.5 16c1-1.8 2.6-2.6 4.5-2.6 1.5 0 2.6.4 3 1"/></svg>;
    case 'leaders':
      return <svg {...common}><path d="M4 20V9"/><path d="M10 20V4"/><path d="M16 20v-8"/><path d="M22 20H2"/></svg>;
    case 'live':
      return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M6 6a8.5 8.5 0 0 0 0 12"/><path d="M18 6a8.5 8.5 0 0 1 0 12"/></svg>;
    case 'scores':
      return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M12 5v14"/></svg>;
    case 'compare':
      return <svg {...common}><path d="M8 4v16"/><path d="M16 4v16"/><path d="M4 8h8"/><path d="M12 16h8"/></svg>;
    case 'fantasy':
      return <svg {...common}><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.7L12 16.3 6.8 19l1-5.7L3.5 9.2l5.9-.9L12 3z"/></svg>;
    case 'search':
      return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case 'settings':
      return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>;
    case 'arrow-up':
      return <svg {...common}><path d="m6 14 6-6 6 6"/></svg>;
    case 'arrow-down':
      return <svg {...common}><path d="m6 10 6 6 6-6"/></svg>;
    case 'chevron':
      return <svg {...common}><path d="m9 6 6 6-6 6"/></svg>;
    case 'play':
      return <svg {...common} fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></svg>;
    case 'bell':
      return <svg {...common}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>;
    case 'sparkle':
      return <svg {...common}><path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/><path d="M5.6 5.6l2.8 2.8"/><path d="M15.6 15.6l2.8 2.8"/></svg>;
    case 'basketball':
      return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3v18"/><path d="M5.6 5.6c3 3 9.8 9.8 12.8 12.8"/><path d="M18.4 5.6c-3 3-9.8 9.8-12.8 12.8"/></svg>;
    case 'trend':
      return <svg {...common}><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>;
    default: return null;
  }
};

window.Icon = Icon;
