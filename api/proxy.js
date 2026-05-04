const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

async function supabase(method, table, body = null, query = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': method === 'POST' ? 'return=representation' : ''
    },
    body: body ? JSON.stringify(body) : null
  });
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;

  // ── COACH ──
  if (!action) {
    try {
      const { message, history } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      const contents = [...(history || []), { role: 'user', parts: [{ text: message }] }];

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents })
        }
      );

      // 🔴 FIX IMPORTANTE
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error Gemini:", errorText);

        return res.status(500).json({
          error: "Gemini está ocupado, intenta de nuevo en unos segundos"
        });
      }

      const data = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta';

      return res.status(200).json({ reply });

    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ── COMIDAS ──
  if (action === 'guardar-comida') {
    const data = await supabase('POST', 'comidas', req.body);
    return res.status(200).json(data);
  }
  if (action === 'get-comidas') {
    const { fecha } = req.query;
    const data = await supabase('GET', 'comidas', null, `?fecha=eq.${fecha}&order=creado_en.asc`);
    return res.status(200).json(data);
  }
  if (action === 'delete-comida') {
    const { id } = req.query;
    const data = await supabase('DELETE', 'comidas', null, `?id=eq.${id}`);
    return res.status(200).json(data);
  }

  // ── AGUA ──
  if (action === 'guardar-agua') {
    const data = await supabase('POST', 'agua', req.body);
    return res.status(200).json(data);
  }
  if (action === 'get-agua') {
    const { fecha } = req.query;
    const data = await supabase('GET', 'agua', null, `?fecha=eq.${fecha}`);
    return res.status(200).json(data);
  }

  // ── HÁBITOS ──
  if (action === 'guardar-habito') {
    const data = await supabase('POST', 'habitos_registro', req.body);
    return res.status(200).json(data);
  }
  if (action === 'get-habitos') {
    const { fecha_inicio, fecha_fin } = req.query;
    const data = await supabase('GET', 'habitos_registro', null, `?fecha=gte.${fecha_inicio}&fecha=lte.${fecha_fin}`);
    return res.status(200).json(data);
  }

  return res.status(400).json({ error: 'Acción no reconocida' });
}
