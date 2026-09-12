import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Verification datasets (owned by the "data team" role). These are seed tables
 * that the backend searches — the frontend never reads them directly.
 */
export const universities = pgTable("universities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
  country: text("country"),
  officialWebsite: text("official_website"),
  applicationPortal: text("application_portal"),
  programTypes: jsonb("program_types").$type<string[]>().notNull().default([]),
  acceptsDirectApplications: boolean("accepts_direct_applications"),
  notes: text("notes"),
  dataLabel: text("data_label"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  universityId: integer("university_id"),
  universityName: text("university_name").notNull(),
  name: text("name").notNull(),
  aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
  degreeLevel: text("degree_level").notNull(),
  availability: text("availability").notNull().default("listed"),
  intake: text("intake"),
  applicationMethod: text("application_method"),
  notes: text("notes"),
});

export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  agentName: text("agent_name").notNull(),
  companyName: text("company_name"),
  aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
  city: text("city"),
  claimedUniversities: jsonb("claimed_universities").$type<string[]>().notNull().default([]),
  contactInfo: text("contact_info"),
  status: text("status").notNull(),
  verificationDate: text("verification_date"),
  notes: text("notes"),
  dataLabel: text("data_label"),
});

export const scholarships = pgTable("scholarships", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
  country: text("country"),
  fundedBy: text("funded_by"),
  fundingType: text("funding_type"),
  eligibleLevels: jsonb("eligible_levels").$type<string[]>().notNull().default([]),
  applicationRoute: text("application_route"),
  applicationFee: text("application_fee"),
  officialWebsite: text("official_website"),
  applicationPortal: text("application_portal"),
  notes: text("notes"),
});

export const communityReports = pgTable("community_reports", {
  id: serial("id").primaryKey(),
  agentName: text("agent_name").notNull(),
  companyName: text("company_name"),
  rating: doublePrecision("rating"),
  reportCount: integer("report_count"),
  commonComplaints: jsonb("common_complaints").$type<string[]>().notNull().default([]),
  dataLabel: text("data_label"),
});

export const officialChannels = pgTable("official_channels", {
  id: serial("id").primaryKey(),
  country: text("country").notNull(),
  countryAliases: jsonb("country_aliases").$type<string[]>().notNull().default([]),
  channels: jsonb("channels").$type<{ name: string; url: string }[]>().notNull().default([]),
});

/** Application data. */
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  key: text("key").notNull(),
  name: text("name"),
  email: text("email"),
  passwordHash: text("password_hash"),
  preferredLanguage: text("preferred_language").notNull().default("roman_urdu"),
  degreeLevel: text("degree_level"),
  targetCountries: jsonb("target_countries").$type<string[]>().notNull().default([]),
  fundingPreference: text("funding_preference"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const investigations = pgTable("investigations", {
  id: serial("id").primaryKey(),
  studentKey: text("student_key").notNull(),
  title: text("title").notNull(),
  language: text("language").notNull().default("roman_urdu"),
  status: text("status").notNull().default("gathering"),
  country: text("country"),
  degreeLevel: text("degree_level"),
  programName: text("program_name"),
  universityName: text("university_name"),
  scholarshipName: text("scholarship_name"),
  agentName: text("agent_name"),
  fundingType: text("funding_type"),
  overallRisk: text("overall_risk").notNull().default("pending_more_info"),
  summary: text("summary"),
  latestResult: jsonb("latest_result"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const investigationMessages = pgTable("investigation_messages", {
  id: serial("id").primaryKey(),
  investigationId: integer("investigation_id").notNull(),
  role: text("role").notNull(),
  text: text("text").notNull(),
  attachments: jsonb("attachments").$type<ChatAttachmentRow[]>().notNull().default([]),
  result: jsonb("result"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ChatAttachmentRow = {
  id: string;
  kind: string;
  label: string;
  mime?: string | null;
  size_bytes?: number | null;
  url?: string | null;
  analysis_status?: string;
  note?: string | null;
};

export const evidenceItems = pgTable("evidence_items", {
  id: serial("id").primaryKey(),
  investigationId: integer("investigation_id").notNull(),
  kind: text("kind").notNull(),
  label: text("label").notNull(),
  mime: text("mime"),
  sizeBytes: integer("size_bytes"),
  url: text("url"),
  extractedText: text("extracted_text"),
  analysisStatus: text("analysis_status").notNull().default("not_analyzed"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
