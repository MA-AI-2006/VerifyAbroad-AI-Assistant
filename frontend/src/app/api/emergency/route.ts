import { NextResponse } from "next/server";

import { emergencyProtocols } from "@/data/emergencyProtocols";

export const dynamic = "force-dynamic";

/**
 * Emergency recovery protocols. Served from the backend so the frontend never
 * hardcodes official contact information.
 */
export async function GET() {
  return NextResponse.json({ emergency: emergencyProtocols });
}
