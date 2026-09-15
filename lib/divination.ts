// Time-casting arithmetic: 梅花易數/卷一, 年月日時起例.
// The seven-day date selection below is explicitly a modern entertainment rule.
export const TRIGRAMS = [
  { name: "乾", lines: [1, 1, 1] },
  { name: "兑", lines: [1, 1, 0] },
  { name: "离", lines: [1, 0, 1] },
  { name: "震", lines: [1, 0, 0] },
  { name: "巽", lines: [0, 1, 1] },
  { name: "坎", lines: [0, 1, 0] },
  { name: "艮", lines: [0, 0, 1] },
  { name: "坤", lines: [0, 0, 0] },
]; // Lines are ordered from bottom to top.
export const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const remainder = (n: number, base: number) => ((n - 1) % base) + 1;
export function timeHexagram(year: number, month: number, day: number, hour: number) {
  for (const [n, max] of [
    [year, 12],
    [month, 12],
    [day, 30],
    [hour, 12],
  ])
    if (!Number.isInteger(n) || n < 1 || n > max) throw new Error("起卦取数超出范围");
  const sum = year + month + day,
    total = sum + hour;
  const upper = remainder(sum, 8),
    lower = remainder(total, 8),
    moving = remainder(total, 6);
  const original = [...TRIGRAMS[lower - 1].lines, ...TRIGRAMS[upper - 1].lines];
  const changed = original.map((line, i) => (i === moving - 1 ? 1 - line : line));
  const lookup = (lines: number[]) =>
    TRIGRAMS.find((t) => t.lines.every((n, i) => n === lines[i]))!.name;
  return {
    sum,
    total,
    upper,
    lower,
    moving,
    original,
    changed,
    changedUpper: lookup(changed.slice(3)),
    changedLower: lookup(changed.slice(0, 3)),
  };
}
export function lunarContext(date: Date) {
  if (!Number.isFinite(date.getTime())) throw new Error("无效日期");
  const fmt = new Intl.DateTimeFormat("en-US-u-ca-chinese", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  if (fmt.resolvedOptions().calendar !== "chinese")
    throw new Error("此浏览器不支持农历换算，请使用更新的浏览器");
  const parts = fmt.formatToParts(date);
  const value = (type: string) => parts.find((p) => String(p.type) === type)?.value || "";
  const lunarYear = Number(value("relatedYear")),
    monthRaw = value("month"),
    month = parseInt(monthRaw, 10),
    day = Number(value("day"));
  if (
    !Number.isFinite(lunarYear) ||
    lunarYear < 1 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 30
  )
    throw new Error("无法读取农历日期，未生成结果");
  const local = new Date(date.getTime() + 8 * 3600000);
  const civilDate = local.toISOString().slice(0, 10),
    hour = local.getUTCHours();
  const yearNumber = ((((lunarYear - 4) % 12) + 12) % 12) + 1;
  const hourNumber = (Math.floor((hour + 1) / 2) % 12) + 1;
  return {
    lunarYear,
    month,
    day,
    leap: !/^\d+$/.test(monthRaw),
    yearNumber,
    hourNumber,
    civilDate,
    clock: local.toISOString().slice(11, 16),
  };
}
const TOPIC_SIGNALS = [
  {
    label: "人工智能 / 机器学习",
    words: [
      "人工智能",
      "机器学习",
      "深度学习",
      "neural",
      "transformer",
      "machine learning",
      "deep learning",
      "llm",
    ],
  },
  {
    label: "医学 / 临床",
    words: ["临床", "患者", "疾病", "医学", "clinical", "patient", "disease", "medical"],
  },
  {
    label: "材料 / 化学",
    words: ["材料", "催化", "化学", "聚合物", "material", "catalyst", "chemical", "polymer"],
  },
  {
    label: "环境 / 气候",
    words: ["气候", "环境", "污染", "碳排放", "climate", "environment", "pollution", "carbon"],
  },
  {
    label: "社会科学 / 行为",
    words: ["问卷", "行为", "社会", "政策", "survey", "behavior", "social", "policy"],
  },
];
const METHOD_SIGNALS = [
  { label: "实验 / 实证", words: ["实验", "试验", "样本", "experiment", "empirical", "sample"] },
  {
    label: "数据分析 / 模型",
    words: ["模型", "预测", "回归", "数据", "model", "prediction", "regression", "dataset"],
  },
  {
    label: "综述 / 理论",
    words: ["综述", "系统评价", "理论", "review", "meta-analysis", "theory"],
  },
];
function findSignals(text: string, groups: typeof TOPIC_SIGNALS) {
  const lower = text.toLocaleLowerCase();
  return groups.flatMap((group) => {
    const hits = group.words.filter((word) => lower.includes(word.toLocaleLowerCase()));
    return hits.length ? [{ label: group.label, hits }] : [];
  });
}
function topicFingerprint(text: string) {
  let hash = 2166136261;
  for (const char of text.normalize("NFKC").trim().toLocaleLowerCase()) {
    hash ^= char.codePointAt(0) || 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
export function analyzeTopic(topic: string) {
  const normalized = topic.normalize("NFKC").trim().replace(/\s+/g, " ");
  return {
    normalized,
    fingerprint: topicFingerprint(normalized),
    topics: findSignals(normalized, TOPIC_SIGNALS),
    methods: findSignals(normalized, METHOD_SIGNALS),
  };
}
export function submissionRitual(topic = "", now = new Date()) {
  if (!topic.trim()) throw new Error("请先填写论文题目或摘要");
  const lunar = lunarContext(now),
    analysis = analyzeTopic(topic),
    // The topic fingerprint is a modern, deterministic text rule. It is deliberately
    // shown separately from the traditional time arithmetic below.
    topicNumber = analysis.fingerprint,
    upper = ((topicNumber + lunar.yearNumber + lunar.month) % 8) + 1,
    lower = ((Math.floor(topicNumber / 8) + lunar.day + lunar.hourNumber) % 8) + 1,
    moving = ((Math.floor(topicNumber / 64) + lunar.day + lunar.hourNumber) % 6) + 1,
    baseHex = timeHexagram(lunar.yearNumber, lunar.month, lunar.day, lunar.hourNumber),
    hex = {
      ...baseHex,
      upper,
      lower,
      moving,
      original: [...TRIGRAMS[lower - 1].lines, ...TRIGRAMS[upper - 1].lines],
    };
  hex.changed = hex.original.map((line, i) => (i === moving - 1 ? 1 - line : line));
  const lookup = (lines: number[]) =>
    TRIGRAMS.find((t) => t.lines.every((n, i) => n === lines[i]))!.name;
  hex.changedUpper = lookup(hex.changed.slice(3));
  hex.changedLower = lookup(hex.changed.slice(0, 3));
  const offset = ((topicNumber + upper + lower + moving) % 7) + 1;
  const hours = [9, 11, 13, 15, 17],
    hour = hours[(topicNumber + moving) % hours.length];
  const candidate = new Date(lunar.civilDate + "T00:00:00+08:00");
  candidate.setTime(candidate.getTime() + offset * 86400000);
  const date = new Date(candidate.getTime() + 8 * 3600000).toISOString().slice(0, 10);
  const reminders = [
    "先核对作者顺序、单位和通讯信息，再从容提交。",
    "留一点时间逐项核对投稿指南，确认文件版本。",
    "把摘要、正文与补充材料交叉核对后，再按下提交。",
    "先通读附信和声明，确认每一处信息一致。",
    "提交后记得保存确认邮件和稿号，补上时间线。",
    "给最终文件再做一次备份，减少临时找文件的忙乱。",
  ];
  return { lunar, hex, offset, date, hour, reminder: reminders[moving - 1], analysis };
}
