import fs from "node:fs";
import path from "node:path";

export type DemoPatient = {
  id: string; name: string; age: number; risk: number; adherence: number; spo2: number;
  systolic: number; falls: number; living: string; caregiver: string; focus: string; conditions: string; riskLevel: "Low" | "Moderate" | "High";
};

let cache: DemoPatient[] | undefined;

function csvRows(csv: string) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const keys = header.split(",");
  return rows.map((row) => Object.fromEntries(keys.map((key, index) => [key, row.split(",")[index] ?? ""])));
}

export function getPatients(): DemoPatient[] {
  if (cache) return cache;
  const csv = fs.readFileSync(path.join(process.cwd(), "data", "Yorisoi_500_Patient_Demo_Dataset.csv"), "utf8");
  cache = csvRows(csv).map((row) => ({
    id: row.patient_id, name: row.demo_patient_name, age: Number(row.age_years), risk: Number(row.demo_risk_score_0_100),
    adherence: Number(row.medication_adherence_pct), spo2: Number(row.spo2_pct), systolic: Number(row.systolic_bp_mmhg),
    falls: Number(row.falls_last_12m), living: row.living_arrangement, caregiver: row.caregiver_available,
    focus: row.recommended_focus, conditions: row.chronic_conditions.split(";").join(" · "), riskLevel: row.demo_risk_level as DemoPatient["riskLevel"],
  }));
  return cache;
}
