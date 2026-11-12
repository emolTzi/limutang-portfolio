# 架构说明（简洁版）

当前 `main` 是简洁版：浅色静态页，内容仍全部来自 `src/content/site.js`。花哨原版（粒子引擎、自定义光标、滚动劫持等）保存在标签 `v1-fancy` 和分支 `fancy-original`，回滚方法见仓库 README。

## 结构

```
src/content/site.js   内容（唯一数据源）
        │
        ▼
src/sections/*        模板：数据 → HTML 字符串（纯函数）
        │
        ▼
src/main.js           渲染导航与章节，绑定导航和「复制邮箱」
        │
        ├── src/core/dom.js   转义、查询、复制文本
        └── src/ui/           导航、轻提示
```

依赖方向是单向的。没有框架、没有打包器，浏览器直接加载 ES 模块。`tools/prerender.mjs` 在 Node 里复用同一套模板，把静态内容写进 `index.html`。

## 约定

- **零运行时依赖。** 不引入框架和第三方库；`node_modules` 只服务于 `tools/` 里的可选工具。
- **一切路径用相对路径**（`./…`），这样站点挂在域名根目录还是 `/仓库名/` 下都能工作。
- **不依赖外部网络资源**：字体、图标全部自托管。
- **内容与表现分离**：文字只出现在 `site.js`（界面上的少量固定标签除外）。
- **降级优先**：脚本没跑、没有鼠标、系统要求减少动态效果时，内容仍然完整可读。
- 改完内容或用字后运行 `npm run refresh`，保持字体子集、静态降级内容与 `standalone.html` 同步。

新增章节的步骤与原先相同：在 `site.js` 的 `chapters` 里登记，新增 `src/sections/<id>.js` 并在 `sections/index.js` 注册，样式写进 `src/styles/site.css`。
