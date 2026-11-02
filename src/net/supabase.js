import { createClient } from '@supabase/supabase-js';

// Publishable key được phép nằm ở client; quyền thật do RLS quyết định (supabase/migrations).
// Không bao giờ đưa secret / service_role key vào đây.
// Site key Cloudflare Turnstile (công khai). Để trống thì không hỏi CAPTCHA.
// Khi điền: bật CAPTCHA ở Supabase Auth > Bot and Abuse Protection với secret key tương ứng, và game phải chạy trên tên miền đã khai báo với Turnstile (không chạy qua file://).
export const CAPTCHA_SITE_KEY = '';

export const sb = createClient('https://jowuawrlwxkfjqrqvohd.supabase.co', 'sb_publishable_2Wc9Vh4vzQBEyHggi_Hegg_rXjnToCV');

/** Đẩy bản lưu lên cloud nếu đã đăng nhập. Chỉ để đồng bộ giữa các máy, không dùng chấm điểm. */
export async function pushSave(S) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session || !S) return { skipped: true };
  return sb.from('saves').upsert({ user_id: session.user.id, data: S, updated_at: new Date().toISOString() });
}

export async function pullSave() {
  return sb.from('saves').select('data, updated_at').maybeSingle();
}
