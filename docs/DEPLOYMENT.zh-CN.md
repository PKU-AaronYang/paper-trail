# 稿迹：GitHub 部署与换电脑迁移指南

适用项目：`PKU-AaronYang/paper-trail`。材料整理日期：2026-09-10。

## 1. 先分清三个东西

| 材料 | 作用 | 上传到 GitHub？ |
| --- | --- | --- |
| `paper-trail-source.zip` | 完整可维护源码，包含部署工作流 | 解压后的源码上传 |
| `paper-trail-static.zip` | 已构建的网页文件，供静态托管使用 | 本指南的 Actions 方案不需要上传 |
| 网站中导出的 `paper-trail-migration-日期.json` | 你的实际论文、私人备注与完整时间线 | 不上传，私下传给自己的新电脑 |

源码压缩包不包含 `.git`、`node_modules`、浏览器个人记录和登录信息。两个 ZIP 均需要先解压；把 ZIP 本身上传到仓库不会自动部署。

## 2. 推荐方式：GitHub Desktop 上传源码

不需要在本机安装 Node.js。GitHub Actions 会安装依赖、检查和构建。

### 2.1 在当前这台电脑操作

项目已经位于 `C:\Users\u\Desktop\Paper_Trail`，并已连接你的 GitHub 仓库。

1. 安装并打开 [GitHub Desktop](https://desktop.github.com/)，登录 `PKU-AaronYang`。
2. 点击 **File → Add local repository**，选择上述 `Paper_Trail` 文件夹，点击 **Add repository**。
3. 确认当前项目是 `paper-trail`，当前分支为 `main`。不要选到 `C:\Users\u` 等父文件夹。
4. 在 **Changes** 查看修改。本次应包含 `app`、`components`、`lib`、`tests`、`docs` 和 `.github/workflows/main.yml` 等文件。不要选择个人迁移 JSON。
5. 在 **Summary** 填入 `Improve tracking, sharing and migration`，点击 **Commit to main**。
6. 点击 **Push origin**。如果提示远端有新提交，先 **Fetch origin / Pull origin** 同步；有冲突时先解决再推送，不要强制覆盖。
7. 打开 [你的 GitHub 仓库](https://github.com/PKU-AaronYang/paper-trail)，确认可以看到 `docs/DEPLOYMENT.zh-CN.md` 和 `components/migration-dialog.tsx`。

如果仓库规则禁止直接提交 `main`，在 Desktop 创建分支并推送，按 GitHub 页面提示创建 Pull Request，合并到 `main` 后部署。

添加现有本地仓库的菜单路径可参见 [GitHub 官方文档](https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-a-repository-from-your-local-computer-to-github-desktop)。

### 2.2 如果以后在另一台电脑上传这份材料

1. 解压 `paper-trail-source.zip` 到临时文件夹。
2. 在 GitHub Desktop 中 **File → Clone repository → URL**，填写 `https://github.com/PKU-AaronYang/paper-trail.git`，选择一个空的本地目录并克隆。
3. 将源码包中所有文件和文件夹复制到克隆目录的根目录，覆盖同名文件。保留克隆目录原有 `.git` 文件夹。
4. 不要再套一层 `paper-trail-source` 文件夹：`package.json` 必须直接位于仓库根目录。
5. 按上一节提交并推送。压缩包本身没有 Git 历史，因此不要用它替代克隆目录中的 `.git`。

克隆菜单可参见 [GitHub Desktop 官方文档](https://docs.github.com/en/desktop/adding-and-cloning-repositories/cloning-and-forking-repositories-from-github-desktop)。

## 3. 开启 GitHub Pages

1. 打开 [仓库 Pages 设置](https://github.com/PKU-AaronYang/paper-trail/settings/pages)。
2. 在 **Build and deployment → Source** 选择 **GitHub Actions**。
3. 本项目已经带有工作流，不需要再创建 Jekyll 或其他模板。
4. 打开 [Actions 页面](https://github.com/PKU-AaronYang/paper-trail/actions)，选择 **Deploy Paper Trail to GitHub Pages**。
5. 如果本次推送已触发运行，等待其完成；否则点击 **Run workflow**，选择 `main`，再点击运行。
6. 工作流会安装依赖、执行类型检查、核心测试、React 渲染检查，随后构建并发布。运行成功会显示绿色勾号。
7. 返回 **Settings → Pages**，点击 **Visit site**。未配置自定义域名时，预期地址为 `https://pku-aaronyang.github.io/paper-trail/`；以页面实际显示的 URL 为准。

以上配置方式见 [GitHub Pages 官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。使用 GitHub Free 时，通常需将仓库设为公开；私有仓库 Pages 可用性取决于你的套餐。网站公开不等于浏览器中的论文记录公开，但不要把个人迁移文件放进仓库。

以后更新源码并推送到 `main`，同一工作流会重新部署。本文材料未替你推送或发布。

## 4. 如果只想通过 GitHub 网页上传

1. 解压源码包，进入仓库 **Code → Add file → Upload files**。
2. 上传解压后的文件和文件夹到仓库根目录，不上传外层文件夹、不上传 ZIP。
3. 文件较多时分批上传；GitHub 网页目前单次最多 100 个文件。所有文件上传完再检查 Actions 最终运行，中途不完整的提交可能构建失败。
4. 核对根目录有 `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`vite.pages.config.ts`、`tsconfig.json` 和 `index.html`。
5. 核对 `.github/workflows/main.yml` 已更新。若上传时遗漏，以 **Add file → Create new file** 创建或编辑这个完整路径，将源码包中对应文件的全文粘贴进去。
6. 确保新增的 `lib/migration.ts`、`components/migration-dialog.tsx`、`tests/migration.test.mjs`、`scripts/smoke.mjs` 也已上传，再按第 3 节设置 Pages。

网页上传规则见 [GitHub 官方文档](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)。文件较多时建议使用 Desktop，减少目录遗漏。

## 5. 部署后的首次使用

1. 打开你的线上网站。初次访问空白工作台是正常的，浏览器里还没有记录。
2. 点击「新建投稿」录入论文；也可以先体验示例数据，了解列表、看板、时间线和分享。
3. 如果之前在 `http://127.0.0.1:5173/` 已经录入真实论文，先从本地网站导出迁移包，再到线上网站导入。两个地址的数据是分开的。
4. 录入一个测试记录，刷新网页确认仍存在，再检查分享预览与图片下载是否符合你的需求。

不要直接双击源码 `index.html`。本项目需要通过构建或开发服务运行。

## 6. 换电脑：迁移全部记录

### 旧电脑

1. 在保存过记录的浏览器里打开稿迹。
2. 点击右上角「数据与备份」。
3. 点击「导出迁移包」，保存下载的 JSON 文件。
4. 通过 U 盘或你自己的文件传输方式发送到新电脑。迁移包含私人备注，和可脱敏的进度分享不同。

### 新电脑

1. 打开同一个稿迹网站，点击「数据与备份」→「导入迁移包 / JSON」。
2. 选择旧电脑导出的文件。系统先校验，再显示文件记录数、新增数、相同记录数和冲突数，不立即修改数据。
3. 默认「合并去重」：保留新电脑独有的论文，相同 ID 且内容一致的记录只保留一份。
4. 有冲突时，展开「查看完整字段和历史」，逐篇选择「保留本机」或「使用迁入」。默认保留本机；不会因为日期更新就自动覆盖。所选版本整篇替换，不自动拼接私人备注或历史。
5. 若希望完全按旧电脑恢复，选择「替换恢复」，勾选确认，再点击确认替换。新电脑独有的记录会从当前工作台移除。
6. 导入成功后检查论文数量和一两篇时间线，刷新网页确认保存。

独立新建但 ID 不同的同名论文会保留为两条，避免把不同轮次或不同投稿误合并；需要时你可以手动删除多余记录。重复导入同一文件不会反复增加同 ID 记录。等待提醒阈值等设备设置不随记录迁移。

### 误导入如何退回

「数据与备份」→「恢复上次导入前的数据」→ 选择「替换恢复」→ 勾选确认 → 确认替换。

每次导入保存一个恢复点，下一次导入会更新该恢复点。恢复点也在当前浏览器，清理网站数据会一起删除。它不替代你导出的外部迁移包。若空间不足、无法保存恢复点，系统会拒绝导入，保留当前记录。

## 7. 分享给导师或合作者

点击某篇稿件的「分享进度」。默认隐藏标题和期刊，作者、稿号、私人备注和来信始终不包含在分享中。可复制只读链接，或下载 PNG / SVG 流程图。

链接是静态快照，不会同步后来修改，也不能撤回。它把快照编码在地址片段里，不是加密。跨设备请使用线上网站生成的链接；本地 `127.0.0.1` 链接只对本机有意义。

## 8. 常见问题

| 问题 | 检查方式 |
| --- | --- |
| Pages 显示 404 | 确认 Source 是 GitHub Actions、工作流绿色成功，使用 Pages 显示的完整地址 |
| Actions 红色失败 | 点开失败步骤；先核对 `.github`、锁文件、新增组件和测试是否全部上传 |
| 找不到 pnpm / 版本不符 | 使用项目自带工作流，它固定 pnpm 11.19.0；不要用自己生成的新锁文件替换原锁文件 |
| 更新后仍看到旧页面 | 先导出迁移包，再强制刷新；仍有缓存问题时在浏览器开发者工具的 Application → Service Workers 注销该站点的 worker 后重新加载，无需清除 localStorage |
| 换电脑后没有论文 | 属于正常的浏览器隔离，到原电脑导出迁移包再导入 |
| 导入提示失败 | 使用完整迁移 JSON，不能用 CSV、ICS、进度图或源码 ZIP；文件上限 10 MB |
| 本地保存失败 | 先导出当前 JSON，检查浏览器是否允许网站存储及可用空间 |
| 网站关闭后没有通知 | 当前提醒只在页面中显示，没有后台推送，可导出 ICS 到日历 |

## 9. 可选：在本地继续修改

安装 Node.js 22（至少 22.13）或 24，然后在源码根目录打开终端：

```powershell
npm install -g pnpm@11.19.0
pnpm install --frozen-lockfile
pnpm dev
```

打开终端打印的地址，通常为 `http://127.0.0.1:5173/`。停止服务使用 Ctrl+C。

发布前检查：

```powershell
pnpm typecheck
pnpm test
pnpm test:smoke
pnpm build:pages
```

构建输出在 `out/`，使用 `pnpm preview:pages` 预览。完整源码仍是后续维护的主要材料。
