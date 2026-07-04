import { NextResponse } from "next/server";
import { getAnalyticsSummary } from "@/lib/analytics-engine";
import starterData from "@/data/starter-data.json";
import { Session } from "@/types/session";

/**
 * GET /api/analytics
 * Returns the full AnalyticsSummary computed from stored sessions.
 * Currently reads the seeded starter dataset — swap the data source for
 * Prisma once database/schema.prisma is wired up, the engine itself does
 * not need to change.
 */
export async function GET() {
  const sessions = starterData.sessions as Session[];
  const summary = getAnalyticsSummary(sessions);
  return NextResponse.json(summary);
}
