import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getUserFromRequest } from "@/lib/api-auth";

const SETTINGS_KEY = "app_settings";

export async function GET() {
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: SETTINGS_KEY },
    });

    if (setting) {
      const parsed = JSON.parse(setting.value);
      return NextResponse.json({
        ...parsed,
        loginBgUseBing: Boolean(parsed.loginBgUseBing || parsed.loginBgUrl === "/api/bing-wallpaper"),
      });
    }

    // Default
    return NextResponse.json({
      appName: "Buroq Billing",
      logoUrl: "",
      dashboardBgUrl: "",
      loginBgUrl: "",
      loginBgUseBing: false,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read settings" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { appName, logoUrl, dashboardBgUrl, loginBgUrl, loginBgUseBing } = body;

    // Fetch existing settings to preserve other fields like faviconUrl
    const existingRecord = await db.systemSetting.findUnique({
      where: { key: SETTINGS_KEY },
    });

    let currentSettings = {};
    if (existingRecord) {
      currentSettings = JSON.parse(existingRecord.value);
    }

    const useBing =
      loginBgUseBing !== undefined
        ? Boolean(loginBgUseBing)
        : Boolean(currentSettings.loginBgUseBing);

    const resolvedLoginBgUrl = useBing
      ? "/api/bing-wallpaper"
      : loginBgUrl !== undefined
      ? loginBgUrl
      : currentSettings.loginBgUrl === "/api/bing-wallpaper"
      ? ""
      : currentSettings.loginBgUrl || "";

    const settings = {
      ...currentSettings,
      appName: appName || currentSettings.appName || "Buroq Billing",
      logoUrl: logoUrl !== undefined ? logoUrl : currentSettings.logoUrl || "",
      dashboardBgUrl:
        dashboardBgUrl !== undefined
          ? dashboardBgUrl
          : currentSettings.dashboardBgUrl || "",
      loginBgUrl: resolvedLoginBgUrl,
      loginBgUseBing: useBing,
    };

    await db.systemSetting.upsert({
      where: { key: SETTINGS_KEY },
      update: { value: JSON.stringify(settings) },
      create: { key: SETTINGS_KEY, value: JSON.stringify(settings) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
