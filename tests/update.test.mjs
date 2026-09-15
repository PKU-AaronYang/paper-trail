import test from "node:test";
import assert from "node:assert/strict";
import {
  blankDraft,
  validatePapers,
  needsAction,
  terminal,
  normalizeKeywords,
  deleteHistoryNode,
  STORAGE_KEY,
} from "../lib/tracker.ts";
import { migrationPackage, mergeMigration, planMigration } from "../lib/migration.ts";
import { snapshot } from "../lib/progress.ts";
const paper = () => ({
  ...blankDraft,
  id: "p",
  title: "test",
  venue: "journal",
  status: "accepted",
  updatedAt: "2026-09-10",
  history: [
    { id: "1", date: "2026-08-01", status: "review", note: "" },
    { id: "2", date: "2026-09-01", status: "accepted", note: "" },
  ],
});
test("旧版存储键不变，无关键词的旧数组和迁移包均可读取", () => {
  assert.equal(STORAGE_KEY, "paper-trail:data:v1");
  assert.deepEqual(validatePapers([paper()]), [paper()]);
  assert.deepEqual(validatePapers({ version: 2, papers: [paper()] }), [paper()]);
});
test("处理、审稿、归档分类互斥且覆盖所有状态", () => {
  for (const status of [
    "preparing",
    "revision",
    "submitted",
    "editor",
    "review",
    "resubmitted",
    "accepted",
    "published",
    "rejected",
    "withdrawn",
  ]) {
    const p = { ...paper(), status };
    const sum =
      Number(needsAction(p)) +
      Number(["submitted", "editor", "review", "resubmitted"].includes(status)) +
      Number(terminal(status));
    assert.equal(sum, 1);
  }
  assert.equal(needsAction({ ...paper(), status: "review", deadline: "2020-01-01" }), false);
});
test("删除最新节点回退状态，删除旧节点保留最新状态，不改变原对象", () => {
  const p = paper();
  assert.equal(deleteHistoryNode(p, "2").status, "review");
  assert.equal(deleteHistoryNode(p, "1").status, "accepted");
  assert.equal(p.history.length, 2);
  assert.equal(deleteHistoryNode(p, "none"), p);
});
test("删除最后节点保留稿件，空时间线可备份和导入", () => {
  const p = deleteHistoryNode(deleteHistoryNode(paper(), "1"), "2");
  assert.equal(p.status, "accepted");
  assert.equal(p.history.length, 0);
  assert.deepEqual(validatePapers([p]), [p]);
});
test("关键词去重、旧数据空关键词兼容、导入导出保留关键词且分享不泄漏", () => {
  const keywords = normalizeKeywords("城市，遥感;城市；climate risk");
  assert.deepEqual(keywords, ["城市", "遥感", "climate risk"]);
  const p = { ...paper(), keywords };
  assert.deepEqual(validatePapers(migrationPackage([p]))[0].keywords, keywords);
  assert.deepEqual(mergeMigration([], [p])[0].keywords, keywords);
  assert.equal("keywords" in snapshot(p, false), false);
  assert.equal(planMigration([paper()], [{ ...paper(), keywords: [] }]).duplicates.length, 1);
});
test("异常关键词导入被拒绝，关键词变更可检测迁移冲突", () => {
  assert.throws(() => validatePapers([{ ...paper(), keywords: [12] }]));
  assert.throws(() => validatePapers([{ ...paper(), keywords: ["x".repeat(81)] }]));
  assert.equal(
    planMigration([{ ...paper(), keywords: ["a"] }], [{ ...paper(), keywords: ["b"] }]).conflicts
      .length,
    1,
  );
});
