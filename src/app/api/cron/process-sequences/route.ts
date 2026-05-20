import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

export async function GET() {
  const supabase = await createClient()
  const now = new Date().toISOString()

  // Find active contact_sequences where next_send_at <= now
  const { data: dueAssignments } = await supabase
    .from('contact_sequences')
    .select('*')
    .eq('status', 'active')
    .lte('next_send_at', now)
    .limit(50) // process in batches

  if (!dueAssignments || dueAssignments.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  for (const assignment of dueAssignments) {
    // Get sequence step
    const { data: step } = await supabase
      .from('sequence_steps')
      .select('*')
      .eq('sequence_id', assignment.sequence_id)
      .eq('order', assignment.current_step_index)
      .single()

    if (!step) {
      // No more steps, mark completed
      await supabase.from('contact_sequences').update({ status: 'completed' }).eq('id', assignment.id)
      continue
    }

    if (step.type === 'email') {
      const { data: contact } = await supabase.from('contacts').select('*').eq('id', assignment.contact_id).single()
      if (contact && !contact.unsubscribed) {
        try {
          const html = step.body.replace(/\{\{first_name\}\}/g, contact.first_name || '').replace(/\{\{last_name\}\}/g, contact.last_name || '')
          const result = await sendEmail({
            to: contact.email,
            subject: step.subject,
            html,
          })
          await supabase.from('email_logs').insert({
            contact_id: contact.id,
            sequence_step_id: step.id,
            resend_message_id: result.id,
          })
        } catch (e) {
          console.error('Failed to send sequence email', e)
        }
      }
    }

    // Move to next step
    const nextStepIndex = assignment.current_step_index + 1
    // Check if there is a next step
    const { data: nextStep } = await supabase
      .from('sequence_steps')
      .select('*')
      .eq('sequence_id', assignment.sequence_id)
      .eq('order', nextStepIndex)
      .single()

    if (!nextStep) {
      await supabase.from('contact_sequences').update({ status: 'completed' }).eq('id', assignment.id)
    } else {
      // Calculate next send time
      let nextSendAt = new Date()
      if (nextStep.type === 'wait') {
        nextSendAt = new Date(Date.now() + nextStep.wait_hours * 60 * 60 * 1000)
      } // else email step will be sent immediately on next cron run

      await supabase.from('contact_sequences').update({
        current_step_index: nextStepIndex,
        next_send_at: nextSendAt.toISOString(),
      }).eq('id', assignment.id)
    }
  }

  return NextResponse.json({ processed: dueAssignments.length })
}