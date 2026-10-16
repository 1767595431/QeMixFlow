# YHQeMix 定制改动记录

本目录记录本项目相对上游 Toonflow 源码所做的**全部定制改动**。上游发布新版本、需要重新拉取源码并重新编译时，按本文末尾「版本更新后如何沿用」操作，即可保留这些改动。

基线：`HBAI-Ltd/Toonflow-app`，提交 `72a895c`（tag `v2.0.4`）。

---

## 一、品牌替换：Toonflow → YHQeMix

只替换**用户可见的品牌文案**，内部标识一律保留（见本节末尾）。

### 涉及范围

| 区域 | 文件 |
| --- | --- |
| Web 界面 | `apps/web/index.html`（页面标题）、`apps/web/src/**`（约 18 个文件：首页、关于、个人化、插件市场、MCP、更新弹窗、Agent 欢迎语等） |
| 多语言 | `packages/i18n/src/locales/*.json`（21 个语言文件，**键与译文同步替换**）、`packages/i18n/src/messageSources.json` |
| 服务端 | `apps/server/src/**`（MCP 工具描述、供应商校验、插件安装提示等） |
| 桌面端 | `apps/desktop/src/index.ts`（窗口标题、应用菜单）、`apps/desktop/native/*.cs`（原生弹窗）、`apps/desktop/installer/installer.nsi`（安装向导、注册表显示名、快捷方式名） |
| 其它 | `packages/providers/src/{language,media}/tfRouter.ts`（供应商说明）、`packages/nodeScaffold/src/components/nodeError.vue`、`packages/skills/**`（技能正文）、`packages/startup/src/windowsSplash.ts`（启动画面标题） |

### 替换规则

```
(?<![/@A-Za-z0-9_])Toonflow(?!\/2\.0)   →   YHQeMix
```

- 前置排除 `[/@A-Za-z0-9_]`：避免改到 `HBAI-Ltd/Toonflow-app`、`@toonflow/*`、`dockviewToonflow`。
- 后置排除 `/2.0`：避免改到 `webFetch` 的 user-agent `Toonflow/2.0`。
- 注意：泰语、日语等译文里品牌名常紧跟非 ASCII 字母（如 `อธิบายToonflow`），**不能用 `\w` 做前置排除**，否则会漏改。

### 故意保留、禁止替换的标识

改这些会破坏功能或指向错误地址：

- 仓库与平台地址：`HBAI-Ltd/Toonflow-app`、`api.toonflow.net`
- 插件/技能作者元数据 `author: "Toonflow"`，以及判断语句 `plugin.author !== 'Toonflow'`、`metadata.author === "Toonflow"`
  —— 作者值来自远程插件市场，只改本地一侧会让官方插件被当成第三方（多出启用/卸载控件）。
- 内部标识：`toonflow://` 协议、`dockviewToonflow` 类名、`x-toonflow-*` 请求头、互斥量 `Local\ToonflowProtocol-` / `Local\ToonflowUpdate-`、`ToonflowUpdate_` 前缀、应用标识 `local.toonflow.desktop`。

---

## 二、图标替换：YHQeMix.png

源图：项目根目录 `YHQeMix.png`（328×80，横向文字 logo，32 位带透明通道）。

### 做法

- `packages/assets/logo.png`：`YHQeMix.png` 的副本。
- `packages/assets/logo.svg`：**改写为内嵌该 PNG 的 SVG**（`<image href="data:image/png;base64,...">`，`viewBox="0 0 328 80"`，`preserveAspectRatio="xMidYMid meet"`）。
  这样 8 处按 `@toonflow/assets/logo.svg` 引用 logo 的代码**无需逐个改 import** 即可生效，包括 hello 页用 `?raw` 注入 SVG 的写法。

### 连带调整

- 删除 4 处暗色模式反色 `filter: invert(1)`：原用于把纯黑 logo 反成白色，套在彩色 logo 上会得到错误颜色。
  位置：`apps/web/src/pages/home/index.vue`、`apps/web/src/components/settings/panels/about.vue`、`apps/web/src/components/settings/providerList.scss`、`.../languageModel/addProviderDialog.vue`、`.../mediaModel/addCustomProviderDialog.vue`。
- 容器由正方形改为横向（`object-fit: contain` 保留，避免拉伸）：
  | 位置 | 尺寸 |
  | --- | --- |
  | 首页 `.brandLogo` | 180×44 |
  | 关于页 `.brandMark` / `.brandLogo` | 128×60 / 108×27 |
  | 供应商列表 `.providerMark` / `.providerLogo` | 76×40 / 64×17 |
  | Agent 欢迎图标 `.welcomeIcon` / `.welcomeLogo` | 86×42 / 68×18 |
  | hello 页 `.artLogo` | 132×32 |

- 供应商列表里 TF-Router 行前面的图标已去掉：删除 `languageModel/index.vue`、`mediaModel/index.vue` 中的 `.providerMark` 标记块及其 `logoUrl` 导入，并移除 `providerList.scss` 里对应的 `.providerMark` / `.providerLogo` 样式。

> 桌面端 exe / 任务栏图标 `packages/assets/logo.ico` 与 macOS `logo.iconset/` **未替换**，仍为原图；需要时另行生成。

---

## 三、界面调整（5 项）

### 1. 首页图标后面不再显示文字

`apps/web/src/pages/home/index.vue`：删除 `<h1>YHQeMix</h1>`、`.brand` 的 `gap` 以及对应 `h1` 样式。

### 2. 媒体模型只预装 TF-Router

`apps/server/src/app.ts`：

```ts
const autoInstallProviders = ["tfRouter.ts"];   // 原为 ["tfRouter.ts", "apiMart.ts", "metaso.ts"]
```

即去掉 apiMart 与 metaso，保留 TF-Router 作为默认媒体供应商；火山引擎/即梦/可灵只在「添加媒体供应商」里提供。

### 3. 添加媒体供应商只提供「火山引擎」「即梦」「可灵」三个模板

- 新增 `packages/providers/src/media/volcengine.ts`（火山引擎方舟：Seedream 图片 + Seedance 视频，命令行后缀传参、任务轮询）。
- 新增 `packages/providers/src/media/jimeng.ts`（即梦：火山引擎视觉智能平台，签名 V4 + 图片 `CVProcess` 同步接口 + 视频 `CVSync2Async` 异步任务）。
- 新增 `packages/providers/src/media/kling.ts`（可灵：AK/SK 现场签发 HS256 JWT，图片与文生/图生视频）。
- `packages/providers/index.ts`：`mediaProviders = [volcengine, jimeng, kling]`。
- `packages/providers/package.json`：`exports` 增加 `./media/volcengine`、`./media/jimeng`、`./media/kling`（**该文件是白名单，必须补，否则 `?raw` 引用解析不到**）。
- `apps/web/src/components/settings/panels/mediaModel/addCustomProviderDialog.vue`：`?raw` 导入与 `providerSources` 映射改为这两个模板。

内置模型数量：火山引擎 12 个（Seedream 3.0/4.0/5.0、SeedEdit 3.0、Seedance 1.0/2.0/2.5）、即梦 5 个、可灵 7 个。

> ⚠️ 模型 ID 按平台公开命名规则填写，**最新的 5.0 / 2.x 系列未能联网核对**（官方文档为前端渲染、平台接口需密钥）。若与你账号下的实际 ID 不一致，可在「设置 → 媒体模型 → 编辑模型」里直接改（服务端要求同一供应商内模型 ID 唯一，新增时注意图片与视频不要撞名）。

### 4. 文本模型只预装 TF-Router

`apps/server/src/utils/conf/index.ts` 保持原样：

```ts
const autoInstallProviders = [tfRouter];
```

即默认文本供应商仍是 TF-Router；DeepSeek 与通义千问只出现在「添加供应商」目录里。

### 5. 添加文本供应商只保留 DeepSeek 与通义千问

- 新增 `packages/providers/src/language/qwen.ts`（通义千问，DashScope OpenAI 兼容协议）。
- `packages/providers/index.ts`：`languageProviders = [deepSeek, qwen]`。
- `packages/providers/package.json`：`exports` 增加 `./language/qwen`。
- 顺带删除两个「添加供应商」对话框里针对 tfRouter 的 logo 特判死代码与不再使用的 `logoUrl` / `.providerLogo`。

### 6. 插件市场隐藏在线入口

`apps/web/src/components/settings/panels/pluginMarket/index.vue`：

- 删除「发现插件」标签按钮，默认标签改为 `installed`（`const activeTab = ref<keyof typeof tabs>("installed")`）。
- 删除工具栏里的「网页版市场」「开发者文档」两个外链按钮。
- `tabs` 里的 `discover` getter 保留（只用于 aria 文案查表，不再是可达标签）。

### 7. 隐藏设置里的「关于」

`apps/web/src/components/settings/index.vue`：从 `settingsPanels` 中移除 `{ id: "about", ... }` 条目。

> 副作用：桌面端「有新版本」的角标原本挂在「关于」项上，隐藏后该角标不再显示（定制版不跟随上游更新，影响可接受）。`panels/about.vue` 文件保留未删。

### 8. 首次引导页（hello）精简，右侧剧照三张轮换

`apps/web/src/pages/hello/index.vue`：

- 去掉底部版权行（`.pageFooter` 元素与样式，含 `&.configuring` 里的那处）。
- 右侧画面上不再叠加 logo 与文字：删除 `.artBrand`、`.artLogo`、`.artName` 及其 `logoSvg` 导入，`.artPanel` 只保留画面容器与圆角裁切。

`apps/web/src/pages/hello/bg.vue` 与素材：

- 原右侧画面是 **4×4 精灵图**（`assets/image.png`，16 帧骑马动画，靠 `getSourceRect` 按网格切片播放）。现改为**三张静态剧照轮换**：`assets/helloArt1.jpg`（仙宫）→ `helloArt2.jpg`（列车窗外）→ `helloArt3.jpg`（海边小店），每 8 秒切换一次。
- 素材按画格成像区比例（`0.88 × 181 / 125 ≈ 1.274`）居中裁切并压到 1280×1005、JPEG 质量 90，三张合计约 860 KB（原图各 5 MB）；顺带裁掉了原图自带的「即梦AI」水印。
- 渲染保留胶片质感（颗粒、抖动、曝光闪烁、灯漏），只删除逐帧精灵切片与 `frameIndex`；画格内改为整图 `cover` 填充。
- 原 `assets/image.png` 已移除（工作区留档：可视化临时目录的 `image.removed.png`）。

> 若后续换图：按同一比例裁切后替换 `helloArtN.jpg` 即可，或在 `bg.vue` 的 `artSources` / `artInterval` 调整张数与间隔。

### 9. 引导页彩色化 + 启动默认进入引导页

- `apps/web/src/pages/hello/bg.vue`：去掉 `grayscale(1)` 滤镜，剧照保留原色，仅保留 `contrast(1.08) brightness(...)` 的对比与曝光闪烁。
- `apps/web/src/router/index.ts`：删除 `/hello` 上的 `beforeEnter` 守卫（原逻辑是 `helloCompleted` 为真时跳转 `/home`），并移除随之无用的 `useHelloStore` 导入。这样 `/` → `/hello`，**每次启动都会进入首次引导页**；桌面端窗口加载的正是根路径，同样生效。

### 10. 首页去掉 Star 提示与 GitHub 按钮

`apps/web/src/pages/home/index.vue`：删除 `.githubAction` 整块（「点个 Star 支持一下」提示 + 箭头 SVG + GitHub 外链按钮）、对应的 `.githubAction` / `.starHint` 样式，以及只为它引入的 `IconBrandGithub`。顶部现在只剩左侧的「设置」按钮。

---

## 四、运行时数据清理

代码改动只影响「新装环境」；**已运行过的工作区必须整理数据**，否则列表里仍会显示要移除的旧供应商：

- 删除 `data/providers/` 下已安装的 `apiMart.ts`、`metaso.ts`，**保留 `tfRouter.ts`**（服务器启动时会按内置源自动同步它），保留 `initialized` 标记。
- `data/settings.json` 中 `settings.customProviders` 保留 TF-Router 一项；首次启动会自动写入，已有列表不会被覆盖，需要手工补齐时按下面结构填写：

  ```json
  [
    {
      "id": "tfRouter",
      "label": "TF-router",
      "version": "2.0.0",
      "apiUrl": "https://api.toonflow.net/v1",
      "protocol": "openai-completions",
      "models": [],
      "apiKey": ""
    }
  ]
  ```

> `saver` 备份：改动前脚本会把 `settings.json` 备份为 `settings.json.bak-<时间戳>`。

---

## 五、版本更新后如何沿用

`changes.patch` 是**相对上游基线标签**的完整定制差异（不含本目录）。升级按下面的流程做，v2.0.4 → v2.0.6 已按此走通。

1. **先给定制做快照**，确保工作区干净：

   ```powershell
   git add -A
   git commit -m "定制快照"
   ```

2. **取上游新版本并拉一个升级分支**（假设目标标签是 `vX.Y.Z`）：

   ```powershell
   git fetch origin --tags
   git checkout -b update/vX.Y.Z vX.Y.Z
   ```

3. **把定制提交 cherry-pick 过来**（`<定制提交>` 换成第 1 步的提交号）：

   ```powershell
   git cherry-pick <定制提交>
   ```

4. **逐项解决冲突**。原则：**结构取上游、文案取定制**。上游改写过的文件（尤其 `apps/server/src/app.ts`、`apps/web/src/pages/*`、`packages/providers/index.ts`）优先保留上游新逻辑，再把定制点贴回去。v2.0.6 的冲突共 22 个文件，集中在：

   - 桌面端：上游换了启动器路径（`startupLauncher.exe`）、加了远程连接参数
   - `app.ts`：上游把预装供应商扩到 4 个（含 `compshare`），定制版只保留 `tfRouter.ts`
   - `providers/index.ts`：上游新增 `compshare` 与 `getPrice/getBalance` 相关类型导出
   - 供应商定义新增可选 `icon` 字段；定制版目录里没有自带图标的供应商，两个「添加供应商」对话框仍只用 `modelIcon` 品牌图标
   - 插件市场：上游把内置插件判断挪到 `pluginMarket/index.vue`，仍是 `author === "Toonflow"`，与定制约定一致

5. **重跑品牌替换**，兜住上游新增/改写的文案：

   ```powershell
   pwsh -File customization/applyBrand.ps1
   ```

   脚本用 ripgrep 只扫真正含 `Toonflow` 的文件，替换规则与保护清单见第一章。上游新增的语言文件也会被覆盖。

6. **装依赖 + 类型检查 + 重建**：

   ```powershell
   bun install --frozen-lockfile
   bun run --filter @toonflow/server typecheck
   bun run --filter @toonflow/web typecheck
   pwsh -File customization/reapply.ps1
   ```

7. **最后重新生成补丁**，让基线指向新版本：

   ```powershell
   git diff vX.Y.Z HEAD --binary --full-index -- . ':(exclude)customization' > customization/changes.patch
   ```

### 升级记录

| 版本 | 上游规模 | 结果 |
| --- | --- | --- |
| v2.0.4 → v2.0.6 | 20 个提交、406 个文件（新增 `apps/mobile`、设备互联、compshare 供应商、供应商价格/余额接口） | 定制全部保留，类型检查通过 |

保留的上游新功能：设备互联（手机连接按钮与设置面板）、插件市场「发现插件」、供应商价格/余额相关类型与 UI。

---

## 六、注意事项

- **`bun run dev` 在 bun 1.3.14 + Windows 上只启动 Server、不启动 Web**，请分别用 `bun run dev:server` 与 `bun run dev:web`。
- 每次跑 dev，`apps/server/src/router.ts` 与 `apps/web/src/types/components.generated.d.ts` 会被工具链按 LF 重写而显示为「已修改」，内容其实一致；提交前 `git restore` 即可。
- Vite 开发服务由 **node.exe** 承载（不是 bun.exe），按 bun 过滤杀不掉它。
- 重启 PC 端前必须先结束上一版桌面进程，否则 `build/desktop` 被占用会报 `AccessDenied`。
- 火山引擎与可灵两个模板按各自公开 API 编写，**尚未用真实密钥验证**；首次接入时请用真机跑一次生成，确认模型 ID 与参数与你的账号权限一致。
