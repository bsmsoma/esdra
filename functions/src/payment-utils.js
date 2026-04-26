import {HttpsError} from "firebase-functions/v2/https";

export function normalizeWebhookPaymentStatus(status) {
  const current = String(status || "").trim().toLowerCase();
  if (["approved", "paid", "accredited"].includes(current)) return "paid";
  if (["rejected", "failed", "cancelled", "canceled"].includes(current)) return "failed";
  if (["refunded", "chargeback"].includes(current)) return "refunded";
  return "pending";
}

export function mapPaymentStatusToOrderStatus(paymentStatus, previousStatus) {
  if (paymentStatus === "paid") return "pago";
  if (paymentStatus === "failed") return previousStatus === "cancelado" ? "cancelado" : "pendente";
  return previousStatus || "pendente";
}

export function normalizeShippingAmount(value) {
  const shipping = Number(value);
  if (!Number.isFinite(shipping) || shipping < 0) {
    throw new HttpsError("invalid-argument", "Valor de frete inválido.");
  }
  return Number(shipping.toFixed(2));
}

export function normalizePaymentMethod(method) {
  const allowed = new Set(["pix", "credit", "debit", "boleto", "checkout_pro"]);
  if (!allowed.has(method)) {
    throw new HttpsError("invalid-argument", "Método de pagamento inválido.");
  }
  return method;
}

export function validateShippingAddress(address) {
  if (!address || typeof address !== "object") {
    throw new HttpsError("invalid-argument", "Endereço de entrega inválido.");
  }
  const requiredFields = ["street", "number", "neighborhood", "city", "state", "zipCode"];
  for (const field of requiredFields) {
    const value = String(address?.[field] || "").trim();
    if (!value) {
      throw new HttpsError("invalid-argument", `Campo obrigatório de endereço ausente: ${field}.`);
    }
  }
  return {
    name: String(address.name || "").trim(),
    type: String(address.type || "home").trim().toLowerCase(),
    street: String(address.street || "").trim(),
    number: String(address.number || "").trim(),
    complement: String(address.complement || "").trim(),
    neighborhood: String(address.neighborhood || "").trim(),
    city: String(address.city || "").trim(),
    state: String(address.state || "").trim().toUpperCase(),
    zipCode: String(address.zipCode || "").trim(),
  };
}

export function validateCustomerSnapshot(customerSnapshot, options = {}) {
  const allowMissingSensitiveFields = Boolean(options.allowMissingSensitiveFields);
  if (!customerSnapshot || typeof customerSnapshot !== "object") {
    throw new HttpsError("invalid-argument", "Dados de cliente inválidos.");
  }
  const firstName = String(customerSnapshot.firstName || "").trim();
  const lastName = String(customerSnapshot.lastName || "").trim();
  const email = String(customerSnapshot.email || "").trim().toLowerCase();
  const phone = String(customerSnapshot.phone || "").trim();
  const documentNumber = String(customerSnapshot.document || "").trim();

  if (!firstName || !lastName || !phone) {
    throw new HttpsError("invalid-argument", "Dados obrigatórios de cliente ausentes.");
  }
  if (!allowMissingSensitiveFields && (!email || !documentNumber)) {
    throw new HttpsError("invalid-argument", "Dados obrigatórios de cliente ausentes.");
  }
  return {firstName, lastName, email, phone, document: documentNumber};
}

export function normalizeOrderItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpsError("invalid-argument", "Carrinho inválido.");
  }
  return items.map((item) => {
    if (!item || typeof item !== "object") {
      throw new HttpsError("invalid-argument", "Item do carrinho inválido.");
    }
    const productId = String(item.productId || "").trim();
    const rawType = String(item.type || "sale").trim().toLowerCase();
    const type = rawType === "sell" ? "sale" : rawType;
    const size = String(item.size || "unico").trim();
    const quantity = Number(item.quantity);
    if (!productId || !["rent", "sale"].includes(type) || !Number.isInteger(quantity) || quantity <= 0) {
      throw new HttpsError("invalid-argument", "Item do carrinho malformado.");
    }
    return {productId, type, size, quantity};
  });
}
