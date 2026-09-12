/**
 * Emergency Fraud & Recovery protocols (server-side data).
 *
 * Served through GET /api/emergency so the frontend never hardcodes official
 * contact details. Only official organisation homepages are referenced —
 * no phone numbers or reporting URLs are invented here.
 */

export interface EmergencyAction {
  title: string;
  detail: string;
}

export interface EmergencySection {
  id: string;
  title: string;
  icon: string;
  intro: string;
  actions: EmergencyAction[];
  caution?: string;
}

export interface OfficialContact {
  category: string;
  name: string;
  url: string;
  note: string;
}

export const emergencyProtocols = {
  title: "Emergency Fraud & Recovery Protocols",
  subtitle:
    "Immediate actions if you have already transferred funds or your passport is being held.",
  reassurance: {
    heading: "Please stay calm and do not panic.",
    body: "Fraudulent schemes rely on urgency and shame to stop students from asking for help. Many cases can still be reported, disputed or documented — and you are not the only student this has happened to. Preserve everything you have, write down the timeline, and take one step at a time.",
  },
  sections: [
    {
      id: "bank-recall",
      title: "Immediate Bank Recall",
      icon: "🏦",
      intro:
        "If you have already transferred money (IBFT, Raast, mobile wallet or a branch transfer), act within hours — not days.",
      actions: [
        {
          title: "Contact your bank immediately",
          detail:
            "Call the number printed on your card or in the official mobile app, and ask specifically for the bank's fraud / dispute / recall process.",
        },
        {
          title: "Ask about a transaction recall",
          detail:
            "Ask whether the transfer can be recalled or held, and what the bank needs from you to start that process. Request a complaint reference number.",
        },
        {
          title: "Preserve the transaction ID and date",
          detail: "Screenshot or save the transaction reference, amount, date, time and beneficiary details.",
        },
        {
          title: "Preserve recipient account details",
          detail:
            "Keep the account title, IBAN and bank name exactly as you sent it — even if the name does not match the person you were dealing with.",
        },
        {
          title: "Preserve the payment request and invoice",
          detail:
            "Keep the message that asked for the payment, plus any invoice, fee breakdown or 'seat confirmation' document you were sent.",
        },
        {
          title: "Preserve the full conversation",
          detail:
            "Export or screenshot the WhatsApp chat, voice notes, emails and calls log. Do not delete anything, even if you feel embarrassed.",
        },
      ],
      caution:
        "Whether funds can be recovered depends on your bank, the receiving bank and how quickly you act. Nobody can promise a refund — treat anyone who guarantees recovery as another warning signal.",
    },
    {
      id: "passport-held",
      title: "Passport Withheld by Consultant",
      icon: "🛂",
      intro:
        "If a consultant or any other party is refusing to return your passport, documents or originals, keep the interaction in writing.",
      actions: [
        {
          title: "Send a written demand for return",
          detail:
            "Message them in writing (WhatsApp or email) asking for the return of your passport and originals by a specific date, and keep a screenshot of that request.",
        },
        {
          title: "Keep every message and receipt",
          detail:
            "Save the chat, the payment receipts, the agreement or invoice they gave you, and any message where they refuse to return your documents.",
        },
        {
          title: "Avoid escalating in person alone",
          detail:
            "If you visit an office, take a family member with you and ask for any response in writing on company letterhead.",
        },
        {
          title: "Seek local assistance if needed",
          detail:
            "If documents are still not returned, you can seek help from your local police station and from the relevant government authority. File a written complaint and keep the receipt.",
        },
        {
          title: "Report the consultancy",
          detail:
            "Report the company to the relevant regulator or consumer-protection body so the record exists for other students too.",
        },
      ],
      caution:
        "This is general safety guidance, not legal advice. Rules and remedies differ by case — confirm with a qualified local lawyer or the relevant authority for your situation.",
    },
  ] satisfies EmergencySection[],
  contacts: [
    {
      category: "Cybercrime & online fraud",
      name: "Federal Investigation Agency (FIA), Pakistan",
      url: "https://www.fia.gov.pk",
      note: "Use the official FIA website to find the current cybercrime complaint route for your city.",
    },
    {
      category: "Banking complaints",
      name: "State Bank of Pakistan",
      url: "https://www.sbp.org.pk",
      note: "Consumer protection and banking-conduct complaint information.",
    },
    {
      category: "Banking disputes",
      name: "Banking Mohtasib Pakistan",
      url: "https://www.bankingmohtasib.gov.pk",
      note: "Independent resolution of banking complaints when the bank's own process has not resolved it.",
    },
    {
      category: "Company / consultancy complaints",
      name: "Securities and Exchange Commission of Pakistan (SECP)",
      url: "https://www.secp.gov.pk",
      note: "Check whether a company is registered and find the complaint route for registered entities.",
    },
    {
      category: "Telecom / online numbers",
      name: "Pakistan Telecommunication Authority (PTA)",
      url: "https://www.pta.gov.pk",
      note: "For reporting misuse of phone numbers, SMS and online content.",
    },
    {
      category: "Scholarship scheme verification",
      name: "Higher Education Commission (HEC), Pakistan",
      url: "https://www.hec.gov.pk",
      note: "Confirm whether a scholarship scheme advertised to you exists on HEC's published list.",
    },
    {
      category: "Local police",
      name: "Your local police station",
      url: "",
      note: "File a written complaint in person and keep the receipt / FIR copy. Reporting routes differ by city.",
    },
  ] satisfies OfficialContact[],
  disclaimer:
    "Links point to official organisation homepages. Reporting routes, forms and contact numbers change — always confirm the current process on the official website before you submit anything.",
  data_label: "General safety guidance for students — not legal advice.",
};
