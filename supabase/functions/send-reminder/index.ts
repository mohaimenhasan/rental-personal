// Supabase Edge Function for sending reminder notifications (Email + SMS via Twilio)
// Deploy with: supabase functions deploy send-reminder

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReminderPayload {
  reminder_id: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { reminder_id } = await req.json() as ReminderPayload

    // Fetch reminder with user profile
    const { data: reminder, error: reminderError } = await supabaseClient
      .from('reminders')
      .select('*, user:profiles(*)')
      .eq('id', reminder_id)
      .single()

    if (reminderError || !reminder) {
      throw new Error(`Reminder not found: ${reminderError?.message}`)
    }

    const results = {
      email: null as string | null,
      sms: null as string | null,
    }

    // Send Email via Resend (if enabled)
    if (reminder.send_email && reminder.user?.email) {
      const resendApiKey = Deno.env.get('RESEND_API_KEY')
      if (resendApiKey) {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'RentFlow <reminders@resend.dev>',
            to: reminder.user.email,
            subject: `Reminder: ${reminder.title}`,
            html: `
              <h2>Rental Reminder</h2>
              <p><strong>${reminder.title}</strong></p>
              ${reminder.description ? `<p>${reminder.description}</p>` : ''}
              <p>Due: ${new Date(reminder.due_date).toLocaleDateString('en-CA')}</p>
              <p>- RentFlow</p>
            `,
          }),
        })
        results.email = emailRes.ok ? 'sent' : 'failed'
      }
    }

    // Send SMS via Twilio (if enabled)
    if (reminder.send_sms && reminder.user?.phone) {
      const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID')
      const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN')
      const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER')

      if (twilioSid && twilioToken && twilioPhone) {
        const message = `RentFlow Reminder: ${reminder.title}${reminder.description ? ` - ${reminder.description}` : ''} (Due: ${new Date(reminder.due_date).toLocaleDateString('en-CA')})`

        const smsRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: reminder.user.phone,
              From: twilioPhone,
              Body: message,
            }),
          }
        )
        results.sms = smsRes.ok ? 'sent' : 'failed'
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
