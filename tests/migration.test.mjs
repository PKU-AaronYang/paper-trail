import test from "node:test";
import assert from "node:assert/strict";
import { blankDraft, STORAGE_KEY } from "../lib/tracker.ts";
import {
  migrationPackage,
  planMigration,
  mergeMigration,
  commitMigration,
  RECOVERY_KEY,
} from "../lib/migration.ts";
const paper = (id, extra = {}) => ({
  ...blankDraft,
  id,
  title: "同名研究",
  venue: "Journal",
  updatedAt: "2026-09-10",
  history: [{ id: "h-" + id, date: "2026-09-10", status: "preparing", note: "私人备注" }],
  ...extra,
});
test("迁移包完整保留私人字段和历史，兼容版本 2", () => {
  const p = paper("a", { authors: "作者", notes: "详细笔记", manuscriptId: "MS001" });
  const pkg = migrationPackage([p]);
  assert.equal(pkg.version, 2);
  assert.deepEqual(pkg.papers, [p]);
});
test("预览区分新增、相同记录、冲突，原数组不变", () => {
  const local = [paper("a"), paper("b")];
  const before = JSON.stringify(local);
  const incoming = [paper("a"), paper("b", { notes: "新笔记" }), paper("c")];
  const plan = planMigration(local, incoming);
  assert.equal(plan.added.length, 1);
  assert.equal(plan.duplicates.length, 1);
  assert.equal(plan.conflicts.length, 1);
  assert.equal(JSON.stringify(local), before);
});
test("默认保留本机冲突版本，相同标题但不同 ID 仍保留", () => {
  const result = mergeMigration(
    [paper("a", { notes: "本机" })],
    [paper("a", { notes: "迁入" }), paper("b")],
  );
  assert.equal(result.length, 2);
  assert.equal(result[0].notes, "本机");
});
test("逐条选择迁入版本会保留其完整字段及历史，重复导入幂等", () => {
  const incoming = [
    paper("a", {
      notes: "迁入",
      history: [{ id: "new", date: "2026-09-09", status: "review", note: "新历史" }],
      status: "review",
    }),
  ];
  const first = mergeMigration([paper("a")], incoming, { a: "incoming" });
  assert.deepEqual(first, incoming);
  assert.deepEqual(mergeMigration(first, incoming), first);
});
test("仅更新时间不同不冲突，同日事件顺序不同会冲突", () => {
  assert.equal(
    planMigration([paper("a")], [paper("a", { updatedAt: "2026-09-11" })]).duplicates.length,
    1,
  );
  const h = [
    { id: "h1", date: "2026-09-10", status: "review", note: "" },
    { id: "h2", date: "2026-09-10", status: "revision", note: "" },
  ];
  assert.equal(
    planMigration([paper("a", { history: h })], [paper("a", { history: h.slice().reverse() })])
      .conflicts.length,
    1,
  );
});
test("替换前建立恢复点；空数组替换也可恢复", () => {
  const data = new Map();
  const storage = { getItem: (k) => data.get(k) || null, setItem: (k, v) => data.set(k, v) };
  const current = [paper("a")];
  commitMigration(storage, current, []);
  assert.deepEqual(JSON.parse(data.get(STORAGE_KEY)), []);
  assert.deepEqual(JSON.parse(data.get(RECOVERY_KEY)).papers, current);
});
test("保存恢复点或目标失败时，不覆盖原记录；无效目标不写任何数据", () => {
  for (const failKey of [RECOVERY_KEY, STORAGE_KEY]) {
    const old = JSON.stringify([paper("a")]);
    const data = new Map([[STORAGE_KEY, old]]);
    const storage = {
      getItem: (k) => data.get(k) || null,
      setItem: (k, v) => {
        if (k === failKey) throw new Error("QuotaExceeded");
        data.set(k, v);
      },
    };
    assert.throws(() => commitMigration(storage, [paper("a")], [paper("b")]));
    assert.equal(data.get(STORAGE_KEY), old);
  }
  let calls = 0;
  assert.throws(() => commitMigration({ getItem: () => null, setItem: () => calls++ }, [], [{}]));
  assert.equal(calls, 0);
});
