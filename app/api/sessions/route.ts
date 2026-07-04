import { NextResponse } from "next/server";
import starterData from "@/data/starter-data.json";

// Stub CRUD endpoint — returns seeded sessions for now.
// Future work: persist via Prisma (see database/schema.prisma).
export async function GET() {
  return NextResponse.json(starterData.sessions);
}

export async function POST(request: Request) {
  const body = await request.json();
  // TODO: validate + persist via Prisma once the database layer lands.
  return NextResponse.json({ received: body }, { status: 201 });
}
