import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  Compass,
  Headphones,
  Heart,
  Home,
  Languages,
  Library,
  LoaderCircle,
  Maximize,
  Mic,
  Moon,
  Play,
  Plus,
  Repeat,
  Search,
  Settings,
  Sun,
  Trash2,
  Upload,
  User,
  Volume2,
  X,
} from "lucide-react";
import {
  activeCue,
  api,
  asVideo,
  backendUrl,
  clock,
  loadYouTube,
  parseTranscript,
  readLocal,
  records,
  remove,
  reviewWord,
  save,
  supabase,
  type Segment,
  type Video,
  type Word,
} from "./core";
import "./style.css";

const copy = {
  en: {
    home: "Home",
    search: "Search",
    library: "Library",
    vocabulary: "Vocabulary",
    profile: "Profile",
    tag: "A LITTLE EVERY DAY",
    title: "Your next word.\nYour next world.",
    intro: "Turn the videos you love into English that stays with you.",
    discover: "Find your next video",
    today: "Make room for a little learning.",
    explore: "Explore your interests",
    popular: "Discover on YouTube",
    saved: "Saved for you",
    empty: "Your learning journey starts here.",
    guest: "Learning on this device",
    signin: "Sign in to sync across devices",
    transcript: "Transcript",
    tools: "Learning tools",
  },
  vi: {
    home: "Trang chủ",
    search: "Tìm kiếm",
    library: "Thư viện",
    vocabulary: "Từ vựng",
    profile: "Tài khoản",
    tag: "MỖI NGÀY MỘT CHÚT",
    title: "Thêm một từ mới.\nMở một thế giới.",
    intro: "Học tiếng Anh bền vững qua những video bạn yêu thích.",
    discover: "Khám phá video",
    today: "Dành một chút thời gian để học.",
    explore: "Khám phá sở thích",
    popular: "Khám phá trên YouTube",
    saved: "Dành cho bạn",
    empty: "Hành trình học bắt đầu tại đây.",
    guest: "Đang học trên thiết bị này",
    signin: "Đăng nhập để đồng bộ",
    transcript: "Bản chép lời",
    tools: "Công cụ học",
  },
};

function PageTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-title">
      <span className="eyebrow muted">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
function Loading() {
  return (
    <div role="status" className="loading">
      <LoaderCircle className="spin" size={23} />
      Loading…
    </div>
  );
}
function Notice({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="notice" role="alert">
      <p>{message}</p>
      {retry && (
        <button className="secondary" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
function Empty({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Search;
  title: string;
  text: string;
}) {
  return (
    <div className="empty">
      <Icon size={30} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function VideoCard({
  video,
  onClick,
  type,
}: {
  video: Video;
  onClick: () => void;
  type?: string;
}) {
  return (
    <button className="video-card" onClick={onClick}>
      <div className="thumbnail">
        {video.thumbnail && <img src={video.thumbnail} alt="" loading="lazy" />}
        <span className="youtube-badge">YouTube{type ? " · " + type : ""}</span>
        <span className="video-play">
          <Play size={20} fill="currentColor" />
        </span>
      </div>
      <h3>{video.title}</h3>
      <p>{video.channel}</p>
    </button>
  );
}

export function Player({
  video,
  queue,
  onNext,
  close,
  notify,
  onSave,
  lang,
  onChannel,
  onFindBilingual,
}: {
  video: Video;
  queue: Video[];
  onNext: (v: Video, q: Video[]) => void;
  close: () => void;
  notify: (s: string) => void;
  onSave: () => void;
  lang: "en" | "vi";
  onChannel?: () => void;
  onFindBilingual?: () => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const player = useRef<YT.Player | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const loop = useRef<{ start: number; end: number } | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [sourceInfo, setSourceInfo] = useState<{
    source: string;
    sourceUrl?: string;
    translationCredit?: string;
  } | null>(null);
  const [sourceStatus, setSourceStatus] = useState("checking");
  const [sourceError, setSourceError] = useState("");
  const [sourceAttempt, setSourceAttempt] = useState(0);
  const sourceRequest = useRef(0);
  const transcriptScroll = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [now, setNow] = useState(0);
  const [playbackState, setPlaybackState] = useState("loading");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("both");
  const [size, setSize] = useState(17);
  const [filter, setFilter] = useState("");
  const [repeating, setRepeating] = useState(false);
  const [selectedWord, setSelectedWord] = useState("");
  const [rights, setRights] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [tab, setTab] = useState("transcript");
  const [hideText, setHideText] = useState(false);
  const [rangeStart, setRangeStart] = useState("0");
  const [rangeEnd, setRangeEnd] = useState("10");
  const [rates, setRates] = useState<number[]>([1]);
  const [favorite, setFavorite] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audio, setAudio] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const micStream = useRef<MediaStream | null>(null);
  const audioUrl = useRef("");
  const cuesRef = useRef(segments);
  useEffect(() => {
    cuesRef.current = segments;
  }, [segments]);
  useEffect(() => {
    let cancelled = false;
    const sourceRevision = ++sourceRequest.current;
    setSourceStatus("checking");
    setSourceError("");
    records("transcript")
      .then(async (rows) => {
        const local = rows.find((r) => r.key === video.id)?.payload;
        if (local?.segments?.length) {
          if (!cancelled && sourceRevision === sourceRequest.current) {
            setSegments(local.segments);
            setSourceInfo({ source: "Your imported transcript" });
            setSourceStatus("available");
          }
          return;
        }
        const published = await api("/transcripts/" + video.id);
        if (cancelled || sourceRevision !== sourceRequest.current) return;
        if (published.available) {
          setSegments(published.segments);
          setSourceInfo(published);
          setSourceStatus("available");
        } else setSourceStatus("unavailable");
      })
      .catch((e) => {
        if (!cancelled && sourceRevision === sourceRequest.current) {
          setSourceStatus("error");
          setSourceError(e.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [video.id, sourceAttempt]);
  useEffect(() => {
    let cancelled = false;
    records("favorite")
      .then((rows) => {
        if (!cancelled) setFavorite(rows.some((r) => r.key === video.id));
      })
      .catch((e) => notify(e.message));
    loadYouTube()
      .then((Y) => {
        if (cancelled || !holder.current) return;
        const mount = document.createElement("div");
        holder.current.appendChild(mount);
        player.current = new Y.Player(mount, {
          videoId: video.id,
          width: "100%",
          height: "100%",
          playerVars: {
            controls: 1,
            playsinline: 1,
            fs: 1,
            origin: window.location.origin,
            rel: 0,
          },
          events: {
            onReady: (event) => {
              setPlaybackState("ready");
              setRates(event.target.getAvailablePlaybackRates());
              const resume = (video as Video & { resumeAt?: number }).resumeAt;
              if (resume) event.target.seekTo(resume, true);
            },
            onStateChange: (event) =>
              setPlaybackState(
                (
                  {
                    1: "playing",
                    2: "paused",
                    3: "buffering",
                    0: "ended",
                    5: "cued",
                  } as Record<number, string>
                )[event.data] || "unstarted",
              ),
            onError: (event) =>
              setError(
                (
                  {
                    2: "This video ID is invalid.",
                    5: "This video cannot play in the current browser.",
                    100: "This video is unavailable.",
                    101: "The creator does not allow embedded playback.",
                    150: "The creator does not allow embedded playback.",
                    153: "YouTube could not verify this player. Try the production HTTPS app or an updated Android WebView.",
                  } as Record<number, string>
                )[event.data] ||
                  "YouTube playback failed. Please try another video.",
              ),
          },
        });
      })
      .catch((e) => setError(e.message));
    const timer = setInterval(() => {
      const p = player.current;
      if (p?.getCurrentTime && p.getPlayerState?.() === 1) {
        const current = p.getCurrentTime();
        setElapsed(Math.floor(current));
        setNow((previous) =>
          activeCue(cuesRef.current, previous) ===
          activeCue(cuesRef.current, current)
            ? previous
            : current,
        );
        if (loop.current && current >= loop.current.end)
          p.seekTo(loop.current.start, true);
      }
    }, 250);
    const lifecycle = NativeApp.addListener(
      "appStateChange",
      ({ isActive }) => {
        if (!isActive) player.current?.pauseVideo?.();
      },
    );
    const visibility = () => {
      if (document.hidden) player.current?.pauseVideo?.();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelled = true;
      clearInterval(timer);
      lifecycle.then((h) => h.remove());
      document.removeEventListener("visibilitychange", visibility);
      const position = player.current?.getCurrentTime?.();
      if (position && position > 0) {
        save("history", video.id, {
          ...video,
          resumeAt: position,
          watchedAt: Date.now(),
        }).catch((e) => notify(e.message));
        save("progress", video.id, { position, updatedAt: Date.now() }).catch(
          (e) => notify(e.message),
        );
      }
      player.current?.destroy();
      player.current = null;
      micStream.current?.getTracks().forEach((t) => t.stop());
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    };
  }, [video.id, notify]);
  const active = activeCue(segments, now);
  useEffect(() => {
    if (!autoScroll) return;
    const box = transcriptScroll.current;
    const cue = box?.querySelector<HTMLElement>(".cue.current");
    if (box && cue)
      box.scrollTo({
        top:
          box.scrollTop +
          cue.getBoundingClientRect().top -
          box.getBoundingClientRect().top -
          box.clientHeight / 3,
        behavior: "smooth",
      });
  }, [active, autoScroll]);
  async function uploadVietnamese(file?: File) {
    if (!file || !rights) return;
    try {
      if (file.size > 250000)
        throw new Error("Transcript files must be smaller than 250 KB.");
      const vi = parseTranscript(await file.text());
      if (
        vi.length !== segments.length ||
        vi.some(
          (s, i) =>
            Math.abs(s.start - segments[i].start) > 0.5 ||
            Math.abs(s.end - segments[i].end) > 0.5,
        )
      )
        throw new Error(
          "Vietnamese timestamps must match the English transcript (within 0.5 seconds).",
        );
      const combined = segments.map((s, i) => ({ ...s, vi: vi[i].en }));
      await save("transcript", video.id, {
        segments: combined,
        source: "user-upload",
      });
      setSegments(combined);
      notify("Authorized Vietnamese transcript paired and saved.");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  function seek(seconds: number) {
    player.current?.seekTo?.(seconds, true);
    player.current?.playVideo?.();
  }
  async function upload(file?: File) {
    if (!file) return;
    if (!rights) {
      notify("Confirm that you have permission to use this transcript.");
      return;
    }
    if (file.size > 250000) {
      notify("Transcript files must be smaller than 250 KB.");
      return;
    }
    try {
      const result = { segments: parseTranscript(await file.text()) };
      await save("transcript", video.id, {
        segments: result.segments,
        source: "user-upload",
      });
      sourceRequest.current++;
      setSegments(result.segments);
      setSourceInfo({ source: "Your imported transcript" });
      setSourceStatus("available");
      notify("Transcript imported. Tap any sentence to listen.");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function translate() {
    setTranslating(true);
    try {
      const translated = [...segments];
      for (let start = 0; start < translated.length;) {
        if (translated[start].vi) {
          start++;
          continue;
        }
        const batch: Segment[] = [];
        let length = 0;
        while (start + batch.length < translated.length && batch.length < 50) {
          const s = translated[start + batch.length];
          if (s.en.length > 6000)
            throw new Error(
              "A transcript sentence exceeds the translation limit.",
            );
          if (length + s.en.length > 6000 || s.vi) break;
          batch.push(s);
          length += s.en.length;
        }
        const result = await api<{ texts: string[] }>("/translate", {
          method: "POST",
          body: JSON.stringify({
            texts: batch.map((s) => s.en),
            source: "en",
            target: "vi",
          }),
        });
        batch.forEach((s, i) => {
          translated[start + i] = { ...s, vi: result.texts[i] };
        });
        start += batch.length;
        await save("transcript", video.id, {
          segments: translated,
          source: "user-upload",
        });
        setSegments([...translated]);
      }
      await save("transcript", video.id, {
        segments: translated,
        source: "user-upload",
      });
      setSegments(translated);
      notify("Vietnamese translation saved.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setTranslating(false);
    }
  }
  async function bookmark(s: Segment) {
    try {
      await save("bookmark", `${video.id}:${s.id}`, { ...s, video });
      notify("Sentence bookmarked.");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function record() {
    if (recording) {
      recorder.current?.stop();
      setRecording(false);
      return;
    }
    if (Capacitor.isNativePlatform()) {
      notify(
        "Microphone recording is available in the HTTPS web app. On Android, use listen–pause–repeat practice below.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.current = stream;
      const r = new MediaRecorder(stream);
      recorder.current = r;
      const chunks: BlobPart[] = [];
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
        audioUrl.current = URL.createObjectURL(
          new Blob(chunks, { type: r.mimeType }),
        );
        setAudio(audioUrl.current);
        stream.getTracks().forEach((t) => t.stop());
      };
      r.start();
      setRecording(true);
      setTimeout(() => {
        if (r.state === "recording") {
          r.stop();
          setRecording(false);
        }
      }, 60000);
    } catch {
      notify(
        "Microphone access is unavailable. You can still listen, pause and repeat aloud.",
      );
    }
  }
  return (
    <div className="player-page" data-subtitle-state={sourceStatus}>
      <button className="text-button" onClick={close}>
        <ArrowLeft size={17} />
        Back to discovery
      </button>
      <div className="learning-layout">
        <section className="watch-panel">
          <div
            className="player-frame"
            ref={container}
            data-playback-state={playbackState}
            data-playback-seconds={elapsed}
          >
            <div ref={holder} className="youtube-player" />
          </div>
          {error && <Notice message={error} />}
          {segments.length === 0 && (
            <div className="subtitle-ready" role="status">
              {sourceStatus === "checking"
                ? lang === "vi"
                  ? "Đang kiểm tra nguồn phụ đề…"
                  : "Checking authorized subtitle sources…"
                : sourceStatus === "error"
                  ? lang === "vi"
                    ? "Chưa kiểm tra được nguồn phụ đề. Xem chi tiết và thử lại bên dưới."
                    : "Subtitle source check failed. See details and retry below."
                  : lang === "vi"
                    ? "Chưa có nguồn phụ đề được cấp quyền cho video này. CC của YouTube là tính năng riêng."
                    : "No authorized companion source for this video. YouTube CC is separate."}
            </div>
          )}
          {segments.length > 0 && active < 0 && (
            <div className="subtitle-ready">
              {lang === "vi"
                ? "Phụ đề đã sẵn sàng · nhấn câu trong bảng để bắt đầu"
                : "Subtitles ready · tap a sentence in the transcript to begin"}
            </div>
          )}
          {active >= 0 && (
            <div
              className="current-subtitles"
              style={{ fontSize: size }}
              aria-label="Synchronized bilingual subtitles"
            >
              {mode !== "vi" && <p>{segments[active].en}</p>}
              {mode !== "en" && (
                <p className="subtitle-vi">
                  {segments[active].vi ||
                    "Vietnamese translation not available for this sentence."}
                </p>
              )}
            </div>
          )}
          <div className="video-info">
            <h1>{video.title}</h1>
            <p>
              {video.views != null &&
                `${Number(video.views).toLocaleString()} views · `}
              {video.publishedAt &&
                new Date(video.publishedAt).toLocaleDateString()}
            </p>
            <button
              className="watch-channel"
              onClick={onChannel}
              disabled={!onChannel || !video.channelId}
            >
              <span className="channel-monogram">
                {video.channel?.slice(0, 1)}
              </span>
              <b>{video.channel}</b>
              <ChevronRight size={18} />
            </button>
            {video.description && (
              <details className="video-description">
                <summary>Description</summary>
                <p>{video.description}</p>
              </details>
            )}
          </div>
          <div className="player-actions">
            <button
              className={favorite ? "primary" : "secondary"}
              onClick={async () => {
                try {
                  if (favorite) await remove("favorite", video.id);
                  else await save("favorite", video.id, video);
                  setFavorite(!favorite);
                  onSave();
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            >
              <Heart size={17} /> {favorite ? "Saved" : "Save"}
            </button>
            <button
              className="secondary"
              onClick={() =>
                player.current?.getPlayerState?.() === 1
                  ? player.current.pauseVideo()
                  : player.current?.playVideo?.()
              }
            >
              <Play size={16} />
              Play / pause
            </button>
            <select
              aria-label="Playback speed"
              onChange={(e) =>
                player.current?.setPlaybackRate(Number(e.target.value))
              }
            >
              {rates.map((rate) => (
                <option value={rate} key={rate}>
                  {rate}× speed
                </option>
              ))}
            </select>
            <button
              className="secondary"
              onClick={() => {
                if (container.current?.requestFullscreen)
                  container.current
                    .requestFullscreen()
                    .catch(() =>
                      notify(
                        "Use the fullscreen control inside the YouTube player.",
                      ),
                    );
                else
                  notify(
                    "Use the fullscreen control inside the YouTube player.",
                  );
              }}
            >
              <Maximize size={17} />
              Fullscreen
            </button>
          </div>
          <p className="quality-note">
            Quality is managed by YouTube. Use its settings menu when available.
            HD, QHD and 4K depend on the video, device and connection; actual
            resolution is unverified.
          </p>
          {queue.length > 1 && (
            <div className="queue">
              <h3>Up next</h3>
              {queue
                .filter((v) => v.id !== video.id)
                .slice(0, 4)
                .map((v) => (
                  <button
                    className="queue-item"
                    key={v.id}
                    onClick={() => onNext(v, queue)}
                  >
                    <img src={v.thumbnail} alt="" />
                    <span>{v.title}</span>
                    <Play size={18} />
                  </button>
                ))}
            </div>
          )}
        </section>
        <section className="transcript-panel">
          <div className="tabs">
            <button
              className={tab === "transcript" ? "active" : ""}
              onClick={() => setTab("transcript")}
            >
              <Languages size={17} />
              {copy[lang].transcript}
            </button>
            <button
              className={tab === "tools" ? "active" : ""}
              onClick={() => setTab("tools")}
            >
              <Headphones size={17} />
              {copy[lang].tools}
            </button>
          </div>
          {tab === "transcript" ? (
            <>
              {sourceInfo && (
                <div className="caption-source">
                  <b>{sourceInfo.source}</b>
                  {sourceInfo.sourceUrl && (
                    <a
                      href={sourceInfo.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Source
                    </a>
                  )}
                  {sourceInfo.translationCredit && (
                    <small>{sourceInfo.translationCredit}</small>
                  )}
                </div>
              )}
              <div className="transcript-options">
                <select
                  aria-label="Transcript language"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  <option value="both">English + Vietnamese</option>
                  <option value="en">English only</option>
                  <option value="vi">Vietnamese only</option>
                </select>
                <label className="font-size">
                  Aa{" "}
                  <input
                    aria-label="Transcript text size"
                    type="range"
                    min="14"
                    max="24"
                    value={size}
                    onChange={(e) => setSize(Number(e.target.value))}
                  />
                </label>
              </div>
              {segments.length > 0 ? (
                <>
                  <input
                    className="transcript-search"
                    aria-label="Find in transcript"
                    placeholder="Find a word or sentence…"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                  <label className="follow-transcript">
                    <input
                      type="checkbox"
                      checked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                    />{" "}
                    Follow current sentence
                  </label>
                  <div
                    ref={transcriptScroll}
                    className="transcript-scroll"
                    style={{ fontSize: size }}
                  >
                    {segments
                      .map((s, i) => ({ s, i }))
                      .filter(({ s }) =>
                        (s.en + " " + s.vi)
                          .toLowerCase()
                          .includes(filter.toLowerCase()),
                      )
                      .map(({ s, i }) => (
                        <div
                          className={"cue " + (i === active ? "current" : "")}
                          key={s.id}
                        >
                          <button
                            className="timestamp"
                            onClick={() => seek(s.start)}
                          >
                            {clock(s.start)}
                          </button>
                          <div className="cue-text">
                            {mode !== "vi" && (
                              <p>
                                {s.en.split(/(\s+)/).map((word, index) =>
                                  /\w/.test(word) ? (
                                    <button
                                      className="word"
                                      key={index}
                                      onClick={() =>
                                        setSelectedWord(
                                          word.replace(/[^a-zA-Z'-]/g, ""),
                                        )
                                      }
                                    >
                                      {word}
                                    </button>
                                  ) : (
                                    word
                                  ),
                                )}
                              </p>
                            )}
                            {mode !== "en" && (
                              <button
                                className="translation sentence-translation"
                                aria-label={`Seek to sentence ${clock(s.start)}`}
                                onClick={() => seek(s.start)}
                              >
                                {s.vi ||
                                  "Vietnamese translation not added yet."}
                              </button>
                            )}
                            <div className="cue-actions">
                              <button
                                aria-label="Play sentence"
                                onClick={() => seek(s.start)}
                              >
                                <Play size={14} />
                              </button>
                              <button
                                aria-label="Repeat sentence"
                                className={
                                  repeating && loop.current?.start === s.start
                                    ? "selected"
                                    : ""
                                }
                                onClick={() => {
                                  loop.current = { start: s.start, end: s.end };
                                  setRepeating(true);
                                  seek(s.start);
                                }}
                              >
                                <Repeat size={14} />
                              </button>
                              <button
                                aria-label="Bookmark sentence"
                                onClick={() => bookmark(s)}
                              >
                                <Bookmark size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                  <div className="transcript-footer">
                    <button
                      className="text-button"
                      disabled={translating}
                      onClick={translate}
                    >
                      {translating ? (
                        <LoaderCircle className="spin" size={16} />
                      ) : (
                        <Languages size={16} />
                      )}
                      Translate to Vietnamese
                    </button>
                    {repeating && (
                      <button
                        className="text-button"
                        onClick={() => {
                          loop.current = null;
                          setRepeating(false);
                        }}
                      >
                        Stop repeat
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Empty
                    icon={Languages}
                    title={
                      sourceStatus === "checking"
                        ? "Checking subtitle source…"
                        : sourceStatus === "error"
                          ? lang === "vi"
                            ? "Chưa kiểm tra được nguồn phụ đề"
                            : "Could not check subtitle source"
                          : lang === "vi"
                            ? "Chưa có nguồn phụ đề được cấp quyền"
                            : "No authorized subtitle source connected"
                    }
                    text={
                      sourceStatus === "error"
                        ? sourceError
                        : sourceStatus === "checking"
                          ? lang === "vi"
                            ? "Đang tìm bản chép lời được phép sử dụng cho video này."
                            : "Looking for a transcript LinguaTube is allowed to use for this video."
                          : lang === "vi"
                            ? "Điều này không có nghĩa video không có phụ đề. API YouTube chỉ cho tải phụ đề khi có quyền chỉnh sửa video. LinguaTube chưa có nguồn được cấp phép cho mọi video; bạn có thể nhập SRT/VTT mà bạn được phép dùng. CC trong trình phát YouTube là tính năng riêng, không phải phụ đề song ngữ của LinguaTube."
                            : "This does not mean the video has no captions. YouTube caption downloads require permission to edit the video. LinguaTube has no licensed source covering every video; you can import an SRT/VTT you are allowed to use. The player's YouTube CC is separate, not LinguaTube bilingual subtitles."
                    }
                  />
                  {sourceStatus !== "checking" && (
                    <button
                      className="secondary"
                      onClick={() => setSourceAttempt((n) => n + 1)}
                    >
                      {lang === "vi"
                        ? "Kiểm tra lại nguồn phụ đề"
                        : "Retry subtitle source"}
                    </button>
                  )}
                  {sourceStatus !== "checking" && onFindBilingual && (
                    <button
                      className="primary find-bilingual"
                      onClick={onFindBilingual}
                    >
                      {lang === "vi"
                        ? "Xem video có phụ đề EN + VI"
                        : "Browse videos with EN + VI"}
                    </button>
                  )}
                </>
              )}
              <div className="upload-box">
                <label>
                  <input
                    type="checkbox"
                    checked={rights}
                    onChange={(e) => setRights(e.target.checked)}
                  />
                  I own this transcript or have permission to use it.
                </label>
                <label
                  className={
                    "secondary upload-button " + (!rights ? "disabled" : "")
                  }
                >
                  <Upload size={16} />
                  Import SRT / VTT
                  <input
                    aria-label="Import transcript"
                    type="file"
                    accept=".srt,.vtt"
                    disabled={!rights}
                    onChange={(e) => {
                      upload(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                {segments.length > 0 && (
                  <label className="secondary upload-button">
                    <Languages size={16} /> Import Vietnamese SRT / VTT
                    <input
                      aria-label="Import Vietnamese transcript"
                      type="file"
                      accept=".srt,.vtt"
                      disabled={!rights}
                      onChange={(e) => {
                        uploadVietnamese(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            </>
          ) : (
            <div className="learning-tools">
              <h3>Listen. Pause. Say it your way.</h3>
              <p>
                Practice with the current sentence, then repeat it aloud. Your
                recording stays on this device and is discarded when you leave.
              </p>
              <button
                className="secondary"
                onClick={() => setHideText(!hideText)}
              >
                {hideText ? "Reveal sentence" : "Hide sentence for listening"}
              </button>
              <blockquote>
                {hideText
                  ? "Listen carefully…"
                  : segments[active]?.en ||
                    "Import a transcript to practice a specific sentence."}
              </blockquote>
              <button
                className="primary"
                onClick={() => {
                  if (active >= 0) seek(segments[active].start);
                  else player.current?.playVideo?.();
                }}
              >
                <Volume2 size={18} />
                Listen again
              </button>
              <button className="secondary" onClick={record}>
                <Mic size={17} />
                {recording ? "Stop recording" : "Record your voice (web)"}
              </button>
              {audio && <audio controls src={audio} />}
              <h3>Repeat a range</h3>
              <div className="range-inputs">
                <label>
                  From (seconds)
                  <input
                    type="number"
                    min="0"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                  />
                </label>
                <label>
                  To (seconds)
                  <input
                    type="number"
                    min="1"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                  />
                </label>
              </div>
              <button
                className="secondary"
                onClick={() => {
                  const start = Number(rangeStart),
                    end = Number(rangeEnd);
                  if (
                    !Number.isFinite(start) ||
                    !Number.isFinite(end) ||
                    start < 0 ||
                    end <= start
                  ) {
                    notify("Choose an end time after the start time.");
                    return;
                  }
                  loop.current = { start, end };
                  setRepeating(true);
                  seek(start);
                }}
              >
                <Repeat size={17} />
                Repeat range
              </button>
              {repeating && (
                <button
                  className="text-button"
                  onClick={() => {
                    loop.current = null;
                    setRepeating(false);
                  }}
                >
                  Stop repeat
                </button>
              )}
              <h3>IELTS listening notebook</h3>
              <p>
                Try a first listen without text. Write down key ideas, dates and
                numbers. Reveal the transcript and check what you heard. No
                automatic band score is inferred.
              </p>
            </div>
          )}
        </section>
      </div>
      {selectedWord && (
        <Dictionary
          word={selectedWord}
          close={() => setSelectedWord("")}
          notify={notify}
          onSave={onSave}
        />
      )}
    </div>
  );
}

function Dictionary({
  word,
  close,
  notify,
  onSave,
}: {
  word: string;
  close: () => void;
  notify: (s: string) => void;
  onSave: () => void;
}) {
  const [entry, setEntry] = useState<any>(null);
  const [error, setError] = useState("");
  const [vi, setVi] = useState("");
  useEffect(() => {
    let cancel = false;
    api("/dictionary/" + encodeURIComponent(word))
      .then((data) => {
        if (!cancel) setEntry(data[0]);
      })
      .catch((e) => {
        if (!cancel) setError(e.message);
      });
    return () => {
      cancel = true;
    };
  }, [word]);
  const meaning = entry?.meanings?.[0],
    definition = meaning?.definitions?.[0];
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={"Dictionary: " + word}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close icon-button"
          aria-label="Close dictionary"
          onClick={close}
        >
          <X />
        </button>
        <span className="eyebrow muted">A WORD TO KEEP</span>
        <h2>{word}</h2>
        {error ? (
          <Notice message={error} />
        ) : !entry ? (
          <Loading />
        ) : (
          <>
            <p className="phonetic">
              {entry.phonetic ||
                entry.phonetics?.find((p: any) => p.text)?.text}{" "}
              <i>{meaning?.partOfSpeech}</i>
            </p>
            <p>{definition?.definition}</p>
            {definition?.example && (
              <blockquote>{definition.example}</blockquote>
            )}
            <label>
              Vietnamese meaning
              <input
                value={vi}
                onChange={(e) => setVi(e.target.value)}
                placeholder="Add your own meaning or translate"
              />
            </label>
            <button
              className="text-button"
              onClick={async () => {
                try {
                  const result = await api("/translate", {
                    method: "POST",
                    body: JSON.stringify({
                      texts: [definition?.definition || word],
                      source: "en",
                      target: "vi",
                    }),
                  });
                  setVi(result.texts[0]);
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            >
              <Languages size={16} />
              Translate definition
            </button>
            <button
              className="primary full-width"
              onClick={async () => {
                try {
                  await save("vocabulary", word.toLowerCase(), {
                    word: word.toLowerCase(),
                    definition: definition?.definition || "",
                    vi,
                    phonetic: entry.phonetic || "",
                    part: meaning?.partOfSpeech,
                    example: definition?.example,
                    due: Date.now(),
                    interval: 0,
                    reviews: 0,
                  });
                  notify("Word saved to your vocabulary.");
                  onSave();
                  close();
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            >
              <Plus size={18} />
              Save word
            </button>
            <small className="subtle">
              Dictionary: Free Dictionary API ·{" "}
              <a
                href="https://dictionaryapi.dev/"
                target="_blank"
                rel="noreferrer"
              >
                Source
              </a>
            </small>
          </>
        )}
      </section>
    </div>
  );
}

export function Vocabulary({
  words,
  refresh,
  notify,
}: {
  words: Word[];
  refresh: () => void;
  notify: (s: string) => void;
}) {
  const [review, setReview] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [word, setWord] = useState("");
  const [definition, setDefinition] = useState("");
  const due = words.filter((w) => w.due <= Date.now());
  const current = due[0];
  async function grade(value: "again" | "hard" | "good" | "easy") {
    if (!current) return;
    try {
      await save("vocabulary", current.word, reviewWord(current, value));
      setFlipped(false);
      refresh();
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="MAKE NEW WORDS YOUR OWN"
        title="Your vocabulary"
        description="A collection that grows with you. Review little and often."
      />
      <div className="vocab-header">
        <span>
          {words.length} saved words · {due.length} ready to review
        </span>
        <button
          className="primary"
          disabled={!due.length}
          onClick={() => setReview(!review)}
        >
          <Repeat size={17} />
          {review ? "Close review" : "Practice flashcards"}
        </button>
      </div>
      {review && current && (
        <section className="flashcard">
          <span className="eyebrow muted">
            {flipped ? "THE MEANING" : "DO YOU REMEMBER?"}
          </span>
          <h2>{current.word}</h2>
          <p>{current.phonetic}</p>
          {flipped ? (
            <>
              <p>{current.definition}</p>
              <p>{current.vi}</p>
              <div className="review-grades">
                {(["again", "hard", "good", "easy"] as const).map((g) => (
                  <button
                    className="secondary"
                    onClick={() => grade(g)}
                    key={g}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <button className="primary" onClick={() => setFlipped(true)}>
              Show meaning
            </button>
          )}
        </section>
      )}
      {review && !current && (
        <Empty
          icon={Check}
          title="You're caught up"
          text="Your next review will appear when it's due."
        />
      )}
      <form
        className="manual-word"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await save("vocabulary", word.toLowerCase(), {
              word: word.toLowerCase(),
              definition,
              due: Date.now(),
              interval: 0,
              reviews: 0,
            });
            setWord("");
            setDefinition("");
            refresh();
          } catch (e) {
            notify((e as Error).message);
          }
        }}
      >
        <input
          aria-label="New word"
          placeholder="Add a word"
          pattern="[A-Za-z'-]+"
          maxLength={50}
          required
          value={word}
          onChange={(e) => setWord(e.target.value)}
        />
        <input
          aria-label="Word meaning"
          placeholder="Meaning in English or Vietnamese"
          maxLength={1000}
          required
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
        />
        <button className="secondary">
          <Plus size={18} />
          Add
        </button>
      </form>
      {words.map((w) => (
        <div className="word-row" key={w.word}>
          <div>
            <h3>
              {w.word} <small>{w.phonetic}</small>
            </h3>
            <p>{w.definition}</p>
            {w.vi && <p className="translation">{w.vi}</p>}
            <small>
              {w.reviews} reviews ·{" "}
              {w.due <= Date.now()
                ? "Ready to review"
                : "Next: " + new Date(w.due).toLocaleDateString()}
            </small>
          </div>
          <button
            className="icon-button"
            aria-label={"Delete " + w.word}
            onClick={() =>
              remove("vocabulary", w.word)
                .then(refresh)
                .catch((e) => notify(e.message))
            }
          >
            <Trash2 size={17} />
          </button>
        </div>
      ))}
      {!words.length && (
        <Empty
          icon={BookOpen}
          title="Every word opens a door"
          text="Tap a word in a transcript to see its meaning and save it, or add your own above."
        />
      )}
    </>
  );
}

export function Profile({
  recovering,
  email,
  notify,
  lang,
  setLang,
  dark,
  setDark,
  refresh,
}: {
  recovering: boolean;
  email: string;
  notify: (s: string) => void;
  lang: "en" | "vi";
  setLang: (s: "en" | "vi") => void;
  dark: boolean;
  setDark: (b: boolean) => void;
  refresh: () => void;
}) {
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState(recovering ? "update" : "login");
  useEffect(() => {
    if (recovering) setMode("update");
  }, [recovering]);
  const [url, setUrl] = useState(backendUrl());
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  useEffect(() => {
    records("profile")
      .then((rows) =>
        setName(rows.find((r) => r.key === "me")?.payload.name || ""),
      )
      .catch((e) => notify(e.message));
  }, [email, notify]);
  const [status, setStatus] = useState("");
  async function auth(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      notify("Account service needs Supabase configuration in the app build.");
      return;
    }
    setBusy(true);
    try {
      const result =
        mode === "register"
          ? await supabase.auth.signUp({ email: address, password })
          : mode === "reset"
            ? await supabase.auth.resetPasswordForEmail(address, {
                redirectTo: new URL(
                  import.meta.env.BASE_URL,
                  window.location.origin,
                ).href,
              })
            : mode === "update"
              ? await supabase.auth.updateUser({ password })
              : await supabase.auth.signInWithPassword({
                  email: address,
                  password,
                });
      if (result.error) throw result.error;
      notify(
        mode === "register"
          ? "Check your email to confirm your account."
          : mode === "reset"
            ? "If this account exists, a reset link has been sent."
            : mode === "update"
              ? "Password updated."
              : "Welcome back.",
      );
      setPassword("");
      refresh();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const subscription = supabase?.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("update");
    });
    return () => subscription?.data.subscription.unsubscribe();
  }, []);
  return (
    <>
      <PageTitle
        eyebrow="YOUR SPACE, YOUR PACE"
        title="Profile & preferences"
        description="Keep your learning personal, and take it with you."
      />
      <div className="settings-grid">
        <section className="settings-card">
          <h2>
            <User size={21} />
            Your account
          </h2>
          {email ? (
            <>
              <p>
                Signed in as <b>{email}</b>
              </p>
              <label>
                Display name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                />
              </label>
              <button
                className="secondary"
                onClick={() =>
                  save("profile", "me", { name })
                    .then(() => notify("Profile saved."))
                    .catch((e) => notify(e.message))
                }
              >
                Save profile
              </button>
              <button
                className="text-button"
                onClick={() => supabase?.auth.signOut().then(() => refresh())}
              >
                Sign out
              </button>
            </>
          ) : (
            <p className="subtle">
              Guest learning is saved on this device. Sign in to access your
              cloud library on other devices. Guest records remain separate.
            </p>
          )}
          {(!email || mode === "update") && (
            <form onSubmit={auth}>
              {mode !== "update" && (
                <label>
                  Email
                  <input
                    type="email"
                    autoComplete="email"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />
                </label>
              )}
              {mode !== "reset" && (
                <label>
                  Password
                  <input
                    type="password"
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    minLength={10}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </label>
              )}
              <button className="primary" disabled={busy}>
                {busy
                  ? "Please wait…"
                  : mode === "register"
                    ? "Create account"
                    : mode === "reset"
                      ? "Send reset email"
                      : mode === "update"
                        ? "Save new password"
                        : "Sign in"}
              </button>
              <div className="auth-links">
                <button
                  type="button"
                  onClick={() =>
                    setMode(mode === "register" ? "login" : "register")
                  }
                >
                  {mode === "register"
                    ? "Already have an account?"
                    : "Create account"}
                </button>
                <button
                  type="button"
                  onClick={() => setMode(mode === "reset" ? "login" : "reset")}
                >
                  {mode === "reset" ? "Back to sign in" : "Forgot password?"}
                </button>
              </div>
            </form>
          )}
        </section>
        <section className="settings-card">
          <h2>
            <Settings size={21} />
            Make yourself at home
          </h2>
          <label>
            Interface language
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as "en" | "vi")}
            >
              <option value="en">English</option>
              <option value="vi">Tiếng Việt</option>
            </select>
          </label>
          <label className="toggle-row">
            Dark appearance
            <input
              type="checkbox"
              checked={dark}
              onChange={(e) => setDark(e.target.checked)}
            />
          </label>
          <hr />
          <h3>Learning server</h3>
          <p className="subtle">
            Production builds use the configured server. For testing, connect to
            your deployed HTTPS backend.
          </p>
          <input
            aria-label="Backend URL"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            className="secondary"
            onClick={async () => {
              try {
                const parsed = new URL(url);
                if (
                  parsed.protocol !== "https:" &&
                  !(
                    parsed.protocol === "http:" &&
                    ["localhost", "127.0.0.1"].includes(parsed.hostname)
                  )
                )
                  throw new Error("Use HTTPS for a remote learning server.");
                if (
                  parsed.username ||
                  parsed.password ||
                  parsed.search ||
                  parsed.hash
                )
                  throw new Error(
                    "Enter a plain server URL without credentials.",
                  );
                if (import.meta.env.VITE_API_URL)
                  throw new Error(
                    "This build has a fixed server URL. Rebuild to change it.",
                  );
                localStorage.setItem("lt.api", url.replace(/\/$/, ""));
                await api("/health");
                setStatus("Connected successfully.");
              } catch (e) {
                setStatus((e as Error).message);
              }
            }}
          >
            Save & check connection
          </button>
          {status && <p role="status">{status}</p>}
        </section>
        <section className="settings-card">
          <h2>
            <Library size={21} />
            Your data
          </h2>
          <p>
            Export guest learning records as JSON. Account records are isolated
            by your signed-in identity. Deletion permanently removes the account
            and its learning records.
          </p>
          <button
            className="secondary"
            onClick={() => {
              const blob = new Blob(
                [
                  JSON.stringify(
                    Object.fromEntries(
                      [
                        "vocabulary",
                        "favorite",
                        "bookmark",
                        "history",
                        "transcript",
                      ].map((k) => [k, readLocal(k as any)]),
                    ),
                    null,
                    2,
                  ),
                ],
                { type: "application/json" },
              );
              const link = document.createElement("a");
              const href = URL.createObjectURL(blob);
              link.href = href;
              link.download = "linguatube-guest-export.json";
              link.click();
              URL.revokeObjectURL(href);
            }}
          >
            Export guest data
          </button>
          {email && (
            <button
              className="danger"
              onClick={async () => {
                if (
                  !window.confirm(
                    "Permanently delete your account and all cloud learning records? This cannot be undone.",
                  )
                )
                  return;
                try {
                  await api("/account", { method: "DELETE" });
                  await supabase?.auth.signOut();
                  notify("Account deleted.");
                  refresh();
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            >
              Delete account
            </button>
          )}
          <details>
            <summary>Privacy & YouTube</summary>
            <p>
              Video playback connects directly to YouTube and is subject to its{" "}
              <a
                href="https://www.youtube.com/t/terms"
                target="_blank"
                rel="noreferrer"
              >
                Terms
              </a>{" "}
              and{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noreferrer"
              >
                Google Privacy Policy
              </a>
              . Uploaded text is sent to your configured learning server and to
              its translation provider only when you request translation.
              Microphone recordings stay in memory on this device. LinguaTube
              does not download YouTube video or audio.
            </p>
          </details>
        </section>
      </div>
    </>
  );
}
