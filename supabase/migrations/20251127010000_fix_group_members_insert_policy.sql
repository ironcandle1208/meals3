-- Fix group_members INSERT policy to allow admins to invite other users
-- 管理者が他のユーザーを招待できるようにgroup_membersのINSERTポリシーを修正

-- 既存のポリシーを削除
drop policy if exists "Users can join groups" on public.group_members;

-- 新しいポリシーを作成
-- ユーザーは以下の場合にメンバーを追加できる:
-- 1. 自分自身を追加する場合
-- 2. 自分が管理者（admin）として所属しているグループに他のユーザーを追加する場合
create policy "Users can join groups or be invited"
  on public.group_members for insert
  with check (
    -- 自分自身を追加する場合
    user_id = auth.uid()
    or
    -- 自分が管理者として所属しているグループに他のユーザーを追加する場合
    exists (
      select 1 from public.group_members as gm
      where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
      and gm.role = 'admin'
    )
  );
