# 李牧唐 · 个人主页

一个零依赖、零构建的静态个人主页：十余万颗 GPU 粒子拼成名字，随滚动依次变形为山脊、光球、波面、智能体网络、星系、技术栈、传送门；光标后面跟着一支按「多智能体 bot 团队」真实架构编队的智能体群。

整个站点就是一堆静态文件，丢到 GitHub Pages 就能运行。**改文字、接入链接只需要改一个文件：`src/content/site.js`。**

---

## 一、先看效果

| 方式 | 做法 |
| --- | --- |
| 最省事 | 直接双击 **`standalone.html`**（离线单文件版，粒子与交互俱全，不需要网络和服务器） |
| 本地开发预览 | 在本目录运行 `node tools/serve.mjs`，浏览器打开 `http://localhost:8080` |
| 没装 Node | `python -m http.server 8080` 效果一样 |

> 直接双击 `index.html` 会看到一份没有粒子的静态版，并带一条提示。这是浏览器的限制（不允许从 `file://` 加载脚本模块），不是坏了；部署到线上之后完全正常。

## 二、部署到 GitHub Pages

1. 在 GitHub 新建一个仓库。想用 `https://用户名.github.io` 这个地址，仓库就命名为 `用户名.github.io`；其他名字则地址是 `https://用户名.github.io/仓库名/`。两种都可以，站内所有路径都是相对路径。
2. 把本文件夹里的内容上传 / 推送到仓库（`node_modules` 不用传，`.gitignore` 已经排除）。
3. 仓库页面 → **Settings → Pages** → Source 选 **Deploy from a branch**，分支选 `main`、目录选 `/ (root)`，保存。
4. 等一两分钟，访问上面的地址。

部署后建议做一件小事：把 `index.html` 里 `og:image` 的地址换成完整网址（例如 `https://你的域名/assets/img/og.jpg`），这样把链接发到聊天软件里才会显示预览图。

## 三、改内容：只动 `src/content/site.js`

这个文件是全站唯一的内容源，里面有逐项注释。常见操作：

### 改文字

直接改对应字段。文本里用 `**双星号**` 包住的片段会显示为琥珀色高亮。

### 接入一个跳转链接（数字教材、视频站、GitHub……）

找到 `links` 注册表，把对应条目的 `url` 从 `''` 改成真实地址：

```js
links: {
  github: { title: 'GitHub', en: 'GitHub', desc: '代码仓库。', url: 'https://github.com/你的用户名' },
}
```

改完之后，**传送门卡片、项目里的按钮、指令面板、联系区的链接列表会同时生效**。`url` 留空的条目自动显示「待接入」且不可点击。

想加一个全新的入口：在 `links` 里加一项，再把它的 key 写进 `portals.items` 数组（顺序即展示顺序）。

### 把自己做的页面放进来（比如单文件的数字教材演示）

把页面放进 `works/` 目录，链接写相对路径即可，详见 [`works/README.md`](works/README.md)：

```js
textbook: {
  url: './works/textbook/',
  children: [
    { title: '泊肃叶定律', url: './works/textbook/poiseuille.html' },
    // …
  ],
}
```

`children` 是一个入口下面的子页面，各自独立接入，会显示在传送门卡片和项目的「演示清单」里。

### 增删项目 / 竞赛 / 技能

在对应数组里增删对象即可，编号、目录、跑马灯、打印版都会自动跟着变。

多智能体团队的结构在 `projects.items[2].team` 里：改了它，**架构图、背景里的粒子网络、光标后面的智能体群**会一起变化。

### 改完之后（可选但推荐）

```bash
npm install        # 只需一次
npm run refresh    # 依次：重新子集化字体 → 更新静态降级内容 → 重新生成 standalone.html
```

不运行也能正常访问——线上页面每次打开都会从 `site.js` 重新渲染。这一步只影响三样东西：新出现的汉字是否使用思源宋体（否则那几个字回退到系统宋体）、搜索引擎与无脚本环境看到的静态内容、以及 `standalone.html` 的内容。

## 四、可选工具

网站本身不需要 npm。下面这些只是辅助：

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动本地预览服务器（等同 `node tools/serve.mjs`，零依赖） |
| `npm run fonts` | 按全站实际用字把思源宋体子集化（每个字重约 90 KB），并生成 `src/styles/fonts.css` |
| `npm run prerender` | 把当前内容预渲染进 `index.html`，供搜索引擎 / 无脚本 / 本地双击时使用 |
| `npm run standalone` | 把样式、脚本、字体全部内联，生成离线单文件 `standalone.html` |
| `npm run refresh` | 上面三项按顺序跑一遍 |

## 五、目录结构

```
index.html              页面骨架（内容由脚本生成；内嵌一份静态降级内容）
standalone.html         离线单文件版（由工具生成）
404.html                找不到页面时显示
src/
  content/site.js       ★ 全站内容：文字、链接、章节顺序、团队结构
  main.js               启动入口
  core/                 引擎底座：时钟、指针、平滑滚动、事件总线、环境探测、数学
  fx/                   视觉引擎：WebGL2 粒子场、着色器、编队、调度表、导演、智能体群
  sections/             各章节模板（数据 → HTML）与它们的专属小部件
  ui/                   交互：导航、指令面板、进场动效、磁吸倾斜、光标、读数
  styles/               样式：tokens → base → components → chrome → sections（+ print）
assets/                 字体与图片
works/                  放你自己的页面（数字教材、演示……）
tools/                  可选工具
docs/ARCHITECTURE.md    架构说明与扩展指南（给以后接手的人或 AI）
```

想在这个基础上继续扩展，请先读 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)：里面写清了每一层的职责，以及「新增粒子编队 / 新增章节 / 新增指令」的具体步骤。

## 六、交互一览

- **移动鼠标**：粒子被拨开、染成琥珀色；一小群粒子始终绕着光标飞
- **按住鼠标再松开**：粒子被吸成旋涡，松开时炸出一圈冲击波
- **悬停链接 / 卡片**：智能体群散开，沿着目标的边框巡逻
- **⌘K / Ctrl+K / 按 `/`**：打开指令面板，输入关键词跳转章节、打开链接、复制邮箱、切换动效、打印简历
- **指向「技能」里的某一组 / 架构图里的某一条线**：背景里对应的那簇粒子亮起
- **数字教材项目里的两块小画布**：多普勒效应、简谐振动的合成，把鼠标移进去试试
- **打印（Ctrl+P）**：自动变成一份两页的黑白纸质简历

## 七、兼容与降级

| 情况 | 表现 |
| --- | --- |
| 现代浏览器（Chrome / Edge / Safari / Firefox 近两年版本） | 完整效果 |
| 帧率不足 | 自动逐级降低渲染分辨率与粒子数 |
| 没有显卡加速（软件渲染） | 自动使用极简粒子配置 |
| 手机 / 平板 | 名字改为竖排，粒子数减少，关闭光标类效果，其余保留 |
| 系统开启「减少动态效果」，或在指令面板切到「精简动效」 | 无进场动画、无平滑滚动、粒子保持平静 |
| 不支持 WebGL2 / 脚本被禁用 / 脚本加载失败 | 显示静态版：内容完整，名字以大号宋体呈现 |

调试用的地址参数：`?fx=off` 关闭粒子，`?motion=lite` 精简动效，`?n=60000` 指定粒子数，`?tier=high` 强制设备档位，`?debug` 在控制台输出引擎信息，`?still` 跳过开场动画。

## 八、字体与许可

页面使用 Noto Serif SC（思源宋体）、Instrument Serif、Instrument Sans、DM Mono，均以 SIL Open Font License 1.1 授权，已随站点自托管（不依赖任何外部 CDN），说明见 [`assets/fonts/LICENSE.md`](assets/fonts/LICENSE.md)。
