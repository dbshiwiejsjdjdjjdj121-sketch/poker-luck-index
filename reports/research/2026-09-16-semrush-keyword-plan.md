# 关键词调研与执行决定 · 2026-09-16

结论：保留「免费赛为首页重点、现场赛事指南为第二入口」。先完善真实且可参加的免费赛供给，同时继续做 WSOP Circuit、拉斯维加斯和知名场馆的现有指南。不能仅凭免费赛增长信号就放弃现场赛事。

本次实际读取已登录 Semrush 的 6 份 Keyword Magic Tool 报表，共 60 条可见记录，去重后是 56 个「国家＋关键词」组合。美国与英国分别记录。完整市场快照见 [JSON](2026-09-16-semrush-keywords.json)，长期队列见 [关键词库](../../data/keyword-opportunities.json)，每次发布使用的规则见 [执行文档](../../docs/keyword-strategy.md)。

## 优先机会

| 关键词 | 市场 | 月均搜索量估计 | 难度 / 100 | 执行决定 |
|---|---|---:|---:|---|
| free poker tournaments | 美国 | 880 | 61 | 首页免费赛入口，解释免费参加条件 |
| poker freerolls | 美国 / 英国 | 390 / 480 | 55 / 59 | 免费赛目录和真实活动指南 |
| free online poker tournaments | 美国 | 390 | 72 | 完善线上筛选及当地可用性，不承诺即时游戏 |
| best poker freerolls no deposit | 美国 | 320 | 未取得 | 优先补真实无存款条件；有足够比较依据前不自称 best |
| best poker freerolls | 美国 | 140 | 39 | 比较需求存在，先补供给与选择标准 |
| free poker tournaments for real money | 美国 | 40 | 33 | 仅适用于官方确认现金奖励及地域资格的活动 |
| wsop circuit schedule | 美国 | 2,900 | 56 | 完善 WSOP 入口和每站概览，保留官方完整赛程链接 |
| las vegas poker tournaments | 美国 | 3,600 | 72 | 城市指南＋赛事、住宿、交通资料 |
| wynn poker tournaments | 美国 | 1,600 | 50 | 维护已核实的 Wynn WPT 年份页面 |
| poker tournaments venetian las vegas | 美国 | 1,600 | 50 | 维护已核实的 Venetian WPT 年份页面 |
| poker tournaments near me | 美国 | 8,100 | 66 | 有需求，但现有收录不覆盖所有赌场每日比赛；不夸大附近结果 |

数字是 Semrush 的国家数据库估计，不是本站流量或可保证获得的访客。相近词的搜索量不能直接相加当作独立用户。难度越低只代表工具估计的竞争相对较小。未取得的数值保留空值。

## 增长信号及限制

此前保存的全球 Google Trends 周度序列，比较两个各 26 个完整周的区间（2025-09-14 至 2026-03-08，与 2026-03-15 至 2026-09-06），排除 9 月 13 日开始的未完整周：

- `poker freerolls` 平均相对兴趣指数由 20.00 到 54.69，约 +173.5%。
- `free poker tournaments` 由 18.04 到 51.88，约 +187.6%。
- `freeroll passwords` 由 35.38 到 29.88，约 −15.5%。

这是全球归一化兴趣变化，不是搜索人数增长，也不能解释成美国或英国增长。美国和英国样本不足以支持可靠的半年增长结论。本次没有取得 Semrush 数值化的历史月度序列，因此不编造它的增长率。市场大小与趋势分别参考 Semrush 和 Trends，最后以 Search Console 的实际结果判断。

## 暂缓和排除

- 美国 `acr freeroll passwords` 720、英国 `888 freeroll password` 720：有访问条件方面的需求，但尚未建立可靠的官方公开密码供给。不能发布私密、过时或猜测的密码，也不能把资格票活动包装成今日密码列表。
- `wsop 2025 schedule` 仍显示 6,600：平均值可能包含已过赛事季的需求。旧年份只保留历史资料，不当作即将开始。2026 年通用 WSOP 查询也要区分夏季赛、Circuit 及其他站次。
- Borgata / 洛杉矶各有月均 1,300 的相关词：先查未来大型赛事和旅行资料，有足够内容再建立入口，不先做空白城市页。
- `freeroll monopoly go`、即时免费游戏、旧资金管理工具等不符合当前产品，不追这些流量。

## 已接入的工作方式

每次更新先查 18 组关键词队列，选择与已有真实资料相符的意图，完善标题/摘要、条件、日期、内部链接和官方入口。每 7 天在现有维护任务中检查一次实际搜索结果，每 30 天轮换复查市场需求；只用已有额度，不新建 SEO 定时任务。旧每日和三项每周 Poker Fortune SEO 自动化保持暂停。

私有网站搜索指标存放在本机受保护的维护缓存，不放进公开仓库。仅调研或无实际内容变更时不部署。先观察 4–8 周的相关页面曝光、点击与收录，再决定是否扩大某一方向；不按每天发几篇文章考核。

来源：[Semrush 免费赛查询](https://www.semrush.com/analytics/keywordmagic/?db=us&q=free%20poker%20tournaments)、[Semrush 美国 freerolls](https://www.semrush.com/analytics/keywordmagic/?db=us&q=freerolls)、[Semrush 英国 freerolls](https://www.semrush.com/analytics/keywordmagic/?db=uk&q=freerolls)、[Semrush 现场赛事](https://www.semrush.com/analytics/keywordmagic/?db=us&q=poker%20tournaments)、[Semrush WSOP](https://www.semrush.com/analytics/keywordmagic/?db=us&q=wsop%20schedule)。登录后的实时结果可能改变，保存的快照记录本次实际观察。方法：[Semrush 指标说明](https://www.semrush.com/kb/257-keyword-overview)、[Google Trends 方法](https://support.google.com/trends/answer/4365533?hl=en)。
