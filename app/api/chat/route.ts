import { NextRequest, NextResponse } from "next/server";
import { sql } from "../../../lib/db";
import { processAiChat } from "../../../lib/ai-agent";

export async function POST(request: NextRequest) {
  try {
    const { patientId, role, message, history, patient: inlinePatient } = await request.json() as {
      patientId?: string;
      role?: "doctor" | "family" | "patient" | "assistant";
      message?: string;
      history?: { role: string; content: string }[];
      patient?: any;
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message content is required." }, { status: 400 });
    }

    let patient: any = inlinePatient || null;
    if (!patient && patientId) {
      const res = await sql("SELECT id, name, age, risk, risk_level AS \"riskLevel\", adherence, spo2, systolic, diastolic, falls, living, caregiver, focus, conditions, medications FROM patients WHERE id=$1", [patientId]);
      patient = res.rows[0] ?? null;
    }

    const chatResult = await processAiChat(patient, role || "patient", message, history || []);

    return NextResponse.json({
      reply: typeof chatResult === "string" ? chatResult : chatResult.reply,
      engine: typeof chatResult === "string" ? "Yorisoi AI Engine" : chatResult.engine,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("AI Chat error:", error);
    return NextResponse.json({ error: "Failed to process chat query." }, { status: 500 });
  }
}
