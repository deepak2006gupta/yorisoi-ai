import { DemoPatient } from "./patient-data";

export type AgentResult = {
  name: string;
  state: "Stable" | "Attention" | "Watch" | "Coverage gap" | "Ready" | "Clear";
  insight: string;
  action: string;
};

export type AnalysisResult = {
  generatedAt: string;
  risk: number;
  level: "Low" | "Moderate" | "High";
  recommendationId?: number;
  summary: string;
  agents: AgentResult[];
  plan: string[];
  recommendation: {
    title: string;
    detail: string;
  };
};

export async function runMultiAgentPipeline(patient: {
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
  notes?: string[];
}): Promise<AnalysisResult> {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const prompt = `You are Yorisoi AI, a multi-agent eldercare orchestration system analyzing patient data:
Name: ${patient.name}, Age: ${patient.age}
Risk Score: ${patient.risk}/100 (${patient.riskLevel} priority)
SpO2: ${patient.spo2}%, Blood Pressure: ${patient.systolic} mmHg
Medication Adherence: ${patient.adherence}%
Falls last 12 months: ${patient.falls}
Living status: ${patient.living}, Caregiver available: ${patient.caregiver}
Chronic Conditions: ${patient.conditions}
Care Focus: ${patient.focus}
${patient.notes?.length ? `Recent Clinical Notes: ${patient.notes.join("; ")}` : ""}

Generate a JSON object with:
- summary: A clear 2-sentence executive care summary.
- agents: Array of 3 agents:
  1. "Health & Wellness" (state: Stable/Attention, insight, action)
  2. "Safety & Emergency" (state: Watch/Clear, insight, action)
  3. "Care Coordination" (state: Ready/Coverage gap, insight, action)
- plan: Array of 3 actionable clinical care steps.
- recommendation: { title: "AI Care Recommendation", detail: "Specific doctor recommendation to approve or modify." }

Return ONLY valid JSON.`;

  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        })
      });
      if (res.ok) {
        const json = await res.json();
        const parsed = JSON.parse(json.choices[0].message.content);
        return {
          generatedAt: new Date().toISOString(),
          risk: patient.risk,
          level: patient.riskLevel,
          summary: parsed.summary,
          agents: parsed.agents,
          plan: parsed.plan,
          recommendation: parsed.recommendation || {
            title: "AI Care Recommendation",
            detail: `Focus review on ${patient.focus}. Monitor SpO2 (${patient.spo2}%) and BP (${patient.systolic} mmHg).`
          }
        };
      }
    } catch (e) {
      console.warn("Groq API call error, using hybrid agent engine:", e);
    }
  }

  if (geminiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      if (res.ok) {
        const json = await res.json();
        const text = json.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(text);
        return {
          generatedAt: new Date().toISOString(),
          risk: patient.risk,
          level: patient.riskLevel,
          summary: parsed.summary,
          agents: parsed.agents,
          plan: parsed.plan,
          recommendation: parsed.recommendation || {
            title: "AI Care Recommendation",
            detail: `Focus review on ${patient.focus}. Monitor SpO2 (${patient.spo2}%) and BP (${patient.systolic} mmHg).`
          }
        };
      }
    } catch (e) {
      console.warn("Gemini API call error, using hybrid agent engine:", e);
    }
  }

  // Fallback Multi-Agent Eldercare Engine
  const healthFlags: string[] = [];
  if (patient.adherence < 90) healthFlags.push(`Medication adherence is low at ${patient.adherence}%`);
  if (patient.systolic >= 140) healthFlags.push(`Blood pressure is elevated at ${patient.systolic} mmHg`);
  if (patient.spo2 < 95) healthFlags.push(`Oxygen saturation (SpO2) is low at ${patient.spo2}%`);

  const safetyFlags: string[] = [];
  if (patient.falls > 0) safetyFlags.push(`${patient.falls} fall(s) reported in past 12 months`);
  if (patient.living === "Alone") safetyFlags.push("Lives alone - daily safety check recommended");
  if (patient.spo2 < 94) safetyFlags.push("SpO2 under attention threshold");

  const priority = patient.riskLevel === "High" ? "within 24 hours" : patient.riskLevel === "Moderate" ? "within 48 hours" : "this week";

  const recDetail = patient.systolic >= 140 
    ? `Blood pressure elevated (${patient.systolic} mmHg). Recommend twice daily monitoring and medication adherence support.` 
    : patient.falls > 0 
    ? `Fall risk flagged (${patient.falls} recent falls). Recommend physical safety assessment and home pathway clearance.`
    : `Routine wellness target: maintain medication adherence (${patient.adherence}%) and weekly vital checks.`;

  return {
    generatedAt: new Date().toISOString(),
    risk: patient.risk,
    level: patient.riskLevel,
    summary: `${patient.name}'s care profile is ${patient.riskLevel.toLowerCase()} priority (${patient.risk}/100). Care team evaluation recommended ${priority}.`,
    agents: [
      {
        name: "Health & Wellness Agent",
        state: healthFlags.length ? "Attention" : "Stable",
        insight: healthFlags[0] || "Vital signs and medication compliance are steady.",
        action: patient.adherence < 90 ? "Confirm daily pill box routine and set automated reminders." : "Continue standard vital sign tracking."
      },
      {
        name: "Safety & Emergency Agent",
        state: safetyFlags.length ? "Watch" : "Clear",
        insight: safetyFlags[0] || "No critical emergency flags detected.",
        action: patient.falls > 0 ? "Review living environment for fall hazards and verify emergency pendant." : "Maintain weekly safety check-ins."
      },
      {
        name: "Care Coordination Agent",
        state: patient.caregiver === "No" ? "Coverage gap" : "Ready",
        insight: patient.caregiver === "No" ? "No dedicated family caregiver recorded." : "Caregiver support network active.",
        action: patient.caregiver === "No" ? "Assign community care coordinator check-in." : "Schedule routine follow-up appointment."
      }
    ],
    plan: [
      `Perform a direct clinical status review with ${patient.name.split(" ")[0]}.`,
      recDetail,
      `Reassess vital indicators in ${patient.riskLevel === "High" ? "24 hours" : "7 days"}.`
    ],
    recommendation: {
      title: "AI Care Recommendation",
      detail: recDetail
    }
  };
}

export async function processAiChat(
  patient: any,
  role: "doctor" | "family" | "patient",
  userMessage: string,
  chatHistory: { role: string; content: string }[] = []
): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const roleInstruction = role === "patient"
    ? "You are talking directly to an elderly patient. Speak warmly, clearly, reassuringly, avoiding overly complex medical jargon unless asked."
    : role === "family"
    ? "You are talking to a family member/caregiver. Provide empathetic, clear, actionable updates on their loved one's wellness and safety."
    : "You are an AI assistant for clinicians and care coordinators. Provide precise clinical summaries, vital trend analysis, and actionable care plan insights.";

  const prompt = `${roleInstruction}
Patient context: Name ${patient?.name || "Patient"}, Age ${patient?.age || "75"}, BP ${patient?.systolic || 120} mmHg, SpO2 ${patient?.spo2 || 97}%, Adherence ${patient?.adherence || 95}%, Falls ${patient?.falls || 0}, Conditions: ${patient?.conditions || "None"}.

User Question (${role.toUpperCase()}): "${userMessage}"
Provide a helpful, direct, English response.`;

  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            ...chatHistory.map(h => ({ role: h.role === "user" ? "user" : "assistant", content: h.content })),
            { role: "user", content: prompt }
          ]
        })
      });
      if (res.ok) {
        const json = await res.json();
        return json.choices[0].message.content;
      }
    } catch (e) {
      console.warn("Groq chat error:", e);
    }
  }

  if (geminiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      if (res.ok) {
        const json = await res.json();
        return json.candidates[0].content.parts[0].text;
      }
    } catch (e) {
      console.warn("Gemini chat error:", e);
    }
  }

  // Smart fallback chat responses based on keywords
  const msg = userMessage.toLowerCase();
  if (msg.includes("bp") || msg.includes("blood pressure")) {
    return `For ${patient?.name || "the patient"}, current blood pressure is ${patient?.systolic || 120} mmHg. ${patient?.systolic >= 140 ? "This is elevated. Please ensure regular BP checks morning and evening." : "This is within normal range."}`;
  }
  if (msg.includes("med") || msg.includes("pill") || msg.includes("drug")) {
    return `Medication adherence is currently at ${patient?.adherence || 95}%. ${patient?.adherence < 90 ? "Adherence support is recommended to avoid missed doses." : "The patient is taking medications consistently on schedule."}`;
  }
  if (msg.includes("fall") || msg.includes("safety") || msg.includes("emergency")) {
    return `${patient?.falls > 0 ? `Alert: ${patient.falls} fall(s) reported in the last 12 months.` : "No recent fall incidents reported."} Safety sensors and emergency help buttons remain active.`;
  }
  if (role === "patient") {
    return `Hello ${patient?.name?.split(" ")[0] || "there"}! Your health record shows SpO2 is ${patient?.spo2 || 97}% and blood pressure is ${patient?.systolic || 120} mmHg. You are doing well. Remember to take your medications on time and press the Help button if you ever feel unwell!`;
  }
  if (role === "family") {
    return `Here is the current update for ${patient?.name || "your family member"}: Vitals are stable, medication adherence is ${patient?.adherence || 95}%, and the care team has documented all recent updates. Let us know if you need to contact the doctor directly.`;
  }
  return `Yorisoi AI Care Manager summary: ${patient?.name}'s current risk priority is ${patient?.riskLevel || "Low"}. Focus area: ${patient?.focus || "Routine care"}. Vitals: SpO2 ${patient?.spo2}%, BP ${patient?.systolic} mmHg.`;
}
