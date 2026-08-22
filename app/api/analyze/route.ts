import { NextRequest, NextResponse } from "next/server";
import { sql } from "../../../lib/db";
import { runMultiAgentPipeline } from "../../../lib/ai-agent";

type PatientRow = {
  id: string;
  name: string;
  age: number;
  risk: number;
  risk_level: "Low" | "Moderate" | "High";
  adherence: number;
  spo2: number;
  systolic: number;
  diastolic?: number;
  falls: number;
  living: string;
  caregiver: string;
  focus: string;
  conditions: string;
};

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json() as { id?: string };
    if (!id) return NextResponse.json({ error: "A patient id is required." }, { status: 400 });
    
    const found = await sql<PatientRow>("SELECT id,name,age,risk,risk_level,adherence::float AS adherence,spo2,systolic,diastolic,falls,living,caregiver,focus,conditions FROM patients WHERE id=$1", [id]);
    const p = found.rows[0];
    if (!p) return NextResponse.json({ error: "Patient not found." }, { status: 404 });

    const notesRes = await sql<{ note: string }>("SELECT note FROM clinical_notes WHERE patient_id=$1 ORDER BY created_at DESC LIMIT 3", [id]);
    const notes = notesRes.rows.map(n => n.note);

    const analysis = await runMultiAgentPipeline({
      id: p.id,
      name: p.name,
      age: p.age || 72,
      risk: p.risk,
      riskLevel: p.risk_level,
      adherence: Number(p.adherence),
      spo2: p.spo2,
      systolic: p.systolic,
      diastolic: p.diastolic || 80,
      falls: p.falls,
      living: p.living,
      caregiver: p.caregiver,
      focus: p.focus,
      conditions: p.conditions,
      notes
    });

    const inserted = await sql<{ id: number }>("INSERT INTO recommendations (patient_id,title,detail) VALUES ($1,$2,$3) RETURNING id", [
      p.id,
      analysis.recommendation.title,
      analysis.recommendation.detail
    ]);

    return NextResponse.json({
      ...analysis,
      recommendationId: inserted.rows[0]?.id
    });
  } catch (error) {
    console.error("Analysis route error:", error);
    return NextResponse.json({ error: "Failed to run AI analysis." }, { status: 500 });
  }
}
