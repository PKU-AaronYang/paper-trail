import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

// Render the actual React modules without launching a browser.
const server = await createServer({ configFile: 'vite.pages.config.ts', server: { middlewareMode: true }, appType: 'custom' });
try {
  const { default: Home } = await server.ssrLoadModule('/app/page.tsx');
  const { Progress } = await server.ssrLoadModule('/components/progress-share.tsx');
  const { MigrationDialog } = await server.ssrLoadModule('/components/migration-dialog.tsx');
  const html = renderToString(createElement(Home));
  assert.ok(html.includes('投稿工作台'));
  assert.ok(html.includes('新建投稿'));
  assert.ok(html.includes('下一步'));
  assert.ok(html.includes('使用说明'));
  assert.ok(html.includes('已归档'));
  assert.ok(!html.includes('投稿工作台。'));
  assert.ok(!html.includes('从编辑来信提取进展'));
  const progress = renderToString(createElement(Progress, { data: { version: 1, title: '<private>', venue: '测试期刊', status: 'revision', events: [{ date: '2026-01-01', status: 'submitted' }, { date: '2026-02-01', status: 'revision' }] } }));
  assert.ok(progress.includes('&lt;private&gt;'));
  assert.ok(progress.includes('2026-02-01'));
  assert.ok(progress.includes('返修'));
  assert.doesNotThrow(() => renderToString(createElement(MigrationDialog, { incoming: [], current: [], filename: 'empty.json', onClose: () => {}, onConfirm: () => {} })));
  console.log('React workspace and progress rendering passed.');
} finally {
  await server.close();
}
