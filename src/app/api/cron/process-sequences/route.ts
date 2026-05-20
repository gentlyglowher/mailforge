import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

export async function GET() {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data: dueAssignments } = await supabase
    .from('contact_sequences')
    .select('*')
    .eq('status', 'active')
    .lte('next_send_at', now)
    .limit(50)

  if (!dueAssignments || dueAssignments.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  for (const assignment of dueAssignments) {
    const { data: step } = await supabase
      .from('sequence_steps')
      .select('*')
      .eq('sequence_id', assignment.sequence_id)
      .eq('order', assignment.current_step_index)
      .single()

    if (!step) {
      await supabase.from('contact_sequences').update({ status: 'completed' }).eq('id', assignment.id)
      continue
    }

    if (step.type === 'email') {
      const { data: contact } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', assignment.contact_id)
        .single()

      if (contact && !contact.unsubscribed) {
        try {
          let subject = step.subject
          let html = step.body
            .replace(/\{\{first_name\}\}/g, contact.first_name || '')
            .replace(/\{\{last_name\}\}/g, contact.last_name || '')

          // Remplacement des champs personnalisés
          if (contact.custom_fields) {
            for (const [key, value] of Object.entries(contact.custom_fields)) {
              const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
              subject = subject.replace(placeholder, value || '')
              html = html.replace(placeholder, value || '')
            }
          }

          const result = await sendEmail({
            to: contact.email,
            subject,
            html,
          })

          // Log dans email_logs
          await supabase.from('email_logs').insert({
            contact_id: contact.id,
            sequence_step_id: step.id,
            resend_message_id: result.id,
          })

          // Nouveau : événement "sent" pour les statistiques (lié à l'étape de séquence)
          await supabase.from('email_events').insert({
            contact_id: contact.id,
            sequence_step_id: step.id,
            event_type: 'sent',
            resend_message_id: result.id,
            occurred_at: new Date().toISOString(),
          })

        } catch (e) {
          console.error('Failed to send sequence email', e)
        }
      }
    }

    // Passer à l'étape suivante
    const nextStepIndex = assignment.current_step_index + 1
    const { data: nextStep } = await supabase
      .from('sequence_steps')
      .select('*')
      .eq('sequence_id', assignment.sequence_id)
      .eq('order', nextStepIndex)
      .single()

    if (!nextStep) {
      await supabase.from('contact_sequences').update({ status: 'completed' }).eq('id', assignment.id)
    } else {
      let nextSendAt = new Date()
      if (nextStep.type === 'wait') {
        nextSendAt = new Date(Date.now() + nextStep.wait_hours * 60 * 60 * 1000)
      }
      await supabase.from('contact_sequences').update({
        current_step_index: nextStepIndex,
        next_send_at: nextSendAt.toISOString(),
      }).eq('id', assignment.id)
    }
  }

  return NextResponse.json({ processed: dueAssignments.length })
}