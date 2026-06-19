export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: "E-mail não informado." });
  }

  const cleanEmail = String(email).trim().toLowerCase();

  const checkResponse = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/allowed_users?email=ilike.${encodeURIComponent(cleanEmail)}&active=eq.true&limit=1`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );

  const allowedUsers = await checkResponse.json();

  if (!allowedUsers || allowedUsers.length === 0) {
    return res.status(403).json({
      error: "Esse e-mail ainda não possui acesso liberado."
    });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await fetch(`${process.env.SUPABASE_URL}/rest/v1/login_codes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({
      email: cleanEmail,
      code,
      expires_at: expiresAt,
      used: false
    })
  });

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "Acesso MargemUp <acesso@margemup.com.br>",
      to: cleanEmail,
      subject: "Seu código de acesso MargemUp 🔐",
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;padding:40px;background:#0E1116;color:#fff;">
          <div style="max-width:520px;margin:0 auto;background:#111722;border:1px solid rgba(255,255,255,.10);border-radius:28px;padding:34px;text-align:center;">
            <h1 style="margin:0 0 12px;font-size:28px;">Seu código de acesso</h1>
            <p style="color:#a1a1aa;line-height:1.6;">Digite este código na tela de login da MargemUp:</p>
            <div style="margin:24px auto;background:#EE4D2D;color:#fff;font-size:34px;font-weight:bold;letter-spacing:8px;padding:18px 24px;border-radius:16px;display:inline-block;">
              ${code}
            </div>
            <p style="margin-top:24px;color:#71717a;font-size:13px;">Este código expira em 10 minutos.</p>
          </div>
        </div>
      `
    })
  });

  const resendResult = await resendResponse.json();

  if (!resendResponse.ok) {
    return res.status(500).json({
      error: "Erro ao enviar código.",
      resend_result: resendResult
    });
  }

  return res.status(200).json({
    success: true,
    email: cleanEmail
  });
}
