// Cloudflare Turnstile 人机验证 + Supabase 注册代理
// 说明：注册请求先经服务端校验 Turnstile，通过后再调用 Supabase signUp 发送验证邮件。

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

type TurnstileResult = { ok: boolean; configured: boolean }

async function verifyTurnstile(token: string | undefined): Promise<TurnstileResult> {
  console.log('[auth-signup] verifyTurnstile token length =', token ? token.length : 'MISSING')
  if (!token) return { ok: false, configured: true }

  const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
  if (!secret) return { ok: false, configured: false }

  const body = new URLSearchParams()
  body.set('secret', secret)
  body.set('response', token)

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) {
    console.log('[auth-signup] siteverify HTTP error', res.status)
    return { ok: false, configured: true }
  }

  const data = await res.json()
  console.log('[auth-signup] siteverify response:', JSON.stringify(data))
  return { ok: data.success === true, configured: true }
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
    const password = typeof payload?.password === 'string' ? payload.password : ''
    const turnstileToken = typeof payload?.turnstileToken === 'string' ? payload.turnstileToken : ''

    if (!email || !password) {
      return json({ error: 'missing_fields' }, 400)
    }

    if (password.length < 6) {
      return json({ error: 'password_too_short' }, 400)
    }

    // 服务端校验 Turnstile，失败直接 403；未配置密钥则返回明确错误
    const turnstile = await verifyTurnstile(turnstileToken)
    if (!turnstile.ok) {
      if (!turnstile.configured) return json({ error: 'turnstile_not_configured' }, 503)
      return json({ error: 'turnstile_failed' }, 403)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseAnonKey) {
      return json({ error: 'supabase_not_configured' }, 500)
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // flowType 必须在客户端构造函数中设置才会生效（方法参数里设置会被忽略）
        // PKCE 流程：邮件链接携带 token_hash 与 type=email，由前端 ConfirmWait 页调用 verifyOtp 完成验证
        flowType: 'pkce',
      },
    })

    // 自动生成随机用户名（系统生成随机 ID，注册仅需邮箱+密码）
    const randomId = Math.random().toString(36).substring(2, 10)

    const origin = req.headers.get('origin') || 'https://gainian.de5.net'
    const emailRedirectTo = `${origin}/auth/confirm-wait`

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: { username: randomId },
      },
    })

    if (error) {
      const msg = (error.message || '').toLowerCase()
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists') || msg.includes('in use')) {
        return json({ error: 'email_already_registered' }, 409)
      }
      if (msg.includes('rate limit') || msg.includes('too many')) {
        return json({ error: 'rate_limit' }, 429)
      }
      return json({ error: 'signup_failed' }, 400)
    }

    return json({ success: true })
  } catch {
    return json({ error: 'internal_error' }, 500)
  }
})
