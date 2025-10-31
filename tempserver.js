/**
 * tempserver.js
 * Serveur simple pour tests locaux (NE PAS COMMITTER de clés secrètes).
 * Utilise uniquement la variable d'environnement STRIPE_SECRET_KEY.
 */

require('dotenv').config();
const express = require('express');
const Stripe = require('stripe');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('.'));

// IMPORTANT : n'autorise PAS de clé en dur. Valeur par défaut neutre.
const stripeKey = process.env.STRIPE_SECRET_KEY || "YOUR_SECRET_KEY";
const stripe = new Stripe(stripeKey, { apiVersion: '2022-11-15' });

app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount_cents = 1000, currency = 'chf' } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: currency,
      payment_method_types: ['card'],
      metadata: { order_id: 'demo_order_' + Date.now() }
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Temp server running on http://localhost:${PORT}`);
});
