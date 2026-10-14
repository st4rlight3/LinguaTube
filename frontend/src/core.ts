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
    "http://localhost:8000"
  ).replace(/\/$/, "");
}
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
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
    return JSON.parse(localStorage.getItem("lt." + kind) || "[]");
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
export function asVideo(item: any): Video {
  return {
    id:
      item.id?.videoId ||
      item.contentDetails?.videoId ||
      item.snippet?.resourceId?.videoId ||
      item.id,
    title: item.snippet.title,
    channel: item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle,
    channelId: item.snippet.videoOwnerChannelId || item.snippet.channelId,
    thumbnail:
      item.snippet.thumbnails?.medium?.url ||
      item.snippet.thumbnails?.default?.url ||
      "",
  };
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
