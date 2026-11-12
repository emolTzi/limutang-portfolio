# 李牧唐 · 个人主页

一个零依赖、零构建的静态个人主页。当前线上是**简洁版**：浅色背景、一种强调色、按章节排开的简历式页面。

花哨原版（GPU 粒子、自定义光标、智能体群等）已完整保留，随时可以回滚，见文末「回滚」。

整个站点就是一堆静态文件，丢到 GitHub Pages 就能运行。**改文字、接入链接只需要改一个文件：`src/content/site.js`。**

线上地址：<https://emoltzi.github.io/limutang-portfolio/>

---

## 一、先看效果

| 方式 | 做法 |
| --- | --- |
| 最省事 | 直接双击 **`standalone.html`**（离线单文件版，不需要网络和服务器） |
| 本地开发预览 | 在本目录运行 `node tools/serve.mjs`，浏览器打开 `http://localhost:8080` |
| 没装 Node | `python -m http.server 8080` 效果一样 |

> 直接双击 `index.html` 会看到一份没有脚本增强的静态版，并带一条提示。这是浏览器的限制（不允许从 `file://` 加载脚本模块），不是坏了；部署到线上之后完全正常。

## 二、部署到 GitHub Pages

仓库已按「从 `main` 分支根目录部署」打开 GitHub Pages。站内所有路径都是相对路径，挂在 `https://emoltzi.github.io/limutang-portfolio/` 下可以正常工作。

分享卡片的 `og:image` 已写成完整网址，把链接发到微信 / QQ 时可以显示预览图。

## 三、改内容：只动 `src/content/site.js`

这个文件是全站唯一的内容源，里面有逐项注释。常见操作：

### 改文字

直接改对应字段。文本里用 `**双星号**` 包住的片段会显示为强调色高亮。

### 接入一个跳转链接（数字教材、视频站、GitHub……）

找到 `links` 注册表，把对应条目的 `url` 从 `''` 改成真实地址。改完之后，传送门、项目里的按钮、联系区的链接列表会同时生效。`url` 留空的条目自动显示「待接入」且不可点击。

### 把自己做的页面放进来

把页面放进 `works/` 目录，链接写相对路径即可，详见 [`works/README.md`](works/README.md)。

### 改完之后（可选但推荐）

```bash
npm install        # 只需一次
npm run refresh    # 依次：重新子集化字体 → 更新静态降级内容 → 重新生成 standalone.html
```

不运行也能正常访问——线上页面每次打开都会从 `site.js` 重新渲染。这一步只影响三样东西：新出现的汉字是否使用思源宋体、搜索引擎与无脚本环境看到的静态内容、以及 `standalone.html` 的内容。

## 四、可选工具

网站本身不需要 npm。下面这些只是辅助：

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动本地预览服务器（等同 `node tools/serve.mjs`，零依赖） |
| `npm run fonts` | 按全站实际用字把思源宋体子集化，并生成 `src/styles/fonts.css` |
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
  core/dom.js           DOM 与模板小工具
  sections/             各章节模板（数据 → HTML）
  ui/                   导航、轻提示
  styles/               fonts.css、site.css、print.css
assets/                 字体与图片
works/                  放你自己的页面（数字教材、演示……）
tools/                  可选工具
docs/ARCHITECTURE.md    架构说明
```

## 六、兼容

- 现代浏览器正常显示；脚本被禁用或加载失败时，显示预渲染的静态内容，文字完整可读。
- 手机与桌面都按同一套章节流排布，窄屏下导航收入菜单。
- 系统开启「减少动态效果」时，关闭平滑滚动与过渡动画。
- 打印（Ctrl+P）时隐藏导航，保留全部正文。

## 七、字体与许可

页面使用 Noto Serif SC（思源宋体）、Instrument Serif、Instrument Sans、DM Mono，均以 SIL Open Font License 1.1 授权，已随站点自托管（不依赖任何外部 CDN），说明见 [`assets/fonts/LICENSE.md`](assets/fonts/LICENSE.md)。

## 八、回滚到花哨原版

简洁版合进 `main` 之前，花哨原版已完整冻存在下面两处（都指向同一提交 `db9e9cd`）：

- 附注标签：`v1-fancy`
- 分支：`fancy-original`

**推荐做法：还原这次合并。** 这样会留下一条 revert 提交，以后还可以再还原回来：

```bash
git switch main
git pull
git revert -m 1 <把简洁版合进 main 的那次合并提交 SHA>
git push origin main
```

合并提交的 SHA 见把简洁版合进 `main` 的 Pull Request。GitHub 上也可以直接在该 PR 页面点 Revert。

**也可以把 `main` 直接指回原版**（会改写 `main` 的历史，请确认没有别人基于其后的提交在工作）：

```bash
git switch main
git reset --hard v1-fancy
git push --force-with-lease origin main
```

只想本地看看花哨版：`git switch fancy-original`，或打开标签 `v1-fancy`。
