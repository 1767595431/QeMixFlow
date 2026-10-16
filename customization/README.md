# QeMixFlow 定制改动记录

本目录记录本项目相对上游 Toonflow 源码所做的**全部定制改动**。上游发布新版本、需要重新拉取源码并重新编译时，按本文末尾「版本更新后如何沿用」操作，即可保留这些改动。

基线：`HBAI-Ltd/Toonflow-app`，提交 `72a895c`（tag `v2.0.4`）。

---

## 一、品牌替换：Toonflow → QeMixFlow

只替换**用户可见的品牌文案**，内部标识一律保留（见本节末尾）。

> **品牌更名历程**：上游 `Toonflow` → 定制占位 `YHQeMix` → 定名 **QeMixFlow**。
> 公司 logo 文件名仍是 `YHQeMix.png`（未改名），产品名是 `QeMixFlow`，两者是「公司品牌 + 产品名」的关系。
> `customization/applyBrand.ps1` 已把 `Toonflow` 与 `YHQeMix` 两种写法一并归一到 `QeMixFlow`，以后合并上游跑一遍即可。

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
(?<![/@A-Za-z0-9_])Toonflow(?!\/2\.0)   →   QeMixFlow
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

## 二、公司 logo（界面）与应用图标（exe）

### 界面里的公司 logo：`YHQeMix.png`

源图：项目根目录 `YHQeMix.png`（328×80，横向文字 logo，32 位带透明通道）。

#### 做法

- `packages/assets/logo.png`：`YHQeMix.png` 的副本。
- `packages/assets/logo.svg`：**改写为内嵌该 PNG 的 SVG**（`<image href="data:image/png;base64,...">`，`viewBox="0 0 328 80"`，`preserveAspectRatio="xMidYMid meet"`）。
  这样 8 处按 `@toonflow/assets/logo.svg` 引用 logo 的代码**无需逐个改 import** 即可生效，包括 hello 页用 `?raw` 注入 SVG 的写法。

#### 连带调整

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

### 应用图标：`qmix.png`

源图：项目根目录 `qmix.png`（105×80 的 Y+H 品牌标记，32 位带透明通道）。

- 生成脚本：`customization/buildAppIcon.ps1`——把标记居中放到**透明**正方形画布（四边留 14% 边距），再输出多尺寸 ICO 与 iconset。画布透明而不是取源图四角颜色作底色，任务栏、开始菜单与安装向导里不会出现白方块。
- 产物：
  - `packages/assets/logo.ico`：含 16/24/32/48/64/128/256 七个尺寸，被 `electrobun.config.ts` 的 `win.icon` 与 `apps/desktop/scripts/packageWindows.ts` 使用。
  - `packages/assets/logo.iconset/icon_*.png`：10 个尺寸，供 macOS 打包，以及 Android（`apps/mobile/scripts/build.ts`）与鸿蒙（`compat/ohos/build.ts`）取用 `icon_512x512.png`。
- **已知限制**：源图只有 105×80，任务栏/安装包常用的 16~48px 清晰，128px 以上是放大结果、会偏软。换一张 1024×1024（或 SVG）的源图重跑脚本即可提升。
- 项目根目录另有一张 2048×2048 的 `短剧无限画布应用图标.jpeg`（右下角带「豆包AI生成」水印），当前未使用；若要改用它，需要先裁掉水印。

---

## 三、界面调整（5 项）

### 1. 首页图标后面不再显示文字

`apps/web/src/pages/home/index.vue`：删除 `<h1>QeMixFlow</h1>`、`.brand` 的 `gap` 以及对应 `h1` 样式。

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
- 素材**保留原图比例**（1440×2560 → 1200×2133，JPEG 质量 90，三张合计约 1.6 MB），不做裁切。
- 渲染方式：`bg.vue` 重写为最简轮播组件——三张 `<img>` 叠加，`object-fit: cover` **撑满整个右侧面板**，靠 `opacity` 交叉淡入切换。**不使用任何胶片效果**（无颗粒、抖动、曝光闪烁、灯漏、齿孔与画格外框），也不再走 canvas。
- 原 `assets/image.png` 已移除（工作区留档：可视化临时目录的 `image.removed.png`）。

> 若后续换图：直接替换 `helloArtN.jpg` 即可（任意比例都会被 `cover` 撑满，超出部分居中裁掉），或在 `bg.vue` 的 `artSources` / `artInterval` 调整张数与间隔。

### 9. 引导页彩色化 + 启动默认进入引导页

- `apps/web/src/pages/hello/bg.vue`：去掉 `grayscale(1)` 滤镜，剧照保留原色，仅保留 `contrast(1.08) brightness(...)` 的对比与曝光闪烁。
- `apps/web/src/router/index.ts`：删除 `/hello` 上的 `beforeEnter` 守卫（原逻辑是 `helloCompleted` 为真时跳转 `/home`），并移除随之无用的 `useHelloStore` 导入。这样 `/` → `/hello`，**每次启动都会进入首次引导页**；桌面端窗口加载的正是根路径，同样生效。

### 10. 首页去掉 Star 提示与 GitHub 按钮

`apps/web/src/pages/home/index.vue`：删除 `.githubAction` 整块（「点个 Star 支持一下」提示 + 箭头 SVG + GitHub 外链按钮）、对应的 `.githubAction` / `.starHint` 样式，以及只为它引入的 `IconBrandGithub`。顶部现在只剩左侧的「设置」按钮。

### 11. 隐藏「设备互联」（手机连接）

上游 v2.0.6 新增的功能，定制版用不到，三处入口一并移除：

| 位置 | 处理 |
| --- | --- |
| `apps/web/src/components/settings/index.vue` | 删除 `deviceLink` 面板条目，以及只为它引入的 `isMobile`、`IconDevices` |
| `apps/web/src/pages/home/index.vue` | 删除顶部「设备互联」按钮、`<mobileConnect>` 弹窗挂载点，以及 `@/lib/mobile` 导入、`mobileConnectVisible` / `mobileConnect`、`IconQrcode` / `IconDeviceDesktop` |
| `apps/web/src/pages/hello/index.vue` | 同上，并删除 `.mobileConnectButton` 样式 |

> `apps/web/src/components/mobileConnect.vue` 与 `lib/mobile.ts` 保留未删（上游文件，避免影响后续合并）。

### 12. 引导页说明文案

`apps/web/src/pages/hello/index.vue`：把「选择登录TF-Router可直接自动配置，无需任何复杂操作，即可开始创作。」改为「请自行配置，无需任何复杂操作，即可开始创作。」（与「登录 TF-Router 自动配置」按钮已移除保持一致）。

> 该句以中文原文作为 i18n 键，改后其他语言没有对应译文，会回退显示这句中文。

### 13. 引导页显示公司 logo

`apps/web/src/pages/hello/index.vue`：在「快速开始」标题上方居中显示公司 logo（复用 `@toonflow/assets/logo.svg`，宽 168px）。

> 位置按需求定在左侧文字面板内，不覆盖右侧剧照——右侧仍保持「不加文字和图片」。

### 14. 引导页加「开始创作」主按钮

`apps/web/src/pages/hello/index.vue`：在说明文案下方加一个通栏主按钮「开始创作」（`type="primary"`，最小高 48px，圆角与页面面板一致），点击执行 `completeSetup`——写入引导完成状态后跳转 `/home`。

> 「开始创作」与下方原有的次要按钮「稍后配置」调用同一个方法，区别只在视觉主次：「添加私有提供商」进 `custom` 配置视图，两个直接开始的入口都是跳过配置先进入主页（与上游「稍后配置」的行为一致）。

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
- 应用图标源图 `qmix.png` 与公司 logo `YHQeMix.png` 都在仓库根目录；改图标后需重跑 `customization/buildAppIcon.ps1` 并**重建 PC 端**，ICO 是构建时嵌进 exe 的。
- 引导页移除「登录 TF-Router 自动配置」按钮后，`openLogin`、`login` 视图与 `configureProviders` 已经没有入口，属于保留未删的上游死代码（没有再导出的其他引用）；要彻底精简可整块删除。
- 火山引擎与可灵两个模板按各自公开 API 编写，**尚未用真实密钥验证**；首次接入时请用真机跑一次生成，确认模型 ID 与参数与你的账号权限一致。

---

## 七、打包与版本

### 版本策略

`electrobun.config.ts` 的 `app.version` 默认值就是**本仓基线版本**，当前为 `2.0.6`，与上游 tag 对齐；`package.json`、`apps/desktop/package.json` 上游本来就没有 `version` 字段，不另外增加，避免出现第二个真相来源。

- 常规构建直接用默认值，产物名与内置版本自动是 `2.0.6`。
- 临时构建别的版本号可用环境变量覆盖：`appVersion=2.0.7 bun run package:desktop`。
- 合并上游新版本时，把这里的默认值一并改成对应的上游版本号，保持「功能同步、版本号同步」。
- 该版本号会写进 exe 的 `version.json`、更新清单和 Web 构建里的 `import.meta.env.appVersion`，所以 dev 与安装包显示的版本一致。

### 安装包

```powershell
bun run package:desktop
```

依次构建工具、节点、扩展、Web、MCP，再走 Electrobun 稳定通道，最后由 NSIS 打出安装包：

- 产物：`build/desktop/artifacts/QeMixFlow-<版本>-Setup.exe`（安装向导、注册表显示名、快捷方式、桌面与开始菜单项都是 QeMixFlow）。
- 命名定制：`apps/desktop/scripts/packageWindows.ts` 与 `apps/desktop/scripts/release.ts` 里的 `toonflow-<版本>-Setup.exe` 改成了 `QeMixFlow-<版本>-Setup.exe`，这是用户下载时唯一可见的文件名。Electrobun 内部的 tarball 与增量补丁仍保留 `toonflow-` 前缀，因为更新清单按原名互相引用，改名会破坏增量更新。
- 前置条件：Electrobun 2.0.1 + NSIS（默认找 `C:/Program Files (x86)/NSIS/makensis.exe`，本机用 `NSIS_PATH=D:\Tools\NSIS\makensis.exe`）。首次打包会从 NuGet 与微软官网下载并验签 WebView2 SDK 与引导程序，缓存到 `build/desktop/nsis/`。

> **打包环境坑**：在 Codex 自带的 PowerShell 7 里直接打包会失败——子进程继承的 `PSModulePath` 含 PS7 的模块目录，Electrobun 打包脚本调用的 `powershell.exe`（5.1）会去加载 PS7 版的 `Microsoft.PowerShell.Archive`，报 `Compress-Archive 不是可识别的命令`。打包前把 `PSModulePath` 设回 5.1 的值即可：
>
> ```powershell
> $env:PSModulePath = 'C:\Users\<用户>\Documents\WindowsPowerShell\Modules;C:\Program Files\WindowsPowerShell\Modules;C:\WINDOWS\system32\WindowsPowerShell\v1.0\Modules'
> ```

### 代码仓库

定制版推送到自己的仓库，上游仓库只用于取新版本：

```powershell
git remote add qemixflow https://github.com/1767595431/QeMixFlow.git
git push qemixflow HEAD:main
```

- `origin` 仍是上游 `HBAI-Ltd/Toonflow-app`（用于 `git fetch origin --tags` 取新版本）；`qemixflow` 是自己的仓库。
- 不要用 `git push --tags` 推上游 tag：本机已 fetch 了上游全部 tag，标签名会跟自己的版本号撞车，需要发版时单独打。

---

## 八、安装足迹改名：安装后不出现 Toonflow

客户拿到的安装包必须从路径、注册表到界面都只有 QeMixFlow。本章列出为此改掉的每一处，以及刻意保留的“客户看不到的内部标识”。

### 1. 安装路径、注册表与协议

| 位置 | 上游 | 定制后 |
| --- | --- | --- |
| 应用标识（`electrobun.config.ts` 的 `app.identifier`） | `local.toonflow.desktop` | `local.qemixflow.desktop` |
| 安装目录（NSIS `InstallDir`） | `%LOCALAPPDATA%\local.toonflow.desktop\stable` | `%LOCALAPPDATA%\local.qemixflow.desktop\stable` |
| 卸载注册表项 | `...\Uninstall\local.toonflow.desktop.stable` | `...\Uninstall\local.qemixflow.desktop.stable`（显示名 QeMixFlow） |
| 安装目录标记文件 | `toonflow.ini` | `qemixflow.ini` |
| 卸载项里的目录值 | `toonflowInstallDirectory` | `qemixflowInstallDirectory` |
| URL 协议 | `toonflow://` | `qemixflow://`（注册到 `HKCU\Software\Classes\qemixflow`） |
| WebView2 检测日志 | `%TEMP%\toonflowWebView2Check.log` | `%TEMP%\qemixflowWebView2Check.log` |
| 更新临时器 | `%TEMP%\toonflowUpdate-<id>.exe` | `%TEMP%\qemixflowUpdate-<id>.exe` |

改这些必须成对改：标识同时出现在 `electrobun.config.ts`、`apps/desktop/src/update/windowsUpdater.ts`、`apps/desktop/native/updateHelper.cs`；`toonflow.ini` 与 `toonflowInstallDirectory` 同时出现在 `apps/desktop/installer/installer.nsi` 与 `updateHelper.cs`。任何一处漏改，安装后的一键更新会认不出自己的安装目录。

协议改名波及所有发出/校验链接的地方：`apps/web/src/main.ts`、`lib/saveFile.ts`、`lib/mobile.ts`、`apps/server/src/remoteConnection.ts`、`utils/mcp/resources.ts`、`apps/desktop/src/protocol.ts`、`native/protocolLauncher.cs`，以及 22 个 i18n 文件里的 `qemixflow://` 说明文案。

### 2. 更新源与匿名统计

- `apps/server/src/utils/desktop/index.ts`：`official` 与 `github` 两个更新源都由上游地址改为 `https://github.com/1767595431/QeMixFlow/releases/latest/download`，安装失败提示里的下载地址同步改。**不改这一项，客户端会把官方 Toonflow 版当成新版本下载回来。**
- `electrobun.config.ts` 的 `release.baseUrl` 默认值同样指向自有仓库。
- `apps/web/src/stores/settings.ts`：`dataCollectionEnabled` 默认由“开”改为“关”（`=== true`），新装客户端不再向 `api.toonflow.net/web/telemetry/report` 上报匿名使用数据；客户可在“隐私”面板自行开启。

### 3. 界面里会露出的作者与链接

- 内置节点/工具的元数据 `author` 由 `Toonflow` 改为 `QeMixFlow`（9 个 `packages/nodes/*/vite.config.ts` + 9 个 `packages/tools/*/build.ts`），`github` 改指自有仓库。插件市场列表直接显示这个字段，不改就会在“已安装”里看到 Toonflow。
- 因作者值变了，`apps/web/src/components/settings/panels/pluginMarket/index.vue` 里的官方插件判定改成 `isOfficialAuthor()`，`Toonflow`（远程官方插件）与 `QeMixFlow`（本仓内置）都算官方，避免内置节点被当成第三方而出现卸载按钮。
- 技能 frontmatter 的 `author: QeMixFlow`、`github` 同步；顺带修掉上一轮品牌替换脚本吃掉 `author:` 键名留下的 `: QeMixFlow` 非法 YAML（`packages/skills/*/SKILL.md`）。
- `packages/tools/webFetch/src/index.ts` 的 UA 由 `Toonflow/2.0` 改为 `QeMixFlow/2.0`。
- `apps/web/src/components/settings/panels/about.vue` 的仓库链接与 aria 文案改指自有仓库（该面板已隐藏，但文案仍在包里）。
- `packages/i18n`：`GitHub 仓库：…` 的键与译文、`qemixflow://` 说明全部改名。

### 4. 刻意保留的内部标识（客户看不到）

以下仍然是 `toonflow`，改它们要么会打断与上游的合并流程，要么要动全仓包名，收益为零：

- npm 包名 `@toonflow/*`（工作区包名，出现在所有 import 与构建产物里）；
- 进程间环境变量 `TOONFLOW_*`、HTTP 头 `x-toonflow-*`、页面事件与存储键 `toonflow:*`、CSS 类 `dockviewToonflow`；
- MCP 相关：包名 `@toonflow/mcp`、CLI 名 `toonflow-mcp`、技能目录 `mcp/skills/toonflow/`、环境变量 `TOONFLOW_MCP_TOKEN`；
- 节点扩展 API 名 `toonflowNodes.*`（`.hutch` 脚手架按此名注册节点）；
- 插件市场用来识别“上游官方插件”的 `author === "Toonflow"`（远程插件的元数据由上游市场下发，这里必须认这个值）。

### 5. 交付前的验证方法

安装验证不能在本机 Codex 的 shell 里直接做：该 shell 带 MSIX 包身份，写 `%LOCALAPPDATA%` 会被重定向到 `...\Packages\OpenAI.Codex_*\LocalCache\Local\`，读到的也可能是旧副本。要在包外上下文验证，用计划任务跑一段脚本即可：

```powershell
schtasks /create /tn qmfCheck /tr 'cmd.exe /c powershell.exe -NoProfile -File "D:\path\check.ps1" > "D:\path\out.log" 2>&1' /sc once /st 23:59 /ru <用户名> /it /f
schtasks /run /tn qmfCheck
```

本轮实测（包外上下文、静默安装 `QeMixFlow-2.0.6-Setup.exe /S`）结果：

| 检查项 | 结果 |
| --- | --- |
| 安装目录 | `%LOCALAPPDATA%\local.qemixflow.desktop\stable`，目录名与子项无 toonflow |
| `qemixflow.ini` | `identifier=local.qemixflow.desktop` |
| 卸载注册表 | 键 `local.qemixflow.desktop.stable`，显示名 QeMixFlow，版本 2.0.6 |
| 协议注册表 | `HKCU\Software\Classes\qemixflow`；`...\Classes\toonflow` 不存在 |
| 桌面快捷方式 | `QeMixFlow.lnk` → `...\local.qemixflow.desktop\stable\app\Resources\app\startupLauncher.exe` |
| 节点/工具元数据 | `"author":"QeMixFlow"` |
| 技能 frontmatter | `author: QeMixFlow`、`github: .../1767595431/QeMixFlow` |
| 启动 | 窗口标题 QeMixFlow，引导页正常渲染 |

> 安装包没有代码签名，客户首次运行会看到 SmartScreen“未知发布者”，需要点“更多信息 → 仍要运行”。要消除这个提示只能买代码签名证书。
>
> 开始菜单不建快捷方式（上游 NSIS 脚本只建桌面快捷方式），卸载走“设置 → 应用 → QeMixFlow”。
