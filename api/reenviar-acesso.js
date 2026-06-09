export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const body = req.body || {};
  const email = body.email;

  if (!email) {
    return res.status(400).json({ error: "E-mail não informado" });
  }

  const cleanEmail = String(email).trim().toLowerCase();

  const checkResponse = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/allowed_users?email=ilike.${encodeURIComponent(cleanEmail)}&active=eq.true&limit=1`,
    {
      method: "GET",
      headers: {
        "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );

  const allowedUsers = await checkResponse.json();

  if (!allowedUsers || allowedUsers.length === 0) {
    return res.status(403).json({
      error: "Esse e-mail ainda não possui acesso liberado."
    });
  }

  const magicResponse = await fetch(
    `${process.env.SUPABASE_URL}/auth/v1/admin/generate_link`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        type: "magiclink",
        email: cleanEmail,
        redirect_to: "https://margemup.com.br/shopee/app"
      })
    }
  );

  const magicData = await magicResponse.json();

  const magicLink =
    magicData?.action_link ||
    magicData?.properties?.action_link;

  if (!magicLink) {
    return res.status(500).json({
      error: "Não foi possível gerar o link de acesso."
    });
  }

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "MargemUp <onboarding@resend.dev>",
      to: cleanEmail,
      subject: "Seu link de acesso à MargemUp 🔐",
      html: `
        <div style="font-family:Arial;padding:40px;text-align:center;background:#0E1116;color:#fff;">
          <div style="max-width:520px;margin:0 auto;background:#111722;border:1px solid rgba(255,255,255,.10);border-radius:28px;padding:34px;">
            <h1 style="margin:0 0 12px;font-size:28px;">Acesse sua calculadora 🚀</h1>

            <p style="color:#a1a1aa;line-height:1.6;">
              Clique no botão abaixo para entrar na sua área MargemUp.
            </p>

            <a href="${magicLink}"
              style="display:inline-block;margin-top:22px;background:#EE4D2D;color:#fff;padding:15px 24px;border-radius:14px;text-decoration:none;font-weight:bold;">
              Acessar calculadora
            </a>

            <p style="margin-top:28px;color:#71717a;font-size:13px;">
              Este link é pessoal e faz login automático.
            </p>
          </div>
        </div>
      `
    })
  });

  const resendResult = await resendResponse.json();

  if (!resendResponse.ok) {
    return res.status(500).json({
      error: "Erro ao enviar e-mail.",
      resend_result: resendResult
    });
  }

  return res.status(200).json({
    success: true,
    email: cleanEmail
  });
}
