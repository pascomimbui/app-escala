/**
 * Evolution API WhatsApp Provider
 * Docs: https://doc.evolution-api.com
 * 
 * Uses the Evolution API v2 REST endpoints.
 * Make sure to:
 * 1. Have the Evolution API running via Docker
 * 2. Create an instance and connect your WhatsApp
 * 3. Set the env vars: EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_NAME
 */

interface SendTextOptions {
  phone: string;     // Brazilian phone: 5511999999999
  message: string;
}

interface EvolutionResponse {
  key?: { id: string };
  status?: string;
  message?: string;
}

export class EvolutionWhatsAppProvider {
  private baseUrl: string;
  private apiKey: string;
  private instanceName: string;

  constructor() {
    this.baseUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
    this.apiKey = process.env.EVOLUTION_API_KEY || '';
    this.instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'escala-pascom';
  }

  /**
   * Format phone number for WhatsApp (add country code if missing)
   */
  private formatPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    // Add Brazil country code if not present
    if (digits.length === 11) return `55${digits}`;
    if (digits.length === 13 && digits.startsWith('55')) return digits;
    return digits;
  }

  /**
   * Send a text message via Evolution API
   */
  async sendMessage({ phone, message }: SendTextOptions): Promise<boolean> {
    try {
      const formattedPhone = this.formatPhone(phone);
      
      const response = await fetch(
        `${this.baseUrl}/message/sendText/${this.instanceName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.apiKey,
          },
          body: JSON.stringify({
            number: formattedPhone,
            text: message,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Evolution API] Error: ${response.status} - ${errorText}`);
        return false;
      }

      const data: EvolutionResponse = await response.json();
      console.log(`[Evolution API] Message sent to ${formattedPhone}:`, data.key?.id);
      return true;
    } catch (error) {
      console.error('[Evolution API] Failed to send message:', error);
      return false;
    }
  }

  /**
   * Check instance connection status
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/instance/connectionState/${this.instanceName}`,
        {
          headers: { 'apikey': this.apiKey },
        }
      );

      if (!response.ok) return false;
      const data = await response.json();
      return data.instance?.state === 'open';
    } catch {
      return false;
    }
  }
}

/**
 * Mock provider for development/testing
 */
export class MockWhatsAppProvider {
  async sendMessage({ phone, message }: SendTextOptions): Promise<boolean> {
    console.log(`[Mock WhatsApp] Sending to ${phone}: ${message}`);
    return true;
  }

  async checkConnection(): Promise<boolean> {
    return true;
  }
}

/**
 * Factory: returns the right provider based on environment
 */
export function getWhatsAppProvider() {
  const provider = process.env.WHATSAPP_PROVIDER || 'mock';

  if (provider === 'evolution') {
    return new EvolutionWhatsAppProvider();
  }

  return new MockWhatsAppProvider();
}
