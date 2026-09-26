# Git State Compass

[中文](README.md)

Git State Compass is a local Git status compass for people who are new to GitHub. It explains the current branch, remote-tracking branches, working-tree changes, and common GitHub tasks, then gives one deterministic next-step recommendation without calling an LLM.

## What problem does it solve?

When you are unsure which branch you are on, whether local or remote is newer, or whether a pull request is ready, the tool reads local repository facts and applies fixed rules. It does not guess and does not execute risky Git or GitHub write operations for you.

## What does the current version do?

- Shows the current branch, branch topology, and remote-tracking relationships
- Detects uncommitted working-tree changes
- Analyzes goals such as preparing a PR, checking merge readiness, and understanding remote changes
- Explains facts, risks, next steps, and invalidation conditions in beginner-friendly language
- Provides a local browser prototype for visual inspection

The current version is `v0-core`. It reads local Git data, does not call an LLM, does not perform online GitHub actions, and is not yet a packaged desktop application.

## Quick start

Node.js 18 or later is required.

```text
npm test
npm run inspect -- <path-to-your-local-repository>
npm run web
```

After running `npm run web`, open the local address in a browser and enter the repository path you want to inspect. The tool only reads repository state; you still confirm and perform commits, merges, pushes, and PR actions yourself.

## A beginner-friendly mental model

Think of it as a dashboard for your car. It shows which road you are on (branch), whether you have unsaved work in the car (working-tree changes), and what the road ahead looks like (remote-tracking state). Then it tells you what to check next. It does not press the accelerator for you.

## Documentation

- [Beginner task flows](docs/task-flows.en.md)
- [M1 manual test guide](M1人工测试说明.md)
- [Product design](Git仓库状态体检工具-产品设计方案.md)

## License

No formal license has been published yet. Licensing is part of a later release-preparation batch.

<!-- README-SOURCE-SHA256: 344e5c0e7d480ae87a776960ec6aa5521faed1c6cff98a132768906d2419b6d4 -->
