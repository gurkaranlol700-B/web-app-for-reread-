import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getNotifications, markAllRead } from "@/lib/notify";

/** Backs the navbar bell. Opening the panel is what marks everything read. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const notifications = await getNotifications(user.id);
  await markAllRead(user.id);

  return NextResponse.json(
    { notifications },
    { headers: { "Cache-Control": "no-store" } },
  );
}
