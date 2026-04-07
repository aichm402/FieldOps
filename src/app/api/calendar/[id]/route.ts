import { NextRequest, NextResponse } from "next/server";
import { getDb, query, run } from "@/lib/db";

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

function attachProjects(event: EventRow): object {
  const links = query<ProjectLink>(`
    SELECT cep.event_id, cep.project_id, p.name as project_name
    FROM calendar_event_projects cep
    JOIN projects p ON p.id = cep.project_id
    WHERE cep.event_id = ?
  `, [event.id]);
  return { ...event, projects: links.map((l) => ({ id: l.project_id, name: l.project_name })) };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await getDb();
  const { id } = await params;
  const body = await req.json() as {
    date?: string;
    title?: string;
    project_ids?: string[];
    notes?: string | null;
    color?: string;
  };

  const existing = query<EventRow>(`SELECT * FROM calendar_events WHERE id = ?`, [id]);
  if (existing.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.date !== undefined)  run(`UPDATE calendar_events SET date = ? WHERE id = ?`, [body.date, id]);
  if (body.title !== undefined) run(`UPDATE calendar_events SET title = ? WHERE id = ?`, [body.title.trim(), id]);
  if ("notes" in body)         run(`UPDATE calendar_events SET notes = ? WHERE id = ?`, [body.notes?.trim() ?? null, id]);
  if (body.color !== undefined) run(`UPDATE calendar_events SET color = ? WHERE id = ?`, [body.color, id]);

  if (body.project_ids !== undefined) {
    run(`DELETE FROM calendar_event_projects WHERE event_id = ?`, [id]);
    for (const pid of body.project_ids) {
      run(`INSERT OR IGNORE INTO calendar_event_projects (event_id, project_id) VALUES (?, ?)`, [id, pid]);
    }
  }

  const updated = query<EventRow>(`SELECT * FROM calendar_events WHERE id = ?`, [id]);
  return NextResponse.json(attachProjects(updated[0]));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await getDb();
  const { id } = await params;
  run(`DELETE FROM calendar_events WHERE id = ?`, [id]);
  return NextResponse.json({ success: true });
}
