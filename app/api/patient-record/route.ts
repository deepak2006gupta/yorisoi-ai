import { NextRequest, NextResponse } from "next/server";
import { sql } from "../../../lib/db";

export async function GET(request: NextRequest) {
  const patientId = request.nextUrl.searchParams.get("patientId");
  const role = request.nextUrl.searchParams.get("role") || "doctor";
  const action = request.nextUrl.searchParams.get("action");

  if (action === "all-followups") {
    const followupsRes = await sql("SELECT f.id, f.patient_id AS \"patientId\", f.scheduled_for AS \"scheduledFor\", f.owner, f.status FROM followups f JOIN patients p ON f.patient_id=p.id");
    return NextResponse.json({ followups: followupsRes.rows });
  }

  if (!patientId) return NextResponse.json({ error: "patientId is required" }, { status: 400 });

  const isDoctor = role === "doctor" || role === "assistant";

  const [notes, followups, plans, recommendations, patientRes] = await Promise.all([
    sql("SELECT id,author,note,created_at AS \"createdAt\" FROM clinical_notes WHERE patient_id=$1 ORDER BY created_at DESC LIMIT 12", [patientId]),
    sql("SELECT id,scheduled_for AS \"scheduledFor\",owner,status FROM followups WHERE patient_id=$1 ORDER BY scheduled_for ASC LIMIT 8", [patientId]),
    sql("SELECT id,plan,author,updated_at AS \"updatedAt\" FROM care_plans WHERE patient_id=$1 AND active=true ORDER BY updated_at DESC LIMIT 1", [patientId]),
    sql(`SELECT id,title,detail,status,created_at AS "createdAt", approved_at AS "approvedAt" FROM recommendations WHERE patient_id=$1 ${isDoctor ? "" : "AND status='Approved'"} ORDER BY created_at DESC LIMIT 10`, [patientId]),
    sql(`SELECT id, name, age, risk, risk_level AS "riskLevel", adherence::float AS adherence, spo2, systolic, diastolic, falls, living, caregiver, focus, conditions, medications FROM patients WHERE id=$1`, [patientId])
  ]);

  return NextResponse.json({
    patient: patientRes.rows[0] ?? null,
    notes: notes.rows,
    followups: followups.rows,
    carePlan: plans.rows[0] ?? null,
    recommendations: recommendations.rows
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json() as Record<string, any>;
  const { patientId, action, text, date, status, followupId, spo2, systolic, diastolic, adherence, falls, conditions, medications, risk, name, age, living, caregiver, focus } = body;

  if (action === "update-followup-status") {
    const id = Number(followupId);
    if (!id || !status) return NextResponse.json({ error: "followupId and status are required" }, { status: 400 });
    await sql("UPDATE followups SET status=$1, scheduled_for=$2 WHERE id=$3", [status, date || "", id]);
    return NextResponse.json({ ok: true });
  }

  if (!patientId || !action) return NextResponse.json({ error: "patientId and action are required" }, { status: 400 });

  if (action === "note") {
    if (!text?.trim()) return NextResponse.json({ error: "A clinical note is required" }, { status: 400 });
    await sql("INSERT INTO clinical_notes (patient_id,author,note) VALUES ($1,'Dr. Morgan Lee',$2)", [patientId, text.trim()]);
  } else if (action === "followup") {
    if (!date) return NextResponse.json({ error: "A follow-up date is required" }, { status: 400 });
    await sql("INSERT INTO followups (patient_id,scheduled_for,owner) VALUES ($1,$2,'Dr. Morgan Lee')", [patientId, date]);
  } else if (action === "care-plan") {
    if (!text?.trim()) return NextResponse.json({ error: "A care plan is required" }, { status: 400 });
    await sql("UPDATE care_plans SET active=false WHERE patient_id=$1 AND active=true", [patientId]);
    await sql("INSERT INTO care_plans (patient_id,plan,author) VALUES ($1,$2,'Dr. Morgan Lee')", [patientId, text.trim()]);
  } else if (action === "approve") {
    const id = Number(text);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "A recommendation id is required" }, { status: 400 });
    await sql("UPDATE recommendations SET status='Approved',approved_at=now() WHERE id=$1 AND patient_id=$2", [id, patientId]);
  } else if (action === "modify-recommendation") {
    const id = Number(date);
    if (!Number.isInteger(id) || !text?.trim()) return NextResponse.json({ error: "Recommendation id and modified text required" }, { status: 400 });
    await sql("UPDATE recommendations SET status='Approved',detail=$3,approved_at=now() WHERE id=$1 AND patient_id=$2", [id, patientId, text.trim()]);
  } else if (action === "update-vitals" || action === "update-full-patient") {
    await sql(
      "UPDATE patients SET name=$1, age=$2, living=$3, caregiver=$4, focus=$5, spo2=$6, systolic=$7, diastolic=$8, adherence=$9, falls=$10, conditions=$11, medications=$12, risk=$13 WHERE id=$14",
      [
        name || "Patient",
        Number(age) || 72,
        living || "With family",
        caregiver || "Yes",
        focus || "routine wellness",
        Number(spo2) || 97,
        Number(systolic) || 120,
        Number(diastolic) || 80,
        Number(adherence) || 95,
        Number(falls) || 0,
        conditions || "Hypertension",
        medications || "Amlodipine 5mg daily; Lisinopril 10mg daily",
        Number(risk) || 25,
        patientId
      ]
    );
  } else return NextResponse.json({ error: "Unsupported action" }, { status: 400 });

  return NextResponse.json({ ok: true });
}
