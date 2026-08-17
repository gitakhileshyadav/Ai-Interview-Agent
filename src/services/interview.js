// interview.js — AI Interview Engine. LLM calls are proxied server-side
// via /api/chat, so no API keys ever reach the browser.
import { getToken } from './auth.js'

async function apiChat(messages, { temperature, max_tokens }) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { 'Authorization': `Bearer ${getToken()}` } : {})
    },
    body: JSON.stringify({ messages, temperature, max_tokens })
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `AI API error: ${res.status}`)
  return data.content
}

/**
 * Build the system prompt for the AI interviewer
 */
function buildSystemPrompt({ role, interviewType, experienceLevel }) {
  const typeGuide = {
    technical: 'Focus on coding, system design, algorithms, and technical problem-solving. Ask progressively harder questions.',
    behavioral: 'Use the STAR method (Situation, Task, Action, Result). Ask about past experiences, leadership, teamwork, and challenges.',
    hr: 'Focus on culture fit, motivation, career goals, salary expectations, and soft skills.'
  }

  return `You are Alex, a professional senior ${role} interviewer at a top tech company conducting a ${interviewType} interview.

CANDIDATE EXPERIENCE LEVEL: ${experienceLevel}

INTERVIEW STYLE:
- Be conversational, warm, and professional — like a real human interviewer
- Ask one focused question at a time. Never ask multiple questions at once.
- Listen carefully to answers and ask intelligent follow-up questions based on what the candidate said
- ${typeGuide[interviewType] || typeGuide.technical}
- Keep responses concise (2-4 sentences max) — you are speaking, not writing
- Show genuine interest: use phrases like "That's interesting!", "I see", "Great point"
- If an answer is vague, probe deeper with "Can you elaborate on..." or "Walk me through..."
- After 8-12 exchanges, naturally wrap up the interview

CRITICAL RULES:
- NEVER break character. You ARE the interviewer, not an AI assistant.
- Do NOT use bullet points, markdown, or formatting in responses (you are speaking)
- Do NOT evaluate or grade the candidate during the interview — save that for the end
- Start the interview with a friendly greeting and an easy warm-up question

Begin the interview now.`
}

/**
 * Get the AI interviewer's next response
 */
export async function getInterviewerResponse(messages, sessionConfig) {
  const systemPrompt = buildSystemPrompt(sessionConfig)
  return apiChat(
    [{ role: 'system', content: systemPrompt }, ...messages],
    { temperature: 0.8, max_tokens: 250 }
  )
}

/**
 * Generate a comprehensive interview analysis report
 */
export async function generateAnalysis(messages, sessionConfig) {
  const transcript = messages
    .filter(m => m.role !== 'system')
    .map(m => `${m.role === 'user' ? 'CANDIDATE' : 'INTERVIEWER'}: ${m.content}`)
    .join('\n')

  const prompt = `You are an expert interview coach and talent evaluator. Analyze this ${sessionConfig.interviewType} interview for a ${sessionConfig.role} position (${sessionConfig.experienceLevel} level).

INTERVIEW TRANSCRIPT:
${transcript}

Provide a detailed, honest, and constructive evaluation. Return your analysis as a VALID JSON object with EXACTLY this structure (no markdown, no extra text, just the JSON):

{
  "overall_score": <integer 0-100>,
  "communication_score": <integer 0-100>,
  "technical_score": <integer 0-100>,
  "confidence_score": <integer 0-100>,
  "problem_solving_score": <integer 0-100>,
  "summary": "<2-3 sentence overall performance summary>",
  "strengths": [
    "<specific strength 1 with example from transcript>",
    "<specific strength 2>",
    "<specific strength 3>"
  ],
  "weaknesses": [
    "<specific weakness 1 with improvement suggestion>",
    "<specific weakness 2>",
    "<specific weakness 3>"
  ],
  "recommendations": [
    "<actionable recommendation 1>",
    "<actionable recommendation 2>",
    "<actionable recommendation 3>",
    "<actionable recommendation 4>"
  ],
  "key_moments": [
    {"moment": "<what was said>", "impact": "positive|negative", "note": "<why it matters>"}
  ]
}`

  const content = await apiChat(
    [{ role: 'user', content: prompt }],
    { temperature: 0.3, max_tokens: 1500 }
  )

  // Extract JSON even if wrapped in markdown code blocks
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Could not parse analysis response')

  return JSON.parse(jsonMatch[0])
}

// Interview session configuration options
export const INTERVIEW_ROLES = [
  'Software Engineer', 'Frontend Developer', 'Backend Developer',
  'Full Stack Developer', 'Data Scientist', 'Machine Learning Engineer',
  'DevOps Engineer', 'Product Manager', 'UX Designer',
  'Data Analyst', 'Cloud Architect', 'Mobile Developer'
]

export const INTERVIEW_TYPES = [
  { value: 'technical', label: '⚙️ Technical', desc: 'Coding, system design, algorithms' },
  { value: 'behavioral', label: '🤝 Behavioral', desc: 'STAR method, past experiences' },
  { value: 'hr', label: '👥 HR Round', desc: 'Culture fit, motivation, goals' }
]

export const EXPERIENCE_LEVELS = [
  { value: 'junior', label: 'Junior (0-2 years)' },
  { value: 'mid', label: 'Mid-level (2-5 years)' },
  { value: 'senior', label: 'Senior (5+ years)' },
  { value: 'lead', label: 'Lead / Principal (8+ years)' }
]