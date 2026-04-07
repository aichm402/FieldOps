"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, X, Trash2, Pencil } from "lucide-react";

interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  projects: { id: string; name: string }[];
  notes: string | null;
  color: string;
}

interface Project {
  id: string;
  name: string;
  crop: string | null;
}

const EVENT_COLORS: { key: string; label: string; bg: string; text: string; dot: string }[] = [
  { key: "accent",  label: "Blue",   bg: "rgba(59,130,246,0.15)",  text: "#2563eb", dot: "#3b82f6" },
  { key: "green",   label: "Green",  bg: "rgba(34,197,94,0.15)",   text: "#16a34a", dot: "#22c55e" },
  { key: "orange",  label: "Orange", bg: "rgba(249,115,22,0.15)",  text: "#ea580c", dot: "#f97316" },
  { key: "red",     label: "Red",    bg: "rgba(239,68,68,0.15)",   text: "#dc2626", dot: "#ef4444" },
  { key: "purple",  label: "Purple", bg: "rgba(168,85,247,0.15)",  text: "#9333ea", dot: "#a855f7" },
  { key: "gray",    label: "Gray",   bg: "rgba(107,114,128,0.15)", text: "#6b7280", dot: "#9ca3af" },
];

function colorStyle(key: string) {
  return EVENT_COLORS.find((c) => c.key === key) ?? EVENT_COLORS[0];
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

interface EventModalProps {
  initialDate: string;
  event: CalendarEvent | null;
  projects: Project[];
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  onDelete: (id: string) => void;
}

function EventModal({ initialDate, event, projects, onClose, onSave, onDelete }: EventModalProps) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [date, setDate] = useState(event?.date ?? initialDate);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(
    new Set(event?.projects.map((p) => p.id) ?? [])
  );
  const [projectSearch, setProjectSearch] = useState("");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [color, setColor] = useState(event?.color ?? "accent");
  const [saving, setSaving] = useState(false);

  const isEdit = !!event;

  const toggleProject = (id: string) => {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
    (p.crop ?? "").toLowerCase().includes(projectSearch.toLowerCase())
  );

  const handleSave = async () => {
    if (!title.trim() || !date) return;
    setSaving(true);
    try {
      const body = {
        date,
        title: title.trim(),
        project_ids: Array.from(selectedProjectIds),
        notes: notes.trim() || null,
        color,
      };
      const res = isEdit
        ? await fetch(`/api/calendar/${event.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) return;
      const saved: CalendarEvent = await res.json();
      onSave(saved);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !confirm("Delete this event?")) return;
    await fetch(`/api/calendar/${event.id}`, { method: "DELETE" });
    onDelete(event.id);
    onClose();
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "1.5rem", width: 500, maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>{isEdit ? "Edit Event" : "New Event"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2 }}>
            <X size={18} />
          </button>
        </div>

        {/* Title */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, marginBottom: "0.375rem" }}>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
            placeholder="Event title"
            style={{ width: "100%", padding: "0.5rem 0.625rem", fontSize: "0.875rem", borderRadius: 6, border: "1px solid var(--border)", boxSizing: "border-box" }}
            autoFocus
          />
        </div>

        {/* Date */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, marginBottom: "0.375rem" }}>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: "100%", padding: "0.5rem 0.625rem", fontSize: "0.875rem", borderRadius: 6, border: "1px solid var(--border)", boxSizing: "border-box" }}
          />
        </div>

        {/* Linked Projects */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, marginBottom: "0.375rem" }}>
            Linked Projects{" "}
            <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>
              (optional{selectedProjectIds.size > 0 ? ` · ${selectedProjectIds.size} selected` : ""})
            </span>
          </label>

          {/* Selected tags */}
          {selectedProjectIds.size > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "0.5rem" }}>
              {projects.filter((p) => selectedProjectIds.has(p.id)).map((p) => (
                <span
                  key={p.id}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0.2rem 0.5rem", borderRadius: 4, background: "rgba(59,130,246,0.12)", color: "#2563eb", fontSize: "0.75rem", fontWeight: 500 }}
                >
                  {p.name}
                  <button
                    onClick={() => toggleProject(p.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, lineHeight: 1, display: "flex", alignItems: "center" }}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search + checkbox list */}
          <div style={{ border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
            <input
              type="text"
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              placeholder="Search projects…"
              style={{ width: "100%", padding: "0.4rem 0.625rem", fontSize: "0.8125rem", border: "none", borderBottom: "1px solid var(--border)", boxSizing: "border-box", outline: "none" }}
            />
            <div style={{ maxHeight: 160, overflowY: "auto" }}>
              {filteredProjects.length === 0 ? (
                <div style={{ padding: "0.625rem 0.75rem", fontSize: "0.8125rem", color: "var(--text-muted)" }}>No projects found</div>
              ) : (
                filteredProjects.map((p) => {
                  const checked = selectedProjectIds.has(p.id);
                  return (
                    <label
                      key={p.id}
                      style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.5rem 0.75rem", cursor: "pointer", background: checked ? "rgba(59,130,246,0.06)" : "transparent" }}
                      onMouseEnter={(e) => { if (!checked) e.currentTarget.style.background = "var(--bg-secondary)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = checked ? "rgba(59,130,246,0.06)" : "transparent"; }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleProject(p.id)}
                        style={{ accentColor: "var(--accent)", width: 14, height: 14, flexShrink: 0 }}
                      />
                      <span style={{ fontSize: "0.875rem", flex: 1, minWidth: 0 }}>
                        {p.name}
                        {p.crop && <span style={{ color: "var(--text-muted)", marginLeft: 6, fontSize: "0.8125rem" }}>{p.crop}</span>}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, marginBottom: "0.375rem" }}>Notes <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span></label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes…"
            rows={2}
            style={{ width: "100%", padding: "0.5rem 0.625rem", fontSize: "0.875rem", borderRadius: 6, border: "1px solid var(--border)", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }}
          />
        </div>

        {/* Color */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, marginBottom: "0.5rem" }}>Color</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {EVENT_COLORS.map((c) => (
              <button
                key={c.key}
                onClick={() => setColor(c.key)}
                title={c.label}
                style={{ width: 24, height: 24, borderRadius: "50%", background: c.dot, border: color === c.key ? "2px solid var(--text-primary)" : "2px solid transparent", cursor: "pointer", padding: 0, outline: color === c.key ? "2px solid var(--bg-card)" : "none", outlineOffset: -4 }}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {isEdit ? (
            <button
              onClick={handleDelete}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "0.5rem 0.875rem", borderRadius: 6, fontSize: "0.875rem", background: "none", border: "1px solid var(--danger, #ef4444)", color: "var(--danger, #ef4444)", cursor: "pointer" }}
            >
              <Trash2 size={14} /> Delete
            </button>
          ) : <div />}
          <div style={{ display: "flex", gap: "0.625rem" }}>
            <button onClick={onClose} style={{ padding: "0.5rem 1rem", borderRadius: 6, fontSize: "0.875rem", background: "none", border: "1px solid var(--border)", cursor: "pointer" }}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim() || !date}
              style={{ padding: "0.5rem 1rem", borderRadius: 6, fontSize: "0.875rem", fontWeight: 500, background: "var(--accent)", color: "#fff", border: "none", cursor: saving ? "wait" : "pointer", opacity: saving || !title.trim() || !date ? 0.6 : 1 }}
            >
              {saving ? "Saving…" : isEdit ? "Save" : "Add Event"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    fetch("/api/calendar").then((r) => r.json()).then(setEvents);
    fetch("/api/projects").then((r) => r.json()).then(setProjects);
  }, []);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay(); // 0=Sun
  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

  const cells: (Date | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    if (dayNum < 1 || dayNum > lastDay.getDate()) cells.push(null);
    else cells.push(new Date(year, month, dayNum));
  }

  // Index events by date string
  const eventsByDate: Record<string, CalendarEvent[]> = {};
  for (const e of events) {
    if (!eventsByDate[e.date]) eventsByDate[e.date] = [];
    eventsByDate[e.date].push(e);
  }

  const todayStr = formatDate(today);
  const monthLabel = firstDay.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const handleDayClick = (date: Date) => {
    setModalDate(formatDate(date));
    setEditingEvent(null);
  };

  const handleEventClick = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    setEditingEvent(event);
    setModalDate(event.date);
  };

  const handleSave = (saved: CalendarEvent) => {
    setEvents((prev) => {
      const filtered = prev.filter((e) => e.id !== saved.id);
      return [...filtered, saved].sort((a, b) => a.date.localeCompare(b.date));
    });
  };

  const handleDelete = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <CalendarDays size={22} style={{ color: "var(--accent)" }} />
            Calendar
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: 4 }}>
            Click any day to add an event. Click an event to edit it.
          </p>
        </div>
        <button
          onClick={() => { setModalDate(formatDate(today)); setEditingEvent(null); }}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--accent)", color: "#fff", padding: "0.5rem 1rem", borderRadius: 6, fontSize: "0.875rem", fontWeight: 500, border: "none", cursor: "pointer" }}
        >
          <Plus size={16} /> Add Event
        </button>
      </div>

      {/* Month navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
        <button onClick={prevMonth} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "0.375rem 0.625rem", cursor: "pointer", display: "flex", alignItems: "center" }}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontWeight: 600, fontSize: "1.125rem", minWidth: 180, textAlign: "center" }}>{monthLabel}</span>
        <button onClick={nextMonth} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "0.375rem 0.625rem", cursor: "pointer", display: "flex", alignItems: "center" }}>
          <ChevronRight size={16} />
        </button>
        <button onClick={goToday} style={{ fontSize: "0.8125rem", padding: "0.375rem 0.75rem", borderRadius: 6, border: "1px solid var(--border)", background: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
          Today
        </button>
      </div>

      {/* Calendar grid */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        {/* Day name header */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border)" }}>
          {DAY_NAMES.map((d) => (
            <div key={d} style={{ padding: "0.5rem", textAlign: "center", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {cells.map((date, i) => {
            const dateStr = date ? formatDate(date) : null;
            const isToday = dateStr === todayStr;
            const isCurrentMonth = date !== null;
            const dayEvents = dateStr ? (eventsByDate[dateStr] ?? []) : [];
            const isLastRow = i >= cells.length - 7;
            const isLastCol = i % 7 === 6;

            return (
              <div
                key={i}
                onClick={() => date && handleDayClick(date)}
                style={{
                  minHeight: 90,
                  padding: "0.375rem",
                  borderRight: isLastCol ? "none" : "1px solid var(--border)",
                  borderBottom: isLastRow ? "none" : "1px solid var(--border)",
                  background: isToday ? "rgba(59,130,246,0.06)" : "transparent",
                  cursor: isCurrentMonth ? "pointer" : "default",
                  transition: "background 0.1s",
                  position: "relative",
                }}
                onMouseEnter={(e) => { if (isCurrentMonth) e.currentTarget.style.background = isToday ? "rgba(59,130,246,0.1)" : "var(--bg-secondary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = isToday ? "rgba(59,130,246,0.06)" : "transparent"; }}
              >
                {/* Day number */}
                {date && (
                  <div style={{
                    fontSize: "0.8125rem", fontWeight: isToday ? 700 : 400,
                    color: isToday ? "var(--accent)" : "var(--text-secondary)",
                    width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center",
                    borderRadius: "50%", background: isToday ? "rgba(59,130,246,0.15)" : "transparent",
                    marginBottom: "0.25rem",
                  }}>
                    {date.getDate()}
                  </div>
                )}

                {/* Events */}
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {dayEvents.slice(0, 3).map((ev) => {
                    const cs = colorStyle(ev.color);
                    const projectLabel = ev.projects.map((p) => p.name).join(", ");
                    return (
                      <div
                        key={ev.id}
                        onClick={(e) => handleEventClick(e, ev)}
                        title={ev.title + (projectLabel ? ` — ${projectLabel}` : "")}
                        style={{
                          background: cs.bg, color: cs.text,
                          padding: "0.125rem 0.375rem", borderRadius: 3,
                          fontSize: "0.6875rem", fontWeight: 500,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          cursor: "pointer", display: "flex", alignItems: "center", gap: 3,
                        }}
                      >
                        {ev.projects.length > 0 && (
                          <span style={{ opacity: 0.7, flexShrink: 0 }}>●</span>
                        )}
                        {ev.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", paddingLeft: "0.25rem" }}>
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming events sidebar */}
      {events.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Upcoming Events
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {events
              .filter((e) => e.date >= todayStr)
              .slice(0, 8)
              .map((ev) => {
                const cs = colorStyle(ev.color);
                const d = toLocalDate(ev.date);
                return (
                  <div
                    key={ev.id}
                    onClick={() => { setEditingEvent(ev); setModalDate(ev.date); }}
                    style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.625rem 1rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-secondary)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-card)"}
                  >
                    <div style={{ width: 4, alignSelf: "stretch", borderRadius: 4, background: cs.dot, flexShrink: 0 }} />
                    <div style={{ minWidth: 56 }}>
                      <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                        {d.toLocaleDateString("en-US", { month: "short" })}
                      </div>
                      <div style={{ fontSize: "1.125rem", fontWeight: 700, lineHeight: 1, color: "var(--text-primary)" }}>
                        {d.getDate()}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: "0.9rem", color: "var(--text-primary)" }}>{ev.title}</div>
                      {ev.projects.length > 0 && (
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                          {ev.projects.map((p) => p.name).join(", ")}
                        </div>
                      )}
                    </div>
                    <Pencil size={13} style={{ color: "var(--text-muted)", opacity: 0.5, flexShrink: 0 }} />
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Modal */}
      {modalDate && (
        <EventModal
          initialDate={modalDate}
          event={editingEvent}
          projects={projects}
          onClose={() => { setModalDate(null); setEditingEvent(null); }}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
