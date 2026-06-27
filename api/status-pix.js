// /api/status-pix.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'ID do pagamento é obrigatório' });
    }

    const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
    if (!ACCESS_TOKEN) {
      return res.status(500).json({ error: 'Access Token não configurado no servidor' });
    }

    const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro Mercado Pago:', data);
      return res.status(response.status).json({ error: 'Erro ao consultar pagamento', details: data });
    }

    return res.status(200).json({
      id: data.id,
      status: data.status,
      status_detail: data.status_detail,
    });

  } catch (err) {
    console.error('Erro interno:', err);
    return res.status(500).json({ error: 'Erro interno ao consultar pagamento' });
  }
}
