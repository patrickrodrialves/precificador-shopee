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

  const response = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/login_codes?email=eq.${encodeURIComponent(cleanEmail)}&code=eq.${code}&used=eq.false&order=created_at.desc&limit=1`,
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
      error: "Código expirado."
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

  return res.status(200).json({
    success: true
  });
}
