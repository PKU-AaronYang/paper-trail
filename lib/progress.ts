import { labels, timeline, validDate, type Paper, type Status } from "./tracker.ts";
export type Snapshot = {
  version: 1;
  title: string;
  venue: string;
  status: Status;
  events: { date: string; status: Status }[];
};
export function snapshot(p: Paper, anonymous = true): Snapshot {
  return {
    version: 1,
    title: anonymous ? "论文投稿进度" : p.title,
    venue: anonymous ? "投稿期刊 / 会议" : p.venue,
    status: p.status,
    events: timeline(p).map((h) => ({ date: h.date, status: h.status })),
  };
}
export function encodeSnapshot(s: Snapshot) {
  const bytes = new TextEncoder().encode(JSON.stringify(s));
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}
export function decodeSnapshot(value: string): Snapshot {
  if (value.length > 30000) throw new Error("分享内容过长");
  const s = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(
      Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/")), (c) =>
        c.charCodeAt(0),
      ),
    ),
  );
  if (
    !s ||
    s.version !== 1 ||
    typeof s.title !== "string" ||
    s.title.length > 2000 ||
    typeof s.venue !== "string" ||
    s.venue.length > 1000 ||
    !Object.hasOwn(labels, s.status) ||
    !Array.isArray(s.events) ||
    s.events.length > 2000 ||
    s.events.some(
      (e: { date: string; status: string }) =>
        !e || typeof e.date !== "string" || !validDate(e.date) || !Object.hasOwn(labels, e.status),
    )
  )
    throw new Error("分享内容无效");
  return s;
}
const xml = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
function wrap(text: string, max: number) {
  const lines: string[] = [];
  let line = "",
    weight = 0;
  for (const c of text) {
    const w = c.charCodeAt(0) > 255 ? 1 : 0.55;
    if (weight + w > max) {
      lines.push(line);
      line = "";
      weight = 0;
    }
    line += c;
    weight += w;
  }
  lines.push(line);
  return lines;
}
export function progressSVG(s: Snapshot) {
  const title = wrap(s.title, 30);
  const venue = wrap(s.venue, 48);
  const offset = 124 + title.length * 34 + venue.length * 22;
  const height = offset + Math.max(1, s.events.length) * 94 + 90;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="${height}" viewBox="0 0 960 ${height}"><rect width="960" height="${height}" fill="#f5f7f6"/><rect x="24" y="24" width="912" height="${height - 48}" rx="24" fill="white"/><g font-family="Segoe UI,Microsoft YaHei,sans-serif"><text x="64" y="76" font-size="16" fill="#286450" letter-spacing="2">稿迹 / PAPER TRAIL</text>${title.map((t, i) => `<text x="64" y="${126 + i * 34}" font-size="28" font-weight="600" fill="#19382e">${xml(t)}</text>`).join("")}${venue.map((t, i) => `<text x="64" y="${150 + title.length * 34 + i * 22}" font-size="17" fill="#60736b">${xml(t)}</text>`).join("")}<path d="M 83 ${offset + 32} V ${offset + 32 + Math.max(0, s.events.length - 1) * 94}" stroke="#c5d8ce" stroke-width="3"/>${s.events.map((e, i) => `<circle cx="83" cy="${offset + 32 + i * 94}" r="9" fill="${i === s.events.length - 1 ? "#bd7232" : "#286450"}"/><text x="115" y="${offset + 26 + i * 94}" font-size="20" fill="#19382e" font-weight="600">${xml(labels[e.status])}</text><text x="115" y="${offset + 53 + i * 94}" font-size="16" fill="#60736b">${xml(e.date)}</text>`).join("")}<text x="64" y="${height - 57}" font-size="15" fill="#60736b">当前：${xml(labels[s.status])} · 静态进度快照 · 不含作者、稿号、备注与来信</text></g></svg>`;
}
export function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export async function exportPNG(s: Snapshot) {
  const blob = new Blob([progressSVG(s)], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(2, 16000 / img.height);
    const canvas = document.createElement("canvas");
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法创建图片");
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    const png = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("图片导出失败"))), "image/png"),
    );
    downloadBlob("paper-trail-progress.png", png);
  } finally {
    URL.revokeObjectURL(url);
  }
}
