# GitHub 可检索性体检（候选能力）

## 为什么记录它

跨项目经验表明：仓库公开并不代表新手能按中文名或功能关键词找到它。仅在 README 首屏写中文别名还不够，GitHub 的仓库描述、Topics 和公开搜索结果也需要一致。

## 建议检查项

未来可把下面项目纳入“仓库状态体检”或独立的发布前检查：

1. 仓库可见性是否符合预期。
2. description 是否包含稳定的英文产品名、中文别名和核心用途。
3. Topics 是否覆盖真实能力，例如 Git、分支、GitHub 工作流和 PR。
4. README 首屏是否同时出现英文全称与中文别名，并提供语言切换。
5. 不限定 owner 搜索英文全称，确认能找到仓库。
6. 不限定 owner 搜索中文别名；如果 GitHub 尚未建立中文索引，应显示“搜索索引待确认”，不能误报为产品不存在。
7. 用核心 Topic 搜索并回读结果。

## 当前项目已处理

- 公开仓库：`RongNianXin/Git-State-Compass`
- description 已加入英文全称、中文别名和用途关键词。
- README 首屏已加入 `Git State Compass` 与 `Git 状态罗盘`。
- 已配置 GitHub Topics：`git-state-compass`、`git`、`github`、`git-branch`、`git-workflow`、`pull-requests`、`repository-analysis`、`developer-tools`、`beginner-friendly`。

这项能力目前是候选路线，不改变 `v0-core` 只读本地 Git 的核心范围，也不自动替用户修改远端仓库。
