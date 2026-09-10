"use client";
import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  labels,
  parseLetter,
  timeline,
  today,
  uid,
  validDate,
  type Draft,
  type Paper,
  type HistoryItem,
  type Status,
} from "@/lib/tracker";
export function LetterParser({ apply }: { apply: (value: Partial<Draft>) => void }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ReturnType<typeof parseLetter> | null>(null);
  return (
    <details className="letter-box">
      <summary>
        <Sparkles size={16} />
        从编辑来信提取进展
      </summary>
      <p>
        本地关键词识别，不发送来信。支持中英文状态和明确标注的 YYYY-MM-DD 截止日期，请核对原文。
      </p>
      <Textarea
        aria-label="编辑来信"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setResult(null);
        }}
        placeholder="例如：Major revision. Deadline: 2026-10-15"
      />
      <Button
        type="button"
        variant="outline"
        disabled={!text.trim()}
        onClick={() => setResult(parseLetter(text))}
      >
        识别内容
      </Button>
      {result && (
        <div>
          <p>{result.evidence.join("；") || "未发现明确线索，请手动填写。"}</p>
          <p>
            {result.status ? `建议状态：${labels[result.status]}` : "状态待确认"}
            {result.deadline ? ` · 截止 ${result.deadline}` : ""}
          </p>
          <Button
            type="button"
            disabled={!result.status && !result.deadline}
            onClick={() =>
              apply({
                ...(result.status ? { status: result.status } : {}),
                ...(result.deadline ? { deadline: result.deadline } : {}),
              })
            }
          >
            核对后应用到表单
          </Button>
        </div>
      )}
    </details>
  );
}
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
            <Button type="button" variant="ghost" onClick={() => setItem(null)}>
              取消
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
