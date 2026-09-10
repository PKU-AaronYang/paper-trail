"use client";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { labels, type Paper } from "@/lib/tracker";
import { mergeMigration, planMigration, type ConflictChoice } from "@/lib/migration";

export function MigrationDialog({
  incoming,
  current,
  filename,
  onClose,
  onConfirm,
}: {
  incoming: Paper[];
  current: Paper[];
  filename: string;
  onClose: () => void;
  onConfirm: (papers: Paper[]) => void;
}) {
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [choices, setChoices] = useState<Record<string, ConflictChoice>>({});
  const [confirmed, setConfirmed] = useState(false);
  const plan = useMemo(() => planMigration(current, incoming), [current, incoming]);
  const count = mode === "replace" ? incoming.length : current.length + plan.added.length;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="share-dialog">
        <DialogTitle>预览迁移记录</DialogTitle>
        <DialogDescription>文件已校验：{filename}。确认前不会修改当前记录。</DialogDescription>
        <div className="migration-stats">
          <div>
            <strong>{incoming.length}</strong>文件记录
          </div>
          <div>
            <strong>{plan.added.length}</strong>新增
          </div>
          <div>
            <strong>{plan.duplicates.length}</strong>相同记录
          </div>
          <div>
            <strong>{plan.conflicts.length}</strong>版本冲突
          </div>
        </div>
        <fieldset className="migration-options">
          <legend>导入方式</legend>
          <label>
            <input
              type="radio"
              name="migration-mode"
              checked={mode === "merge"}
              onChange={() => {
                setMode("merge");
                setConfirmed(false);
              }}
            />
            <span>
              <strong>合并去重（推荐）</strong>
              <small>保留当前记录；相同编号去重，版本冲突由你选择。</small>
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="migration-mode"
              checked={mode === "replace"}
              onChange={() => setMode("replace")}
            />
            <span>
              <strong>替换恢复</strong>
              <small>用文件中的全部记录替换当前 {current.length} 条记录。</small>
            </span>
          </label>
        </fieldset>
        {mode === "merge" && plan.conflicts.length > 0 && (
          <section className="migration-conflicts">
            <h3>同一篇记录在两台电脑上有不同修改</h3>
            <p className="subtle">
              默认保留本机版本。选择迁入版本会替换该篇全部字段和历史，不拼接不同版本。
            </p>
            {plan.conflicts.map(({ local, incoming: other }) => (
              <fieldset key={local.id}>
                <legend>{local.title}</legend>
                {(
                  [
                    { key: "local", paper: local, label: "保留本机" },
                    { key: "incoming", paper: other, label: "使用迁入" },
                  ] as const
                ).map((option) => (
                  <label key={option.key}>
                    <input
                      type="radio"
                      name={"conflict-" + local.id}
                      checked={(choices[local.id] || "local") === option.key}
                      onChange={() => setChoices((c) => ({ ...c, [local.id]: option.key }))}
                    />
                    <span>
                      <strong>
                        {option.label} · {labels[option.paper.status]}
                      </strong>
                      <small>
                        {option.paper.title} · {option.paper.venue}
                      </small>
                      <small>
                        更新 {option.paper.updatedAt} · {option.paper.history.length} 个历史节点 ·
                        截止 {option.paper.deadline || "未设置"}
                      </small>
                      <details>
                        <summary>查看完整字段和历史</summary>
                        <pre>{JSON.stringify(option.paper, null, 2)}</pre>
                      </details>
                    </span>
                  </label>
                ))}
              </fieldset>
            ))}
          </section>
        )}
        {mode === "replace" && (
          <label className="anonymous-option">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            我确认替换当前记录{!incoming.length ? "（文件为空，将清空当前记录）" : ""}
          </label>
        )}
        <p className="subtle">
          完成后共 {count}{" "}
          条记录。导入前自动保存一个本机恢复点。独立创建、编号不同的记录不会仅凭相同标题合并。
        </p>
        <div className="share-actions">
          <Button
            disabled={mode === "replace" && !confirmed}
            onClick={() =>
              onConfirm(mode === "replace" ? incoming : mergeMigration(current, incoming, choices))
            }
          >
            确认{mode === "merge" ? "合并" : "替换"} · {count} 条
          </Button>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
