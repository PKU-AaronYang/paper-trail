export function portalURL(raw: string) {
  try {
    const u = new URL(raw);
    return ["http:", "https:"].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}
export function uniquePortalURLs(papers: { url: string }[]) {
  return [...new Set(papers.map((p) => portalURL(p.url)).filter((u): u is string => u !== null))];
}
