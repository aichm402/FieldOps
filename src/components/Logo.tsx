export function LogoIcon({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Sky background */}
      <rect x="0" y="0" width="48" height="16" rx="3" fill="#EFF6FF" />

      {/* Sun */}
      <circle cx="40" cy="7" r="4" fill="#FCD34D" />
      <line x1="40" y1="1"  x2="40" y2="0"  stroke="#FCD34D" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="44" y1="3"  x2="45" y2="2"  stroke="#FCD34D" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="46" y1="7"  x2="48" y2="7"  stroke="#FCD34D" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="44" y1="11" x2="45" y2="12" stroke="#FCD34D" strokeWidth="1.2" strokeLinecap="round" />

      {/* Horizon / ground line */}
      <line x1="0" y1="16" x2="48" y2="16" stroke="#16A34A" strokeWidth="1" strokeOpacity="0.4" />

      {/* === Field trial plots — 2 rows × 3 cols === */}
      {/* Row 1 */}
      <rect x="1"  y="17" width="13" height="11" rx="1.5" fill="#DCFCE7" stroke="#16A34A" strokeWidth="1" />
      <rect x="17" y="17" width="13" height="11" rx="1.5" fill="#BBF7D0" stroke="#16A34A" strokeWidth="1.2" />
      <rect x="33" y="17" width="14" height="11" rx="1.5" fill="#DCFCE7" stroke="#16A34A" strokeWidth="1" />
      {/* Row 2 */}
      <rect x="1"  y="30" width="13" height="13" rx="1.5" fill="#BBF7D0" stroke="#16A34A" strokeWidth="1" />
      <rect x="17" y="30" width="13" height="13" rx="1.5" fill="#DCFCE7" stroke="#16A34A" strokeWidth="1" />
      <rect x="33" y="30" width="14" height="13" rx="1.5" fill="#BBF7D0" stroke="#16A34A" strokeWidth="1" />

      {/* Crop row lines — plots 1, 3, 4, 6 */}
      <line x1="3"  y1="21" x2="12" y2="21" stroke="#16A34A" strokeWidth="0.8" strokeOpacity="0.45" />
      <line x1="3"  y1="24" x2="12" y2="24" stroke="#16A34A" strokeWidth="0.8" strokeOpacity="0.45" />
      <line x1="35" y1="21" x2="45" y2="21" stroke="#16A34A" strokeWidth="0.8" strokeOpacity="0.45" />
      <line x1="35" y1="24" x2="45" y2="24" stroke="#16A34A" strokeWidth="0.8" strokeOpacity="0.45" />
      <line x1="3"  y1="34" x2="12" y2="34" stroke="#16A34A" strokeWidth="0.8" strokeOpacity="0.45" />
      <line x1="3"  y1="38" x2="12" y2="38" stroke="#16A34A" strokeWidth="0.8" strokeOpacity="0.45" />
      <line x1="19" y1="34" x2="28" y2="34" stroke="#16A34A" strokeWidth="0.8" strokeOpacity="0.45" />
      <line x1="19" y1="38" x2="28" y2="38" stroke="#16A34A" strokeWidth="0.8" strokeOpacity="0.45" />

      {/* === Center plot (row 1, col 2): plant sprout === */}
      {/* Stem */}
      <line x1="23" y1="27" x2="23" y2="19" stroke="#15803D" strokeWidth="1.8" strokeLinecap="round" />
      {/* Left leaf */}
      <path d="M23 23 Q18 20 17 17" stroke="#16A34A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* Right leaf */}
      <path d="M23 23 Q28 20 29 17" stroke="#16A34A" strokeWidth="1.6" fill="none" strokeLinecap="round" />

      {/* === Bottom-right plot: rising bar chart === */}
      <rect x="35" y="39" width="2.5" height="3"  rx="0.5" fill="#16A34A" fillOpacity="0.45" />
      <rect x="39" y="36" width="2.5" height="6"  rx="0.5" fill="#16A34A" fillOpacity="0.65" />
      <rect x="43" y="32" width="2.5" height="10" rx="0.5" fill="#16A34A" fillOpacity="0.9" />
    </svg>
  );
}

export function LogoFull({ iconSize = 40 }: { iconSize?: number }) {
  const scale = iconSize / 40;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: `${0.625 * scale}rem` }}>
      <LogoIcon size={iconSize} />
      <div>
        <div style={{ fontWeight: 700, fontSize: `${0.9375 * scale}rem`, letterSpacing: "-0.01em", color: "var(--text-primary)", lineHeight: 1.2 }}>
          Field<span style={{ color: "var(--accent)" }}>Ops</span>
        </div>
        <div style={{ fontSize: `${0.6 * scale}rem`, color: "var(--text-muted)", marginTop: 2, letterSpacing: "0.01em", lineHeight: 1.2 }}>
          Research Management
        </div>
      </div>
    </div>
  );
}
