import { NextResponse } from "next/server";

import { destroySession } from "@/lib/auth";

/**
 * Logout for the mobile sheet.
 *
 * The desktop navbar posts to a Server Function, but that component is a
 * client component inside a client-rendered sheet, so a plain form POST to a
 * route handler is simpler and — importantly — still works with JavaScript
 * disabled or still loading.
 */
export async function POST(request: Request) {
  await destroySession();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
