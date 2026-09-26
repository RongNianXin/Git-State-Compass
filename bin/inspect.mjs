#!/usr/bin/env node
import { collectRepoSnapshot } from '../src/snapshot.mjs';
const repoPath = process.argv[2] ?? process.cwd();
try { console.log(JSON.stringify(collectRepoSnapshot(repoPath), null, 2)); } catch (error) { console.error(`无法读取 Git 仓库：${error.message}`); process.exitCode = 1; }
