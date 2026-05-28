export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const secret = req.headers["x-webhook-secret"];

  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  const body = req.body || {};

  const email =
    body.email ||
    body.customer?.email ||
    body.buyer?.email ||
    body.order?.customer?.email;

  if (!email) {
    return res.status(400).json({ error: "E-mail não encontrado" });
  }

  const cleanEmail = String(email).trim().toLowerCase();

  // libera acesso
  const saveResponse = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/allowed_users`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify({
        email: cleanEmail,
        active: true,
        source: "yampi"
      })
    }
  );

  if (!saveResponse.ok) {
    const errorText = await saveResponse.text();

    return res.status(500).json({
      error: errorText
    });
  }

  // gera magic link
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
        options: {
          redirectTo: "https://precificador-shopee.vercel.app/app.html"
        }
      })
    }
  );

  const magicData = await magicResponse.json();

  return res.status(200).json({
    success: true,
    email: cleanEmail,
    magic_link: magicData?.properties?.action_link || null
  });
}
