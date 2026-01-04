// Supabase Edge Function to check and send due reminders
// This should be called by a cron job (e.g., Supabase scheduled function)
// Deploy with: supabase functions deploy check-reminders

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const today = new Date().toISOString().split('T')[0]

    // Get all incomplete reminders due today or overdue
    const { data: reminders, error } = await supabaseClient
      .from('reminders')
      .select('id')
      .eq('is_completed', false)
      .lte('due_date', today)
      .or('send_email.eq.true,send_sms.eq.true')

    if (error) {
      throw new Error(`Failed to fetch reminders: ${error.message}`)
    }

    const results = []

    // Call the send-reminder function for each reminder
    for (const reminder of reminders || []) {
      try {
        const res = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-reminder`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reminder_id: reminder.id }),
          }
        )
        results.push({ id: reminder.id, status: res.ok ? 'sent' : 'failed' })
      } catch (e) {
        results.push({ id: reminder.id, status: 'error', error: e.message })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: reminders?.length || 0,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
