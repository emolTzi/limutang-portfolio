/**
 * site.js — 全站唯一内容源（Single Source of Truth）
 * ─────────────────────────────────────────────────────────────────────────
 * 改文字、加项目、接入跳转链接，只需要改这一个文件，不用碰任何模板或动效代码。
 *
 * 约定
 *  · 文本里用 **双星号** 包住的片段会被高亮（琥珀色）。
 *  · `links` 是全站链接注册表。某个链接的 url 留空 '' 时，页面上所有引用它的
 *    按钮 / 卡片自动显示「待接入」并且不可点击；填上地址后全站同步生效
 *    （传送门卡片、项目按钮、指令面板、页脚都会更新）。
 *  · 站内自己托管的页面（比如单文件的数字教材演示）放进 /works 目录，
 *    url 写相对路径即可，例如 './works/poiseuille/'。
 *  · `chapters` 的顺序就是页面章节顺序，编号（01–07）自动生成。
 *  · `visual` 对应 src/fx/cues.js 里的一个粒子编队预设。
 */

export const site = {
  meta: {
    title: '李牧唐 · AI Agent 应用工程师',
    description:
      '李牧唐的个人主页。求职意向：AI Agent 应用工程师（智能体应用工程师）。云南大学软件学院数字媒体技术专业，方向为多智能体协作与 AI 辅助开发。',
    year: 2026,
  },

  person: {
    name: '李牧唐',
    latin: 'Li Mutang',
    intent: 'AI Agent 应用工程师',
    intentAlt: '智能体应用工程师',
    intentEn: 'AI Agent Application Engineer',
    school: '云南大学',
    schoolEn: 'Yunnan University',
    college: '软件学院',
    major: '数字媒体技术专业',
    grade: '2026 级本科',
    focus: ['多智能体协作', 'AI 辅助开发'],
    email: 'tziquantum@gmail.com',
  },

  /* ── 链接注册表 ─────────────────────────────────────────────────────────
   * key 被其他区块引用。url 为空 = 待接入。
   * children：一个入口下的若干子页面（例如数字教材的每个演示）。
   */
  links: {
    textbook: {
      title: '数字教材',
      en: 'Digital Textbook',
      desc: '哈尔滨医科大学《医用物理学》交互演示网页：流体力学与振动波动。',
      url: '',
      span: 2,
      children: [
        { title: '泊肃叶定律', url: '' },
        { title: '文丘里流量计', url: '' },
        { title: '皮托管', url: '' },
        { title: '虹吸现象', url: '' },
        { title: '多普勒效应', url: '' },
        { title: '简谐振动的合成', url: '' },
      ],
    },
    bilibili: {
      title: 'B 站主页',
      en: 'Bilibili',
      desc: '个人账号投稿与项目宣传片。',
      url: 'https://space.bilibili.com/487167344',
    },
    dragonmine: {
      title: '祈愿龙珠',
      en: 'DragonMine Z',
      desc: '基于 Minecraft 1.20.1 的龙珠主题魔改服务器。',
      url: '',
    },
    genesis: {
      title: '创世纪元',
      en: 'Genesis Era',
      desc: 'AI 文明诞生概率实验室，Web 3D 实时交互作品。',
      url: '',
    },
    feynman: {
      title: '过目能讲',
      en: 'Explain It Back',
      desc: '基于费曼学习法的 AI 眼镜学习教练。',
      url: '',
    },
    videos: {
      title: '视频作品',
      en: 'Videos',
      desc: '项目宣传片与视频内容合集。',
      url: '',
    },
    github: {
      title: 'GitHub',
      en: 'GitHub',
      desc: '代码仓库。',
      url: '',
    },
  },

  /* ── 章节顺序 ──────────────────────────────────────────────────────────── */
  chapters: [
    { id: 'about', zh: '概述', en: 'Overview' },
    { id: 'education', zh: '教育', en: 'Education' },
    { id: 'projects', zh: '项目', en: 'Projects' },
    { id: 'competitions', zh: '竞赛', en: 'Competitions' },
    { id: 'skills', zh: '技能', en: 'Skills' },
    { id: 'portals', zh: '传送门', en: 'Portals' },
    { id: 'contact', zh: '联系', en: 'Contact' },
  ],

  hero: {
    eyebrow: '个人主页 · 2026',
    tagline: '以 AI 驱动开发，用多智能体协作，把想法做成能上线、能迭代的产品。',
  },

  about: {
    statement:
      '**网络与 AI 复合型人才。**熟练运用 Codex、Claude Code、DeepSeek 等 AI 工具和 GitHub、Cloudflare 等网络平台，擅长以 **AI 驱动开发**、用**多智能体协作**把想法快速做成能上线、能迭代的产品。独立发起并运营 Minecraft 魔改服务器**「祈愿龙珠」**，从模组开发、服务器运维、客户端分发到社区运营全链路一人打通，**已实现盈利**；日常以**「一人公司（OPC）」**模式指挥**约 20 个 AI bot** 协同工作。',
    stats: [
      { value: 20, prefix: '≈', label: '个 AI bot 协同工作', note: '一人公司（OPC）模式' },
      { value: 3000, suffix: '+', label: '例自动化测试', note: 'JUnit · Forge GameTest' },
      { value: 450, label: '封老玩家召回邮件', note: '分 9 批发送' },
      { value: 6, label: '个交互演示主题', note: '《医用物理学》数字教材' },
    ],
  },

  education: {
    school: '云南大学',
    schoolEn: 'Yunnan University',
    status: '在读',
    facts: [
      { k: '学院', v: '软件学院' },
      { k: '专业', v: '数字媒体技术专业' },
      { k: '学历', v: '本科' },
      { k: '年级', v: '2026 级' },
    ],
    campus: [
      { k: '职务', v: '班级学习委员' },
      { k: '社团', v: '申请云南大学数字交互技术社团（程序方向）、游戏开发社团中' },
    ],
  },

  projects: {
    lede: '三个项目，一条主线：以 AI 驱动开发，把想法做成能上线、能迭代的产品。',
    items: [
      {
        id: 'dragonmine',
        visual: 'orbs',
        kind: '个人独立项目',
        titleLines: ['祈愿龙珠'],
        en: 'DragonMine Z',
        summary: '基于 Minecraft 1.20.1 的龙珠主题魔改服务器，从模组开发到社区运营全链路一人打通。',
        meta: [
          { k: '角色', v: '发起人 / 负责人' },
          { k: '性质', v: '个人项目，与任何社团无关' },
        ],
        status: [
          { text: '已实现盈利', tone: 'amber' },
          { text: '持续运营中', tone: 'jade', live: true },
        ],
        links: ['dragonmine', 'bilibili'],
        facets: [
          {
            label: '产品',
            en: 'Product',
            text: '基于 Minecraft 1.20.1 的龙珠主题魔改服务器（Mohist / Forge 混合端），含自研 Java 模组、玩法与任务系统、生产服和客户端整合包；个人项目，与任何社团无关。',
            metric: { value: '1.20.1', label: 'Minecraft 版本' },
          },
          {
            label: 'AI 驱动开发',
            en: 'AI-Driven Development',
            text: '以 Codex（后端）、Claude Code（前端）为开发主力，本人负责需求拆解、方案决策、实机测试与验收；以 JUnit 与 Forge GameTest 自动化测试作为合并门槛，全量测试达 3000 余例。',
            metric: { value: '3000+', label: '全量测试用例' },
          },
          {
            label: '运维与分发',
            en: 'Ops & Delivery',
            text: '在 Ubuntu 服务器上以翼龙（Pterodactyl）面板 + Wings / Docker 托管生产服，负责部署、备份、巡检与日志排查，版本迭代至 qy0.1.4；代码以 GitHub 分支管理，客户端更新包经阿里云 OSS 分电脑 / 手机渠道分发。',
            metric: { value: 'qy0.1.4', label: '当前版本' },
          },
          {
            label: '社区运营',
            en: 'Community',
            text: 'QQ 群接入 AstrBot + NapCat 机器人并定期汇总玩家反馈；开展老玩家召回，分 9 批发送召回邮件 450 封。',
            metric: { value: '450', label: '封召回邮件 · 9 批' },
          },
        ],
        stack: [
          'Java 17', 'Minecraft Forge 1.20.1', 'Mohist', 'Gradle', 'JUnit', 'GameTest',
          'Ubuntu', 'Pterodactyl', 'Wings / Docker', 'GitHub', '阿里云 OSS',
          'AstrBot', 'NapCat', 'Codex', 'Claude Code',
        ],
      },
      {
        id: 'textbook',
        visual: 'wave',
        kind: '交互演示制作',
        org: '哈尔滨医科大学',
        titleLines: ['《医用物理学》', '数字教材'],
        en: 'Medical Physics · Interactive Demos',
        summary: '为教材制作流体力学与振动波动的交互演示网页，每页为单文件、离线可用。',
        meta: [
          { k: '角色', v: '投稿者之一' },
          { k: '时间', v: '2026' },
        ],
        status: [],
        links: ['textbook'],
        facets: [
          {
            label: '内容',
            en: 'Content',
            text: '为教材制作流体力学与振动波动的交互演示网页——泊肃叶定律、文丘里流量计、皮托管、虹吸现象（均含 2D / 3D 模型）、多普勒效应、简谐振动的合成。',
            metric: { value: '6', label: '个演示主题' },
          },
          {
            label: '技术',
            en: 'Technology',
            text: 'HTML5 Canvas + Three.js（WebGL）三维建模，KaTeX 渲染公式；以 Node.js 脚本完成资源内联、署名注入与自动化校验，每页为单文件、离线可用。',
            metric: { value: '1', label: '个文件一页 · 离线可用' },
          },
        ],
        /* 演示清单：每一项的跳转地址在 links.textbook.children 里按同名 title 配置 */
        demos: [
          { title: '泊肃叶定律', group: '流体力学', tags: ['2D', '3D'] },
          { title: '文丘里流量计', group: '流体力学', tags: ['2D', '3D'] },
          { title: '皮托管', group: '流体力学', tags: ['2D', '3D'] },
          { title: '虹吸现象', group: '流体力学', tags: ['2D', '3D'] },
          { title: '多普勒效应', group: '振动波动', tags: [] },
          { title: '简谐振动的合成', group: '振动波动', tags: [] },
        ],
        /* 是否显示本站即兴重绘的两块「波动实验台」（非教材原页，仅作氛围演示） */
        wavelab: true,
        stack: ['HTML5 Canvas', 'Three.js', 'WebGL', 'KaTeX', 'Node.js'],
      },
      {
        id: 'agents',
        visual: 'network',
        kind: '自主搭建',
        titleLines: ['多智能体', 'bot 团队'],
        en: 'Personal Multi-Agent Team',
        summary: '约 20 个 AI bot 分三条线协同，一人公司式工作流。',
        meta: [
          { k: '形态', v: '一人公司式工作流' },
          { k: '规模', v: '约 20 个 AI bot · 三条线' },
        ],
        status: [{ text: '持续使用中', tone: 'jade', live: true }],
        links: [],
        facets: [
          {
            label: '架构',
            en: 'Architecture',
            text: '约 20 个 AI bot，分龙珠项目、自媒体副业、日常事务三条线，各设协调 bot；龙珠线按开发、测试、运维、社区运营、宣传片发布等角色分工，执行 bot 只向协调 bot 汇报。',
            metric: { value: '≈20', label: '个 AI bot' },
          },
          {
            label: '规则',
            en: 'Protocol',
            text: '制定统一行为规范：少打扰、五态结构化汇报、「停止」跨重启有效、不可逆操作须人工批准。',
            metric: { value: '4', label: '条统一行为规范' },
          },
        ],
        /* 团队结构：同时驱动 ① 架构图 ② 粒子网络编队 ③ 跟随光标的智能体群。
         * executors 为示意数量（简历只给出总规模约 20），可按真实情况修改。 */
        team: {
          note: '架构示意 · 节点数量为示意，总规模约 20 个 bot',
          human: { label: '我', sub: '指挥 · 人工批准' },
          lines: [
            {
              id: 'dragon',
              name: '龙珠项目',
              roles: ['开发', '测试', '运维', '社区运营', '宣传片发布'],
              executors: 8,
            },
            { id: 'media', name: '自媒体副业', roles: [], executors: 5 },
            { id: 'daily', name: '日常事务', roles: [], executors: 4 },
          ],
        },
        rules: [
          { title: '少打扰', en: 'Low Interruption' },
          { title: '五态结构化汇报', en: 'Five-State Reports' },
          { title: '「停止」跨重启有效', en: 'Stop Survives Restart' },
          { title: '不可逆操作须人工批准', en: 'Human Approval for Irreversible Ops' },
        ],
        stack: [],
      },
    ],
  },

  competitions: {
    lede: '三项赛事，均在参赛中。',
    items: [
      {
        name: '第十四届全国大学生数字媒体科技作品及创意竞赛',
        track: '科幻+及元宇宙数字作品',
        status: '参赛中',
        work: '创世纪元：AI 文明诞生概率实验室',
        mode: '团队作品',
        text: 'Web 3D 实时交互作品，以「知识即权限」机制让观众逐层调整物理常数、行星、生命到文明的参量，亲历文明诞生的低概率；确定性推演引擎计算全部数值，并接入大模型担任实验室讲解员。基于 TypeScript + Three.js + Vite 构建为离线单文件，Vitest 单元测试。团队作品，本人负责选题方向、技术路线与审定，以 AI 驱动开发。',
        flow: ['物理常数', '行星', '生命', '文明'],
        flowLabel: '逐层调整的参量',
        stack: ['TypeScript', 'Three.js', 'Vite', 'Vitest'],
        link: 'genesis',
      },
      {
        name: 'Spatial Joy 2026 Rokid 全球开发大赛',
        track: 'AI 赛道（AIUI 智能体 · 学习类）',
        status: '参赛中',
        work: '过目能讲',
        mode: '个人参赛',
        text: '基于费曼学习法的 AI 眼镜学习教练——拍下学习材料后用自己的话讲解，智能体对照要点诊断理解偏差、引导修正并请用户重讲验证。个人参赛，独立完成策划案与交互设计，基于 Rokid AIUI Studio 开发。',
        flow: ['拍下材料', '用自己的话讲解', '诊断偏差', '引导修正', '重讲验证'],
        flowLabel: '一次学习闭环',
        stack: ['Rokid AIUI Studio', '费曼学习法'],
        link: 'feynman',
      },
      {
        name: '大学生软件创新大赛',
        track: '软件开发与创新应用方向',
        status: '参赛中',
      },
    ],
  },

  skills: {
    lede: '四个层面的工具与技术栈。',
    groups: [
      {
        title: 'AI 与多智能体',
        en: 'AI & Multi-Agent',
        text: '熟练运用 Codex、Claude Code、DeepSeek、ChatGPT、Gemini 等，擅长 AI 驱动开发与多智能体编排。',
        items: ['Codex', 'Claude Code', 'DeepSeek', 'ChatGPT', 'Gemini', 'AI 驱动开发', '多智能体编排'],
      },
      {
        title: '网络与平台',
        en: 'Network & Platform',
        text: '熟练使用 GitHub、Cloudflare；Linux（Ubuntu）服务器、Docker、翼龙面板、阿里云 OSS。',
        items: ['GitHub', 'Cloudflare', 'Linux · Ubuntu', 'Docker', '翼龙面板', '阿里云 OSS'],
      },
      {
        title: '开发技术栈',
        en: 'Development Stack',
        text: 'TypeScript、Three.js / WebGL、Vite、Vitest、HTML5 Canvas、KaTeX；Java 17 + Minecraft Forge 1.20.1 / Mohist、Gradle、JUnit / GameTest。',
        items: [
          'TypeScript', 'Three.js', 'WebGL', 'Vite', 'Vitest', 'HTML5 Canvas', 'KaTeX',
          'Java 17', 'Minecraft Forge 1.20.1', 'Mohist', 'Gradle', 'JUnit', 'GameTest',
        ],
      },
      {
        title: '内容与其他',
        en: 'Content & More',
        text: 'B 站个人账号投稿，项目宣传片制作与发布；有一定外贸行业接触。',
        items: ['B 站投稿', '宣传片制作与发布', '外贸行业接触'],
      },
    ],
  },

  /* 传送门区块展示哪些链接、按什么顺序（取 links 的 key） */
  portals: {
    lede: '作品与内容的入口。已接入的可以直接前往，其余陆续开放。',
    items: ['textbook', 'bilibili', 'dragonmine', 'genesis', 'feynman', 'videos', 'github'],
  },

  contact: {
    headline: ['把下一个想法，', '做成产品。'],
    text: '正在寻找 AI Agent 应用工程师（智能体应用工程师）方向的机会，欢迎来信。',
  },
};

/* ── 小工具：供模板与模块读取 ─────────────────────────────────────────────── */

/** 取一个链接；不存在时返回 null。 */
export function getLink(key) {
  const l = site.links[key];
  return l ? { key, ...l, live: Boolean(l.url) } : null;
}

/** 团队结构的展开形式：协调者 + 执行者列表（给架构图 / 粒子编队 / 光标智能体群共用）。 */
export function getTeam() {
  const project = site.projects.items.find((p) => p.team);
  const team = project ? project.team : { lines: [{ id: 'a', name: '', roles: [], executors: 6 }] };
  const lines = team.lines.map((line, index) => ({
    ...line,
    index,
    nodes: Array.from({ length: line.executors }, (_, j) => ({ role: line.roles[j] || '' })),
  }));
  const total = lines.reduce((sum, l) => sum + 1 + l.executors, 0);
  return { ...team, lines, total };
}
