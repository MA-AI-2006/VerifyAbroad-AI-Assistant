/**
 * Verification seed datasets.
 *
 * These datasets are provided by the data team and are the ONLY source the
 * backend uses for verification statements. The engine must never invent an
 * official website, scholarship detail or agent listing that is not here.
 *
 * NOTE: this is a curated demo/seed dataset for a hackathon MVP. It is not a
 * complete global list and must not be presented as official verification.
 */

export interface UniversitySeed {
  name: string;
  aliases: string[];
  country: string;
  official_website: string | null;
  official_application_portal: string | null;
  program_types: string[];
  accepts_direct_applications: boolean | null;
  notes: string;
  data_label?: string;
}

export const universitySeed: UniversitySeed[] = [
  {
    name: "University of Manchester",
    aliases: ["manchester", "uom", "university of manchester"],
    country: "United Kingdom",
    official_website: "https://www.manchester.ac.uk",
    official_application_portal: "https://www.manchester.ac.uk/study/postgraduate/apply/",
    program_types: ["Undergraduate", "Postgraduate", "PhD"],
    accepts_direct_applications: true,
    notes:
      "Accepts direct online applications; also lists official recruitment partners on its website.",
  },
  {
    name: "University of Toronto",
    aliases: ["toronto", "u of t", "utoronto"],
    country: "Canada",
    official_website: "https://www.utoronto.ca",
    official_application_portal: "https://future.utoronto.ca/apply/",
    program_types: ["Undergraduate", "Postgraduate", "PhD"],
    accepts_direct_applications: true,
    notes:
      "Applications via OUAC (undergrad) or School of Graduate Studies portal (postgrad).",
  },
  {
    name: "University of Melbourne",
    aliases: ["melbourne", "unimelb"],
    country: "Australia",
    official_website: "https://www.unimelb.edu.au",
    official_application_portal: "https://study.unimelb.edu.au/how-to-apply",
    program_types: ["Undergraduate", "Postgraduate", "PhD"],
    accepts_direct_applications: true,
    notes: "Direct applications accepted; official agent list published on university site.",
  },
  {
    name: "Technical University of Munich",
    aliases: ["munich", "tum", "tu munich", "technical university of munich"],
    country: "Germany",
    official_website: "https://www.tum.de",
    official_application_portal: "https://www.tum.de/en/studies/application",
    program_types: ["Undergraduate", "Postgraduate", "PhD"],
    accepts_direct_applications: true,
    notes:
      "Most programs are tuition-free; applications via uni-assist or TUMonline, no agent required.",
  },
  {
    name: "Arizona State University",
    aliases: ["arizona state", "asu"],
    country: "United States",
    official_website: "https://www.asu.edu",
    official_application_portal: "https://admission.asu.edu/apply",
    program_types: ["Undergraduate", "Postgraduate", "PhD"],
    accepts_direct_applications: true,
    notes: "Direct application via ASU admission portal; F-1 visa process handled after I-20 issuance.",
  },
  {
    name: "King Saud University",
    aliases: ["ksu", "king saud", "riyadh"],
    country: "Saudi Arabia",
    official_website: "https://www.ksu.edu.sa",
    official_application_portal: "https://dgs.ksu.edu.sa",
    program_types: ["Undergraduate", "Postgraduate"],
    accepts_direct_applications: true,
    notes:
      "Government scholarship-linked admissions typically go through the Deanship of Graduate Studies portal.",
  },
  {
    name: "National University of Singapore",
    aliases: ["nus", "singapore university", "national university of singapore"],
    country: "Singapore",
    official_website: "https://www.nus.edu.sg",
    official_application_portal: "https://www.nus.edu.sg/oam/apply-to-nus",
    program_types: ["Undergraduate", "Postgraduate", "PhD"],
    accepts_direct_applications: true,
    notes: "Direct applications only; NUS does not use paid third-party agents for admissions.",
  },
  {
    name: "Global International University",
    aliases: ["global international university", "global international", "giu"],
    country: "Unknown",
    official_website: null,
    official_application_portal: null,
    program_types: [],
    accepts_direct_applications: null,
    notes:
      "No matching institution found in verification data — treat any claim referencing this name as needing further verification. Included as a test case for the 'not_found' verdict.",
    data_label: "Unverifiable placeholder institution (test case)",
  },
];

export interface ProgramSeed {
  universityName: string;
  name: string;
  aliases: string[];
  degreeLevel: "BS" | "MS" | "PhD";
  availability: "listed" | "needs_confirmation";
  intake?: string | null;
  applicationMethod: string;
  notes: string;
}

export const programSeed: ProgramSeed[] = [
  {
    universityName: "Technical University of Munich",
    name: "MSc Informatics (Computer Science)",
    aliases: ["informatics", "computer science", "msc informatics"],
    degreeLevel: "MS",
    availability: "listed",
    intake: "Winter & summer intake",
    applicationMethod: "TUMonline / uni-assist (direct, no agent)",
    notes: "Tuition-free for most students; a semester contribution is charged instead.",
  },
  {
    universityName: "Technical University of Munich",
    name: "BSc Informatics",
    aliases: ["bsc informatics", "bachelor informatics"],
    degreeLevel: "BS",
    availability: "listed",
    intake: "Winter intake",
    applicationMethod: "TUMonline / uni-assist (direct, no agent)",
    notes: "German-taught bachelor programs usually require recognised German proficiency.",
  },
  {
    universityName: "University of Manchester",
    name: "MSc Advanced Computer Science",
    aliases: ["advanced computer science", "computer science"],
    degreeLevel: "MS",
    availability: "listed",
    intake: "September intake",
    applicationMethod: "Direct online application portal",
    notes: "Programme details and entry requirements are published on the official course page.",
  },
  {
    universityName: "University of Manchester",
    name: "BSc Computer Science",
    aliases: ["bsc computer science", "computer science"],
    degreeLevel: "BS",
    availability: "listed",
    intake: "September intake",
    applicationMethod: "UCAS (undergraduate)",
    notes: "Undergraduate applications in the UK are submitted through UCAS.",
  },
  {
    universityName: "University of Toronto",
    name: "MSc Computer Science",
    aliases: ["msc computer science", "computer science"],
    degreeLevel: "MS",
    availability: "listed",
    intake: "Fall intake",
    applicationMethod: "School of Graduate Studies online application",
    notes: "Research-based master's programs usually require a supervisor match.",
  },
  {
    universityName: "University of Melbourne",
    name: "Master of Computer Science",
    aliases: ["master of computer science", "computer science"],
    degreeLevel: "MS",
    availability: "listed",
    intake: "Feb & July intakes",
    applicationMethod: "Direct online application (or listed official agent)",
    notes: "Melbourne publishes its official agent list on its website.",
  },
  {
    universityName: "Arizona State University",
    name: "MS Computer Science",
    aliases: ["ms computer science", "computer science"],
    degreeLevel: "MS",
    availability: "listed",
    intake: "Fall & spring intakes",
    applicationMethod: "ASU graduate admission portal",
    notes: "I-20 is issued by the university after admission, not by an agent.",
  },
  {
    universityName: "National University of Singapore",
    name: "Master of Computing",
    aliases: ["master of computing", "computing", "computer science"],
    degreeLevel: "MS",
    availability: "listed",
    intake: "August intake",
    applicationMethod: "NUS online application system (direct only)",
    notes: "NUS states that it does not use paid third-party agents for admissions.",
  },
  {
    universityName: "King Saud University",
    name: "MS Computer Science",
    aliases: ["ms computer science", "computer science"],
    degreeLevel: "MS",
    availability: "needs_confirmation",
    intake: null,
    applicationMethod: "Deanship of Graduate Studies portal",
    notes: "Programme availability should be confirmed on the graduate studies portal each cycle.",
  },
];

export interface AgentSeed {
  agent_name: string;
  company_name: string;
  aliases: string[];
  city: string;
  claimed_universities: string[];
  contact_info: string;
  status: "verified" | "needs_verification" | "not_found";
  verification_date: string;
  notes: string;
}

export const agentSeed: AgentSeed[] = [
  {
    agent_name: "Bilal Ahmed",
    company_name: "Bright Path Education Consultants",
    aliases: ["bilal ahmed", "bilal", "bright path", "brightpath"],
    city: "Lahore",
    claimed_universities: ["University of Manchester", "University of Toronto"],
    contact_info: "info@brightpath-edu-example.com | +92-42-XXXXXXX",
    status: "verified",
    verification_date: "2026-06-10",
    notes:
      "Listed as an official recruitment partner on the University of Manchester's published partner page.",
  },
  {
    agent_name: "Sana Malik",
    company_name: "Horizon Overseas Consultancy",
    aliases: ["sana malik", "sana", "horizon overseas", "horizon"],
    city: "Karachi",
    claimed_universities: ["University of Melbourne"],
    contact_info: "contact@horizon-overseas-example.com | +92-21-XXXXXXX",
    status: "needs_verification",
    verification_date: "2026-07-02",
    notes:
      "Company registration found, but no confirmation of official partner status from the university.",
  },
  {
    agent_name: "Ahmed Raza",
    company_name: "Global Future Consultants",
    aliases: ["ahmed raza", "global future", "global future consultants"],
    city: "Islamabad",
    claimed_universities: ["Arizona State University"],
    contact_info: "globalfuture.example@gmail.com | +92-300-XXXXXXX",
    status: "not_found",
    verification_date: "2026-08-01",
    notes:
      "No business registration or official partner listing found matching this name; requesting payment to a personal account has been reported.",
  },
  {
    agent_name: "Fatima Sheikh",
    company_name: "EduWay Consultants",
    aliases: ["fatima sheikh", "fatima", "eduway"],
    city: "Lahore",
    claimed_universities: ["Technical University of Munich"],
    contact_info: "info@eduway-example.com | +92-42-YYYYYYY",
    status: "needs_verification",
    verification_date: "2026-07-20",
    notes:
      "TUM's official application process does not require an agent; claims of guaranteed admission should be treated as a red flag regardless of agent status.",
  },
  {
    agent_name: "Usman Tariq",
    company_name: "VisaSure Guaranteed Admissions",
    aliases: ["usman tariq", "usman", "visasure", "visa sure"],
    city: "Faisalabad",
    claimed_universities: ["Global International University"],
    contact_info: "visasure.guaranteed@example.com | +92-41-ZZZZZZZ",
    status: "not_found",
    verification_date: "2026-08-15",
    notes:
      "No matching university found for the claimed institution; multiple fraud-pattern indicators present in advertising (guaranteed visa, guaranteed admission). Included as a high-risk test case.",
  },
];

export interface ScholarshipSeed {
  name: string;
  aliases: string[];
  country: string;
  funded_by: string;
  funding_type: "fully_funded" | "partially_funded" | "university_funded" | "external_scholarship";
  eligible_levels: string[];
  application_route: string;
  application_fee: string;
  official_website: string;
  application_portal: string;
  notes: string;
}

export const scholarshipSeed: ScholarshipSeed[] = [
  {
    name: "Chevening Scholarship",
    aliases: ["chevening"],
    country: "United Kingdom",
    funded_by: "UK Government (FCDO)",
    funding_type: "fully_funded",
    eligible_levels: ["MS"],
    application_route: "Direct application via official Chevening portal",
    application_fee: "Free to apply — no agent or fee required",
    official_website: "https://www.chevening.org",
    application_portal: "https://www.chevening.org/apply/",
    notes: "Fully funded, no agent or fee required to apply. Applications open annually and are free.",
  },
  {
    name: "Fulbright Foreign Student Program",
    aliases: ["fulbright", "usefp"],
    country: "United States",
    funded_by: "US Government / USEFP (Pakistan)",
    funding_type: "fully_funded",
    eligible_levels: ["MS", "PhD"],
    application_route: "Direct application via USEFP Pakistan",
    application_fee: "Free to apply — no third-party agent or payment required",
    official_website: "https://www.usefpakistan.org",
    application_portal: "https://www.usefpakistan.org/Fulbright/how-to-apply",
    notes: "Administered in Pakistan by USEFP; no third-party agent or payment is required to apply.",
  },
  {
    name: "DAAD Scholarships",
    aliases: ["daad", "daad scholarship"],
    country: "Germany",
    funded_by: "German Academic Exchange Service",
    funding_type: "fully_funded",
    eligible_levels: ["BS", "MS", "PhD"],
    application_route: "Direct application through the DAAD scholarship database",
    application_fee: "Free to apply directly — no agent fee required",
    official_website: "https://www.daad.de",
    application_portal: "https://www2.daad.de/deutschland/stipendium/datenbank/en/",
    notes: "Free to apply directly through DAAD's official database; no agent fee required.",
  },
  {
    name: "Australia Awards Scholarships",
    aliases: ["australia awards", "aus awards"],
    country: "Australia",
    funded_by: "Australian Government (DFAT)",
    funding_type: "fully_funded",
    eligible_levels: ["BS", "MS", "PhD"],
    application_route: "Direct application via the OASIS portal",
    application_fee: "Free to apply — no agent required",
    official_website: "https://www.dfat.gov.au/people-to-people/australia-awards",
    application_portal: "https://oasis.dfat.gov.au",
    notes: "Fully funded; applications submitted directly via OASIS portal, no agent required.",
  },
  {
    name: "Commonwealth Scholarship",
    aliases: ["commonwealth"],
    country: "United Kingdom",
    funded_by: "UK Government (CSC)",
    funding_type: "fully_funded",
    eligible_levels: ["MS", "PhD"],
    application_route: "Nominating body (in Pakistan, typically HEC)",
    application_fee: "Free to apply",
    official_website: "https://cscuk.fcdo.gov.uk",
    application_portal: "https://cscuk.fcdo.gov.uk/apply/",
    notes:
      "Applications processed alongside a nominating body (in Pakistan, typically HEC); free to apply.",
  },
  {
    name: "HEC Overseas Scholarship Schemes",
    aliases: ["hec", "hec scholarship", "hec overseas"],
    country: "Various",
    funded_by: "Higher Education Commission, Pakistan",
    funding_type: "fully_funded",
    eligible_levels: ["BS", "MS", "PhD"],
    application_route: "Direct application via HEC Pakistan",
    application_fee: "Free to apply",
    official_website: "https://www.hec.gov.pk",
    application_portal: "https://www.hec.gov.pk/english/scholarshipsgrants/",
    notes:
      "Official Pakistani government scholarship body; verify any scheme name directly against HEC's published list before trusting an agent's claim about it.",
  },
];

export interface CommunityReportSeed {
  agent_name: string;
  company_name: string;
  rating: number;
  report_count: number;
  common_complaints: string[];
  data_label: string;
}

export const communityReportSeed: CommunityReportSeed[] = [
  {
    agent_name: "Bilal Ahmed",
    company_name: "Bright Path Education Consultants",
    rating: 4.3,
    report_count: 12,
    common_complaints: ["Slow response time during peak season"],
    data_label: "Sample/demo data for hackathon MVP — not real crowd-sourced reports",
  },
  {
    agent_name: "Sana Malik",
    company_name: "Horizon Overseas Consultancy",
    rating: 3.2,
    report_count: 28,
    common_complaints: ["High service fees", "Poor communication", "Delayed applications"],
    data_label: "Sample/demo data for hackathon MVP — not real crowd-sourced reports",
  },
  {
    agent_name: "Ahmed Raza",
    company_name: "Global Future Consultants",
    rating: 1.8,
    report_count: 9,
    common_complaints: [
      "Requested payment to a personal bank account",
      "Stopped responding after payment",
      "No physical office found",
    ],
    data_label: "Sample/demo data for hackathon MVP — not real crowd-sourced reports",
  },
  {
    agent_name: "Fatima Sheikh",
    company_name: "EduWay Consultants",
    rating: 3.9,
    report_count: 15,
    common_complaints: ["Unclear fee breakdown"],
    data_label: "Sample/demo data for hackathon MVP — not real crowd-sourced reports",
  },
  {
    agent_name: "Usman Tariq",
    company_name: "VisaSure Guaranteed Admissions",
    rating: 1.2,
    report_count: 21,
    common_complaints: [
      "Guaranteed visa claim did not hold up",
      "Pressured urgent payment",
      "No verifiable business registration",
    ],
    data_label: "Sample/demo data for hackathon MVP — not real crowd-sourced reports",
  },
];

export interface OfficialChannelSeed {
  country: string;
  country_aliases: string[];
  channels: { name: string; url: string }[];
}

export const officialChannelSeed: OfficialChannelSeed[] = [
  {
    country: "United Kingdom",
    country_aliases: ["uk", "britain", "england", "london"],
    channels: [
      { name: "UK Government student visa info", url: "https://www.gov.uk/student-visa" },
      { name: "UCAS (undergraduate applications)", url: "https://www.ucas.com" },
      { name: "British Council Pakistan", url: "https://www.britishcouncil.pk" },
    ],
  },
  {
    country: "United States",
    country_aliases: ["usa", "us", "america"],
    channels: [
      {
        name: "US Department of State student visa info",
        url: "https://travel.state.gov/content/travel/en/us-visas/study.html",
      },
      { name: "EducationUSA Pakistan", url: "https://educationusapakistan.org" },
      { name: "USEFP (Fulbright Pakistan)", url: "https://www.usefpakistan.org" },
    ],
  },
  {
    country: "Canada",
    country_aliases: ["canada"],
    channels: [
      {
        name: "Immigration, Refugees and Citizenship Canada (IRCC) - study permits",
        url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada.html",
      },
      { name: "EduCanada", url: "https://www.educanada.ca" },
    ],
  },
  {
    country: "Australia",
    country_aliases: ["australia"],
    channels: [
      {
        name: "Australian Government student visa info",
        url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
      },
      { name: "Study Australia (official)", url: "https://www.studyaustralia.gov.au" },
    ],
  },
  {
    country: "Germany",
    country_aliases: ["germany", "deutschland"],
    channels: [
      { name: "DAAD official portal", url: "https://www.daad.de" },
      { name: "uni-assist (application processing)", url: "https://www.uni-assist.de" },
      { name: "German Missions in Pakistan - student visa", url: "https://islamabad.diplo.de" },
    ],
  },
  {
    country: "Türkiye",
    country_aliases: ["turkey", "turkiye"],
    channels: [
      { name: "Study in Türkiye (Council of Higher Education)", url: "https://www.studyinturkiye.gov.tr" },
      { name: "Türkiye Scholarships (official)", url: "https://www.turkiyeburslari.gov.tr" },
    ],
  },
  {
    country: "Singapore",
    country_aliases: ["singapore"],
    channels: [
      {
        name: "Immigration & Checkpoints Authority - Student's Pass",
        url: "https://www.ica.gov.sg/reside/STP/apply-student-s-pass",
      },
    ],
  },
  {
    country: "Saudi Arabia",
    country_aliases: ["saudi", "saudi arabia", "ksa"],
    channels: [
      { name: "Study in Saudi (Ministry of Education)", url: "https://www.moe.gov.sa" },
    ],
  },
  {
    country: "Pakistan (source-country verification)",
    country_aliases: ["pakistan", "pakistani"],
    channels: [
      { name: "Higher Education Commission (HEC) Pakistan", url: "https://www.hec.gov.pk" },
      {
        name: "Bureau of Emigration & Overseas Employment (for employment-linked cases, reference only)",
        url: "https://beoe.gov.pk",
      },
    ],
  },
];
