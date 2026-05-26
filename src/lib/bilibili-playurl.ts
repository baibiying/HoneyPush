const BILIBILI_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const BILIBILI_REFERER = "https://www.bilibili.com";

type BilibiliViewResponse = {
  code: number;
  message?: string;
  data?: { cid: number };
};

type BilibiliPlayurlResponse = {
  code: number;
  message?: string;
  data?: {
    durl?: { url: string }[];
    dash?: { video?: { baseUrl?: string }[] };
  };
};

/** 将 BV 号解析为可直链播放的 MP4 地址（供服务端代理） */
export async function resolveBilibiliMp4Url(bvid: string): Promise<string> {
  const viewRes = await fetch(
    `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`,
    {
      headers: { "User-Agent": BILIBILI_UA },
      next: { revalidate: 3600 },
    }
  );

  if (!viewRes.ok) {
    throw new Error(`BILIBILI_VIEW_HTTP_${viewRes.status}`);
  }

  const viewJson = (await viewRes.json()) as BilibiliViewResponse;
  if (viewJson.code !== 0 || !viewJson.data?.cid) {
    throw new Error(viewJson.message ?? "BILIBILI_VIEW_FAILED");
  }

  const cid = viewJson.data.cid;
  const playRes = await fetch(
    `https://api.bilibili.com/x/player/playurl?bvid=${encodeURIComponent(bvid)}&cid=${cid}&qn=32&fnval=1`,
    {
      headers: {
        "User-Agent": BILIBILI_UA,
        Referer: BILIBILI_REFERER,
      },
      next: { revalidate: 3600 },
    }
  );

  if (!playRes.ok) {
    throw new Error(`BILIBILI_PLAYURL_HTTP_${playRes.status}`);
  }

  const playJson = (await playRes.json()) as BilibiliPlayurlResponse;
  if (playJson.code !== 0 || !playJson.data) {
    throw new Error(playJson.message ?? "BILIBILI_PLAYURL_FAILED");
  }

  const durl = playJson.data.durl?.[0]?.url;
  if (durl) return durl;

  const dashUrl = playJson.data.dash?.video?.[0]?.baseUrl;
  if (dashUrl) return dashUrl;

  throw new Error("BILIBILI_NO_PLAYABLE_URL");
}

export const BILIBILI_STREAM_HEADERS = {
  "User-Agent": BILIBILI_UA,
  Referer: BILIBILI_REFERER,
} as const;
