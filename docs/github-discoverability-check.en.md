# GitHub Discoverability Check (Candidate Capability)

## Why this is recorded

Cross-project experience shows that a public repository is not automatically easy for beginners to find by its Chinese name or feature keywords. A Chinese alias in the first README screen is not enough; the repository description, Topics, and public search results should also agree.

## Suggested checks

The following checks may later become part of the repository health check or a separate pre-release check:

1. Confirm that repository visibility matches the intended audience.
2. Confirm that the description contains the stable English name, Chinese alias, and core purpose.
3. Confirm that Topics cover the real capabilities, such as Git, branches, GitHub workflows, and pull requests.
4. Confirm that the README opening contains both the English full name and Chinese alias, with a language switch.
5. Search the English full name without an owner filter and confirm that the repository is discoverable.
6. Search the Chinese alias without an owner filter. If GitHub has not indexed Chinese text yet, report “search indexing pending” instead of claiming that the product does not exist.
7. Search by a core Topic and read the results back.

## Applied to this project

- Public repository: `RongNianXin/Git-State-Compass`
- The description now includes the English name, Chinese alias, and purpose keywords.
- The README opening now includes `Git State Compass` and `Git 状态罗盘`.
- GitHub Topics are configured: `git-state-compass`, `git`, `github`, `git-branch`, `git-workflow`, `pull-requests`, `repository-analysis`, `developer-tools`, and `beginner-friendly`.

This remains a candidate roadmap capability. It does not expand the `v0-core` scope beyond local Git read-only analysis or automatically change a user's remote repository.
