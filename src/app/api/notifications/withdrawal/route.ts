import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWhatsAppProvider } from '@/lib/whatsapp/provider';

export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/withdrawal
 * Called when a volunteer leaves a scheduled role.
 * Notifies all admins via system notification + WhatsApp.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, eventId, eventTitle, eventDate, eventTime, roleName, reason } = await request.json();

    if (!userId || !eventId || !roleName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get the volunteer's name
    const { data: volunteer } = await supabase
      .from('users')
      .select('name, phone')
      .eq('id', userId)
      .single();

    if (!volunteer) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Save withdrawal log
    await supabase.from('withdrawal_log').insert({
      user_id: userId,
      event_id: eventId,
      role: roleName,
      reason: reason || null,
    });

    // Get all admins
    const { data: admins } = await supabase
      .from('users')
      .select('id, name, phone')
      .eq('is_admin', true);

    if (!admins || admins.length === 0) {
      return Response.json({ message: 'No admins found', notified: 0 });
    }

    const roleLabel = roleName === 'camera' ? 'Câmera' : 'Mesa de Transmissão';
    const reasonText = reason ? `\n📝 Motivo: "${reason}"` : '';
    const message = `⚠️ *Saída de Escala*\n\nO voluntário *${volunteer.name}* saiu da função *${roleLabel}* do evento:\n\n📌 *${eventTitle || 'Evento'}*\n📅 ${eventDate || ''} às ${eventTime || ''}${reasonText}\n\n🔴 A vaga está aberta.`;

    const whatsapp = getWhatsAppProvider();
    let notifiedCount = 0;

    for (const admin of admins) {
      // Save system notification
      await supabase.from('notification_log').insert({
        user_id: admin.id,
        event_id: eventId,
        message,
        status: 'withdrawal',
      });

      // Try WhatsApp
      try {
        await whatsapp.sendMessage({ phone: admin.phone, message });
        notifiedCount++;
      } catch (err) {
        console.error(`[Withdrawal] WhatsApp failed for ${admin.name}:`, err);
      }
    }

    return Response.json({
      message: 'Admins notified',
      notified: notifiedCount,
      total: admins.length,
    });
  } catch (err) {
    console.error('[Withdrawal API] Error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
