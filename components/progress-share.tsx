"use client";
import { useState } from "react";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { labels, type Paper } from "@/lib/tracker";
import {
  snapshot,
  encodeSnapshot,
  exportPNG,
  progressSVG,
  downloadBlob,
  type Snapshot,
} from "@/lib/progress";
export function Progress({ data }: { data: Snapshot }) {
  return (
    <div className="progress-card">
      <div className="eyebrow">稿迹 / PAPER TRAIL</div>
      <h3>{data.title}</h3>
      <p className="subtle">{data.venue}</p>
      <ol className="journey">
        {data.events.map((e, i) => (
          <li key={i}>
            <span className={i === data.events.length - 1 ? "current" : ""} />
            <div>
              <strong>{labels[e.status]}</strong>
              <time>{e.date}</time>
            </div>
          </li>
        ))}
      </ol>
      {!data.events.length && <p>尚未记录节点</p>}
      <div className="progress-foot">当前：{labels[data.status]} · 静态进度快照</div>
    </div>
  );
}
export function ExportButtons({ data, notify }: { data: Snapshot; notify: (s: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await exportPNG(data);
            notify("PNG 进度图已导出");
          } catch {
            notify("图片导出失败，请改用 SVG");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Download />
        PNG 图片
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          downloadBlob(
            "paper-trail-progress.svg",
            new Blob([progressSVG(data)], { type: "image/svg+xml;charset=utf-8" }),
          )
        }
      >
        SVG 矢量图
      </Button>
    </>
  );
}
export function ShareDialog({
  paper,
  onClose,
  notify,
}: {
  paper: Paper | null;
  onClose: () => void;
  notify: (s: string) => void;
}) {
  const [anonymous, setAnonymous] = useState(true);
  const [url, setURL] = useState("");
  return (
    <Dialog
      open={!!paper}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          setAnonymous(true);
          setURL("");
        }
      }}
    >
      <DialogContent className="share-dialog">
      <DialogTitle>分享这段投稿旅程</DialogTitle>
        <DialogDescription>作者、稿号、私人备注与来信始终不会包含在快照中。</DialogDescription>
        {paper && (
          <>
            <label className="anonymous-option">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => {
                  setAnonymous(e.target.checked);
                  setURL("");
                }}
              />
              隐藏论文标题与期刊（推荐）
            </label>
            <div className="share-preview">
              <Progress data={snapshot(paper, anonymous)} />
            </div>
            <div className="share-actions">
              <Button
                onClick={async () => {
                  const link = `${location.origin}${location.pathname}#share=${encodeSnapshot(snapshot(paper, anonymous))}`;
                  if (link.length > 8000) {
                    notify("时间线较长，请使用图片分享");
                    return;
                  }
                  setURL(link);
                  try {
                    await navigator.clipboard.writeText(link);
                    notify("分享链接已复制");
                  } catch {
                    notify("请从下方文本框手动复制");
                  }
                }}
              >
                <Share2 />
                复制分享链接
              </Button>
              <ExportButtons data={snapshot(paper, anonymous)} notify={notify} />
            </div>
            {url && (
              <label>
                分享链接
                <Input readOnly value={url} onFocus={(e) => e.target.select()} />
              </label>
            )}
            <p className="subtle">
              链接持有者可读取快照，无法撤回，也不会自动更新。
              {typeof location !== "undefined" &&
              ["localhost", "127.0.0.1"].includes(location.hostname)
                ? "本地预览请发送图片；部署到网站后，链接才能跨设备打开。"
                : ""}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
