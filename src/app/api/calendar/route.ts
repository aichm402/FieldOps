import { NextRequest, NextResponse } from "next/server";
import { getDb, query, run } from "@/lib/db";
import { v4 as uuid } from "uuid";

interface EventRow {
  id: string;
  date: string;
  title: string;
  notes: string | null;
  color: string;
  created_at: string;
}

interface ProjectLink {
  event_id: string;
  project_id: string;
  project_name: string;
}

function attachProjects(events: EventRow[]): object[] {
  if (events.length === 0) return [];
  const links = query<ProjectLink>(`
    SELECT cep.event_id, cep.project_id, p.name as project_name
    FROM calendar_event_projects cep
    JOIN projects p ON p.id = cep.project_id
    WHERE cep.event_id IN (${events.map(() => "?").join(",")})
  `, events.map((e) => e.id));

  const byEvent: Record<string, { id: string; name: string }[]> = {};
  for (const l of links) {
    if (!byEvent[l.event_id]) byEvent[l.event_id] = [];
    byEvent[l.event_id].push({ id: l.project_id, name: l.project_name });
  }

  return events.map((e) => ({ ...e, projects: byEvent[e.id] ?? [] }));
}

export async function GET() {
  await getDb();
  const events = query<EventRow>(`SELECT * FROM calendar_events ORDER BY date ASC, created_at ASC`);
  return NextResponse.json(attachProjects(events));
}

export async function POST(req: NextRequest) {
  await getDb();
  const body = await req.json() as {
    date: string;
    title: string;
    project_ids?: string[];
    notes?: string | null;
    color?: string;
  };

  if (!body.date || !body.title?.trim()) {
    return NextResponse.json({ error: "date and title are required" }, { status: 400 });
  }

  const id = uuid();
  run(
    `INSERT INTO calendar_events (id, date, title, notes, color) VALUES (?, ?, ?, ?, ?)`,
    [id, body.date, body.title.trim(), body.notes?.trim() ?? null, body.color ?? "accent"]
  );

  for (const pid of body.project_ids ?? []) {
    run(`INSERT OR IGNORE INTO calendar_event_projects (event_id, project_id) VALUES (?, ?)`, [id, pid]);
  }

  const created = query<EventRow>(`SELECT * FROM calendar_events WHERE id = ?`, [id]);
  return NextResponse.json(attachProjects(created)[0], { status: 201 });
}
