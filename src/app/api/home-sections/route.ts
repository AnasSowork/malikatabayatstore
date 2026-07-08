import { NextResponse } from "next/server";
import { listHomeSections } from "@/lib/home-content";

export async function GET() {
  try {
    const sections = await listHomeSections();
    return NextResponse.json(sections);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch home sections" }, { status: 500 });
  }
}
