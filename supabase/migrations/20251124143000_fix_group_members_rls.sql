-- Fix infinite recursion in group_members RLS policy
-- 無限再帰を引き起こしているRLSポリシーを修正

-- 既存のポリシーを削除
drop policy if exists "Users can view members of their groups" on public.group_members;

-- 新しいポリシーを作成
-- group_membersテーブルへのアクセスは、groupsテーブルのRLSポリシーに依存させる
-- これにより、group_members自身を参照する無限再帰を回避
create policy "Users can view members of their groups"
  on public.group_members for select
  using (
    -- groupsテーブルのRLSポリシーを活用
    -- groupsテーブルに対するSELECT権限があれば、そのグループのメンバーも閲覧可能
    exists (
      select 1 from public.groups
      where groups.id = group_members.group_id
    )
  );

