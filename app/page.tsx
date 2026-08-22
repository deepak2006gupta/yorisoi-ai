"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ClipboardPlus,
  FileText,
  HeartPulse,
  Plus,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Users,
  AlertTriangle,
  Pencil,
  PhoneCall,
  Moon,
  ShieldCheck,
  Pill,
  UserCheck,
  Search,
  User,
  Save,
  Check,
  Clock,
  Briefcase
} from "lucide-react";
import AiChatBot from "./components/AiChatBot";

type Role = "doctor" | "family" | "patient" | "assistant";
type Session = { name: string; email: string; role: Role; patientId?: string };

type Patient = {
  id: string;
  name: string;
  age: number;
  risk: number;
  riskLevel: "Low" | "Moderate" | "High";
  adherence: number;
  spo2: number;
  systolic: number;
  diastolic?: number;
  falls: number;
  living: string;
  caregiver: string;
  focus: string;
  conditions: string;
  medications?: string;
  source?: string;
};

type Analysis = {
  summary: string;
  agents: { name: string; state: string; insight: string; action: string }[];
  plan: string[];
  recommendationId?: number;
};

type RecordData = {
  patient: Patient | null;
  notes: { id: number; author: string; note: string; createdAt: string }[];
  followups: { id: number; scheduledFor: string; owner: string; status: string }[];
  carePlan: { id: number; plan: string; author: string; updatedAt: string } | null;
  recommendations: { id: number; title: string; detail: string; status: string; createdAt: string; approvedAt?: string }[];
};

type FollowupItem = {
  id: number;
  patientId: string;
  patientName: string;
  scheduledFor: string;
  owner: string;
  status: string;
};

const color = (level: Patient["riskLevel"]) => level === "High" ? "red" : level === "Moderate" ? "amber" : "green";
const emptyRecord: RecordData = { patient: null, notes: [], followups: [], carePlan: null, recommendations: [] };

export default function Home() {
  const [role, setRole] = useState<Role>("doctor");
  const [session, setSession] = useState<Session | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [record, setRecord] = useState<RecordData>(emptyRecord);
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<"note" | "followup" | "care-plan" | "add-patient" | "update-vitals" | "modify-rec" | null>(null);
  const [selectedRecId, setSelectedRecId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [plain, setPlain] = useState(true);
  const [emergencyModal, setEmergencyModal] = useState(false);
  const [contactModal, setContactModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [draft, setDraft] = useState({
    text: "",
    date: "",
    name: "",
    age: "72",
    conditions: "Hypertension · Arthritis",
    medications: "Amlodipine 5mg daily; Lisinopril 10mg daily; Multivitamin",
    risk: "35",
    spo2: "96",
    systolic: "135",
    diastolic: "85",
    adherence: "92",
    falls: "0",
    living: "With family",
    caregiver: "Yes",
    focus: "blood pressure & vital routine",
    initialNote: "",
    initialCarePlan: ""
  });

  const highCount = useMemo(() => patients.filter(p => p.riskLevel === "High").length, [patients]);
  
  // Connect active patient to session for Patient & Family views
  const activePatient = useMemo(() => {
    if (session?.patientId) {
      const found = patients.find(p => p.id === session.patientId);
      if (found) return found;
    }
    return selected ?? patients[0] ?? null;
  }, [session?.patientId, selected, patients]);

  async function loadPatients() {
    const r = await fetch("/api/patients?limit=500");
    if (r.ok) {
      const data = await r.json();
      setPatients(data.patients);
      if (data.patients.length > 0 && !selected) {
        setSelected(data.patients[0]);
      }
    }
  }

  async function loadRecord(id: string, currentRole: Role) {
    const r = await fetch(`/api/patient-record?patientId=${encodeURIComponent(id)}&role=${currentRole}`);
    if (r.ok) {
      const data: RecordData = await r.json();
      setRecord(data);
      if (data.patient) {
        setSelected(prev => (prev?.id === data.patient!.id ? { ...prev, ...data.patient! } : prev));
      }
    }
  }

  useEffect(() => {
    loadPatients().catch(() => setMessage("Could not connect to care database."));
  }, []);

  useEffect(() => {
    if (activePatient) {
      loadRecord(activePatient.id, role).catch(() => undefined);
    }
  }, [activePatient?.id, role]);

  async function runAnalysis() {
    if (!activePatient) return;
    setBusy(true);
    setMessage("");
    const r = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: activePatient.id })
    });
    if (r.ok) {
      const data = await r.json();
      setAnalysis(data);
      await loadRecord(activePatient.id, role);
      setMessage("AI Multi-Agent Care Review complete. New recommendation generated for Doctor review.");
    } else {
      setMessage("The AI care review could not be completed.");
    }
    setBusy(false);
  }

  async function saveAction(e: React.FormEvent) {
    e.preventDefault();
    if (!activePatient && action !== "add-patient") return;
    setBusy(true);
    let r: Response;

    if (action === "add-patient") {
      r = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          age: Number(draft.age),
          conditions: draft.conditions,
          medications: draft.medications,
          risk: Number(draft.risk),
          spo2: Number(draft.spo2),
          systolic: Number(draft.systolic),
          diastolic: Number(draft.diastolic),
          adherence: Number(draft.adherence),
          falls: Number(draft.falls),
          living: draft.living,
          caregiver: draft.caregiver,
          focus: draft.focus,
          initialNote: draft.initialNote,
          initialCarePlan: draft.initialCarePlan
        })
      });
    } else if (action === "update-vitals") {
      r = await fetch("/api/patient-record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: activePatient!.id,
          action: "update-vitals",
          spo2: Number(draft.spo2),
          systolic: Number(draft.systolic),
          adherence: Number(draft.adherence),
          falls: Number(draft.falls),
          conditions: draft.conditions,
          medications: draft.medications,
          risk: Number(draft.risk)
        })
      });
    } else if (action === "modify-rec") {
      r = await fetch("/api/patient-record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: activePatient!.id,
          action: "modify-recommendation",
          date: String(selectedRecId),
          text: draft.text
        })
      });
    } else {
      r = await fetch("/api/patient-record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: activePatient!.id,
          action,
          text: draft.text,
          date: draft.date
        })
      });
    }

    if (r.ok) {
      const data = await r.json();
      if (action === "add-patient") {
        await loadPatients();
        setSelected(data.patient);
        setMessage(`New patient ${data.patient.name} created with User ID: ${data.patient.id}!`);
      } else {
        await loadPatients();
        await loadRecord(activePatient!.id, role);
        setMessage("Patient record updated. Changes live on Patient & Family dashboards.");
      }
      setAction(null);
      resetDraft();
    } else {
      setMessage("Please complete all required fields.");
    }
    setBusy(false);
  }

  function resetDraft() {
    setDraft({
      text: "",
      date: "",
      name: "",
      age: "72",
      conditions: "Hypertension · Arthritis",
      medications: "Amlodipine 5mg daily; Lisinopril 10mg daily",
      risk: "35",
      spo2: "96",
      systolic: "135",
      diastolic: "85",
      adherence: "92",
      falls: "0",
      living: "With family",
      caregiver: "Yes",
      focus: "blood pressure & vital routine",
      initialNote: "",
      initialCarePlan: ""
    });
  }

  async function approve(id: number) {
    if (!activePatient) return;
    await fetch("/api/patient-record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: activePatient.id, action: "approve", text: String(id) })
    });
    await loadRecord(activePatient.id, role);
    setMessage("Recommendation approved by Doctor. Now published to Patient & Family dashboards.");
  }

  function openModifyRecModal(rec: { id: number; detail: string }) {
    setSelectedRecId(rec.id);
    setDraft(prev => ({ ...prev, text: rec.detail }));
    setAction("modify-rec");
  }

  function openUpdateVitalsModal() {
    if (!activePatient) return;
    setDraft(prev => ({
      ...prev,
      spo2: String(activePatient.spo2),
      systolic: String(activePatient.systolic),
      adherence: String(activePatient.adherence),
      falls: String(activePatient.falls),
      conditions: activePatient.conditions,
      medications: activePatient.medications || "Amlodipine 5mg daily; Lisinopril 10mg daily",
      risk: String(activePatient.risk)
    }));
    setAction("update-vitals");
  }

  async function login(identifier: string, password: string, selectedRole: Role) {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password, role: selectedRole })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to sign in.");
    
    setSession(data.user);
    setRole(data.user.role);
    if (data.user.patientId) {
      const found = patients.find(p => p.id === data.user.patientId);
      if (found) setSelected(found);
    }
  }

  if (!session) return <LoginScreen login={login} mounted={mounted} />;

  return (
    <main suppressHydrationWarning>
      <header className="topbar" suppressHydrationWarning>
        <a className="brand" href="#">
          <span className="brand-mark"><HeartPulse size={19} /></span>
          <span>yorisoi<span>AI</span></span>
        </a>

        {/* Enforced Dashboard Individuality */}
        <div className="signed-in" style={{ marginLeft: "auto" }} suppressHydrationWarning>
          <span style={{ textTransform: "capitalize", background: "#e6f1ec", padding: "4px 10px", borderRadius: "12px", color: "#1c4949", fontWeight: 700 }}>
            {role === "assistant" ? "Compounder / Assistant" : role} Dashboard
          </span>
          <b>{session.name}</b>
          <button type="button" onClick={() => setSession(null)} suppressHydrationWarning>Sign out</button>
        </div>
      </header>

      {message && (
        <div className="toast" role="status" suppressHydrationWarning>
          {message}
          <button type="button" onClick={() => setMessage("")} suppressHydrationWarning>×</button>
        </div>
      )}

      {role === "doctor" && (
        <DoctorDashboard
          patients={patients}
          selected={activePatient}
          setSelected={(p) => {
            setSelected(p);
            setAnalysis(null);
          }}
          highCount={highCount}
          analysis={analysis}
          record={record}
          busy={busy}
          runAnalysis={runAnalysis}
          setAction={setAction}
          approve={approve}
          openModifyRecModal={openModifyRecModal}
          openUpdateVitalsModal={openUpdateVitalsModal}
          loadPatients={loadPatients}
          loadRecord={loadRecord}
          setMessage={setMessage}
        />
      )}

      {role === "assistant" && (
        <AssistantDashboard
          patients={patients}
          setMessage={setMessage}
          refreshPatients={loadPatients}
        />
      )}

      {role === "family" && (
        <FamilyDashboard
          patient={activePatient}
          analysis={analysis}
          record={record}
          runAnalysis={runAnalysis}
          busy={busy}
          openContactModal={() => setContactModal(true)}
        />
      )}

      {role === "patient" && (
        <PatientDashboard
          patient={activePatient}
          record={record}
          analysis={analysis}
          plain={plain}
          setPlain={setPlain}
          openEmergencyModal={() => setEmergencyModal(true)}
        />
      )}

      {action && (
        <ActionModal
          action={action}
          draft={draft}
          setDraft={setDraft}
          busy={busy}
          close={() => setAction(null)}
          save={saveAction}
        />
      )}

      {emergencyModal && (
        <EmergencyModal close={() => setEmergencyModal(false)} patient={activePatient} />
      )}

      {contactModal && (
        <ContactModal close={() => setContactModal(false)} patient={activePatient} />
      )}

      {/* Embedded AI Chat Bot Assistant */}
      <AiChatBot patient={activePatient} userRole={role} />

      <footer className="footer" suppressHydrationWarning>
        <a className="brand" href="#">
          <span className="brand-mark"><HeartPulse size={17} /></span>
          yorisoi<span>AI</span>
        </a>
        <p>Connecting care, AI that stays by your side.</p>
        <span>Active DB Persistence · Enforced Dashboard Individuality</span>
      </footer>
    </main>
  );
}

function LoginScreen({ login, mounted }: { login: (identifier: string, password: string, role: Role) => Promise<void>; mounted: boolean }) {
  const [selectedRole, setSelectedRole] = useState<Role>("patient");
  const [identifier, setIdentifier] = useState("101");
  const [password, setPassword] = useState("care2026");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (selectedRole === "doctor") setIdentifier("doctor@yorisoi.ai");
    else if (selectedRole === "assistant") setIdentifier("assistant@yorisoi.ai");
    else if (selectedRole === "patient") setIdentifier("101");
    else setIdentifier("101");
  }, [selectedRole]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(identifier, password, selectedRole);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-shell" suppressHydrationWarning>
      <section className="login-story" suppressHydrationWarning>
        <a className="brand" href="#">
          <span className="brand-mark"><HeartPulse size={19} /></span>
          <span>yorisoi<span>AI</span></span>
        </a>
        <div>
          <p className="eyebrow"><Sparkles size={14} /> CONNECTING CARE</p>
          <h1>Care that stays<br /><em>by your side.</em></h1>
          <p>Multi-agent eldercare platform with active DB persistence, role-secured dashboard individuality, and User ID authentication.</p>
        </div>
        <div className="login-signal">
          <span className="pulse" />
          <b>User ID Authentication Active</b>
          <small>Patients sign in using numeric User ID (e.g. 101)</small>
        </div>
      </section>

      <section className="login-panel" suppressHydrationWarning>
        <form onSubmit={submit} suppressHydrationWarning>
          <p className="eyebrow">SIGN IN TO YOUR PORTAL</p>
          <h2>Choose your portal</h2>

          {/* Role Portal Selection Tabs on Login */}
          <div className="role-switch" style={{ margin: "14px 0 22px 0", width: "100%", justifyContent: "space-around" }} suppressHydrationWarning>
            <button type="button" className={selectedRole === "patient" ? "active" : ""} onClick={() => setSelectedRole("patient")} suppressHydrationWarning>
              <HeartPulse size={14} /> Patient
            </button>
            <button type="button" className={selectedRole === "family" ? "active" : ""} onClick={() => setSelectedRole("family")} suppressHydrationWarning>
              <Users size={14} /> Family
            </button>
            <button type="button" className={selectedRole === "doctor" ? "active" : ""} onClick={() => setSelectedRole("doctor")} suppressHydrationWarning>
              <Stethoscope size={14} /> Doctor
            </button>
            <button type="button" className={selectedRole === "assistant" ? "active" : ""} onClick={() => setSelectedRole("assistant")} suppressHydrationWarning>
              <Briefcase size={14} /> Assistant
            </button>
          </div>

          <label suppressHydrationWarning>
            {selectedRole === "doctor" ? "Doctor Email" : selectedRole === "assistant" ? "Assistant Email" : selectedRole === "patient" ? "Patient User ID (e.g. 101, 102)" : "Patient User ID or Email"}
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder={selectedRole === "doctor" ? "doctor@yorisoi.ai" : selectedRole === "assistant" ? "assistant@yorisoi.ai" : "e.g. 101"}
              required
              suppressHydrationWarning
            />
          </label>
          <label suppressHydrationWarning>
            Password
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required suppressHydrationWarning />
          </label>

          {error && <p className="login-error">{error}</p>}
          <button className="primary login-submit" disabled={busy} type="submit" suppressHydrationWarning>
            {busy ? "Authenticating…" : `Sign in to ${selectedRole.toUpperCase()} Portal`}
          </button>
        </form>

        <div className="demo-accounts" suppressHydrationWarning>
          <p>DEMO ACCOUNTS · password: <b>care2026</b></p>
          <button type="button" onClick={() => { setSelectedRole("patient"); setIdentifier("101"); setPassword("care2026"); setError(""); }} suppressHydrationWarning>
            <span><HeartPulse size={16} /></span>
            <div>
              <b>Patient Sign-In (User ID: 101)</b>
              <small>Ravi Sharma · Reads personal record ONLY</small>
            </div>
            <span>Use →</span>
          </button>

          <button type="button" onClick={() => { setSelectedRole("family"); setIdentifier("101"); setPassword("care2026"); setError(""); }} suppressHydrationWarning>
            <span><Users size={16} /></span>
            <div>
              <b>Family Sign-In (User ID: 101)</b>
              <small>Ravi's Family · Monitoring View ONLY</small>
            </div>
            <span>Use →</span>
          </button>

          <button type="button" onClick={() => { setSelectedRole("doctor"); setIdentifier("doctor@yorisoi.ai"); setPassword("care2026"); setError(""); }} suppressHydrationWarning>
            <span><Stethoscope size={16} /></span>
            <div>
              <b>Doctor Sign-In</b>
              <small>doctor@yorisoi.ai · Full Clinical Control</small>
            </div>
            <span>Use →</span>
          </button>

          <button type="button" onClick={() => { setSelectedRole("assistant"); setIdentifier("assistant@yorisoi.ai"); setPassword("care2026"); setError(""); }} suppressHydrationWarning>
            <span><Briefcase size={16} /></span>
            <div>
              <b>Compounder / Assistant Sign-In</b>
              <small>assistant@yorisoi.ai · Manages Appointment Statuses</small>
            </div>
            <span>Use →</span>
          </button>
        </div>
      </section>
    </main>
  );
}

{/* COMPOUNDER / ASSISTANT DASHBOARD */}
function AssistantDashboard({
  patients,
  setMessage,
  refreshPatients
}: {
  patients: Patient[];
  setMessage: (msg: string) => void;
  refreshPatients: () => Promise<void>;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Derive followups across all patients
  const [followups, setFollowups] = useState<FollowupItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchFollowups() {
    setLoading(true);
    try {
      const res = await fetch("/api/patient-record?action=all-followups");
      if (res.ok) {
        const data = await res.json();
        setFollowups(data.followups || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFollowups();
  }, []);

  // Filtered followups list by patient name or user ID
  const filteredFollowups = useMemo(() => {
    if (!searchQuery.trim()) return followups;
    const q = searchQuery.trim().toLowerCase();
    return followups.filter(f =>
      f.patientName.toLowerCase().includes(q) ||
      f.patientId.toLowerCase().includes(q) ||
      f.status.toLowerCase().includes(q)
    );
  }, [followups, searchQuery]);

  async function handleUpdateStatus(followupId: number, patientId: string, patientName: string, newStatus: string, newDate: string) {
    setUpdatingId(followupId);
    try {
      const res = await fetch("/api/patient-record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-followup-status",
          followupId,
          patientId,
          status: newStatus,
          date: newDate
        })
      });

      if (res.ok) {
        await fetchFollowups();
        await refreshPatients();
        setMessage(`Appointment for ${patientName} (User ID: ${patientId}) updated to '${newStatus}'! Reflected on Doctor, Patient & Family dashboards.`);
      } else {
        setMessage("Could not update appointment status.");
      }
    } catch (e) {
      setMessage("Error updating appointment status.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <section className="role-page" suppressHydrationWarning>
      <div className="section-heading">
        <div>
          <p className="eyebrow"><Briefcase size={14} /> COMPOUNDER / ASSISTANT DASHBOARD</p>
          <h2>Appointment & Follow-up Status Management</h2>
        </div>
        <p>Manage, schedule, and update appointment statuses across the care network. Updates reflect on Doctor, Patient, and Family views instantly.</p>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e1e9e3", borderRadius: "16px", padding: "24px", marginTop: "16px" }} suppressHydrationWarning>
        {/* Search Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ position: "relative", width: "340px" }}>
            <Search size={15} style={{ position: "absolute", left: "12px", top: "11px", color: "#698180" }} />
            <input
              type="text"
              placeholder="Search by Patient Name or User ID (e.g. 101)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px 9px 36px",
                border: "1px solid #cce0d6",
                borderRadius: "8px",
                fontSize: "13px",
                outline: "none"
              }}
              suppressHydrationWarning
            />
          </div>
          <span style={{ fontSize: "13px", color: "#546e6d", background: "#f0f5f2", padding: "6px 14px", borderRadius: "12px" }}>
            Total Appointments: <b>{filteredFollowups.length}</b>
          </span>
        </div>

        {loading ? (
          <p style={{ padding: "20px", textAlign: "center", color: "#6c8482" }}>Loading appointment queue...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f4f8f5", textAlign: "left", color: "#25484a", borderBottom: "2px solid #e1e9e3" }}>
                  <th style={{ padding: "12px" }}>User ID</th>
                  <th style={{ padding: "12px" }}>Patient Name</th>
                  <th style={{ padding: "12px" }}>Scheduled Date</th>
                  <th style={{ padding: "12px" }}>Assigned Clinician</th>
                  <th style={{ padding: "12px" }}>Current Status</th>
                  <th style={{ padding: "12px", textAlign: "right" }}>Update Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredFollowups.map((f) => (
                  <tr key={f.id} style={{ borderBottom: "1px solid #edf2ee" }}>
                    <td style={{ padding: "12px", fontWeight: 700, color: "#1c4949" }}>
                      {f.patientId}
                    </td>
                    <td style={{ padding: "12px", fontWeight: 600 }}>
                      {f.patientName}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <input
                        type="date"
                        defaultValue={f.scheduledFor}
                        id={`date-${f.id}`}
                        style={{ border: "1px solid #d0ded6", borderRadius: "6px", padding: "4px 8px", fontSize: "12px" }}
                      />
                    </td>
                    <td style={{ padding: "12px", color: "#546e6d" }}>
                      {f.owner}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background:
                            f.status === "Completed" ? "#e4f5ed" :
                            f.status === "In Progress" ? "#e3effd" :
                            f.status === "Rescheduled" ? "#fff3e0" :
                            f.status === "Cancelled" ? "#fde8e8" : "#f0f5f2",
                          color:
                            f.status === "Completed" ? "#1e7e56" :
                            f.status === "In Progress" ? "#1a5fb4" :
                            f.status === "Rescheduled" ? "#e65100" :
                            f.status === "Cancelled" ? "#c5221f" : "#2f5c58"
                        }}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <select
                          defaultValue={f.status}
                          id={`status-${f.id}`}
                          style={{ border: "1px solid #cce0d6", borderRadius: "6px", padding: "4px 8px", fontSize: "12px" }}
                        >
                          <option value="Scheduled">Scheduled</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Rescheduled">Rescheduled</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>

                        <button
                          type="button"
                          className="primary compact"
                          disabled={updatingId === f.id}
                          onClick={() => {
                            const dateEl = document.getElementById(`date-${f.id}`) as HTMLInputElement;
                            const statusEl = document.getElementById(`status-${f.id}`) as HTMLSelectElement;
                            handleUpdateStatus(f.id, f.patientId, f.patientName, statusEl.value, dateEl.value);
                          }}
                          style={{ padding: "4px 12px", fontSize: "11px" }}
                          suppressHydrationWarning
                        >
                          {updatingId === f.id ? "Saving…" : "Update"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!filteredFollowups.length && (
                  <tr>
                    <td colSpan={6} style={{ padding: "24px", textAlign: "center", color: "#809291" }}>
                      No appointment matching "{searchQuery}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function DoctorDashboard({
  patients,
  selected,
  setSelected,
  highCount,
  analysis,
  record,
  busy,
  runAnalysis,
  setAction,
  approve,
  openModifyRecModal,
  openUpdateVitalsModal,
  loadPatients,
  loadRecord,
  setMessage
}: {
  patients: Patient[];
  selected: Patient | null;
  setSelected: (p: Patient) => void;
  highCount: number;
  analysis: Analysis | null;
  record: RecordData;
  busy: boolean;
  runAnalysis: () => void;
  setAction: (a: "note" | "followup" | "care-plan" | "add-patient" | "update-vitals") => void;
  approve: (id: number) => void;
  openModifyRecModal: (rec: { id: number; detail: string }) => void;
  openUpdateVitalsModal: () => void;
  loadPatients: () => Promise<void>;
  loadRecord: (id: string, role: Role) => Promise<void>;
  setMessage: (msg: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "editor">("overview");

  // Dedicated Update Patient Page Form State
  const [editForm, setEditForm] = useState({
    name: selected?.name || "",
    age: String(selected?.age || 72),
    living: selected?.living || "With family",
    caregiver: selected?.caregiver || "Yes",
    focus: selected?.focus || "routine wellness",
    spo2: String(selected?.spo2 || 97),
    systolic: String(selected?.systolic || 120),
    diastolic: String(selected?.diastolic || 80),
    adherence: String(selected?.adherence || 95),
    falls: String(selected?.falls || 0),
    conditions: selected?.conditions || "Hypertension",
    medications: selected?.medications || "Amlodipine 5mg daily; Lisinopril 10mg daily",
    risk: String(selected?.risk || 25),
    newNote: "",
    newCarePlan: ""
  });

  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (selected) {
      setEditForm({
        name: selected.name,
        age: String(selected.age),
        living: selected.living,
        caregiver: selected.caregiver,
        focus: selected.focus,
        spo2: String(selected.spo2),
        systolic: String(selected.systolic),
        diastolic: String(selected.diastolic || 80),
        adherence: String(selected.adherence),
        falls: String(selected.falls),
        conditions: selected.conditions,
        medications: selected.medications || "Amlodipine 5mg daily; Lisinopril 10mg daily",
        risk: String(selected.risk),
        newNote: "",
        newCarePlan: ""
      });
    }
  }, [selected?.id]);

  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const q = searchQuery.trim().toLowerCase();
    return patients.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  }, [patients, searchQuery]);

  async function handleSaveFullPatientEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSavingEdit(true);
    try {
      const res = await fetch("/api/patient-record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selected.id,
          action: "update-full-patient",
          name: editForm.name,
          age: Number(editForm.age),
          living: editForm.living,
          caregiver: editForm.caregiver,
          focus: editForm.focus,
          spo2: Number(editForm.spo2),
          systolic: Number(editForm.systolic),
          diastolic: Number(editForm.diastolic),
          adherence: Number(editForm.adherence),
          falls: Number(editForm.falls),
          conditions: editForm.conditions,
          medications: editForm.medications,
          risk: Number(editForm.risk)
        })
      });

      if (editForm.newNote.trim()) {
        await fetch("/api/patient-record", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patientId: selected.id, action: "note", text: editForm.newNote.trim() })
        });
      }

      if (editForm.newCarePlan.trim()) {
        await fetch("/api/patient-record", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patientId: selected.id, action: "care-plan", text: editForm.newCarePlan.trim() })
        });
      }

      if (res.ok) {
        await loadPatients();
        await loadRecord(selected.id, "doctor");
        setMessage(`Database updated! Patient ${selected.name} (User ID: ${selected.id}) details actively persisted.`);
        setActiveTab("overview");
      }
    } catch (err) {
      setMessage("Error updating patient details in database.");
    } finally {
      setSavingEdit(false);
    }
  }

  if (!selected) return <section className="loading">Connecting to the care database…</section>;

  return (
    <>
      <section className="hero compact-hero" suppressHydrationWarning>
        <div suppressHydrationWarning>
          <p className="eyebrow"><Sparkles size={14} /> CLINICAL DOCTOR WORKSPACE</p>
          <h1>Care decisions,<br /><em>made clearer.</em></h1>
          <p className="hero-copy">Manage patients by User ID or Name, enter vitals, run multi-agent AI care reviews, and publish doctor-approved care recommendations.</p>
          <div className="hero-actions" suppressHydrationWarning>
            <button className="primary" onClick={runAnalysis} disabled={busy} type="button" suppressHydrationWarning>
              <BrainCircuit size={18} />
              {busy ? "Running multi-agent pipeline…" : "Run AI Care Review"}
            </button>
            <button className="secondary" onClick={() => setAction("add-patient")} type="button" suppressHydrationWarning>
              <Plus size={17} /> Add / Create Patient
            </button>
          </div>
        </div>
        <div className="hero-orbit" suppressHydrationWarning>
          <div className="orbit-card" suppressHydrationWarning>
            <span className="pulse" />
            <small>ACTIVE DB STORE</small>
            <strong>{patients.length} active<br />patient User IDs</strong>
            <div className="mini-row"><span>User IDs Range</span><b>101 - 600+</b></div>
            <div className="mini-row"><span>Database Persistence</span><b>Active</b></div>
            <div className="mini-row"><span>Agent Pipeline</span><b>Online</b></div>
          </div>
        </div>
      </section>

      <section className="metrics" suppressHydrationWarning>
        <article>
          <span className="metric-icon coral"><ShieldAlert /></span>
          <div>
            <b>{highCount}</b>
            <p>High priority patients</p>
          </div>
          <span className="trend alert">Review today</span>
        </article>
        <article>
          <span className="metric-icon blue"><CalendarDays /></span>
          <div>
            <b>{record.followups.length}</b>
            <p>Scheduled follow-ups</p>
          </div>
          <span className="trend">Selected patient</span>
        </article>
        <article>
          <span className="metric-icon green"><ClipboardPlus /></span>
          <div>
            <b>{record.notes.length}</b>
            <p>Doctor clinical notes</p>
          </div>
          <span className="trend good">Connected</span>
        </article>
        <article>
          <span className="metric-icon violet"><Activity /></span>
          <div>
            <b>{selected.adherence}%</b>
            <p>Medication adherence</p>
          </div>
          <span className="trend good">Live vitals</span>
        </article>
      </section>

      {/* Doctor Dashboard Tab Switcher: Overview vs Dedicated Edit Patient Details Page */}
      <section className="workspace" style={{ paddingBottom: "30px" }} suppressHydrationWarning>
        <div style={{ display: "flex", gap: "10px", borderBottom: "2px solid #e2ebe5", paddingBottom: "12px", marginBottom: "24px" }} suppressHydrationWarning>
          <button
            type="button"
            className={activeTab === "overview" ? "primary" : "secondary"}
            onClick={() => setActiveTab("overview")}
            style={{ borderRadius: "20px", padding: "10px 18px" }}
            suppressHydrationWarning
          >
            <Activity size={16} /> Patient Queue & Overview
          </button>

          <button
            type="button"
            className={activeTab === "editor" ? "primary" : "secondary"}
            onClick={() => setActiveTab("editor")}
            style={{ borderRadius: "20px", padding: "10px 18px" }}
            suppressHydrationWarning
          >
            <Pencil size={16} /> Update Patient Details Page (User ID: {selected.id})
          </button>
        </div>

        {activeTab === "overview" ? (
          <>
            <div className="section-heading">
              <div>
                <p className="eyebrow">PATIENT SEARCH & CLINICAL MANAGEMENT</p>
                <h2>Search by Name or User ID</h2>
              </div>
              <p>Type any User ID (e.g. 101) or patient name to filter the clinical queue instantly.</p>
            </div>

            <div className="care-grid">
              <aside className="patient-list">
                {/* Search Bar Input */}
                <div style={{ padding: "10px", borderBottom: "1px solid #e6ebe7", background: "#f8faf9" }}>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <Search size={14} style={{ position: "absolute", left: "10px", color: "#698180" }} />
                    <input
                      type="text"
                      placeholder="Search Name or User ID (e.g. 101)..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 10px 8px 30px",
                        border: "1px solid #cce0d6",
                        borderRadius: "8px",
                        fontSize: "12px",
                        outline: "none",
                        background: "#fff"
                      }}
                      suppressHydrationWarning
                    />
                  </div>
                </div>

                <div className="list-title" style={{ paddingTop: "12px" }}>
                  <span>Patient Queue</span>
                  <span>{filteredPatients.length} / {patients.length}</span>
                </div>

                {filteredPatients.slice(0, 16).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelected(p)}
                    className={`patient-row ${selected.id === p.id ? "selected" : ""}`}
                    suppressHydrationWarning
                  >
                    <span className={`avatar ${color(p.riskLevel)}`}>
                      {p.name.split(" ").map((x) => x[0]).join("")}
                    </span>
                    <span>
                      <b>{p.name}</b>
                      <small>User ID: <b>{p.id}</b> · {p.age} yrs · {p.riskLevel}</small>
                    </span>
                    <i className={`risk-dot ${color(p.riskLevel)}`} />
                  </button>
                ))}

                {filteredPatients.length === 0 && (
                  <p style={{ padding: "16px", fontSize: "12px", color: "#809291", textAlign: "center" }}>
                    No patient matching "{searchQuery}".
                  </p>
                )}
              </aside>

              <div className="patient-detail">
                <div className="detail-head">
                  <div className="person">
                    <span className={`avatar large ${color(selected.riskLevel)}`}>
                      {selected.name.split(" ").map((x) => x[0]).join("")}
                    </span>
                    <div>
                      <h3>{selected.name} <span style={{ fontSize: "12px", background: "#e8f1ec", padding: "2px 8px", borderRadius: "10px", color: "#25484a" }}>User ID: {selected.id}</span></h3>
                      <p>{selected.age} years old · Living: {selected.living} · Conditions: {selected.conditions}</p>
                      <p style={{ fontSize: "11px", color: "#4f7572", marginTop: "3px" }}>
                        <b>Prescribed Medications:</b> {selected.medications || "Amlodipine 5mg daily; Lisinopril 10mg daily"}
                      </p>
                    </div>
                  </div>
                  <span className={`risk-badge ${color(selected.riskLevel)}`}>
                    Risk Score: {selected.risk}/100 · {selected.riskLevel} Priority
                  </span>
                </div>

                {/* Vitals Grid */}
                <div className="vitals">
                  <Vital label="OXYGEN SATURATION" value={`${selected.spo2}%`} status={selected.spo2 < 95 ? "Attention" : "Stable"} />
                  <Vital label="BLOOD PRESSURE" value={`${selected.systolic} mmHg`} status={selected.systolic >= 140 ? "Elevated" : "Stable"} />
                  <Vital label="MEDICATION ADHERENCE" value={`${selected.adherence}%`} status={selected.adherence < 90 ? "Needs support" : "On track"} />
                  <Vital label="FALL HISTORY (12M)" value={`${selected.falls} falls`} status={selected.falls > 0 ? "Watch" : "Clear"} />
                </div>

                <div className="doctor-actions">
                  <button type="button" onClick={() => setActiveTab("editor")} suppressHydrationWarning><Pencil size={15} /> Open Dedicated Update Page</button>
                  <button type="button" onClick={() => setAction("note")} suppressHydrationWarning><FileText size={15} /> Add Clinical Note</button>
                  <button type="button" onClick={() => setAction("followup")} suppressHydrationWarning><CalendarDays size={15} /> Schedule Follow-up</button>
                  <button type="button" onClick={() => setAction("care-plan")} suppressHydrationWarning><ClipboardPlus size={15} /> Update Care Plan</button>
                  <button className="primary compact" type="button" onClick={runAnalysis} disabled={busy} suppressHydrationWarning>
                    <BrainCircuit size={15} /> {busy ? "Analyzing…" : "Run AI Review"}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* DEDICATED UPDATE PATIENT DETAILS PAGE / SECTION */
          <div style={{ background: "#fff", border: "1px solid #e1e9e3", borderRadius: "16px", padding: "32px", maxWidth: "900px", margin: "0 auto" }} suppressHydrationWarning>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #edf2ee", paddingBottom: "16px", marginBottom: "24px" }}>
              <div>
                <p className="eyebrow" style={{ margin: 0 }}><Pencil size={14} /> DEDICATED PATIENT UPDATE PAGE</p>
                <h2 style={{ margin: "4px 0 0 0", color: "#1c4949", fontSize: "26px" }}>Editing Details for {selected.name} (User ID: {selected.id})</h2>
              </div>
              <span className={`risk-badge ${color(selected.riskLevel)}`}>{selected.riskLevel} Priority</span>
            </div>

            <form onSubmit={handleSaveFullPatientEdit} suppressHydrationWarning>
              <h3 style={{ fontSize: "14px", color: "#25484a", borderBottom: "1px solid #f0f4f1", paddingBottom: "6px" }}>1. Basic Patient Demographics</h3>
              <div className="form-row">
                <label suppressHydrationWarning>Full Name *
                  <input required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} suppressHydrationWarning />
                </label>
                <label suppressHydrationWarning>Age (Years) *
                  <input required type="number" min="1" max="120" value={editForm.age} onChange={e => setEditForm({ ...editForm, age: e.target.value })} suppressHydrationWarning />
                </label>
              </div>

              <div className="form-row">
                <label suppressHydrationWarning>Living Arrangement
                  <select value={editForm.living} onChange={e => setEditForm({ ...editForm, living: e.target.value })}>
                    <option value="With family">With family</option>
                    <option value="Alone">Alone</option>
                    <option value="Care facility">Care facility</option>
                  </select>
                </label>
                <label suppressHydrationWarning>Caregiver Available?
                  <select value={editForm.caregiver} onChange={e => setEditForm({ ...editForm, caregiver: e.target.value })}>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </label>
              </div>

              <h3 style={{ fontSize: "14px", color: "#25484a", borderBottom: "1px solid #f0f4f1", paddingBottom: "6px", marginTop: "24px" }}>2. Vitals & Medical Telemetry</h3>
              <div className="form-row">
                <label suppressHydrationWarning>Oxygen Saturation (SpO2 %)
                  <input required type="number" min="70" max="100" value={editForm.spo2} onChange={e => setEditForm({ ...editForm, spo2: e.target.value })} suppressHydrationWarning />
                </label>
                <label suppressHydrationWarning>Systolic Blood Pressure (mmHg)
                  <input required type="number" min="80" max="220" value={editForm.systolic} onChange={e => setEditForm({ ...editForm, systolic: e.target.value })} suppressHydrationWarning />
                </label>
              </div>

              <div className="form-row">
                <label suppressHydrationWarning>Diastolic Blood Pressure (mmHg)
                  <input required type="number" min="50" max="140" value={editForm.diastolic} onChange={e => setEditForm({ ...editForm, diastolic: e.target.value })} suppressHydrationWarning />
                </label>
                <label suppressHydrationWarning>Medication Compliance Adherence (%)
                  <input required type="number" min="0" max="100" value={editForm.adherence} onChange={e => setEditForm({ ...editForm, adherence: e.target.value })} suppressHydrationWarning />
                </label>
              </div>

              <div className="form-row">
                <label suppressHydrationWarning>Falls Count (Past 12 Months)
                  <input required type="number" min="0" max="20" value={editForm.falls} onChange={e => setEditForm({ ...editForm, falls: e.target.value })} suppressHydrationWarning />
                </label>
                <label suppressHydrationWarning>Priority Risk Score (0 - 100)
                  <input required type="number" min="0" max="100" value={editForm.risk} onChange={e => setEditForm({ ...editForm, risk: e.target.value })} suppressHydrationWarning />
                </label>
              </div>

              <h3 style={{ fontSize: "14px", color: "#25484a", borderBottom: "1px solid #f0f4f1", paddingBottom: "6px", marginTop: "24px" }}>3. Conditions, Focus & Prescribed Medicines</h3>
              <label suppressHydrationWarning>Chronic Conditions
                <input required value={editForm.conditions} onChange={e => setEditForm({ ...editForm, conditions: e.target.value })} suppressHydrationWarning />
              </label>
              <label suppressHydrationWarning>Recommended Care Focus
                <input required value={editForm.focus} onChange={e => setEditForm({ ...editForm, focus: e.target.value })} suppressHydrationWarning />
              </label>
              <label suppressHydrationWarning>Prescribed Medicines List
                <textarea required value={editForm.medications} onChange={e => setEditForm({ ...editForm, medications: e.target.value })} style={{ minHeight: "65px" }} suppressHydrationWarning />
              </label>

              <h3 style={{ fontSize: "14px", color: "#25484a", borderBottom: "1px solid #f0f4f1", paddingBottom: "6px", marginTop: "24px" }}>4. Optional Clinical Note & Care Plan Additions</h3>
              <div className="form-row">
                <label suppressHydrationWarning>Add Doctor Note (Optional)
                  <textarea value={editForm.newNote} onChange={e => setEditForm({ ...editForm, newNote: e.target.value })} placeholder="New doctor evaluation note…" style={{ minHeight: "65px" }} suppressHydrationWarning />
                </label>
                <label suppressHydrationWarning>Update Active Care Plan (Optional)
                  <textarea value={editForm.newCarePlan} onChange={e => setEditForm({ ...editForm, newCarePlan: e.target.value })} placeholder="New care plan instructions…" style={{ minHeight: "65px" }} suppressHydrationWarning />
                </label>
              </div>

              <div style={{ marginTop: "28px", display: "flex", gap: "14px" }}>
                <button className="primary" disabled={savingEdit} type="submit" style={{ padding: "14px 28px", fontSize: "14px" }} suppressHydrationWarning>
                  <Save size={18} /> {savingEdit ? "Updating Database…" : "Save All Patient Updates to Active Database"}
                </button>

                <button className="secondary" type="button" onClick={() => setActiveTab("overview")} style={{ padding: "14px 24px", fontSize: "14px" }} suppressHydrationWarning>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      {/* AI Multi-Agent Pipeline Section */}
      <section className="agent-section" suppressHydrationWarning>
        <div className="section-heading">
          <div>
            <p className="eyebrow">AI MULTI-AGENT PIPELINE INSIGHTS</p>
            <h2>Specialist Agents,<br /><em>one accountable clinical review.</em></h2>
          </div>
          <p>Four specialized AI agents analyze vital signs, fall risk, and care coordination to assist doctor decision making.</p>
        </div>

        <div className="agents">
          {(analysis?.agents || [
            { name: "Health & Wellness Agent", state: "Ready", insight: "Monitoring oxygen saturation, BP trend, and daily medication adherence.", action: "Run AI review for active assessment." },
            { name: "Safety & Emergency Agent", state: "Ready", insight: "Evaluating fall history, living arrangements, and emergency response.", action: "Run AI review for active assessment." },
            { name: "Care Coordination Agent", state: "Ready", insight: "Verifying caregiver availability and follow-up appointment ownership.", action: "Run AI review for active assessment." }
          ]).map((a, i) => (
            <article className="agent" key={a.name}>
              <span className={`agent-number n${i + 1}`}>
                {i === 0 ? <HeartPulse /> : i === 1 ? <ShieldAlert /> : <Users />}
              </span>
              <div>
                <small>AGENT 0{i + 1}</small>
                <h3>{a.name}</h3>
                <span className="agent-state"><i /> {a.state}</span>
              </div>
              <p>{a.insight}</p>
              <footer>{a.action}</footer>
            </article>
          ))}
        </div>
      </section>

      {/* Record Grid */}
      <section className="record-grid" suppressHydrationWarning>
        <article>
          <p className="eyebrow">DOCTOR CARE PLAN</p>
          <h3>{record.carePlan?.plan || "No active care plan authored yet."}</h3>
          <small>{record.carePlan ? `Authored by ${record.carePlan.author} · ${new Date(record.carePlan.updatedAt).toLocaleDateString()}` : "Click 'Update Care Plan' to author one."}</small>
        </article>

        <article>
          <p className="eyebrow">CARE RECOMMENDATIONS (DOCTOR APPROVAL)</p>
          {record.recommendations.slice(0, 4).map((r) => (
            <div className="recommendation" key={r.id}>
              <div>
                <b>{r.title}</b>
                <p>{r.detail}</p>
                <small className="muted">{new Date(r.createdAt).toLocaleString()}</small>
              </div>
              {r.status === "Pending" ? (
                <div className="recommendation-actions">
                  <button className="btn-approve" type="button" onClick={() => approve(r.id)} suppressHydrationWarning>Approve</button>
                  <button className="btn-modify" type="button" onClick={() => openModifyRecModal(r)} suppressHydrationWarning>Edit & Approve</button>
                </div>
              ) : (
                <span className="approved"><CheckCircle2 size={14} /> Published</span>
              )}
            </div>
          ))}
          {!record.recommendations.length && (
            <p className="muted">Click 'Run AI Review' to generate recommendations for doctor review.</p>
          )}
        </article>

        <article>
          <p className="eyebrow">DOCTOR CLINICAL NOTES</p>
          {record.notes.slice(0, 4).map((n) => (
            <div className="note" key={n.id}>
              <div>
                <b>{n.author}</b>
                <p>{n.note}</p>
                <small className="muted">{new Date(n.createdAt).toLocaleDateString()}</small>
              </div>
            </div>
          ))}
          {!record.notes.length && <p className="muted">No clinical notes recorded yet.</p>}
        </article>
      </section>
    </>
  );
}

function FamilyDashboard({
  patient,
  analysis,
  record,
  runAnalysis,
  busy,
  openContactModal
}: {
  patient: Patient | null;
  analysis: Analysis | null;
  record: RecordData;
  runAnalysis: () => void;
  busy: boolean;
  openContactModal: () => void;
}) {
  if (!patient) return <section className="loading">Loading family monitoring view…</section>;

  const safety = patient.falls > 0
    ? `A fall history of ${patient.falls} incident(s) is recorded. Keep walking paths clear and verify emergency pendant.`
    : "No recent fall incidents recorded. Living environment safety status clear.";

  return (
    <section className="role-page" suppressHydrationWarning>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p className="eyebrow"><Users size={14} /> FAMILY & CAREGIVER MONITORING PORTAL</p>
          <h1>Stay close to {patient.name.split(" ")[0]}.<br /><em>Monitor health & safety.</em></h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "12px", background: "#e4ede7", padding: "6px 12px", borderRadius: "12px", color: "#1c4949", fontWeight: 700 }}>
            User ID: {patient.id}
          </span>
          <button className="emergency-btn" type="button" onClick={openContactModal} suppressHydrationWarning>
            <PhoneCall size={15} /> Contact Care Team
          </button>
        </div>
      </div>

      <p className="role-intro">
        This portal provides dedicated monitoring for {patient.name}'s care. Medical updates entered by the doctor automatically synchronize here in real time.
      </p>

      <div className="family-grid">
        <article className="overview-card">
          <p className="eyebrow">PATIENT OVERVIEW</p>
          <h2>{patient.name} <small style={{ fontSize: "12px", color: "#708583" }}>(ID: {patient.id})</small></h2>
          <p>{patient.age} years old · Living arrangement: {patient.living}</p>
          <span className={`risk-badge ${color(patient.riskLevel)}`}>{patient.riskLevel} Priority Level</span>

          <div className="simple-vitals">
            <span>Overall Health Status <b>{patient.spo2 >= 95 && patient.adherence >= 90 ? "Stable" : "Needs Attention"}</b></span>
            <span>Caregiver Support <b>{patient.caregiver === "Yes" ? "Assigned & Active" : "Please check in"}</b></span>
            <span>Current Focus <b>{patient.focus}</b></span>
          </div>
        </article>

        <article className="overview-card ai-summary">
          <p className="eyebrow">AI MULTI-AGENT FAMILY SUMMARY</p>
          <h2>{analysis?.summary || `${patient.name}'s daily vital trends are synchronized with the care team. Medication adherence is ${patient.adherence}%.`}</h2>
          <button className="primary" type="button" onClick={runAnalysis} disabled={busy} suppressHydrationWarning>
            <BrainCircuit size={17} /> {busy ? "Updating…" : "Refresh AI Summary"}
          </button>
          <small>Generated by Yorisoi AI Multi-Agent Pipeline. For urgent concerns, contact the doctor directly.</small>
        </article>

        <article className="overview-card">
          <p className="eyebrow">SAFETY & INCIDENTS</p>
          <h2>{safety}</h2>
          <p><b>Chronic Conditions:</b> {patient.conditions}</p>
          <p>
            <b>Next Scheduled Follow-up:</b>{" "}
            {record.followups[0] ? `${record.followups[0].scheduledFor} (${record.followups[0].owner}) · Status: ${record.followups[0].status}` : "No follow-up currently scheduled."}
          </p>
        </article>
      </div>

      {/* Doctor-Approved Recommendations & Doctor Notes for Family */}
      <div style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "16px" }}>
        <article className="family-info" style={{ margin: 0, flexDirection: "column" }}>
          <p className="eyebrow"><ShieldCheck size={14} /> DOCTOR-APPROVED CARE RECOMMENDATIONS</p>
          {record.recommendations.map(r => (
            <div key={r.id} style={{ borderTop: "1px solid #edf0ee", paddingTop: "10px", marginTop: "8px" }}>
              <b style={{ color: "#25484a", fontSize: "13px" }}>{r.title}</b>
              <p style={{ fontSize: "12px", color: "#546e6d", margin: "4px 0" }}>{r.detail}</p>
              <small style={{ fontSize: "10px", color: "#489276" }}>Approved by Care Team · {new Date(r.approvedAt || r.createdAt).toLocaleDateString()}</small>
            </div>
          ))}
          {!record.recommendations.length && (
            <p className="muted">No doctor-approved recommendations published yet.</p>
          )}
        </article>

        <article className="family-info" style={{ margin: 0, flexDirection: "column" }}>
          <p className="eyebrow"><FileText size={14} /> DOCTOR CLINICAL NOTES</p>
          {record.notes.map(n => (
            <div key={n.id} style={{ borderTop: "1px solid #edf0ee", paddingTop: "10px", marginTop: "8px" }}>
              <b style={{ color: "#25484a", fontSize: "12px" }}>{n.author}</b>
              <p style={{ fontSize: "12px", color: "#546e6d", margin: "4px 0" }}>{n.note}</p>
              <small className="muted">{new Date(n.createdAt).toLocaleDateString()}</small>
            </div>
          ))}
          {!record.notes.length && <p className="muted">No doctor notes published yet.</p>}
        </article>
      </div>

      <div className="family-info" style={{ marginTop: "20px" }}>
        <h2>Live Health Vitals</h2>
        <Vital label="Oxygen Saturation (SpO2)" value={`${patient.spo2}%`} status={patient.spo2 < 95 ? "Attention" : "Stable"} />
        <Vital label="Medication Adherence" value={`${patient.adherence}%`} status={patient.adherence < 90 ? "Needs support" : "On track"} />
        <Vital label="Blood Pressure" value={`${patient.systolic} mmHg`} status={patient.systolic >= 140 ? "Elevated" : "Stable"} />
      </div>
    </section>
  );
}

function PatientDashboard({
  patient,
  record,
  analysis,
  plain,
  setPlain,
  openEmergencyModal
}: {
  patient: Patient | null;
  record: RecordData;
  analysis: Analysis | null;
  plain: boolean;
  setPlain: (v: boolean) => void;
  openEmergencyModal: () => void;
}) {
  if (!patient) return <section className="loading">Loading your health dashboard…</section>;

  const statusMsg = patient.spo2 >= 95 && patient.adherence >= 90
    ? "Your health numbers look steady today. Keep up your routine!"
    : "A few vital numbers need attention today. Please take your prescribed medications and rest well.";

  return (
    <section className="role-page patient-page" suppressHydrationWarning>
      <div className="patient-head">
        <div>
          <p className="eyebrow"><HeartPulse size={14} /> MY PERSONAL HEALTH PORTAL (USER ID: {patient.id})</p>
          <h1>Hello, {patient.name.split(" ")[0]}.<br /><em>Here is your health picture.</em></h1>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <span style={{ fontSize: "12px", background: "#e8f1ec", padding: "6px 12px", borderRadius: "12px", color: "#1c4949", fontWeight: 700 }}>
            User ID: {patient.id}
          </span>

          <button className={`language-toggle ${plain ? "active" : ""}`} type="button" onClick={() => setPlain(!plain)} suppressHydrationWarning>
            {plain ? "Easy Language ON" : "Medical Terms ON"}
          </button>

          <button className="emergency-btn" type="button" onClick={openEmergencyModal} suppressHydrationWarning>
            <AlertTriangle size={16} /> EMERGENCY SOS HELP
          </button>
        </div>
      </div>

      <div className="patient-status">
        <HeartPulse size={28} />
        <div>
          <small>DAILY HEALTH UPDATE</small>
          <h2>
            {plain
              ? statusMsg
              : `Clinical status: SpO2 ${patient.spo2}%, Blood Pressure ${patient.systolic} mmHg, Medication Adherence ${patient.adherence}%.`}
          </h2>
        </div>
      </div>

      {/* Main Grid */}
      <div className="family-grid">
        <article className="overview-card">
          <p className="eyebrow">MY HEALTH NUMBERS</p>
          <h2>{plain ? "Important Metrics" : "Vitals & Compliance"}</h2>
          <div className="simple-vitals">
            <span>Oxygen Saturation <b>{patient.spo2}%</b></span>
            <span>Blood Pressure <b>{patient.systolic} mmHg</b></span>
            <span>Medication Compliance <b>{patient.adherence}%</b></span>
            <span>Recent Falls <b>{patient.falls} incidents</b></span>
          </div>
        </article>

        <article className="overview-card">
          <p className="eyebrow"><Pill size={14} /> CURRENT MEDICATIONS</p>
          <h2>My Prescribed Medicines</h2>
          <p style={{ fontSize: "13px", color: "#365759", lineHeight: "1.6", marginTop: "10px" }}>
            {patient.medications || "Amlodipine 5mg daily (Morning); Lisinopril 10mg daily (Evening); Multivitamin"}
          </p>
          <div style={{ marginTop: "16px", padding: "10px", background: "#eef6f2", borderRadius: "8px", fontSize: "11px", color: "#3a705b" }}>
            <UserCheck size={14} style={{ display: "inline", marginRight: "5px" }} />
            Medication routine verified by Dr. Morgan Lee.
          </div>
        </article>

        <article className="overview-card ai-summary">
          <p className="eyebrow"><ShieldCheck size={14} /> DOCTOR-APPROVED CARE ADVICE</p>
          <h2>
            {record.recommendations[0]?.detail ||
              (plain
                ? "Your doctor recommends keeping a regular daily routine, taking medications on time, and staying hydrated."
                : "Doctor approved: Continue vital monitoring and adhere strictly to daily medication schedule.")}
          </h2>
          <small>Only care advice reviewed and approved by your doctor is shown here.</small>
        </article>
      </div>

      {/* Sleep & Activity + Doctor Notes + Follow-up Info */}
      <div style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
        <article className="overview-card">
          <p className="eyebrow"><Moon size={14} /> SLEEP & DAILY ACTIVITY</p>
          <h2>Rest & Daily Routine</h2>
          <p><b>Sleep Quality:</b> 7.5 hours (Restful sleep recorded)</p>
          <p><b>Daily Activity:</b> 2,400 steps · Gentle walking encouraged</p>
          <p><b>Safety Status:</b> Emergency sensor active</p>
        </article>

        <article className="overview-card">
          <p className="eyebrow"><FileText size={14} /> DOCTOR & CARE TEAM NOTES</p>
          <h2>Notes from Dr. Morgan Lee</h2>
          {record.notes.slice(0, 2).map((n) => (
            <div key={n.id} style={{ borderTop: "1px solid #edf0ee", paddingTop: "8px", marginTop: "6px" }}>
              <p style={{ margin: 0, fontSize: "12px", color: "#466263" }}>"{n.note}"</p>
              <small className="muted">{new Date(n.createdAt).toLocaleDateString()}</small>
            </div>
          ))}
          {!record.notes.length && <p className="muted">No doctor notes recorded yet.</p>}
        </article>

        <article className="overview-card">
          <p className="eyebrow"><CalendarDays size={14} /> NEXT APPOINTMENT</p>
          <h2>Follow-up Schedule</h2>
          {record.followups[0] ? (
            <div style={{ marginTop: "10px" }}>
              <strong style={{ fontSize: "18px", color: "#1d4949" }}>{record.followups[0].scheduledFor}</strong>
              <p style={{ margin: "4px 0", fontSize: "12px", color: "#617776" }}>With {record.followups[0].owner}</p>
              <span className="approved" style={{ marginTop: "6px" }}>Status: {record.followups[0].status}</span>
            </div>
          ) : (
            <p className="muted" style={{ marginTop: "10px" }}>No follow-up currently scheduled.</p>
          )}
        </article>
      </div>
    </section>
  );
}

function Vital({ label, value, status }: { label: string; value: string; status: string }) {
  return (
    <div className="vital">
      <small>{label}</small>
      <b>{value}</b>
      <span className={status === "Stable" || status === "On track" || status === "Clear" ? "" : "attention"}>
        {status}
      </span>
    </div>
  );
}

function ActionModal({
  action,
  draft,
  setDraft,
  busy,
  close,
  save
}: {
  action: "note" | "followup" | "care-plan" | "add-patient" | "update-vitals" | "modify-rec";
  draft: any;
  setDraft: (v: any) => void;
  busy: boolean;
  close: () => void;
  save: (e: React.FormEvent) => void;
}) {
  const titles = {
    "add-patient": "Add / Create New Patient Record",
    "update-vitals": "Update Clinical Vitals & Medical Information",
    "note": "Add Doctor Clinical Note",
    "followup": "Schedule Patient Follow-up",
    "care-plan": "Update Patient Care Plan",
    "modify-rec": "Edit & Approve AI Recommendation"
  };

  return (
    <div className="modal-backdrop" suppressHydrationWarning>
      <form className="modal" onSubmit={save} suppressHydrationWarning>
        <button className="close" type="button" onClick={close} suppressHydrationWarning>×</button>
        <p className="eyebrow">DOCTOR CLINICAL ACTION</p>
        <h2>{titles[action]}</h2>

        {action === "add-patient" && (
          <>
            <div className="form-row">
              <label suppressHydrationWarning>Patient Full Name *
                <input required value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Eleanor Vance" suppressHydrationWarning />
              </label>
              <label suppressHydrationWarning>Age (Years) *
                <input required type="number" min="1" max="120" value={draft.age} onChange={e => setDraft({ ...draft, age: e.target.value })} suppressHydrationWarning />
              </label>
            </div>

            <div className="form-row">
              <label suppressHydrationWarning>Living Arrangement
                <select value={draft.living} onChange={e => setDraft({ ...draft, living: e.target.value })}>
                  <option value="With family">With family</option>
                  <option value="Alone">Alone</option>
                  <option value="Care facility">Care facility</option>
                </select>
              </label>
              <label suppressHydrationWarning>Caregiver Available?
                <select value={draft.caregiver} onChange={e => setDraft({ ...draft, caregiver: e.target.value })}>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </label>
            </div>

            <p className="eyebrow" style={{ marginTop: "14px" }}>INITIAL MEDICAL & VITALS DATA</p>
            <div className="form-row">
              <label suppressHydrationWarning>Oxygen Saturation (SpO2 %)
                <input type="number" min="70" max="100" value={draft.spo2} onChange={e => setDraft({ ...draft, spo2: e.target.value })} suppressHydrationWarning />
              </label>
              <label suppressHydrationWarning>Systolic Blood Pressure (mmHg)
                <input type="number" min="80" max="220" value={draft.systolic} onChange={e => setDraft({ ...draft, systolic: e.target.value })} suppressHydrationWarning />
              </label>
            </div>

            <div className="form-row">
              <label suppressHydrationWarning>Medication Adherence (%)
                <input type="number" min="0" max="100" value={draft.adherence} onChange={e => setDraft({ ...draft, adherence: e.target.value })} suppressHydrationWarning />
              </label>
              <label suppressHydrationWarning>Falls in Last 12 Months
                <input type="number" min="0" max="20" value={draft.falls} onChange={e => setDraft({ ...draft, falls: e.target.value })} suppressHydrationWarning />
              </label>
            </div>

            <label suppressHydrationWarning>Chronic Conditions
              <input value={draft.conditions} onChange={e => setDraft({ ...draft, conditions: e.target.value })} placeholder="e.g. Hypertension · Diabetes" suppressHydrationWarning />
            </label>
            <label suppressHydrationWarning>Current Medications
              <input value={draft.medications} onChange={e => setDraft({ ...draft, medications: e.target.value })} placeholder="e.g. Amlodipine 5mg daily; Metformin 500mg" suppressHydrationWarning />
            </label>
            <label suppressHydrationWarning>Initial Clinical Note
              <textarea value={draft.initialNote} onChange={e => setDraft({ ...draft, initialNote: e.target.value })} placeholder="Initial doctor evaluation notes…" suppressHydrationWarning />
            </label>
            <label suppressHydrationWarning>Initial Care Plan
              <textarea value={draft.initialCarePlan} onChange={e => setDraft({ ...draft, initialCarePlan: e.target.value })} placeholder="e.g. BP elevated — monitor twice daily. Follow-up in 7 days." suppressHydrationWarning />
            </label>
          </>
        )}

        {action === "update-vitals" && (
          <>
            <div className="form-row">
              <label suppressHydrationWarning>Oxygen Saturation (SpO2 %)
                <input required type="number" min="70" max="100" value={draft.spo2} onChange={e => setDraft({ ...draft, spo2: e.target.value })} suppressHydrationWarning />
              </label>
              <label suppressHydrationWarning>Systolic Blood Pressure (mmHg)
                <input required type="number" min="80" max="220" value={draft.systolic} onChange={e => setDraft({ ...draft, systolic: e.target.value })} suppressHydrationWarning />
              </label>
            </div>

            <div className="form-row">
              <label suppressHydrationWarning>Medication Adherence (%)
                <input required type="number" min="0" max="100" value={draft.adherence} onChange={e => setDraft({ ...draft, adherence: e.target.value })} suppressHydrationWarning />
              </label>
              <label suppressHydrationWarning>Falls in Past 12 Months
                <input required type="number" min="0" max="20" value={draft.falls} onChange={e => setDraft({ ...draft, falls: e.target.value })} suppressHydrationWarning />
              </label>
            </div>

            <label suppressHydrationWarning>Chronic Conditions
              <input required value={draft.conditions} onChange={e => setDraft({ ...draft, conditions: e.target.value })} suppressHydrationWarning />
            </label>
            <label suppressHydrationWarning>Prescribed Medications List
              <textarea required value={draft.medications} onChange={e => setDraft({ ...draft, medications: e.target.value })} suppressHydrationWarning />
            </label>
          </>
        )}

        {action === "followup" && (
          <label suppressHydrationWarning>Follow-up Date
            <input required type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} suppressHydrationWarning />
          </label>
        )}

        {(action === "note" || action === "care-plan" || action === "modify-rec") && (
          <label suppressHydrationWarning>
            {action === "note" ? "Clinical Note Content" : action === "care-plan" ? "Updated Care Plan Instructions" : "Modified Recommendation Text"}
            <textarea required autoFocus value={draft.text} onChange={e => setDraft({ ...draft, text: e.target.value })} suppressHydrationWarning />
          </label>
        )}

        <button className="primary" disabled={busy} type="submit" suppressHydrationWarning>
          {busy ? "Saving to Database…" : "Save & Sync Dashboards"}
        </button>
      </form>
    </div>
  );
}

function EmergencyModal({ close, patient }: { close: () => void; patient: Patient | null }) {
  return (
    <div className="modal-backdrop" suppressHydrationWarning>
      <div className="modal" style={{ borderTop: "5px solid #d76851" }} suppressHydrationWarning>
        <button className="close" type="button" onClick={close} suppressHydrationWarning>×</button>
        <p className="eyebrow" style={{ color: "#d76851" }}><AlertTriangle size={16} /> EMERGENCY SOS SIGNAL</p>
        <h2>Emergency Help Triggered</h2>
        <p style={{ fontSize: "14px", color: "#546e6d", lineHeight: "1.6" }}>
          An emergency alert signal has been registered for <b>{patient?.name || "the patient"}</b> (User ID: {patient?.id}).
        </p>
        <div style={{ background: "#fff5f3", border: "1px solid #fcdad3", padding: "14px", borderRadius: "10px", margin: "16px 0", color: "#b8422e", fontSize: "12px" }}>
          <b>Immediate Actions Triggered:</b>
          <ul style={{ margin: "6px 0 0", paddingLeft: "20px" }}>
            <li>Care Coordinator & Duty Nurse Notified</li>
            <li>Family Emergency Contact Dispatched</li>
            <li>GPS Location & Vital Telemetry Transmitted</li>
          </ul>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="primary" style={{ background: "#d76851" }} type="button" onClick={close} suppressHydrationWarning>
            Confirm Alert Dispatched
          </button>
          <button className="secondary" type="button" onClick={close} suppressHydrationWarning>Cancel Signal</button>
        </div>
      </div>
    </div>
  );
}

function ContactModal({ close, patient }: { close: () => void; patient: Patient | null }) {
  return (
    <div className="modal-backdrop" suppressHydrationWarning>
      <div className="modal" suppressHydrationWarning>
        <button className="close" type="button" onClick={close} suppressHydrationWarning>×</button>
        <p className="eyebrow"><PhoneCall size={14} /> CARE TEAM CONTACT</p>
        <h2>Contact Dr. Morgan Lee & Care Team</h2>
        <p style={{ fontSize: "13px", color: "#546e6d" }}>
          Direct communication channel for <b>{patient?.name || "the patient"}</b> (User ID: {patient?.id}).
        </p>
        <div style={{ margin: "16px 0", display: "grid", gap: "10px" }}>
          <div style={{ padding: "12px", border: "1px solid #e1ebe5", borderRadius: "8px" }}>
            <b>Primary Clinician:</b> Dr. Morgan Lee
            <p style={{ margin: "3px 0", fontSize: "12px", color: "#617877" }}>Phone: +81 (03) 5555-0192 · Email: doctor@yorisoi.ai</p>
          </div>
          <div style={{ padding: "12px", border: "1px solid #e1ebe5", borderRadius: "8px" }}>
            <b>Care Coordinator:</b> Yorisoi Eldercare Operations
            <p style={{ margin: "3px 0", fontSize: "12px", color: "#617877" }}>24/7 Helpline: 1800-YORISOI (9674764)</p>
          </div>
        </div>
        <button className="primary" type="button" onClick={close} suppressHydrationWarning>Close</button>
      </div>
    </div>
  );
}
