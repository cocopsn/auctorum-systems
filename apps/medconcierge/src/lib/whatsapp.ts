const WHATSAPP_API_URL = 'https://graph.facebook.com/v19.0'

export async function sendWhatsAppMessage(to: string, body: string): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!token || !phoneNumberId) {

    return false
  }

  const normalizedPhone = normalizePhone(to)

  try {
    const res = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizedPhone,
        type: 'text',
        text: { body },
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      console.error('WhatsApp API error:', error)
      return false
    }


    return true
  } catch (error) {
    console.error('WhatsApp send error:', error)
    return false
  }
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('52') && digits.length >= 12) return digits
  if (digits.length === 10) return `52${digits}`
  return digits
}
