import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import db from "@/lib/db";

const SETTING_KEY = "app_settings";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const type = formData.get("type"); // 'logo', 'favicon', or 'background'

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Determine filename and path based on type
    let filename;
    if (type === "favicon") {
      filename = "favicon.ico";
    } else if (type === "background") {
      filename = "dashboard-bg.png";
    } else if (type === "loginbg") {
      filename = "login-bg.png";
    } else {
      filename = "logo.png";
    }

    const filePath = path.join(process.cwd(), "public", filename);

    await writeFile(filePath, buffer);

    // Update system setting
    let settings = { appName: "Mikrotik Manager", logoUrl: "", faviconUrl: "" };

    // Read existing settings
    const record = await db.systemSetting.findUnique({
      where: { key: SETTING_KEY },
    });

    if (record) {
      settings = JSON.parse(record.value);
    }

    if (type === "logo") {
      settings.logoUrl = `/${filename}?t=${Date.now()}`;
    } else if (type === "favicon") {
      settings.faviconUrl = `/${filename}?t=${Date.now()}`;
    } else if (type === "background") {
      settings.dashboardBgUrl = `/${filename}?t=${Date.now()}`;
    } else if (type === "loginbg") {
      settings.loginBgUrl = `/${filename}?t=${Date.now()}`;
    }

    // Save updated settings
    await db.systemSetting.upsert({
      where: { key: SETTING_KEY },
      update: { value: JSON.stringify(settings) },
      create: { key: SETTING_KEY, value: JSON.stringify(settings) },
    });

    return NextResponse.json({ success: true, path: `/${filename}` });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
