import type { ChatAttachment } from "@/types";

/**
 * Demo-mode sample case (mock data).
 *
 * The message below is a scripted example of a typical pressure message
 * received by Pakistani students. When loaded, it is sent through the real
 * investigation engine so every verdict, warning signal and risk level is
 * actually computed — nothing is hard-coded in the UI.
 */
export const demoCase = {
  id: "demo-germany-ms-guaranteed",
  title: "Germany — MS (guaranteed admission + 100% scholarship claim)",
  language: "roman_urdu" as const,
  message:
    "Salam. Germany ki university mein MS admission guaranteed hai. Scholarship bhi 100% hai. Visa bhi guaranteed hai. Aaj hi 5 lakh PKR processing fee deni hogi warna seat chali jayegi. Offer letter attach kar diya hai.",
  attachments: [
    {
      id: "demo-attachment-1",
      kind: "screenshot" as const,
      label: "WhatsApp message — guaranteed admission",
      mime: "image/png",
      size_bytes: 184_320,
      analysis_status: "pending" as const,
      note: "Demo attachment. Paste the real message text so every claim can be checked.",
    },
  ],
  expected_focus: [
    "Guaranteed admission claim",
    "Guaranteed scholarship claim",
    "Guaranteed visa claim",
    "Urgent, large payment request",
    "University verification",
    "Scholarship verification",
    "Consultant verification",
    "Payment route verification",
  ],
};

export const demoFollowUps: string[] = [
  "Ye message EduWay Consultants ke Fatima Sheikh ne bheja hai, university ki taraf se official representative keh rahe hain.",
  "Payment personal JazzCash account mein maang rahe hain, invoice nahi diya.",
  "Scholarship ka naam DAAD bataya hai aur MS Computer Science ke liye TUM Munich ka zikr hai.",
];

export const demoAttachmentFromCase = (): ChatAttachment => ({
  id: demoCase.attachments[0].id,
  kind: demoCase.attachments[0].kind,
  label: demoCase.attachments[0].label,
  mime: demoCase.attachments[0].mime,
  size_bytes: demoCase.attachments[0].size_bytes,
  analysis_status: demoCase.attachments[0].analysis_status,
  note: demoCase.attachments[0].note,
});

/** Starter prompts shown as suggestion chips in the chat. */
export const starterPrompts: string[] = [
  "Can you check this university and scholarship?",
  "Is this consultant claiming to represent my university?",
  "Someone is asking me for 5 lakh PKR before applying.",
  "I received this scholarship offer. Does it look legitimate?",
  "Can you check this admission offer?",
  "Is this program actually offered by this university?",
];
