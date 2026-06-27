// /api/criar-pix.js
const PRECO_BASE = 9.90;
const PRECO_BUMP1 = 4.97;
const PRECO_BUMP2 = 4.97;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { nome, email, telefone, cpf, bump1, bump2 } = req.body;

    if (!nome || !email || !cpf) {
      return res.status(400).json({ error: 'Nome, e-mail e CPF são obrigatórios' });
    }

    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      return res.status(400).json({ error: 'CPF inválido' });
    }

    const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
    if (!ACCESS_TOKEN) {
      return res.status(500).json({ error: 'Access Token não configurado no servidor' });
    }

    const totalAmount = parseFloat((PRECO_BASE + (bump1 ? PRECO_BUMP1 : 0) + (bump2 ? PRECO_BUMP2 : 0)).toFixed(2));

    const produtos = ['Método Tripê'];
    if (bump1) produtos.push('Método Bicarbonato');
    if (bump2) produtos.push('Teza Grande');
    const description = produtos.join(' + ');

    const partesNome = nome.trim().split(' ');
    const firstName = partesNome[0];
    const lastName = partesNome.length > 1 ? partesNome.slice(1).join(' ') : firstName;

    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    const paymentData = {
      transaction_amount: totalAmount,
      description: description,
      payment_method_id: 'pix',
      payer: {
        email: email,
        first_name: firstName,
        last_name: lastName,
        identification: {
          type: 'CPF',
          number: cpfLimpo,
        },
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
      return res.status(response.status).json({ error: 'Erro ao criar pagamento PIX', details: data });
    }

    const transactionData = data.point_of_interaction?.transaction_data;
    if (!transactionData) {
      return res.status(500).json({ error: 'Resposta do Mercado Pago sem dados de PIX' });
    }

    return res.status(200).json({
      id: data.id,
      status: data.status,
      qr_code: transactionData.qr_code,
      qr_code_base64: transactionData.qr_code_base64,
      total: totalAmount,
      produtos: produtos,
    });

  } catch (err) {
    console.error('Erro interno:', err);
    return res.status(500).json({ error: 'Erro interno ao processar pagamento' });
  }
}
