# Git State Compass

[中文](README.md)

Chinese name: Git 状态罗盘

Git State Compass is a local Git status compass for people who are new to GitHub. It explains the current branch, remote-tracking branches, working-tree changes, and common GitHub tasks, then gives one deterministic next-step recommendation without calling an LLM.

## What problem does it solve?

When you are unsure which branch you are on, whether local or remote is newer, or whether a pull request is ready, the tool reads local repository facts and applies fixed rules. It does not guess and does not execute risky Git or GitHub write operations for you.

## What does the current version do?

- Shows the current branch, branch topology, and remote-tracking relationships
- Detects uncommitted working-tree changes
- Analyzes goals such as preparing a PR, checking merge readiness, and understanding remote changes
- Explains facts, risks, next steps, and invalidation conditions in beginner-friendly language
- Provides a local browser prototype for visual inspection
- Opens a Windows folder picker; when a parent folder is selected, searches nearby folders within fixed limits for valid repositories
- Shows the selected worktree, checked-out commit, worktree count, and position relative to the locally recorded default branch

The current version is a local browser prototype. It reads local Git data, does not call an LLM, does not perform online GitHub actions, and is not yet a packaged desktop application. The page shows the state at the time of reading; read the repository again after it changes. A Windows x64 portable test build can now be made locally, and testers do not need Node.js.

## Quick start

Running from source requires Node.js 22 or later and Git. The portable test build only requires Git on the tester's computer; see the manual test guide.

```text
npm ci
npm test
npm run inspect -- <path-to-your-local-repository>
npm run web
```

After running `npm run web`, the terminal displays a local address with a randomly assigned port. Open that address in your browser, then click the folder picker or enter a path manually. The address stops working when you stop the service. The tool only reads repository state; you still confirm and perform commits, merges, pushes, and PR actions yourself.

On a Windows x64 development computer with Node.js 24 x64, `npm run build:portable` creates a local test EXE. Its files are placed in the Git-ignored `output/portable/` directory and have not been publicly released. The source runtime and portable build have different requirements; see the [development and device migration guide](docs/development.md) (Chinese).

## A beginner-friendly mental model

Think of it as a dashboard for your car. It shows which road you are on (branch), whether you have unsaved work in the car (working-tree changes), and what the road ahead looks like (remote-tracking state). Then it tells you what to check next. It does not press the accelerator for you.

## Documentation

- [Beginner task flows](docs/task-flows.en.md)
- [Development and device migration guide (Chinese)](docs/development.md)
- [Windows portable build manual test guide (current, Chinese)](M3便携版人工测试说明.md)
- [M1 development prototype test guide (historical)](M1人工测试说明.md)
- [Product design](Git仓库状态体检工具-产品设计方案.md)

## License

No formal license has been published yet. Licensing is part of a later release-preparation batch.

<!-- README-SOURCE-SHA256: 684514305c4cd70237638df412b742adf4d9cebe1a1093a451ad7d3cf98c2420 -->
