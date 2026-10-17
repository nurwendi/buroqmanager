import { NextResponse } from "next/server";

let cachedWallpaper = {
  date: null,
  imageUrl: null,
  title: null,
  copyright: null,
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");

  const today = new Date().toISOString().slice(0, 10);

  if (cachedWallpaper.date !== today || !cachedWallpaper.imageUrl) {
    try {
      const res = await fetch(
        "https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=en-US",
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          cache: "no-store",
        }
      );

      if (res.ok) {
        const data = await res.json();
        const img = data?.images?.[0];
        if (img && img.url) {
          const fullUrl = img.url.startsWith("http")
            ? img.url
            : `https://www.bing.com${img.url}`;
          cachedWallpaper = {
            date: today,
            imageUrl: fullUrl,
            title: img.title || "",
            copyright: img.copyright || "",
          };
        }
      }
    } catch (error) {
      console.error("Failed to fetch Bing Daily Wallpaper:", error);
    }
  }

  const fallbackUrl =
    cachedWallpaper.imageUrl ||
    "https://www.bing.com/th?id=OHR.MilkyWayArch_EN-US1986305196_1920x1080.jpg";

  if (format === "json") {
    return NextResponse.json({
      url: fallbackUrl,
      title: cachedWallpaper.title || "",
      copyright: cachedWallpaper.copyright || "",
      date: cachedWallpaper.date || today,
    });
  }

  return NextResponse.redirect(fallbackUrl, {
    status: 307,
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
