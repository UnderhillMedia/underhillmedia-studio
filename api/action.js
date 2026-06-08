export const config = { api: { bodyParser: true }, maxDuration: 30 };

const SUPABASE_URL = "https://foflzpsgshrziblffezl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvZmx6cHNnc2hyemlibGZmZXpsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQyMTQ4MSwiZXhwIjoyMDk1OTk3NDgxfQ.H_Ef99AKbk3ml7U5ZA-LCDnyp333qe_nBpIO10GNSBg";

async function supabaseInsert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer": "return=representation",
    },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function supabaseUpdate(table, id, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer": "return=representation",
    },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function supabaseQuery(table, filters = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*${filters}`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
    },
  });
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { action, data } = req.body;
  const today = new Date().toISOString().split("T")[0];

  try {
    switch (action) {
      case "add_project": {
        const result = await supabaseInsert("projects", {
          name: data.name,
          status: data.status || "in_progress",
          value: Number(data.value) || 0,
          due_date: data.dueDate || "",
          notes: data.notes || "",
          client_id: data.clientId ? Number(data.clientId) : null,
        });
        return res.json({ success: true, data: result });
      }
      case "add_client": {
        const result = await supabaseInsert("clients", {
          name: data.name,
          email: data.email || "",
          phone: data.phone || "",
          status: data.status || "prospect",
          pipeline_stage: data.pipelineStage || "Lead",
          company: data.company || "",
          source: data.source || "manual",
          notes: data.notes || "",
          total_billed: 0,
          outstanding: 0,
        });
        return res.json({ success: true, data: result });
      }
      case "add_expense": {
        const result = await supabaseInsert("expenses", {
          date: data.date || today,
          description: data.description,
          amount: Number(data.amount),
          category: data.category || "Other",
          deductible: data.deductible !== false,
          notes: data.notes || "",
        });
        return res.json({ success: true, data: result });
      }
      case "add_mileage": {
        const result = await supabaseInsert("mileage", {
          date: data.date || today,
          from: data.from || "Home",
          to: data.to,
          miles: Number(data.miles),
          purpose: data.purpose || "",
          client_id: data.clientId ? Number(data.clientId) : null,
          deductible: data.deductible !== false,
        });
        return res.json({ success: true, data: result });
      }
      case "add_invoice": {
        const existing = await supabaseQuery("invoices", "&select=id");
        const num = `INV-${String((existing.length || 0) + 1).padStart(3, "0")}`;
        const result = await supabaseInsert("invoices", {
          number: num,
          status: "outstanding",
          date: today,
          amount: Number(data.amount),
          due_date: data.dueDate || "",
          client_id: data.clientId ? Number(data.clientId) : null,
          notes: data.notes || "",
        });
        return res.json({ success: true, data: result });
      }
      case "mark_invoice_paid": {
        const result = await supabaseUpdate("invoices", data.invoiceId, { status: "paid" });
        return res.json({ success: true, data: result });
      }
      case "update_project_status": {
        const result = await supabaseUpdate("projects", data.projectId, { status: data.status });
        return res.json({ success: true, data: result });
      }
      case "add_calendar_event": {
        const result = await supabaseInsert("calendar_events", {
          title: data.title,
          date: data.date,
          start_time: data.startTime || "09:00",
          end_time: data.endTime || "10:00",
          description: data.description || "",
          location: data.location || "",
          color: data.color || "#3b5bdb",
          source: "claude",
        });
        return res.json({ success: true, data: result });
      }
      default:
        return res.status(400).json({ error: "Unknown action" });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
