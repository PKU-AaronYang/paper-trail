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
  assert.ok(html.includes('反馈与建议'));
  assert.ok(html.includes('投稿系统总览'));
  assert.ok(html.includes('投稿小仪式'));
  const { SubmissionPortalList } = await server.ssrLoadModule('/components/submission-portals.tsx');
  const sample={id:'active',title:'在审稿件',authors:'作者',venue:'Journal',manuscriptId:'M-001',url:'https://example.org/submit',round:'第 1 轮',status:'review',submittedAt:'2026-09-01',updatedAt:'2026-09-15',deadline:'',nextAction:'',notes:'',history:[]};
  const portals=renderToString(createElement(SubmissionPortalList,{papers:[sample,{...sample,id:'archived',title:'已归档稿件',status:'rejected',url:''},{...sample,id:'bad',title:'无效地址',url:'javascript:alert(1)'}],onEdit:()=>{}}));
  assert.ok(portals.includes('在审稿件') && portals.includes('已归档稿件'));
  assert.ok(portals.includes('href="https://example.org/submit"'));
  assert.ok(portals.includes('尚未填写链接') && portals.includes('链接格式无效'));
  assert.ok(portals.includes('一键打开全部'));
  assert.ok(!portals.includes('href="javascript:'));
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
