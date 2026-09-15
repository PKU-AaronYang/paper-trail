"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpenText,
  CalendarDays,
  Download,
  ExternalLink,
  FileJson,
  Plus,
  Search,
  Settings2,
  Trash2,
  Upload,
} from "lucide-react";
import { Share2, Sparkles, ShieldCheck, ArrowUpRight, GitBranch, LayoutList } from "lucide-react";
import {
  advice,
  stageDays,
  validatePapers,
  calendar,
  csvCell,
  today,
  terminal,
  type Paper,
  type Draft,
  type Status,
} from "@/lib/tracker";
import { decodeSnapshot, type Snapshot } from "@/lib/progress";
import { UsageGuide } from "@/components/usage-guide";
import { SubmissionPortals } from "@/components/submission-portals";
import { SubmissionRitual } from "@/components/submission-ritual";
import { FeedbackDialog } from "@/components/feedback-dialog";
import { CircleHelp } from "lucide-react";
import { needsAction, normalizeKeywords } from "@/lib/tracker";
import { ShareDialog, Progress, ExportButtons } from "@/components/progress-share";
import { MigrationDialog } from "@/components/migration-dialog";
import { migrationPackage, commitMigration, RECOVERY_KEY } from "@/lib/migration";
import { HistoryEditor } from "@/components/tracker-enhancements";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type WebMCPContext = {
  registerTool: (
    tool: Record<string, unknown>,
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};

const STORAGE_KEY = "paper-trail:data:v1";
const statusMeta: Record<Status, { label: string; color: string }> = {
  preparing: { label: "准备中", color: "border-stone-200 bg-stone-50 text-stone-700" },
  submitted: { label: "已投稿", color: "border-indigo-200 bg-indigo-50 text-indigo-700" },
  editor: { label: "编辑处理中", color: "border-violet-200 bg-violet-50 text-violet-700" },
  review: { label: "外审中", color: "border-sky-200 bg-sky-50 text-sky-700" },
  revision: { label: "返修", color: "border-amber-200 bg-amber-50 text-amber-800" },
  resubmitted: { label: "修回已提交", color: "border-cyan-200 bg-cyan-50 text-cyan-700" },
  accepted: { label: "已接收", color: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  rejected: { label: "已拒稿", color: "border-rose-200 bg-rose-50 text-rose-700" },
  published: { label: "已发表", color: "border-teal-200 bg-teal-50 text-teal-700" },
  withdrawn: { label: "已撤稿", color: "border-slate-200 bg-slate-50 text-slate-700" },
};
const blankDraft: Draft = {
  title: "",
  authors: "",
  venue: "",
  manuscriptId: "",
  url: "",
  round: "第 1 轮",
  status: "preparing",
  submittedAt: "",
  deadline: "",
  nextAction: "",
  notes: "",
};
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const demoPapers: Paper[] = [
  {
    id: "demo-1",
    title: "城市热岛的多尺度遥感监测（示例）",
    authors: "张三，李四",
    venue: "Remote Sensing of Environment",
    manuscriptId: "RSE-D-26-01482",
    url: "",
    round: "第 1 轮",
    status: "review",
    submittedAt: "2026-08-16",
    updatedAt: "2026-08-16",
    deadline: "",
    nextAction: "等待审稿结果",
    notes: "这是示例记录，可在数据与备份中清空。",
    history: [{ id: "h1", date: "2026-08-16", status: "review", note: "进入外审" }],
  },
  {
    id: "demo-2",
    title: "面向缺失观测的时空插值框架（示例）",
    authors: "张三",
    venue: "ISPRS Journal",
    manuscriptId: "ISPRS-D-26-00831",
    url: "",
    round: "第 1 轮",
    status: "revision",
    submittedAt: "2026-07-28",
    updatedAt: "2026-08-30",
    deadline: "2026-09-12",
    nextAction: "完成审稿意见回复",
    notes: "",
    history: [
      { id: "h2a", date: "2026-07-28", status: "submitted", note: "首次投稿" },
      { id: "h2b", date: "2026-08-30", status: "revision", note: "收到大修决定" },
    ],
  },
];

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export default function Home() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "action" | "review" | "archived">("all");
  const [panel, setPanel] = useState<"form" | "data" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [notice, setNotice] = useState("");
  const [storageError, setStorageError] = useState("");
  const [sharePaper, setSharePaper] = useState<Paper | null>(null);
  const [shared, setShared] = useState<Snapshot | null>(null);
  const [shareError, setShareError] = useState("");
  const [eventDate, setEventDate] = useState(today());
  const [eventNote, setEventNote] = useState("");
  const [view, setView] = useState<"list" | "board">("list");
  const [sort, setSort] = useState("priority");
  const [waitDays, setWaitDays] = useState(45);
  const [helpOpen, setHelpOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [portalsOpen, setPortalsOpen] = useState(false);
  const [ritualOpen, setRitualOpen] = useState(false);
  const [keywordsText, setKeywordsText] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const [migration, setMigration] = useState<{ papers: Paper[]; filename: string } | null>(null);

  useEffect(() => {
    const readHash = () => {
      setShared(null);
      setShareError("");
      if (location.hash.startsWith("#share=")) {
        try {
          setShared(decodeSnapshot(location.hash.slice(7)));
        } catch {
          setShareError("分享链接已损坏或格式不受支持。");
        }
      }
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) setPapers(validatePapers(JSON.parse(saved)));
      const n = Number(localStorage.getItem("paper-trail:wait-days"));
      if (n >= 7 && n <= 365) setWaitDays(n);
    } catch {
      setStorageError("无法读取本地数据。原内容未被覆盖，请先备份原始内容或导入有效备份恢复。");
    }
    setHydrated(true);
    if ("serviceWorker" in navigator && !["localhost", "127.0.0.1"].includes(location.hostname))
      navigator.serviceWorker.register("./sw.js").catch(() => undefined);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);
  useEffect(() => {
    if (!hydrated || storageError || location.hash.startsWith("#share=")) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(papers));
      localStorage.setItem("paper-trail:wait-days", String(waitDays));
    } catch {
      setStorageError("本地保存失败，可能空间不足。请立即导出当前 JSON 备份。");
    }
  }, [papers, hydrated, storageError, waitDays]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const context = (document as Document & { modelContext?: WebMCPContext }).modelContext;
    if (
      !context?.registerTool ||
      !hydrated ||
      shared ||
      shareError ||
      location.hash.startsWith("#share=")
    )
      return;
    const lifecycle = new AbortController();
    const register = async () => {
      await context.registerTool(
        {
          name: "list_submissions",
          title: "查看投稿记录",
          description: "读取当前浏览器中的论文投稿记录。",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          execute: () => ({
            count: papers.length,
            submissions: papers.map((p) => ({
              id: p.id,
              title: p.title,
              venue: p.venue,
              status: statusMeta[p.status].label,
              deadline: p.deadline,
            })),
          }),
        },
        { signal: lifecycle.signal },
      );
      await context.registerTool(
        {
          name: "create_submission",
          title: "创建投稿记录",
          description: "创建一条新的论文投稿记录。需要论文标题和投稿期刊或会议。",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string" },
              venue: { type: "string" },
              manuscriptId: { type: "string" },
            },
            required: ["title", "venue"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: true },
          execute: (raw: unknown) => {
            const input = raw as { title?: string; venue?: string; manuscriptId?: string };
            if (
              storageError ||
              typeof input.title !== "string" ||
              typeof input.venue !== "string" ||
              !input.title.trim() ||
              !input.venue.trim()
            )
              throw new Error("title and venue are required");
            const paper: Paper = {
              ...blankDraft,
              id: uid(),
              title: input.title.trim(),
              venue: input.venue.trim(),
              manuscriptId: input.manuscriptId?.trim() || "",
              updatedAt: today(),
              history: [{ id: uid(), date: today(), status: "preparing", note: "创建投稿记录" }],
            };
            setPapers((items) => [paper, ...items]);
            return { id: paper.id, status: "created" };
          },
        },
        { signal: lifecycle.signal },
      );
    };
    void register().catch(() => undefined);
    return () => lifecycle.abort();
  }, [papers, hydrated, shared, shareError, storageError]);

  const visible = useMemo(
    () =>
      papers
        .filter((paper) => {
          const haystack =
            `${paper.title} ${paper.venue} ${paper.manuscriptId} ${paper.authors} ${(paper.keywords || []).join(" ")}`.toLowerCase();
          const matchesQuery = haystack.includes(query.trim().toLowerCase());
          const matchesFilter =
            filter === "all" ||
            (filter === "action" && needsAction(paper)) ||
            (filter === "review" &&
              ["submitted", "editor", "review", "resubmitted"].includes(paper.status)) ||
            (filter === "archived" && terminal(paper.status));
          return matchesQuery && matchesFilter;
        })
        .sort((a, b) =>
          sort === "deadline"
            ? (a.deadline || "9999").localeCompare(b.deadline || "9999")
            : sort === "updated"
              ? b.updatedAt.localeCompare(a.updatedAt)
              : advice(b, waitDays).priority - advice(a, waitDays).priority ||
                b.updatedAt.localeCompare(a.updatedAt),
        ),
    [papers, query, filter, sort, waitDays],
  );

  const openNew = () => {
    setKeywordsText("");
    setEventDate(today());
    setEventNote("");
    setEditingId(null);
    setDraft(blankDraft);
    setPanel("form");
  };
  const openEdit = (paper: Paper) => {
    setKeywordsText((paper.keywords || []).join("，"));
    setEventDate(today());
    setEventNote("");
    const { id: _id, updatedAt: _updated, history: _history, ...rest } = paper;
    setEditingId(paper.id);
    setDraft(rest);
    setPanel("form");
  };
  const savePaper = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.venue.trim()) {
      setNotice("请填写论文标题和投稿去向");
      return;
    }
    if (eventDate > today() || draft.submittedAt > today()) {
      setNotice("已发生的进展日期不能晚于今天；计划日期请填写截止日期。");
      return;
    }
    const original = papers.find((p) => p.id === editingId);
    const changed =
      !original ||
      original.status !== draft.status ||
      original.venue !== draft.venue ||
      original.round !== draft.round ||
      !!eventNote.trim();
    if (changed && draft.submittedAt && eventDate < draft.submittedAt) {
      setNotice("本次进展不能早于首次投稿；准备阶段可在时间线补录。");
      return;
    }
    const history = original?.history.slice() || [];
    if (changed)
      history.push({
        id: uid(),
        date: eventDate,
        status: draft.status,
        note:
          eventNote.trim() ||
          (original
            ? "更新为「" + statusMeta[draft.status].label + "」 · " + draft.round
            : "创建投稿记录"),
        venue: draft.venue,
        round: draft.round,
      });
    history.sort((a, b) => a.date.localeCompare(b.date));
    const paper: Paper = {
      ...draft,
      keywords: normalizeKeywords(keywordsText),
      title: draft.title.trim(),
      venue: draft.venue.trim(),
      id: editingId || uid(),
      updatedAt: today(),
      status: history.at(-1)?.status || draft.status,
      history,
    };
    try {
      validatePapers([paper]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "请检查日期、链接和关键词");
      return;
    }
    setPapers((items) =>
      editingId ? items.map((p) => (p.id === editingId ? paper : p)) : [paper, ...items],
    );
    setNotice("投稿记录已保存");
    setPanel(null);
  };
  const deleteCurrent = () => {
    if (!editingId || !window.confirm("确定删除这条投稿记录吗？")) return;
    setPapers((items) => items.filter((p) => p.id !== editingId));
    setPanel(null);
    setNotice("记录已删除");
  };
  const exportJSON = () =>
    download(
      `paper-trail-migration-${today()}.json`,
      JSON.stringify(migrationPackage(papers), null, 2),
      "application/json",
    );
  const exportCSV = () => {
    const head = [
      "论文标题",
      "作者",
      "期刊/会议",
      "稿号",
      "当前状态",
      "轮次",
      "投稿日期",
      "最后更新",
      "截止日期",
      "下一步行动",
      "备注",
      "关键词",
    ];
    const rows = papers.map((p) =>
      [
        p.title,
        p.authors,
        p.venue,
        p.manuscriptId,
        statusMeta[p.status].label,
        p.round,
        p.submittedAt,
        p.updatedAt,
        p.deadline,
        p.nextAction,
        p.notes,
        (p.keywords || []).join("；"),
      ]
        .map(csvCell)
        .join(","),
    );
    download(
      `paper-trail-${today()}.csv`,
      `\uFEFF${head.map(csvCell).join(",")}\r\n${rows.join("\r\n")}`,
      "text/csv;charset=utf-8",
    );
  };
  const exportICS = () =>
    download(
      `paper-trail-deadlines-${today()}.ics`,
      calendar(papers),
      "text/calendar;charset=utf-8",
    );
  const importJSON = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setNotice("备份不能超过 10 MB");
      return;
    }
    file
      .text()
      .then((text) => {
        const items = validatePapers(JSON.parse(text));
        setMigration({ papers: items, filename: file.name });
      })
      .catch((error) =>
        setNotice("导入失败：" + (error instanceof Error ? error.message : "格式错误")),
      );
  };

  const counts = {
    action: papers.filter((p) => needsAction(p)).length,
    review: papers.filter((p) =>
      ["submitted", "editor", "review", "resubmitted"].includes(p.status),
    ).length,
    archived: papers.filter((p) => terminal(p.status)).length,
  };

  const pending = papers
    .filter((p) => needsAction(p))
    .sort(
      (a, b) =>
        advice(b, waitDays).priority - advice(a, waitDays).priority ||
        (a.deadline || "9999").localeCompare(b.deadline || "9999"),
    );
  if (shared || shareError)
    return (
      <main className="shared-page">
        <a className="brand" href={typeof location !== "undefined" ? location.pathname : "./"}>
          <BookOpenText />
          稿迹 · Paper Trail
        </a>
        {shared ? (
          <>
            <p className="subtle">只读快照 · 不会写入你的投稿记录</p>
            <Progress data={shared} />
            <div className="share-actions">
              <ExportButtons data={shared} notify={setNotice} />
            </div>
            <p className="subtle">此快照不会自动更新。链接持有者可读取其中内容。</p>
          </>
        ) : (
          <p role="alert">{shareError}</p>
        )}
        {notice && (
          <output className="toast" aria-live="polite">
            {notice}
          </output>
        )}
      </main>
    );
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <BookOpenText className="size-4" />
          </div>
          <div>
            <p className="font-heading text-[15px] font-semibold">稿迹</p>
            <p className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              Paper Trail
            </p>
          </div>
          <div className="ml-auto hidden w-full max-w-sm items-center sm:flex">
            <Search className="z-10 mr-[-28px] ml-3 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 rounded-xl bg-card pl-9"
              placeholder="搜索论文、期刊、稿号或关键词"
            />
          </div>
          <Button
            variant="outline"
            className="h-9 rounded-xl"
            aria-label="使用说明"
            onClick={() => setHelpOpen(true)}
          >
            <CircleHelp />
            <span className="hidden sm:inline">使用说明</span>
          </Button>
          <Button variant="outline" className="h-9 rounded-xl" onClick={() => setPanel("data")}>
            <Settings2 /> <span className="hidden sm:inline">数据与备份</span>
          </Button>
          <Button className="h-9 rounded-xl px-4" onClick={openNew}>
            <Plus /> 新建投稿
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-[1240px] px-4 py-7 sm:px-6 lg:px-8">
        <div className="overview-heading">
          <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-accent-foreground uppercase">
            投稿总览
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            投稿工作台
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">从第一稿，到正式发表</p>
        </div>
        {storageError && (
          <div className="storage-alert" role="alert">
            {storageError}
            <Button onClick={() => setPanel("data")}>备份与恢复</Button>
          </div>
        )}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["全部投稿", papers.length, "所有记录"],
            ["需要处理", counts.action, "准备与返修"],
            ["审稿中", counts.review, "编辑及外审"],
            ["已归档", counts.archived, "接收、发表、拒稿与撤稿"],
          ].map(([label, value, note], i) => (
            <button
              key={String(label)}
              onClick={() => setFilter((["all", "action", "review", "archived"] as const)[i])}
              className={`metric-card text-left ${filter === (["all", "action", "review", "archived"] as const)[i] ? "ring-2 ring-primary/20" : ""}`}
            >
              <p className="text-xs text-muted-foreground">{label}</p>
              <div className="mt-3 flex items-end justify-between">
                <strong className="font-heading text-3xl">{value}</strong>
                <span className="text-xs text-muted-foreground">{note}</span>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-2 sm:hidden">
          <Search className="z-10 mr-[-28px] ml-3 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 rounded-xl bg-card pl-9"
            placeholder="搜索记录"
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-2 justify-end">
          <Button variant="outline" onClick={() => setRitualOpen(true)}>
            <Sparkles />
            投稿小仪式
          </Button>
          <Button variant="outline" onClick={() => setPortalsOpen(true)}>
            <ExternalLink />
            投稿系统总览
          </Button>
        </div>
        <div className="work-grid">
          <section>
            <div className="section-heading">
              <div>
                <h2>
                  我的稿件 <span className="count-label">{visible.length}</span>
                </h2>
                <p className="subtle">每一次进展，都值得记录。</p>
              </div>
              <div className="view-toggle">
                <button
                  aria-label="列表视图"
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                >
                  <LayoutList size={17} />
                </button>
                <button
                  aria-label="看板视图"
                  aria-pressed={view === "board"}
                  onClick={() => setView("board")}
                >
                  <GitBranch size={17} />
                </button>
              </div>
            </div>
            <div className="sort-bar">
              <span className="subtle">
                {filter === "all"
                  ? "全部投稿"
                  : filter === "action"
                    ? "需要处理"
                    : filter === "review"
                      ? "审稿中"
                      : "已归档"}
              </span>
              <NativeSelect
                aria-label="排序"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <NativeSelectOption value="priority">优先处理</NativeSelectOption>
                <NativeSelectOption value="updated">最近更新</NativeSelectOption>
                <NativeSelectOption value="deadline">截止日期</NativeSelectOption>
              </NativeSelect>
            </div>
            {visible.length === 0 ? (
              <div className="empty-state">
                <BookOpenText size={38} />
                <h3>{papers.length ? "没有匹配的稿件" : "你的下一段研究旅程，从这里开始"}</h3>
                <p className="subtle">
                  {papers.length
                    ? "试试其他关键词，或选择全部投稿。"
                    : "添加一篇论文，串起投稿、外审与返修的每一步。"}
                </p>
                <Button disabled={!hydrated} onClick={openNew}>
                  <Plus />
                  新建投稿
                </Button>
                {!papers.length && (
                  <button
                    className="text-button"
                    disabled={!hydrated}
                    onClick={() => setPapers(demoPapers)}
                  >
                    先体验示例数据
                  </button>
                )}
              </div>
            ) : view === "list" ? (
              <div className="paper-list">
                {visible.map((p) => (
                  <article className="paper-item" key={p.id}>
                    <div className="paper-top">
                      <button className="paper-title" onClick={() => openEdit(p)}>
                        {p.title}
                        <ArrowUpRight size={16} />
                      </button>
                      <Badge variant="outline" className={statusMeta[p.status].color}>
                        {statusMeta[p.status].label}
                      </Badge>
                    </div>
                    <p className="venue-name">{p.venue}</p>
                    <div className="keyword-tags">
                      {(p.keywords || []).map((k) => (
                        <span key={k}>{k}</span>
                      ))}
                    </div>
                    <div className="paper-meta">
                      <span>{p.round}</span>
                      <span>{p.manuscriptId || "暂未填写稿号"}</span>
                      <span>本阶段 {stageDays(p)} 天</span>
                    </div>
                    <div className="paper-bottom">
                      <span
                        className={advice(p, waitDays).priority >= 3 ? "deadline-urgent" : "subtle"}
                      >
                        {p.deadline && !terminal(p.status) ? "截止 " + p.deadline + " · " : ""}
                        {advice(p, waitDays).title}
                      </span>
                      <button className="icon-text" onClick={() => setSharePaper(p)}>
                        <Share2 size={15} />
                        分享进度
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="kanban">
                {[
                  { title: "准备 / 返修", statuses: ["preparing", "revision"] },
                  {
                    title: "投稿 / 审稿",
                    statuses: ["submitted", "editor", "review", "resubmitted"],
                  },
                  {
                    title: "结果 / 归档",
                    statuses: ["accepted", "published", "rejected", "withdrawn"],
                  },
                ].map((column) => (
                  <div className="kanban-column" key={column.title}>
                    <h3>
                      {column.title}{" "}
                      <span>
                        {visible.filter((p) => column.statuses.includes(p.status)).length}
                      </span>
                    </h3>
                    {visible
                      .filter((p) => column.statuses.includes(p.status))
                      .map((p) => (
                        <article key={p.id}>
                          <Badge variant="outline" className={statusMeta[p.status].color}>
                            {statusMeta[p.status].label}
                          </Badge>
                          <button className="paper-title" onClick={() => openEdit(p)}>
                            {p.title}
                          </button>
                          <p className="subtle">{p.venue}</p>
                          <div className="keyword-tags">
                            {(p.keywords || []).map((k) => (
                              <span key={k}>{k}</span>
                            ))}
                          </div>
                          <button className="icon-text" onClick={() => setSharePaper(p)}>
                            <Share2 size={14} />
                            分享进度
                          </button>
                        </article>
                      ))}
                  </div>
                ))}
              </div>
            )}
          </section>
          <aside className="insights">
            <div className="insight-heading">
              <Sparkles size={19} />
              <h2>下一步</h2>
              <span>本地规则</span>
            </div>
            <p className="subtle">按截止日期与当前阶段整理。</p>
            {pending.length ? (
              pending.slice(0, 5).map((p) => (
                <button
                  className={"action-item priority-" + advice(p, waitDays).priority}
                  key={p.id}
                  onClick={() => openEdit(p)}
                >
                  <span className="action-title">
                    {advice(p, waitDays).title}
                    <ArrowUpRight size={15} />
                  </span>
                  <strong>{p.title}</strong>
                  <p>{advice(p, waitDays).detail}</p>
                </button>
              ))
            ) : (
              <div className="all-clear">
                <ShieldCheck size={25} />
                <p>当前没有紧急待办</p>
                <span>有新进展时，记得更新节点。</span>
              </div>
            )}
            <div className="local-note">
              <ShieldCheck size={21} />
              <h3>研究留在你手中</h3>
              <p>记录保存在当前浏览器。换设备或清理数据前，请导出完整备份。</p>
              <button className="text-button" onClick={() => setPanel("data")}>
                管理备份 <ArrowUpRight size={14} />
              </button>
            </div>
          </aside>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          共 {visible.length} 条记录 · 建议定期导出 JSON 备份
        </p>
      </div>

      <Sheet
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
      >
        <SheetContent className="editor-sheet">
          <SheetTitle className="text-2xl font-semibold">
            {panel === "form" ? (editingId ? "投稿详情" : "新建投稿") : "备份与迁移"}
          </SheetTitle>
          <SheetDescription>
            {panel === "form" ? "保留每一轮进展，按真实日期记录。" : "完整备份可迁移到其他浏览器。"}
          </SheetDescription>
          {panel === "form" ? (
            <form onSubmit={savePaper} className="mt-7 space-y-5">
              <div className="form-field">
                <label htmlFor="paper-title">论文标题 *</label>
                <Input
                  id="paper-title"
                  required
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="form-field">
                  <label htmlFor="paper-venue">期刊 / 会议 *</label>
                  <Input
                    id="paper-venue"
                    required
                    value={draft.venue}
                    onChange={(e) => setDraft({ ...draft, venue: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="paper-number">稿件编号</label>
                  <Input
                    id="paper-number"
                    value={draft.manuscriptId}
                    onChange={(e) => setDraft({ ...draft, manuscriptId: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="paper-status">当前状态</label>
                  <NativeSelect
                    id="paper-status"
                    className="w-full"
                    value={draft.status}
                    onChange={(e) => setDraft({ ...draft, status: e.target.value as Status })}
                  >
                    {Object.entries(statusMeta).map(([key, meta]) => (
                      <NativeSelectOption key={key} value={key}>
                        {meta.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
                <div className="form-field">
                  <label htmlFor="paper-round">轮次</label>
                  <Input
                    id="paper-round"
                    value={draft.round}
                    onChange={(e) => setDraft({ ...draft, round: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="paper-date">投稿日期</label>
                  <Input
                    id="paper-date"
                    type="date"
                    value={draft.submittedAt}
                    onChange={(e) => setDraft({ ...draft, submittedAt: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="paper-deadline">下一步截止日期</label>
                  <Input
                    id="paper-deadline"
                    type="date"
                    value={draft.deadline}
                    onChange={(e) => setDraft({ ...draft, deadline: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-field">
                <label htmlFor="paper-authors">作者</label>
                <Input
                  id="paper-authors"
                  value={draft.authors}
                  onChange={(e) => setDraft({ ...draft, authors: e.target.value })}
                  placeholder="用逗号分隔"
                />
              </div>
              <div className="form-field">
                <label htmlFor="paper-url">投稿系统链接</label>
                <Input
                  id="paper-url"
                  type="url"
                  value={draft.url}
                  onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                  placeholder="https://"
                />
              </div>
              <div className="form-field">
                <label htmlFor="paper-action">下一步行动</label>
                <Input
                  id="paper-action"
                  value={draft.nextAction}
                  onChange={(e) => setDraft({ ...draft, nextAction: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label htmlFor="paper-keywords">关键词</label>
                <Input
                  id="paper-keywords"
                  value={keywordsText}
                  onChange={(e) => setKeywordsText(e.target.value)}
                  placeholder="例如：城市气候，遥感，热风险"
                />
                <p className="subtle">
                  逗号分隔，最多 30 个，每个不超过 80 字；关键词不会加入分享快照。
                </p>
              </div>
              <div className="form-field">
                <label htmlFor="paper-notes">备注</label>
                <Textarea
                  id="paper-notes"
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                />
              </div>
              <div className="event-box">
                <h3>本次进展</h3>
                <p className="subtle">
                  状态、期刊、轮次变化或填写说明时新增节点；普通编辑不重置阶段计时。
                </p>
                <label>
                  实际发生日期
                  <Input
                    required
                    type="date"
                    max={today()}
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                </label>
                <label>
                  节点说明
                  <Input
                    value={eventNote}
                    onChange={(e) => setEventNote(e.target.value)}
                    placeholder="如：收到大修决定 / 提交第二轮返修"
                  />
                </label>
              </div>
              {editingId && papers.find((p) => p.id === editingId) && (
                <HistoryEditor
                  key={editingId}
                  paper={papers.find((p) => p.id === editingId)!}
                  update={(p) => {
                    setPapers((items) => items.map((x) => (x.id === p.id ? p : x)));
                    setDraft((d) => ({ ...d, status: p.status }));
                  }}
                  notify={setNotice}
                />
              )}{" "}
              <div className="flex gap-2 border-t pt-5">
                {editingId && (
                  <Button type="button" variant="destructive" onClick={deleteCurrent}>
                    <Trash2 /> 删除
                  </Button>
                )}
                <span className="ml-auto" />
                {editingId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSharePaper(papers.find((p) => p.id === editingId)!)}
                  >
                    <Share2 />
                    分享
                  </Button>
                )}
                {/^https?:\/\//i.test(draft.url) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.open(draft.url, "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink /> 打开投稿系统
                  </Button>
                )}
                <Button type="submit">保存记录</Button>
              </div>
            </form>
          ) : (
            <div className="mt-7 space-y-4">
              <div className="rounded-2xl border bg-muted/35 p-5">
                <h3 className="font-medium">迁移到新电脑</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  旧电脑导出迁移包 → 把文件传到新电脑 →
                  新电脑导入并选择合并或替换。包含全部论文、私人备注和时间线，请自行保管。
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Button variant="outline" onClick={exportJSON}>
                    <FileJson /> 导出迁移包
                  </Button>
                  <Button onClick={() => importRef.current?.click()}>
                    <Upload /> 导入迁移包
                  </Button>
                  <Button variant="outline" onClick={exportCSV}>
                    <Download /> 导出 CSV
                  </Button>
                  <Button variant="outline" onClick={exportICS}>
                    <CalendarDays /> 导出日历
                  </Button>
                  <input
                    ref={importRef}
                    className="hidden"
                    type="file"
                    accept="application/json,.json"
                    onChange={importJSON}
                  />
                </div>
                <Button
                  className="mt-3"
                  variant="ghost"
                  onClick={() => {
                    try {
                      const raw = localStorage.getItem(RECOVERY_KEY);
                      if (!raw) {
                        setNotice("还没有导入恢复点");
                        return;
                      }
                      setMigration({
                        papers: validatePapers(JSON.parse(raw)),
                        filename: "上次导入前的恢复点（选择替换恢复可退回）",
                      });
                    } catch {
                      setNotice("恢复点无法读取，请使用你导出的迁移文件");
                    }
                  }}
                >
                  恢复上次导入前的数据
                </Button>
                <p className="subtle mt-2">
                  迁移包兼容旧版 JSON 备份；不会迁移等待提醒设置。CSV
                  和日历仅用于查看，不可恢复完整记录。
                </p>
              </div>
              <section className="event-box">
                <h3>等待提醒</h3>
                <p className="subtle">超过个人设定的天数后提示跟进，不是审稿时长预测。</p>
                <label>
                  提醒阈值（7–365 天）
                  <Input
                    type="number"
                    min={7}
                    max={365}
                    value={waitDays}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (n >= 7 && n <= 365) setWaitDays(n);
                    }}
                  />
                </label>
              </section>
              {storageError && (
                <Button
                  variant="outline"
                  onClick={() => {
                    try {
                      download(
                        "paper-trail-original.json",
                        localStorage.getItem(STORAGE_KEY) || "[]",
                        "application/json",
                      );
                    } catch {
                      setNotice("浏览器拒绝访问存储，请导出当前 JSON");
                    }
                  }}
                >
                  下载原始存储内容
                </Button>
              )}
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
                <h3 className="font-medium">清空数据</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  清空前请先导出 JSON。此操作只影响当前浏览器。
                </p>
                <Button
                  className="mt-4"
                  variant="destructive"
                  onClick={() => {
                    if (window.confirm("确定清空所有投稿记录吗？")) {
                      setPapers([]);
                      setStorageError("");
                      setPanel(null);
                      setNotice("所有记录已清空");
                    }
                  }}
                >
                  <Trash2 /> 清空全部记录
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
      <div className="flex justify-center pb-6">
        <Button variant="ghost" onClick={() => setFeedbackOpen(true)}>
          反馈与建议 · 联系作者
        </Button>
      </div>
      <SubmissionRitual open={ritualOpen} onClose={() => setRitualOpen(false)} />
      <SubmissionPortals
        open={portalsOpen}
        onClose={() => setPortalsOpen(false)}
        papers={papers}
        onEdit={openEdit}
      />
      <UsageGuide
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        onFeedback={() => setFeedbackOpen(true)}
      />
      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <ShareDialog paper={sharePaper} onClose={() => setSharePaper(null)} notify={setNotice} />
      {migration && (
        <MigrationDialog
          incoming={migration.papers}
          current={papers}
          filename={migration.filename}
          onClose={() => setMigration(null)}
          onConfirm={(next) => {
            try {
              const saved = commitMigration(localStorage, papers, next);
              setPapers(saved);
              setStorageError("");
              setMigration(null);
              setPanel(null);
              setNotice("迁移完成，共 " + saved.length + " 条记录；已保存导入前恢复点");
            } catch {
              setNotice(
                "迁移未完成：无法保存恢复点或记录，可能空间不足。当前记录未被替换，请先导出备份。",
              );
            }
          }}
        />
      )}
      {notice && (
        <output
          aria-live="polite"
          className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-xl"
        >
          {notice}
        </output>
      )}
    </main>
  );
}
