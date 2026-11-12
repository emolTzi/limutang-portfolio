# 架构说明与扩展指南

这份文档写给以后接手这个站点的人——或者 AI。读完它，你应该能在不破坏现有结构的前提下，放心地加内容、加视觉、加交互。

目录：

1. [设计语言](#1-设计语言)
2. [总体结构](#2-总体结构)
3. [内容层：`site.js` 与区块模板](#3-内容层)
4. [粒子引擎](#4-粒子引擎)
5. [交互层](#5-交互层)
6. [样式架构](#6-样式架构)
7. [性能与降级](#7-性能与降级)
8. [扩展配方](#8-扩展配方)
9. [约定](#9-约定)

---

## 1. 设计语言

一句话：**暖墨色的底，纸白的字；琥珀代表「人」与「愿」，青色代表「智能体」。**

- 颜色、字体、字号阶梯、缓动曲线全部定义在 `src/styles/tokens.css`，别处不写死数值。
- 中文展示字体是思源宋体（Noto Serif SC）的 600 / 900 两个字重，正文中文走系统黑体；拉丁展示用 Instrument Serif（斜体做点缀），等宽小标签用 DM Mono。
- 每一章的结构相同：章节进度点（七颗，第几章亮几颗）→ 超大号宋体标题 + 斜体英文 → 一条画出来的细线 → 内容。
- 粒子不是背景装饰：每一章有一个与内容对应的编队，被「装」进页面里的占位框，和版式一起排布、一起滚动。
- 两种强调色有分工，不要混用：琥珀 = 人、重点、编号；青 = 智能体、进行中的状态。

## 2. 总体结构

```
src/content/site.js   内容（唯一数据源）
        │
        ▼
src/sections/*        模板：数据 → HTML 字符串（纯函数）
        │
        ▼
src/main.js           启动：渲染 → 核心服务 → 舞台 → 交互 → 开场
        │
        ├── src/core/   时钟 · 指针 · 滚动 · 事件 · 环境 · 数学     （不依赖页面内容）
        ├── src/fx/     粒子场 · 着色器 · 编队 · 调度表 · 导演 · 智能体群
        └── src/ui/     导航 · 指令面板 · 进场动效 · 磁吸倾斜 · 光标 · 读数
```

依赖方向是单向的：`core` 不引用任何上层；`fx` 只引用 `core`（和内容里的团队结构）；`sections` / `ui` 可以引用 `core` 与 `fx` 暴露的接口。没有框架、没有打包器，浏览器直接加载 ES 模块。

### 上下文对象 `ctx`

`main.js` 创建一个 `ctx`，传给所有需要依赖的模块（调试时可在控制台用 `__lmt` 访问）：

| 字段 | 来源 | 说明 |
| --- | --- | --- |
| `site` | `content/site.js` | 全站内容 |
| `env` | `core/env.js` | 设备档位、是否精简动效、是否有鼠标等 |
| `bus` | `core/bus.js` | 事件总线（事件清单写在该文件头部） |
| `ticker` | `core/ticker.js` | 全站唯一的 rAF 循环 |
| `pointer` | `core/pointer.js` | 统一的指针状态 |
| `scroll` | `core/scroll.js` | 平滑滚动与 `scroll.to()` |
| `stage` | `fx/stage.js` | 粒子舞台的对外接口 |

### 启动顺序（`main.js`）

1. 由 `site.js` 渲染导航外壳与全部章节（替换 `index.html` 里的静态降级内容）
2. 启动指针与滚动
3. 等展示字体就绪（名字粒子要按真实字形采样；超时用系统宋体兜底）
4. 创建舞台：WebGL2 上下文 → 生成全部编队 → 导演
5. 绑定交互：导航、指令面板、各区块 `mount`、进场动效、磁吸倾斜、光标、读数
6. 加载层淡出，`html` 加上 `is-ready`，粒子从星尘汇聚成当前编队

任何一步抛错都会落到 `boot().catch`：页面切换为静态版，内容照常可读。

### 逐帧循环

所有逐帧逻辑都通过 `ticker.add(fn, order)` 注册，按 `ORDER` 依次执行：`INPUT`（指针）→ `SCROLL`（滚动）→ `LOGIC`（各模块）→ `RENDER`（导演 + 粒子）。不要另开 `requestAnimationFrame` 循环（一次性的短动画除外）。

### `html` 上的状态类

| 类名 | 含义 |
| --- | --- |
| `js` / `no-js` | 脚本是否可用 |
| `is-static` | 脚本没跑起来（本地 `file://`、加载失败、启动出错）→ 静态版 |
| `has-gl` | WebGL2 粒子在运行 |
| `is-lite` | 精简动效模式 |
| `is-armed` | 进场动效已就绪（只有这时元素才会被先藏起来） |
| `is-ready` | 开场完成 |
| `has-smooth-scroll` / `is-locked` | 平滑滚动由脚本接管 / 弹层打开时锁定滚动 |
| `has-cursor` / `is-charging` | 自定义光标启用 / 正在按住蓄力 |
| `menu-open` | 窄屏全屏菜单打开 |

## 3. 内容层

### `src/content/site.js`

全站唯一数据源，字段含义见文件内注释。三个要点：

- **`links` 是链接注册表。** 其他地方只引用 key。`url` 为空即「待接入」，填上后传送门、项目按钮、演示清单、指令面板、联系区同时生效。
- **`chapters` 决定章节顺序与编号。**
- **`projects.items[].team` 决定团队结构**，同时驱动 SVG 架构图、`network` 粒子编队、光标智能体群（通过 `getTeam()`）。

### 区块模块约定（`src/sections/*.js`）

```js
export default {
  id: 'about',                                   // 对应 site.chapters 里的 id
  render({ site, chapter, index }) { return `…`; },   // 纯函数：数据 → HTML 字符串
  mount(root, ctx) { /* 可选：绑定这个区块专属的交互 */ },
};
```

- `render` 不碰 DOM、不读 `window`，因此同一套模板也能在 Node 里运行（`tools/prerender.mjs` 与 `tools/fonts.mjs` 就是这么复用它们的）。
- 所有来自内容文件的字符串进模板前都要过 `esc()`（或 `rich()`，它在转义后把 `**片段**` 变成高亮）。
- 共用片段在 `sections/shared.js`：`secHead`（章节标题）、`pill`（状态胶囊）、`chips`（标签）、`linkButton`（按注册表生成按钮）、`blockHead`（小节标题）。
- 区块专属、有一定体量的交互放在 `sections/widgets/`（目前有 `orgchart.js` 架构图、`wavelab.js` 波动实验台）。

### 声明式属性

模板里写属性，行为由对应模块统一接管：

| 属性 | 接管者 | 作用 |
| --- | --- | --- |
| `data-cue="预设名"` | `fx/director.js` | 这段页面滚到视口中线时，粒子切到该预设 |
| `data-cue-mode="backdrop"` | 同上 | 沿用同一编队，但退到正文背后当氛围 |
| `data-stage-anchor` | 同上 | 占位框：编队被装进这个元素的矩形里，并随它滚动 |
| `data-reveal[="fade｜mask｜line｜chars"]` | `ui/motion.js` | 进入视口时进场 |
| `data-stagger` | 同上 | 内部的 `data-reveal` 依次错开 |
| `data-split` | 同上 | 文字拆成单字（配合 `data-reveal="chars"`） |
| `data-illuminate` | 同上 | 长段落随滚动逐字点亮 |
| `data-scramble` / `data-count="N"` | 同上 | 乱码归位 / 数字滚动 |
| `data-intro` + `style="--d:1s"` | 样式 | 首屏元素在开场后按延迟依次出现 |
| `data-magnetic[="0.3"]` | `ui/interact.js` | 被光标吸引 |
| `data-tilt[="5"]` / `data-spot` | 同上 | 3D 倾斜 + 聚光 / 仅聚光（写入 `--mx --my --rx --ry --hover`） |
| `data-cursor="文字"` | `ui/cursor.js` | 悬停时光标旁显示标签 |
| `data-agent-target` | 同上 | 悬停时智能体群沿该元素边框巡逻 |
| `data-hud="particles｜fps｜agents｜clock｜travel"` | `ui/hud.js` | 实时读数 |
| `data-no-charge` | `fx/director.js` | 在该元素上按住鼠标不触发蓄力 |
| `data-native-scroll` | `core/scroll.js` | 元素内部的滚轮不被平滑滚动接管 |
| `data-palette-open` | `ui/palette.js` | 点击打开指令面板 |

## 4. 粒子引擎

六个文件，各管一件事：

| 文件 | 职责 |
| --- | --- |
| `fx/field.js` | **引擎**：管理 GL 资源，每帧跑四个通道。不知道什么是章节、什么是滚动 |
| `fx/shaders.js` | 全部 GLSL |
| `fx/formations.js` | **编队**：把一个形状描述成 n 个目标点（纯 JS，不碰 WebGL） |
| `fx/cues.js` | **调度表**：每个预设用哪个编队、怎么摆、多亮、什么配色 |
| `fx/director.js` | **导演**：把滚动位置、DOM 占位框、指针翻译成引擎参数 |
| `fx/stage.js` | 装配以上各项，对外暴露一个小接口；负责自适应画质 |

### 渲染管线（每帧）

1. **SIM** — 物理模拟写在顶点着色器里，结果通过 Transform Feedback 写回缓冲（两块状态缓冲来回倒）。全程在 GPU 上，CPU 不遍历粒子。
2. **DRAW** — 粒子以加色混合画进半浮点离屏纹理；按到对焦平面的距离放大成散景光斑并相应变暗（能量守恒）。
3. **TRAIL** — 与上一帧做 `max(上一帧 × 衰减, 当前帧)`，得到运动拖尾。
4. **COMPOSITE** — 用 mip 链做泛光，叠加色散、色调映射、背景雾、暗角、胶片颗粒，输出到屏幕。

### 每个粒子的数据

| 属性 | 内容 |
| --- | --- |
| `aPos` | xyz 位置，w = 热度（被指针扰动后升高，颜色由冷白变琥珀） |
| `aVel` | xyz 速度，w = 变形进度 |
| `aSeed` | 4 个随机数（个体差异、变形延迟、是否为「追随者」） |
| `aFrom` / `aTo` | 在旧 / 新编队中的目标点 xyz，w = 分组号 |

粒子受的力：回位弹簧（拉向目标点）、无散度流场（湍流）、指针推开与旋涡、蓄力吸入、释放冲击波、滚动风。全部在 `SIM_VS` 里，带中文注释。

### 坐标约定

相机的视场角固定，距离取得刚好让 **z = 0 平面的可视高度等于 2 个世界单位**（原点在视口中心，y 向上）。于是 DOM 像素换算成世界坐标只需乘以 `2 / 画布高度`，导演就是这样把编队对齐到占位框的。

### 编队（`formations.js`）

```js
defineFormation('名字', (n, ctx) => ({ data, size }));
```

- `data`：`Float32Array(n × 4)`，每个粒子 `[x, y, z, 分组号]`
- `size`：`[宽, 高]`，这个形状在预设旋转下投影到屏幕的大致包围盒，导演据此缩放到占位框
- **第 i 个粒子落在形状的哪一部分必须随机**：引擎降画质时只画前 k 个粒子，随机分布才能保证形状完整
- 分组号用于局部高亮（`stage.focusGroup(i)`）；不参与高亮的粒子填 `GROUP_NONE`
- `ctx = { rand, site, team, text, font, weight, vertical }`，`rand` 带固定种子，结果可复现

现有编队：`glyphs`（文字）、`dust`（星尘）、`terrain`（山脊与云）、`orbs`（七颗光球）、`wave`（干涉水面，波纹由着色器实时叠加）、`network`（团队网络）、`galaxy`（星系）、`stack`（技术栈，层数 = 技能分组数）、`portal`（传送门）、`orb`（带环光球）。

### 调度表（`cues.js`）

每个预设是一组「到位之后的状态」，导演负责平滑过渡。常用字段：

| 字段 | 含义 |
| --- | --- |
| `formation` | 用哪个编队 |
| `anchored` / `fitMode` / `fit` | 是否装进占位框；按 `contain`、`height` 还是 `width` 缩放；缩放余量 |
| `pos` / `scale` | 不用占位框时在视口中的位置与大小 |
| `rot` / `spin` / `sway` | 静态倾斜、自转角速度、随指针转动的幅度 |
| `spring` / `damp` / `turb` / `breath` | 弹簧刚度、阻尼、湍流、整体呼吸 |
| `dim` / `size` / `aperture` / `exposure` / `bloom` / `decay` | 亮度、粒子大小、景深光圈、曝光、泛光、拖尾长度 |
| `palette` | 配色（`PALETTES` 里的 `ink｜amber｜jade｜dawn`） |
| `area` | 设计稿里编队占的屏幕面积；实际更小时粒子按比例缩小，防止过曝 |
| `narrow: { … }` | 窄屏（< 860px）时覆盖的字段 |

`MODES.backdrop` 是修饰模式：同一编队退到正文背后（推远、变暗、虚化）。

### 舞台接口（`ctx.stage`）

```js
stage.enabled          // WebGL 是否可用（false 时下面都是空操作）
stage.focusGroup(i)    // 高亮当前编队的第 i 组，-1 取消
stage.refresh()        // 增删了 data-cue 元素之后重新扫描
stage.charge           // 当前蓄力值 0…1
stage.stats()          // { particles, width, height, hdr }
stage.settle(seconds)  // 调试：只算物理不出画面，快进若干秒
```

## 5. 交互层

- **`core/scroll.js`** — 自研惯性滚动：拦截滚轮、累加目标值、逐帧追赶，但页面仍是原生滚动，所以 `position: sticky`、锚点、键盘、读屏都照常工作。触屏与精简模式退回原生。
- **`ui/nav.js`** — 导航、章节轨、全屏菜单全部由 `site.chapters` 生成；负责锚点跳转与当前章节追踪（广播 `chapter` 事件）。
- **`ui/palette.js`** — 指令面板。条目由内容生成：章节、链接注册表、几个动作。
- **`ui/motion.js`** — 进场与文字动效（见上面的属性表）。拆字时保留一份完整的隐藏文本给读屏。
- **`ui/interact.js`** — 磁吸、倾斜、聚光。位移用独立的 CSS `translate` 属性，不与元素自身的 `transform` 冲突。
- **`ui/cursor.js` + `fx/flock.js`** — 光标本体是零延迟的小点；「跟随感」来自智能体群：协调者围着光标，执行者只围着各自的协调者，编制取自 `getTeam()`。
- **`ui/hud.js`** — 页面上的读数都是真实值（粒子数、帧率、光标里程等）。

## 6. 样式架构

`src/styles/` 按级联层组织，顺序在 `tokens.css` 顶部声明：

```
reset → tokens → base → components → chrome → sections → utilities
```

| 文件 | 内容 |
| --- | --- |
| `fonts.css` | `@font-face`（工具生成，勿手改） |
| `tokens.css` | 设计令牌与层顺序 |
| `base.css` | 重置、全局排版、舞台画布定位、工具类 |
| `components.css` | 章节标题、胶囊、标签、按钮、列表、跑马灯、**进场动效** |
| `chrome.css` | 加载层、导航、章节轨、菜单、光标、指令面板、静态降级规则 |
| `sections.css` | 各章节版式 + 窄屏规则 |
| `print.css` | 打印样式（仅 `media="print"` 时加载） |

要点：

- 新样式写进对应的层；不在任何层里的规则优先级最高，留给「必须压过一切」的场合（打印、降级）。
- **进场动效的隐藏状态只在 `html.is-armed` 下生效。** 所以脚本没跑、出错或处于精简模式时，所有内容默认可见——不要写「默认 `opacity: 0`，等脚本来显示」的样式。
- 版式统一用 12 栏网格；占位框（`[data-stage-anchor]`）就是一个有尺寸的空盒子，调它的位置和大小就是在调粒子编队的位置和大小。
- 断点：1100px（导航收成菜单、章节轨隐藏）、860px（全部收成单栏，占位框移到文字上方，同时是粒子预设的「窄屏」分界）、720px 竖屏（首屏名字竖排，须与 `fx/stage.js` 的 `VERTICAL_QUERY` 保持一致）、520px。

## 7. 性能与降级

- **设备档位**（`core/env.js`）：`soft`（软件渲染）/ `low`（手机、小屏）/ `mid` / `high`，决定粒子数、渲染分辨率上限、是否开启后期。
- **自适应画质**（`fx/stage.js`）：持续监测帧率，低于 40 时按 `QUALITY_STEPS` 逐级降低分辨率与粒子数，只降不升。
- **LOD 的实现**：降粒子数时只画前 k 个粒子，所以编队里粒子的分布必须随机。
- **观感一致性**：实际粒子数偏离参考值时，引擎自动补偿亮度与大小（`field.js` 的 `density`）；编队显示得比设计稿小时，粒子同比例缩小（`cues.js` 的 `area`）。
- **精简动效**（系统设置或指令面板切换）：无进场动画、无平滑滚动、无自定义光标，粒子湍流减弱、无拖尾。
- **静态降级**：`index.html` 里内嵌一份由 `tools/prerender.mjs` 生成的完整内容。脚本没跑起来时加载层不出现，直接显示这份内容。
- **上下文丢失**：`field.js` 监听 `webglcontextlost / restored`，恢复时重建全部 GL 资源。

## 8. 扩展配方

### 新增一个粒子编队，并用在某一段页面上

1. `fx/formations.js`：`defineFormation('spiral', (n, { rand }) => { …; return { data, size: [宽, 高] }; })`
2. `fx/cues.js`：在 `CUES` 里加一个预设，例如 `spiral: { formation: 'spiral', rot: [0.4, 0, 0], spin: [0, 0.1, 0], palette: 'jade' }`
3. 模板里给目标元素写 `data-cue="spiral"`，并在它内部放一个 `<div data-stage-anchor></div>`，用 CSS 给这个占位框定尺寸和位置

不需要改 `field.js`、`shaders.js` 或 `director.js`。

### 新增一个章节

1. `site.js`：在 `chapters` 里加 `{ id: 'writing', zh: '写作', en: 'Writing' }`，并放好它的数据
2. 新建 `sections/writing.js`，按区块约定导出 `id / render / mount`（开头用 `secHead(chapter, index)`）
3. 在 `sections/index.js` 的 `registry` 里登记
4. 样式写进 `styles/sections.css`
5. 想要专属粒子：给元素加 `data-cue`

导航、章节轨、编号、指令面板会自动包含新章节。注意首屏的「七颗进度点」数量取自 `chapters.length`，会自动变化。

### 新增一个项目 / 竞赛 / 技能分组 / 传送门

只改 `site.js`。项目的 `visual` 字段指向一个已有预设；技能分组数会自动反映到 `stack` 编队的层数。

### 新增一个指令面板条目

`ui/palette.js` 的 `buildItems()` 里追加：

```js
items.push({ group: '动作', title: '显示名称', hint: '右侧小字', keys: '搜索关键词', run: () => { … } });
// 或者直接给链接：{ …, href: 'https://…' }
```

### 新增一种声明式交互

1. 在 `ui/` 下写一个模块，导出 `initXxx(ctx, root)`，内部用 `$$('[data-xxx]')` 找元素
2. 逐帧逻辑用 `ctx.ticker.add()`
3. 在 `main.js` 第 5 步里调用
4. 把属性补进本文档第 3 节的表格

### 调画面

绝大多数「想让它更亮 / 更慢 / 更虚 / 换个颜色」都只需要改 `cues.js` 里的数值。想改粒子的运动规律（比如加一种力）才需要动 `shaders.js` 的 `SIM_VS`，并在 `field.js` 的 `defaultParams()` 与 `simulate()` 里补上对应的 uniform。

### 波动实验台加一个实验

`sections/widgets/wavelab.js`：往 `LABS` 里加一个工厂函数，返回 `{ update(dt, input, w, h), draw(g, w, h) }`，再在 `sections/projects.js` 的 `wavelab()` 模板里加一个 `<figure data-lab="名字">`。

## 9. 约定

- **零运行时依赖。** 不引入框架和第三方库；`node_modules` 只服务于 `tools/` 里的可选工具。
- **一切路径用相对路径**（`./…`），这样站点挂在域名根目录还是 `/仓库名/` 下都能工作。
- **不依赖外部网络资源**：字体、图标全部自托管。
- **内容与表现分离**：文字只出现在 `site.js`（界面上的少量固定标签除外）；模板不写死内容。
- **简历内容以事实为准**：不要为了好看而编造数字、头衔或经历；示意性的数据（如团队节点数量）要在页面上注明「示意」。
- **降级优先**：新功能先想清楚「脚本没跑、没有鼠标、精简动效、没有 WebGL」四种情况下是什么样。
- **注释写「为什么」**：模块头部说明职责与用法，行内注释解释不显然的决定。
- 改完内容或用字后运行 `npm run refresh`，保持字体子集、静态降级内容与 `standalone.html` 同步。
