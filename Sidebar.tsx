@import "tailwindcss";
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap');

@theme {
  --color-forest: #2D5F2D;
  --color-forest-light: #3A7A3A;
  --color-forest-dim: #1E3F1E;
  --color-bark: #1C1917;
  --color-bark-light: #292524;
  --color-bark-mid: #3D3835;
  --color-cream: #FAF8F5;
  --color-cream-dark: #F0EDE8;
  --color-wheat: #D4A843;
  --color-soil: #78716C;
  --color-clay: #A8A29E;
  --color-corn: #E5A820;
  --color-soybean: #6B8E23;
  --color-noncrop: #8B7355;
  --color-popcorn: #D2691E;
  --font-sans: 'DM Sans', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

body {
  font-family: var(--font-sans);
  background: var(--color-cream);
  color: var(--color-bark);
  -webkit-font-smoothing: antialiased;
}

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #D6D3D1; border-radius: 3px; }
