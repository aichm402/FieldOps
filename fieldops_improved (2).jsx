import { useState, useEffect, useRef, useMemo, useReducer, createContext, useContext, memo } from "react";

// ============================================================
// DESIGN TOKENS
// ============================================================
const COLORS = {
  headerDark: "#1b4332",
  headerMid: "#2d6a4f",
  accent: "#d97706",
  accentDim: "#b45309",
  bgDark: "#f5f3ef",
  bgMid: "#faf9f7",
  bgCard: "#ffffff",
  bgInput: "#f0eeea",
  border: "#e2dfd9",
  borderLight: "#d4d0c8",
  textPrimary: "#1c1917",
  textSecondary: "#57534e",
  textDim: "#a8a29e",
  success: "#16a34a",
  danger: "#dc2626",
  warning: "#d97706",
  info: "#2563eb",
};

const TRT_COLORS = [
  "#6b7280","#0ea5e9","#f97316","#22c55e","#ef4444","#a855f7",
  "#eab308","#ec4899","#14b8a6","#f43f5e","#8b5cf6","#84cc16",
  "#06b6d4","#d946ef","#f59e0b","#10b981","#6366f1","#e11d48",
];

// ============================================================
// UTILITIES
// ============================================================
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

/** Fisher-Yates (Knuth) unbiased shuffle */
function fisherYatesShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generatePlotMap(reps, treatments) {
  const map = [];
  for (let r = 0; r < reps; r++) {
    const shuffled = fisherYatesShuffle(Array.from({ length: treatments }, (_, i) => i + 1));
    const row = shuffled.map((trt, t) => ({ plot: (r + 1) * 100 + (t + 1), trt }));
    map.push(row);
  }
  return map;
}

function downloadCSV(filename, headers, rows) {
  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// PERSISTENCE
// ============================================================
const STORAGE_KEY = "fieldops-state";

async function loadPersistedState() {
  try {
    if (window.storage) {
      const result = await window.storage.get(STORAGE_KEY);
      return result ? JSON.parse(result.value) : null;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function persistState(state) {
  try {
    if (window.storage) {
      await window.storage.set(STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch (e) {
    console.error("Storage save failed:", e);
  }
}

// ============================================================
// DATA — SITES, FIELDS, MOCK PROJECTS
// ============================================================
const INITIAL_SITES = [
  { id: "site1", name: "South Central Ag Lab (SCAL)", location: "Clay Center, NE", lat: 40.5731, lng: -98.1348 },
  { id: "site2", name: "Havelock Research Farm", location: "Lincoln, NE", lat: 40.8520, lng: -96.6100 },
];

const INITIAL_FIELDS = [
  {
    id: "field1", siteId: "site1", name: "East Block", acres: 12.5,
    color: "#22c55e",
    bounds: [[40.57220, -98.13620], [40.57220, -98.13340], [40.57400, -98.13340], [40.57400, -98.13620]],
    imageOverlay: null, // { dataUrl, bounds: [[sw_lat, sw_lng], [ne_lat, ne_lng]], opacity }
    polygons: [
      { id: "poly1", label: "Flexion Corn Trial", projectId: "proj1", coords: [[40.57355, -98.13560], [40.57355, -98.13480], [40.57320, -98.13480], [40.57320, -98.13560]] },
      { id: "poly2", label: "LK-22372 Efficacy", projectId: "proj2", coords: [[40.57310, -98.13560], [40.57310, -98.13380], [40.57280, -98.13380], [40.57280, -98.13560]] },
    ],
  },
  {
    id: "field2", siteId: "site1", name: "West Block", acres: 8.2,
    color: "#0ea5e9",
    bounds: [[40.57220, -98.13920], [40.57220, -98.13640], [40.57400, -98.13640], [40.57400, -98.13920]],
    imageOverlay: null,
    polygons: [],
  },
  {
    id: "field3", siteId: "site2", name: "North Field", acres: 15.0,
    color: "#f97316",
    bounds: [[40.85100, -96.61150], [40.85100, -96.60850], [40.85300, -96.60850], [40.85300, -96.61150]],
    imageOverlay: null,
    polygons: [],
  },
];

const MOCK_PROJECTS = [
  {
    id: "proj1",
    title: "25-NA-Flexion-Corn",
    trialId: "25-NA-Flexion-Corn_2",
    crop: "Corn (Zea mays)",
    variety: "GT Field Corn",
    siteId: "site1",
    fieldId: "field1",
    studyDirector: "Jansen McDaniel",
    sponsor: "SynTech Research Group",
    investigator: "Dr. Amit Jhala",
    objective: "Efficacy and selectivity of Flexion for the weed control in corn",
    designType: "RACOBL",
    plotWidth: 10,
    plotLength: 30,
    reps: 3,
    treatmentCount: 3,
    distBetweenBlocks: 1,
    distBetweenPlots: 0.5,
    status: "Active",
    notes: "Use on Glyphosate-Tolerant (GT) field corn. Flexion Weed Control in Corn.",
    plantingDate: "2025-04-15",
    harvestDate: "2025-10-01",
    applications: [
      { id: "app1a", code: "A", timing: "PREMEA", placement: "soil app", method: "SPRAY", date: "2025-04-20", completed: false, weatherLog: null },
      { id: "app1b", code: "B", timing: "EAPOWE", placement: "post", method: "SPRAY", date: "2025-05-15", completed: false, weatherLog: null },
    ],
    treatments: [
      { trtNo: 1, code: "CHK", description: "Untreated Check", products: [] },
      { trtNo: 2, code: "", description: "Flexion 32 FL OZ/A;NIS 0.25 % V/V", products: [
        { name: "Flexion", formConc: "4 LBA/GAL", formType: "L", rate: "32 fl oz/a", appCode: "B", amtToMeasure: "33.33 mL/mx" },
        { name: "NIS", formConc: "100%", formType: "SL", rate: "0.25% v/v", appCode: "B", amtToMeasure: "4.999 mL/mx" },
      ]},
      { trtNo: 3, code: "", description: "Diflexx 32 FL OZ/A;NIS 0.25 % V/V", products: [
        { name: "Diflexx", formConc: "4 LBAE/GAL", formType: "SC", rate: "32 fl oz/a", appCode: "B", amtToMeasure: "33.33 mL/mx" },
        { name: "NIS", formConc: "100%", formType: "SL", rate: "0.25% v/v", appCode: "B", amtToMeasure: "4.999 mL/mx" },
      ]},
    ],
    plotMap: [
      [{ plot: 101, trt: 1 }, { plot: 102, trt: 2 }, { plot: 103, trt: 3 }],
      [{ plot: 201, trt: 3 }, { plot: 202, trt: 1 }, { plot: 203, trt: 2 }],
      [{ plot: 301, trt: 2 }, { plot: 302, trt: 3 }, { plot: 303, trt: 1 }],
    ],
    inventory: [
      { product: "Flexion", formConc: "4 LBA/GAL", formType: "L", totalRequired: "41.667 mL" },
      { product: "NIS", formConc: "100%", formType: "SL", totalRequired: "12.499 mL" },
      { product: "Diflexx", formConc: "4 LBAE/GAL", formType: "SC", totalRequired: "41.667 mL" },
    ],
    appAmount: "15 GAL/AC",
    mixSize: "2 L",
    files: [
      { id: "f1", name: "25-NA-Flexion-Corn.prt0", category: "protocols", size: "30 KB", uploadDate: "2025-04-08" },
      { id: "f2", name: "25-NA-Flexion-Corn_Spray_Plan.pdf", category: "spray_sheets", size: "144 KB", uploadDate: "2025-04-08" },
    ],
    photos: [],
    ratings: [],
    createdAt: "2025-04-08T12:07:00Z",
  },
  {
    id: "proj2",
    title: "LK-22372 Corn Efficacy",
    trialId: "D",
    crop: "Corn (Zea mays)",
    variety: "GT Field Corn",
    siteId: "site1",
    fieldId: "field1",
    studyDirector: "",
    sponsor: "",
    investigator: "Dr. Amit Jhala",
    objective: "Evaluate the Weed Efficacy and Crop Safety of LK-22372",
    designType: "RACOBL",
    plotWidth: 10,
    plotLength: 30,
    reps: 3,
    treatmentCount: 17,
    distBetweenBlocks: 1,
    distBetweenPlots: 0.5,
    status: "Active",
    notes: "LK-22372 dose response with and without atrazine tank mix partner.",
    plantingDate: "2025-04-18",
    harvestDate: "2025-10-10",
    applications: [
      { id: "app2a", code: "A", timing: "PRE", placement: "soil app", method: "SPRAY", date: "2025-04-22", completed: false, weatherLog: null },
      { id: "app2b", code: "B", timing: "POST", placement: "post", method: "SPRAY", date: "2025-05-20", completed: false, weatherLog: null },
    ],
    treatments: [
      { trtNo: 1, code: "CHK", description: "Untreated Check", products: [] },
      { trtNo: 2, code: "", description: "Resicore 2.5 QT/A + Roundup PowerMAX 3 32 FL OZ/A + Diflexx 10 FL OZ/A", products: [
        { name: "Resicore", formConc: "3.29 LB/GAL", formType: "EC", rate: "2.5 qt/a", appCode: "A", amtToMeasure: "83.33 mL/mx" },
        { name: "Roundup PowerMAX 3", formConc: "575 gAE/L", formType: "SL", rate: "32 fl oz/a", appCode: "B", amtToMeasure: "33.33 mL/mx" },
        { name: "Diflexx", formConc: "4 LBAE/GAL", formType: "SC", rate: "10 fl oz/a", appCode: "B", amtToMeasure: "10.42 mL/mx" },
      ]},
      { trtNo: 3, code: "", description: "LK-22372 EC (II) 10 g AI/ha", products: [
        { name: "LK-22372 EC (II)", formConc: "0.351 LBA/GAL", formType: "EC", rate: "10 g ai/ha", appCode: "B", amtToMeasure: "3.389 mL/mx" },
        { name: "MSO", formConc: "100%", formType: "L", rate: "1% v/v", appCode: "B", amtToMeasure: "20.0 mL/mx" },
        { name: "AMS", formConc: "3.4 LB/GAL", formType: "SL", rate: "2.5% v/v", appCode: "B", amtToMeasure: "49.99 mL/mx" },
      ]},
      { trtNo: 4, code: "", description: "LK-22372 EC (II) 20 g AI/ha", products: [] },
      { trtNo: 5, code: "", description: "LK-22372 EC (II) 22.5 g AI/ha", products: [] },
      { trtNo: 6, code: "", description: "LK-22372 EC (II) 25 g AI/ha", products: [] },
      { trtNo: 7, code: "", description: "LK-22372 EC (II) 27.5 g AI/ha", products: [] },
      { trtNo: 8, code: "", description: "LK-22372 EC (II) 30 g AI/ha", products: [] },
      { trtNo: 9, code: "", description: "LK-22372 EC (II) 60 g AI/ha", products: [] },
      { trtNo: 10, code: "", description: "Armezon 24.5 g AI/ha", products: [] },
      { trtNo: 11, code: "", description: "Laudis 92.1 g AI/ha", products: [] },
      { trtNo: 12, code: "", description: "Shieldex 29.2 g AI/ha", products: [] },
      { trtNo: 13, code: "", description: "LK-22372 15 g + Atrazine 560 g", products: [] },
      { trtNo: 14, code: "", description: "LK-22372 17.5 g + Atrazine 560 g", products: [] },
      { trtNo: 15, code: "", description: "LK-22372 20 g + Atrazine 560 g", products: [] },
      { trtNo: 16, code: "", description: "LK-22372 40 g + Atrazine 1120 g", products: [] },
      { trtNo: 17, code: "", description: "Armezon 18.4 g + Atrazine 560 g", products: [] },
    ],
    plotMap: [
      [{ plot:101,trt:1 },{ plot:102,trt:2 },{ plot:103,trt:3 },{ plot:104,trt:4 },{ plot:105,trt:5 },{ plot:106,trt:6 },{ plot:107,trt:7 },{ plot:108,trt:8 },{ plot:109,trt:9 },{ plot:110,trt:10 },{ plot:111,trt:11 },{ plot:112,trt:12 },{ plot:113,trt:13 },{ plot:114,trt:14 },{ plot:115,trt:15 },{ plot:116,trt:16 },{ plot:117,trt:17 }],
      [{ plot:201,trt:10 },{ plot:202,trt:15 },{ plot:203,trt:9 },{ plot:204,trt:13 },{ plot:205,trt:8 },{ plot:206,trt:1 },{ plot:207,trt:3 },{ plot:208,trt:12 },{ plot:209,trt:11 },{ plot:210,trt:7 },{ plot:211,trt:4 },{ plot:212,trt:14 },{ plot:213,trt:5 },{ plot:214,trt:6 },{ plot:215,trt:17 },{ plot:216,trt:2 },{ plot:217,trt:16 }],
      [{ plot:301,trt:1 },{ plot:302,trt:2 },{ plot:303,trt:8 },{ plot:304,trt:10 },{ plot:305,trt:12 },{ plot:306,trt:9 },{ plot:307,trt:14 },{ plot:308,trt:3 },{ plot:309,trt:13 },{ plot:310,trt:16 },{ plot:311,trt:11 },{ plot:312,trt:17 },{ plot:313,trt:6 },{ plot:314,trt:5 },{ plot:315,trt:5 },{ plot:316,trt:7 },{ plot:317,trt:15 }],
    ],
    inventory: [
      { product: "Resicore", formConc: "3.29 LB/GAL", formType: "EC", totalRequired: "104.166 mL" },
      { product: "Roundup PowerMAX 3", formConc: "575 gAE/L", formType: "SL", totalRequired: "41.667 mL" },
      { product: "Diflexx", formConc: "4 LBAE/GAL", formType: "SC", totalRequired: "13.021 mL" },
      { product: "AMS", formConc: "3.4 LB/GAL", formType: "SL", totalRequired: "1,012.390 mL" },
      { product: "COC", formConc: "100%", formType: "SL", totalRequired: "74.992 mL" },
      { product: "LK-22372 EC (II)", formConc: "0.351 LBA/GAL", formType: "EC", totalRequired: "121.796 mL" },
      { product: "MSO", formConc: "100%", formType: "L", totalRequired: "324.965 mL" },
      { product: "Armezon", formConc: "2.8 LBA/GAL", formType: "SC", totalRequired: "2.278 mL" },
      { product: "Laudis", formConc: "3.5 lb/gal", formType: "SC", totalRequired: "3.913 mL" },
      { product: "Shieldex", formConc: "3.33 LB/GAL", formType: "SC", totalRequired: "1.304 mL" },
      { product: "Atrazine", formConc: "4 LBA/GAL", formType: "F", totalRequired: "124.905 mL" },
    ],
    appAmount: "15 GAL/AC",
    mixSize: "2 L",
    files: [
      { id: "f3", name: "Evaluate_LK-22372.prt0", category: "protocols", size: "35 KB", uploadDate: "2025-04-10" },
      { id: "f4", name: "corn_lk22372_Spray_Plan.pdf", category: "spray_sheets", size: "218 KB", uploadDate: "2025-04-10" },
    ],
    photos: [],
    ratings: [],
    createdAt: "2025-04-10T09:50:00Z",
  },
];

const INITIAL_AUDIT = [
  { id: "a1", action: "Project Created", detail: "25-NA-Flexion-Corn", user: "Dr. Amit Jhala", timestamp: "2025-04-08T12:07:00Z" },
  { id: "a2", action: "File Uploaded", detail: "25-NA-Flexion-Corn.prt0 → 25-NA-Flexion-Corn", user: "Dr. Amit Jhala", timestamp: "2025-04-08T12:08:00Z" },
  { id: "a3", action: "Project Created", detail: "LK-22372 Corn Efficacy", user: "Dr. Amit Jhala", timestamp: "2025-04-10T09:50:00Z" },
  { id: "a4", action: "File Uploaded", detail: "corn_lk22372_Spray_Plan.pdf → LK-22372 Corn Efficacy", user: "Dr. Amit Jhala", timestamp: "2025-04-10T09:51:00Z" },
];

// ============================================================
// REDUCER — separated audit logging into helper
// ============================================================
function withAudit(state, action, detail) {
  return {
    auditLog: [...state.auditLog, {
      id: generateId(),
      action,
      detail,
      user: state.currentUser,
      timestamp: new Date().toISOString(),
    }],
  };
}

function appReducer(state, action) {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, ...action.payload };

    case "ADD_PROJECT": {
      const audit = withAudit(state, "Project Created", action.payload.title);
      return { ...state, projects: [...state.projects, action.payload], ...audit };
    }
    case "UPDATE_PROJECT": {
      const audit = withAudit(state, "Project Updated", action.payload.title);
      return { ...state, projects: state.projects.map(p => p.id === action.payload.id ? action.payload : p), ...audit };
    }
    case "DELETE_PROJECT": {
      const audit = withAudit(state, "Project Deleted", action.payload);
      return { ...state, projects: state.projects.filter(p => p.id !== action.payload), ...audit };
    }
    case "ADD_RATING": {
      const proj = state.projects.find(p => p.id === action.payload.projectId);
      if (!proj) return state;
      const updated = { ...proj, ratings: [...proj.ratings, action.payload.rating] };
      const audit = withAudit(state, "Rating Recorded", `${proj.title} — ${action.payload.rating.event}`);
      return { ...state, projects: state.projects.map(p => p.id === proj.id ? updated : p), ...audit };
    }
    case "ADD_FILE": {
      const proj = state.projects.find(p => p.id === action.payload.projectId);
      if (!proj) return state;
      const updated = { ...proj, files: [...proj.files, action.payload.file] };
      const audit = withAudit(state, "File Uploaded", `${action.payload.file.name} → ${proj.title}`);
      return { ...state, projects: state.projects.map(p => p.id === proj.id ? updated : p), ...audit };
    }
    case "ADD_AUDIT": {
      return { ...state, auditLog: [...state.auditLog, { id: generateId(), ...action.payload, user: state.currentUser, timestamp: new Date().toISOString() }] };
    }
    case "ADD_MAP_POLYGON": {
      const audit = withAudit(state, "Map Edit", `Created polygon: ${action.payload.label}`);
      return { ...state, mapPolygons: [...state.mapPolygons, action.payload], ...audit };
    }
    case "ADD_FIELD": {
      const audit = withAudit(state, "Field Created", action.payload.name);
      return { ...state, fields: [...state.fields, action.payload], ...audit };
    }
    case "UPDATE_FIELD": {
      return { ...state, fields: state.fields.map(f => f.id === action.payload.id ? { ...f, ...action.payload } : f) };
    }
    case "UPDATE_FIELD_IMAGE": {
      const { fieldId, imageOverlay } = action.payload;
      const audit = withAudit(state, "Field Image Updated", state.fields.find(f => f.id === fieldId)?.name || fieldId);
      return { ...state, fields: state.fields.map(f => f.id === fieldId ? { ...f, imageOverlay } : f), ...audit };
    }
    case "ADD_FIELD_POLYGON": {
      const { fieldId, polygon } = action.payload;
      const field = state.fields.find(f => f.id === fieldId);
      if (!field) return state;
      const updated = { ...field, polygons: [...field.polygons, polygon] };
      const audit = withAudit(state, "Project Area Created", `${polygon.label} in ${field.name}`);
      return { ...state, fields: state.fields.map(f => f.id === fieldId ? updated : f), ...audit };
    }
    case "DELETE_FIELD_POLYGON": {
      const { fieldId, polygonId } = action.payload;
      const field = state.fields.find(f => f.id === fieldId);
      if (!field) return state;
      const updated = { ...field, polygons: field.polygons.filter(p => p.id !== polygonId) };
      const audit = withAudit(state, "Project Area Deleted", `Removed area from ${field.name}`);
      return { ...state, fields: state.fields.map(f => f.id === fieldId ? updated : f), ...audit };
    }
    default:
      return state;
  }
}

// ============================================================
// CONTEXT — split into stable references
// ============================================================
const AppContext = createContext();

// ============================================================
// ICONS (inline SVG — memo-wrapped to prevent re-render)
// ============================================================
const Icon = memo(({ d, size = 18, color = "currentColor", ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{typeof d === 'string' ? <path d={d} /> : d}</svg>
));
const HomeIcon = (p) => <Icon {...p} d={<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>} />;
const ProjectIcon = (p) => <Icon {...p} d={<><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></>} />;
const MapIcon = (p) => <Icon {...p} d={<><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></>} />;
const CalendarIcon = (p) => <Icon {...p} d={<><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>} />;
const BeakerIcon = (p) => <Icon {...p} d={<><path d="M9 3h6v5.5l4 7.5H5l4-7.5V3z"/><line x1="8" y1="3" x2="16" y2="3"/></>} />;
const FileIcon = (p) => <Icon {...p} d={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>} />;
const ClockIcon = (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} />;
const PlusIcon = (p) => <Icon {...p} d={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>} />;
const SearchIcon = (p) => <Icon {...p} d={<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>} />;
const XIcon = (p) => <Icon {...p} d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />;
const UploadIcon = (p) => <Icon {...p} d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>} />;
const GridIcon = (p) => <Icon {...p} d={<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>} />;
const UserIcon = (p) => <Icon {...p} d={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>} />;
const WindIcon = (p) => <Icon {...p} d={<><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></>} />;
const SunIcon = (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>} />;
const DownloadIcon = (p) => <Icon {...p} d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>} />;
const TrashIcon = (p) => <Icon {...p} d={<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>} />;
const EyeIcon = (p) => <Icon {...p} d={<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>} />;
const LayersIcon = (p) => <Icon {...p} d={<><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>} />;
const ChevronRight = (p) => <Icon {...p} d="M9 18l6-6-6-6" />;
const ChevronDown = (p) => <Icon {...p} d="M6 9l6 6 6-6" />;
const AlertTriangle = (p) => <Icon {...p} d={<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>} />;
const CheckCircle = (p) => <Icon {...p} d={<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>} />;
const ImageIcon = (p) => <Icon {...p} d={<><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>} />;
const ExternalLinkIcon = (p) => <Icon {...p} d={<><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>} />;
const SettingsIcon = (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>} />;

// ============================================================
// SIMULATED WEATHER
// ============================================================
function getSimulatedWeather() {
  return {
    temp: Math.floor(68 + Math.random() * 20),
    wind: Math.floor(3 + Math.random() * 15),
    humidity: Math.floor(40 + Math.random() * 40),
    rainForecast: Math.random() > 0.7,
    condition: Math.random() > 0.5 ? "Partly Cloudy" : "Clear",
    updated: new Date().toLocaleTimeString(),
  };
}

function getSprayCondition(weather) {
  const safe = weather.wind < 10 && weather.temp < 85 && !weather.rainForecast;
  return {
    safe,
    label: safe ? "GO — Spray Conditions Acceptable" : "NO GO — Conditions Unfavorable",
    reasons: [
      weather.wind >= 10 ? `Wind ${weather.wind} mph (≥10)` : null,
      weather.temp >= 85 ? `Temp ${weather.temp}°F (≥85)` : null,
      weather.rainForecast ? "Rain forecast within 6 hrs" : null,
    ].filter(Boolean),
  };
}

// ============================================================
// COMMON UI COMPONENTS
// ============================================================
const Badge = memo(({ children, color = COLORS.accent, bg }) => (
  <span style={{ background: bg || color + "22", color, padding: "2px 8px", borderRadius: 3, fontSize: 11, fontWeight: 600, fontFamily: "monospace", letterSpacing: 0.5, whiteSpace: "nowrap" }}>{children}</span>
));

const Btn = memo(({ children, variant = "primary", size = "md", onClick, disabled, style, ...props }) => {
  const base = { border: "1px solid transparent", cursor: disabled ? "default" : "pointer", fontWeight: 600, fontFamily: "'Fira Code', monospace", transition: "all 0.15s", display: "inline-flex", alignItems: "center", gap: 6, opacity: disabled ? 0.5 : 1, borderRadius: 3 };
  const sizes = { sm: { padding: "4px 10px", fontSize: 11 }, md: { padding: "7px 16px", fontSize: 12 }, lg: { padding: "10px 22px", fontSize: 13 } };
  const variants = {
    primary: { background: COLORS.accent, color: "#fff", borderColor: COLORS.accent },
    secondary: { background: "transparent", color: COLORS.textSecondary, borderColor: COLORS.border },
    danger: { background: COLORS.danger + "22", color: COLORS.danger, borderColor: COLORS.danger + "44" },
    success: { background: COLORS.success + "22", color: COLORS.success, borderColor: COLORS.success + "44" },
    ghost: { background: "transparent", color: COLORS.textSecondary, borderColor: "transparent" },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      {...props}
    >
      {children}
    </button>
  );
});

const Input = ({ label, id, ...props }) => {
  const inputId = id || `input-${label?.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <label htmlFor={inputId} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: COLORS.textSecondary, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
      {label}
      <input id={inputId} {...props} style={{ background: COLORS.bgInput, border: `1px solid ${COLORS.border}`, borderRadius: 3, padding: "7px 10px", color: COLORS.textPrimary, fontSize: 13, fontFamily: "'Fira Code', monospace", outline: "none", ...props.style }} />
    </label>
  );
};

const Select = ({ label, options, id, ...props }) => {
  const selectId = id || `select-${label?.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <label htmlFor={selectId} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: COLORS.textSecondary, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
      {label}
      <select id={selectId} {...props} style={{ background: COLORS.bgInput, border: `1px solid ${COLORS.border}`, borderRadius: 3, padding: "7px 10px", color: COLORS.textPrimary, fontSize: 13, fontFamily: "'Fira Code', monospace", outline: "none", ...props.style }}>
        {options.map(o => <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>{typeof o === 'string' ? o : o.label}</option>)}
      </select>
    </label>
  );
};

const TextArea = ({ label, id, ...props }) => {
  const taId = id || `ta-${label?.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <label htmlFor={taId} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: COLORS.textSecondary, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
      {label}
      <textarea id={taId} {...props} style={{ background: COLORS.bgInput, border: `1px solid ${COLORS.border}`, borderRadius: 3, padding: "7px 10px", color: COLORS.textPrimary, fontSize: 13, fontFamily: "'Fira Code', monospace", outline: "none", resize: "vertical", minHeight: 60, ...props.style }} />
    </label>
  );
};

const Card = memo(({ children, style, onClick }) => (
  <div onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(e); } } : undefined} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: 16, cursor: onClick ? "pointer" : "default", transition: "border-color 0.15s, box-shadow 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", ...style }}>{children}</div>
));

const Table = memo(({ columns, data, onRowClick }) => (
  <div style={{ overflowX: "auto" }} role="table" aria-label="Data table">
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead>
        <tr>{columns.map(c => <th key={c.key} style={{ textAlign: "left", padding: "8px 10px", borderBottom: `2px solid ${COLORS.border}`, color: COLORS.textSecondary, fontWeight: 600, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", fontFamily: "'Fira Code', monospace", whiteSpace: "nowrap" }}>{c.label}</th>)}</tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={row.id || i} onClick={() => onRowClick?.(row)} onKeyDown={onRowClick ? (e) => { if (e.key === "Enter") onRowClick(row); } : undefined} tabIndex={onRowClick ? 0 : undefined} role={onRowClick ? "button" : undefined} style={{ cursor: onRowClick ? "pointer" : "default", borderBottom: `1px solid ${COLORS.border}22` }}>
            {columns.map(c => <td key={c.key} style={{ padding: "8px 10px", color: COLORS.textPrimary, fontFamily: c.mono ? "'Fira Code', monospace" : "inherit", fontSize: 12, whiteSpace: "nowrap" }}>{c.render ? c.render(row) : row[c.key]}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
));

const Modal = ({ open, onClose, title, children, width = 600 }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    // Focus trap — focus the modal on open
    modalRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)" }} onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div ref={modalRef} tabIndex={-1} onClick={e => e.stopPropagation()} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 8, width, maxWidth: "95vw", maxHeight: "90vh", overflow: "auto", outline: "none", boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: `1px solid ${COLORS.border}` }}>
          <span style={{ fontWeight: 700, color: COLORS.textPrimary, fontSize: 15 }}>{title}</span>
          <button onClick={onClose} aria-label="Close modal" style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textSecondary, padding: 4 }}><XIcon size={18} /></button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
};

const TabBar = ({ tabs, active, onChange }) => (
  <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${COLORS.border}`, marginBottom: 16 }} role="tablist">
    {tabs.map(t => (
      <button key={t.id} onClick={() => onChange(t.id)} role="tab" aria-selected={active === t.id} aria-controls={`panel-${t.id}`} style={{ padding: "8px 18px", background: "none", border: "none", borderBottom: active === t.id ? `2px solid ${COLORS.accent}` : "2px solid transparent", color: active === t.id ? COLORS.accent : COLORS.textSecondary, cursor: "pointer", fontWeight: 600, fontSize: 12, fontFamily: "'Fira Code', monospace", marginBottom: -2, transition: "all 0.15s" }}>{t.label}</button>
    ))}
  </div>
);

/** Toast notification */
function Toast({ message, type = "success", onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const color = type === "success" ? COLORS.success : type === "error" ? COLORS.danger : COLORS.info;
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 2000, background: COLORS.bgCard, border: `1px solid ${color}44`, borderLeft: `4px solid ${color}`, borderRadius: 6, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 8px 32px rgba(0,0,0,0.1)", animation: "slideIn 0.25s ease-out" }}>
      {type === "success" ? <CheckCircle size={16} color={color} /> : <AlertTriangle size={16} color={color} />}
      <span style={{ fontSize: 12, color: COLORS.textPrimary, fontWeight: 500 }}>{message}</span>
    </div>
  );
}

// ============================================================
// HEADER
// ============================================================
function Header({ weather }) {
  const { state } = useContext(AppContext);
  const condition = useMemo(() => getSprayCondition(weather), [weather]);
  return (
    <header style={{ background: `linear-gradient(135deg, ${COLORS.headerDark}, ${COLORS.headerMid})`, padding: "0 20px", height: 52, display: "flex", alignItems: "center", gap: 16, borderBottom: `3px solid ${COLORS.accent}`, flexShrink: 0 }} role="banner">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <LayersIcon size={22} color={COLORS.accent} />
        <span style={{ fontFamily: "'Fira Code', monospace", fontWeight: 800, fontSize: 18, color: "#fff", letterSpacing: 1.5 }}>FieldOps</span>
      </div>
      <div style={{ flex: 1 }} />
      <div aria-label={`Spray conditions: ${condition.safe ? "Go" : "No-Go"}`} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 3, background: condition.safe ? "#22c55e22" : "#ef444422", border: `1px solid ${condition.safe ? "#22c55e" : "#ef4444"}55` }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: condition.safe ? "#4ade80" : "#f87171", animation: condition.safe ? "none" : "pulse 1.5s infinite" }} />
        <span style={{ fontSize: 10, fontWeight: 600, color: condition.safe ? "#4ade80" : "#f87171", fontFamily: "'Fira Code', monospace" }}>SPRAY {condition.safe ? "GO" : "NO-GO"}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "#c8d6cc", fontFamily: "'Fira Code', monospace" }}>
        <span><WindIcon size={13} /> {weather.wind}mph</span>
        <span><SunIcon size={13} /> {weather.temp}°F</span>
        <span>{weather.humidity}% RH</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "rgba(255,255,255,0.12)", borderRadius: 3 }}>
        <UserIcon size={14} color="#c8d6cc" />
        <span style={{ fontSize: 11, color: "#c8d6cc" }}>{state.currentUser}</span>
      </div>
    </header>
  );
}

// ============================================================
// SIDEBAR — keyboard-navigable
// ============================================================
function Sidebar({ active, onNavigate }) {
  const items = [
    { id: "home", label: "Home", icon: HomeIcon },
    { id: "projects", label: "Projects", icon: ProjectIcon },
    { id: "map", label: "Interactive Map", icon: MapIcon },
    { id: "calendar", label: "Calendar", icon: CalendarIcon },
    { id: "inventory", label: "Herbicide Inventory", icon: BeakerIcon },
    { id: "files", label: "Files", icon: FileIcon },
    { id: "audit", label: "Audit Log", icon: ClockIcon },
  ];
  return (
    <nav style={{ width: 200, background: COLORS.bgMid, borderRight: `1px solid ${COLORS.border}`, padding: "12px 0", flexShrink: 0, display: "flex", flexDirection: "column", gap: 2 }} role="navigation" aria-label="Main navigation">
      {items.map(item => {
        const isActive = active === item.id;
        return (
          <button key={item.id} onClick={() => onNavigate(item.id)} aria-current={isActive ? "page" : undefined} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", background: isActive ? COLORS.accent + "18" : "transparent", border: "none", borderLeft: isActive ? `3px solid ${COLORS.accent}` : "3px solid transparent", color: isActive ? COLORS.accent : COLORS.textSecondary, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'Fira Code', monospace", textAlign: "left", transition: "all 0.15s" }}>
            <item.icon size={16} color={isActive ? COLORS.accent : COLORS.textDim} />
            {item.label}
          </button>
        );
      })}
      <div style={{ flex: 1 }} />
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${COLORS.border}`, fontSize: 9, color: COLORS.textDim, fontFamily: "'Fira Code', monospace" }}>
        FieldOps v0.2.0<br />UNL Weed Science
      </div>
    </nav>
  );
}

// ============================================================
// SEASON OVERVIEW (Gantt) — memoized
// ============================================================
const SeasonOverview = memo(function SeasonOverview() {
  const { state } = useContext(AppContext);
  const projects = state.projects;

  const { minDate, maxDate, totalDays, months } = useMemo(() => {
    if (!projects.length) return { minDate: null, maxDate: null, totalDays: 0, months: [] };
    const allDates = projects.flatMap(p => {
      const dates = [];
      if (p.plantingDate) dates.push(new Date(p.plantingDate));
      if (p.harvestDate) dates.push(new Date(p.harvestDate));
      p.applications?.forEach(a => { if (a.date) dates.push(new Date(a.date)); });
      return dates;
    }).filter(d => !isNaN(d));

    if (!allDates.length) return { minDate: null, maxDate: null, totalDays: 0, months: [] };

    const mn = new Date(Math.min(...allDates));
    const mx = new Date(Math.max(...allDates));
    mn.setDate(mn.getDate() - 7);
    mx.setDate(mx.getDate() + 7);
    const td = (mx - mn) / (1000 * 60 * 60 * 24);

    const ms = [];
    const cur = new Date(mn);
    cur.setDate(1);
    while (cur <= mx) {
      ms.push({ label: cur.toLocaleString('default', { month: 'short', year: '2-digit' }), pos: ((cur - mn) / (1000 * 60 * 60 * 24)) / td * 100 });
      cur.setMonth(cur.getMonth() + 1);
    }
    return { minDate: mn, maxDate: mx, totalDays: td, months: ms };
  }, [projects]);

  if (!minDate) return null;

  const toPercent = (d) => {
    const date = new Date(d);
    return ((date - minDate) / (1000 * 60 * 60 * 24)) / totalDays * 100;
  };

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: COLORS.textPrimary }}>Season Overview</span>
        <Badge>{projects.length} Active Trials</Badge>
      </div>
      <div style={{ position: "relative", paddingTop: 20 }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", height: 18 }}>
          {months.map((m, i) => (
            <span key={i} style={{ position: "absolute", left: `${Math.max(0, Math.min(95, m.pos))}%`, fontSize: 9, color: COLORS.textDim, fontFamily: "'Fira Code', monospace", whiteSpace: "nowrap" }}>{m.label}</span>
          ))}
        </div>
        {projects.map((p) => {
          const plantPos = p.plantingDate ? toPercent(p.plantingDate) : 0;
          const harvestPos = p.harvestDate ? toPercent(p.harvestDate) : 100;
          return (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, height: 26 }}>
              <span style={{ width: 140, fontSize: 10, color: COLORS.textSecondary, fontFamily: "'Fira Code', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>{p.title}</span>
              <div style={{ flex: 1, position: "relative", height: 18, background: COLORS.bgInput, borderRadius: 2 }}>
                <div style={{ position: "absolute", left: `${plantPos}%`, width: `${harvestPos - plantPos}%`, height: "100%", background: COLORS.headerMid + "66", borderRadius: 2 }} />
                {p.applications?.map((a, ai) => a.date ? (
                  <div key={ai} title={`App ${a.code} — ${a.timing} — ${a.date}`} style={{ position: "absolute", left: `${toPercent(a.date)}%`, top: 2, width: 14, height: 14, borderRadius: 2, background: a.timing?.includes("PRE") ? COLORS.info : COLORS.warning, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 800, color: "#fff" }}>{a.code}</div>
                ) : null)}
                {p.plantingDate && <div title={`Planting: ${p.plantingDate}`} style={{ position: "absolute", left: `${plantPos}%`, top: 2, width: 14, height: 14, borderRadius: 2, background: COLORS.success, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 7, fontWeight: 800, color: "#fff" }}>P</span></div>}
                {p.harvestDate && <div title={`Harvest: ${p.harvestDate}`} style={{ position: "absolute", left: `${Math.min(harvestPos, 98)}%`, top: 2, width: 14, height: 14, borderRadius: 2, background: COLORS.danger, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 7, fontWeight: 800, color: "#fff" }}>H</span></div>}
              </div>
            </div>
          );
        })}
        <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 9, color: COLORS.textDim }}>
          <span><span style={{ display: "inline-block", width: 8, height: 8, background: COLORS.success, borderRadius: 2, marginRight: 3 }}/>Planting</span>
          <span><span style={{ display: "inline-block", width: 8, height: 8, background: COLORS.info, borderRadius: 2, marginRight: 3 }}/>PRE App</span>
          <span><span style={{ display: "inline-block", width: 8, height: 8, background: COLORS.warning, borderRadius: 2, marginRight: 3 }}/>POST App</span>
          <span><span style={{ display: "inline-block", width: 8, height: 8, background: COLORS.danger, borderRadius: 2, marginRight: 3 }}/>Harvest</span>
        </div>
      </div>
    </Card>
  );
});

// ============================================================
// PROJECT CARD
// ============================================================
function ProjectCard({ project, onOpen, onNavigate }) {
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 10, border: `1px solid ${COLORS.border}`, position: "relative", overflow: "hidden" }} onClick={() => onOpen(project)}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.headerMid})` }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 4 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: COLORS.textPrimary, lineHeight: 1.3 }}>{project.title}</span>
        <Badge color={project.status === "Active" ? COLORS.success : COLORS.textDim}>{project.status}</Badge>
      </div>
      <div style={{ fontSize: 11, color: COLORS.textSecondary }}>{project.crop}{project.variety ? ` — ${project.variety}` : ""}</div>
      <div style={{ fontSize: 11, color: COLORS.textDim, lineHeight: 1.4 }}>{project.notes?.substring(0, 80)}{project.notes?.length > 80 ? "..." : ""}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", fontSize: 10, fontFamily: "'Fira Code', monospace", color: COLORS.textSecondary, marginTop: 4, paddingTop: 8, borderTop: `1px solid ${COLORS.border}` }}>
        <span>PLANT <span style={{ color: COLORS.success }}>{project.plantingDate || "—"}</span></span>
        <span>HARVEST <span style={{ color: COLORS.danger }}>{project.harvestDate || "—"}</span></span>
        {project.applications?.map((a, i) => (
          <span key={a.id || i}>APP {a.code} <span style={{ color: COLORS.warning }}>{a.date || "—"}</span></span>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 10, fontFamily: "'Fira Code', monospace", color: COLORS.textDim }}>
        <span>TRT: {project.treatmentCount} | REP: {project.reps}</span>
        <span>PLOTS: {project.treatmentCount * project.reps}</span>
        <span>PLOT: {project.plotWidth}×{project.plotLength} ft</span>
        <span>DESIGN: RCB</span>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <Btn size="sm" onClick={(e) => { e.stopPropagation(); onOpen(project); }}>Open Project</Btn>
        <Btn size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onNavigate("map"); }}>Map</Btn>
        <Btn size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onNavigate("files"); }}>Files</Btn>
      </div>
    </Card>
  );
}

// ============================================================
// NEW PROJECT MODAL — resets form on close
// ============================================================
const EMPTY_FORM = { title: "", crop: "Corn (Zea mays)", variety: "", siteId: INITIAL_SITES[0].id, fieldId: INITIAL_FIELDS[0].id, objective: "", notes: "", plotWidth: 10, plotLength: 30, reps: 3, treatmentCount: 3, plantingDate: "", harvestDate: "" };
const EMPTY_APPS = [{ code: "A", timing: "PRE", placement: "soil app", method: "SPRAY", date: "" }];

function NewProjectModal({ open, onClose }) {
  const { state, dispatch } = useContext(AppContext);
  const [form, setForm] = useState(EMPTY_FORM);
  const [apps, setApps] = useState(EMPTY_APPS);
  const [armPdf, setArmPdf] = useState(null);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});

  // FIX: Reset form state whenever modal opens or closes
  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setApps([{ code: "A", timing: "PRE", placement: "soil app", method: "SPRAY", date: "" }]);
      setArmPdf(null);
      setStep(1);
      setErrors({});
    }
  }, [open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addApp = () => setApps(a => [...a, { code: String.fromCharCode(65 + a.length), timing: "POST", placement: "post", method: "SPRAY", date: "" }]);
  const removeApp = (i) => setApps(a => a.filter((_, j) => j !== i));
  const updateApp = (i, k, v) => setApps(a => a.map((app, j) => j === i ? { ...app, [k]: v } : app));

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (form.reps < 1) errs.reps = "Must have at least 1 rep";
    if (form.treatmentCount < 2) errs.treatmentCount = "Must have at least 2 treatments";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreate = () => {
    if (!validate()) return;
    const proj = {
      id: generateId(),
      ...form,
      trialId: form.title,
      studyDirector: "",
      sponsor: "",
      investigator: state.currentUser,
      designType: "RACOBL",
      distBetweenBlocks: 1,
      distBetweenPlots: 0.5,
      status: "Active",
      applications: apps.map(a => ({ id: generateId(), ...a, completed: false, weatherLog: null })),
      treatments: Array.from({ length: form.treatmentCount }, (_, i) => ({
        trtNo: i + 1, code: i === 0 ? "CHK" : "", description: i === 0 ? "Untreated Check" : `Treatment ${i + 1}`, products: []
      })),
      plotMap: generatePlotMap(form.reps, form.treatmentCount),
      inventory: [],
      appAmount: "15 GAL/AC",
      mixSize: "2 L",
      files: armPdf ? [{ id: generateId(), name: armPdf.name, category: armPdf.name.endsWith('.pdf') ? "spray_sheets" : "protocols", size: `${Math.round(armPdf.size / 1024)} KB`, uploadDate: new Date().toISOString().split("T")[0] }] : [],
      photos: [],
      ratings: [],
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: "ADD_PROJECT", payload: proj });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Create New Project" width={720}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[1, 2, 3].map(s => (
          <div key={s} onClick={() => s < step ? setStep(s) : null} style={{ flex: 1, height: 4, background: step >= s ? COLORS.accent : COLORS.border, borderRadius: 2, cursor: s < step ? "pointer" : "default", transition: "background 0.2s" }} role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={3} />
        ))}
      </div>
      <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 12, fontFamily: "'Fira Code', monospace" }}>
        STEP {step} OF 3 — {step === 1 ? "TRIAL DETAILS" : step === 2 ? "APPLICATIONS & SCHEDULE" : "UPLOAD ARM PDF"}
      </div>

      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input label="Trial Title *" value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. 25-NA-Flexion-Corn" />
          {errors.title && <span style={{ color: COLORS.danger, fontSize: 11, marginTop: -8 }}>{errors.title}</span>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Crop" value={form.crop} onChange={e => set("crop", e.target.value)} />
            <Input label="Variety" value={form.variety} onChange={e => set("variety", e.target.value)} placeholder="e.g. GT Field Corn" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Select label="Research Site" options={INITIAL_SITES.map(s => ({ value: s.id, label: s.name }))} value={form.siteId} onChange={e => set("siteId", e.target.value)} />
            <Select label="Field" options={state.fields.filter(f => f.siteId === form.siteId).map(f => ({ value: f.id, label: f.name }))} value={form.fieldId} onChange={e => set("fieldId", e.target.value)} />
          </div>
          <TextArea label="Objective" value={form.objective} onChange={e => set("objective", e.target.value)} />
          <TextArea label="Field Notes" value={form.notes} onChange={e => set("notes", e.target.value)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
            <Input label="Plot Width (ft)" type="number" value={form.plotWidth} onChange={e => set("plotWidth", +e.target.value)} />
            <Input label="Plot Length (ft)" type="number" value={form.plotLength} onChange={e => set("plotLength", +e.target.value)} />
            <Input label="Reps" type="number" value={form.reps} onChange={e => set("reps", +e.target.value)} />
            <Input label="Treatments" type="number" value={form.treatmentCount} onChange={e => set("treatmentCount", +e.target.value)} />
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Planting Date" type="date" value={form.plantingDate} onChange={e => set("plantingDate", e.target.value)} />
            <Input label="Harvest Date" type="date" value={form.harvestDate} onChange={e => set("harvestDate", e.target.value)} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 12, color: COLORS.textPrimary }}>Application Events</span>
            <Btn size="sm" variant="secondary" onClick={addApp}><PlusIcon size={12} /> Add Application</Btn>
          </div>
          {apps.map((a, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 1fr 30px", gap: 8, alignItems: "end" }}>
              <Input label="Code" value={a.code} onChange={e => updateApp(i, "code", e.target.value)} />
              <Select label="Timing" options={["PRE","PREMEA","EAPOWE","POST","LPOST"]} value={a.timing} onChange={e => updateApp(i, "timing", e.target.value)} />
              <Select label="Placement" options={["soil app","post","broadcast","banded"]} value={a.placement} onChange={e => updateApp(i, "placement", e.target.value)} />
              <Input label="Date" type="date" value={a.date} onChange={e => updateApp(i, "date", e.target.value)} />
              {apps.length > 1 && <button onClick={() => removeApp(i)} aria-label={`Remove application ${a.code}`} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.danger, padding: 4, marginBottom: 2 }}><TrashIcon size={14} /></button>}
            </div>
          ))}
        </div>
      )}

      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", padding: 20 }}>
          <div style={{ border: `2px dashed ${COLORS.border}`, borderRadius: 6, padding: 40, textAlign: "center", width: "100%", cursor: "pointer", position: "relative" }}>
            <input type="file" accept=".pdf,.prt0" onChange={e => setArmPdf(e.target.files?.[0] || null)} aria-label="Upload ARM protocol file" style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
            <UploadIcon size={32} color={COLORS.textDim} />
            <div style={{ marginTop: 8, fontSize: 13, color: COLORS.textSecondary, fontWeight: 600 }}>
              {armPdf ? armPdf.name : "Drop ARM Protocol PDF or .prt0 file here"}
            </div>
            <div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 4 }}>Supports .pdf and .prt0 files from ARM 2024</div>
          </div>
          {armPdf && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: COLORS.success + "18", borderRadius: 4, border: `1px solid ${COLORS.success}44` }}>
              <FileIcon size={16} color={COLORS.success} />
              <span style={{ fontSize: 12, color: COLORS.success, fontWeight: 600 }}>{armPdf.name} — Ready to upload</span>
            </div>
          )}
          <div style={{ fontSize: 11, color: COLORS.textDim, textAlign: "center", lineHeight: 1.6 }}>
            Upload your ARM spray sheet PDF to auto-associate treatment data, plot maps, and inventory calculations with this project.
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, paddingTop: 16, borderTop: `1px solid ${COLORS.border}` }}>
        <Btn variant="ghost" onClick={step > 1 ? () => setStep(s => s - 1) : onClose}>{step > 1 ? "Back" : "Cancel"}</Btn>
        <div style={{ display: "flex", gap: 8 }}>
          {step < 3 && <Btn onClick={() => { if (step === 1 && !validate()) return; setStep(s => s + 1); }} disabled={step === 1 && !form.title}>Next</Btn>}
          {step === 3 && <Btn onClick={handleCreate} disabled={!form.title}>Create Project</Btn>}
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// HOME DASHBOARD
// ============================================================
function HomeDashboard({ onNavigate, onOpenProject }) {
  const { state } = useContext(AppContext);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    return state.projects.filter(p => {
      if (filter === "active" && p.status !== "Active") return false;
      if (filter === "completed" && p.status !== "Completed") return false;
      if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.crop.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [state.projects, filter, search]);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, color: COLORS.textPrimary, fontSize: 20, fontWeight: 700 }}>Research Dashboard</h2>
          <p style={{ margin: "4px 0 0", color: COLORS.textDim, fontSize: 12 }}>Manage herbicide trial operations</p>
        </div>
        <Btn onClick={() => setShowNew(true)}><PlusIcon size={14} /> New Project</Btn>
      </div>

      <SeasonOverview />

      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <SearchIcon size={14} color={COLORS.textDim} style={{ position: "absolute", left: 10, top: 10 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." aria-label="Search projects" style={{ width: "100%", padding: "8px 10px 8px 30px", background: COLORS.bgInput, border: `1px solid ${COLORS.border}`, borderRadius: 3, color: COLORS.textPrimary, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
        </div>
        {["all", "active", "completed"].map(f => (
          <Btn key={f} size="sm" variant={filter === f ? "primary" : "secondary"} onClick={() => setFilter(f)} aria-pressed={filter === f}>{f.charAt(0).toUpperCase() + f.slice(1)}</Btn>
        ))}
        <span style={{ fontSize: 11, color: COLORS.textDim, fontFamily: "'Fira Code', monospace" }}>{filtered.length} projects</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
        {filtered.map(p => <ProjectCard key={p.id} project={p} onOpen={onOpenProject} onNavigate={onNavigate} />)}
        <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 200, border: `2px dashed ${COLORS.border}`, cursor: "pointer", gap: 8 }} onClick={() => setShowNew(true)}>
          <PlusIcon size={28} color={COLORS.textDim} />
          <span style={{ fontSize: 13, color: COLORS.textDim, fontWeight: 600 }}>Create New Project</span>
        </Card>
      </div>

      <NewProjectModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}

// ============================================================
// PROJECT DETAILS PAGE
// ============================================================
function ProjectDetails({ project, onBack }) {
  const { state } = useContext(AppContext);
  const [tab, setTab] = useState("overview");
  const proj = state.projects.find(p => p.id === project.id) || project;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <Btn variant="ghost" size="sm" onClick={onBack}>← Back</Btn>
        <h2 style={{ margin: 0, color: COLORS.textPrimary, fontSize: 18, fontWeight: 700 }}>{proj.title}</h2>
        <Badge color={proj.status === "Active" ? COLORS.success : COLORS.textDim}>{proj.status}</Badge>
      </div>

      <TabBar tabs={[
        { id: "overview", label: "Overview" },
        { id: "treatments", label: "Treatments" },
        { id: "plotmap", label: "Plot Map" },
        { id: "ratings", label: "Ratings" },
        { id: "files", label: "Files" },
      ]} active={tab} onChange={setTab} />

      <div role="tabpanel" id={`panel-${tab}`}>
        {tab === "overview" && <ProjectOverview proj={proj} />}
        {tab === "treatments" && <TreatmentTable proj={proj} />}
        {tab === "plotmap" && <PlotMapView proj={proj} />}
        {tab === "ratings" && <RatingsPanel proj={proj} />}
        {tab === "files" && <ProjectFiles proj={proj} />}
      </div>
    </div>
  );
}

function ProjectOverview({ proj }) {
  const { state } = useContext(AppContext);
  const site = INITIAL_SITES.find(s => s.id === proj.siteId);
  const field = state.fields.find(f => f.id === proj.fieldId);
  const metaRows = [
    ["Trial ID", proj.trialId],
    ["Crop", proj.crop],
    ["Variety", proj.variety],
    ["Design", "Randomized Complete Block (RCB)"],
    ["Treatments", proj.treatmentCount],
    ["Reps", proj.reps],
    ["Total Plots", proj.treatmentCount * proj.reps],
    ["Plot Size", `${proj.plotWidth} × ${proj.plotLength} ft (${proj.plotWidth * proj.plotLength} ft²)`],
    ["App Amount", proj.appAmount],
    ["Mix Size", proj.mixSize],
    ["Site", site?.name || "—"],
    ["Field", field?.name || "—"],
    ["Investigator", proj.investigator || "—"],
    ["Study Director", proj.studyDirector || "—"],
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <Card>
        <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.textPrimary, marginBottom: 12 }}>Trial Metadata</div>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 16px", fontSize: 12 }}>
          {metaRows.map(([k, v]) => (
            <div key={k} style={{ display: "contents" }}>
              <span style={{ color: COLORS.textDim, fontFamily: "'Fira Code', monospace", fontSize: 10, fontWeight: 600, textTransform: "uppercase" }}>{k}</span>
              <span style={{ color: COLORS.textPrimary }}>{v}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.textPrimary, marginBottom: 12 }}>Schedule</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.success }} />
            <span style={{ fontSize: 12, color: COLORS.textSecondary, width: 80 }}>Planting</span>
            <span style={{ fontSize: 12, fontFamily: "'Fira Code', monospace", color: COLORS.textPrimary }}>{proj.plantingDate || "Not set"}</span>
          </div>
          {proj.applications?.map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: a.timing?.includes("PRE") ? COLORS.info : COLORS.warning }} />
              <span style={{ fontSize: 12, color: COLORS.textSecondary, width: 80 }}>App {a.code} ({a.timing})</span>
              <span style={{ fontSize: 12, fontFamily: "'Fira Code', monospace", color: COLORS.textPrimary }}>{a.date || "Not set"}</span>
              {a.completed && <Badge color={COLORS.success}>Completed</Badge>}
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.danger }} />
            <span style={{ fontSize: 12, color: COLORS.textSecondary, width: 80 }}>Harvest</span>
            <span style={{ fontSize: 12, fontFamily: "'Fira Code', monospace", color: COLORS.textPrimary }}>{proj.harvestDate || "Not set"}</span>
          </div>
        </div>
      </Card>
      {proj.objective && (
        <Card style={{ gridColumn: "1 / -1" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.textPrimary, marginBottom: 8 }}>Objective</div>
          <p style={{ margin: 0, fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.6 }}>{proj.objective}</p>
        </Card>
      )}
      {proj.notes && (
        <Card style={{ gridColumn: "1 / -1" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.textPrimary, marginBottom: 8 }}>Notes</div>
          <p style={{ margin: 0, fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.6 }}>{proj.notes}</p>
        </Card>
      )}
    </div>
  );
}

function TreatmentTable({ proj }) {
  return (
    <Card>
      <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.textPrimary, marginBottom: 12 }}>Treatment List — {proj.treatmentCount} treatments × {proj.reps} reps</div>
      <Table columns={[
        { key: "trtNo", label: "Trt #", mono: true },
        { key: "code", label: "Code" },
        { key: "description", label: "Description" },
        { key: "color", label: "", render: (row) => <div style={{ width: 16, height: 16, borderRadius: 2, background: TRT_COLORS[(row.trtNo - 1) % TRT_COLORS.length] }} /> },
      ]} data={proj.treatments} />
    </Card>
  );
}

function PlotMapView({ proj }) {
  if (!proj.plotMap?.length) return <Card><p style={{ color: COLORS.textDim, fontSize: 13 }}>No plot map available. Upload an ARM protocol PDF to generate.</p></Card>;
  return (
    <Card>
      <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.textPrimary, marginBottom: 12 }}>
        Trial Map — {proj.reps} Reps × {proj.treatmentCount} Treatments
      </div>
      <div style={{ overflowX: "auto", paddingBottom: 8 }}>
        {[...proj.plotMap].reverse().map((row, ri) => (
          <div key={ri} style={{ display: "flex", gap: 2, marginBottom: 2 }}>
            <div style={{ width: 40, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: COLORS.textDim, fontFamily: "'Fira Code', monospace", flexShrink: 0 }}>Rep {proj.plotMap.length - ri}</div>
            {row.map((cell, ci) => (
              <div key={ci} title={`Plot ${cell.plot} — Treatment ${cell.trt}`} style={{
                minWidth: 44, height: 38, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: TRT_COLORS[(cell.trt - 1) % TRT_COLORS.length] + "cc", borderRadius: 2, border: cell.trt === 1 ? `2px solid ${COLORS.textDim}` : "1px solid rgba(0,0,0,0.2)", flexShrink: 0,
              }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: "#fff", fontFamily: "'Fira Code', monospace", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>{cell.plot}</span>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.8)", fontFamily: "'Fira Code', monospace" }}>{cell.trt}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, paddingTop: 8, borderTop: `1px solid ${COLORS.border}` }}>
        {proj.treatments.map(t => (
          <div key={t.trtNo} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: COLORS.textSecondary }}>
            <div style={{ width: 10, height: 10, borderRadius: 1, background: TRT_COLORS[(t.trtNo - 1) % TRT_COLORS.length] }} />
            <span style={{ fontFamily: "'Fira Code', monospace" }}>{t.trtNo}: {t.description?.substring(0, 30)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ============================================================
// RATINGS PANEL
// ============================================================
function RatingsPanel({ proj }) {
  const { dispatch } = useContext(AppContext);
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState("7 DAT");
  const [selectedApp, setSelectedApp] = useState(proj.applications?.[0]?.code || "B");
  const [entries, setEntries] = useState({});

  const datEvents = ["7 DAT", "14 DAT", "21 DAT", "28 DAT"];
  const allPlots = useMemo(() => proj.plotMap?.flat() || [], [proj.plotMap]);

  const startRating = () => {
    setShowForm(true);
    const init = {};
    allPlots.forEach(p => { init[p.plot] = { weedControl: "", phytotoxicity: "" }; });
    setEntries(init);
  };

  const saveRating = () => {
    dispatch({
      type: "ADD_RATING",
      payload: {
        projectId: proj.id,
        rating: { id: generateId(), event: selectedEvent, appCode: selectedApp, date: new Date().toISOString().split("T")[0], entries: { ...entries } }
      }
    });
    setShowForm(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: COLORS.textPrimary }}>Visual Ratings</span>
        <Btn size="sm" onClick={startRating}><PlusIcon size={12} /> New Rating</Btn>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "end" }}>
            <Select label="Application" options={proj.applications.map(a => ({ value: a.code, label: `App ${a.code} (${a.timing})` }))} value={selectedApp} onChange={e => setSelectedApp(e.target.value)} />
            <Select label="Rating Event" options={datEvents} value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)} />
            <Btn variant="success" onClick={saveRating}>Save Rating</Btn>
            <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
          </div>
          <div style={{ overflowX: "auto", maxHeight: 400, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr>
                  {["PLOT","TRT","WEED CONTROL %","CROP PHYTOTOXICITY %"].map(h => (
                    <th key={h} style={{ padding: "6px 8px", textAlign: "left", borderBottom: `2px solid ${COLORS.border}`, color: COLORS.textDim, fontSize: 9, fontFamily: "'Fira Code', monospace", position: "sticky", top: 0, background: COLORS.bgCard }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allPlots.map(p => (
                  <tr key={p.plot}>
                    <td style={{ padding: "4px 8px", fontFamily: "'Fira Code', monospace", color: COLORS.textPrimary, borderBottom: `1px solid ${COLORS.border}22` }}>{p.plot}</td>
                    <td style={{ padding: "4px 8px", borderBottom: `1px solid ${COLORS.border}22` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 1, background: TRT_COLORS[(p.trt - 1) % TRT_COLORS.length] }} />
                        <span style={{ fontFamily: "'Fira Code', monospace", color: COLORS.textSecondary }}>{p.trt}</span>
                      </div>
                    </td>
                    <td style={{ padding: "4px 8px", borderBottom: `1px solid ${COLORS.border}22` }}>
                      <input type="number" min="0" max="100" aria-label={`Weed control for plot ${p.plot}`} value={entries[p.plot]?.weedControl || ""} onChange={e => setEntries(prev => ({ ...prev, [p.plot]: { ...prev[p.plot], weedControl: e.target.value } }))} style={{ width: 60, padding: "3px 6px", background: COLORS.bgInput, border: `1px solid ${COLORS.border}`, borderRadius: 2, color: COLORS.textPrimary, fontSize: 12, fontFamily: "'Fira Code', monospace", textAlign: "center" }} placeholder="0-100" />
                    </td>
                    <td style={{ padding: "4px 8px", borderBottom: `1px solid ${COLORS.border}22` }}>
                      <input type="number" min="0" max="100" aria-label={`Phytotoxicity for plot ${p.plot}`} value={entries[p.plot]?.phytotoxicity || ""} onChange={e => setEntries(prev => ({ ...prev, [p.plot]: { ...prev[p.plot], phytotoxicity: e.target.value } }))} style={{ width: 60, padding: "3px 6px", background: COLORS.bgInput, border: `1px solid ${COLORS.border}`, borderRadius: 2, color: COLORS.textPrimary, fontSize: 12, fontFamily: "'Fira Code', monospace", textAlign: "center" }} placeholder="0-100" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {proj.ratings?.length > 0 ? (
        <Table columns={[
          { key: "event", label: "Event" },
          { key: "appCode", label: "App Code" },
          { key: "date", label: "Date", mono: true },
          { key: "plots", label: "Plots Rated", render: r => Object.keys(r.entries || {}).length },
        ]} data={proj.ratings} />
      ) : (
        <Card><p style={{ color: COLORS.textDim, fontSize: 13, textAlign: "center", padding: 20 }}>No ratings recorded yet. Click "New Rating" to enter visual assessment data.</p></Card>
      )}
    </div>
  );
}

function ProjectFiles({ proj }) {
  const { dispatch } = useContext(AppContext);
  const categories = ["protocols", "spray_sheets", "data_sheets", "photos", "maps"];

  const handleUpload = (cat) => {
    const file = { id: generateId(), name: `uploaded_file_${Date.now()}.pdf`, category: cat, size: "— KB", uploadDate: new Date().toISOString().split("T")[0] };
    dispatch({ type: "ADD_FILE", payload: { projectId: proj.id, file } });
  };

  return (
    <div>
      {categories.map(cat => {
        const files = proj.files?.filter(f => f.category === cat) || [];
        return (
          <Card key={cat} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 12, color: COLORS.textPrimary, textTransform: "uppercase", fontFamily: "'Fira Code', monospace", letterSpacing: 1 }}>/{cat}</span>
              <Btn size="sm" variant="secondary" onClick={() => handleUpload(cat)}><UploadIcon size={12} /> Upload</Btn>
            </div>
            {files.length > 0 ? (
              <Table columns={[
                { key: "name", label: "File Name" },
                { key: "size", label: "Size", mono: true },
                { key: "uploadDate", label: "Uploaded", mono: true },
              ]} data={files} />
            ) : (
              <p style={{ color: COLORS.textDim, fontSize: 11, margin: "4px 0" }}>No files in this directory</p>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================
// INTERACTIVE MAP — field-centric GIS with image overlays
// ============================================================

/** Sidebar sub-component: single field layer panel */
function FieldLayerPanel({ field, isExpanded, onToggle, onSelect, isSelected, projects, onUploadImage, onToggleImage, onOpacityChange, onDrawInField, onGenerateGrid, onDeletePoly, onOpenProject, showGrid, onHighlightPoly, selectedPolyId }) {
  const fileInputRef = useRef(null);
  const fieldProjects = field.polygons.map(p => ({ poly: p, project: projects.find(pr => pr.id === p.projectId) }));

  const calcArea = (coords) => {
    if (!coords || coords.length < 3) return { sqft: 0, acres: 0 };
    let area = 0;
    for (let i = 0; i < coords.length; i++) {
      const j = (i + 1) % coords.length;
      const lat1ft = coords[i][0] * 364000;
      const lat2ft = coords[j][0] * 364000;
      const lng1ft = coords[i][1] * 288200;
      const lng2ft = coords[j][1] * 288200;
      area += (lng1ft * lat2ft - lng2ft * lat1ft);
    }
    const sqft = Math.abs(area / 2);
    return { sqft: Math.round(sqft), acres: (sqft / 43560).toFixed(3) };
  };

  return (
    <div style={{ background: isSelected ? field.color + "12" : COLORS.bgCard, border: `1px solid ${isSelected ? field.color + "66" : COLORS.border}`, borderRadius: 4, overflow: "hidden", transition: "all 0.15s" }}>
      {/* Field header */}
      <div onClick={onToggle} role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter") onToggle(); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", cursor: "pointer", borderBottom: isExpanded ? `1px solid ${COLORS.border}44` : "none" }}>
        <div style={{ width: 10, height: 10, borderRadius: 2, background: field.color, flexShrink: 0, border: `1px solid ${field.color}88` }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: COLORS.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{field.name}</div>
          <div style={{ fontSize: 9, color: COLORS.textDim, fontFamily: "'Fira Code', monospace" }}>{field.acres} ac · {field.polygons.length} area{field.polygons.length !== 1 ? "s" : ""}</div>
        </div>
        {isExpanded ? <ChevronDown size={12} color={COLORS.textDim} /> : <ChevronRight size={12} color={COLORS.textDim} />}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div style={{ padding: "6px 10px 10px" }}>
          {/* Image overlay controls */}
          <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/tiff,image/webp" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadImage(field.id, f); e.target.value = ""; }} />
            <Btn size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} style={{ flex: 1 }}>
              <ImageIcon size={10} /> {field.imageOverlay ? "Replace" : "Upload"} Layer
            </Btn>
            {field.imageOverlay && (
              <Btn size="sm" variant={field.imageOverlay.visible !== false ? "success" : "ghost"} onClick={() => onToggleImage(field.id)} style={{ minWidth: 28 }}>
                <EyeIcon size={10} />
              </Btn>
            )}
          </div>

          {/* Opacity slider */}
          {field.imageOverlay && field.imageOverlay.visible !== false && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 8, color: COLORS.textDim, fontFamily: "'Fira Code', monospace", flexShrink: 0 }}>OPACITY</span>
              <input type="range" min="10" max="100" value={(field.imageOverlay.opacity || 0.7) * 100} onChange={e => onOpacityChange(field.id, parseInt(e.target.value) / 100)} style={{ flex: 1, height: 3, accentColor: field.color }} />
              <span style={{ fontSize: 8, color: COLORS.textDim, fontFamily: "'Fira Code', monospace", width: 28, textAlign: "right" }}>{Math.round((field.imageOverlay.opacity || 0.7) * 100)}%</span>
            </div>
          )}

          {/* Project area polygons */}
          {fieldProjects.map(({ poly, project }) => {
            const area = calcArea(poly.coords);
            const isPolySelected = selectedPolyId === poly.id;
            return (
              <div key={poly.id} onClick={() => onHighlightPoly(field.id, poly)} style={{
                padding: "6px 8px", marginBottom: 4, background: isPolySelected ? COLORS.accent + "18" : COLORS.bgInput,
                border: `1px solid ${isPolySelected ? COLORS.accent + "66" : COLORS.border}44`, borderRadius: 3, cursor: "pointer", borderLeft: `3px solid ${COLORS.accent}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, fontSize: 10, color: COLORS.textPrimary }}>{poly.label}</span>
                  <div style={{ display: "flex", gap: 2 }}>
                    {project && (
                      <button onClick={(e) => { e.stopPropagation(); onOpenProject(project); }} title="Open project" style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: COLORS.info, display: "flex" }}>
                        <ExternalLinkIcon size={11} />
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); onDeletePoly(field.id, poly.id); }} title="Remove area" style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: COLORS.danger + "88", display: "flex" }}>
                      <TrashIcon size={10} />
                    </button>
                  </div>
                </div>
                {project && <div style={{ fontSize: 9, color: COLORS.textSecondary, marginTop: 2 }}>{project.crop} · {project.treatmentCount} trt × {project.reps} rep</div>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
                  <span style={{ fontSize: 8, color: COLORS.textDim, fontFamily: "'Fira Code', monospace" }}>{area.sqft.toLocaleString()} ft² · {area.acres} ac</span>
                  {project && (
                    <button onClick={(e) => { e.stopPropagation(); onGenerateGrid(field.id, poly); }} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 2, cursor: "pointer", padding: "2px 6px", fontSize: 8, fontFamily: "'Fira Code', monospace", color: COLORS.textSecondary, display: "flex", alignItems: "center", gap: 3 }}>
                      <GridIcon size={8} /> Grid
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Draw new area button */}
          <Btn size="sm" variant="ghost" onClick={() => onDrawInField(field.id)} style={{ width: "100%", marginTop: 4, borderStyle: "dashed", borderColor: COLORS.border }}>
            <PlusIcon size={10} /> Add Project Area
          </Btn>
        </div>
      )}
    </div>
  );
}

function InteractiveMap({ onOpenProject }) {
  const { state, dispatch } = useContext(AppContext);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const leafletLayers = useRef({ fields: {}, polys: {}, grids: {}, images: {} });
  const [toast, setToast] = useState(null);

  // UI state
  const [expandedField, setExpandedField] = useState(state.fields[0]?.id || null);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [selectedPolyId, setSelectedPolyId] = useState(null);
  const [showGrid, setShowGrid] = useState(null);

  // Draw mode
  const [drawMode, setDrawMode] = useState(false);
  const [drawFieldId, setDrawFieldId] = useState(null);
  const [drawPoints, setDrawPoints] = useState([]);
  const [drawLabel, setDrawLabel] = useState("");
  const [drawProject, setDrawProject] = useState("");
  const drawModeRef = useRef(false);
  useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);

  // New field modal
  const [showNewField, setShowNewField] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldAcres, setNewFieldAcres] = useState("");
  const [newFieldSite, setNewFieldSite] = useState(INITIAL_SITES[0].id);

  const FIELD_COLORS = ["#22c55e", "#0ea5e9", "#f97316", "#a855f7", "#ef4444", "#eab308", "#ec4899", "#14b8a6"];

  // ---- MAP INITIALIZATION ----
  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return;
    const L = window.L;
    if (!L) return;

    const site = INITIAL_SITES[0];
    const map = L.map(mapRef.current, { zoomControl: true, preferCanvas: true }).setView([site.lat, site.lng], 16);

    // Satellite base layer
    const satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Esri Satellite", maxZoom: 20,
    });

    // Street label overlay for context
    const labels = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 20, opacity: 0.4,
    });

    satellite.addTo(map);
    labels.addTo(map);
    mapInstanceRef.current = map;

    // Click handler for polygon drawing
    map.on("click", (e) => {
      if (!drawModeRef.current) return;
      setDrawPoints(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
    });

    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  // ---- RENDER ALL FIELD BOUNDARIES & POLYGONS ----
  useEffect(() => {
    const L = window.L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    // Clear old field layers
    Object.values(leafletLayers.current.fields).forEach(l => { try { map.removeLayer(l); } catch {} });
    Object.values(leafletLayers.current.polys).forEach(l => { try { map.removeLayer(l); } catch {} });
    leafletLayers.current.fields = {};
    leafletLayers.current.polys = {};

    state.fields.forEach(field => {
      // Field boundary (dashed)
      if (field.bounds && field.bounds.length >= 3) {
        const boundary = L.polygon(field.bounds, {
          color: field.color || "#22c55e", weight: 2, dashArray: "8,6",
          fillColor: field.color || "#22c55e", fillOpacity: 0.04,
        }).addTo(map);
        boundary.bindTooltip(field.name, { permanent: false, direction: "center", className: "field-label" });
        leafletLayers.current.fields[field.id] = boundary;
      }

      // Project area polygons inside this field
      field.polygons.forEach(poly => {
        const polyLayer = L.polygon(poly.coords, {
          color: COLORS.accent, weight: 2,
          fillColor: COLORS.accent, fillOpacity: 0.15,
        }).addTo(map);

        // Permanent label
        polyLayer.bindTooltip(poly.label, { permanent: true, direction: "center", className: "poly-label" });

        // Click popup with project link
        const proj = state.projects.find(p => p.id === poly.projectId);
        if (proj) {
          polyLayer.on("click", () => {
            setSelectedPolyId(poly.id);
            setExpandedField(field.id);
          });
          polyLayer.bindPopup(`
            <div style="font-family:'Fira Code',monospace;font-size:11px;min-width:180px">
              <div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#1b4332">${poly.label}</div>
              <div style="color:#555;margin-bottom:2px">${proj.crop} · ${proj.treatmentCount} TRT × ${proj.reps} REP</div>
              <div style="color:#555;margin-bottom:6px">Field: ${field.name}</div>
              <button onclick="window.__fieldops_openProject && window.__fieldops_openProject('${proj.id}')" style="background:#d97706;border:none;padding:5px 12px;border-radius:4px;font-weight:700;font-size:11px;cursor:pointer;font-family:inherit;color:#fff;width:100%">Open Project →</button>
            </div>
          `, { maxWidth: 250, className: "project-popup" });
        }

        leafletLayers.current.polys[poly.id] = polyLayer;
      });
    });
  }, [state.fields, state.projects]);

  // ---- GLOBAL CALLBACK FOR POPUP "Open Project" BUTTON ----
  useEffect(() => {
    window.__fieldops_openProject = (projId) => {
      const proj = state.projects.find(p => p.id === projId);
      if (proj && onOpenProject) onOpenProject(proj);
    };
    return () => { delete window.__fieldops_openProject; };
  }, [state.projects, onOpenProject]);

  // ---- IMAGE OVERLAYS ----
  useEffect(() => {
    const L = window.L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    // Reconcile image overlay layers with field state
    state.fields.forEach(field => {
      const existing = leafletLayers.current.images[field.id];
      const img = field.imageOverlay;

      if (!img || img.visible === false) {
        // Remove if hidden or no image
        if (existing) { try { map.removeLayer(existing); } catch {} delete leafletLayers.current.images[field.id]; }
        return;
      }

      if (existing) {
        // Update opacity
        try { existing.setOpacity(img.opacity ?? 0.7); } catch {}
      } else if (img.dataUrl && img.bounds) {
        // Create new overlay
        const overlay = L.imageOverlay(img.dataUrl, img.bounds, { opacity: img.opacity ?? 0.7, interactive: false });
        overlay.addTo(map);
        leafletLayers.current.images[field.id] = overlay;
      }
    });

    // Remove overlays for deleted fields
    Object.keys(leafletLayers.current.images).forEach(fid => {
      if (!state.fields.find(f => f.id === fid)) {
        try { map.removeLayer(leafletLayers.current.images[fid]); } catch {}
        delete leafletLayers.current.images[fid];
      }
    });
  }, [state.fields]);

  // ---- DRAW PREVIEW POLYLINE ----
  useEffect(() => {
    const L = window.L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    if (leafletLayers.current._drawPreview) {
      map.removeLayer(leafletLayers.current._drawPreview);
      delete leafletLayers.current._drawPreview;
    }

    if (drawMode && drawPoints.length >= 2) {
      const preview = L.polyline([...drawPoints, drawPoints[0]], { color: COLORS.warning, weight: 2, dashArray: "5,5" }).addTo(map);
      leafletLayers.current._drawPreview = preview;
    }
  }, [drawPoints, drawMode]);

  // ---- HANDLERS ----

  const handleUploadImage = (fieldId, file) => {
    const field = state.fields.find(f => f.id === fieldId);
    if (!field || !field.bounds) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const lats = field.bounds.map(b => b[0]);
      const lngs = field.bounds.map(b => b[1]);
      const imgBounds = [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ];
      dispatch({
        type: "UPDATE_FIELD_IMAGE",
        payload: {
          fieldId, imageOverlay: { dataUrl: e.target.result, bounds: imgBounds, opacity: 0.7, visible: true }
        }
      });
      setToast(`Image layer added to ${field.name}`);
    };
    reader.readAsDataURL(file);
  };

  const handleToggleImage = (fieldId) => {
    const field = state.fields.find(f => f.id === fieldId);
    if (!field?.imageOverlay) return;
    dispatch({ type: "UPDATE_FIELD_IMAGE", payload: { fieldId, imageOverlay: { ...field.imageOverlay, visible: !field.imageOverlay.visible } } });
  };

  const handleOpacityChange = (fieldId, opacity) => {
    const field = state.fields.find(f => f.id === fieldId);
    if (!field?.imageOverlay) return;
    // Remove old overlay so the useEffect recreates with new opacity
    const existing = leafletLayers.current.images[fieldId];
    if (existing) { try { mapInstanceRef.current?.removeLayer(existing); } catch {} delete leafletLayers.current.images[fieldId]; }
    dispatch({ type: "UPDATE_FIELD_IMAGE", payload: { fieldId, imageOverlay: { ...field.imageOverlay, opacity } } });
  };

  const startDrawInField = (fieldId) => {
    const field = state.fields.find(f => f.id === fieldId);
    if (!field) return;
    setDrawFieldId(fieldId);
    setDrawMode(true);
    setDrawPoints([]);
    setDrawLabel("");
    setDrawProject("");
    setExpandedField(fieldId);

    // Zoom to field
    const L = window.L;
    const map = mapInstanceRef.current;
    if (L && map && field.bounds?.length >= 3) {
      map.fitBounds(L.polygon(field.bounds).getBounds(), { padding: [60, 60] });
    }
  };

  const finishDraw = () => {
    if (drawPoints.length < 3 || !drawFieldId) return;
    const L = window.L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    if (leafletLayers.current._drawPreview) {
      map.removeLayer(leafletLayers.current._drawPreview);
      delete leafletLayers.current._drawPreview;
    }

    const field = state.fields.find(f => f.id === drawFieldId);
    const newPoly = {
      id: generateId(),
      label: drawLabel || `Area ${(field?.polygons.length || 0) + 1}`,
      projectId: drawProject || null,
      coords: drawPoints,
    };

    dispatch({ type: "ADD_FIELD_POLYGON", payload: { fieldId: drawFieldId, polygon: newPoly } });
    setDrawPoints([]);
    setDrawMode(false);
    setDrawFieldId(null);
    setDrawLabel("");
    setDrawProject("");
    setToast(`Area "${newPoly.label}" added to ${field?.name}`);
  };

  const cancelDraw = () => {
    if (leafletLayers.current._drawPreview) {
      try { mapInstanceRef.current?.removeLayer(leafletLayers.current._drawPreview); } catch {}
      delete leafletLayers.current._drawPreview;
    }
    setDrawPoints([]);
    setDrawMode(false);
    setDrawFieldId(null);
  };

  const handleDeletePoly = (fieldId, polyId) => {
    // Remove grid if shown
    if (leafletLayers.current.grids[polyId]) {
      leafletLayers.current.grids[polyId].forEach(l => { try { mapInstanceRef.current?.removeLayer(l); } catch {} });
      delete leafletLayers.current.grids[polyId];
    }
    dispatch({ type: "DELETE_FIELD_POLYGON", payload: { fieldId, polygonId: polyId } });
  };

  const handleGenerateGrid = (fieldId, poly) => {
    const proj = state.projects.find(p => p.id === poly.projectId);
    if (!proj) return;
    const L = window.L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    // Clear existing grid for this poly
    if (leafletLayers.current.grids[poly.id]) {
      leafletLayers.current.grids[poly.id].forEach(l => map.removeLayer(l));
    }

    const bounds = L.polygon(poly.coords).getBounds();
    const sw = bounds.getSouthWest();
    const plotWidthDeg = proj.plotWidth / 288200;
    const plotLengthDeg = proj.plotLength / 364000;
    const blockGapDeg = (proj.distBetweenBlocks || 1) / 364000;

    const layers = [];
    const plotMap = proj.plotMap || [];

    for (let rep = 0; rep < plotMap.length; rep++) {
      const row = plotMap[rep];
      for (let col = 0; col < row.length; col++) {
        const cell = row[col];
        const lat = sw.lat + (rep * (plotLengthDeg + blockGapDeg));
        const lng = sw.lng + (col * plotWidthDeg);
        const cellBounds = [[lat, lng], [lat + plotLengthDeg, lng + plotWidthDeg]];
        const color = TRT_COLORS[(cell.trt - 1) % TRT_COLORS.length];
        const rect = L.rectangle(cellBounds, { color, weight: 1, fillColor: color, fillOpacity: 0.5 }).addTo(map);
        rect.bindTooltip(`<div style="text-align:center;font-family:monospace;font-size:10px"><b>${cell.plot}</b><br/>Trt ${cell.trt}</div>`, { direction: "center" });
        layers.push(rect);
      }
    }

    leafletLayers.current.grids[poly.id] = layers;
    setShowGrid(poly.id);
    dispatch({ type: "ADD_AUDIT", payload: { action: "Grid Generated", detail: `${proj.title} — ${plotMap.flat().length} plots in ${state.fields.find(f => f.id === fieldId)?.name}` } });
  };

  const handleHighlightPoly = (fieldId, poly) => {
    setSelectedPolyId(poly.id);
    setSelectedFieldId(fieldId);

    // Zoom to polygon
    const L = window.L;
    const map = mapInstanceRef.current;
    const layer = leafletLayers.current.polys[poly.id];
    if (L && map && layer) {
      map.fitBounds(layer.getBounds(), { padding: [80, 80], maxZoom: 19 });
    }
  };

  const handleFlyToField = (field) => {
    const L = window.L;
    const map = mapInstanceRef.current;
    if (!L || !map || !field.bounds?.length) return;
    const bounds = L.polygon(field.bounds).getBounds();
    map.fitBounds(bounds, { padding: [60, 60] });
    setSelectedFieldId(field.id);
  };

  const handleAddField = () => {
    if (!newFieldName.trim()) return;
    const site = INITIAL_SITES.find(s => s.id === newFieldSite) || INITIAL_SITES[0];
    // Generate a default rectangular bounds near the site center
    const offset = state.fields.length * 0.003;
    const newField = {
      id: generateId(),
      siteId: newFieldSite,
      name: newFieldName.trim(),
      acres: parseFloat(newFieldAcres) || 0,
      color: FIELD_COLORS[state.fields.length % FIELD_COLORS.length],
      bounds: [
        [site.lat - 0.001, site.lng - 0.0014 - offset],
        [site.lat - 0.001, site.lng + 0.0014 - offset],
        [site.lat + 0.001, site.lng + 0.0014 - offset],
        [site.lat + 0.001, site.lng - 0.0014 - offset],
      ],
      imageOverlay: null,
      polygons: [],
    };
    dispatch({ type: "ADD_FIELD", payload: newField });
    setShowNewField(false);
    setNewFieldName("");
    setNewFieldAcres("");
    setExpandedField(newField.id);
    setToast(`Field "${newField.name}" created`);

    // Fly to new field
    setTimeout(() => handleFlyToField(newField), 100);
  };

  // Group fields by site
  const fieldsBySite = useMemo(() => {
    const grouped = {};
    INITIAL_SITES.forEach(s => { grouped[s.id] = { site: s, fields: [] }; });
    state.fields.forEach(f => {
      if (grouped[f.siteId]) grouped[f.siteId].fields.push(f);
      else if (Object.keys(grouped).length) grouped[Object.keys(grouped)[0]].fields.push(f);
    });
    return grouped;
  }, [state.fields]);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 52px)" }}>
      {/* ---- SIDEBAR ---- */}
      <div style={{ width: 290, background: COLORS.bgMid, borderRight: `1px solid ${COLORS.border}`, overflow: "auto", padding: 0, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "10px 12px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: COLORS.textPrimary }}>Field Layers</span>
          <Btn size="sm" variant="secondary" onClick={() => setShowNewField(true)}><PlusIcon size={10} /> Add Field</Btn>
        </div>

        {/* Draw mode banner */}
        {drawMode && (
          <div style={{ padding: 10, background: COLORS.warning + "18", borderBottom: `1px solid ${COLORS.warning}44` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.warning, animation: "pulse 1.2s infinite" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.warning }}>Drawing Mode</span>
            </div>
            <p style={{ margin: "0 0 6px", fontSize: 10, color: COLORS.textSecondary }}>Click map to place vertices. {drawPoints.length} point{drawPoints.length !== 1 ? "s" : ""} placed.</p>
            <Input label="Area Label" value={drawLabel} onChange={e => setDrawLabel(e.target.value)} style={{ marginBottom: 6 }} />
            <Select label="Link to Project" options={[{ value: "", label: "— None —" }, ...state.projects.map(p => ({ value: p.id, label: p.title }))]} value={drawProject} onChange={e => setDrawProject(e.target.value)} />
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <Btn size="sm" onClick={finishDraw} disabled={drawPoints.length < 3} style={{ flex: 1 }}>Finish ({drawPoints.length} pts)</Btn>
              <Btn size="sm" variant="danger" onClick={cancelDraw} style={{ flex: 1 }}>Cancel</Btn>
            </div>
          </div>
        )}

        {/* Field tree */}
        <div style={{ flex: 1, overflow: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
          {Object.entries(fieldsBySite).map(([siteId, { site, fields }]) => (
            <div key={siteId}>
              <div onClick={() => {
                const L = window.L;
                const map = mapInstanceRef.current;
                if (L && map) map.setView([site.lat, site.lng], 16);
              }} style={{ fontSize: 9, fontWeight: 700, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Fira Code', monospace", padding: "6px 2px 4px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                <MapIcon size={10} color={COLORS.textDim} />
                {site.name}
              </div>
              {fields.map(field => (
                <FieldLayerPanel
                  key={field.id}
                  field={field}
                  isExpanded={expandedField === field.id}
                  onToggle={() => { setExpandedField(expandedField === field.id ? null : field.id); handleFlyToField(field); }}
                  onSelect={() => handleFlyToField(field)}
                  isSelected={selectedFieldId === field.id}
                  projects={state.projects}
                  onUploadImage={handleUploadImage}
                  onToggleImage={handleToggleImage}
                  onOpacityChange={handleOpacityChange}
                  onDrawInField={startDrawInField}
                  onGenerateGrid={handleGenerateGrid}
                  onDeletePoly={handleDeletePoly}
                  onOpenProject={onOpenProject}
                  showGrid={showGrid}
                  onHighlightPoly={handleHighlightPoly}
                  selectedPolyId={selectedPolyId}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Sidebar footer */}
        <div style={{ padding: "8px 12px", borderTop: `1px solid ${COLORS.border}`, fontSize: 9, color: COLORS.textDim, fontFamily: "'Fira Code', monospace", flexShrink: 0 }}>
          {state.fields.length} fields · {state.fields.reduce((s, f) => s + f.polygons.length, 0)} project areas
        </div>
      </div>

      {/* ---- MAP ---- */}
      <div ref={mapRef} style={{ flex: 1 }} />

      {/* ---- NEW FIELD MODAL ---- */}
      <Modal open={showNewField} onClose={() => setShowNewField(false)} title="Add New Field" width={420}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input label="Field Name *" value={newFieldName} onChange={e => setNewFieldName(e.target.value)} placeholder="e.g. South Pivot" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Acres" type="number" value={newFieldAcres} onChange={e => setNewFieldAcres(e.target.value)} placeholder="0" />
            <Select label="Research Site" options={INITIAL_SITES.map(s => ({ value: s.id, label: s.name }))} value={newFieldSite} onChange={e => setNewFieldSite(e.target.value)} />
          </div>
          <p style={{ margin: 0, fontSize: 10, color: COLORS.textDim, lineHeight: 1.5 }}>
            A default boundary will be created near the site center. You can adjust the bounds after creation by drawing the actual boundary on the map.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setShowNewField(false)}>Cancel</Btn>
            <Btn onClick={handleAddField} disabled={!newFieldName.trim()}>Create Field</Btn>
          </div>
        </div>
      </Modal>

      {/* ---- STYLES ---- */}
      <style>{`
        .poly-label { background: rgba(0,0,0,0.75) !important; color: #d97706 !important; border: 1px solid #d97706 !important; font-family: 'Fira Code', monospace !important; font-size: 10px !important; font-weight: 700 !important; padding: 2px 6px !important; border-radius: 2px !important; }
        .field-label { background: rgba(0,0,0,0.6) !important; color: #e8eaed !important; border: 1px solid rgba(255,255,255,0.3) !important; font-family: 'Fira Code', monospace !important; font-size: 9px !important; font-weight: 600 !important; padding: 2px 6px !important; border-radius: 2px !important; letter-spacing: 0.5px !important; }
        .leaflet-container { background: #f5f3ef; }
        .leaflet-popup-content-wrapper { background: #fff; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.12); }
        .leaflet-popup-content { margin: 10px 12px; }
        .leaflet-popup-tip { background: #fff; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

// ============================================================
// CALENDAR MODULE — FIX: defaults to current month
// ============================================================
function CalendarModule() {
  const { state } = useContext(AppContext);
  const [selectedProjects, setSelectedProjects] = useState(state.projects.map(p => p.id));
  // FIX: Use current date instead of hardcoded April 2025
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState(null);

  const toggleProject = (id) => {
    setSelectedProjects(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // FIX: memoize expensive event computation
  const events = useMemo(() => {
    const evts = [];
    state.projects.filter(p => selectedProjects.includes(p.id)).forEach(proj => {
      if (proj.plantingDate) evts.push({ date: proj.plantingDate, type: "planting", label: "Planting", project: proj, color: COLORS.success });
      if (proj.harvestDate) evts.push({ date: proj.harvestDate, type: "harvest", label: "Harvest", project: proj, color: COLORS.danger });
      proj.applications?.forEach(app => {
        if (app.date) {
          evts.push({ date: app.date, type: "application", label: `App ${app.code} (${app.timing})`, project: proj, color: app.timing?.includes("PRE") ? COLORS.info : COLORS.warning });
          if (app.timing && !app.timing.includes("PRE")) {
            [7, 14, 21, 28].forEach(dat => {
              const datDate = new Date(app.date);
              datDate.setDate(datDate.getDate() + dat);
              evts.push({ date: datDate.toISOString().split("T")[0], type: "rating", label: `${dat} DAT (App ${app.code})`, project: proj, color: "#a855f7" });
            });
          }
        }
      });
    });
    return evts;
  }, [state.projects, selectedProjects]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = useMemo(() => {
    const d = [];
    for (let i = 0; i < firstDay; i++) d.push(null);
    for (let i = 1; i <= daysInMonth; i++) d.push(i);
    return d;
  }, [firstDay, daysInMonth]);

  const getEventsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter(e => e.date === dateStr);
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 52px)" }}>
      <div style={{ width: 220, background: COLORS.bgMid, borderRight: `1px solid ${COLORS.border}`, padding: 12, overflow: "auto" }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.textPrimary, marginBottom: 12 }}>Projects</div>
        {state.projects.map(p => (
          <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", cursor: "pointer", fontSize: 11, color: COLORS.textSecondary }}>
            <input type="checkbox" checked={selectedProjects.includes(p.id)} onChange={() => toggleProject(p.id)} />
            {p.title}
          </label>
        ))}
        <div style={{ marginTop: 16, fontSize: 10, color: COLORS.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Legend</div>
        {[
          { color: COLORS.success, label: "Planting" },
          { color: COLORS.info, label: "PRE Application" },
          { color: COLORS.warning, label: "POST Application" },
          { color: "#a855f7", label: "DAT Rating" },
          { color: COLORS.danger, label: "Harvest" },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 10, color: COLORS.textSecondary }}>
            <div style={{ width: 8, height: 8, borderRadius: 1, background: l.color }} /> {l.label}
          </div>
        ))}
        <div style={{ marginTop: 16 }}>
          <Btn size="sm" variant="secondary" style={{ width: "100%" }} onClick={() => {
            const now = new Date();
            setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
          }}>Today</Btn>
        </div>
      </div>
      <div style={{ flex: 1, padding: 20, overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Btn variant="ghost" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} aria-label="Previous month">← Prev</Btn>
          <h2 style={{ margin: 0, fontSize: 18, color: COLORS.textPrimary, fontWeight: 700 }}>
            {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
          </h2>
          <Btn variant="ghost" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} aria-label="Next month">Next →</Btn>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} style={{ padding: 6, textAlign: "center", fontSize: 10, color: COLORS.textDim, fontWeight: 700, fontFamily: "'Fira Code', monospace" }}>{d}</div>
          ))}
          {days.map((day, i) => {
            const dayEvents = getEventsForDay(day);
            const isToday = day && new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
            return (
              <div key={i} onClick={() => day && setSelectedDay({ day, events: dayEvents })} style={{
                minHeight: 80, padding: 4, background: day ? COLORS.bgCard : "transparent",
                border: `1px solid ${isToday ? COLORS.accent : COLORS.border}22`,
                borderRadius: 2, cursor: day ? "pointer" : "default"
              }}>
                {day && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? COLORS.accent : COLORS.textSecondary, fontFamily: "'Fira Code', monospace", marginBottom: 2 }}>{day}</div>
                    {dayEvents.slice(0, 3).map((e, ei) => (
                      <div key={ei} style={{ fontSize: 8, padding: "1px 3px", marginBottom: 1, background: e.color + "33", color: e.color, borderRadius: 1, borderLeft: `2px solid ${e.color}`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'Fira Code', monospace" }}>
                        {e.label}
                      </div>
                    ))}
                    {dayEvents.length > 3 && <div style={{ fontSize: 8, color: COLORS.textDim }}>+{dayEvents.length - 3} more</div>}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {selectedDay && selectedDay.events.length > 0 && (
          <Card style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.textPrimary, marginBottom: 10 }}>
              Events on {currentMonth.toLocaleString("default", { month: "long" })} {selectedDay.day}
            </div>
            {selectedDay.events.map((e, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${COLORS.border}22` }}>
                <div style={{ width: 10, height: 10, borderRadius: 1, background: e.color }} />
                <span style={{ fontSize: 12, color: COLORS.textPrimary, fontWeight: 600 }}>{e.label}</span>
                <Badge>{e.project.title}</Badge>
                {e.type === "application" && <Badge color={COLORS.warning}>Spray Day</Badge>}
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

// ============================================================
// HERBICIDE INVENTORY — functional CSV export
// ============================================================
function HerbicideInventory() {
  const { state } = useContext(AppContext);
  const [selectedProjects, setSelectedProjects] = useState(state.projects.map(p => p.id));
  const [toast, setToast] = useState(null);

  const aggregated = useMemo(() => {
    const map = {};
    state.projects.filter(p => selectedProjects.includes(p.id)).forEach(proj => {
      proj.inventory?.forEach(item => {
        const key = `${item.product}|${item.formConc}`;
        if (!map[key]) {
          map[key] = { ...item, totalMl: 0, projects: [] };
        }
        const ml = parseFloat(item.totalRequired?.replace(/[^0-9.]/g, "") || 0);
        map[key].totalMl += ml;
        map[key].projects.push(proj.title);
      });
    });
    return Object.values(map).sort((a, b) => b.totalMl - a.totalMl);
  }, [state.projects, selectedProjects]);

  // FIX: Functional export
  const handleExport = () => {
    const headers = ["Product", "Formulation", "Type", "Total Required (mL)", "Trials"];
    const rows = aggregated.map(r => [r.product, r.formConc, r.formType, r.totalMl.toFixed(3), r.projects.join("; ")]);
    downloadCSV(`herbicide_inventory_${new Date().toISOString().split("T")[0]}.csv`, headers, rows);
    setToast("Inventory exported as CSV");
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, color: COLORS.textPrimary, fontWeight: 700 }}>Herbicide Inventory</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textDim }}>Aggregated product requirements across selected trials (includes 25% overage)</p>
        </div>
        <Btn variant="secondary" onClick={handleExport}><DownloadIcon size={14} /> Export to CSV</Btn>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 }}>Include trials:</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {state.projects.map(p => (
            <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: COLORS.textSecondary, cursor: "pointer" }}>
              <input type="checkbox" checked={selectedProjects.includes(p.id)} onChange={() => setSelectedProjects(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])} />
              {p.title}
            </label>
          ))}
        </div>
      </Card>

      <Card>
        <Table columns={[
          { key: "product", label: "Herbicide Product" },
          { key: "formConc", label: "Formulation", mono: true },
          { key: "formType", label: "Type" },
          { key: "total", label: "Total Required", mono: true, render: r => `${r.totalMl.toFixed(3)} mL` },
          { key: "projects", label: "Trials", render: r => <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{r.projects.map((p, i) => <Badge key={i} color={COLORS.info}>{p}</Badge>)}</div> },
        ]} data={aggregated} />
        {aggregated.length === 0 && <p style={{ color: COLORS.textDim, fontSize: 13, textAlign: "center", padding: 20 }}>No inventory data. Select projects with uploaded ARM spray sheets.</p>}
      </Card>

      {selectedProjects.length > 0 && (
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {state.projects.filter(p => selectedProjects.includes(p.id)).map(proj => (
            <Card key={proj.id}>
              <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.textPrimary, marginBottom: 4 }}>{proj.title}</div>
              <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 8, fontFamily: "'Fira Code', monospace" }}>
                {proj.treatmentCount} TRT × {proj.reps} REP | App: {proj.appAmount} | Mix: {proj.mixSize}
              </div>
              {proj.inventory?.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "3px 0", borderBottom: `1px solid ${COLORS.border}11` }}>
                  <span style={{ color: COLORS.textSecondary }}>{item.product}</span>
                  <span style={{ fontFamily: "'Fira Code', monospace", color: COLORS.textPrimary }}>{item.totalRequired}</span>
                </div>
              ))}
            </Card>
          ))}
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

// ============================================================
// FILES MODULE
// ============================================================
function FilesModule() {
  const { state } = useContext(AppContext);
  const [selectedProject, setSelectedProject] = useState(state.projects[0]?.id || "");
  const proj = state.projects.find(p => p.id === selectedProject);
  const categories = ["protocols", "spray_sheets", "data_sheets", "photos", "maps"];

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, color: COLORS.textPrimary, fontWeight: 700 }}>File Manager</h2>
        <Select label="" options={state.projects.map(p => ({ value: p.id, label: p.title }))} value={selectedProject} onChange={e => setSelectedProject(e.target.value)} />
      </div>
      {proj ? (
        <div>
          <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 16, fontFamily: "'Fira Code', monospace" }}>
            /{proj.title.replace(/\s+/g, "_").toLowerCase()}/
          </div>
          {categories.map(cat => {
            const files = proj.files?.filter(f => f.category === cat) || [];
            return (
              <Card key={cat} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: COLORS.textPrimary, fontFamily: "'Fira Code', monospace" }}>/{cat}/</span>
                  <Badge>{files.length} files</Badge>
                </div>
                {files.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {files.map(f => (
                      <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: `1px solid ${COLORS.border}11` }}>
                        <FileIcon size={14} color={COLORS.textDim} />
                        <span style={{ fontSize: 12, color: COLORS.textPrimary, flex: 1 }}>{f.name}</span>
                        <span style={{ fontSize: 10, fontFamily: "'Fira Code', monospace", color: COLORS.textDim }}>{f.size}</span>
                        <span style={{ fontSize: 10, fontFamily: "'Fira Code', monospace", color: COLORS.textDim }}>{f.uploadDate}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card><p style={{ color: COLORS.textDim, fontSize: 13, textAlign: "center", padding: 20 }}>Select a project to view files</p></Card>
      )}
    </div>
  );
}

// ============================================================
// AUDIT LOG
// ============================================================
function AuditLog() {
  const { state } = useContext(AppContext);
  const sorted = useMemo(
    () => [...state.auditLog].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [state.auditLog]
  );

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ margin: "0 0 16px", fontSize: 20, color: COLORS.textPrimary, fontWeight: 700 }}>Audit Log</h2>
      <Card>
        <Table columns={[
          { key: "timestamp", label: "Timestamp", mono: true, render: r => new Date(r.timestamp).toLocaleString() },
          { key: "action", label: "Action", render: r => <Badge color={
            r.action.includes("Created") ? COLORS.success : r.action.includes("Upload") ? COLORS.info : r.action.includes("Map") || r.action.includes("Grid") ? COLORS.warning : r.action.includes("Rating") ? "#a855f7" : COLORS.textSecondary
          }>{r.action}</Badge> },
          { key: "detail", label: "Detail" },
          { key: "user", label: "User" },
        ]} data={sorted} />
      </Card>
    </div>
  );
}

// ============================================================
// PROJECTS LIST PAGE
// ============================================================
function ProjectsList({ onOpenProject }) {
  const { state } = useContext(AppContext);
  const [showNew, setShowNew] = useState(false);
  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, color: COLORS.textPrimary, fontWeight: 700 }}>All Projects</h2>
        <Btn onClick={() => setShowNew(true)}><PlusIcon size={14} /> New Project</Btn>
      </div>
      <Card>
        <Table columns={[
          { key: "title", label: "Title" },
          { key: "crop", label: "Crop" },
          { key: "status", label: "Status", render: r => <Badge color={r.status === "Active" ? COLORS.success : COLORS.textDim}>{r.status}</Badge> },
          { key: "treatmentCount", label: "TRT", mono: true },
          { key: "reps", label: "REP", mono: true },
          { key: "plots", label: "Plots", mono: true, render: r => r.treatmentCount * r.reps },
          { key: "plantingDate", label: "Planting", mono: true },
          { key: "harvestDate", label: "Harvest", mono: true },
          { key: "files", label: "Files", mono: true, render: r => r.files?.length || 0 },
        ]} data={state.projects} onRowClick={onOpenProject} />
      </Card>
      <NewProjectModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [page, setPage] = useState("home");
  const [openProject, setOpenProject] = useState(null);
  const [weather, setWeather] = useState(getSimulatedWeather);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const [state, dispatch] = useReducer(appReducer, {
    projects: MOCK_PROJECTS,
    fields: INITIAL_FIELDS,
    auditLog: INITIAL_AUDIT,
    currentUser: "Dr. Amit Jhala",
    mapPolygons: [],
  });

  // Hydrate from persistent storage on mount
  useEffect(() => {
    loadPersistedState().then(saved => {
      if (saved && saved.projects) {
        dispatch({ type: "HYDRATE", payload: saved });
      }
      setHydrated(true);
    });
  }, []);

  // Persist state on every change (after hydration)
  useEffect(() => {
    if (hydrated) {
      persistState({ projects: state.projects, fields: state.fields, auditLog: state.auditLog, mapPolygons: state.mapPolygons });
    }
  }, [state, hydrated]);

  // Weather poll
  useEffect(() => {
    const interval = setInterval(() => setWeather(getSimulatedWeather()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Load Leaflet
  useEffect(() => {
    if (window.L) { setLeafletLoaded(true); return; }
    const cssLink = document.createElement("link");
    cssLink.rel = "stylesheet";
    cssLink.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(cssLink);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = () => setLeafletLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Load fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
  }, []);

  const handleOpenProject = (proj) => { setOpenProject(proj); setPage("project-detail"); };
  const handleNavigate = (p) => { setPage(p); setOpenProject(null); };

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ state, dispatch }), [state]);

  const renderPage = () => {
    if (page === "project-detail" && openProject) return <ProjectDetails project={openProject} onBack={() => setPage("home")} />;
    switch (page) {
      case "home": return <HomeDashboard onNavigate={handleNavigate} onOpenProject={handleOpenProject} />;
      case "projects": return <ProjectsList onOpenProject={handleOpenProject} />;
      case "map": return leafletLoaded ? <InteractiveMap onOpenProject={handleOpenProject} /> : <div style={{ padding: 40, color: COLORS.textDim, display: "flex", alignItems: "center", gap: 8 }}><span style={{ display: "inline-block", width: 16, height: 16, border: `2px solid ${COLORS.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> Loading map...</div>;
      case "calendar": return <CalendarModule />;
      case "inventory": return <HerbicideInventory />;
      case "files": return <FilesModule />;
      case "audit": return <AuditLog />;
      default: return <HomeDashboard onNavigate={handleNavigate} onOpenProject={handleOpenProject} />;
    }
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: COLORS.bgDark, color: COLORS.textPrimary, fontFamily: "'DM Sans', -apple-system, sans-serif", overflow: "hidden" }}>
        <Header weather={weather} />
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <Sidebar active={page === "project-detail" ? "home" : page} onNavigate={handleNavigate} />
          <main style={{ flex: 1, overflow: "auto" }}>
            {renderPage()}
          </main>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppContext.Provider>
  );
}
