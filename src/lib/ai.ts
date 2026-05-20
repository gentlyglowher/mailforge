export async function checkSpam(subject: string, body: string) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages: [
        {
          role: 'user',
          content: `Analyze this marketing email for spam triggers and deliverability issues.
You must respond ONLY with a valid JSON object. No explanations, no markdown, no other text. The JSON object must have exactly these keys:
- "score": a number from 1 (safe) to 10 (high spam risk)
- "issues": an array of strings describing specific problems found (empty if none)
- "suggestions": an array of strings with actionable improvements

Example:
{"score":4,"issues":["Missing plain-text version"],"suggestions":["Add a plain-text version.","Use a less salesy tone."]}

Now analyze this email:
Subject: ${subject}
Body: ${body}`,
        },
      ],
    }),
  })

  const json = await response.json()
  const rawContent = json.choices?.[0]?.message?.content || ''

  // Try to extract JSON from the response (handles markdown fences or extra text)
  let parsed = null

  // First, try direct parse
  try {
    parsed = JSON.parse(rawContent)
  } catch {
    // Attempt to extract JSON from a code block
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || rawContent.match(/(\{[\s\S]*\})/)
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[1] || jsonMatch[0])
      } catch {
        // fail
      }
    }
  }

  if (parsed && typeof parsed.score === 'number' && Array.isArray(parsed.issues) && Array.isArray(parsed.suggestions)) {
    return parsed
  }

  // Fallback: return a structured object with the raw message so the user sees it
  return {
    score: 0,
    issues: ['The AI response could not be parsed correctly.'],
    suggestions: ['Please try again.'],
    raw: rawContent,
  }
}