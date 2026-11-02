-- Ai cũng tạo được tài khoản (mã OTP qua email) để đồng bộ ván chơi giữa các máy.
-- Hội chim (hồ sơ người khác, bài, trả lời) vẫn chỉ cho email trong private.invites.

-- Vẫn chặn tài khoản không có email (đăng nhập ẩn danh), còn lại chỉ tạo hồ sơ.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is null then
    raise exception 'Cần đăng nhập bằng email';
  end if;
  insert into public.profiles (id, display_name) values (new.id, left(split_part(new.email, '@', 1), 40));
  return new;
end $$;

-- Đọc private.invites (không có policy) nên cần security definer; chỉ trả về quyền của chính người gọi.
create function private.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.invites i join auth.users u on lower(u.email) = i.email
    where u.id = (select auth.uid())
  )
$$;
revoke execute on function private.is_member() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_member() to authenticated;

-- Để client biết có hiện mục Hỏi đáp hay không.
create function public.is_club_member() returns boolean
language sql stable security invoker set search_path = '' as $$ select private.is_member() $$;
revoke execute on function public.is_club_member() from public, anon;
grant execute on function public.is_club_member() to authenticated;

alter policy "Thành viên xem hồ sơ" on public.profiles using ((select auth.uid()) = id or (select private.is_member()));
alter policy "Thành viên xem hồ sơ" on public.profiles rename to "Xem hồ sơ của mình hoặc của hội";
alter policy "Thành viên xem bài" on public.posts using ((select private.is_member()));
alter policy "Đăng bài" on public.posts with check ((select auth.uid()) = author_id and (select private.is_member()));
alter policy "Thành viên xem trả lời" on public.replies using ((select private.is_member()));
alter policy "Trả lời" on public.replies with check ((select auth.uid()) = author_id and (select private.is_member()));
