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
          content: `Analyze this marketing email for spam triggers and deliverability issues. Give a spam score from 1 (safe) to 10 (spam) and a list of actionable suggestions to improve it.

Subject: ${subject}

Body: ${body}

Format the response as plain text.`,
        },
      ],
    }),
  })
  const json = await response.json()
  return json.choices?.[0]?.message?.content || 'No AI response'
}