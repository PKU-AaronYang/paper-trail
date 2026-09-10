export type Status =
  | "preparing"
  | "submitted"
  | "editor"
  | "review"
  | "revision"
  | "resubmitted"
  | "accepted"
  | "rejected"
  | "published"
  | "withdrawn";
export type HistoryItem = {
  id: string;
  date: string;
  status: Status;
  note: string;
  venue?: string;
  round?: string;
};
export type Paper = {
  id: string;
  title: string;
  authors: string;
  venue: string;
  manuscriptId: string;
  url: string;
  round: string;
  status: Status;
  submittedAt: string;
  updatedAt: string;
  deadline: string;
  nextAction: string;
  notes: string;
  history: HistoryItem[];
};
export type Draft = Omit<Paper, "id" | "updatedAt" | "history">;
export const STORAGE_KEY = "paper-trail:data:v1";
export const labels: Record<Status, string> = {
  preparing: "准备中",
  submitted: "已投稿",
  editor: "编辑处理中",
  review: "外审中",
  revision: "返修",
  resubmitted: "修回已提交",
  accepted: "已接收",
  rejected: "已拒稿",
  published: "已发表",
  withdrawn: "已撤稿",
};
export const blankDraft: Draft = {
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
export const uid = () => crypto.randomUUID();
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function validDate(s: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !Number.isNaN(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s
  );
}
export const dayDiff = (from: string, to = today()) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
export const terminal = (s: Status) =>
  ["accepted", "published", "rejected", "withdrawn"].includes(s);
export const timeline = (p: Paper) =>
  p.history.slice().sort((a, b) => a.date.localeCompare(b.date));
export function stageDays(p: Paper) {
  const h = timeline(p);
  let start = h.length - 1;
  while (
    start > 0 &&
    h[start - 1].status === h[start].status &&
    (!h[start].venue || !h[start - 1].venue || h[start].venue === h[start - 1].venue) &&
    (!h[start].round || !h[start - 1].round || h[start].round === h[start - 1].round)
  )
    start--;
  return Math.max(0, dayDiff(h[start]?.date || p.submittedAt || p.updatedAt));
}
export function advice(
  p: Paper,
  waitDays = 45,
): { priority: number; title: string; detail: string } {
  if (terminal(p.status))
    return {
      priority: 0,
      title: labels[p.status],
      detail:
        p.status === "accepted"
          ? "核对校样、作者信息与出版手续。"
          : p.status === "rejected"
            ? "整理编辑意见，编辑投稿去向并记录新一轮投稿。"
            : "这段投稿旅程已归档，仍可补充时间线。",
    };
  const remaining = p.deadline ? dayDiff(today(), p.deadline) : null;
  if (remaining !== null && remaining <= 7)
    return {
      priority: remaining < 0 ? 4 : 3,
      title:
        remaining < 0
          ? `已逾期 ${-remaining} 天`
          : remaining === 0
            ? "今天截止"
            : `${remaining} 天后截止`,
      detail: p.nextAction || "检查返修材料；如需延期，请及时联系编辑。",
    };
  if (p.status === "revision")
    return {
      priority: 2,
      title: "推进返修",
      detail: p.nextAction || "逐条回应审稿意见，并设置返修截止日期。",
    };
  if (
    ["submitted", "editor", "review", "resubmitted"].includes(p.status) &&
    stageDays(p) >= waitDays
  )
    return {
      priority: 1,
      title: `本阶段已 ${stageDays(p)} 天`,
      detail: `超过你设定的 ${waitDays} 天提醒线，可查看投稿系统或礼貌询问编辑。这不是期刊审稿时长预测。`,
    };
  return {
    priority: p.status === "preparing" ? 1 : 0,
    title: p.status === "preparing" ? "完成投稿准备" : "等待进展",
    detail:
      p.nextAction ||
      (p.status === "preparing"
        ? "核对作者、投稿指南、附信和补充材料。"
        : "有新消息时，记录实际发生日期与状态。"),
  };
}
export function validatePapers(raw: unknown): Paper[] {
  const data = Array.isArray(raw)
    ? raw
    : (raw as { version?: number; papers?: unknown })?.version === 2
      ? (raw as { papers: unknown }).papers
      : null;
  if (!Array.isArray(data) || data.length > 5000)
    throw new Error("不是有效的稿迹备份（最多 5000 条）");
  const ids = new Set<string>();
  return data.map((p: unknown) => {
    if (!p || typeof p !== "object") throw new Error("记录格式错误");
    const row = p as Record<string, unknown>;
    for (const key of ["id", ...Object.keys(blankDraft), "updatedAt"])
      if (typeof row[key] !== "string" || (row[key] as string).length > 100000)
        throw new Error(`字段 ${key} 无效`);
    if (
      !row.title ||
      !row.venue ||
      !row.id ||
      ids.has(row.id as string) ||
      !Object.hasOwn(labels, row.status as string)
    )
      throw new Error("标题、去向、状态或唯一编号无效");
    ids.add(row.id as string);
    for (const key of ["submittedAt", "updatedAt", "deadline"])
      if (row[key] && !validDate(row[key] as string)) throw new Error("日期无效");
    if (row.url && !/^https?:\/\//i.test(row.url as string))
      throw new Error("投稿链接必须为 HTTP 或 HTTPS");
    if (!Array.isArray(row.history) || row.history.length > 2000) throw new Error("时间线无效");
    const historyIds = new Set<string>();
    for (const h of row.history) {
      if (
        !h ||
        typeof h.id !== "string" ||
        historyIds.has(h.id) ||
        typeof h.date !== "string" ||
        !validDate(h.date) ||
        !Object.hasOwn(labels, h.status) ||
        typeof h.note !== "string" ||
        h.note.length > 100000 ||
        (h.venue !== undefined && typeof h.venue !== "string") ||
        (h.round !== undefined && typeof h.round !== "string")
      )
        throw new Error("时间线节点无效");
      historyIds.add(h.id);
    }
    return {
      id: row.id,
      ...Object.fromEntries(Object.keys(blankDraft).map((k) => [k, row[k]])),
      updatedAt: row.updatedAt,
      history: row.history.map((h) => ({
        id: h.id,
        date: h.date,
        status: h.status,
        note: h.note,
        ...(h.venue ? { venue: h.venue } : {}),
        ...(h.round ? { round: h.round } : {}),
      })),
    } as Paper;
  });
}
export function parseLetter(text: string): {
  status?: Status;
  deadline?: string;
  evidence: string[];
} {
  const evidence: string[] = [];
  const rules: [Status, RegExp][] = [
    ["rejected", /\b(reject(?:ed|ion)?|decline(?:d)?)\b|拒稿|不予录用/i],
    [
      "revision",
      /\b(major revision|minor revision|revise (?:your|the) manuscript|revisions? required)\b|大修|小修|返修/i,
    ],
    ["accepted", /\b(accepted for publication|pleased to accept)\b|正式接收|予以录用/i],
    ["review", /\bunder review\b|进入外审/i],
    ["editor", /\bwith editor\b|编辑处理中/i],
  ];
  const matches = rules.filter(([, re]) => re.test(text));
  const status = matches.length === 1 ? matches[0][0] : undefined;
  if (status) evidence.push(`状态线索：${text.match(matches[0][1])?.[0]}`);
  else if (matches.length > 1) evidence.push("检测到多种状态，可能包含历史邮件，请手动选择。");
  let deadline: string | undefined;
  for (const line of text.split(/[\n。]/)) {
    if (!/deadline|due|submit.*by|截止|不晚于/i.test(line)) continue;
    const m = line.match(/(20\d{2})[-/年](\d{1,2})[-/月](\d{1,2})日?/);
    if (m) {
      const value = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
      if (validDate(value)) {
        deadline = value;
        evidence.push(`截止日期线索：${m[0]}`);
        break;
      }
    }
  }
  return { status, deadline, evidence };
}
export function csvCell(value: string) {
  const safe = /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function calendar(papers: Paper[]) {
  const esc = (s: string) =>
    s
      .replaceAll("\\", "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replaceAll(";", "\\;")
      .replaceAll(",", "\\,");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Paper Trail//CN",
    "CALSCALE:GREGORIAN",
    ...papers
      .filter((p) => p.deadline && !terminal(p.status))
      .flatMap((p) => [
        "BEGIN:VEVENT",
        `UID:${esc(p.id)}@paper-trail`,
        `DTSTAMP:${new Date()
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d{3}/, "")}`,
        `DTSTART;VALUE=DATE:${p.deadline.replaceAll("-", "")}`,
        `SUMMARY:${esc((p.nextAction || "投稿事项") + " - " + p.title)}`,
        `DESCRIPTION:${esc(p.venue)}`,
        "END:VEVENT",
      ]),
    "END:VCALENDAR",
  ];
  return (
    lines
      .map((line) => {
        let out = "",
          bytes = 0;
        for (const ch of line) {
          const n = new TextEncoder().encode(ch).length;
          if (bytes + n > 75) {
            out += "\r\n ";
            bytes = 1;
          }
          out += ch;
          bytes += n;
        }
        return out;
      })
      .join("\r\n") + "\r\n"
  );
}
