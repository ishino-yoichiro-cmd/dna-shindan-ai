# Vercel Pre-Build Gate 有効化 TODO

このプロダクトに **scripts/vercel-pre-build-gate.sh** を配置しました。
YO が以下の Vercel Dashboard 設定を行うと、**全経路（CLI/Dashboard/API/cron）の deploy で必ず検証が走ります**。

## 設定手順（5 分）

### 1. Vercel Dashboard を開く

```
open https://vercel.com/<team>/<project>/settings/git
```

### 2. "Ignored Build Step" の項目を探す

Settings → Git → **Ignored Build Step**

### 3. 以下を設定

- **Choose:** "Run my Bash script"
- **Command:**
  ```
  bash scripts/vercel-pre-build-gate.sh
  ```

### 4. 保存

これで以下の経路すべてに対し、Vercel build container 内で必ず gate が走る：
- ローカルからの `vercel deploy --prod`
- Vercel Dashboard "Redeploy" ボタン
- GitHub push → Auto Deploy
- API 経由
- cron / scheduled-task 経由

### 5. 動作確認

- 故意にサイレントフォールバック `?? '1985-01-01'` を入れて push → build がスキップされることを確認
- 修正してから再度 push → build が通ることを確認

## 完了後

このファイル `VERCEL_PRE_BUILD_GATE_TODO.md` を削除して OK。
