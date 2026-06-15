// /api/criar-pix.js
// Function serverless do Vercel: cria um pagamento PIX dinâmico via Mercado Pago
// e retorna o QR Code + código copia-e-cola para o frontend.

export default async function handler(req, res) {
  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { nome, email, telefone } = req.body;

    // Validação básica
    if (!nome || !email) {
      return res.status(400).json({ error: 'Nome e e-mail são obrigatórios' });
    }

    const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

    if (!ACCESS_TOKEN) {
      return res.status(500).json({ error: 'Access Token não configurado no servidor' });
    }

    // Separa nome em primeiro e último (Mercado Pago pede first_name/last_name)
    const partesNome = nome.trim().split(' ');
    const firstName = partesNome[0];
    const lastName = partesNome.length > 1 ? partesNome.slice(1).join(' ') : firstName;

    // Chave de idempotência única (evita pagamentos duplicados em caso de retry)
    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    const paymentData = {
      transaction_amount: 27.90,
      description: 'Acesso ao conteúdo - Método Tripê',
      payment_method_id: 'pix',
      payer: {
        email: email,
        first_name: firstName,
        last_name: lastName,
      },
    };

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(paymentData),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro Mercado Pago:', data);
      return res.status(response.status).json({
        error: 'Erro ao criar pagamento PIX',
        details: data,
      });
    }

    // Extrai os dados do PIX da resposta
    const transactionData = data.point_of_interaction?.transaction_data;

    if (!transactionData) {
      return res.status(500).json({ error: 'Resposta do Mercado Pago sem dados de PIX' });
    }

    return res.status(200).json({
      id: data.id,
      status: data.status,
      qr_code: transactionData.qr_code,
      qr_code_base64: transactionData.qr_code_base64,
    });

  } catch (err) {
    console.error('Erro interno:', err);
    return res.status(500).json({ error: 'Erro interno ao processar pagamento' });
  }
}
