/**
 * Demo / test scenarios for the Attach Evidence modal.
 *
 * The two text samples are scripted examples used to demonstrate how the
 * assistant analyses evidence. They are clearly labelled as demo data and are
 * never presented as real reports.
 *
 * The official-portal sample does NOT hold a URL: the verified official URL is
 * fetched from the backend at runtime so nothing is invented here.
 */

export interface EvidenceTextSample {
  key: "whatsapp_offer" | "bank_payment_request";
  label: string;
  description: string;
  icon: string;
  title: string;
  text: string;
  demoNote: string;
}

export const evidenceTextSamples: EvidenceTextSample[] = [
  {
    key: "whatsapp_offer",
    label: "WhatsApp Offer Message",
    description: "A guaranteed admission + scholarship offer with a same-day payment demand.",
    icon: "📱",
    title: "WhatsApp offer from consultant",
    text: "Congratulations! Your Germany MS admission and 100% scholarship are guaranteed. Pay PKR 400,000 today to secure your seat and visa processing. This offer is only valid today. Please do not contact the university directly — we handle everything on your behalf.",
    demoNote: "Demo scenario for testing — not a real report.",
  },
  {
    key: "bank_payment_request",
    label: "Consultant Bank Payment Request",
    description: "A consultant asking for a transfer to a personal bank account.",
    icon: "💳",
    title: "Consultant bank payment request",
    text: "Salam. Please transfer PKR 400,000 today to my personal account for your university processing and scholarship confirmation. Account title is in my own name. This is the only way to confirm your seat before the deadline tonight.",
    demoNote: "Demo scenario for testing — not a real report.",
  },
];

export const officialPortalSample = {
  key: "official_portal" as const,
  label: "Official Chevening Scholarship Portal",
  description: "A legitimate official scholarship website, for comparison.",
  icon: "🎁",
  demoNote: "Demo scenario — the official URL is loaded from the backend verification data.",
};

export const ACCEPTED_FILE_TYPES = ".pdf,.jpg,.jpeg,.png";
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function isValidEvidenceUrl(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  return /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/[^\s]*)?$/i.test(trimmed);
}

export function isAcceptedFile(file: File): boolean {
  const byExtension = /\.(pdf|jpe?g|png)$/i.test(file.name);
  const byMime = ["application/pdf", "image/jpeg", "image/jpg", "image/png"].includes(file.type);
  return byExtension || byMime;
}
