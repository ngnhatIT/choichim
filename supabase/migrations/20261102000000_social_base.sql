-- Chơi chung, lát đầu: chỉ email được mời mới đăng ký được; hồ sơ, save trên cloud, góc hỏi đáp.
-- Xem docs/SOCIAL_RESEARCH.md mục 5 và 7.

create schema if not exists private;  -- không mở qua Data API

-- Danh sách mời: thêm bằng SQL editor, ví dụ insert into private.invites values ('ban@example.com');
create table private.invites (
  email text primary key check (email = lower(email))
);
alter table private.invites enable row level security;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now()
);

-- Chặn đăng ký nếu email chưa được mời (kể cả đăng nhập ẩn danh, vì không có email), rồi tạo hồ sơ.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is null or not exists (select 1 from private.invites i where i.email = lower(new.email)) then
    raise exception 'Email chưa được mời';
  end if;
  insert into public.profiles (id, display_name) values (new.id, left(split_part(new.email, '@', 1), 40));
  return new;
end $$;
revoke execute on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- Save chỉ để đồng bộ giữa các máy, không dùng chấm điểm (client sửa được).
create table public.saves (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  data jsonb not null check (octet_length(data::text) < 500000),
  updated_at timestamptz not null default now()
);

-- topic: 'that' = chim thật, 'game' = chim trong game
create table public.posts (
  id bigint generated always as identity primary key,
  author_id uuid not null default auth.uid() references public.profiles on delete cascade,
  topic text not null check (topic in ('that', 'game')),
  title text not null check (char_length(title) between 3 and 120),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index posts_created_at_idx on public.posts (created_at desc);
create index posts_author_id_idx on public.posts (author_id);

create table public.replies (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index replies_post_id_idx on public.replies (post_id, created_at);
create index replies_author_id_idx on public.replies (author_id);

alter table public.profiles enable row level security;
alter table public.saves enable row level security;
alter table public.posts enable row level security;
alter table public.replies enable row level security;

revoke all on public.profiles, public.saves, public.posts, public.replies from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.saves to authenticated;
grant select, insert, delete on public.posts, public.replies to authenticated;

-- Mọi tài khoản đều đã qua danh sách mời, nên thành viên đọc được hồ sơ và bài của nhau.
create policy "Thành viên xem hồ sơ" on public.profiles for select to authenticated using (true);
create policy "Sửa hồ sơ của mình" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Xem save của mình" on public.saves for select to authenticated using ((select auth.uid()) = user_id);
create policy "Tạo save của mình" on public.saves for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Ghi save của mình" on public.saves for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Thành viên xem bài" on public.posts for select to authenticated using (true);
create policy "Đăng bài" on public.posts for insert to authenticated with check ((select auth.uid()) = author_id);
create policy "Xóa bài của mình" on public.posts for delete to authenticated using ((select auth.uid()) = author_id);

create policy "Thành viên xem trả lời" on public.replies for select to authenticated using (true);
create policy "Trả lời" on public.replies for insert to authenticated with check ((select auth.uid()) = author_id);
create policy "Xóa trả lời của mình" on public.replies for delete to authenticated using ((select auth.uid()) = author_id);
