export function LogoIcon({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Spreadsheet — behind, slightly tilted */}
      <g transform="rotate(-6 12 26)">
        <rect x="2" y="10" width="20" height="28" rx="2" fill="white" stroke="#E2E8F0" strokeWidth="1.5" />
        {/* Header row */}
        <rect x="2" y="10" width="20" height="8" rx="2" fill="#DCFCE7" />
        {/* Horizontal grid lines */}
        <line x1="2" y1="18" x2="22" y2="18" stroke="#E2E8F0" strokeWidth="1" />
        <line x1="2" y1="24" x2="22" y2="24" stroke="#E2E8F0" strokeWidth="1" />
        <line x1="2" y1="30" x2="22" y2="30" stroke="#E2E8F0" strokeWidth="1" />
        {/* Vertical grid line */}
        <line x1="11" y1="10" x2="11" y2="38" stroke="#E2E8F0" strokeWidth="1" />
        {/* Tiny data bars to suggest spreadsheet content */}
        <rect x="13" y="21" width="6" height="2" rx="0.5" fill="#16A34A" fillOpacity="0.5" />
        <rect x="13" y="27" width="4" height="2" rx="0.5" fill="#16A34A" fillOpacity="0.4" />
        <rect x="13" y="14" width="5" height="2" rx="0.5" fill="#16A34A" fillOpacity="0.6" />
      </g>

      {/* Jug body */}
      <rect x="20" y="15" width="20" height="25" rx="3" fill="#16A34A" />
      {/* Jug shoulder / neck */}
      <rect x="23" y="9" width="11" height="8" rx="2" fill="#15803D" />
      {/* Jug cap */}
      <rect x="25" y="4" width="7" height="6" rx="2" fill="#0EA5E9" />
      {/* Jug handle */}
      <path
        d="M40 19 C46 19 46 34 40 34"
        stroke="#15803D"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />
      {/* Spreadsheet grid lines on jug body (label area) */}
      <line x1="20" y1="23" x2="40" y2="23" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
      <line x1="20" y1="30" x2="40" y2="30" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
      <line x1="29" y1="15" x2="29" y2="40" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
      {/* Jug label highlight */}
      <rect x="22" y="25" width="6" height="1.5" rx="0.5" fill="white" fillOpacity="0.45" />
      <rect x="22" y="28" width="4" height="1.5" rx="0.5" fill="white" fillOpacity="0.35" />

      {/* Spray droplets — from nozzle/cap area */}
      <circle cx="16" cy="7"  r="2"   fill="#0EA5E9" />
      <circle cx="10" cy="5"  r="1.6" fill="#0EA5E9" fillOpacity="0.80" />
      <circle cx="14" cy="13" r="1.5" fill="#0EA5E9" fillOpacity="0.70" />
      <circle cx="6"  cy="9"  r="1.3" fill="#0EA5E9" fillOpacity="0.60" />
      <circle cx="8"  cy="2"  r="1.1" fill="#0EA5E9" fillOpacity="0.50" />
      <circle cx="4"  cy="15" r="1"   fill="#0EA5E9" fillOpacity="0.40" />
    </svg>
  );
}

export function LogoFull({ iconSize = 40 }: { iconSize?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
      <LogoIcon size={iconSize} />
      <div>
        <div style={{ fontWeight: 700, fontSize: "0.9375rem", letterSpacing: "-0.01em", color: "var(--text-primary)" }}>
          Inventory<span style={{ color: "var(--accent)" }}>Ops</span>
        </div>
        <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: 1 }}>
          Herbicide Inventory
        </div>
      </div>
    </div>
  );
}
