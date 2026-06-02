import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const IRS_RATE_2026 = 0.70;

const SUPABASE_URL = "https://foflzpsgshrziblffezl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvZmx6cHNnc2hyemlibGZmZXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MjE0ODEsImV4cCI6MjA5NTk5NzQ4MX0.RPRADroSrZZKWlJdu5UiEomKPc5uTMcCStBsT6NlLFA";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MCP_SERVERS = [
  { type: "url", url: "https://gmailmcp.googleapis.com/mcp/v1", name: "gmail-mcp" },
  { type: "url", url: "https://calendarmcp.googleapis.com/mcp/v1", name: "calendar-mcp" },
];

const INITIAL_CLIENTS = [
  { id: 1, name: "Apex Creative", email: "contact@apexcreative.com", phone: "555-0101", status: "active", totalBilled: 4200, outstanding: 800 },
  { id: 2, name: "Riverside Church", email: "media@riverside.org", phone: "555-0182", status: "active", totalBilled: 1800, outstanding: 0 },
  { id: 3, name: "Summit Realty", email: "hello@summitrealty.com", phone: "555-0234", status: "prospect", totalBilled: 0, outstanding: 0 },
];

const INITIAL_PROJECTS = [
  { id: 1, clientId: 1, name: "Brand Promo Video", status: "in_progress", value: 2400, dueDate: "2026-06-15", notes: "Main edit done. Social media versions pending." },
  { id: 2, clientId: 2, name: "Sunday Service Recap", status: "completed", value: 900, dueDate: "2026-05-20", notes: "" },
  { id: 3, clientId: 1, name: "Social Media Cuts", status: "in_progress", value: 800, dueDate: "2026-06-20", notes: "Waiting on webinar flyer from client." },
];

const INITIAL_INVOICES = [
  { id: 1, clientId: 1, projectId: 1, number: "INV-001", amount: 1600, status: "paid", date: "2026-05-01", dueDate: "2026-05-15" },
  { id: 2, clientId: 1, projectId: 1, number: "INV-002", amount: 800, status: "outstanding", date: "2026-05-20", dueDate: "2026-06-05" },
  { id: 3, clientId: 2, projectId: 2, number: "INV-003", amount: 900, status: "paid", date: "2026-05-22", dueDate: "2026-06-01" },
];

const EXPENSE_CATEGORIES = [
  "Software & Subscriptions", "Equipment & Gear", "Storage & Drives",
  "Office & Supplies", "Travel & Transport", "Marketing & Advertising",
  "Professional Services", "Education & Training", "Meals & Entertainment", "Other"
];

const INITIAL_EXPENSES = [
  { id: 1, date: "2026-05-03", description: "Adobe Creative Cloud", amount: 54.99, category: "Software & Subscriptions", deductible: true, notes: "" },
  { id: 2, date: "2026-05-10", description: "SanDisk 2TB SSD", amount: 189.00, category: "Equipment & Gear", deductible: true, notes: "For client project storage" },
  { id: 3, date: "2026-05-18", description: "Client lunch meeting", amount: 42.50, category: "Meals & Entertainment", deductible: true, notes: "50% deductible" },
  { id: 4, date: "2026-06-01", description: "Frame.io subscription", amount: 15.00, category: "Software & Subscriptions", deductible: true, notes: "" },
];

const INITIAL_MILEAGE = [
  { id: 1, date: "2026-05-08", from: "Home", to: "Apex Creative Office", miles: 14.2, purpose: "Project kickoff meeting", clientId: 1, deductible: true },
  { id: 2, date: "2026-05-14", from: "Home", to: "Riverside Church", miles: 8.6, purpose: "On-site filming", clientId: 2, deductible: true },
  { id: 3, date: "2026-05-28", from: "Home", to: "Best Buy", miles: 6.1, purpose: "Equipment purchase", clientId: null, deductible: true },
];

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "⬡" },
  { id: "clients", label: "Clients", icon: "◈" },
  { id: "projects", label: "Projects", icon: "◫" },
  { id: "invoices", label: "Invoices", icon: "◧" },
  { id: "expenses", label: "Expenses", icon: "◰" },
  { id: "mileage", label: "Mileage", icon: "◱" },
  { id: "calendar", label: "Calendar", icon: "◻" },
  { id: "contracts", label: "Contracts", icon: "◪" },
  { id: "assistant", label: "AI Assistant", icon: "◉" },
];

const STATUS_COLORS = {
  active: "#4ade80", prospect: "#facc15", inactive: "#6b7280",
  in_progress: "#60a5fa", completed: "#4ade80", on_hold: "#facc15", cancelled: "#f87171",
  paid: "#4ade80", outstanding: "#facc15", overdue: "#f87171", draft: "#6b7280",
};

function callClaude(messages, systemPrompt = "") {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1000,
      system: systemPrompt || "You are a helpful business assistant for Nate at Underhillmedia, a video editing and content creation company. Be concise and professional. Never use dashes in your responses.",
      messages,
      mcp_servers: MCP_SERVERS,
    }),
  })
    .then((r) => r.json())
    .then((d) => {
      const text = d.content?.filter((b) => b.type === "text").map((b) => b.text).join("\n");
      return text || "No response.";
    });
}

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
      border: `1px solid ${accent}33`,
      borderRadius: 12,
      padding: "24px 28px",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: -20, right: -20,
        width: 80, height: 80, borderRadius: "50%",
        background: `${accent}18`,
      }} />
      <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "#8892a4", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 32, fontFamily: "'DM Mono', monospace", color: accent, fontWeight: 500, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#6b7a8e", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ── Badge ──────────────────────────────────────────────────────────────────
function Badge({ status }) {
  const color = STATUS_COLORS[status] || "#8892a4";
  const label = status.replace("_", " ");
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20,
      background: `${color}18`, border: `1px solid ${color}44`,
      fontSize: 11, color, letterSpacing: "0.08em", textTransform: "capitalize",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
      {label}
    </span>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#000000cc", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}
      onClick={onClose}
    >
      <div style={{
        background: "#0f1623", border: "1px solid #2a3550",
        borderRadius: 16, padding: 32, minWidth: 480, maxWidth: 600,
        boxShadow: "0 40px 80px #000a",
      }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: "#e2e8f0", fontFamily: "'Playfair Display', serif" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#6b7a8e", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 11, letterSpacing: "0.1em", color: "#8892a4", textTransform: "uppercase", marginBottom: 6 }}>{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", background: "#1a2235", border: "1px solid #2a3550",
          borderRadius: 8, padding: "10px 14px", color: "#e2e8f0", fontSize: 14,
          outline: "none", boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 11, letterSpacing: "0.1em", color: "#8892a4", textTransform: "uppercase", marginBottom: 6 }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", background: "#1a2235", border: "1px solid #2a3550", borderRadius: 8, padding: "10px 14px", color: "#e2e8f0", fontSize: 14, outline: "none" }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function CheckField({ label, checked, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, cursor: "pointer" }} onClick={() => onChange(!checked)}>
      <div style={{
        width: 18, height: 18, borderRadius: 4, border: `2px solid ${checked ? "#4ade80" : "#2a3550"}`,
        background: checked ? "#4ade8030" : "transparent", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {checked && <span style={{ color: "#4ade80", fontSize: 11, lineHeight: 1 }}>✓</span>}
      </div>
      <span style={{ fontSize: 13, color: "#8892a4" }}>{label}</span>
    </div>
  );
}

function PrimaryBtn({ onClick, children, style = {} }) {
  return (
    <button onClick={onClick} style={{
      background: "linear-gradient(135deg, #3b5bdb, #4c6ef5)",
      border: "none", borderRadius: 8, padding: "10px 22px",
      color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
      letterSpacing: "0.04em", ...style,
    }}>{children}</button>
  );
}

function GhostBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: "none", border: "1px solid #2a3550", borderRadius: 8,
      padding: "10px 22px", color: "#8892a4", fontSize: 13, cursor: "pointer",
    }}>{children}</button>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────
function Dashboard({ clients, projects, invoices, expenses, mileage, followups }) {
  const totalOutstanding = invoices.filter(i => i.status === "outstanding").reduce((s, i) => s + i.amount, 0);
  const totalEarned = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const activeProjects = projects.filter(p => p.status === "in_progress").length;
  const totalDeductions = expenses.filter(e => e.deductible).reduce((s, e) => s + e.amount, 0);
  const totalMiles = mileage.filter(m => m.deductible).reduce((s, m) => s + m.miles, 0);
  const mileageDeduction = totalMiles * IRS_RATE_2026;

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ margin: 0, fontSize: 28, color: "#e2e8f0", fontFamily: "'Playfair Display', serif" }}>Good morning, Nate.</h2>
        <p style={{ margin: "6px 0 0", color: "#6b7a8e", fontSize: 14 }}>Here's what's happening at Underhillmedia.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
        <StatCard label="Outstanding" value={`$${totalOutstanding.toLocaleString()}`} sub="awaiting payment" accent="#facc15" />
        <StatCard label="Total Earned" value={`$${totalEarned.toLocaleString()}`} sub="all time paid" accent="#4ade80" />
        <StatCard label="Active Projects" value={activeProjects} sub="in progress" accent="#60a5fa" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 36 }}>
        <StatCard label="Expense Deductions" value={`$${totalDeductions.toFixed(2)}`} sub="deductible this year" accent="#c084fc" />
        <StatCard label="Mileage Deduction" value={`$${mileageDeduction.toFixed(0)}`} sub={`${totalMiles.toFixed(1)} miles @ $${IRS_RATE_2026}/mi`} accent="#fb923c" />
        <StatCard label="Total Clients" value={clients.length} sub={`${clients.filter(c => c.status === "active").length} active`} accent="#38bdf8" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>
        <div style={{ background: "#0f1623", border: "1px solid #1e2d45", borderRadius: 12, padding: 24 }}>
          <h3 style={{ margin: "0 0 20px", fontSize: 14, color: "#8892a4", letterSpacing: "0.1em", textTransform: "uppercase" }}>Active Projects</h3>
          {projects.filter(p => p.status === "in_progress").map(p => {
            const client = clients.find(c => c.id === p.clientId);
            return (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid #1a2235" }}>
                <div>
                  <div style={{ color: "#e2e8f0", fontSize: 14, marginBottom: 3 }}>{p.name}</div>
                  <div style={{ color: "#6b7a8e", fontSize: 12 }}>{client?.name} · Due {p.dueDate}</div>
                  {p.notes && <div style={{ color: "#facc1599", fontSize: 11, marginTop: 3 }}>{p.notes}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#60a5fa", fontFamily: "'DM Mono', monospace", fontSize: 14 }}>${p.value.toLocaleString()}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#0f1623", border: "1px solid #1e2d45", borderRadius: 12, padding: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 14, color: "#8892a4", letterSpacing: "0.1em", textTransform: "uppercase" }}>Outstanding Invoices</h3>
            {invoices.filter(i => i.status === "outstanding").map(inv => {
              const client = clients.find(c => c.id === inv.clientId);
              return (
                <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1a2235" }}>
                  <div>
                    <div style={{ color: "#e2e8f0", fontSize: 13 }}>{inv.number}</div>
                    <div style={{ color: "#6b7a8e", fontSize: 11 }}>{client?.name}</div>
                  </div>
                  <div style={{ color: "#facc15", fontFamily: "'DM Mono', monospace", fontSize: 14 }}>${inv.amount.toLocaleString()}</div>
                </div>
              );
            })}
            {invoices.filter(i => i.status === "outstanding").length === 0 && <div style={{ color: "#4ade80", fontSize: 13 }}>All clear.</div>}
          </div>
          <div style={{ background: "#0f1623", border: "1px solid #1e2d45", borderRadius: 12, padding: 24 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 14, color: "#8892a4", letterSpacing: "0.1em", textTransform: "uppercase" }}>Recent Expenses</h3>
            {expenses.slice(-3).reverse().map(e => (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #1a2235" }}>
                <div style={{ color: "#c8d3e0", fontSize: 12 }}>{e.description}</div>
                <div style={{ color: "#c084fc", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>${e.amount.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CRM / CLIENTS ──────────────────────────────────────────────────────────
const PIPELINE_STAGES = ["Lead", "Contacted", "Proposal Sent", "Active", "Repeat Client", "Inactive"];
const INTERACTION_TYPES = ["Call", "Email", "Meeting", "Text", "Proposal", "Invoice Sent", "Note"];

const INITIAL_INTERACTIONS = [
  { id: 1, clientId: 1, type: "Meeting", date: "2026-05-08", note: "Kickoff meeting for brand promo video. They want two social cuts as well." },
  { id: 2, clientId: 1, type: "Email", date: "2026-05-20", note: "Sent invoice INV-002 for second half of promo project." },
  { id: 3, clientId: 2, type: "Call", date: "2026-05-12", note: "Discussed Sunday recap format. They want a 90-second highlight reel going forward." },
  { id: 4, clientId: 3, type: "Email", date: "2026-05-25", note: "Sent intro email and portfolio link. No response yet." },
];

const INITIAL_FOLLOWUPS = [
  { id: 1, clientId: 1, note: "Follow up on webinar flyer needed for social cuts", dueDate: "2026-06-05", done: false },
  { id: 2, clientId: 3, note: "Check back with Summit Realty — no response to intro email", dueDate: "2026-06-08", done: false },
];

function ClientDetail({ client, interactions, followups, setInteractions, setFollowups, onClose, generating, setGenerating }) {
  const [tab, setTab] = useState("log");
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState("Note");
  const [newFollowup, setNewFollowup] = useState("");
  const [followupDate, setFollowupDate] = useState("");
  const [emailDraft, setEmailDraft] = useState("");

  const clientInteractions = interactions.filter(i => i.clientId === client.id).sort((a, b) => b.date.localeCompare(a.date));
  const clientFollowups = followups.filter(f => f.clientId === client.id);

  const addInteraction = () => {
    if (!newNote.trim()) return;
    setInteractions(prev => [...prev, { id: Date.now(), clientId: client.id, type: noteType, date: new Date().toISOString().split("T")[0], note: newNote }]);
    setNewNote("");
  };

  const addFollowup = () => {
    if (!newFollowup.trim()) return;
    setFollowups(prev => [...prev, { id: Date.now(), clientId: client.id, note: newFollowup, dueDate: followupDate, done: false }]);
    setNewFollowup("");
    setFollowupDate("");
  };

  const toggleFollowup = id => setFollowups(prev => prev.map(f => f.id === id ? { ...f, done: !f.done } : f));

  const draftOutreach = async () => {
    setGenerating(true);
    const history = clientInteractions.map(i => `${i.date} (${i.type}): ${i.note}`).join("\n");
    const prompt = `Draft a short, natural follow-up outreach email from Nate at Underhillmedia to ${client.name} (${client.email}). Here is the interaction history:\n${history || "No prior interactions."}\nKeep it brief, warm but professional. Do not use dashes. Sign off as Nate.`;
    const result = await callClaude([{ role: "user", content: prompt }]);
    setEmailDraft(result);
    setGenerating(false);
  };

  const ICON = { Call: "📞", Email: "✉", Meeting: "🤝", Text: "💬", Proposal: "📄", "Invoice Sent": "🧾", Note: "📝" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: "#0a0f1e", border: "1px solid #2a3550", borderRadius: 20, width: 680, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 40px 80px #000c" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "24px 28px 0", borderBottom: "1px solid #1a2235" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, color: "#e2e8f0", fontFamily: "'Playfair Display', serif" }}>{client.name}</h2>
              <div style={{ color: "#6b7a8e", fontSize: 13, marginTop: 4 }}>{client.email} · {client.phone}</div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Badge status={client.status} />
              <button onClick={onClose} style={{ background: "none", border: "none", color: "#6b7a8e", cursor: "pointer", fontSize: 20 }}>✕</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 24, marginBottom: 0 }}>
            {["log", "followups", "email"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: "none", border: "none", cursor: "pointer", paddingBottom: 12,
                borderBottom: tab === t ? "2px solid #4c6ef5" : "2px solid transparent",
                color: tab === t ? "#7c9ef8" : "#6b7a8e", fontSize: 13, fontWeight: tab === t ? 600 : 400,
                textTransform: "capitalize", letterSpacing: "0.04em",
              }}>{t === "log" ? "Interaction Log" : t === "followups" ? "Follow-ups" : "Draft Email"}</button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>

          {/* INTERACTION LOG */}
          {tab === "log" && (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                <select value={noteType} onChange={e => setNoteType(e.target.value)}
                  style={{ background: "#1a2235", border: "1px solid #2a3550", borderRadius: 8, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, outline: "none" }}>
                  {INTERACTION_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <input value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === "Enter" && addInteraction()}
                  placeholder="Log an interaction, call, email, note..."
                  style={{ flex: 1, background: "#1a2235", border: "1px solid #2a3550", borderRadius: 8, padding: "9px 14px", color: "#e2e8f0", fontSize: 13, outline: "none" }} />
                <button onClick={addInteraction} style={{ background: "linear-gradient(135deg,#3b5bdb,#4c6ef5)", border: "none", borderRadius: 8, padding: "9px 16px", color: "#fff", fontSize: 13, cursor: "pointer" }}>Log</button>
              </div>
              {clientInteractions.length === 0 && <div style={{ color: "#3a4a60", fontSize: 13, textAlign: "center", padding: 32 }}>No interactions logged yet.</div>}
              {clientInteractions.map(i => (
                <div key={i.id} style={{ display: "flex", gap: 14, marginBottom: 16 }}>
                  <div style={{ fontSize: 18, marginTop: 2 }}>{ICON[i.type] || "📝"}</div>
                  <div style={{ flex: 1, background: "#0f1623", border: "1px solid #1e2d45", borderRadius: 10, padding: "12px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "#4c6ef5", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>{i.type}</span>
                      <span style={{ fontSize: 11, color: "#6b7a8e", fontFamily: "'DM Mono', monospace" }}>{i.date}</span>
                    </div>
                    <div style={{ color: "#c8d3e0", fontSize: 13, lineHeight: 1.5 }}>{i.note}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* FOLLOW-UPS */}
          {tab === "followups" && (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                <input value={newFollowup} onChange={e => setNewFollowup(e.target.value)}
                  placeholder="Add a follow-up reminder..."
                  style={{ flex: 1, background: "#1a2235", border: "1px solid #2a3550", borderRadius: 8, padding: "9px 14px", color: "#e2e8f0", fontSize: 13, outline: "none" }} />
                <input value={followupDate} onChange={e => setFollowupDate(e.target.value)} type="date"
                  style={{ background: "#1a2235", border: "1px solid #2a3550", borderRadius: 8, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, outline: "none" }} />
                <button onClick={addFollowup} style={{ background: "linear-gradient(135deg,#3b5bdb,#4c6ef5)", border: "none", borderRadius: 8, padding: "9px 16px", color: "#fff", fontSize: 13, cursor: "pointer" }}>Add</button>
              </div>
              {clientFollowups.length === 0 && <div style={{ color: "#3a4a60", fontSize: 13, textAlign: "center", padding: 32 }}>No follow-ups set.</div>}
              {clientFollowups.map(f => (
                <div key={f.id} onClick={() => toggleFollowup(f.id)} style={{ display: "flex", gap: 14, alignItems: "center", padding: "14px 16px", background: "#0f1623", border: `1px solid ${f.done ? "#4ade8022" : "#1e2d45"}`, borderRadius: 10, marginBottom: 10, cursor: "pointer" }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${f.done ? "#4ade80" : "#2a3550"}`, background: f.done ? "#4ade8020" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {f.done && <span style={{ color: "#4ade80", fontSize: 11 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: f.done ? "#4a5568" : "#c8d3e0", fontSize: 13, textDecoration: f.done ? "line-through" : "none" }}>{f.note}</div>
                    {f.dueDate && <div style={{ color: "#6b7a8e", fontSize: 11, marginTop: 3 }}>Due {f.dueDate}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* EMAIL DRAFT */}
          {tab === "email" && (
            <div>
              <p style={{ color: "#8892a4", fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>Claude will read the full interaction history with {client.name} and draft a contextual follow-up email.</p>
              <PrimaryBtn onClick={draftOutreach} style={{ marginBottom: 20, width: "100%" }}>{generating ? "Drafting..." : "Draft Outreach Email with Claude"}</PrimaryBtn>
              {emailDraft && (
                <div style={{ background: "#0f1623", border: "1px solid #1e2d45", borderRadius: 10, padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <span style={{ fontSize: 11, color: "#8892a4", letterSpacing: "0.1em", textTransform: "uppercase" }}>Drafted Email</span>
                    <button onClick={() => navigator.clipboard.writeText(emailDraft)} style={{ background: "#60a5fa20", border: "1px solid #60a5fa40", borderRadius: 6, padding: "4px 12px", color: "#60a5fa", fontSize: 11, cursor: "pointer" }}>Copy</button>
                  </div>
                  <pre style={{ color: "#c8d3e0", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{emailDraft}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Clients({ clients, setClients, interactions, setInteractions, followups, setFollowups }) {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [view, setView] = useState("pipeline");
  const [generating, setGenerating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", status: "prospect", company: "", source: "", notes: "" });

  const addClient = () => {
    if (!form.name) return;
    setClients([...clients, { id: Date.now(), totalBilled: 0, outstanding: 0, pipelineStage: "Lead", ...form }]);
    setForm({ name: "", email: "", phone: "", status: "prospect", company: "", source: "", notes: "" });
    setShowAdd(false);
  };

  const importFromGmail = async () => {
    setImporting(true);
    setImportResult(null);
    const prompt = `You have access to Gmail via MCP. Please search through Nate's sent emails from the last 12 months and extract a list of unique clients and contacts he has emailed. For each contact extract: full name, email address, and any company name if mentioned. Focus on people who appear to be clients or business contacts, not personal contacts or newsletters. Return ONLY a JSON array like this with no other text:
[{"name":"Full Name","email":"email@example.com","company":"Company Name or empty string"}]
Extract up to 30 contacts. Only include people Nate has actually emailed back and forth with.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 1000,
          system: "You are a helpful assistant with access to Gmail. Return only valid JSON arrays, no markdown, no explanation.",
          messages: [{ role: "user", content: prompt }],
          mcp_servers: MCP_SERVERS,
        }),
      });
      const data = await response.json();
      const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "[]";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No contacts found");
      const contacts = JSON.parse(jsonMatch[0]);
      const existing = clients.map(c => c.email?.toLowerCase());
      const newContacts = contacts.filter(c => c.email && !existing.includes(c.email.toLowerCase()));
      setImportResult({ contacts: newContacts, total: contacts.length });
    } catch (e) {
      setImportResult({ error: "Could not import from Gmail. Make sure Gmail is connected." });
    }
    setImporting(false);
  };

  const confirmImport = async () => {
    if (!importResult?.contacts) return;
    for (const c of importResult.contacts) {
      await setClients(prev => [...prev, {
        id: Date.now() + Math.random(),
        name: c.name, email: c.email, company: c.company || "",
        phone: "", status: "prospect", pipelineStage: "Lead",
        totalBilled: 0, outstanding: 0, source: "Gmail import", notes: "",
      }]);
    }
    setImportResult(null);
  };

  const pendingFollowups = followups.filter(f => !f.done);

  const getStageColor = stage => ({
    "Lead": "#facc15", "Contacted": "#fb923c", "Proposal Sent": "#60a5fa",
    "Active": "#4ade80", "Repeat Client": "#c084fc", "Inactive": "#6b7280"
  }[stage] || "#6b7280");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, color: "#e2e8f0", fontFamily: "'Playfair Display', serif" }}>CRM</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ display: "flex", background: "#0f1623", border: "1px solid #1e2d45", borderRadius: 8, overflow: "hidden" }}>
            {["pipeline", "list"].map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "8px 16px", background: view === v ? "#3b5bdb22" : "transparent", border: "none", color: view === v ? "#7c9ef8" : "#6b7a8e", fontSize: 12, cursor: "pointer", textTransform: "capitalize" }}>{v}</button>
            ))}
          </div>
          <button onClick={importFromGmail} disabled={importing} style={{
            background: "#ea433520", border: "1px solid #ea433540", borderRadius: 8,
            padding: "8px 16px", color: "#ea4335", fontSize: 12, cursor: importing ? "default" : "pointer", fontWeight: 500,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ fontSize: 14 }}>✉</span>
            {importing ? "Scanning Gmail..." : "Import from Gmail"}
          </button>
          <PrimaryBtn onClick={() => setShowAdd(true)}>+ Add Client</PrimaryBtn>
        </div>
      </div>

      {/* Gmail import result */}
      {importResult && !importResult.error && (
        <div style={{ background: "#0f1623", border: "1px solid #4ade8040", borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                Found {importResult.contacts.length} new contacts from Gmail
              </div>
              <div style={{ color: "#6b7a8e", fontSize: 12 }}>{importResult.total - importResult.contacts.length} already in your CRM</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <GhostBtn onClick={() => setImportResult(null)}>Cancel</GhostBtn>
              <PrimaryBtn onClick={confirmImport}>Import All</PrimaryBtn>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {importResult.contacts.map((c, i) => (
              <div key={i} style={{ background: "#1a2235", border: "1px solid #2a3550", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                <div style={{ color: "#6b7a8e", fontSize: 11, marginTop: 3 }}>{c.email}</div>
                {c.company && <div style={{ color: "#4c6ef5", fontSize: 11, marginTop: 2 }}>{c.company}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {importResult?.error && (
        <div style={{ background: "#f8717110", border: "1px solid #f8717130", borderRadius: 10, padding: "12px 18px", marginBottom: 20, color: "#f87171", fontSize: 13 }}>
          {importResult.error}
        </div>
      )}

      {/* Pending follow-ups banner */}
      {pendingFollowups.length > 0 && (
        <div style={{ background: "#facc1510", border: "1px solid #facc1530", borderRadius: 10, padding: "12px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#facc15", fontSize: 16 }}>⚠</span>
          <span style={{ color: "#facc15", fontSize: 13 }}>{pendingFollowups.length} pending follow-up{pendingFollowups.length > 1 ? "s" : ""} — </span>
          <span style={{ color: "#8892a4", fontSize: 13 }}>{pendingFollowups.slice(0, 2).map(f => { const c = clients.find(cl => cl.id === f.clientId); return c?.name; }).filter(Boolean).join(", ")}{pendingFollowups.length > 2 ? ` +${pendingFollowups.length - 2} more` : ""}</span>
        </div>
      )}

      {/* PIPELINE VIEW */}
      {view === "pipeline" && (
        <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8 }}>
          {PIPELINE_STAGES.map(stage => {
            const stageClients = clients.filter(c => (c.pipelineStage || (c.status === "active" ? "Active" : c.status === "prospect" ? "Lead" : "Inactive")) === stage);
            const color = getStageColor(stage);
            return (
              <div key={stage} style={{ minWidth: 200, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                  <span style={{ color: "#8892a4", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>{stage}</span>
                  <span style={{ color: "#3a4a60", fontSize: 11 }}>({stageClients.length})</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {stageClients.map(c => {
                    const clientFollowups = followups.filter(f => f.clientId === c.id && !f.done);
                    return (
                      <div key={c.id} onClick={() => setSelectedClient(c)} style={{ background: "#0f1623", border: `1px solid ${color}22`, borderLeft: `3px solid ${color}`, borderRadius: 10, padding: "14px 14px", cursor: "pointer", transition: "border-color 0.15s" }}>
                        <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{c.name}</div>
                        <div style={{ color: "#6b7a8e", fontSize: 11, marginBottom: 8 }}>{c.email}</div>
                        {c.totalBilled > 0 && <div style={{ color: "#4ade80", fontSize: 12, fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>${c.totalBilled.toLocaleString()} billed</div>}
                        {clientFollowups.length > 0 && (
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ color: "#facc15", fontSize: 10 }}>●</span>
                            <span style={{ color: "#facc15", fontSize: 11 }}>{clientFollowups.length} follow-up{clientFollowups.length > 1 ? "s" : ""}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {stageClients.length === 0 && <div style={{ border: "1px dashed #1e2d45", borderRadius: 10, padding: "20px 14px", color: "#3a4a60", fontSize: 12, textAlign: "center" }}>Empty</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {view === "list" && (
        <div style={{ background: "#0f1623", border: "1px solid #1e2d45", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#0a1020" }}>
                {["Name", "Email", "Phone", "Stage", "Total Billed", "Follow-ups", ""].map(h => (
                  <th key={h} style={{ padding: "13px 18px", textAlign: "left", fontSize: 11, letterSpacing: "0.1em", color: "#6b7a8e", textTransform: "uppercase", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map(c => {
                const clientFollowups = followups.filter(f => f.clientId === c.id && !f.done);
                const stage = c.pipelineStage || (c.status === "active" ? "Active" : c.status === "prospect" ? "Lead" : "Inactive");
                const color = getStageColor(stage);
                return (
                  <tr key={c.id} style={{ borderTop: "1px solid #1a2235", cursor: "pointer" }} onClick={() => setSelectedClient(c)}>
                    <td style={{ padding: "14px 18px", color: "#e2e8f0", fontSize: 14, fontWeight: 500 }}>{c.name}</td>
                    <td style={{ padding: "14px 18px", color: "#8892a4", fontSize: 13 }}>{c.email}</td>
                    <td style={{ padding: "14px 18px", color: "#8892a4", fontSize: 13 }}>{c.phone}</td>
                    <td style={{ padding: "14px 18px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: `${color}18`, border: `1px solid ${color}44`, fontSize: 11, color }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />{stage}
                      </span>
                    </td>
                    <td style={{ padding: "14px 18px", color: "#4ade80", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>${c.totalBilled.toLocaleString()}</td>
                    <td style={{ padding: "14px 18px" }}>
                      {clientFollowups.length > 0 ? <span style={{ color: "#facc15", fontSize: 12 }}>● {clientFollowups.length} pending</span> : <span style={{ color: "#3a4a60", fontSize: 12 }}>None</span>}
                    </td>
                    <td style={{ padding: "14px 18px", color: "#3b5bdb", fontSize: 12 }}>View →</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Client Detail Modal */}
      {selectedClient && (
        <ClientDetail
          client={selectedClient}
          interactions={interactions}
          followups={followups}
          setInteractions={setInteractions}
          setFollowups={setFollowups}
          onClose={() => setSelectedClient(null)}
          generating={generating}
          setGenerating={setGenerating}
        />
      )}

      {/* Add Client Modal */}
      {showAdd && (
        <Modal title="Add New Client" onClose={() => setShowAdd(false)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <InputField label="Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Contact name" />
            <InputField label="Company" value={form.company} onChange={v => setForm({ ...form, company: v })} placeholder="Company name" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <InputField label="Email" value={form.email} onChange={v => setForm({ ...form, email: v })} type="email" placeholder="email@example.com" />
            <InputField label="Phone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} placeholder="555-0100" />
          </div>
          <SelectField label="Pipeline Stage" value={form.pipelineStage || "Lead"} onChange={v => setForm({ ...form, pipelineStage: v })}
            options={PIPELINE_STAGES.map(s => ({ value: s, label: s }))} />
          <InputField label="How did you find them?" value={form.source} onChange={v => setForm({ ...form, source: v })} placeholder="Referral, social media, cold outreach..." />
          <InputField label="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} placeholder="Any initial context" />
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
            <GhostBtn onClick={() => setShowAdd(false)}>Cancel</GhostBtn>
            <PrimaryBtn onClick={addClient}>Add Client</PrimaryBtn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── PROJECTS ───────────────────────────────────────────────────────────────
function Projects({ projects, setProjects, clients }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ clientId: clients[0]?.id || "", name: "", status: "in_progress", value: "", dueDate: "", notes: "" });

  const addProject = () => {
    if (!form.name) return;
    setProjects([...projects, { id: Date.now(), ...form, clientId: Number(form.clientId), value: Number(form.value) }]);
    setShowAdd(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <h2 style={{ margin: 0, fontSize: 24, color: "#e2e8f0", fontFamily: "'Playfair Display', serif" }}>Projects</h2>
        <PrimaryBtn onClick={() => setShowAdd(true)}>+ New Project</PrimaryBtn>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        {projects.map(p => {
          const client = clients.find(c => c.id === p.clientId);
          return (
            <div key={p.id} style={{ background: "#0f1623", border: "1px solid #1e2d45", borderRadius: 12, padding: "22px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <span style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 600 }}>{p.name}</span>
                  <Badge status={p.status} />
                </div>
                <div style={{ color: "#6b7a8e", fontSize: 13, marginBottom: p.notes ? 8 : 0 }}>{client?.name} · Due {p.dueDate}</div>
                {p.notes && <div style={{ color: "#8892a4", fontSize: 12, fontStyle: "italic" }}>{p.notes}</div>}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#60a5fa", fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 500 }}>${p.value.toLocaleString()}</div>
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <Modal title="New Project" onClose={() => setShowAdd(false)}>
          <SelectField label="Client" value={form.clientId} onChange={v => setForm({ ...form, clientId: v })}
            options={clients.map(c => ({ value: c.id, label: c.name }))} />
          <InputField label="Project Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="e.g. Brand Promo Video" />
          <SelectField label="Status" value={form.status} onChange={v => setForm({ ...form, status: v })}
            options={[{ value: "in_progress", label: "In Progress" }, { value: "completed", label: "Completed" }, { value: "on_hold", label: "On Hold" }]} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <InputField label="Value ($)" value={form.value} onChange={v => setForm({ ...form, value: v })} type="number" placeholder="0" />
            <InputField label="Due Date" value={form.dueDate} onChange={v => setForm({ ...form, dueDate: v })} type="date" />
          </div>
          <InputField label="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} placeholder="Any notes..." />
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
            <GhostBtn onClick={() => setShowAdd(false)}>Cancel</GhostBtn>
            <PrimaryBtn onClick={addProject}>Create Project</PrimaryBtn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── INVOICES ───────────────────────────────────────────────────────────────
function Invoices({ invoices, setInvoices, clients, projects }) {
  const [showAdd, setShowAdd] = useState(false);
  const [generating, setGenerating] = useState(null);
  const [form, setForm] = useState({ clientId: clients[0]?.id || "", projectId: "", amount: "", dueDate: "" });

  const addInvoice = () => {
    if (!form.amount) return;
    const num = `INV-${String(invoices.length + 1).padStart(3, "0")}`;
    setInvoices([...invoices, {
      id: Date.now(), number: num, status: "draft",
      date: new Date().toISOString().split("T")[0],
      clientId: Number(form.clientId),
      projectId: Number(form.projectId),
      amount: Number(form.amount),
      dueDate: form.dueDate,
    }]);
    setShowAdd(false);
  };

  const markPaid = (id) => {
    setInvoices(invoices.map(i => i.id === id ? { ...i, status: "paid" } : i));
  };

  const generateEmail = async (inv) => {
    setGenerating(inv.id);
    const client = clients.find(c => c.id === inv.clientId);
    const prompt = `Draft a short, professional payment follow-up email for invoice ${inv.number} to ${client?.name} for $${inv.amount}, due ${inv.dueDate}. Nate's payment options are Venmo and PayPal. Keep the tone natural and understated, not overly enthusiastic. Sign off as Nate at Underhillmedia. Do not use dashes.`;
    const result = await callClaude([{ role: "user", content: prompt }]);
    setGenerating(null);
    alert(result);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <h2 style={{ margin: 0, fontSize: 24, color: "#e2e8f0", fontFamily: "'Playfair Display', serif" }}>Invoices</h2>
        <PrimaryBtn onClick={() => setShowAdd(true)}>+ New</PrimaryBtn>
      </div>

      {/* Mobile card list */}
      <div className="mobile-only" style={{ display: "none", flexDirection: "column", gap: 12 }}>
        {invoices.map(inv => {
          const client = clients.find(c => c.id === inv.clientId);
          return (
            <div key={inv.id} style={{ background: "#0f1623", border: "1px solid #1e2d45", borderRadius: 12, padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ color: "#e2e8f0", fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 600 }}>{inv.number}</div>
                  <div style={{ color: "#8892a4", fontSize: 12, marginTop: 2 }}>{client?.name}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#4ade80", fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 600 }}>${inv.amount.toLocaleString()}</div>
                  <Badge status={inv.status} />
                </div>
              </div>
              <div style={{ color: "#6b7a8e", fontSize: 11, marginBottom: 10 }}>Due {inv.dueDate}</div>
              <div style={{ display: "flex", gap: 8 }}>
                {inv.status !== "paid" && <button onClick={() => markPaid(inv.id)} style={{ flex: 1, background: "#4ade8020", border: "1px solid #4ade8040", borderRadius: 8, padding: "8px", color: "#4ade80", fontSize: 12, cursor: "pointer" }}>Mark Paid</button>}
                {inv.status === "outstanding" && <button onClick={() => generateEmail(inv)} disabled={generating === inv.id} style={{ flex: 1, background: "#60a5fa20", border: "1px solid #60a5fa40", borderRadius: 8, padding: "8px", color: "#60a5fa", fontSize: 12, cursor: "pointer" }}>{generating === inv.id ? "Writing..." : "Draft Email"}</button>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="desktop-only" style={{ background: "#0f1623", border: "1px solid #1e2d45", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#0a1020" }}>
              {["Invoice", "Client", "Amount", "Date", "Due", "Status", "Actions"].map(h => (
                <th key={h} style={{ padding: "14px 20px", textAlign: "left", fontSize: 11, letterSpacing: "0.1em", color: "#6b7a8e", textTransform: "uppercase", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.map(inv => {
              const client = clients.find(c => c.id === inv.clientId);
              return (
                <tr key={inv.id} style={{ borderTop: "1px solid #1a2235" }}>
                  <td style={{ padding: "16px 20px", color: "#e2e8f0", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>{inv.number}</td>
                  <td style={{ padding: "16px 20px", color: "#8892a4", fontSize: 13 }}>{client?.name}</td>
                  <td style={{ padding: "16px 20px", color: "#4ade80", fontFamily: "'DM Mono', monospace", fontSize: 14 }}>${inv.amount.toLocaleString()}</td>
                  <td style={{ padding: "16px 20px", color: "#6b7a8e", fontSize: 13 }}>{inv.date}</td>
                  <td style={{ padding: "16px 20px", color: "#6b7a8e", fontSize: 13 }}>{inv.dueDate}</td>
                  <td style={{ padding: "16px 20px" }}><Badge status={inv.status} /></td>
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      {inv.status !== "paid" && <button onClick={() => markPaid(inv.id)} style={{ background: "#4ade8020", border: "1px solid #4ade8040", borderRadius: 6, padding: "5px 10px", color: "#4ade80", fontSize: 11, cursor: "pointer" }}>Mark Paid</button>}
                      {inv.status === "outstanding" && <button onClick={() => generateEmail(inv)} disabled={generating === inv.id} style={{ background: "#60a5fa20", border: "1px solid #60a5fa40", borderRadius: 6, padding: "5px 10px", color: "#60a5fa", fontSize: 11, cursor: "pointer" }}>{generating === inv.id ? "Writing..." : "Draft Email"}</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <Modal title="New Invoice" onClose={() => setShowAdd(false)}>
          <SelectField label="Client" value={form.clientId} onChange={v => setForm({ ...form, clientId: v })}
            options={clients.map(c => ({ value: c.id, label: c.name }))} />
          <SelectField label="Project" value={form.projectId} onChange={v => setForm({ ...form, projectId: v })}
            options={[{ value: "", label: "No project" }, ...projects.filter(p => p.clientId === Number(form.clientId)).map(p => ({ value: p.id, label: p.name }))]} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <InputField label="Amount ($)" value={form.amount} onChange={v => setForm({ ...form, amount: v })} type="number" placeholder="0" />
            <InputField label="Due Date" value={form.dueDate} onChange={v => setForm({ ...form, dueDate: v })} type="date" />
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
            <GhostBtn onClick={() => setShowAdd(false)}>Cancel</GhostBtn>
            <PrimaryBtn onClick={addInvoice}>Create Invoice</PrimaryBtn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── EXPENSES ───────────────────────────────────────────────────────────────
function Expenses({ expenses, setExpenses }) {
  const [showAdd, setShowAdd] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [filterCat, setFilterCat] = useState("All");
  const [form, setForm] = useState({ date: "", description: "", amount: "", category: EXPENSE_CATEGORIES[0], deductible: true, notes: "" });

  const addExpense = () => {
    if (!form.description || !form.amount) return;
    setExpenses([...expenses, { id: Date.now(), ...form, amount: Number(form.amount) }]);
    setForm({ date: "", description: "", amount: "", category: EXPENSE_CATEGORIES[0], deductible: true, notes: "" });
    setShowAdd(false);
  };

  const deleteExpense = id => setExpenses(expenses.filter(e => e.id !== id));

  const analyzeDeductions = async () => {
    setAnalyzing(true);
    const summary = expenses.map(e => `${e.date}: ${e.description} ($${e.amount}) [${e.category}]`).join("\n");
    const prompt = `Analyze these business expenses for a freelance video editor and content creator (Underhillmedia). Identify which are fully deductible, which are partially deductible (like meals at 50%), and flag anything that might not qualify. Give a concise summary and total deduction estimate. Do not use dashes.\n\nExpenses:\n${summary}`;
    const result = await callClaude([{ role: "user", content: prompt }]);
    setAnalysis(result);
    setAnalyzing(false);
  };

  const totalAll = expenses.reduce((s, e) => s + e.amount, 0);
  const totalDeductible = expenses.filter(e => e.deductible).reduce((s, e) => s + e.amount, 0);
  const filtered = filterCat === "All" ? expenses : expenses.filter(e => e.category === filterCat);
  const cats = ["All", ...EXPENSE_CATEGORIES.filter(c => expenses.some(e => e.category === c))];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 24, color: "#e2e8f0", fontFamily: "'Playfair Display', serif" }}>Expenses</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={analyzeDeductions} disabled={analyzing} style={{ background: "#c084fc20", border: "1px solid #c084fc40", borderRadius: 8, padding: "8px 12px", color: "#c084fc", fontSize: 11, cursor: "pointer", fontWeight: 500 }}>
            {analyzing ? "Analyzing..." : "✦ AI Analysis"}
          </button>
          <PrimaryBtn onClick={() => setShowAdd(true)}>+ Add</PrimaryBtn>
        </div>
      </div>

      {/* Stat cards — stack on mobile */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }} className="stat-grid">
        <div style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)", border: "1px solid #f8717133", borderRadius: 10, padding: "16px" }}>
          <div style={{ fontSize: 10, color: "#8892a4", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Total Spent</div>
          <div style={{ fontSize: 22, color: "#f87171", fontFamily: "'DM Mono',monospace", fontWeight: 500 }}>${totalAll.toFixed(0)}</div>
        </div>
        <div style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)", border: "1px solid #c084fc33", borderRadius: 10, padding: "16px" }}>
          <div style={{ fontSize: 10, color: "#8892a4", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Deductible</div>
          <div style={{ fontSize: 22, color: "#c084fc", fontFamily: "'DM Mono',monospace", fontWeight: 500 }}>${totalDeductible.toFixed(0)}</div>
        </div>
        <div style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)", border: "1px solid #6b728033", borderRadius: 10, padding: "16px" }}>
          <div style={{ fontSize: 10, color: "#8892a4", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Personal</div>
          <div style={{ fontSize: 22, color: "#6b7280", fontFamily: "'DM Mono',monospace", fontWeight: 500 }}>${(totalAll - totalDeductible).toFixed(0)}</div>
        </div>
      </div>

      {/* Category filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {cats.map(c => (
          <button key={c} onClick={() => setFilterCat(c)} style={{
            padding: "4px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer",
            background: filterCat === c ? "#3b5bdb33" : "transparent",
            border: filterCat === c ? "1px solid #3b5bdb66" : "1px solid #2a3550",
            color: filterCat === c ? "#7c9ef8" : "#6b7a8e",
          }}>{c}</button>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="mobile-only" style={{ display: "none", flexDirection: "column", gap: 10 }}>
        {filtered.map(e => (
          <div key={e.id} style={{ background: "#0f1623", border: "1px solid #1e2d45", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1, marginRight: 12 }}>
                <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{e.description}</div>
                <div style={{ color: "#6b7a8e", fontSize: 11 }}>{e.category} · {e.date}</div>
                {e.notes && <div style={{ color: "#6b7a8e", fontSize: 11, marginTop: 2, fontStyle: "italic" }}>{e.notes}</div>}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#c084fc", fontFamily: "'DM Mono',monospace", fontSize: 16, fontWeight: 600 }}>${e.amount.toFixed(2)}</div>
                <div style={{ marginTop: 4 }}>
                  {e.deductible
                    ? <span style={{ color: "#4ade80", fontSize: 11 }}>✓ deductible</span>
                    : <span style={{ color: "#6b7a8e", fontSize: 11 }}>personal</span>}
                </div>
              </div>
            </div>
            <button onClick={() => deleteExpense(e.id)} style={{ background: "none", border: "none", color: "#f8717150", cursor: "pointer", fontSize: 11, marginTop: 8, padding: 0 }}>Remove</button>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="desktop-only" style={{ background: "#0f1623", border: "1px solid #1e2d45", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#0a1020" }}>
              {["Date", "Description", "Category", "Amount", "Deductible", ""].map(h => (
                <th key={h} style={{ padding: "13px 18px", textAlign: "left", fontSize: 11, letterSpacing: "0.1em", color: "#6b7a8e", textTransform: "uppercase", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} style={{ borderTop: "1px solid #1a2235" }}>
                <td style={{ padding: "14px 18px", color: "#6b7a8e", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>{e.date}</td>
                <td style={{ padding: "14px 18px", color: "#e2e8f0", fontSize: 13 }}>
                  {e.description}
                  {e.notes && <div style={{ color: "#6b7a8e", fontSize: 11, marginTop: 2 }}>{e.notes}</div>}
                </td>
                <td style={{ padding: "14px 18px", color: "#8892a4", fontSize: 12 }}>{e.category}</td>
                <td style={{ padding: "14px 18px", color: "#c084fc", fontFamily: "'DM Mono', monospace", fontSize: 14 }}>${e.amount.toFixed(2)}</td>
                <td style={{ padding: "14px 18px" }}>
                  <span style={{ color: e.deductible ? "#4ade80" : "#6b7a8e", fontSize: 13 }}>{e.deductible ? "✓" : "—"}</span>
                </td>
                <td style={{ padding: "14px 18px" }}>
                  <button onClick={() => deleteExpense(e.id)} style={{ background: "none", border: "none", color: "#f8717160", cursor: "pointer", fontSize: 13 }}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {analysis && (
        <Modal title="AI Deduction Analysis" onClose={() => setAnalysis(null)}>
          <pre style={{ color: "#c8d3e0", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: "0 0 20px", maxHeight: 400, overflowY: "auto" }}>{analysis}</pre>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button onClick={() => navigator.clipboard.writeText(analysis)} style={{ background: "#c084fc20", border: "1px solid #c084fc40", borderRadius: 8, padding: "9px 18px", color: "#c084fc", fontSize: 13, cursor: "pointer" }}>Copy</button>
            <GhostBtn onClick={() => setAnalysis(null)}>Close</GhostBtn>
          </div>
        </Modal>
      )}

      {showAdd && (
        <Modal title="Add Expense" onClose={() => setShowAdd(false)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <InputField label="Date" value={form.date} onChange={v => setForm({ ...form, date: v })} type="date" />
            <InputField label="Amount ($)" value={form.amount} onChange={v => setForm({ ...form, amount: v })} type="number" placeholder="0.00" />
          </div>
          <InputField label="Description" value={form.description} onChange={v => setForm({ ...form, description: v })} placeholder="What was this for?" />
          <SelectField label="Category" value={form.category} onChange={v => setForm({ ...form, category: v })} options={EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }))} />
          <InputField label="Notes (optional)" value={form.notes} onChange={v => setForm({ ...form, notes: v })} placeholder="Any additional context" />
          <CheckField label="Tax deductible" checked={form.deductible} onChange={v => setForm({ ...form, deductible: v })} />
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
            <GhostBtn onClick={() => setShowAdd(false)}>Cancel</GhostBtn>
            <PrimaryBtn onClick={addExpense}>Add Expense</PrimaryBtn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── MILEAGE ────────────────────────────────────────────────────────────────
function Mileage({ mileage, setMileage, clients }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ date: "", from: "Home", to: "", miles: "", purpose: "", clientId: "", deductible: true });

  const addTrip = () => {
    if (!form.to || !form.miles) return;
    setMileage([...mileage, { id: Date.now(), ...form, miles: Number(form.miles), clientId: form.clientId ? Number(form.clientId) : null }]);
    setForm({ date: "", from: "Home", to: "", miles: "", purpose: "", clientId: "", deductible: true });
    setShowAdd(false);
  };

  const deleteTrip = id => setMileage(mileage.filter(m => m.id !== id));

  const totalMiles = mileage.filter(m => m.deductible).reduce((s, m) => s + m.miles, 0);
  const deductionValue = totalMiles * IRS_RATE_2026;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, color: "#e2e8f0", fontFamily: "'Playfair Display', serif" }}>Mileage Log</h2>
        <PrimaryBtn onClick={() => setShowAdd(true)}>+ Log Trip</PrimaryBtn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        <StatCard label="Total Miles" value={totalMiles.toFixed(1)} sub="deductible trips" accent="#fb923c" />
        <StatCard label="IRS Deduction" value={`$${deductionValue.toFixed(2)}`} sub={`@ $${IRS_RATE_2026}/mile (2026)`} accent="#4ade80" />
        <StatCard label="Total Trips" value={mileage.length} sub="logged" accent="#60a5fa" />
        <StatCard label="Avg Trip" value={mileage.length > 0 ? `${(totalMiles / mileage.length).toFixed(1)} mi` : "0 mi"} sub="per trip" accent="#c084fc" />
      </div>

      <div style={{ background: "#0f1623", border: "1px solid #1e2d45", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#0a1020" }}>
              {["Date", "Route", "Purpose", "Client", "Miles", "Deduction", ""].map(h => (
                <th key={h} style={{ padding: "13px 18px", textAlign: "left", fontSize: 11, letterSpacing: "0.1em", color: "#6b7a8e", textTransform: "uppercase", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mileage.map(m => {
              const client = clients.find(c => c.id === m.clientId);
              const deduction = m.deductible ? (m.miles * IRS_RATE_2026).toFixed(2) : null;
              return (
                <tr key={m.id} style={{ borderTop: "1px solid #1a2235" }}>
                  <td style={{ padding: "14px 18px", color: "#6b7a8e", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>{m.date}</td>
                  <td style={{ padding: "14px 18px", color: "#e2e8f0", fontSize: 13 }}>
                    <span style={{ color: "#6b7a8e" }}>{m.from}</span>
                    <span style={{ color: "#3b5bdb", margin: "0 6px" }}>→</span>
                    {m.to}
                  </td>
                  <td style={{ padding: "14px 18px", color: "#8892a4", fontSize: 12 }}>{m.purpose}</td>
                  <td style={{ padding: "14px 18px", color: "#6b7a8e", fontSize: 12 }}>{client?.name || "N/A"}</td>
                  <td style={{ padding: "14px 18px", color: "#fb923c", fontFamily: "'DM Mono', monospace", fontSize: 14 }}>{m.miles}</td>
                  <td style={{ padding: "14px 18px", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
                    {deduction ? <span style={{ color: "#4ade80" }}>${deduction}</span> : <span style={{ color: "#6b7a8e" }}>N/A</span>}
                  </td>
                  <td style={{ padding: "14px 18px" }}>
                    <button onClick={() => deleteTrip(m.id)} style={{ background: "none", border: "none", color: "#f8717160", cursor: "pointer", fontSize: 13 }}>✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16, padding: "14px 20px", background: "#0f1623", border: "1px solid #fb923c33", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#8892a4", fontSize: 13 }}>2026 IRS Standard Mileage Rate: <strong style={{ color: "#fb923c" }}>${IRS_RATE_2026} per mile</strong></span>
        <span style={{ color: "#4ade80", fontFamily: "'DM Mono', monospace", fontSize: 16 }}>Total Deduction: ${deductionValue.toFixed(2)}</span>
      </div>

      {showAdd && (
        <Modal title="Log a Trip" onClose={() => setShowAdd(false)}>
          <InputField label="Date" value={form.date} onChange={v => setForm({ ...form, date: v })} type="date" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <InputField label="From" value={form.from} onChange={v => setForm({ ...form, from: v })} placeholder="e.g. Home" />
            <InputField label="To" value={form.to} onChange={v => setForm({ ...form, to: v })} placeholder="Destination" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <InputField label="Miles" value={form.miles} onChange={v => setForm({ ...form, miles: v })} type="number" placeholder="0.0" />
            <SelectField label="Client (optional)" value={form.clientId} onChange={v => setForm({ ...form, clientId: v })}
              options={[{ value: "", label: "No client" }, ...clients.map(c => ({ value: c.id, label: c.name }))]} />
          </div>
          <InputField label="Purpose" value={form.purpose} onChange={v => setForm({ ...form, purpose: v })} placeholder="e.g. Client meeting, on-site filming" />
          <CheckField label="Tax deductible (business purpose)" checked={form.deductible} onChange={v => setForm({ ...form, deductible: v })} />
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
            <GhostBtn onClick={() => setShowAdd(false)}>Cancel</GhostBtn>
            <PrimaryBtn onClick={addTrip}>Log Trip</PrimaryBtn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── CALENDAR HELPERS ───────────────────────────────────────────────────────
async function createCalendarEvent({ title, date, time = "09:00", duration = 60, description = "", location = "" }) {
  const prompt = `Using Google Calendar MCP, create a calendar event with these details:
Title: ${title}
Date: ${date}
Time: ${time}
Duration: ${duration} minutes
Description: ${description}
Location: ${location}
Create the event now and confirm it was created.`;
  return callClaude([{ role: "user", content: prompt }],
    "You are a calendar assistant. Use the Google Calendar MCP tools to create events. Be brief in confirmation. Never use dashes.");
}

async function getUpcomingEvents() {
  const prompt = `Using Google Calendar MCP, fetch all events for the next 14 days and return them as a JSON array with this format:
[{"title":"event name","date":"YYYY-MM-DD","time":"HH:MM","duration":60,"description":"","location":""}]
Return ONLY the JSON array, no other text.`;
  const result = await callClaude([{ role: "user", content: prompt }],
    "You are a calendar assistant. Use Google Calendar MCP to fetch events. Return only valid JSON arrays.");
  try {
    const match = result.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch { return []; }
}

// ── CALENDAR ───────────────────────────────────────────────────────────────
function Calendar({ clients, projects, invoices }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", time: "09:00", duration: "60", description: "", location: "" });
  const [result, setResult] = useState("");

  const loadEvents = async () => {
    setLoading(true);
    const data = await getUpcomingEvents();
    setEvents(data);
    setLoading(false);
  };

  useEffect(() => { loadEvents(); }, []);

  const addEvent = async () => {
    if (!form.title || !form.date) return;
    setCreating(true);
    const res = await createCalendarEvent({ ...form, duration: Number(form.duration) });
    setResult(res);
    setCreating(false);
    setShowAdd(false);
    loadEvents();
  };

  const suggestTime = async () => {
    setSuggesting(true);
    const upcomingProjects = projects.filter(p => p.status === "in_progress").map(p => `${p.name} due ${p.dueDate}`).join(", ");
    const prompt = `Look at Nate's Google Calendar for the next 14 days using the MCP tools. Then suggest the 3 best available time slots for a client meeting, considering his existing schedule and these active projects: ${upcomingProjects}. Keep it brief and practical. Never use dashes.`;
    const res = await callClaude([{ role: "user", content: prompt }],
      "You are a smart scheduling assistant with access to Google Calendar. Analyze the calendar and suggest optimal meeting times.");
    setSuggestion(res);
    setSuggesting(false);
  };

  const quickAddFromProject = async (project) => {
    setCreating(true);
    const client = clients.find(c => c.id === project.clientId);
    const res = await createCalendarEvent({
      title: `📹 ${project.name} Deadline`,
      date: project.dueDate,
      time: "09:00",
      duration: 30,
      description: `Project deadline for ${client?.name || "client"}. ${project.notes || ""}`,
    });
    setResult(res);
    setCreating(false);
    loadEvents();
  };

  const quickAddFromInvoice = async (invoice) => {
    setCreating(true);
    const client = clients.find(c => c.id === invoice.clientId);
    const res = await createCalendarEvent({
      title: `💰 ${invoice.number} Due — ${client?.name}`,
      date: invoice.dueDate,
      time: "09:00",
      duration: 15,
      description: `Invoice ${invoice.number} for $${invoice.amount} due from ${client?.name}`,
    });
    setResult(res);
    setCreating(false);
    loadEvents();
  };

  const today = new Date().toISOString().split("T")[0];
  const upcomingProjects = projects.filter(p => p.status === "in_progress" && p.dueDate >= today);
  const outstandingInvoices = invoices.filter(i => i.status === "outstanding");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, color: "#e2e8f0", fontFamily: "'Playfair Display', serif" }}>Calendar</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={loadEvents} disabled={loading} style={{ background: "#1a2235", border: "1px solid #2a3550", borderRadius: 8, padding: "8px 14px", color: "#8892a4", fontSize: 12, cursor: "pointer" }}>
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
          <PrimaryBtn onClick={() => setShowAdd(true)}>+ Add Event</PrimaryBtn>
        </div>
      </div>

      {/* Smart Schedule Suggestion */}
      <div style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: "1px solid #3b5bdb33", borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: suggestion ? 14 : 0 }}>
          <div>
            <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600, marginBottom: 3 }}>Smart Scheduling</div>
            <div style={{ color: "#6b7a8e", fontSize: 12 }}>Claude reads your calendar and suggests the best times for client meetings</div>
          </div>
          <button onClick={suggestTime} disabled={suggesting} style={{
            background: "linear-gradient(135deg, #3b5bdb, #4c6ef5)", border: "none", borderRadius: 8,
            padding: "9px 16px", color: "#fff", fontSize: 12, cursor: suggesting ? "default" : "pointer", whiteSpace: "nowrap", marginLeft: 16,
          }}>{suggesting ? "Checking calendar..." : "◉ Suggest Times"}</button>
        </div>
        {suggestion && (
          <div style={{ background: "#0f1623", border: "1px solid #1e2d45", borderRadius: 10, padding: "14px 16px", marginTop: 14 }}>
            <pre style={{ color: "#c8d3e0", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{suggestion}</pre>
          </div>
        )}
      </div>

      {result && (
        <div style={{ background: "#4ade8012", border: "1px solid #4ade8030", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#4ade80", fontSize: 13 }}>
          {result}
          <button onClick={() => setResult("")} style={{ background: "none", border: "none", color: "#4ade8080", cursor: "pointer", float: "right", fontSize: 14 }}>✕</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Upcoming from Google Calendar */}
        <div style={{ background: "#0f1623", border: "1px solid #1e2d45", borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 13, color: "#8892a4", letterSpacing: "0.1em", textTransform: "uppercase" }}>Next 14 Days</h3>
          {loading && <div style={{ color: "#6b7a8e", fontSize: 13 }}>Loading from Google Calendar...</div>}
          {!loading && events.length === 0 && <div style={{ color: "#3a4a60", fontSize: 13 }}>No events found. Connect Google Calendar or add events.</div>}
          {events.map((e, i) => (
            <div key={i} style={{ padding: "12px 0", borderBottom: "1px solid #1a2235" }}>
              <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 500 }}>{e.title}</div>
              <div style={{ color: "#6b7a8e", fontSize: 11, marginTop: 3 }}>{e.date} {e.time && `at ${e.time}`} {e.duration && `· ${e.duration}min`}</div>
              {e.location && <div style={{ color: "#4c6ef5", fontSize: 11, marginTop: 2 }}>📍 {e.location}</div>}
            </div>
          ))}
        </div>

        {/* Quick add from projects and invoices */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#0f1623", border: "1px solid #1e2d45", borderRadius: 12, padding: 20 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 13, color: "#8892a4", letterSpacing: "0.1em", textTransform: "uppercase" }}>Add Project Deadlines</h3>
            {upcomingProjects.length === 0 && <div style={{ color: "#3a4a60", fontSize: 13 }}>No active projects.</div>}
            {upcomingProjects.map(p => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1a2235" }}>
                <div>
                  <div style={{ color: "#e2e8f0", fontSize: 13 }}>{p.name}</div>
                  <div style={{ color: "#6b7a8e", fontSize: 11 }}>Due {p.dueDate}</div>
                </div>
                <button onClick={() => quickAddFromProject(p)} disabled={creating}
                  style={{ background: "#60a5fa20", border: "1px solid #60a5fa40", borderRadius: 6, padding: "5px 10px", color: "#60a5fa", fontSize: 11, cursor: "pointer" }}>
                  + Calendar
                </button>
              </div>
            ))}
          </div>

          <div style={{ background: "#0f1623", border: "1px solid #1e2d45", borderRadius: 12, padding: 20 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 13, color: "#8892a4", letterSpacing: "0.1em", textTransform: "uppercase" }}>Add Invoice Reminders</h3>
            {outstandingInvoices.length === 0 && <div style={{ color: "#4ade80", fontSize: 13 }}>No outstanding invoices.</div>}
            {outstandingInvoices.map(inv => {
              const client = clients.find(c => c.id === inv.clientId);
              return (
                <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1a2235" }}>
                  <div>
                    <div style={{ color: "#e2e8f0", fontSize: 13 }}>{inv.number} · {client?.name}</div>
                    <div style={{ color: "#facc15", fontSize: 11 }}>${inv.amount} due {inv.dueDate}</div>
                  </div>
                  <button onClick={() => quickAddFromInvoice(inv)} disabled={creating}
                    style={{ background: "#facc1520", border: "1px solid #facc1540", borderRadius: 6, padding: "5px 10px", color: "#facc15", fontSize: 11, cursor: "pointer" }}>
                    + Calendar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showAdd && (
        <Modal title="Add Calendar Event" onClose={() => setShowAdd(false)}>
          <InputField label="Title" value={form.title} onChange={v => setForm({ ...form, title: v })} placeholder="e.g. Client call with Krista" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <InputField label="Date" value={form.date} onChange={v => setForm({ ...form, date: v })} type="date" />
            <InputField label="Time" value={form.time} onChange={v => setForm({ ...form, time: v })} type="time" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <InputField label="Duration (mins)" value={form.duration} onChange={v => setForm({ ...form, duration: v })} type="number" placeholder="60" />
            <InputField label="Location" value={form.location} onChange={v => setForm({ ...form, location: v })} placeholder="Optional" />
          </div>
          <InputField label="Description" value={form.description} onChange={v => setForm({ ...form, description: v })} placeholder="Optional notes" />
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
            <GhostBtn onClick={() => setShowAdd(false)}>Cancel</GhostBtn>
            <PrimaryBtn onClick={addEvent}>{creating ? "Creating..." : "Add to Calendar"}</PrimaryBtn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── CONTRACTS ─────────────────────────────────────────────────────────────
const CONTRACT_TEMPLATES = [
  { id: "video_production", label: "Video Production Agreement" },
  { id: "social_package", label: "Social Media Package" },
  { id: "retainer", label: "Monthly Retainer" },
];

function Contracts({ clients }) {
  const [selectedTemplate, setSelectedTemplate] = useState("video_production");
  const [selectedClient, setSelectedClient] = useState(clients[0]?.id || "");
  const [projectDesc, setProjectDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [contract, setContract] = useState("");
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    const client = clients.find(c => c.id === Number(selectedClient));
    const templateLabel = CONTRACT_TEMPLATES.find(t => t.id === selectedTemplate)?.label;
    const prompt = `Draft a professional ${templateLabel} contract for Underhillmedia (Nate) and ${client?.name}. 
Project/Scope: ${projectDesc || "Video editing and content creation services"}.
Total value: $${amount || "TBD"}.
Include: scope of work, payment terms (50% upfront 50% on delivery), revision policy (2 rounds), deliverable timeline, intellectual property (client owns final files after payment), cancellation policy. 
Keep it concise but legally sound. Format with clear section headers. Do not use dashes.`;
    const result = await callClaude([{ role: "user", content: prompt }]);
    setContract(result);
    setGenerating(false);
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 28px", fontSize: 24, color: "#e2e8f0", fontFamily: "'Playfair Display', serif" }}>Contracts</h2>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 24 }}>
        <div style={{ background: "#0f1623", border: "1px solid #1e2d45", borderRadius: 12, padding: 24 }}>
          <h3 style={{ margin: "0 0 20px", fontSize: 13, color: "#8892a4", letterSpacing: "0.1em", textTransform: "uppercase" }}>Generate Contract</h3>
          <SelectField label="Template" value={selectedTemplate} onChange={setSelectedTemplate}
            options={CONTRACT_TEMPLATES.map(t => ({ value: t.id, label: t.label }))} />
          <SelectField label="Client" value={selectedClient} onChange={setSelectedClient}
            options={clients.map(c => ({ value: c.id, label: c.name }))} />
          <InputField label="Project Description" value={projectDesc} onChange={setProjectDesc} placeholder="Brief scope of work" />
          <InputField label="Contract Value ($)" value={amount} onChange={setAmount} type="number" placeholder="0" />
          <PrimaryBtn onClick={generate} style={{ width: "100%", marginTop: 8 }}>
            {generating ? "Generating..." : "Generate with Claude"}
          </PrimaryBtn>
        </div>

        <div style={{ background: "#0f1623", border: "1px solid #1e2d45", borderRadius: 12, padding: 24 }}>
          {contract ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 13, color: "#8892a4", letterSpacing: "0.1em", textTransform: "uppercase" }}>Generated Contract</h3>
                <button onClick={() => navigator.clipboard.writeText(contract)}
                  style={{ background: "#60a5fa20", border: "1px solid #60a5fa40", borderRadius: 6, padding: "5px 12px", color: "#60a5fa", fontSize: 11, cursor: "pointer" }}>
                  Copy
                </button>
              </div>
              <pre style={{ color: "#c8d3e0", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0, maxHeight: 500, overflowY: "auto" }}>
                {contract}
              </pre>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, color: "#3a4a60" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>◉</div>
              <div style={{ fontSize: 14 }}>Select a template and generate a contract.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── AI ASSISTANT ───────────────────────────────────────────────────────────
function Assistant({ clients, projects, invoices, expenses, mileage }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hey Nate. I'm connected to your Gmail and Google Calendar and have full context on your clients, projects, invoices, expenses, and mileage. Ask me anything." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    const history = [...messages.filter((m, i) => i > 0), userMsg];
    setMessages(m => [...m, userMsg]);
    setInput("");
    setLoading(true);

    const totalMiles = mileage.filter(m => m.deductible).reduce((s, m) => s + m.miles, 0);
    const totalExpDeductions = expenses.filter(e => e.deductible).reduce((s, e) => s + e.amount, 0);
    const context = `You are Nate's business assistant at Underhillmedia (video editing and content creation). You have access to Gmail and Google Calendar. Business snapshot: ${clients.length} clients, ${projects.filter(p => p.status === "in_progress").length} active projects, $${invoices.filter(i => i.status === "outstanding").reduce((s, i) => s + i.amount, 0)} outstanding, $${totalExpDeductions.toFixed(2)} in deductible expenses, ${totalMiles.toFixed(1)} deductible miles logged ($${(totalMiles * IRS_RATE_2026).toFixed(2)} IRS mileage deduction at $${IRS_RATE_2026}/mile). Never use dashes in responses.`;
    const result = await callClaude(history.map(m => ({ role: m.role, content: m.content })), context);
    setMessages(m => [...m, { role: "assistant", content: result }]);
    setLoading(false);
  };

  const suggestions = ["What are my total tax deductions so far?", "Draft a payment follow-up for Apex Creative", "What's my mileage deduction this year?", "Summarize my active projects"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 180px)" }}>
      <h2 style={{ margin: "0 0 20px", fontSize: 24, color: "#e2e8f0", fontFamily: "'Playfair Display', serif" }}>AI Assistant</h2>

      {messages.length === 1 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => setInput(s)} style={{ background: "#1a2235", border: "1px solid #2a3550", borderRadius: 8, padding: "8px 14px", color: "#8892a4", fontSize: 12, cursor: "pointer" }}>{s}</button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "72%", padding: "14px 18px", borderRadius: 12,
              background: m.role === "user" ? "linear-gradient(135deg, #3b5bdb, #4c6ef5)" : "#0f1623",
              border: m.role === "assistant" ? "1px solid #1e2d45" : "none",
              color: "#e2e8f0", fontSize: 14, lineHeight: 1.65,
              borderBottomRightRadius: m.role === "user" ? 4 : 12,
              borderBottomLeftRadius: m.role === "assistant" ? 4 : 12,
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ background: "#0f1623", border: "1px solid #1e2d45", borderRadius: 12, borderBottomLeftRadius: 4, padding: "14px 18px", color: "#6b7a8e", fontSize: 14 }}>
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask anything — draft an email, check calendar, summarize a project..."
          style={{
            flex: 1, background: "#0f1623", border: "1px solid #2a3550",
            borderRadius: 10, padding: "14px 18px", color: "#e2e8f0", fontSize: 14, outline: "none",
          }}
        />
        <PrimaryBtn onClick={send} style={{ padding: "14px 24px" }}>Send</PrimaryBtn>
      </div>
    </div>
  );
}

// ── ROOT APP ───────────────────────────────────────────────────────────────
// ── FLOATING CLAUDE COMMAND BAR ────────────────────────────────────────────
function ClaudeCommandBar({ clients, setClients, projects, setProjects, invoices, setInvoices, expenses, setExpenses, mileage, setMileage, setActive }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [lastAction, setLastAction] = useState(null);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const buildContext = () => {
    const totalMiles = mileage.filter(m => m.deductible).reduce((s, m) => s + m.miles, 0);
    const totalExpDeductions = expenses.filter(e => e.deductible).reduce((s, e) => s + e.amount, 0);
    const outstanding = invoices.filter(i => i.status === "outstanding").reduce((s, i) => s + i.amount, 0);
    return `You are Claude, the AI controller for Nate's Underhillmedia business app. You can read and write ALL business data.

CURRENT DATA STATE:
Clients: ${JSON.stringify(clients)}
Projects: ${JSON.stringify(projects)}
Invoices: ${JSON.stringify(invoices)}
Expenses: ${JSON.stringify(expenses)}
Mileage: ${JSON.stringify(mileage)}

SUMMARY: ${clients.length} clients, ${projects.filter(p => p.status === "in_progress").length} active projects, $${outstanding} outstanding, $${totalExpDeductions.toFixed(2)} deductible expenses, ${totalMiles.toFixed(1)} deductible miles.

You can take any of these actions by responding with a JSON action block followed by a natural confirmation message.

ACTION FORMAT (always put this first if taking an action, then your message):
ACTION:{"type":"ACTION_TYPE","data":{...}}

Available action types and their data shapes:
- add_client: {name, email, phone, status} 
- add_project: {clientId, name, status, value, dueDate, notes}
- add_invoice: {clientId, projectId, amount, dueDate}
- mark_invoice_paid: {invoiceId}
- add_expense: {date, description, amount, category, deductible, notes}
- add_mileage: {date, from, to, miles, purpose, clientId, deductible}
- update_project_status: {projectId, status}
- navigate: {page} (pages: dashboard, clients, projects, invoices, expenses, mileage, contracts, assistant)
- none: (just answer, no data change)

RULES:
- Never use dashes in your response text.
- Be brief and natural. One or two sentences after confirming an action.
- If something is ambiguous, ask one clarifying question.
- For dates, use today's date (2026-06-01) if not specified.
- Expense categories: Software & Subscriptions, Equipment & Gear, Storage & Drives, Office & Supplies, Travel & Transport, Marketing & Advertising, Professional Services, Education & Training, Meals & Entertainment, Other
- Project statuses: in_progress, completed, on_hold, cancelled
- Invoice statuses: draft, outstanding, paid
- Client statuses: active, prospect, inactive
- IRS mileage rate 2026: $0.70/mile`;
  };

  const applyAction = (action) => {
    const today = new Date().toISOString().split("T")[0];
    switch (action.type) {
      case "add_client":
        setClients(prev => [...prev, { id: Date.now(), totalBilled: 0, outstanding: 0, ...action.data }]);
        setLastAction("Added client");
        break;
      case "add_project":
        setProjects(prev => [...prev, { id: Date.now(), ...action.data, clientId: Number(action.data.clientId), value: Number(action.data.value) }]);
        setLastAction("Added project");
        break;
      case "add_invoice": {
        const num = `INV-${String(invoices.length + 1).padStart(3, "0")}`;
        setInvoices(prev => [...prev, { id: Date.now(), number: num, status: "outstanding", date: today, ...action.data, clientId: Number(action.data.clientId), amount: Number(action.data.amount) }]);
        setLastAction("Created invoice");
        break;
      }
      case "mark_invoice_paid":
        setInvoices(prev => prev.map(i => i.id === Number(action.data.invoiceId) ? { ...i, status: "paid" } : i));
        setLastAction("Marked invoice paid");
        break;
      case "add_expense":
        setExpenses(prev => [...prev, { id: Date.now(), ...action.data, amount: Number(action.data.amount) }]);
        setLastAction("Logged expense");
        break;
      case "add_mileage":
        setMileage(prev => [...prev, { id: Date.now(), ...action.data, miles: Number(action.data.miles), clientId: action.data.clientId ? Number(action.data.clientId) : null }]);
        setLastAction("Logged trip");
        break;
      case "update_project_status":
        setProjects(prev => prev.map(p => p.id === Number(action.data.projectId) ? { ...p, status: action.data.status } : p));
        setLastAction("Updated project");
        break;
      case "navigate":
        setActive(action.data.page);
        setLastAction(`Navigated to ${action.data.page}`);
        break;
      default:
        break;
    }
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput("");
    setLoading(true);
    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);

    const systemPrompt = buildContext();
    const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));

    const raw = await callClaude(apiMessages, systemPrompt);

    // Parse action if present
    let displayText = raw;
    if (raw.startsWith("ACTION:")) {
      const newlineIdx = raw.indexOf("\n");
      const actionLine = newlineIdx > -1 ? raw.slice(7, newlineIdx).trim() : raw.slice(7).trim();
      displayText = newlineIdx > -1 ? raw.slice(newlineIdx).trim() : "Done.";
      try {
        const action = JSON.parse(actionLine);
        if (action.type !== "none") applyAction(action);
      } catch (e) { /* ignore parse errors */ }
    }

    setMessages(m => [...m, { role: "assistant", content: displayText }]);
    setLoading(false);
  };

  const QUICK = [
    "Log a business trip",
    "Add an expense",
    "Create an invoice",
    "What are my total deductions?",
    "Show my outstanding invoices",
    "Mark a project complete",
  ];

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button className="claude-fab" onClick={() => setOpen(true)} style={{
          position: "fixed", bottom: 32, right: 32, zIndex: 900,
          width: 58, height: 58, borderRadius: "50%",
          background: "linear-gradient(135deg, #3b5bdb, #4c6ef5)",
          border: "none", cursor: "pointer",
          boxShadow: "0 8px 32px #3b5bdb66",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, color: "#fff",
          transition: "transform 0.2s",
        }}>◉</button>
      )}

      {/* Command Panel */}
      {open && (
        <div className="claude-panel" style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 1000,
          width: 420, height: 560,
          background: "#0a0f1e",
          border: "1px solid #2a3550",
          borderRadius: 20,
          boxShadow: "0 32px 80px #000c, 0 0 0 1px #3b5bdb22",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "16px 20px", borderBottom: "1px solid #1a2235",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "linear-gradient(135deg, #0d1428, #111827)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #3b5bdb, #4c6ef5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>◉</div>
              <div>
                <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600 }}>Claude</div>
                <div style={{ color: "#4ade80", fontSize: 10, letterSpacing: "0.08em" }}>● LIVE ACCESS TO ALL DATA</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#6b7a8e", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px" }}>
            {messages.length === 0 && (
              <div>
                <div style={{ color: "#c8d3e0", fontSize: 13, lineHeight: 1.6, marginBottom: 16, padding: "12px 14px", background: "#0f1623", borderRadius: 10, border: "1px solid #1e2d45" }}>
                  Tell me what you need, Nate. I can log trips, create invoices, add expenses, update projects, pull up data — whatever it is, just say it.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {QUICK.map(q => (
                    <button key={q} onClick={() => setInput(q)} style={{
                      background: "#0f1623", border: "1px solid #2a3550", borderRadius: 8,
                      padding: "8px 10px", color: "#8892a4", fontSize: 11, cursor: "pointer", textAlign: "left", lineHeight: 1.4,
                    }}>{q}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                <div style={{
                  maxWidth: "85%", padding: "10px 14px", borderRadius: 12, fontSize: 13, lineHeight: 1.6,
                  background: m.role === "user" ? "linear-gradient(135deg, #3b5bdb, #4c6ef5)" : "#0f1623",
                  border: m.role === "assistant" ? "1px solid #1e2d45" : "none",
                  color: "#e2e8f0",
                  borderBottomRightRadius: m.role === "user" ? 3 : 12,
                  borderBottomLeftRadius: m.role === "assistant" ? 3 : 12,
                }}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
                <div style={{ background: "#0f1623", border: "1px solid #1e2d45", borderRadius: 12, borderBottomLeftRadius: 3, padding: "10px 14px", color: "#6b7a8e", fontSize: 13 }}>
                  <span style={{ animation: "pulse 1s infinite" }}>Thinking...</span>
                </div>
              </div>
            )}
            {lastAction && !loading && (
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 10, color: "#4ade80", letterSpacing: "0.1em", background: "#4ade8012", border: "1px solid #4ade8030", borderRadius: 20, padding: "3px 10px" }}>✓ {lastAction}</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px 14px 14px", borderTop: "1px solid #1a2235" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
                placeholder="Tell Claude what to do..."
                style={{
                  flex: 1, background: "#0f1623", border: "1px solid #2a3550",
                  borderRadius: 10, padding: "11px 14px", color: "#e2e8f0",
                  fontSize: 13, outline: "none",
                }}
              />
              <button onClick={send} disabled={loading} style={{
                width: 38, height: 38, borderRadius: 10,
                background: loading ? "#1a2235" : "linear-gradient(135deg, #3b5bdb, #4c6ef5)",
                border: "none", color: "#fff", fontSize: 16, cursor: loading ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>↑</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── SUPABASE DATA HOOKS ────────────────────────────────────────────────────
function useSupabaseTable(table, transform = r => r, reverseTransform = r => r) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: rows } = await supabase.from(table).select("*").order("id");
    if (rows) setData(rows.map(transform));
    setLoading(false);
  }, [table]);

  useEffect(() => { load(); }, [load]);

  const add = async (item) => {
    const { data: row } = await supabase.from(table).insert([reverseTransform(item)]).select().single();
    if (row) setData(prev => [...prev, transform(row)]);
    return row;
  };

  const update = async (id, changes) => {
    await supabase.from(table).update(reverseTransform(changes)).eq("id", id);
    setData(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r));
  };

  const remove = async (id) => {
    await supabase.from(table).delete().eq("id", id);
    setData(prev => prev.filter(r => r.id !== id));
  };

  const set = setData;

  return { data, loading, add, update, remove, set, reload: load };
}

function transformClient(r) {
  return { ...r, clientId: r.client_id, totalBilled: r.total_billed, outstanding: r.outstanding, pipelineStage: r.pipeline_stage };
}
function reverseClient(r) {
  const { clientId, totalBilled, pipelineStage, ...rest } = r;
  return { ...rest, client_id: clientId, total_billed: totalBilled ?? 0, pipeline_stage: pipelineStage ?? "Lead" };
}
function transformProject(r) {
  return { ...r, clientId: r.client_id, dueDate: r.due_date };
}
function reverseProject(r) {
  const { clientId, dueDate, ...rest } = r;
  return { ...rest, client_id: clientId, due_date: dueDate };
}
function transformInvoice(r) {
  return { ...r, clientId: r.client_id, projectId: r.project_id, dueDate: r.due_date };
}
function reverseInvoice(r) {
  const { clientId, projectId, dueDate, ...rest } = r;
  return { ...rest, client_id: clientId, project_id: projectId, due_date: dueDate };
}
function transformMileage(r) {
  return { ...r, clientId: r.client_id, from: r.from, to: r.to };
}
function reverseMileage(r) {
  const { clientId, ...rest } = r;
  return { ...rest, client_id: clientId };
}
function transformInteraction(r) {
  return { ...r, clientId: r.client_id };
}
function reverseInteraction(r) {
  const { clientId, ...rest } = r;
  return { ...rest, client_id: clientId };
}
function transformFollowup(r) {
  return { ...r, clientId: r.client_id, dueDate: r.due_date };
}
function reverseFollowup(r) {
  const { clientId, dueDate, ...rest } = r;
  return { ...rest, client_id: clientId, due_date: dueDate };
}

// ── ROOT APP ───────────────────────────────────────────────────────────────
export default function App() {
  const [active, setActive] = useState("dashboard");

  const clientsHook = useSupabaseTable("clients", transformClient, reverseClient);
  const projectsHook = useSupabaseTable("projects", transformProject, reverseProject);
  const invoicesHook = useSupabaseTable("invoices", transformInvoice, reverseInvoice);
  const expensesHook = useSupabaseTable("expenses");
  const mileageHook = useSupabaseTable("mileage", transformMileage, reverseMileage);
  const interactionsHook = useSupabaseTable("interactions", transformInteraction, reverseInteraction);
  const followupsHook = useSupabaseTable("followups", transformFollowup, reverseFollowup);

  const clients = clientsHook.data;
  const projects = projectsHook.data;
  const invoices = invoicesHook.data;
  const expenses = expensesHook.data;
  const mileage = mileageHook.data;
  const interactions = interactionsHook.data;
  const followups = followupsHook.data;
  const loading = clientsHook.loading;

  // Setters that write to Supabase
  const setClients = async (updater) => {
    if (typeof updater === "function") {
      const next = updater(clients);
      const added = next.find(c => !clients.find(x => x.id === c.id));
      if (added) await clientsHook.add(added);
    }
  };
  const setProjects = async (updater) => {
    if (typeof updater === "function") {
      const next = updater(projects);
      const added = next.find(p => !projects.find(x => x.id === p.id));
      if (added) await projectsHook.add(added);
    }
  };
  const setInvoices = async (updater) => {
    if (typeof updater === "function") {
      const next = updater(invoices);
      const added = next.find(i => !invoices.find(x => x.id === i.id));
      if (added) { await invoicesHook.add(added); return; }
      const changed = next.find(i => { const old = invoices.find(x => x.id === i.id); return old && old.status !== i.status; });
      if (changed) await invoicesHook.update(changed.id, { status: changed.status });
    }
  };
  const setExpenses = async (updater) => {
    if (typeof updater === "function") {
      const next = updater(expenses);
      const added = next.find(e => !expenses.find(x => x.id === e.id));
      if (added) { await expensesHook.add(added); return; }
      const removed = expenses.find(e => !next.find(x => x.id === e.id));
      if (removed) await expensesHook.remove(removed.id);
    }
  };
  const setMileage = async (updater) => {
    if (typeof updater === "function") {
      const next = updater(mileage);
      const added = next.find(m => !mileage.find(x => x.id === m.id));
      if (added) { await mileageHook.add(added); return; }
      const removed = mileage.find(m => !next.find(x => x.id === m.id));
      if (removed) await mileageHook.remove(removed.id);
    }
  };
  const setInteractions = async (updater) => {
    if (typeof updater === "function") {
      const next = updater(interactions);
      const added = next.find(i => !interactions.find(x => x.id === i.id));
      if (added) await interactionsHook.add(added);
    }
  };
  const setFollowups = async (updater) => {
    if (typeof updater === "function") {
      const next = updater(followups);
      const added = next.find(f => !followups.find(x => x.id === f.id));
      if (added) { await followupsHook.add(added); return; }
      const changed = next.find(f => { const old = followups.find(x => x.id === f.id); return old && old.done !== f.done; });
      if (changed) await followupsHook.update(changed.id, { done: changed.done });
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#070d1a", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 32, color: "#3b5bdb" }}>◉</div>
        <div style={{ color: "#8892a4", fontSize: 14, letterSpacing: "0.1em" }}>Loading Underhillmedia Studio...</div>
      </div>
    );
  }

  const renderPage = () => {
    switch (active) {
      case "dashboard": return <Dashboard clients={clients} projects={projects} invoices={invoices} expenses={expenses} mileage={mileage} followups={followups} />;
      case "clients": return <Clients clients={clients} setClients={setClients} interactions={interactions} setInteractions={setInteractions} followups={followups} setFollowups={setFollowups} />;
      case "projects": return <Projects projects={projects} setProjects={setProjects} clients={clients} />;
      case "invoices": return <Invoices invoices={invoices} setInvoices={setInvoices} clients={clients} projects={projects} />;
      case "expenses": return <Expenses expenses={expenses} setExpenses={setExpenses} />;
      case "mileage": return <Mileage mileage={mileage} setMileage={setMileage} clients={clients} />;
      case "calendar": return <Calendar clients={clients} projects={projects} invoices={invoices} />;
      case "contracts": return <Contracts clients={clients} />;
      case "assistant": return <Assistant clients={clients} projects={projects} invoices={invoices} expenses={expenses} mileage={mileage} />;
      default: return null;
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #070d1a; font-family: 'DM Sans', sans-serif; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a3550; border-radius: 3px; }
        option { background: #1a2235; }
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .desktop-main { margin-left: 0 !important; padding: 72px 16px 90px !important; }
          .mobile-nav { display: flex !important; }
          .mobile-header { display: flex !important; }
          table { font-size: 12px; }
          th, td { padding: 10px 12px !important; }
          .claude-panel { left: 8px !important; right: 8px !important; bottom: 80px !important; width: auto !important; height: 65vh !important; border-radius: 16px !important; }
          .claude-fab { bottom: 90px !important; right: 16px !important; }
          .mobile-only { display: flex !important; }
          .desktop-only { display: none !important; }
          .stat-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (min-width: 769px) {
          .mobile-nav { display: none !important; }
          .mobile-header { display: none !important; }
          .mobile-only { display: none !important; }
          .desktop-only { display: block !important; }
        }
      `}</style>

      {/* Mobile Header */}
      <div className="mobile-header" style={{
        display: "none", position: "fixed", top: 0, left: 0, right: 0, zIndex: 800,
        background: "#0a0f1e", borderBottom: "1px solid #1a2235",
        padding: "12px 20px", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "#3b5bdb", textTransform: "uppercase", fontWeight: 600 }}>Underhillmedia</div>
          <div style={{ fontSize: 16, color: "#e2e8f0", fontFamily: "'Playfair Display', serif" }}>Studio</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
          <span style={{ fontSize: 10, color: "#4ade80", letterSpacing: "0.08em" }}>LIVE</span>
        </div>
      </div>

      <div style={{ display: "flex", minHeight: "100vh", background: "#070d1a" }}>
        {/* Desktop Sidebar */}
        <div className="desktop-sidebar" style={{ width: 220, background: "#0a0f1e", borderRight: "1px solid #1a2235", display: "flex", flexDirection: "column", position: "fixed", top: 0, bottom: 0, left: 0 }}>
          <div style={{ padding: "28px 24px 20px" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "#3b5bdb", textTransform: "uppercase", fontWeight: 600, marginBottom: 2 }}>Underhillmedia</div>
            <div style={{ fontSize: 18, color: "#e2e8f0", fontFamily: "'Playfair Display', serif" }}>Studio</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
              <span style={{ fontSize: 10, color: "#4ade80", letterSpacing: "0.08em" }}>LIVE</span>
            </div>
          </div>
          <nav style={{ flex: 1, padding: "0 12px", overflowY: "auto" }}>
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => setActive(item.id)} style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "11px 12px", borderRadius: 8,
                background: active === item.id ? "#3b5bdb22" : "transparent",
                border: active === item.id ? "1px solid #3b5bdb44" : "1px solid transparent",
                color: active === item.id ? "#7c9ef8" : "#6b7a8e",
                fontSize: 13, fontWeight: active === item.id ? 500 : 400,
                cursor: "pointer", marginBottom: 2, textAlign: "left", transition: "all 0.15s",
              }}>
                <span style={{ fontSize: 15, opacity: 0.8 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
          <div style={{ padding: "16px 24px", borderTop: "1px solid #1a2235" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #3b5bdb, #4c6ef5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", fontWeight: 600 }}>N</div>
              <div>
                <div style={{ fontSize: 13, color: "#c8d3e0" }}>Nate</div>
                <div style={{ fontSize: 11, color: "#3b5bdb" }}>Underhillmedia</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="desktop-main" style={{ marginLeft: 220, flex: 1, padding: "40px 44px", minHeight: "100vh", paddingTop: "40px" }}>
          {renderPage()}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="mobile-nav" style={{
        display: "none", position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 800,
        background: "#0a0f1e", borderTop: "1px solid #1a2235",
        padding: "8px 0 20px",
        justifyContent: "space-around", alignItems: "center",
      }}>
        {[
          { id: "dashboard", label: "Home", icon: "⬡" },
          { id: "clients", label: "Clients", icon: "◈" },
          { id: "projects", label: "Projects", icon: "◫" },
          { id: "invoices", label: "Invoices", icon: "◧" },
          { id: "calendar", label: "Calendar", icon: "◻" },
          { id: "expenses", label: "Expenses", icon: "◰" },
          { id: "assistant", label: "Claude", icon: "◉" },
        ].map(item => (
          <button key={item.id} onClick={() => setActive(item.id)} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            background: "none", border: "none", cursor: "pointer", padding: "4px 8px",
            color: active === item.id ? "#7c9ef8" : "#4a5568",
            minWidth: 44,
          }}>
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <span style={{ fontSize: 9, letterSpacing: "0.04em", fontWeight: active === item.id ? 600 : 400 }}>{item.label}</span>
          </button>
        ))}
      </div>

      <ClaudeCommandBar
        clients={clients} setClients={setClients}
        projects={projects} setProjects={setProjects}
        invoices={invoices} setInvoices={setInvoices}
        expenses={expenses} setExpenses={setExpenses}
        mileage={mileage} setMileage={setMileage}
        setActive={setActive}
      />
    </>
  );
}
