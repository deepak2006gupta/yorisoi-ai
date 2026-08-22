import { NextRequest, NextResponse } from "next/server";
import { sql } from "../../../lib/db";

const patientColumns = `id, name, age, risk, risk_level AS "riskLevel", adherence::float AS adherence, spo2, systolic, diastolic, falls, living, caregiver, focus, conditions, medications, source`;

export async function GET(request: NextRequest) {
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit")) || 12, 1), 500);
  const search = request.nextUrl.searchParams.get("search")?.trim();
  const where = search ? "WHERE name ILIKE $1 OR id ILIKE $1" : "";
  const values = search ? [`%${search}%`, limit] : [limit];
  const limitParameter = search ? "$2" : "$1";
  
  const result = await sql(`SELECT ${patientColumns} FROM patients ${where} ORDER BY CASE risk_level WHEN 'High' THEN 1 WHEN 'Moderate' THEN 2 ELSE 3 END, risk DESC, name ASC LIMIT ${limitParameter}`, values);
  const total = await sql<{ count: string }>(`SELECT count(*)::text AS count FROM patients ${where}`, search ? [`%${search}%`] : []);
  
  return NextResponse.json({ total: Number(total.rows[0].count), patients: result.rows });
}

export async function POST(request: NextRequest) {
  const body = await request.json() as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const age = Number(body.age);
  if (!name || !Number.isInteger(age) || age < 1 || age > 120) {
    return NextResponse.json({ error: "Name and a valid age (1-120) are required." }, { status: 400 });
  }

  // Get max existing numeric User ID to assign sequential User ID (starting from 101, next e.g. 601)
  const existing = await sql<{ id: string }>("SELECT id FROM patients");
  let maxId = 100;
  for (const row of existing.rows) {
    const num = parseInt(row.id, 10);
    if (!isNaN(num) && num > maxId) {
      maxId = num;
    }
  }
  const id = String(maxId + 1);

  const risk = Math.min(100, Math.max(0, Number(body.risk) || 25));
  const riskLevel = risk >= 50 ? "High" : risk >= 30 ? "Moderate" : "Low";
  const spo2 = Number(body.spo2) || 97;
  const systolic = Number(body.systolic) || 120;
  const diastolic = Number(body.diastolic) || 80;
  const adherence = Number(body.adherence) || 100;
  const falls = Number(body.falls) || 0;
  const living = (body.living as string) || "With family";
  const caregiver = (body.caregiver as string) || "Yes";
  const focus = (body.focus as string) || "routine wellness";
  const conditions = (body.conditions as string) || "Hypertension";
  const medications = (body.medications as string) || "Amlodipine 5mg daily; Lisinopril 10mg daily";
  const initialNote = typeof body.initialNote === "string" ? body.initialNote.trim() : "";
  const initialCarePlan = typeof body.initialCarePlan === "string" ? body.initialCarePlan.trim() : "";

  const result = await sql(
    `INSERT INTO patients (id,name,age,risk,risk_level,adherence,spo2,systolic,diastolic,falls,living,caregiver,focus,conditions,medications,source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'MANUAL_INPUT') RETURNING ${patientColumns}`,
    [id, name, age, risk, riskLevel, adherence, spo2, systolic, diastolic, falls, living, caregiver, focus, conditions, medications]
  );

  const createdPatient = result.rows[0];

  // Save initial doctor clinical note if provided
  if (initialNote) {
    await sql("INSERT INTO clinical_notes (patient_id,author,note) VALUES ($1,'Dr. Morgan Lee',$2)", [id, initialNote]);
  } else {
    await sql("INSERT INTO clinical_notes (patient_id,author,note) VALUES ($1,'Dr. Morgan Lee',$2)", [id, `Initial clinical profile created for ${name} (User ID: ${id}). Vitals: SpO2 ${spo2}%, BP ${systolic}/${diastolic} mmHg.`]);
  }

  // Save initial care plan if provided
  if (initialCarePlan) {
    await sql("INSERT INTO care_plans (patient_id,plan,author) VALUES ($1,$2,'Dr. Morgan Lee')", [id, initialCarePlan]);
  } else {
    await sql("INSERT INTO care_plans (patient_id,plan,author) VALUES ($1,$2,'Dr. Morgan Lee')", [id, `Baseline care plan: Monitor vitals, ensure medication compliance, routine follow-up.`]);
  }

  return NextResponse.json({ patient: createdPatient }, { status: 201 });
}
