import { createClient } from "@supabase/supabase-js";
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
  }
}

export type Segment = {
  id: string;
  start: number;
  end: number;
  en: string;
  vi: string;
};
export type Video = {
  id: string;
  title: string;
  channel: string;
  channelId: string;
  thumbnail: string;
  cachedAt?: number;
  views?: string;
  publishedAt?: string;
  duration?: string;
  description?: string;
  bilingualAvailable?: boolean;
};
export type Word = {
  word: string;
  definition: string;
  vi?: string;
  phonetic?: string;
  part?: string;
  example?: string;
  due: number;
  interval: number;
  reviews: number;
};
export type Saved = { key: string; payload: any };
export type Kind =
  | "vocabulary"
  | "favorite"
  | "bookmark"
  | "history"
  | "profile"
  | "transcript"
  | "progress";

export const supabase =
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    ? createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
      )
    : null;
export function backendUrl() {
  return (
    import.meta.env.VITE_API_URL ||
    localStorage.getItem("lt.api") ||
    (import.meta.env.DEV ? "http://localhost:8000" : "")
  ).replace(/\/$/, "");
}
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!backendUrl())
    throw new Error(
      "The learning server is not configured yet. Set an HTTPS backend in Profile to enable YouTube search and online services.",
    );
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  let response: Response;
  try {
    response = await fetch(backendUrl() + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      signal: options.signal || AbortSignal.timeout(25000),
    });
  } catch {
    throw new Error(
      "Cannot connect to the learning server. Check your connection and server settings.",
    );
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      typeof body.detail === "string"
        ? body.detail
        : `Request failed (${response.status}).`,
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export function readLocal(kind: Kind): Saved[] {
  try {
    const rows: Saved[] = JSON.parse(
      localStorage.getItem("lt." + kind) || "[]",
    );
    if (!Array.isArray(rows)) return [];
    let changed = false;
    for (const row of rows) {
      const v =
        kind === "bookmark"
          ? row.payload?.video
          : ["favorite", "history"].includes(kind)
            ? row.payload
            : null;
      if (
        v &&
        Date.now() - (v.cachedAt || 0) > 30 * 86400000 &&
        v.title !== "Saved YouTube video"
      ) {
        Object.assign(v, {
          title: "Saved YouTube video",
          channel: "",
          channelId: "",
          thumbnail: "",
          views: undefined,
          publishedAt: undefined,
          duration: undefined,
          description: undefined,
        });
        changed = true;
      }
    }
    if (changed) localStorage.setItem("lt." + kind, JSON.stringify(rows));
    return rows;
  } catch {
    return [];
  }
}
export function saveLocal(kind: Kind, key: string, payload: any) {
  const rows = readLocal(kind).filter((r) => r.key !== key);
  rows.unshift({ key, payload });
  localStorage.setItem("lt." + kind, JSON.stringify(rows.slice(0, 1000)));
}
export async function records(kind: Kind): Promise<Saved[]> {
  const session = (await supabase?.auth.getSession())?.data.session;
  return session ? api("/records/" + kind) : readLocal(kind);
}
export async function save(kind: Kind, key: string, payload: any) {
  const session = (await supabase?.auth.getSession())?.data.session;
  if (session)
    await api("/records/" + kind, {
      method: "PUT",
      body: JSON.stringify({ key, payload }),
    });
  else saveLocal(kind, key, payload);
}
export async function remove(kind: Kind, key: string) {
  const session = (await supabase?.auth.getSession())?.data.session;
  if (session)
    await api("/records/" + kind + "/" + encodeURIComponent(key), {
      method: "DELETE",
    });
  else
    localStorage.setItem(
      "lt." + kind,
      JSON.stringify(readLocal(kind).filter((r) => r.key !== key)),
    );
}
export function activeCue(segments: Segment[], seconds: number) {
  return segments.findIndex((s) => s.start <= seconds && seconds < s.end);
}
export function reviewWord(
  word: Word,
  grade: "again" | "hard" | "good" | "easy",
  now = Date.now(),
): Word {
  const interval =
    grade === "again"
      ? 0
      : grade === "hard"
        ? Math.max(1, Math.round(word.interval * 1.2))
        : grade === "easy"
          ? Math.max(4, Math.round(word.interval * 2.8))
          : Math.max(1, Math.round(word.interval * 2));
  return {
    ...word,
    interval,
    reviews: word.reviews + 1,
    due: now + (grade === "again" ? 600000 : interval * 86400000),
  };
}
export function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
export function decodeYouTubeText(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    quot: '"',
    apos: "'",
    lt: "<",
    gt: ">",
    nbsp: " ",
  };
  return value.replace(
    /&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi,
    (entity, code: string) => {
      if (code[0] !== "#") return named[code.toLowerCase()] || entity;
      const point =
        code[1].toLowerCase() === "x"
          ? parseInt(code.slice(2), 16)
          : Number(code.slice(1));
      return point > 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : entity;
    },
  );
}
export function asVideo(item: any): Video {
  return {
    cachedAt: Date.now(),
    id:
      item.id?.videoId ||
      item.contentDetails?.videoId ||
      item.snippet?.resourceId?.videoId ||
      item.id,
    title: decodeYouTubeText(item.snippet?.title || "Unavailable video"),
    channel: decodeYouTubeText(
      item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle || "",
    ),
    channelId: item.snippet.videoOwnerChannelId || item.snippet.channelId,
    thumbnail:
      item.snippet.thumbnails?.maxres?.url ||
      item.snippet.thumbnails?.high?.url ||
      item.snippet.thumbnails?.medium?.url ||
      item.snippet.thumbnails?.default?.url ||
      "",
    views: item.statistics?.viewCount,
    publishedAt: item.snippet.publishedAt,
    duration: item.contentDetails?.duration,
    description: item.snippet.description,
    bilingualAvailable: item.bilingualAvailable === true,
  };
}

// Offline parsing never fetches captions; only explicitly uploaded text enters here.
export function parseTranscript(content: string): Segment[] {
  if (content.length > 250000)
    throw new Error("Transcript files must be smaller than 250 KB.");
  const timestamp = (input: string) => {
    if (!/^(?:\d{2,}:)?\d{2}:\d{2}[.,]\d{3}$/.test(input))
      throw new Error("Invalid SRT/VTT timestamp.");
    const parts = input.replace(",", ".").split(":").map(Number);
    if (parts.at(-1)! >= 60 || parts.at(-2)! >= 60)
      throw new Error("Invalid SRT/VTT timestamp.");
    return parts.reduce((total, part) => total * 60 + part, 0);
  };
  const segments: Segment[] = [];
  for (const block of content
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)) {
    const lines = block.trim().split("\n");
    const index = lines.findIndex((line) => line.includes("-->"));
    if (index < 0 || lines[0].startsWith("NOTE")) continue;
    const times = lines[index].split("-->");
    const start = timestamp(times[0].trim());
    const end = timestamp(times[1]?.trim().split(/\s+/)[0] || "");
    if (start < 0 || end <= start || end > 86400)
      throw new Error("Invalid transcript cue bounds.");
    const en = lines
      .slice(index + 1)
      .join(" ")
      .replace(/<[^>]*>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    if (en.trim())
      segments.push({ id: String(segments.length), start, end, en, vi: "" });
  }
  if (!segments.length || segments.length > 3000)
    throw new Error("Upload an SRT/VTT file with 1–3000 valid cues.");
  return segments.sort((a, b) => a.start - b.start);
}

let ytPromise: Promise<typeof YT> | undefined;
export function loadYouTube(): Promise<typeof YT> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytPromise)
    ytPromise = new Promise((resolve, reject) => {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.onerror = () => {
        ytPromise = undefined;
        reject(new Error("YouTube could not load. Check your connection."));
      };
      window.onYouTubeIframeAPIReady = () => resolve(window.YT);
      document.head.appendChild(tag);
      setTimeout(() => {
        if (!window.YT?.Player) {
          ytPromise = undefined;
          reject(
            new Error(
              "YouTube took too long to respond. Please reopen the video.",
            ),
          );
        }
      }, 20000);
    });
  return ytPromise;
}
