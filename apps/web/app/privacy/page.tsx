import { redirect } from 'next/navigation'

export default function PrivacyPage() {
  // Canonical legal text lives on the medconcierge subdomain (first authored
  // there). Pointing at /med instead of a specific tenant's landing.
  redirect('https://med.auctorum.com.mx/privacy')
}
