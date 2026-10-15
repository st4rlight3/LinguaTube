import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Home,
  Search,
  User,
  Play,
  ListVideo,
  Radio,
  ArrowLeft,
  Languages,
  Moon,
  Sun,
  Settings,
  Clock,
  Bookmark,
  BookOpen,
  X,
  RefreshCw,
} from "lucide-react";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import {
  api,
  asVideo,
  records,
  save,
  supabase,
  type Video,
  type Word,
} from "./core";
import { Player, Profile, Vocabulary } from "./learning";

type Page =
  | "home"
  | "shorts"
  | "subscriptions"
  | "you"
  | "search"
  | "channel"
  | "playlist"
  | "settings"
  | "vocabulary";
const labels = {
  en: {
    home: "Home",
    shorts: "Shorts",
    subscriptions: "Subscriptions",
    you: "You",
    search: "Search",
  },
  vi: {
    home: "Trang chủ",
    shorts: "Shorts",
    subscriptions: "Kênh đăng ký",
    you: "Bạn",
    search: "Tìm kiếm",
  },
};
const navigation = [
  { id: "home", icon: Home },
  { id: "shorts", icon: Play },
  { id: "subscriptions", icon: Radio },
  { id: "you", icon: User },
  { id: "search", icon: Search },
] as const;
const topics = [
  { name: "All", vi: "Tất cả", category: "0" },
  { name: "EN + VI", vi: "EN + VI", category: "bilingual" },
  { name: "Music", vi: "Âm nhạc", category: "10" },
  {
    name: "Everyday English",
    vi: "Tiếng Anh hằng ngày",
    query: "English everyday conversation",
  },
  { name: "Science & technology", vi: "Khoa học & công nghệ", category: "28" },
  { name: "Education", vi: "Giáo dục", category: "27" },
  { name: "People & stories", vi: "Con người & câu chuyện", category: "22" },
];
function stored<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
export function videoDuration(value?: string) {
  const m = value?.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return "";
  return m[1]
    ? `${m[1]}:${(m[2] || "0").padStart(2, "0")}:${(m[3] || "0").padStart(2, "0")}`
    : `${Number(m[2] || 0)}:${(m[3] || "0").padStart(2, "0")}`;
}
function metadata(v: Video) {
  return [
    v.views !== undefined ? `${Number(v.views).toLocaleString()} views` : null,
    v.publishedAt ? new Date(v.publishedAt).toLocaleDateString() : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
export function FeedCard({
  video,
  onClick,
  type,
}: {
  video: Video;
  onClick: () => void;
  type?: string;
}) {
  return (
    <button
      className={"feed-card " + (type === "Channel" ? "channel-card" : "")}
      onClick={onClick}
      aria-label={`YouTube ${type ? type + " " : ""}${video.title} ${video.channel || ""}`}
    >
      <div className="feed-thumbnail">
        {video.bilingualAvailable && (
          <span className="bilingual-badge">EN + VI</span>
        )}
        {video.thumbnail ? (
          <img src={video.thumbnail} alt="" loading="lazy" />
        ) : (
          <span>Thumbnail unavailable</span>
        )}
        {(type || videoDuration(video.duration)) && (
          <span className="duration-badge">
            {type || videoDuration(video.duration)}
          </span>
        )}
      </div>
      <div className="feed-details">
        <span className="channel-monogram" aria-hidden="true">
          {(video.channel || video.title).slice(0, 1)}
        </span>
        <div>
          <h3>{video.title}</h3>
          <p>{video.channel}</p>
          <p>{metadata(video)}</p>
          <small>YouTube</small>
        </div>
      </div>
    </button>
  );
}
export function Platform() {
  const [lang, setLang] = useState<"en" | "vi">(() =>
    localStorage.getItem("lt.lang") === "vi" ? "vi" : "en",
  );
  const [dark, setDark] = useState(
    () => localStorage.getItem("lt.dark") !== "false",
  );
  const t = labels[lang];
  const tr = (en: string, vi: string) => (lang === "vi" ? vi : en);
  const [page, setPage] = useState<Page>("home");
  const [video, setVideo] = useState<Video | null>(null);
  const [queue, setQueue] = useState<Video[]>([]);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("video");
  const [duration, setDuration] = useState("any");
  const [order, setOrder] = useState("relevance");
  const [items, setItems] = useState<any[]>([]);
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedPath, setFeedPath] = useState("/youtube/popular?category=0");
  const [topic, setTopic] = useState("All");
  const [channel, setChannel] = useState<any>(null);
  const [listTitle, setListTitle] = useState("");
  const [channelTab, setChannelTab] = useState<"videos" | "playlists">(
    "videos",
  );
  const [recent, setRecent] = useState<string[]>(() =>
    stored("lt.searches", []),
  );
  const [follows, setFollows] = useState<string[]>(() =>
    stored("lt.followedChannels", []),
  );
  const [history, setHistory] = useState<Video[]>([]);
  const [saved, setSaved] = useState<Video[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [email, setEmail] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [toast, setToast] = useState("");
  const request = useRef(0);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const notify = useCallback((message: string) => {
    setToast(message);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setToast(""), 6000);
  }, []);
  const refresh = useCallback(async () => {
    try {
      const [h, f, w] = await Promise.all([
        records("history"),
        records("favorite"),
        records("vocabulary"),
      ]);
      setHistory(h.map((r) => r.payload));
      setSaved(f.map((r) => r.payload));
      setWords(w.map((r) => r.payload));
    } catch (e) {
      notify((e as Error).message);
    }
  }, [notify]);
  const load = useCallback(async (path: string, token = "") => {
    const id = ++request.current;
    setBusy(true);
    setError("");
    if (!token) {
      setItems([]);
      setNext("");
    }
    setFeedPath(path);
    try {
      const result = await api(
        path +
          (path.includes("?") ? "&" : "?") +
          "page=" +
          encodeURIComponent(token),
      );
      if (id !== request.current) return;
      setItems((old) =>
        token ? [...old, ...result.items] : result.items || [],
      );
      setNext(result.nextPageToken || "");
    } catch (e) {
      if (id === request.current) setError((e as Error).message);
    } finally {
      if (id === request.current) setBusy(false);
    }
  }, []);
  useEffect(() => {
    load("/youtube/popular?category=0");
    refresh();
    return () => {
      request.current++;
      clearTimeout(noticeTimer.current);
    };
  }, [load, refresh]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("lt.dark", String(dark));
  }, [dark]);
  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem("lt.lang", lang);
  }, [lang]);
  useEffect(() => {
    supabase?.auth
      .getSession()
      .then(({ data }) => setEmail(data.session?.user.email || ""));
    const sub = supabase?.auth.onAuthStateChange((event, session) => {
      setEmail(session?.user.email || "");
      if (event === "PASSWORD_RECOVERY") {
        setRecovering(true);
        setVideo(null);
        setPage("settings");
      }
      setTimeout(refresh, 0);
    });
    return () => sub?.data.subscription.unsubscribe();
  }, [refresh]);
  function navigate(p: Page) {
    request.current++;
    setBusy(false);
    setError("");
    setVideo(null);
    setPage(p);
    setItems([]);
    setNext("");
    if (p === "home") {
      setTopic("All");
      load("/youtube/popular?category=0");
    }
    refresh();
    window.scrollTo(0, 0);
  }
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = NativeApp.addListener("backButton", () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
        return;
      }
      if (video) {
        setVideo(null);
        refresh();
      } else if (page !== "home") navigate("home");
      else NativeApp.exitApp();
    });
    return () => {
      listener.then((h) => h.remove());
    };
  }, [page, video, refresh]);
  function search(term: string) {
    if (!term.trim()) return;
    setPage("search");
    setVideo(null);
    setQuery(term);
    const r = [term, ...recent.filter((q) => q !== term)].slice(0, 12);
    setRecent(r);
    localStorage.setItem("lt.searches", JSON.stringify(r));
    load(
      `/youtube/search?q=${encodeURIComponent(term)}&kind=${kind}&duration=${duration}&order=${order}`,
    );
  }
  function openVideo(
    v: Video,
    q: Video[] = items
      .filter((i) => !i.id?.channelId && !i.id?.playlistId)
      .map(asVideo),
  ) {
    setVideo(v);
    setQueue(q);
    save("history", v.id, { ...v, watchedAt: Date.now() }).catch((e) =>
      notify(e.message),
    );
    window.scrollTo(0, 0);
  }
  async function openChannel(id: string) {
    const rid = ++request.current;
    setVideo(null);
    setPage("channel");
    setChannel(null);
    setItems([]);
    setNext("");
    setError("");
    setBusy(true);
    setChannelTab("videos");
    try {
      const data = await api("/youtube/channels/" + encodeURIComponent(id));
      if (rid !== request.current) return;
      const ch = data.items?.[0];
      if (!ch) throw new Error("Channel unavailable.");
      setChannel(ch);
      await load(
        "/youtube/playlists/" + ch.contentDetails.relatedPlaylists.uploads,
      );
    } catch (e) {
      if (rid === request.current) {
        setError((e as Error).message);
        setBusy(false);
      }
    }
  }
  function openItem(item: any) {
    if (item.id?.channelId) openChannel(item.id.channelId);
    else if (item.id?.playlistId) {
      setPage("playlist");
      setListTitle(item.snippet.title);
      load("/youtube/playlists/" + item.id.playlistId);
    } else openVideo(asVideo(item));
  }
  function toggleFollow() {
    const id = channel.id;
    const value = follows.includes(id)
      ? follows.filter((i) => i !== id)
      : [...follows, id];
    setFollows(value);
    localStorage.setItem("lt.followedChannels", JSON.stringify(value));
  }
  const renderFeed = () => (
    <>
      {error && (
        <div className="platform-error" role="alert">
          <h2>{tr("Videos could not load", "Không tải được video")}</h2>
          <p>{error}</p>
          <button className="secondary" onClick={() => load(feedPath)}>
            <RefreshCw size={18} /> {tr("Try again", "Thử lại")}
          </button>
          <button className="secondary" onClick={() => navigate("settings")}>
            {tr("Service settings", "Cấu hình dịch vụ")}
          </button>
        </div>
      )}
      <div className={page === "search" ? "feed search-results" : "feed"}>
        {items.map((item, index) => (
          <FeedCard
            key={JSON.stringify(item.id) + index}
            video={asVideo(item)}
            type={
              item.id?.channelId
                ? "Channel"
                : item.id?.playlistId
                  ? "Playlist"
                  : undefined
            }
            onClick={() => openItem(item)}
          />
        ))}
      </div>
      {busy && (
        <div className="feed-status" role="status">
          {tr("Loading videos…", "Đang tải video…")}
        </div>
      )}
      {!busy && !error && items.length === 0 && (
        <div className="feed-status">
          {tr(
            "No videos to show. Try a different search or filter.",
            "Không có video. Hãy thử tìm kiếm hoặc bộ lọc khác.",
          )}
        </div>
      )}
      {next && !busy && (
        <button
          className="secondary load-more"
          onClick={() => load(feedPath, next)}
        >
          {tr("More videos", "Thêm video")}
        </button>
      )}
    </>
  );
  return (
    <div className="platform">
      <header className="platform-header">
        <button
          className="platform-brand"
          onClick={() => navigate("home")}
          aria-label="LinguaTube home"
        >
          <span className="lt-mark">L</span>LinguaTube
        </button>
        <div className="header-tools">
          <button aria-label="Search videos" onClick={() => navigate("search")}>
            <Search />
          </button>
          <button
            aria-label="Switch language"
            onClick={() => setLang(lang === "en" ? "vi" : "en")}
          >
            <Languages />
            <small>{lang.toUpperCase()}</small>
          </button>
          <button aria-label="Toggle theme" onClick={() => setDark(!dark)}>
            {dark ? <Sun /> : <Moon />}
          </button>
        </div>
      </header>
      <nav className="platform-nav" aria-label="Main navigation">
        {navigation.map((n) => (
          <button
            key={n.id}
            aria-current={!video && page === n.id ? "page" : undefined}
            onClick={() => navigate(n.id)}
          >
            <n.icon size={22} />
            <span>{t[n.id]}</span>
          </button>
        ))}
      </nav>
      <main className="platform-main">
        {video ? (
          <>
            <Player
              key={video.id}
              video={video}
              queue={[]}
              onNext={openVideo}
              close={() => {
                setVideo(null);
                refresh();
              }}
              notify={notify}
              onSave={refresh}
              lang={lang}
              onChannel={() => openChannel(video.channelId)}
              onFindBilingual={() => {
                setVideo(null);
                setPage("home");
                setTopic("EN + VI");
                load("/youtube/bilingual");
              }}
            />
            <Related video={video} queue={queue} open={openVideo} />
          </>
        ) : (
          <>
            {page === "home" && (
              <>
                <div className="topic-strip" aria-label="Video topics">
                  {topics.map((c) => (
                    <button
                      key={c.name}
                      aria-pressed={topic === c.name}
                      onClick={() => {
                        setTopic(c.name);
                        load(
                          c.query
                            ? `/youtube/search?q=${encodeURIComponent(c.query)}`
                            : c.category === "bilingual"
                              ? "/youtube/bilingual"
                              : `/youtube/popular?category=${c.category}`,
                        );
                      }}
                    >
                      {lang === "vi" ? c.vi : c.name}
                    </button>
                  ))}
                </div>
                <div className="feed-context">
                  {tr("Discover · YouTube videos", "Khám phá · Video YouTube")}
                  <span>
                    {tr(
                      "Public discovery, not personalized",
                      "Khám phá công khai, không cá nhân hóa",
                    )}
                  </span>
                </div>
                {renderFeed()}
              </>
            )}
            {page === "search" && (
              <section className="search-screen">
                <form
                  className="platform-search"
                  onSubmit={(e) => {
                    e.preventDefault();
                    search(query);
                  }}
                >
                  <Search />
                  <input
                    autoFocus
                    aria-label="Search query"
                    placeholder={tr(
                      "Search videos, channels, playlists",
                      "Tìm video, kênh, danh sách phát",
                    )}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    maxLength={200}
                    list="recent-searches"
                    required
                  />
                  <button aria-label="Submit search">
                    <ArrowLeft className="search-arrow" />
                  </button>
                </form>
                <datalist id="recent-searches">
                  {recent
                    .filter((q) =>
                      q.toLowerCase().includes(query.toLowerCase()),
                    )
                    .map((q) => (
                      <option key={q} value={q} />
                    ))}
                </datalist>
                {recent.length > 0 && (
                  <div className="recent-searches">
                    <small>
                      {tr(
                        "Suggestions from your search history",
                        "Gợi ý từ lịch sử tìm kiếm của bạn",
                      )}
                    </small>
                    {recent
                      .filter((q) =>
                        q.toLowerCase().includes(query.toLowerCase()),
                      )
                      .slice(0, 5)
                      .map((q) => (
                        <button key={q} onClick={() => search(q)}>
                          <Clock size={17} />
                          {q}
                        </button>
                      ))}
                    <button
                      onClick={() => {
                        setRecent([]);
                        localStorage.removeItem("lt.searches");
                      }}
                    >
                      {tr("Clear history", "Xóa lịch sử tìm kiếm")}
                    </button>
                  </div>
                )}
                <div className="platform-filters">
                  <select
                    aria-label="Result type"
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                  >
                    <option value="video">Videos</option>
                    <option value="channel">Channels</option>
                    <option value="playlist">Playlists</option>
                  </select>
                  {kind === "video" && (
                    <select
                      aria-label="Video length"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    >
                      <option value="any">Any duration</option>
                      <option value="short">Under 4 minutes</option>
                      <option value="medium">4–20 minutes</option>
                      <option value="long">Over 20 minutes</option>
                    </select>
                  )}
                  <select
                    aria-label="Sort results"
                    value={order}
                    onChange={(e) => setOrder(e.target.value)}
                  >
                    <option value="relevance">Relevance</option>
                    <option value="date">Upload date</option>
                    <option value="viewCount">View count</option>
                  </select>
                  <button
                    className="secondary"
                    disabled={!query.trim()}
                    onClick={() => search(query)}
                  >
                    {tr("Apply", "Áp dụng")}
                  </button>
                </div>
                {renderFeed()}
              </section>
            )}
            {page === "channel" && (
              <>
                {channel && (
                  <section className="channel-header">
                    {channel.snippet.thumbnails?.medium?.url && (
                      <img src={channel.snippet.thumbnails.medium.url} alt="" />
                    )}
                    <h1>{channel.snippet.title}</h1>
                    <p>
                      {[
                        channel.statistics?.hiddenSubscriberCount
                          ? null
                          : channel.statistics?.subscriberCount
                            ? `${Number(channel.statistics.subscriberCount).toLocaleString()} subscribers`
                            : null,
                        channel.statistics?.videoCount
                          ? `${channel.statistics.videoCount} videos`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p>{channel.snippet.description}</p>
                    <button className="primary" onClick={toggleFollow}>
                      {follows.includes(channel.id)
                        ? tr(
                            "Following in LinguaTube",
                            "Đang theo dõi trong LinguaTube",
                          )
                        : tr(
                            "Follow in LinguaTube",
                            "Theo dõi trong LinguaTube",
                          )}
                    </button>
                    <small>
                      {tr(
                        "Saved on this device. Does not change YouTube subscriptions.",
                        "Lưu trên thiết bị này. Không thay đổi đăng ký YouTube.",
                      )}
                    </small>
                    <div className="topic-strip">
                      <button
                        aria-pressed={channelTab === "videos"}
                        onClick={() => {
                          setChannelTab("videos");
                          load(
                            "/youtube/playlists/" +
                              channel.contentDetails.relatedPlaylists.uploads,
                          );
                        }}
                      >
                        Videos
                      </button>
                      <button
                        aria-pressed={channelTab === "playlists"}
                        onClick={() => {
                          setChannelTab("playlists");
                          load(
                            "/youtube/channels/" + channel.id + "/playlists",
                          );
                        }}
                      >
                        Playlists
                      </button>
                    </div>
                  </section>
                )}
                {renderFeed()}
              </>
            )}
            {page === "playlist" && (
              <>
                <h1 className="screen-title">
                  <ListVideo /> {listTitle}
                </h1>
                {renderFeed()}
              </>
            )}
            {page === "shorts" && (
              <section className="feature-notice">
                <Play size={36} />
                <h1>Shorts</h1>
                <p>
                  {tr(
                    "A verified Shorts feed is not available through this integration. Short duration alone does not identify a YouTube Short.",
                    "Tích hợp này chưa có bảng tin Shorts được xác minh. Thời lượng ngắn không đủ để xác định YouTube Short.",
                  )}
                </p>
                <p>
                  {tr(
                    "You can search short videos using official YouTube discovery and watch them in the standard player. No scraped or simulated Shorts feed.",
                    "Bạn có thể tìm video ngắn bằng API chính thức và xem trong trình phát thông thường. Không thu thập trái phép hay tạo bảng tin Shorts giả.",
                  )}
                </p>
                <button
                  className="primary"
                  onClick={() => {
                    setDuration("short");
                    navigate("search");
                  }}
                >
                  {tr("Search short videos", "Tìm video ngắn")}
                </button>
              </section>
            )}
            {page === "subscriptions" && (
              <section>
                <h1 className="screen-title">{t.subscriptions}</h1>
                <p className="section-note">
                  {tr(
                    "Channels you follow in LinguaTube on this device. YouTube subscription sync requires Google OAuth and is not connected.",
                    "Kênh theo dõi trong LinguaTube trên thiết bị này. Đồng bộ đăng ký YouTube cần Google OAuth và chưa được kết nối.",
                  )}
                </p>
                {follows.length ? (
                  <div className="follow-list">
                    {follows.map((id) => (
                      <FollowedChannel
                        key={id}
                        id={id}
                        open={() => openChannel(id)}
                        remove={() => {
                          const f = follows.filter((c) => c !== id);
                          setFollows(f);
                          localStorage.setItem(
                            "lt.followedChannels",
                            JSON.stringify(f),
                          );
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="feature-notice">
                    <Radio size={32} />
                    <h2>
                      {tr("Find your channels", "Tìm kênh bạn yêu thích")}
                    </h2>
                    <p>
                      {tr(
                        "Open a channel and follow it here to browse its latest uploads.",
                        "Mở trang kênh và theo dõi để xem các video mới.",
                      )}
                    </p>
                    <button
                      className="primary"
                      onClick={() => {
                        setKind("channel");
                        navigate("search");
                      }}
                    >
                      {tr("Find channels", "Tìm kênh")}
                    </button>
                  </div>
                )}
              </section>
            )}
            {page === "you" && (
              <section className="you-screen">
                <div className="you-heading">
                  <span className="channel-monogram">
                    <User />
                  </span>
                  <div>
                    <h1>{email || tr("Your videos", "Video của bạn")}</h1>
                    <p>
                      {email
                        ? tr("Signed in", "Đã đăng nhập")
                        : tr(
                            "Guest · saved on this device",
                            "Khách · lưu trên thiết bị này",
                          )}
                    </p>
                  </div>
                  <button
                    aria-label="Settings"
                    onClick={() => navigate("settings")}
                  >
                    <Settings />
                  </button>
                </div>
                <div className="you-actions">
                  <button
                    className="secondary"
                    onClick={() => navigate("vocabulary")}
                  >
                    <BookOpen size={18} />
                    {tr("Vocabulary", "Từ vựng")} · {words.length}
                  </button>
                  <button
                    className="secondary"
                    onClick={() => navigate("settings")}
                  >
                    <Settings size={18} />
                    {tr("Account & services", "Tài khoản & dịch vụ")}
                  </button>
                </div>
                <h2>
                  <Clock size={20} />
                  {tr("History", "Lịch sử")}
                </h2>
                <div className="feed">
                  {history.map((v) => (
                    <FeedCard
                      key={v.id}
                      video={v}
                      onClick={() => openVideo(v, history)}
                    />
                  ))}
                </div>
                {!history.length && (
                  <p className="section-note">
                    {tr(
                      "Videos you watch appear here.",
                      "Video bạn xem sẽ xuất hiện ở đây.",
                    )}
                  </p>
                )}
                <h2>
                  <Bookmark size={20} />
                  {tr("Saved videos", "Video đã lưu")}
                </h2>
                <div className="feed">
                  {saved.map((v) => (
                    <FeedCard
                      key={v.id}
                      video={v}
                      onClick={() => openVideo(v, saved)}
                    />
                  ))}
                </div>
                {!saved.length && (
                  <p className="section-note">
                    {tr(
                      "Save a video from its watch screen.",
                      "Lưu video từ màn hình xem.",
                    )}
                  </p>
                )}
              </section>
            )}
            {page === "settings" && (
              <div className="settings-screen">
                <Profile
                  recovering={recovering}
                  email={email}
                  notify={notify}
                  lang={lang}
                  setLang={setLang}
                  dark={dark}
                  setDark={setDark}
                  refresh={refresh}
                />
              </div>
            )}
            {page === "vocabulary" && (
              <div className="settings-screen">
                <button className="secondary" onClick={() => navigate("you")}>
                  <ArrowLeft />
                  {t.you}
                </button>
                <Vocabulary words={words} refresh={refresh} notify={notify} />
              </div>
            )}
          </>
        )}
      </main>
      {toast && (
        <div role="status" className="toast">
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X />
          </button>
        </div>
      )}
    </div>
  );
}
function FollowedChannel({
  id,
  open,
  remove,
}: {
  id: string;
  open: () => void;
  remove: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    api("/youtube/channels/" + id)
      .then((d) => {
        if (live) setData(d.items?.[0]);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [id]);
  return (
    <div className="followed-channel">
      <button onClick={open}>
        {data?.snippet.thumbnails?.default?.url && (
          <img src={data.snippet.thumbnails.default.url} alt="" />
        )}
        <span>{data?.snippet.title || id}</span>
      </button>
      {error && <p role="alert">{error}</p>}
      <button aria-label="Unfollow channel" onClick={remove}>
        <X />
      </button>
    </div>
  );
}
function Related({
  video,
  queue,
  open,
}: {
  video: Video;
  queue: Video[];
  open: (v: Video, q: Video[]) => void;
}) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let alive = true;
    setVideos([]);
    setError("");
    setBusy(true);
    api("/youtube/search?q=" + encodeURIComponent(video.title.slice(0, 180)))
      .then((d) => {
        if (alive)
          setVideos(
            d.items.map(asVideo).filter((v: Video) => v.id !== video.id),
          );
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [video.id, video.title]);
  const next = videos.length ? videos : queue.filter((v) => v.id !== video.id);
  return (
    <section className="related-section">
      <h2>More to watch</h2>
      <p className="section-note">
        {videos.length
          ? "Related by title search · not YouTube personalized recommendations"
          : "From your current results"}
      </p>
      {busy && <p role="status">Finding more videos…</p>}
      {error && <p role="alert">{error}</p>}
      <div className="feed">
        {next.map((v) => (
          <FeedCard key={v.id} video={v} onClick={() => open(v, next)} />
        ))}
      </div>
    </section>
  );
}
