import { NextResponse } from "next/server";

import { listInvestigations } from "@/server/repositories/investigations";
import { getStudentKey } from "@/server/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const studentKey = await getStudentKey();
  const items = await listInvestigations(studentKey);
  return NextResponse.json({ investigations: items });
}
