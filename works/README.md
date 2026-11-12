# works — 放你自己的页面

这个目录用来托管你想从主页跳转过去的页面：数字教材的交互演示、作品 Demo、任何静态网页。部署到 GitHub Pages 后，它们和主页在同一个站点下，不需要另外找地方托管。

## 怎么放

每个作品一个子目录，入口文件命名为 `index.html`：

```
works/
  textbook/
    index.html            ← 数字教材的目录页（可选）
    poiseuille.html       ← 泊肃叶定律
    venturi.html          ← 文丘里流量计
    pitot.html
    siphon.html
    doppler.html
    shm.html
  genesis/
    index.html            ← 创世纪元
```

单文件、离线可用的页面最省心：直接把那个 HTML 拷进来就行。如果页面带有图片、脚本等附属文件，把它们一起放进同一个子目录，并确认页面内部引用的是相对路径。

## 怎么接到主页上

打开 `src/content/site.js`，在 `links` 注册表里填相对路径（以 `./works/` 开头）：

```js
textbook: {
  title: '数字教材',
  url: './works/textbook/',
  children: [
    { title: '泊肃叶定律', url: './works/textbook/poiseuille.html' },
    { title: '文丘里流量计', url: './works/textbook/venturi.html' },
    { title: '皮托管', url: './works/textbook/pitot.html' },
    { title: '虹吸现象', url: './works/textbook/siphon.html' },
    { title: '多普勒效应', url: './works/textbook/doppler.html' },
    { title: '简谐振动的合成', url: './works/textbook/shm.html' },
  ],
},
genesis: { title: '创世纪元', url: './works/genesis/' },
```

保存后刷新，主页上对应的传送门卡片、项目按钮、演示清单会从「待接入」变成可点击。`children` 可以只接入其中几项，没填地址的会继续显示「待接入」。

## 托管在别处的内容

视频站主页、GitHub、其他域名下的作品，直接填完整网址（`https://…`）即可，会在新标签页打开。

## 想从作品页回到主页

在你的页面里加一个链接指回去，例如放在 `works/textbook/` 下的页面：

```html
<a href="../../">← 回到李牧唐的主页</a>
```
