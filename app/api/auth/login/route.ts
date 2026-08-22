import { NextRequest, NextResponse } from "next/server";
import { sql } from "../../../../lib/db";

export async function POST(request: NextRequest) {
  const { identifier, password, role } = await request.json() as {
    identifier?: string;
    email?: string;
    password?: string;
    role?: "doctor" | "family" | "patient" | "assistant";
  };

  const loginId = (identifier || "").trim();
  if (!loginId || !password) {
    return NextResponse.json({ error: "User ID / Email and password are required." }, { status: 400 });
  }

  // Doctor login
  if (role === "doctor" || loginId.toLowerCase().includes("doctor")) {
    if (password === "care2026" || password === "doctor2026") {
      return NextResponse.json({
        user: { name: "Dr. Morgan Lee", email: "doctor@yorisoi.ai", role: "doctor" }
      });
    } else {
      return NextResponse.json({ error: "Incorrect password for Doctor sign-in." }, { status: 401 });
    }
  }

  // Compounder / Assistant login
  if (role === "assistant" || loginId.toLowerCase().includes("assistant")) {
    if (password === "care2026" || password === "assistant2026") {
      return NextResponse.json({
        user: { name: "Kenji Sato (Compounder)", email: "assistant@yorisoi.ai", role: "assistant" }
      });
    } else {
      return NextResponse.json({ error: "Incorrect password for Compounder/Assistant sign-in." }, { status: 401 });
    }
  }

  // Check if loginId matches a Patient User ID directly (e.g. "101", "102")
  const patientRes = await sql<{ id: string; name: string }>(
    "SELECT id, name FROM patients WHERE id=$1 OR id ILIKE $2 OR name ILIKE $2 LIMIT 1",
    [loginId, `%${loginId}%`]
  );

  const foundPatient = patientRes.rows[0];

  if (foundPatient) {
    if (password !== "care2026" && password !== "patient2026" && password !== "family2026") {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }

    if (role === "family" || loginId.toLowerCase().includes("family")) {
      return NextResponse.json({
        user: {
          name: `${foundPatient.name}'s Family`,
          email: `family_${foundPatient.id}@yorisoi.ai`,
          role: "family",
          patientId: foundPatient.id
        }
      });
    }

    return NextResponse.json({
      user: {
        name: foundPatient.name,
        email: `patient_${foundPatient.id}@yorisoi.ai`,
        role: "patient",
        patientId: foundPatient.id
      }
    });
  }

  // Generic Family demo login fallback
  if (role === "family" || loginId.toLowerCase().includes("family")) {
    if (password === "care2026") {
      return NextResponse.json({
        user: { name: "Asha Kapoor", email: "family@yorisoi.ai", role: "family", patientId: "101" }
      });
    }
  }

  // Generic Patient demo login fallback
  if (role === "patient" || loginId.toLowerCase().includes("patient")) {
    if (password === "care2026") {
      return NextResponse.json({
        user: { name: "Ravi Sharma", email: "patient@yorisoi.ai", role: "patient", patientId: "101" }
      });
    }
  }

  return NextResponse.json({ error: "Invalid User ID or Password. (Default demo password is: care2026)" }, { status: 401 });
}
