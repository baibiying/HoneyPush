import { type NextRequest, NextResponse } from "next/server";
import { BILIBILI_STREAM_HEADERS, resolveBilibiliMp4Url } from "@/lib/bilibili-playurl";
import { proxyVideoStream } from "@/lib/proxy-video-stream";

export async function GET(request: NextRequest) {
  const bvid = request.nextUrl.searchParams.get("bvid");
  if (!bvid) {
    return NextResponse.json({ error: "missing bvid" }, { status: 400 });
  }

  try {
    const videoUrl = await resolveBilibiliMp4Url(bvid);
    const range = request.headers.get("range");
    return proxyVideoStream(videoUrl, BILIBILI_STREAM_HEADERS, range);
  } catch (error) {
    const message = error instanceof Error ? error.message : "PREVIEW_RESOLVE_FAILED";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
