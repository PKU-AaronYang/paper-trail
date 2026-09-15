import test from "node:test";
import assert from "node:assert/strict";
import { timeHexagram, lunarContext, submissionRitual, TRIGRAMS } from "../lib/divination.ts";
import { uniquePortalURLs } from "../lib/portal-links.ts";

test("全部投稿链接去重、排除缺失与危险协议，不合并不同路径", () => {
  assert.deepEqual(
    uniquePortalURLs([
      { url: "https://example.org" },
      { url: "https://example.org/" },
      { url: "https://example.org/a" },
      { url: "" },
      { url: "javascript:alert(1)" },
      { url: "invalid" },
    ]),
    ["https://example.org/", "https://example.org/a"],
  );
});
test("时间起卦手算核对：25取乾、29取巽、第5爻动，上乾变离", () => {
  const h = timeHexagram(6, 3, 16, 4);
  assert.equal(h.upper, 1);
  assert.equal(h.lower, 5);
  assert.equal(h.moving, 5);
  assert.equal(h.changedUpper, "离");
  assert.equal(h.changedLower, "巽");
  assert.deepEqual(h.original, [0, 1, 1, 1, 1, 1]);
  assert.deepEqual(h.changed, [0, 1, 1, 1, 0, 1]);
});
test("余零取8或6，动爻只改变一条线", () => {
  const h = timeHexagram(1, 1, 6, 4);
  assert.equal(h.upper, 8);
  assert.equal(h.moving, 6);
  for (const hour of [1, 4, 6, 8, 12]) {
    const r = timeHexagram(12, 12, 30, hour);
    assert.equal(r.original.filter((v, i) => v !== r.changed[i]).length, 1);
    assert.equal(TRIGRAMS[r.upper - 1].lines.length, 3);
  }
  assert.throws(() => timeHexagram(0, 1, 1, 1));
});
test("农历春节换年，闰月沿用月号，子时与午夜日界明确", () => {
  assert.equal(lunarContext(new Date("2026-02-16T04:00:00Z")).yearNumber, 6);
  const newYear = lunarContext(new Date("2026-02-17T04:00:00Z"));
  assert.equal(newYear.yearNumber, 7);
  assert.equal(newYear.month, 1);
  assert.equal(newYear.day, 1);
  const leap = lunarContext(new Date("2025-07-25T04:00:00Z"));
  assert.equal(leap.month, 6);
  assert.equal(leap.leap, true);
  const late = lunarContext(new Date("2026-09-15T15:30:00Z")),
    early = lunarContext(new Date("2026-09-15T16:30:00Z"));
  assert.equal(late.hourNumber, 1);
  assert.equal(early.hourNumber, 1);
  assert.equal(late.civilDate, "2026-09-15");
  assert.equal(early.civilDate, "2026-09-16");
});
test("趣味推荐严格在随后7个北京时间自然日内，结果可复算", () => {
  for (const iso of ["2026-09-15T02:00:00Z", "2026-12-31T15:50:00Z", "2026-02-16T16:00:00Z"]) {
    const r = submissionRitual("Climate model for urban heat", new Date(iso));
    const gap = (Date.parse(r.date) - Date.parse(r.lunar.civilDate)) / 86400000;
    assert.ok(gap >= 1 && gap <= 7);
    assert.ok([9, 11, 13, 15, 17].includes(r.hour));
    assert.deepEqual(submissionRitual("Climate model for urban heat", new Date(iso)), r);
  }
});
test("题目内容参与计算：同一时刻的不同题目可得到不同的分析与时段", () => {
  const now = new Date("2026-09-15T02:00:00Z");
  const climate = submissionRitual("Climate model for urban heat", now);
  const clinical = submissionRitual("Clinical patient disease survey", now);
  assert.notEqual(climate.analysis.fingerprint, clinical.analysis.fingerprint);
  assert.notDeepEqual(
    [climate.date, climate.hour, climate.hex.upper, climate.hex.lower],
    [clinical.date, clinical.hour, clinical.hex.upper, clinical.hex.lower],
  );
  assert.ok(climate.analysis.topics.some((x) => x.label.includes("环境")));
  assert.ok(clinical.analysis.topics.some((x) => x.label.includes("医学")));
});
