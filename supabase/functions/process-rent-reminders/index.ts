import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Lease {
  id: string
  tenant_id: string
  base_rent: number
  gas_amount: number | null
  water_amount: number | null
  hydro_amount: number | null
  includes_gas: boolean
  includes_water: boolean
  includes_hydro: boolean
  tenant: {
    full_name: string
    phone: string | null
    email: string
  }
  unit: {
    name: string
    property: {
      name: string
    }
  }
}

interface RentReminder {
  id: string
  lease_id: string
  month: string
  total_amount: number
  status: string
  is_late: boolean
  lease: Lease
}

async function sendSMS(to: string, message: string) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const fromPhone = Deno.env.get('TWILIO_PHONE_NUMBER')

  if (!accountSid || !authToken || !fromPhone) {
    console.error('Twilio credentials not configured')
    return false
  }

  // Format phone number
  let formattedPhone = to.replace(/\D/g, '')
  if (formattedPhone.length === 10) {
    formattedPhone = '+1' + formattedPhone
  } else if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+' + formattedPhone
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formattedPhone,
          From: fromPhone,
          Body: message,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Twilio error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('SMS send error:', error)
    return false
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const today = new Date()
    const dayOfMonth = today.getDate()
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString().split('T')[0]

    const results = {
      remindersCreated: 0,
      tenantNotifications: 0,
      adminNotifications: 0,
      markedLate: 0,
      errors: [] as string[],
    }

    // On the 1st of the month, create rent reminders for all active leases
    if (dayOfMonth === 1) {
      const { data: activeLeases, error: leasesError } = await supabase
        .from('leases')
        .select(`
          id,
          tenant_id,
          base_rent,
          gas_amount,
          water_amount,
          hydro_amount,
          includes_gas,
          includes_water,
          includes_hydro
        `)
        .eq('is_active', true)

      if (leasesError) {
        results.errors.push(`Error fetching leases: ${leasesError.message}`)
      } else if (activeLeases) {
        for (const lease of activeLeases) {
          const totalAmount = lease.base_rent +
            (lease.includes_gas ? (lease.gas_amount || 0) : 0) +
            (lease.includes_water ? (lease.water_amount || 0) : 0) +
            (lease.includes_hydro ? (lease.hydro_amount || 0) : 0)

          const { error: insertError } = await supabase
            .from('rent_reminders')
            .upsert({
              lease_id: lease.id,
              month: currentMonth,
              base_rent: lease.base_rent,
              gas_amount: lease.includes_gas ? (lease.gas_amount || 0) : 0,
              water_amount: lease.includes_water ? (lease.water_amount || 0) : 0,
              hydro_amount: lease.includes_hydro ? (lease.hydro_amount || 0) : 0,
              total_amount: totalAmount,
              status: 'pending',
              is_late: false,
            }, { onConflict: 'lease_id,month' })

          if (insertError) {
            results.errors.push(`Error creating reminder for lease ${lease.id}: ${insertError.message}`)
          } else {
            results.remindersCreated++
          }
        }
      }
    }

    // Get all pending rent reminders for this month
    const { data: pendingReminders, error: remindersError } = await supabase
      .from('rent_reminders')
      .select(`
        id,
        lease_id,
        month,
        total_amount,
        status,
        is_late,
        tenant_notified_at,
        admin_notified_at,
        lease:leases (
          id,
          tenant_id,
          tenant:profiles!leases_tenant_id_fkey (
            full_name,
            phone,
            email
          ),
          unit:units (
            name,
            property:properties (
              name
            )
          )
        )
      `)
      .eq('month', currentMonth)
      .eq('status', 'pending')

    if (remindersError) {
      results.errors.push(`Error fetching pending reminders: ${remindersError.message}`)
    } else if (pendingReminders) {
      // Mark as late if after the 5th
      if (dayOfMonth > 5) {
        for (const reminder of pendingReminders) {
          if (!reminder.is_late) {
            await supabase
              .from('rent_reminders')
              .update({
                is_late: true,
                late_since: today.toISOString().split('T')[0],
                status: 'late'
              })
              .eq('id', reminder.id)
            results.markedLate++
          }
        }
      }

      // Send tenant notifications (daily for pending/late)
      for (const reminder of pendingReminders as RentReminder[]) {
        const lease = reminder.lease as unknown as Lease
        if (!lease?.tenant?.phone) continue

        const propertyName = lease.unit?.property?.name || 'your rental'
        const amount = reminder.total_amount.toFixed(2)

        let message: string
        if (dayOfMonth > 5) {
          message = `LATE RENT NOTICE: Your rent of $${amount} CAD for ${propertyName} is overdue. Please pay immediately to avoid further action. - RentFlow`
        } else {
          message = `Rent Reminder: Your rent of $${amount} CAD for ${propertyName} is due. Please pay by the 5th to avoid late fees. - RentFlow`
        }

        const sent = await sendSMS(lease.tenant.phone, message)
        if (sent) {
          await supabase
            .from('rent_reminders')
            .update({ tenant_notified_at: new Date().toISOString() })
            .eq('id', reminder.id)
          results.tenantNotifications++
        }
      }

      // Send admin/manager notifications (daily after the 5th for unpaid)
      if (dayOfMonth > 5 && pendingReminders.length > 0) {
        // Get all admins and managers
        const { data: adminsManagers } = await supabase
          .from('profiles')
          .select('full_name, phone, email')
          .in('role', ['admin', 'manager'])

        if (adminsManagers) {
          const unpaidCount = pendingReminders.length
          const totalUnpaid = pendingReminders.reduce((sum, r) => sum + r.total_amount, 0)

          for (const admin of adminsManagers) {
            if (!admin.phone) continue

            const message = `RentFlow Alert: ${unpaidCount} tenant(s) have unpaid rent totaling $${totalUnpaid.toFixed(2)} CAD. Please follow up. - RentFlow`
            const sent = await sendSMS(admin.phone, message)
            if (sent) results.adminNotifications++
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Rent reminders processed',
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing rent reminders:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
