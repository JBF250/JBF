import { supabase } from '@/lib/supabase'

// 软件下载计数：点击下载按钮记一条，总数 = 该软件所有平台的记录数之和。
//
// 需要在 Supabase 先建表（只需执行一次）：
//
//   create table if not exists software_downloads (
//     id bigint generated always as identity primary key,
//     app_id text not null,
//     arch text not null,
//     created_at timestamptz not null default now()
//   );
//   create index if not exists software_downloads_app_idx on software_downloads (app_id);
//   alter table software_downloads enable row level security;
//   create policy "anon insert downloads" on software_downloads for insert to anon with check (true);
//   create policy "anon read downloads"   on software_downloads for select to anon using (true);
//
// 表不存在或权限不足时静默降级：记不上就不记、数字不显示，不影响下载与页面。

export async function recordDownload(appId: string, arch: string): Promise<void> {
  try {
    await supabase.from('software_downloads').insert({ app_id: appId, arch })
  } catch {
    /* 计数失败不影响下载 */
  }
}

export async function getDownloadCount(appId: string): Promise<number | null> {
  try {
    const { count, error } = await supabase
      .from('software_downloads')
      .select('*', { count: 'exact', head: true })
      .eq('app_id', appId)
    if (error) return null
    return count ?? 0
  } catch {
    return null
  }
}
