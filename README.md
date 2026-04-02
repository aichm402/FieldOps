[fieldops-README.md](https://github.com/user-attachments/files/26444549/fieldops-README.md)
# FieldOps

A local-first dashboard for organizing 50+ small-plot herbicide research projects across multiple field locations. Upload ARM-generated PDF spray plans, automatically extract trial data, manage projects as cards with editable dates and notes, and visualize plot boundaries on satellite imagery.

## Quick start

```bash
git clone <your-repo-url> fieldops
cd fieldops
chmod +x setup.sh && ./setup.sh
npm run dev
```

Open **http://localhost:3000**

## Manual setup

```bash
# Install all dependencies
npm install

# Create .env
echo 'DATABASE_URL="file:./dev.db"' > .env

# Create upload directories
mkdir -p public/uploads/pdfs public/uploads/fields

# Initialize database
npx prisma migrate dev --name init
npx prisma generate

# Start development server
npm run dev
```

## Dependencies

The following packages are required (installed by `npm install`):

```
next react react-dom           # Framework
prisma @prisma/client          # Database ORM
pdfjs-dist                     # PDF text extraction
fabric                         # Canvas/polygon drawing
swr                            # Data fetching
lucide-react                   # Icons
clsx                           # Conditional classes
```

## Features

### PDF upload & parse
Upload ARM-generated spray plans, trial maps, or protocol descriptions. The parser:
- Detects ARM format via 6 marker patterns (rejects non-ARM PDFs with clear feedback)
- Extracts: title, trial ID, protocol ID, crop, year, contacts, objectives, plot dimensions, reps, design type
- Parses full treatment tables with product names, rates, timing, and application codes
- Reports confidence level (high/medium/low) and specific warnings

### Project cards
- Searchable by title, trial ID, protocol ID, or crop
- Filterable by crop type with counts
- Each card shows crop-colored border, treatment count, reps, year, and four date fields
- Click to expand: full detail panel with contacts, objectives, editable dates (planting, emergence, PRE, POST), notes field, and collapsible treatment table
- Delete projects individually

### Map visualization
- Upload PNG/JPG satellite imagery as named "fields" (e.g. East Half, South Farm)
- Multiple fields supported via dropdown selector
- Draw polygon boundaries with click-to-add-vertex, double-click-to-finish tool
- Link each polygon to a project; displays title + crop label with crop-colored fill
- Click polygon → navigate to project detail
- Manage plots in right sidebar (select, navigate, delete)

### Dashboard
- Summary stats: total projects, crop types, trial years, dates entered
- Recent projects list with direct links
- Crop breakdown panel

### Settings
- Database stats (projects, treatments, fields, plots)
- File storage info
- Clear all data option

## Project structure

```
fieldops/
├── prisma/schema.prisma           # SQLite database schema
├── setup.sh                       # First-time setup script
├── public/uploads/                # Stored PDFs and field images
│   ├── pdfs/
│   └── fields/
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout with sidebar
│   │   ├── page.tsx               # Dashboard
│   │   ├── projects/page.tsx      # Project cards + detail
│   │   ├── upload/page.tsx        # PDF upload + parse preview
│   │   ├── map/page.tsx           # Field map visualization
│   │   ├── settings/page.tsx      # System info + data mgmt
│   │   └── api/                   # REST API routes
│   │       ├── upload/            # POST: parse PDF → create project
│   │       ├── projects/          # CRUD projects
│   │       ├── fields/            # CRUD field images
│   │       └── plots/             # CRUD plot polygons
│   ├── components/
│   │   ├── layout/Sidebar.tsx
│   │   ├── projects/
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── ProjectDetail.tsx
│   │   │   └── TreatmentTable.tsx
│   │   └── map/
│   │       ├── FieldCanvas.tsx    # fabric.js canvas
│   │       ├── FieldUpload.tsx
│   │       ├── PlotLinker.tsx
│   │       └── PlotSidebar.tsx
│   ├── hooks/
│   │   ├── useProjects.ts         # SWR data fetching
│   │   └── useFields.ts
│   └── lib/
│       ├── db.ts                  # Prisma client singleton
│       ├── types.ts               # Shared TypeScript types
│       └── parser/                # PDF parsing pipeline
│           ├── index.ts           # Main orchestrator
│           ├── extractText.ts     # pdfjs-dist wrapper
│           ├── validateArm.ts     # ARM format detection
│           ├── extractMeta.ts     # Metadata extraction
│           └── extractTreatments.ts
└── next.config.ts                 # Webpack config for pdfjs-dist
```

## API reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload` | Upload ARM PDF, parse, create project |
| `GET` | `/api/projects` | List projects (`?search=`, `?crop=`, `?year=`) |
| `POST` | `/api/projects` | Create project manually |
| `GET` | `/api/projects/:id` | Get project with treatments |
| `PUT` | `/api/projects/:id` | Update dates, notes |
| `DELETE` | `/api/projects/:id` | Delete project (cascades) |
| `GET` | `/api/fields` | List fields with plots |
| `POST` | `/api/fields` | Upload satellite image |
| `PUT` | `/api/fields/:id` | Rename / update dimensions |
| `DELETE` | `/api/fields/:id` | Delete field (cascades) |
| `GET` | `/api/plots` | List plots (`?fieldId=`) |
| `POST` | `/api/plots` | Create polygon |
| `PUT` | `/api/plots/:id` | Update polygon |
| `DELETE` | `/api/plots/:id` | Delete polygon |

## Tech stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 14 (App Router) | Single project, one `npm run dev` |
| Database | SQLite + Prisma | Zero-config, file-based |
| PDF | pdfjs-dist | Server-side text extraction |
| Canvas | fabric.js v6 | Polygon drawing on images |
| UI | Tailwind CSS v4 + lucide-react | Styling + icons |
| State | SWR | Client-side data fetching |

## Acceptance criteria

Upload any of the provided ARM PDFs → system creates a project card with:
- Extracted title, crop, and treatment count
- Blank fillable fields for planting date, emergence date, PRE date, POST date, and notes
- Expandable treatment table with full product details
