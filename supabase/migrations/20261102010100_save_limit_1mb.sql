-- Giới hạn bản lưu 1 MB mỗi tài khoản, để nick rác không làm đầy DB nhanh.
alter table public.saves drop constraint saves_data_check;
alter table public.saves add constraint saves_data_check check (octet_length(data::text) < 1000000);
