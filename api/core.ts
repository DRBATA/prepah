/*  /api/core.ts
    Minimal Responses-API bridge for “The Water Bar”
    — no Express, no sessions, no tools —
*/
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// ──────────────────────────────────────────────────────────
// 1)  Instantiate clients
// ──────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ──────────────────────────────────────────────────────────
// 2)  Handler
// ──────────────────────────────────────────────────────────
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Vercel functions should be called with POST
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'POST only' });

  // ── Grab JWT sent by your React app (e.g. from supabase.auth.getSession())
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  // ── Validate token  &  get user.id
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser(token);

  if (authErr || !user)
    return res.status(401).json({ error: 'Invalid or expired token' });

  // ── Pull the minimal columns you care about
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, weight_kg')
    .eq('id', user.id)
    .single();

  // ────────────────────────────────────────────────────────
  // 3)  Create a one-shot OpenAI completion
  //     (No tools or fancy metadata yet)
  // ────────────────────────────────────────────────────────
  const systemPrompt = `
You are The Water Bar hydration assistant.

User name: ${profile?.first_name ?? 'Unknown'}
Weight-kg : ${profile?.weight_kg ?? 'Missing'}

• If weight_kg is missing → ask once for it (plain number, kg).
• Otherwise greet user by name and confirm their 24 h hydration session is running.
  `;

  const ai = await openai.chat.completions.create({
    model: 'gpt-4o-mini',            // cheap, fast
    messages: [
      { role: 'system', content: systemPrompt.trim() },
      {
        role: 'user',
        content: req.body.message ?? 'Hi'
      },
    ],
  });

  // ── Send it straight back to the front-end
  return res.status(200).json({
    reply: ai.choices[0].message.content,
    missing_weight: !profile?.weight_kg,
  });
}
