// Cloudflare Turnstile 人机验证 + Supabase 重置密码代理
// 说明：重置密码请求先经服务端校验 Turnstile，通过后再调用 resetPasswordForEmail 发送邮件。

import { createClient } from 'npm:@supabase/supabase-js@2.45.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function verifyTurnstile(token: string | undefined): Promise<boolean> {
  if (!token) return false

  const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
  if (!secret) return false

  const body = new URLSearchParams()
  body.set('secret', secret)
  body.set('response', token)

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) return false

  const data = await res.json()
  return data.success === true
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405)
  }

  try {
    const payload = await req.json()
    const email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : ''
    const turnstileToken = typeof payload?.turnstileToken === 'string' ? payload.turnstileToken : ''

    if (!email) {
      return json({ error: 'missing_fields' }, 400)
    }

    // 服务端校验 Turnstile，失败直接 403
    const turnstileOk = await verifyTurnstile(turnstileToken)
    if (!turnstileOk) {
      return json({ error: 'turnstile_failed' }, 403)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseAnonKey) {
      return json({ error: 'supabase_not_configured' }, 500)
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const origin = req.headers.get('origin') || 'https://gainian.de5.net'
    const redirectTo = `${origin}/auth/confirm-wait`

    // 使用 PKCE 流程，邮件链接携带 token_hash 与 type=recovery
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
      flowType: 'pkce',
    })

    // 无论邮箱是否存在都返回成功，防止邮箱枚举攻击（错误仅在服务端日志可见）
    return json({ success: true })
  } catch {
    // 为防止邮箱枚举，非 Turnstile 校验失败类错误仍返回成功
    return json({ success: true })
  }
})
