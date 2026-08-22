import { Pool, type QueryResultRow } from "pg";
import fs from "node:fs";
import path from "node:path";

const connectionString = process.env.DATABASE_URL;
let pool: Pool | null = null;
if (connectionString && !connectionString.includes("YOUR_PASSWORD")) {
  try {
    pool = new Pool({ connectionString, max: 8 });
  } catch (e) {
    console.warn("PostgreSQL pool init skipped:", e);
  }
}

// In-Memory Database Engine Fallback with Active Disk Persistence
export type DbPatient = {
  id: string; name: string; age: number; risk: number; riskLevel: "Low" | "Moderate" | "High";
  adherence: number; spo2: number; systolic: number; diastolic: number; falls: number;
  living: string; caregiver: string; focus: string; conditions: string; source: string;
  medications?: string; created_at: string;
};

export type DbNote = { id: number; patient_id: string; author: string; note: string; created_at: string };
export type DbFollowup = { id: number; patient_id: string; scheduled_for: string; owner: string; status: string; created_at: string };
export type DbCarePlan = { id: number; patient_id: string; plan: string; author: string; active: boolean; updated_at: string };
export type DbRecommendation = { id: number; patient_id: string; title: string; detail: string; status: "Pending" | "Approved" | "Modified" | "Rejected"; created_at: string; approved_at?: string };

const store = (globalThis as unknown as {
  yorisoiStore?: {
    patients: DbPatient[];
    notes: DbNote[];
    followups: DbFollowup[];
    plans: DbCarePlan[];
    recommendations: DbRecommendation[];
    nextId: number;
  };
}).yorisoiStore ??= {
  patients: [],
  notes: [],
  followups: [],
  plans: [],
  recommendations: [],
  nextId: 1000
};

const storeDiskPath = path.join(process.cwd(), "data", "patient_store_active.json");

function persistStoreToDisk() {
  try {
    fs.writeFileSync(storeDiskPath, JSON.stringify(store, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to persist active DB store to disk:", e);
  }
}

function initStoreFromCsv() {
  if (store.patients.length > 0) return;
  try {
    // 1. Try loading from active persisted JSON store if present
    if (fs.existsSync(storeDiskPath)) {
      const activeData = JSON.parse(fs.readFileSync(storeDiskPath, "utf8"));
      if (activeData?.patients?.length) {
        store.patients = activeData.patients;
        store.notes = activeData.notes || [];
        store.followups = activeData.followups || [];
        store.plans = activeData.plans || [];
        store.recommendations = activeData.recommendations || [];
        store.nextId = activeData.nextId || 1000;
        return;
      }
    }

    // 2. Instant database creation & data input from CSV dataset for new devices
    const csvPath = path.join(process.cwd(), "data", "Yorisoi_500_Patient_Demo_Dataset.csv");
    if (!fs.existsSync(csvPath)) return;
    const csv = fs.readFileSync(csvPath, "utf8").trim().split(/\r?\n/);
    const headers = csv.shift()?.split(",") || [];
    const val = (row: string[], name: string) => row[headers.indexOf(name)] ?? "";
    
    let defaultIdCounter = 101;
    store.patients = csv.map((line) => {
      const row = line.split(",");
      const rawId = val(row, "patient_id");
      const cleanId = rawId && !isNaN(Number(rawId)) ? rawId : String(defaultIdCounter++);
      const riskScore = Number(val(row, "demo_risk_score_0_100")) || 25;
      const riskLvl = (val(row, "demo_risk_level") as any) || (riskScore >= 50 ? "High" : riskScore >= 30 ? "Moderate" : "Low");
      return {
        id: cleanId,
        name: val(row, "demo_patient_name"),
        age: Number(val(row, "age_years")) || 72,
        risk: riskScore,
        riskLevel: riskLvl,
        adherence: Number(val(row, "medication_adherence_pct")) || 95,
        spo2: Number(val(row, "spo2_pct")) || 97,
        systolic: Number(val(row, "systolic_bp_mmhg")) || 120,
        diastolic: Number(val(row, "diastolic_bp_mmhg")) || 80,
        falls: Number(val(row, "falls_last_12m")) || 0,
        living: val(row, "living_arrangement") || "With family",
        caregiver: val(row, "caregiver_available") || "Yes",
        focus: val(row, "recommended_focus") || "routine wellness",
        conditions: val(row, "chronic_conditions").split(";").join(" · ") || "Hypertension",
        medications: "Amlodipine 5mg daily; Lisinopril 10mg daily; Multivitamin",
        source: "CSV_SEED",
        created_at: new Date().toISOString()
      };
    });

    // Seed default notes for primary patient 101
    const p1 = store.patients[0]?.id || "101";
    store.notes.push({
      id: ++store.nextId,
      patient_id: p1,
      author: "Dr. Morgan Lee",
      note: "Initial health baseline recorded. Medication routine reviewed. Continue daily BP monitoring.",
      created_at: new Date().toISOString()
    });
    store.plans.push({
      id: ++store.nextId,
      patient_id: p1,
      plan: "Blood pressure elevated — monitor twice daily. Follow-up in 7 days.",
      author: "Dr. Morgan Lee",
      active: true,
      updated_at: new Date().toISOString()
    });
    store.followups.push({
      id: ++store.nextId,
      patient_id: p1,
      scheduled_for: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      owner: "Dr. Morgan Lee",
      status: "Scheduled",
      created_at: new Date().toISOString()
    });
    store.recommendations.push({
      id: ++store.nextId,
      patient_id: p1,
      title: "AI Care Recommendation",
      detail: "BP elevated (137 mmHg). Monitor morning & evening. Encourage sodium restriction and hydration.",
      status: "Approved",
      created_at: new Date().toISOString(),
      approved_at: new Date().toISOString()
    });

    // Instantly persist database on first run
    persistStoreToDisk();
  } catch (e) {
    console.error("Failed to seed memory DB store from CSV:", e);
  }
}

initStoreFromCsv();

let pgSchemaInitDone = false;
async function ensurePgSchema(p: Pool) {
  if (pgSchemaInitDone) return;
  try {
    await p.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id varchar(20) PRIMARY KEY, name text NOT NULL, age integer NOT NULL, risk integer NOT NULL,
        risk_level varchar(12) NOT NULL, adherence numeric(5,1) NOT NULL, spo2 integer NOT NULL,
        systolic integer NOT NULL, diastolic integer NOT NULL, falls integer NOT NULL, living text NOT NULL,
        caregiver text NOT NULL, focus text NOT NULL, conditions text NOT NULL, medications text NOT NULL DEFAULT 'Amlodipine 5mg daily', source text NOT NULL DEFAULT 'CSV_SEED', created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS clinical_notes (id bigserial PRIMARY KEY, patient_id varchar(20) REFERENCES patients(id) ON DELETE CASCADE, author text NOT NULL, note text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS followups (id bigserial PRIMARY KEY, patient_id varchar(20) REFERENCES patients(id) ON DELETE CASCADE, scheduled_for date NOT NULL, owner text NOT NULL, status text NOT NULL DEFAULT 'Scheduled', created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS care_plans (id bigserial PRIMARY KEY, patient_id varchar(20) REFERENCES patients(id) ON DELETE CASCADE, plan text NOT NULL, author text NOT NULL, active boolean NOT NULL DEFAULT true, updated_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS recommendations (id bigserial PRIMARY KEY, patient_id varchar(20) REFERENCES patients(id) ON DELETE CASCADE, title text NOT NULL, detail text NOT NULL, status text NOT NULL DEFAULT 'Pending', created_at timestamptz NOT NULL DEFAULT now(), approved_at timestamptz);
      CREATE TABLE IF NOT EXISTS demo_users (id bigserial PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE, password text NOT NULL, role varchar(12) NOT NULL CHECK (role IN ('doctor','family','patient')));
    `);

    // Auto seed PostgreSQL if table is empty
    const check = await p.query("SELECT count(*)::text AS count FROM patients");
    if (parseInt(check.rows[0]?.count || "0", 10) === 0 && store.patients.length > 0) {
      for (const pt of store.patients) {
        await p.query(
          `INSERT INTO patients (id,name,age,risk,risk_level,adherence,spo2,systolic,diastolic,falls,living,caregiver,focus,conditions,medications,source)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT (id) DO NOTHING`,
          [pt.id, pt.name, pt.age, pt.risk, pt.riskLevel, pt.adherence, pt.spo2, pt.systolic, pt.diastolic, pt.falls, pt.living, pt.caregiver, pt.focus, pt.conditions, pt.medications || "Amlodipine 5mg daily", pt.source]
        );
      }
    }
    pgSchemaInitDone = true;
  } catch (e) {
    console.warn("PostgreSQL auto-schema init skipped:", (e as Error).message);
  }
}

export async function sql<T extends QueryResultRow = Record<string, unknown>>(text: string, values: unknown[] = []): Promise<{ rows: T[]; count?: number }> {
  if (pool) {
    try {
      await ensurePgSchema(pool);
      const result = await pool.query<T>(text, values);
      return { rows: result.rows };
    } catch (e) {
      console.warn("PostgreSQL query failed, utilizing in-memory store fallback:", (e as Error).message);
    }
  }

  // Pure In-Memory SQL Query Interceptor for high reliability
  const clean = text.replace(/\s+/g, " ").trim();

  // 1. SELECT patients
  if (clean.includes("FROM patients")) {
    let list = [...store.patients];
    if (clean.includes("WHERE name ILIKE") || clean.includes("WHERE id ILIKE") || clean.includes("WHERE id=")) {
      const term = String(values[0] || "").replace(/%/g, "").toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(term) || p.id.toLowerCase().includes(term) || p.id === values[0]);
    }
    if (clean.includes("ORDER BY")) {
      list.sort((a, b) => {
        const order = { High: 1, Moderate: 2, Low: 3 };
        if (order[a.riskLevel] !== order[b.riskLevel]) return order[a.riskLevel] - order[b.riskLevel];
        return b.risk - a.risk;
      });
    }
    if (clean.includes("LIMIT")) {
      const limit = Number(values[values.length - 1]) || 500;
      list = list.slice(0, limit);
    }
    if (clean.includes("count(*)::text")) {
      return { rows: [{ count: String(list.length) }] as unknown as T[] };
    }
    return { rows: list as unknown as T[] };
  }

  // 2. INSERT INTO patients
  if (clean.startsWith("INSERT INTO patients")) {
    const newP: DbPatient = {
      id: String(values[0]),
      name: String(values[1]),
      age: Number(values[2]),
      risk: Number(values[3]),
      riskLevel: values[4] as any,
      adherence: Number(values[5]),
      spo2: Number(values[6]),
      systolic: Number(values[7]),
      diastolic: Number(values[8]),
      falls: Number(values[9]),
      living: String(values[10]),
      caregiver: String(values[11]),
      focus: String(values[12]),
      conditions: String(values[13]),
      medications: (values[14] as string) || "Amlodipine 5mg daily; Lisinopril 10mg daily",
      source: "MANUAL_INPUT",
      created_at: new Date().toISOString()
    };
    store.patients.unshift(newP);
    persistStoreToDisk();
    return { rows: [newP] as unknown as T[] };
  }

  // 3. UPDATE patients
  if (clean.startsWith("UPDATE patients")) {
    const id = values[values.length - 1];
    const p = store.patients.find(x => x.id === id);
    if (p) {
      if (values[0] !== undefined) p.name = String(values[0]);
      if (values[1] !== undefined) p.age = Number(values[1]);
      if (values[2] !== undefined) p.living = String(values[2]);
      if (values[3] !== undefined) p.caregiver = String(values[3]);
      if (values[4] !== undefined) p.focus = String(values[4]);
      if (values[5] !== undefined) p.spo2 = Number(values[5]);
      if (values[6] !== undefined) p.systolic = Number(values[6]);
      if (values[7] !== undefined) p.diastolic = Number(values[7]);
      if (values[8] !== undefined) p.adherence = Number(values[8]);
      if (values[9] !== undefined) p.falls = Number(values[9]);
      if (values[10] !== undefined) p.conditions = String(values[10]);
      if (values[11] !== undefined) p.medications = String(values[11]);
      if (values[12] !== undefined) {
        p.risk = Number(values[12]);
        p.riskLevel = p.risk >= 50 ? "High" : p.risk >= 30 ? "Moderate" : "Low";
      }
      persistStoreToDisk();
      return { rows: [p] as unknown as T[] };
    }
  }

  // 4. SELECT clinical_notes
  if (clean.includes("FROM clinical_notes")) {
    const pid = values[0];
    const notes = store.notes
      .filter(n => n.patient_id === pid)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(n => ({ id: n.id, author: n.author, note: n.note, createdAt: n.created_at }));
    return { rows: notes as unknown as T[] };
  }

  // 5. INSERT INTO clinical_notes
  if (clean.startsWith("INSERT INTO clinical_notes")) {
    const newNote: DbNote = {
      id: ++store.nextId,
      patient_id: String(values[0]),
      author: String(values[1] || "Dr. Morgan Lee"),
      note: String(values[2]),
      created_at: new Date().toISOString()
    };
    store.notes.unshift(newNote);
    persistStoreToDisk();
    return { rows: [newNote] as unknown as T[] };
  }

  // 6. SELECT followups
  if (clean.includes("FROM followups")) {
    const pid = values[0];
    const followups = store.followups
      .filter(f => f.patient_id === pid)
      .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())
      .map(f => ({ id: f.id, scheduledFor: f.scheduled_for, owner: f.owner, status: f.status }));
    return { rows: followups as unknown as T[] };
  }

  // 7. INSERT INTO followups
  if (clean.startsWith("INSERT INTO followups")) {
    const newF: DbFollowup = {
      id: ++store.nextId,
      patient_id: String(values[0]),
      scheduled_for: String(values[1]),
      owner: String(values[2] || "Dr. Morgan Lee"),
      status: "Scheduled",
      created_at: new Date().toISOString()
    };
    store.followups.push(newF);
    persistStoreToDisk();
    return { rows: [newF] as unknown as T[] };
  }

  // 8. SELECT care_plans
  if (clean.includes("FROM care_plans")) {
    const pid = values[0];
    const active = store.plans
      .filter(p => p.patient_id === pid && p.active)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .map(p => ({ id: p.id, plan: p.plan, author: p.author, updatedAt: p.updated_at }));
    return { rows: active as unknown as T[] };
  }

  // 9. UPDATE care_plans
  if (clean.startsWith("UPDATE care_plans")) {
    const pid = values[0];
    store.plans.filter(p => p.patient_id === pid).forEach(p => p.active = false);
    persistStoreToDisk();
    return { rows: [] };
  }

  // 10. INSERT INTO care_plans
  if (clean.startsWith("INSERT INTO care_plans")) {
    const newPlan: DbCarePlan = {
      id: ++store.nextId,
      patient_id: String(values[0]),
      plan: String(values[1]),
      author: String(values[2] || "Dr. Morgan Lee"),
      active: true,
      updated_at: new Date().toISOString()
    };
    store.plans.unshift(newPlan);
    persistStoreToDisk();
    return { rows: [newPlan] as unknown as T[] };
  }

  // 11. SELECT recommendations
  if (clean.includes("FROM recommendations")) {
    const pid = values[0];
    let recs = store.recommendations.filter(r => r.patient_id === pid);
    if (clean.includes("status='Approved'")) {
      recs = recs.filter(r => r.status === "Approved");
    }
    recs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { rows: recs.map(r => ({ id: r.id, title: r.title, detail: r.detail, status: r.status, createdAt: r.created_at, approvedAt: r.approved_at })) as unknown as T[] };
  }

  // 12. INSERT INTO recommendations
  if (clean.startsWith("INSERT INTO recommendations")) {
    const newRec: DbRecommendation = {
      id: ++store.nextId,
      patient_id: String(values[0]),
      title: String(values[1]),
      detail: String(values[2]),
      status: "Pending",
      created_at: new Date().toISOString()
    };
    store.recommendations.unshift(newRec);
    persistStoreToDisk();
    return { rows: [{ id: newRec.id }] as unknown as T[] };
  }

  // 13. UPDATE recommendations (Approve / Modify)
  if (clean.startsWith("UPDATE recommendations")) {
    const id = Number(values[0]);
    const pid = String(values[1]);
    const rec = store.recommendations.find(r => r.id === id && r.patient_id === pid);
    if (rec) {
      rec.status = "Approved";
      rec.approved_at = new Date().toISOString();
      if (values[2]) {
        rec.detail = String(values[2]);
      }
      persistStoreToDisk();
    }
    return { rows: [] };
  }

  // 14. SELECT demo_users
  if (clean.includes("FROM demo_users")) {
    const email = String(values[0] || "").toLowerCase();
    const pass = String(values[1] || "");
    const users = [
      { name: "Dr. Morgan Lee", email: "doctor@yorisoi.ai", password: "care2026", role: "doctor" },
      { name: "Asha Kapoor", email: "family@yorisoi.ai", password: "care2026", role: "family" },
      { name: "Meera Kapoor", email: "patient@yorisoi.ai", password: "care2026", role: "patient" }
    ];
    const match = users.filter(u => u.email.toLowerCase() === email && u.password === pass);
    return { rows: match as unknown as T[] };
  }

  return { rows: [] };
}
