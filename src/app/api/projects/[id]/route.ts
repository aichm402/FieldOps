import { NextRequest, NextResponse } from "next/server";
import { getDb, query, run } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await getDb();
  const { id } = await params;

  const project = query(`SELECT * FROM projects WHERE id = ?`, [id]);
  if (project.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const requirements = query(
    `SELECT ir.*, p.name as product_name, p.canonical_name
     FROM inventory_requirements ir
     JOIN products p ON p.id = ir.product_id
     WHERE ir.project_id = ?
     ORDER BY p.canonical_name ASC`,
    [id]
  );

  const events = query(
    `SELECT ce.id, ce.title, ce.date, ce.notes, ce.color
     FROM calendar_events ce
     JOIN calendar_event_projects cep ON cep.event_id = ce.id
     WHERE cep.project_id = ?
     ORDER BY ce.date ASC`,
    [id]
  );

  return NextResponse.json({ ...project[0], requirements, events });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await getDb();
  const { id } = await params;

  const project = query(`SELECT id FROM projects WHERE id = ?`, [id]);
  if (project.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json() as { crop?: string | null; application_timings?: string[] };

  if ("crop" in body) {
    run(`UPDATE projects SET crop = ? WHERE id = ?`, [
      body.crop?.trim() || null,
      id,
    ]);
  }

  if ("application_timings" in body) {
    const timings = (body.application_timings ?? []).map((t) => t.trim().toUpperCase()).filter(Boolean);
    run(`UPDATE projects SET application_timings = ? WHERE id = ?`, [
      timings.length > 0 ? JSON.stringify(timings) : null,
      id,
    ]);
  }

  const updated = query(`SELECT * FROM projects WHERE id = ?`, [id]);
  return NextResponse.json(updated[0]);
}
