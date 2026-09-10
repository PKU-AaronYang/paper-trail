import test from "node:test";
import assert from "node:assert/strict";
import {
  blankDraft,
  validatePapers,
  stageDays,
  dayDiff,
  advice,
  today,
  parseLetter,
  calendar,
  csvCell,
} from "../lib/tracker.ts";
import { snapshot, encodeSnapshot, decodeSnapshot, progressSVG } from "../lib/progress.ts";
const paper = (changes = {}) => ({
  ...blankDraft,
  id: "paper-1",
  title: "私人论文标题 & <test>",
  venue: "Secret Journal",
  authors: "PRIVATE AUTHOR",
  manuscriptId: "PRIVATE-ID",
  notes: "PRIVATE NOTE",
  url: "https://example.org/private",
  status: "review",
  submittedAt: "2026-01-01",
  updatedAt: today(),
  history: [
    { id: "h1", date: "2026-01-01", status: "submitted", note: "私人来信" },
    { id: "h2", date: "2026-01-05", status: "review", note: "PRIVATE REVIEW" },
  ],
  ...changes,
});
test("旧版数组和新版备份兼容，未知字段不会进入恢复数据", () => {
  const p = paper({ injected: "ignore" });
  const rows = validatePapers([p]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].injected, undefined);
  assert.deepEqual(validatePapers({ version: 2, papers: [p] }), rows);
});
test("拒绝损坏、重复 ID、无效状态、日期和危险链接", () => {
  for (const value of [
    null,
    {},
    [paper(), paper()],
    [paper({ status: "other" })],
    [paper({ deadline: "2026-02-30" })],
    [paper({ url: "javascript:alert(1)" })],
    [paper({ history: [{ id: "x", date: "no", status: "review", note: "" }] })],
  ])
    assert.throws(() => validatePapers(value));
});
test("编辑备注或增加同状态节点不重置阶段天数", () => {
  const p = paper();
  assert.equal(stageDays(p), dayDiff("2026-01-05"));
  p.history.push({ id: "h3", date: today(), status: "review", note: "跟进编辑" });
  assert.equal(stageDays(p), dayDiff("2026-01-05"));
  p.history.push({ id: "h4", date: today(), status: "revision", note: "返修" });
  assert.equal(stageDays(p), 0);
});
test("到期任务优先，已归档稿件不触发过期提醒", () => {
  assert.equal(advice(paper({ deadline: "2026-01-01" })).priority, 4);
  assert.equal(advice(paper({ deadline: today() })).title, "今天截止");
  assert.equal(advice(paper({ status: "accepted", deadline: "2026-01-01" })).priority, 0);
  assert.equal(advice(paper({ status: "revision" })).priority, 2);
});
test("来信识别可解释，歧义或无效日期不自动猜测", () => {
  assert.deepEqual(parseLetter("Major revision. Deadline: 2026-10-15").status, "revision");
  assert.equal(parseLetter("大修。截止日期：2026年10月15日").deadline, "2026-10-15");
  assert.equal(parseLetter("Major revision; previously rejected").status, undefined);
  assert.equal(parseLetter("Deadline: 2026-02-30").deadline, undefined);
  assert.equal(parseLetter("We have not accepted your manuscript").status, undefined);
});
test("分享默认脱敏，中文可往返，不包含作者、稿号、备注、链接和来信", () => {
  const p = paper();
  const s = snapshot(p);
  const encoded = encodeSnapshot(s);
  assert.deepEqual(decodeSnapshot(encoded), s);
  const text = JSON.stringify(s);
  for (const secret of ["PRIVATE", "私人", "Secret Journal", "example.org"])
    assert.equal(text.includes(secret), false);
  const full = snapshot(p, false);
  assert.equal(full.title, p.title);
  assert.equal(JSON.stringify(full).includes("PRIVATE"), false);
});
test("分享只呈现真实历史，多轮返修与不安全文本正确处理", () => {
  const p = paper();
  p.history.push(
    { id: "h3", date: "2026-01-09", status: "revision", note: "" },
    { id: "h4", date: "2026-01-10", status: "resubmitted", note: "" },
    { id: "h5", date: "2026-01-15", status: "revision", note: "" },
  );
  const svg = progressSVG(snapshot(p, false));
  assert.equal((svg.match(/>返修<\/text>/g) || []).length, 2);
  assert.ok(svg.includes("&amp; &lt;test&gt;"));
  assert.equal(svg.includes("<test>"), false);
  assert.throws(() => decodeSnapshot("bad-json"));
  assert.throws(() =>
    decodeSnapshot(
      encodeSnapshot({ ...snapshot(p), events: [{ date: "2026-02-30", status: "review" }] }),
    ),
  );
});
test("CSV 防公式执行；ICS 转义换行、排除终态并按 UTF-8 折行", () => {
  assert.equal(csvCell("=SUM(A1)"), '"\'=SUM(A1)"');
  assert.equal(csvCell('a"b'), '"a""b"');
  const ics = calendar([
    paper({ title: "中文".repeat(80), deadline: today(), nextAction: "回复,意见;检查\n材料" }),
    paper({ id: "accepted", status: "accepted", deadline: today() }),
  ]);
  assert.ok(ics.includes("DTSTAMP:"));
  assert.ok(ics.includes("回复\\,意见\\;检查\\n材料"));
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 1);
  for (const line of ics.split("\r\n")) assert.ok(Buffer.byteLength(line) <= 75);
});
