import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWhatsAppProvider } from '@/lib/whatsapp/provider';
import { format, addDays } from 'date-fns';

export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications
 * Called by Vercel cron job daily at 21:00
 * Sends WhatsApp reminders for tomorrow's events
 */
export async function POST(request: NextRequest) {
  // Verify cron secret (for Vercel cron jobs)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    const whatsapp = getWhatsAppProvider();
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    // Fetch tomorrow's events with assignments
    const { data: events, error } = await supabase
      .from('events')
      .select(`
        id, title, date, time,
        event_roles (
          id, role,
          assignments (
            id,
            users (id, name, phone)
          )
        )
      `)
      .eq('date', tomorrow);

    if (error) throw error;
    if (!events || events.length === 0) {
      return Response.json({ message: 'No events tomorrow', sent: 0 });
    }

    let sentCount = 0;
    const errors: string[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const event of events as any[]) {
      for (const role of (event.event_roles || [])) {
        for (const assignment of (role.assignments || [])) {
          const user = assignment.users as { id: string; name: string; phone: string } | null;
          if (!user || !user.phone) continue;

          const roleLabel = role.role === 'camera' ? 'Câmera' : 'Mesa de Transmissão';
          const message = `🙏 Olá ${user.name}! Você está escalado(a) amanhã para servir na transmissão (${roleLabel}) às ${event.time}.\n\n📍 ${event.title}\n📅 ${event.date}\n\nDeus abençoe!`;

          const sent = await whatsapp.sendMessage({
            phone: user.phone,
            message,
          });

          if (sent) {
            sentCount++;
            await supabase.from('notification_log').insert({
              user_id: user.id,
              event_id: event.id,
              message,
              status: 'sent',
            });
          } else {
            errors.push(`Failed: ${user.name} (${user.phone})`);
            await supabase.from('notification_log').insert({
              user_id: user.id,
              event_id: event.id,
              message,
              status: 'failed',
            });
          }
        }
      }
    }

    return Response.json({
      message: `Notifications processed`,
      sent: sentCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('[Notifications] Error:', err);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications
 * Returns notification status (for admin dashboard)
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('notification_log')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return Response.json({ notifications: data });
  } catch {
    return Response.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
