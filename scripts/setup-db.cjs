/* Seeds the supplied synthetic dataset and creates operational dashboard tables. */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) { const [key, ...value] = line.split("="); if (key && value.length) process.env[key] = value.join("="); }
}
const client = new Client({ connectionString: process.env.DATABASE_URL });
const csv = fs.readFileSync(path.join(process.cwd(), "data", "Yorisoi_500_Patient_Demo_Dataset.csv"), "utf8").trim().split(/\r?\n/);
const headers = csv.shift().split(",");
const value = (row, name) => row[headers.indexOf(name)] ?? "";

async function main() {
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS patients (
      id varchar(20) PRIMARY KEY, name text NOT NULL, age integer NOT NULL, risk integer NOT NULL,
      risk_level varchar(12) NOT NULL, adherence numeric(5,1) NOT NULL, spo2 integer NOT NULL,
      systolic integer NOT NULL, diastolic integer NOT NULL, falls integer NOT NULL, living text NOT NULL,
      caregiver text NOT NULL, focus text NOT NULL, conditions text NOT NULL, source text NOT NULL DEFAULT 'CSV_SEED', created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS clinical_notes (id bigserial PRIMARY KEY, patient_id varchar(20) REFERENCES patients(id) ON DELETE CASCADE, author text NOT NULL, note text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS followups (id bigserial PRIMARY KEY, patient_id varchar(20) REFERENCES patients(id) ON DELETE CASCADE, scheduled_for date NOT NULL, owner text NOT NULL, status text NOT NULL DEFAULT 'Scheduled', created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS care_plans (id bigserial PRIMARY KEY, patient_id varchar(20) REFERENCES patients(id) ON DELETE CASCADE, plan text NOT NULL, author text NOT NULL, active boolean NOT NULL DEFAULT true, updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS recommendations (id bigserial PRIMARY KEY, patient_id varchar(20) REFERENCES patients(id) ON DELETE CASCADE, title text NOT NULL, detail text NOT NULL, status text NOT NULL DEFAULT 'Pending', created_at timestamptz NOT NULL DEFAULT now(), approved_at timestamptz);
    CREATE TABLE IF NOT EXISTS demo_users (id bigserial PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE, password text NOT NULL, role varchar(12) NOT NULL CHECK (role IN ('doctor','family','patient')));
  `);
  await client.query(`INSERT INTO demo_users (name,email,password,role) VALUES
    ('Dr. Morgan Lee','doctor@yorisoi.ai','care2026','doctor'),
    ('Asha Kapoor','family@yorisoi.ai','care2026','family'),
    ('Meera Kapoor','patient@yorisoi.ai','care2026','patient')
    ON CONFLICT (email) DO NOTHING`);
  let seeded = 0;
  for (const line of csv) {
    const row = line.split(",");
    await client.query(`INSERT INTO patients (id,name,age,risk,risk_level,adherence,spo2,systolic,diastolic,falls,living,caregiver,focus,conditions)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,age=EXCLUDED.age,risk=EXCLUDED.risk,risk_level=EXCLUDED.risk_level,adherence=EXCLUDED.adherence,spo2=EXCLUDED.spo2,systolic=EXCLUDED.systolic,diastolic=EXCLUDED.diastolic,falls=EXCLUDED.falls,living=EXCLUDED.living,caregiver=EXCLUDED.caregiver,focus=EXCLUDED.focus,conditions=EXCLUDED.conditions`, [
        value(row,"patient_id"), value(row,"demo_patient_name"), +value(row,"age_years"), +value(row,"demo_risk_score_0_100"), value(row,"demo_risk_level"), +value(row,"medication_adherence_pct"), +value(row,"spo2_pct"), +value(row,"systolic_bp_mmhg"), +value(row,"diastolic_bp_mmhg"), +value(row,"falls_last_12m"), value(row,"living_arrangement"), value(row,"caregiver_available"), value(row,"recommended_focus"), value(row,"chronic_conditions").split(";").join(" · ")
      ]); seeded++;
  }
  console.log(`Database ready: ${seeded} synthetic patient records seeded.`);
  await client.end();
}
main().catch((error) => { console.error(error); process.exit(1); });
