import { NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/api-auth";
import db from "@/lib/db";

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { expoPushToken } = body;

    // It's valid for expoPushToken to be null (if user logs out, we want to clear it)
    if (expoPushToken === undefined) {
      return NextResponse.json({ error: "Missing expoPushToken" }, { status: 400 });
    }

    if (user.role === "customer") {
      await db.customer.update({
        where: { id: user.id },
        data: { expoPushToken }
      });
    } else {
      // Tech, Agent, Admin, Superadmin, Staff
      await db.user.update({
        where: { id: user.id },
        data: { expoPushToken }
      });
    }

    return NextResponse.json({ success: true, message: "Push token updated successfully" });
  } catch (error) {
    console.error("Error updating push token:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
