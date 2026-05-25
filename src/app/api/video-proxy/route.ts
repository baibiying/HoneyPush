import { type NextRequest, NextResponse } from "next/server";

const BASE_URL = "http://124.221.38.152:8080";

async function resolveVideoUrl(): Promise<string> {
  // 先拉根路径，解析 HTML 里的 <source src="...">
  const html = await fetch(`${BASE_URL}/`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  }).then((r) => r.text()).catch(() => "");

  const match = html.match(/<source[^>]+src=["']([^"']+)["']/i);
  if (match) {
    const src = match[1];
    // 拼接成完整 URL
    return src.startsWith("http") ? src : `${BASE_URL}/${src.replace(/^\//, "")}`;
  }
  // fallback：直接用根路径（可能是直接视频流）
  return `${BASE_URL}/`;
}

export async function GET(request: NextRequest) {
  const videoUrl = await resolveVideoUrl();
  const range = request.headers.get("range");

  const headers: HeadersInit = { "User-Agent": "Mozilla/5.0" };
  if (range) headers["Range"] = range;

  const upstream = await fetch(videoUrl, { headers });

  const responseHeaders = new Headers();
  const forward = ["content-type", "content-length", "content-range", "accept-ranges", "cache-control"];
  for (const key of forward) {
    const val = upstream.headers.get(key);
    if (val) responseHeaders.set(key, val);
  }
  if (!responseHeaders.get("content-type")?.startsWith("video")) {
    responseHeaders.set("content-type", "video/mp4");
  }
  responseHeaders.set("access-control-allow-origin", "*");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
