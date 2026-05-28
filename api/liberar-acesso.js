import { Resend } from "resend";

export default async function handler(req, res) {
  const resend = new Resend(process.env.RESEND_API_KEY);
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
    `${process.env.SUPABASE_URL}/rest/v1/allowed_users?on_conflict=email`,
    {
      method: "POST",
      headers: {
  "Content-Type": "application/json",
  "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
  "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
  "Prefer": "resolution=merge-duplicates",
  "on_conflict": "email"
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

  const magicLink =
  magicData?.action_link ||
  magicData?.properties?.action_link;

if (magicLink) {
  await resend.emails.send({
    from: "SellZen <onboarding@resend.dev>",
    to: cleanEmail,
    subject: "Seu acesso foi liberado 🔓",
    html: `
      <div style="font-family:Arial;padding:40px;text-align:center;">
        <h1>Seu acesso foi liberado 🚀</h1>

        <p>
          Clique no botão abaixo para acessar sua calculadora.
        </p>

        <a href="${magicLink}"
          style="
            display:inline-block;
            margin-top:20px;
            background:#39b6a0;
            color:#fff;
            padding:14px 24px;
            border-radius:12px;
            text-decoration:none;
            font-weight:bold;
          ">
          Acessar calculadora
        </a>

        <p style="margin-top:30px;color:#777;font-size:14px;">
          Este link faz login automático.
        </p>
      </div>
    `
  });
}

  return res.status(200).json({
  success: true,
  email: cleanEmail,
  magic_link:
    magicData?.properties?.action_link ||
    magicData?.action_link ||
    magicData?.confirmation_url ||
    magicData?.properties?.email_otp ||
    null,
  supabase_return: magicData
});
}
