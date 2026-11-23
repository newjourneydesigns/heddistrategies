// Newsletter signup. The form on the site posts here, and the address is added
// to the Heddi contact list in Resend. Needs RESEND_API_KEY set in Netlify.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});

export default async (req) => {
  if (req.method !== "POST") return json(405, { ok: false });
  const key = process.env.RESEND_API_KEY;
  if (!key) return json(503, { ok: false });

  let data;
  try { data = await req.json(); } catch { return json(400, { ok: false }); }

  // Hidden field that only bots fill in. Pretend it worked.
  if (data.website) return json(200, { ok: true });

  const email = String(data.email || "").trim().toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) return json(400, { ok: false, error: "invalid_email" });

  const res = await fetch("https://api.resend.com/contacts", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, unsubscribed: false }),
  });
  if (res.ok) return json(200, { ok: true });

  // Someone who is already on the list should still see a thank-you.
  const text = await res.text();
  if (res.status === 409 || /already exist/i.test(text)) return json(200, { ok: true });

  console.error("Resend rejected a signup:", res.status, text.slice(0, 300));
  return json(502, { ok: false });
};

export const config = { path: "/api/subscribe" };
