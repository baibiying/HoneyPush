import { NextResponse } from "next/server";

const FORWARD_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "cache-control",
] as const;

/** 将上游视频流代理给浏览器 <video>，支持 Range */
export async function proxyVideoStream(
  videoUrl: string,
  upstreamHeaders: HeadersInit,
  range: string | null
) {
  const headers: HeadersInit = { ...upstreamHeaders };
  if (range) {
    (headers as Record<string, string>).Range = range;
  }

  const upstream = await fetch(videoUrl, { headers });

  const responseHeaders = new Headers();
  for (const key of FORWARD_HEADERS) {
    const val = upstream.headers.get(key);
    if (val) responseHeaders.set(key, val);
  }

  const contentType = responseHeaders.get("content-type");
  if (!contentType?.startsWith("video")) {
    responseHeaders.set("content-type", "video/mp4");
  }
  responseHeaders.set("access-control-allow-origin", "*");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
