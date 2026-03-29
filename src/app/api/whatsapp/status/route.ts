import { type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const baseUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const apiKey = process.env.EVOLUTION_API_KEY || '';
const instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'escala-pascom';

export async function GET() {
  try {
    const res = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
      headers: { apikey: apiKey },
    });

    if (!res.ok) {
      if (res.status === 404) {
        return Response.json({ state: 'not_found' });
      }
      throw new Error(`Status ${res.status}`);
    }

    const data = await res.json();
    return Response.json({ state: data.instance?.state || 'unknown', data });
  } catch (error) {
    console.error('WhatsApp Status Error:', error);
    return Response.json({ state: 'error', error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'create_instance') {
      const res = await fetch(`${baseUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey,
        },
        body: JSON.stringify({
          instanceName: instanceName,
          token: apiKey || "escala-pascom-token",
          qrcode: true
        }),
      });
      const data = await res.json();
      return Response.json(data);
    }
    
    if (action === 'logout') {
      const res = await fetch(`${baseUrl}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: { apikey: apiKey },
      });
      const data = await res.json();
      return Response.json(data);
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('WhatsApp Action Error:', error);
    return Response.json({ error: 'Failed to execute action' }, { status: 500 });
  }
}
