export default function DashboardMenuIcon({type, className}) {
  const art = {
    home: (
      <>
        <path className="iconMain" d="M5 13.5 16 4l11 9.5V28H5Z" />
        <path className="iconDetail" d="M11 28v-8h10v8M3.5 14.5 16 3l12.5 11.5" />
        <circle className="iconAccent" cx="24.5" cy="7.5" r="3" />
      </>
    ),
    library: (
      <>
        <rect className="iconMain" x="4" y="6" width="7" height="21" rx="1.5" />
        <rect className="iconAccent" x="12.5" y="3.5" width="7" height="23.5" rx="1.5" />
        <path className="iconMain" d="m21 7 6-1 3 20-6 1Z" />
        <path className="iconDetail" d="M6.5 11h2M15 9h2M15 21h2M24 12l3-.5M3 29h28" />
      </>
    ),
    rewards: (
      <>
        <ellipse className="iconMain" cx="13" cy="22.5" rx="8" ry="4" />
        <path className="iconMain" d="M5 17.5c0 2.2 3.6 4 8 4s8-1.8 8-4v5M7 12.5c0 2.2 3.4 4 7.5 4s7.5-1.8 7.5-4-3.4-4-7.5-4S7 10.3 7 12.5Z" />
        <path className="iconAccent" d="m25 4 1.4 3.1L30 8.5l-3.6 1.4L25 13l-1.4-3.1L20 8.5l3.6-1.4Z" />
      </>
    ),
    store: (
      <>
        <path className="iconMain" d="M6 11h20l-1.5 17h-17Z" />
        <path className="iconDetail" d="M11 13V9a5 5 0 0 1 10 0v4" />
        <rect className="iconAccent" x="11" y="16" width="11" height="8" rx="1" />
        <path className="iconDetail" d="M14 18.5h5M14 21.5h5" />
      </>
    ),
    profile: (
      <>
        <circle className="iconAccent" cx="16" cy="10" r="6" />
        <path className="iconMain" d="M5 28c.8-7 4.6-10.5 11-10.5S26.2 21 27 28Z" />
        <path className="iconDetail" d="M11 10c1.8 1.4 4.1 2 7 1.7" />
      </>
    ),
  };

  return (
    <span className={className} data-icon={type} aria-hidden="true">
      <svg viewBox="0 0 32 32">{art[type] || art.home}</svg>
    </span>
  );
}
