"use client";
import { useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { labels, type Paper } from "@/lib/tracker";
import { portalURL, uniquePortalURLs } from "@/lib/portal-links";

export function SubmissionPortalList({
  papers,
  onEdit,
}: {
  papers: Paper[];
  onEdit: (p: Paper) => void;
}) {
  const [query, setQuery] = useState("");
  const [openingResult, setOpeningResult] = useState<{ opened: number; blocked: string[] } | null>(
    null,
  );
  const urls = uniquePortalURLs(papers);
  const openAll = () => {
    if (urls.length > 10 && !window.confirm(`即将打开 ${urls.length} 个页面，是否继续？`)) return;
    let opened = 0;
    const blocked: string[] = [];
    for (const url of urls) {
      let child: Window | null = null;
      try {
        // noopener on window.open always returns null, so inspect a blank window first.
        child = window.open("about:blank", "_blank");
        if (!child) {
          blocked.push(url);
          continue;
        }
        child.opener = null;
        const policy = child.document.createElement("meta");
        policy.name = "referrer";
        policy.content = "no-referrer";
        child.document.head.append(policy);
        child.location.replace(url);
        opened++;
      } catch {
        child?.close();
        blocked.push(url);
      }
    }
    setOpeningResult({ opened, blocked });
  };
  const visible = papers.filter((p) =>
    [p.title, p.venue, p.authors, p.manuscriptId, ...(p.keywords || [])]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <div className="share-actions">
        <Button disabled={!urls.length} onClick={openAll}>
          <ExternalLink />
          一键打开全部（{urls.length} 个页面）
        </Button>
      </div>
      <p className="subtle">
        打开所有稿件的有效链接，不受搜索筛选影响；完全相同的链接只打开一次。浏览器可能拦截多个页面，请允许本站弹出窗口后再试。
      </p>
      {openingResult && (
        <div role="status" className="event-box">
          <p>
            已请求打开 {openingResult.opened} 个页面，{openingResult.blocked.length}{" "}
            个未能打开。打开页面不代表登录成功或状态已核查。
          </p>
          {openingResult.blocked.length > 0 && (
            <details>
              <summary>查看未打开的链接（可逐一点击）</summary>
              <ul>
                {openingResult.blocked.map((url) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="portal-address"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      <label className="flex items-center gap-2">
        <Search size={17} />
        <Input
          aria-label="搜索投稿系统总览"
          placeholder="搜索标题、期刊、作者、稿号或关键词"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <p className="subtle">
        全部 {papers.length} 篇 · 已填写有效链接 {papers.filter((p) => portalURL(p.url)).length} 篇
        · 当前显示 {visible.length} 篇（包含已归档稿件）
      </p>
      <div className="portal-table-scroll">
        <table className="portal-table">
          <thead>
            <tr>
              <th>论文 / 作者</th>
              <th>投稿信息</th>
              <th>本地记录状态</th>
              <th>投稿系统</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => {
              const url = portalURL(p.url);
              return (
                <tr key={p.id}>
                  <td>
                    <strong>{p.title}</strong>
                    <p className="subtle">{p.authors || "未填写作者"}</p>
                    <div className="keyword-tags">
                      {(p.keywords || []).map((k) => (
                        <span key={k}>{k}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {p.venue}
                    <p className="subtle">稿号：{p.manuscriptId || "未填写"}</p>
                    <p className="subtle">
                      {p.round} · 投稿 {p.submittedAt || "未填写"}
                    </p>
                  </td>
                  <td>
                    {labels[p.status]}
                    <p className="subtle">记录更新 {p.updatedAt || "未填写"}</p>
                    {p.deadline && <p className="subtle">记录截止 {p.deadline}</p>}
                  </td>
                  <td>
                    {url ? (
                      <a
                        className="portal-link"
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink size={16} />
                        打开投稿系统<span className="sr-only">：{p.title}</span>
                      </a>
                    ) : (
                      <p className="subtle">{p.url ? "链接格式无效" : "尚未填写链接"}</p>
                    )}
                    {url && <p className="portal-address">{url}</p>}
                    <Button variant="outline" size="sm" onClick={() => onEdit(p)}>
                      {url ? "更新记录" : "补充 / 修改链接"}
                      <span className="sr-only">：{p.title}</span>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!visible.length && (
          <p className="empty-state">
            {papers.length
              ? "没有匹配的记录，请调整搜索条件。"
              : "还没有投稿记录，先在工作台新建一篇。"}
          </p>
        )}
      </div>
    </>
  );
}
export function SubmissionPortals({
  open,
  onClose,
  papers,
  onEdit,
}: {
  open: boolean;
  onClose: () => void;
  papers: Paper[];
  onEdit: (p: Paper) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="portal-dialog">
        <DialogTitle>投稿系统总览</DialogTitle>
        <DialogDescription>
          集中查看所有稿件，逐篇打开期刊网站并自行登录核查。这里的状态来自本地记录，打开链接不会自动更新进度。
        </DialogDescription>
        <SubmissionPortalList
          papers={papers}
          onEdit={(p) => {
            onClose();
            onEdit(p);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
