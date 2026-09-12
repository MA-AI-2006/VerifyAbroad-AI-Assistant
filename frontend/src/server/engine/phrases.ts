import type { DegreeLevel, FundingType, Language } from "@/types";

type Entry = Record<Language, string>;

const P: Record<string, Entry> = {
  ack: {
    english: "Got it — here is what I was able to check with the verification data available to me.",
    urdu: "شکریہ — میں نے موجودہ تصدیقی ڈیٹا سے جو چیک کر سکتا تھا، وہ نیچے دے رہا ہوں۔",
    roman_urdu: "Samajh gaya — maine jo mere paas maujood verification data se check kar saka, wo niche de raha hoon.",
  },
  checked: {
    english: "What I checked",
    urdu: "میں نے کیا چیک کیا",
    roman_urdu: "Maine kya check kiya",
  },
  verified: {
    english: "Verified",
    urdu: "تصدیق شدہ",
    roman_urdu: "Verified",
  },
  needs_verification: {
    english: "Needs further verification",
    urdu: "مزید تصدیق درکار ہے",
    roman_urdu: "Aur verification chahiye",
  },
  not_found: {
    english: "Not found in our verification data",
    urdu: "ہمارے تصدیقی ڈیٹا میں نہیں ملا",
    roman_urdu: "Hamare verification data mein nahi mila",
  },
  conflicts: {
    english: "Conflicts with the information we have",
    urdu: "ہمارے پاس موجود معلومات سے مطابقت نہیں رکھتا",
    roman_urdu: "Hamare paas jo maloomat hain us se match nahi karta",
  },
  risk_heading: {
    english: "Overall risk",
    urdu: "مجموعی خطرہ",
    roman_urdu: "Overall risk",
  },
  why_flagged: {
    english: "Why this was flagged",
    urdu: "یہ کیوں فلیگ ہوا",
    roman_urdu: "Ye kyun flag hua",
  },
  next_step: {
    english: "Recommended next step",
    urdu: "تجویز کردہ اگلا قدم",
    roman_urdu: "Meri tajweez: agla qadam",
  },
  ai_note: {
    english:
      "This is AI analysis, not official verification. Final confirmation must come from the university, the scholarship provider or the embassy directly.",
    urdu:
      "یہ AI کا تجزیہ ہے، سرکاری تصدیق نہیں۔ حتمی تصدیق براہِ راست یونیورسٹی، اسکالرشپ ادارے یا سفارت خانے سے کریں۔",
    roman_urdu:
      "Ye AI ka tajzia hai, official verification nahi. Final confirmation university, scholarship provider ya embassy se directly kijiye.",
  },
  ask_heading: {
    english: "To investigate this properly, I still need a few details:",
    urdu: "اس کی درست تحقیق کے لیے مجھے چند مزید تفصیلات چاہیے:",
    roman_urdu: "Iski theek se investigation ke liye mujhe kuch aur details chahiye:",
  },
  q_country: {
    english: "Which country is this for?",
    urdu: "یہ کس ملک کے لیے ہے؟",
    roman_urdu: "Ye kis country ke liye hai?",
  },
  q_degree: {
    english: "Which level are you applying for — BS, MS or PhD?",
    urdu: "آپ کس سطح کے لیے اپلائی کر رہے ہیں — BS، MS یا PhD؟",
    roman_urdu: "Aap kis level ke liye apply kar rahe hain — BS, MS ya PhD?",
  },
  q_university: {
    english: "Which university is this? Please send the full name exactly as written in the message or letter.",
    urdu: "یہ کون سی یونیورسٹی ہے؟ مہینجے یا خط میں لکھا پورا نام بھیجیں۔",
    roman_urdu: "Ye kaun si university hai? Message ya letter mein jo poora naam likha hai woh bhejiye.",
  },
  q_program: {
    english: "What is the exact program name?",
    urdu: "پروگرام کا صحیح نام کیا ہے؟",
    roman_urdu: "Program ka exact naam kya hai?",
  },
  q_agent: {
    english: "What is the consultant's name and company name?",
    urdu: "کنسلٹنٹ کا نام اور کمپنی کا نام کیا ہے؟",
    roman_urdu: "Consultant ka naam aur company ka naam kya hai?",
  },
  q_scholarship: {
    english: "Which scholarship did they name?",
    urdu: "انہوں نے کون سی اسکالرشپ کا نام لیا؟",
    roman_urdu: "Unhon ne kaun si scholarship ka naam liya?",
  },
  q_payment_purpose: {
    english: "What exactly is this payment for (application fee, tuition, consultancy, scholarship processing)?",
    urdu: "یہ ادائیگی بالکل کس چیز کے لیے ہے (ایپلیکیشن فیس، ٹیوشن، کنسلٹنسی، اسکالرشپ پروسیسنگ)؟",
    roman_urdu: "Ye payment kis cheez ke liye hai (application fee, tuition, consultancy, scholarship processing)?",
  },
  q_recipient: {
    english: "Are you being asked to pay a company account or a personal account?",
    urdu: "ادائیگی کمپنی کے اکاؤنٹ میں کرنی ہے یا کسی کے ذاتی اکاؤنٹ میں؟",
    roman_urdu: "Payment company ke account mein karni hai ya kisi ke personal account mein?",
  },
  q_evidence: {
    english:
      "Do you have the WhatsApp message, offer letter, invoice or scholarship email? Paste the text or upload the file here.",
    urdu:
      "کیا آپ کے پاس واٹس ایپ میسج، آفر لیٹر، انوائس یا اسکالرشپ ای میل ہے؟ متن یہاں پیسٹ کریں یا فائل اپلوڈ کریں۔",
    roman_urdu:
      "Kya aap ke paas WhatsApp message, offer letter, invoice ya scholarship email hai? Text yahan paste kijiye ya file upload kijiye.",
  },
  send_more: {
    english: "You can answer in English, Urdu or Roman Urdu.",
    urdu: "آپ جواب انگریزی، اردو یا رومن اردو میں دے سکتے ہیں۔",
    roman_urdu: "Aap jawab English, Urdu ya Roman Urdu mein de sakte hain.",
  },
  welcome: {
    english:
      "Hello! I'm your study-abroad safety investigator. Tell me what you've been offered — university, program, scholarship, consultant or payment request — and I'll help you figure out what needs to be verified before you trust it or pay anything.",
    urdu:
      "سلام! میں آپ کا اسٹڈی ایبرڈ سیفٹی اسسٹنٹ ہوں۔ مجھے بتائیں کہ آپ کو کیا آفر ملا ہے — یونیورسٹی، پروگرام، اسکالرشپ، کنسلٹنٹ یا ادائیگی کی ڈیمانڈ — میں بتاؤں گا کہ بھروسہ کرنے یا پیسے دینے سے پہلے کیا تصدیق کرانی ہے۔",
    roman_urdu:
      "Salam! Main aap ka study-abroad safety investigator hoon. Batayiye aap ko kya offer mila hai — university, program, scholarship, consultant ya payment ki demand — main bataoonga ke bharosa karne ya paise dene se pehle kya verify karana hai.",
  },
  a_verify_university: {
    english: "Open the university's official website and confirm the program and intake yourself.",
    urdu: "یونیورسٹی کی آفیشل ویب سائٹ کھولیں اور پروگرام اور داخلے کی تاریخ کی خود تصدیق کریں۔",
    roman_urdu: "University ki official website khud open kar ke program aur intake confirm kijiye.",
  },
  a_confirm_program: {
    english: "Confirm the exact program name, degree level and intake on the official course page.",
    urdu: "آفیشل کورس پیج پر پروگرام کا صحیح نام، ڈگری لیول اور intake تصدیق کریں۔",
    roman_urdu: "Official course page par program ka exact naam, degree level aur intake confirm kijiye.",
  },
  a_confirm_scholarship: {
    english: "Confirm the scholarship directly with the provider using its official website — never only through the agent.",
    urdu: "اسکالرشپ کی تصدیق براہِ راست ادارے کی آفیشل ویب سائٹ سے کریں — صرف ایجنٹ پر بھروسہ نہ کریں۔",
    roman_urdu: "Scholarship ki verification provider ki official website se directly kijiye — sirf agent par rely na kijiye.",
  },
  a_verify_agent: {
    english:
      "Ask the university's admissions office by email whether this consultant is an authorised representative, and keep the reply in writing.",
    urdu:
      "یونیورسٹی کے ایڈمیشن آفس کو ای میل کریں اور پوچھیں کہ یہ کنسلٹنٹ مجاز نمائندہ ہے یا نہیں، اور جواب تحریری طور پر محفوظ رکھیں۔",
    roman_urdu:
      "University ke admissions office ko email kijiye aur poochhiye ke yeh consultant authorised representative hai ya nahi, aur jawab likh ke rakhwayiye.",
  },
  a_request_invoice: {
    english: "Ask for a written, itemised invoice on company letterhead before any payment.",
    urdu: "کسی بھی ادائیگی سے پہلے کمپنی کے لیٹرہیڈ پر تحریری، تفصیلی انوائس مانگیں۔",
    roman_urdu: "Kisi bhi payment se pehle company letterhead par likhi hui itemised invoice mangwayiye.",
  },
  a_no_guarantees: {
    english:
      "Treat any \"guaranteed admission / visa / scholarship\" claim as a warning sign — no university or embassy can guarantee an outcome.",
    urdu:
      "کوئی بھی \"گیارنٹی شدہ ایڈمشن / ویزا / اسکالرشپ\" دعویٰ خطرے کی علامت سمجھیں — کوئی یونیورسٹی یا سفارت خانہ نتیجے کی ضمانت نہیں دے سکتا۔",
    roman_urdu:
      "Koi bhi \"guaranteed admission / visa / scholarship\" wala claim warning signal samjhiye — koi university ya embassy result ki guarantee nahi de sakti.",
  },
  a_do_not_pay_yet: {
    english:
      "Do not send money yet. Verify the payment route independently with the university or the official organisation first.",
    urdu:
      "ابھی پیسے نہ بھیجیں۔ پہلے یونیورسٹی یا متعلقہ سرکاری ادارے سے ادائیگی کا راستہ خود تصدیق کریں۔",
    roman_urdu:
      "Abhi paise na bhejiye. Pehle university ya related official organisation se payment route khud verify kijiye.",
  },
  a_use_official_portal: {
    english: "Apply only through the official application portal listed below.",
    urdu: "درخواست صرف نیچے دی گئی آفیشل ایپلیکیشن پورٹل سے دیں۔",
    roman_urdu: "Application sirf niche di gayi official portal se submit kijiye.",
  },
  a_send_evidence: {
    english: "Paste the exact message or upload the document so the claims inside it can be checked line by line.",
    urdu: "درست پیغام پیسٹ کریں یا دستاویز اپلوڈ کریں تاکہ اس کے دعوے سطر بہ سطر چیک ہو سکیں۔",
    roman_urdu: "Exact message paste kijiye ya document upload kijiye taake us ke claims line by line check ho saken.",
  },
  a_check_domain: {
    english:
      "Check the sender's email domain and the website link character by character — lookalike domains are common.",
    urdu:
      "بھیجنے والے کا ای میل ڈومین اور ویب سائٹ لنک حرف بہ حرف چیک کریں — ملتی جلتی ڈومینز بہت عام ہیں۔",
    roman_urdu:
      "Sender ka email domain aur website link character by character check kijiye — lookalike domains bohat common hain.",
  },
  a_free_scholarship: {
    english: "This scholarship is free to apply for directly — anyone charging a fee to apply for it should be questioned.",
    urdu: "یہ اسکالرشپ براہِ راست مفت اپلائی کی جا سکتی ہے — اےپلائی کرنے کے لیے فیس مانگنے والے سے سوال کریں۔",
    roman_urdu:
      "Yeh scholarship directly free mein apply hoti hai — is par apply karne ke liye fee mangne wale se sawal kijiye.",
  },
  summary_high: {
    english: "Multiple significant warning signals were detected in what you described.",
    urdu: "آپ کی بتائی گئی بات میں کئی بڑے خطرے کی علامتیں پائی گئی ہیں۔",
    roman_urdu: "Aap ki batayi hui baat mein kuch bara warning signals mile hain.",
  },
  summary_medium: {
    english: "Some of the information could not be verified and needs additional checks.",
    urdu: "کچھ معلومات کی تصدیق نہیں ہو سکیں، مزید چیک درکار ہیں۔",
    roman_urdu: "Kuch cheezein verify nahi ho sakin, aur checks chahiye.",
  },
  summary_low: {
    english: "The information you shared is consistent with our verification data, but keep verifying independently.",
    urdu: "آپ کی معلومات ہمارے تصدیقی ڈیٹا سے مطابقت رکھتی ہیں، مگر خود بھی تصدیق جاری رکھیں۔",
    roman_urdu: "Aap ki maloomat hamare verification data se match karti hain, magar khud bhi verify karte rahijiye.",
  },
  summary_pending: {
    english: "I don't have enough detail to assess this yet — let's fill the gaps first.",
    urdu: "ابھی اس کا تجزیہ کرنے کے لیے کافی تفصیل نہیں ہے — پہلے کمی کو پورا کریں۔",
    roman_urdu: "Abhi is ko assess karne ke liye kaafi detail nahi hai — pehle gaps fill karte hain.",
  },
  continue_note: {
    english: "Ask me about any single part (university, scholarship, agent or payment) and we'll dig deeper.",
    urdu: "کسی بھی ایک حصے (یونیورسٹی، اسکالرشپ، ایجنٹ یا ادائیگی) کے بارے میں پوچھیں، ہم مزید جانچیں گے۔",
    roman_urdu: "Kisi bhi ek hisay (university, scholarship, agent ya payment) ke baare mein poochhiye, hum aage check karenge.",
  },
};

export function t(key: keyof typeof P, language: Language): string {
  return P[key][language] ?? P[key].english;
}

export function has(key: keyof typeof P): boolean {
  return Boolean(P[key]);
}

export const DEGREE_OPTIONS: { value: DegreeLevel; label: string }[] = [
  { value: "BS", label: "BS / Bachelor's" },
  { value: "MS", label: "MS / Master's" },
  { value: "PhD", label: "PhD" },
];

export const FUNDING_OPTIONS: { value: FundingType; label: string }[] = [
  { value: "fully_funded", label: "Fully Funded" },
  { value: "partially_funded", label: "Partially Funded" },
  { value: "university_funded", label: "University Funding" },
  { value: "external_scholarship", label: "External Scholarship" },
  { value: "self_funded", label: "Self Funded" },
  { value: "unsure", label: "I'm Not Sure" },
];
