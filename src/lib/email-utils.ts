async function generateUnsubscribeToken(email: string): Promise<string> {
  const secret = process.env.UNSUBSCRIBE_SECRET || 'defaultsecret'
  const encoder = new TextEncoder()
  const data = encoder.encode(email + secret)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function appendUnsubscribeLink(
  html: string,
  email: string,
  baseUrl: string
): Promise<string> {
  const token = await generateUnsubscribeToken(email)
  const link = `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`
  const footer = `<br/><br/><hr/><p style="font-size:12px;color:#666;">To unsubscribe, <a href="${link}">click here</a>.</p>`
  return html + footer
}