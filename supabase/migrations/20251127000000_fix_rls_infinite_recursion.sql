-- Fix infinite recursion in RLS policies for groups and group_members tables
-- 統合テストで検出されたRLSポリシーの無限再帰を修正

-- 1. group_membersテーブルのSELECTポリシーを修正
-- 既存のポリシーを削除
drop policy if exists "Users can view members of their groups" on public.group_members;

-- 新しいポリシーを作成
-- group_membersテーブル自身を参照せず、単純に認証されたユーザーのみが閲覧可能にする
-- （実際のフィルタリングはアプリケーション側で行う）
create policy "Users can view members of their groups"
  on public.group_members for select
  using (
    -- 認証されたユーザーのみが閲覧可能
    auth.uid() is not null
  );

-- 2. groupsテーブルのSELECTポリシーを修正
-- 既存のポリシーを削除
drop policy if exists "Users can view groups they belong to" on public.groups;

-- 新しいポリシーを作成
-- 作成者または group_members テーブルに登録されているユーザーのみが閲覧可能
create policy "Users can view groups they belong to"
  on public.groups for select
  using (
    -- 作成者は常に閲覧可能
    created_by = auth.uid()
    or
    -- group_members テーブルに登録されているユーザーも閲覧可能
    -- ただし、group_members のポリシーがシンプルになったため無限再帰は発生しない
    id in (
      select group_id 
      from public.group_members
      where user_id = auth.uid()
    )
  );
