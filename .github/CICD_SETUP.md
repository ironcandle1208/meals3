# CI/CD Setup Guide

このガイドでは、GitHub ActionsによるCI/CDパイプラインのセットアップ手順を説明します。

## 概要

2つのワークフローが設定されています：

1. **Test Workflow** (`.github/workflows/test.yml`)
   - Pull Request作成・更新時に自動実行
   - TypeScriptコンパイルチェック
   - 統合テスト実行

2. **Deploy Workflow** (`.github/workflows/deploy.yml`)
   - mainブランチへのマージ時に自動実行
   - Supabaseマイグレーションの本番環境への適用

## セットアップ手順

### 1. GitHubシークレットの設定

GitHub Repository → Settings → Secrets and variables → Actions → New repository secret

以下の3つのシークレットを追加：

#### SUPABASE_ACCESS_TOKEN

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. Account → Access Tokens に移動
3. "Generate new token" をクリック
4. トークン名を入力（例: "GitHub Actions"）
5. 生成されたトークンをコピー
6. GitHubシークレットに `SUPABASE_ACCESS_TOKEN` として保存

#### SUPABASE_PROJECT_ID

- 値: `zmozxfmegzquqgxueatc`
- Supabase Dashboard → Project Settings → General → Reference ID から確認可能

#### SUPABASE_DB_PASSWORD

- プロジェクト作成時に設定したデータベースパスワード
- 忘れた場合は、Supabase Dashboard → Project Settings → Database → Reset database password から再設定

### 2. ワークフローの有効化

シークレット設定後、ワークフローは自動的に有効になります。

### 3. 動作確認

#### テストワークフローの確認

1. 新しいブランチを作成
   ```bash
   git checkout -b test/ci-cd-verification
   ```

2. 軽微な変更を加えてコミット
   ```bash
   echo "# CI/CD Test" >> README.md
   git add README.md
   git commit -m "test: CI/CD verification"
   git push origin test/ci-cd-verification
   ```

3. GitHubでPull Requestを作成

4. Actions タブで "Test" ワークフローが実行されることを確認

#### デプロイワークフローの確認

1. PRをmainブランチにマージ

2. Actions タブで "Deploy to Production" ワークフローが実行されることを確認

3. Supabase Dashboardでマイグレーションが適用されていることを確認

## トラブルシューティング

### ワークフローが失敗する場合

1. **シークレットの確認**: 全てのシークレットが正しく設定されているか確認
2. **ログの確認**: GitHub Actions の詳細ログを確認
3. **ローカルテスト**: `npm run test:integration` がローカルで成功するか確認

### マイグレーションが適用されない場合

1. `supabase/migrations/` ディレクトリに変更があるか確認
2. デプロイワークフローのトリガー条件を確認
3. Supabase Access Tokenの権限を確認

## セキュリティ考慮事項

- シークレットは絶対にコードにコミットしない
- Access Tokenは定期的にローテーション
- 本番環境へのデプロイはmainブランチのみに制限

## 次のステップ

- [ ] ブランチ保護ルールの設定（PRレビュー必須化）
- [ ] Slack/Discord通知の追加
- [ ] デプロイ承認フローの追加（本番環境）
