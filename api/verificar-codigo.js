export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { email, code } = req.body || {};

  if (!email || !code) {
    return res.status(400).json({
      error: "E-mail ou código não informado."
    });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanCode = String(code).trim();

  const response = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/login_codes?email=eq.${encodeURIComponent(cleanEmail)}&code=eq.${encodeURIComponent(cleanCode)}&used=eq.false&order=created_at.desc&limit=1`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );

  const rows = await response.json();

  if (!rows || rows.length === 0) {
    return res.status(400).json({
      error: "Código inválido."
    });
  }

  const registro = rows[0];

  if (new Date(registro.expires_at) < new Date()) {
    return res.status(400).json({
      error: "Código expirado. Solicite um novo código."
    });
  }

  await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/login_codes?id=eq.${registro.id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        used: true
      })
    }
  );

  const magicResponse = await fetch(
    `${process.env.SUPABASE_URL}/auth/v1/admin/generate_link`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
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
      error: "Código validado, mas não foi possível gerar o acesso."
    });
  }

  return res.status(200).json({
    success: true,
    magic_link: magicLink
  });
}
