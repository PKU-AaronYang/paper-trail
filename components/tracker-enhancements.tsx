"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  labels,
  deleteHistoryNode,
  timeline,
  today,
  uid,
  validDate,
  type Paper,
  type HistoryItem,
  type Status,
} from "@/lib/tracker";
export function HistoryEditor({
  paper,
  update,
  notify,
}: {
  paper: Paper;
  update: (p: Paper) => void;
  notify: (s: string) => void;
}) {
  const [item, setItem] = useState<HistoryItem | null>(null);
  return (
    <section className="history-section">
      <div className="section-heading">
        <h3>完整时间线</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setItem({
              id: uid(),
              date: today(),
              status: paper.status,
              note: "",
              venue: paper.venue,
              round: paper.round,
            })
          }
        >
          <Plus />
          补录节点
        </Button>
      </div>
      {timeline(paper).map((h) => (
        <div className="history-row" key={h.id}>
          <time>{h.date}</time>
          <div>
            <strong>{labels[h.status]}</strong>
            <p>{h.note}</p>
            {h.venue && (
              <small>
                {h.venue} · {h.round}
              </small>
            )}
          </div>
          <button type="button" className="text-button" onClick={() => setItem({ ...h })}>
            编辑
          </button>
        </div>
      ))}
      {item && (
        <div className="history-editor">
          <label>
            实际日期
            <Input
              type="date"
              max={today()}
              value={item.date}
              onChange={(e) => setItem({ ...item, date: e.target.value })}
            />
          </label>
          <label>
            节点状态
            <NativeSelect
              value={item.status}
              onChange={(e) => setItem({ ...item, status: e.target.value as Status })}
            >
              {Object.entries(labels).map(([k, v]) => (
                <NativeSelectOption key={k} value={k}>
                  {v}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
          <label>
            节点备注
            <Input value={item.note} onChange={(e) => setItem({ ...item, note: e.target.value })} />
          </label>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => {
                if (!validDate(item.date) || item.date > today()) {
                  notify("请选择不晚于今天的有效日期");
                  return;
                }
                const history = paper.history.some((h) => h.id === item.id)
                  ? paper.history.map((h) => (h.id === item.id ? item : h))
                  : [...paper.history, item];
                const sorted = history.slice().sort((a, b) => a.date.localeCompare(b.date));
                update({
                  ...paper,
                  history: sorted,
                  status: sorted.at(-1)!.status,
                  updatedAt: today(),
                });
                setItem(null);
                notify("节点已保存，当前状态按最新节点更新");
              }}
            >
              保存节点
            </Button>
            {paper.history.some((h) => h.id === item.id) && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (
                    !window.confirm(
                      "删除这个节点？当前状态将按剩余最新节点更新；删除最后一个节点时保留当前状态。",
                    )
                  )
                    return;
                  update(deleteHistoryNode(paper, item.id));
                  setItem(null);
                  notify("节点已删除");
                }}
              >
                <Trash2 />
                删除节点
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={() => setItem(null)}>
              取消
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
