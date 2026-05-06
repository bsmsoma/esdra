import crypto from "node:crypto";
import {onCall, onRequest, HttpsError} from "firebase-functions/v2/https";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {logger} from "firebase-functions/v2";
import {initializeApp} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {MercadoPagoConfig, Preference, Payment} from "mercadopago";
import {Resend} from "resend";
import {
  normalizeWebhookPaymentStatus,
  mapPaymentStatusToOrderStatus,
  normalizeShippingAmount,
  normalizePaymentMethod,
  validateShippingAddress,
  validateCustomerSnapshot,
  normalizeOrderItems,
} from "./src/payment-utils.js";
import {buildEmail} from "./src/email-templates.js";

initializeApp();

const db = getFirestore();
const storage = getStorage();

const FUNCTION_CONFIG = {
  region: "southamerica-east1",
  timeoutSeconds: 60,
  memory: "256MiB",
};

const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const ALLOWED_ORDER_STATUS = new Set(["pendente", "pago", "enviado", "entregue", "cancelado"]);
const ALLOWED_PAYMENT_STATUS = new Set(["pending", "paid", "failed", "refunded"]);
const PAYMENT_PROVIDER = globalThis.process?.env?.PAYMENT_PROVIDER || "manual";

function normalizeMimeType(contentType) {
  let t = String(contentType || "").trim().toLowerCase();
  if (t === "image/jpg") {
    t = "image/jpeg";
  }
  return t;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Após PUT na URL assinada, o objeto pode demorar a aparecer em file.exists().
 */
async function waitForStorageObject(file, {attempts = 12, delayMs = 400} = {}) {
  for (let i = 0; i < attempts; i += 1) {
    const [ok] = await file.exists();
    if (ok) {
      return true;
    }
    await sleep(delayMs);
  }
  return false;
}

function isAdmin(auth) {
  return Boolean(auth?.token?.admin === true);
}

function requireAuth(request) {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }
}

function requireAdmin(request) {
  requireAuth(request);
  if (!isAdmin(request.auth)) {
    throw new HttpsError("permission-denied", "Apenas administradores.");
  }
}

function getStoreId(data) {
  if (typeof data?.storeId === "string" && data.storeId.trim().length > 0) {
    return data.storeId.trim().toLowerCase();
  }
  return globalThis.process?.env?.DEFAULT_STORE_ID || "esdra-aromas";
}

function getMercadoPagoSandboxPayerConfig() {
  if (PAYMENT_PROVIDER !== "mercadopago") {
    return null;
  }

  const forceSandboxPayer = String(globalThis.process?.env?.MERCADOPAGO_SANDBOX_FORCE_PAYER || "")
      .trim()
      .toLowerCase() === "true";

  if (!forceSandboxPayer) {
    return null;
  }

  const email = String(globalThis.process?.env?.MERCADOPAGO_SANDBOX_PAYER_EMAIL || "")
      .trim()
      .toLowerCase();
  const document = String(globalThis.process?.env?.MERCADOPAGO_SANDBOX_PAYER_DOCUMENT || "")
      .replace(/\D/g, "")
      .trim();
  const firstName = String(globalThis.process?.env?.MERCADOPAGO_SANDBOX_PAYER_FIRST_NAME || "")
      .trim();
  const lastName = String(globalThis.process?.env?.MERCADOPAGO_SANDBOX_PAYER_LAST_NAME || "")
      .trim();

  if (!email || !document) {
    throw new HttpsError(
        "failed-precondition",
        "Fallback sandbox habilitado sem MERCADOPAGO_SANDBOX_PAYER_EMAIL e MERCADOPAGO_SANDBOX_PAYER_DOCUMENT.",
    );
  }

  return {
    email,
    document,
    firstName,
    lastName,
  };
}

async function createCheckoutProPreference({orderId, orderNumber, items, shipping, customer}) {
  const accessToken = globalThis.process?.env?.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new HttpsError("failed-precondition", "MERCADOPAGO_ACCESS_TOKEN não configurado.");
  }

  const appUrl = String(globalThis.process?.env?.APP_URL || "").trim().replace(/\/$/, "");
  if (!appUrl) {
    throw new HttpsError("failed-precondition", "APP_URL não configurado.");
  }

  const notificationUrl = globalThis.process?.env?.PAYMENT_WEBHOOK_URL;
  const isSandbox = String(globalThis.process?.env?.MP_SANDBOX || "").trim().toLowerCase() === "true";
  const sandboxPayerConfig = getMercadoPagoSandboxPayerConfig();

  const client = new MercadoPagoConfig({accessToken});
  const preferenceClient = new Preference(client);

  const mpItems = items.map((item) => ({
    id: String(item.productId || ""),
    title: String(item.productName || "Produto"),
    quantity: Number(item.quantity),
    unit_price: Number(Number(item.unitPrice).toFixed(2)),
    currency_id: "BRL",
  }));

  const preferenceBody = {
    items: mpItems,
    payer: {
      name: String(sandboxPayerConfig?.firstName || customer.firstName || ""),
      surname: String(sandboxPayerConfig?.lastName || customer.lastName || ""),
      email: String(sandboxPayerConfig?.email || customer.email || ""),
      identification: {
        type: "CPF",
        number: String(sandboxPayerConfig?.document || customer.document || "").replace(/\D/g, ""),
      },
    },
    back_urls: {
      success: `${appUrl}/checkout/success?orderId=${orderId}`,
      failure: `${appUrl}/checkout/success?orderId=${orderId}&mp_status=failure`,
      pending: `${appUrl}/checkout/success?orderId=${orderId}&mp_status=pending`,
    },
    auto_return: "approved",
    external_reference: orderId,
    statement_descriptor: "Esdra Aromas",
    shipments: {
      cost: Number(Number(shipping).toFixed(2)),
      mode: "not_specified",
    },
  };

  if (notificationUrl) {
    preferenceBody.notification_url = notificationUrl;
  }

  const preference = await preferenceClient.create({body: preferenceBody});
  const checkoutUrl = isSandbox ? preference.sandbox_init_point : preference.init_point;

  logInfo("checkout_pro_preference_created", {orderId, orderNumber, preferenceId: preference.id, isSandbox});

  return {
    provider: "mercadopago",
    preferenceId: String(preference.id || ""),
    providerPaymentId: "",
    providerStatus: "pending",
    paymentStatus: "pending",
    checkoutUrl: checkoutUrl || "",
    rawPayload: {id: preference.id},
  };
}

function createManualPaymentIntent({orderId, paymentMethod}) {
  return {
    provider: "manual",
    providerPaymentId: `manual_${orderId}`,
    providerStatus: "pending",
    paymentStatus: "pending",
    paymentMethod,
    instructions: "Pagamento pendente de confirmação via webhook/manual.",
    rawPayload: {},
  };
}

async function createPaymentIntent({orderId, orderNumber, items, shipping, customer, paymentMethod}) {
  if (PAYMENT_PROVIDER === "mercadopago") {
    return createCheckoutProPreference({orderId, orderNumber, items, shipping, customer});
  }
  return createManualPaymentIntent({orderId, paymentMethod});
}

async function queueTransactionalEmail({
  lojaId,
  orderId,
  orderNumber,
  type,
  to,
  customerName,
  payload = {},
}) {
  if (!to) {
    return;
  }

  const queueRef = db.collection(`lojas/${lojaId}/emailQueue`).doc();
  await queueRef.set({
    orderId,
    orderNumber,
    type,
    to,
    customerName,
    payload,
    provider: "pending",
    status: "queued",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

function logInfo(message, payload) {
  try {
    logger.info(message, {structuredData: true, ...payload});
  } catch (error) {
    console.info("logInfo_fallback", message, payload, error?.message || error);
  }
}

function logError(message, payload) {
  try {
    const safePayload = {...payload};
    if (Object.prototype.hasOwnProperty.call(safePayload, "message")) {
      safePayload.errorMessage = safePayload.message;
      delete safePayload.message;
    }
    logger.error(message, {structuredData: true, ...safePayload});
  } catch (error) {
    console.error("logError_fallback", message, payload, error?.message || error);
  }
}

async function generateOrderNumberTx(transaction, lojaId) {
  const year = new Date().getFullYear();
  const counterRef = db.doc(`lojas/${lojaId}/meta/orderCounter`);
  const counterSnap = await transaction.get(counterRef);

  let sequence = 1;
  if (counterSnap.exists) {
    const data = counterSnap.data();
    const counterYear = Number(data.year || year);
    const currentValue = Number(data.value || 0);
    sequence = counterYear === year ? currentValue + 1 : 1;
  }

  transaction.set(counterRef, {
    year,
    value: sequence,
    updatedAt: FieldValue.serverTimestamp(),
  }, {merge: true});

  return `ESD-${year}-${String(sequence).padStart(3, "0")}`;
}

async function resolveOrderItemsTx(transaction, lojaId, cartItems) {
  const resolvedItems = [];
  const inventoryUpdates = [];
  let subtotal = 0;

  for (const item of cartItems) {
    const productRef = db.doc(`lojas/${lojaId}/products/${item.productId}`);
    const inventoryRef = db.doc(`lojas/${lojaId}/products/${item.productId}/inventory/${item.size}`);

    const [productSnap, inventorySnap] = await Promise.all([
      transaction.get(productRef),
      transaction.get(inventoryRef),
    ]);

    if (!productSnap.exists) {
      throw new HttpsError("failed-precondition", `Produto ${item.productId} não encontrado.`);
    }

    if (!inventorySnap.exists) {
      throw new HttpsError("failed-precondition", `Estoque não encontrado para ${item.productId}/${item.size}.`);
    }

    const productData = productSnap.data();
    const inventoryData = inventorySnap.data();
    const quantity = Number(inventoryData.quantity || 0);
    const sold = Number(inventoryData.sold || 0);
    const reserved = Number(inventoryData.reserved || 0);
    const available = quantity - reserved;

    if (available < item.quantity) {
      throw new HttpsError("failed-precondition", `Estoque insuficiente para ${productData.name || item.productId}.`);
    }

    const unitPrice = item.type === "rent" ?
      Number(productData.rentValue || 0) :
      Number(productData.sellValue || 0);

    if (unitPrice <= 0) {
      throw new HttpsError("failed-precondition", `Preço inválido para ${productData.name || item.productId}.`);
    }

    inventoryUpdates.push({
      inventoryRef,
      quantity: quantity - item.quantity,
      reserved: Math.max(0, reserved - item.quantity),
      sold: sold + item.quantity,
    });

    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;
    resolvedItems.push({
      productId: item.productId,
      productCode: String(productData.code || ""),
      sku: String(productData.sku || productData.code || ""),
      productName: productData.name || "",
      productImage: Array.isArray(productData.images) ?
        String(productData.images[Number(productData.coverIndex || 0)] || productData.images[0] || "") :
        "",
      size: item.size,
      quantity: item.quantity,
      type: item.type,
      unitPrice,
      lineTotal,
    });
  }

  return {resolvedItems, subtotal, inventoryUpdates};
}

export const createOrder = onCall(FUNCTION_CONFIG, async (request) => {
  requireAuth(request);
  const startedAt = Date.now();
  const uid = request.auth.uid;
  const requestId = request.rawRequest?.headers["x-cloud-trace-context"] || crypto.randomUUID();
  const lojaId = getStoreId(request.data);

  const cartItems = normalizeOrderItems(request.data?.cartItems);
  const shippingAddress = validateShippingAddress(request.data?.shippingAddress);
  const shipping = normalizeShippingAmount(request.data?.shippingAmount);
  const paymentMethod = normalizePaymentMethod(String(request.data?.paymentMethod || ""));
  const notes = String(request.data?.notes || "").trim();
  const sandboxPayerConfig = getMercadoPagoSandboxPayerConfig();
  const customerSnapshot = validateCustomerSnapshot(
      request.data?.customer,
      {allowMissingSensitiveFields: Boolean(sandboxPayerConfig)},
  );
  const idempotencyKey = String(request.data?.idempotencyKey || "").trim();

  if (!idempotencyKey || idempotencyKey.length < 10) {
    throw new HttpsError("invalid-argument", "idempotencyKey inválida.");
  }

  const idempotencyRef = db.doc(`lojas/${lojaId}/idempotency/${uid}_${idempotencyKey}`);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const idempotencySnap = await transaction.get(idempotencyRef);
      if (idempotencySnap.exists) {
        const previous = idempotencySnap.data();
        return {
          orderId: previous.orderId,
          orderNumber: previous.orderNumber,
          reusedOrderData: true,
          reused: true,
        };
      }

      const customerRef = db.doc(`lojas/${lojaId}/customers/${uid}`);
      const customerSnap = await transaction.get(customerRef);
      if (!customerSnap.exists) {
        throw new HttpsError("failed-precondition", "Cliente não encontrado.");
      }

      const customer = customerSnap.data() || {};
      const customerEmail = String(
          sandboxPayerConfig?.email ||
          customerSnapshot.email ||
          customer.email ||
          "",
      ).trim().toLowerCase();
      const customerFirstName = String(
          customerSnapshot.firstName ||
          customer.firstName ||
          sandboxPayerConfig?.firstName ||
          "Cliente",
      ).trim();
      const customerLastName = String(
          customerSnapshot.lastName ||
          customer.lastName ||
          sandboxPayerConfig?.lastName ||
          "Sandbox",
      ).trim();
      const customerPhone = customerSnapshot.phone || String(customer.phone || "").trim();
      const customerDocument = String(
          sandboxPayerConfig?.document ||
          customerSnapshot.document ||
          customer.document ||
          "",
      ).replace(/\D/g, "").trim();

      if (!customerEmail || !customerDocument) {
        throw new HttpsError("invalid-argument", "Email e documento do pagador são obrigatórios.");
      }

      const {resolvedItems, subtotal, inventoryUpdates} = await resolveOrderItemsTx(transaction, lojaId, cartItems);
      const discount = 0;
      const total = subtotal + shipping - discount;
      const orderNumber = await generateOrderNumberTx(transaction, lojaId);
      const orderRef = db.collection(`lojas/${lojaId}/orders`).doc();

      const now = FieldValue.serverTimestamp();
      transaction.set(orderRef, {
        orderNumber,
        customerId: uid,
        customerEmail,
        customerName: `${customerFirstName} ${customerLastName}`.trim(),
        customerPhone,
        customerDocument,
        items: resolvedItems,
        subtotal,
        discount,
        shipping,
        total,
        shippingAddress,
        paymentMethod,
        paymentStatus: "pending",
        status: "pendente",
        payment: {
          provider: PAYMENT_PROVIDER,
          providerPaymentId: "",
          providerStatus: "pending",
          updatedAt: now,
        },
        notes,
        createdAt: now,
        updatedAt: now,
      });

      const cartRef = db.doc(`lojas/${lojaId}/carts/${uid}`);
      transaction.set(cartRef, {
        items: [],
        updatedAt: now,
      }, {merge: true});

      transaction.set(idempotencyRef, {
        orderId: orderRef.id,
        orderNumber,
        uid,
        createdAt: now,
      });

      for (const inventoryUpdate of inventoryUpdates) {
        transaction.update(inventoryUpdate.inventoryRef, {
          quantity: inventoryUpdate.quantity,
          reserved: inventoryUpdate.reserved,
          sold: inventoryUpdate.sold,
          lastUpdated: FieldValue.serverTimestamp(),
        });
      }

      return {
        orderId: orderRef.id,
        orderNumber,
        total,
        customer: {
          firstName: customerFirstName,
          lastName: customerLastName,
          email: customerEmail,
          phone: customerPhone,
          document: customerDocument,
        },
        reused: false,
      };
    });

    const orderRef = db.doc(`lojas/${lojaId}/orders/${result.orderId}`);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      throw new HttpsError("internal", "Pedido não encontrado após criação.");
    }
    const orderData = orderSnap.data();
    const shouldCreatePaymentIntent = !result.reused || !orderData?.payment?.preferenceId;

    let paymentIntentData = orderData?.payment || null;
    if (shouldCreatePaymentIntent) {
      paymentIntentData = await createPaymentIntent({
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        items: orderData.items || [],
        shipping: Number(orderData.shipping || 0),
        customer: result.customer || {
          firstName: String(orderData.customerName || "").split(" ")[0] || "",
          lastName: String(orderData.customerName || "").split(" ").slice(1).join(" "),
          email: orderData.customerEmail || "",
          phone: orderData.customerPhone || "",
          document: orderData.customerDocument || "",
        },
        paymentMethod,
      });

      await orderRef.set({
        paymentStatus: paymentIntentData.paymentStatus,
        status: mapPaymentStatusToOrderStatus(paymentIntentData.paymentStatus, orderData.status),
        payment: {
          provider: paymentIntentData.provider,
          preferenceId: paymentIntentData.preferenceId || "",
          providerPaymentId: paymentIntentData.providerPaymentId || "",
          providerStatus: paymentIntentData.providerStatus,
          checkoutUrl: paymentIntentData.checkoutUrl || "",
          rawPayload: paymentIntentData.rawPayload || {},
          updatedAt: FieldValue.serverTimestamp(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      }, {merge: true});

      if (!result.reused) {
        await queueTransactionalEmail({
          lojaId,
          orderId: result.orderId,
          orderNumber: result.orderNumber,
          type: "order_confirmation",
          to: orderData.customerEmail,
          customerName: orderData.customerName,
          payload: {
            total: orderData.total,
            paymentMethod: orderData.paymentMethod,
          },
        });
      }
    }

    logInfo("createOrder_success", {
      requestId,
      uid,
      lojaId,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      reused: result.reused,
      durationMs: Date.now() - startedAt,
    });

    return {
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      reused: result.reused,
      payment: paymentIntentData,
    };
  } catch (error) {
    logError("createOrder_error", {
      requestId,
      uid,
      lojaId,
      message: error.message,
      code: error.code || "internal",
      durationMs: Date.now() - startedAt,
    });
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Erro ao processar pedido.");
  }
});

async function updateOrderFromPayment({storeId, orderId, providerPaymentId, paymentStatus, rawPayload}) {
  const orderRef = db.doc(`lojas/${storeId}/orders/${orderId}`);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) {
    return;
  }

  const orderData = orderSnap.data() || {};
  const nextStatus = mapPaymentStatusToOrderStatus(paymentStatus, orderData.status);

  await orderRef.set({
    paymentStatus,
    status: nextStatus,
    payment: {
      provider: orderData.payment?.provider || PAYMENT_PROVIDER,
      preferenceId: orderData.payment?.preferenceId || "",
      providerPaymentId: providerPaymentId || orderData.payment?.providerPaymentId || "",
      providerStatus: String(rawPayload?.status || ""),
      rawPayload,
      updatedAt: FieldValue.serverTimestamp(),
    },
    updatedAt: FieldValue.serverTimestamp(),
  }, {merge: true});

  if (paymentStatus === "paid" && orderData.paymentStatus !== "paid") {
    await queueTransactionalEmail({
      lojaId: storeId,
      orderId,
      orderNumber: orderData.orderNumber || "",
      type: "payment_approved",
      to: orderData.customerEmail || "",
      customerName: orderData.customerName || "",
      payload: {
        total: orderData.total,
        paymentMethod: orderData.paymentMethod,
      },
    });
  }
}

async function handleMercadoPagoNotification(mpPaymentId) {
  const accessToken = globalThis.process?.env?.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return;
  }

  const client = new MercadoPagoConfig({accessToken});
  const paymentClient = new Payment(client);
  const paymentData = await paymentClient.get({id: mpPaymentId});

  const orderId = String(paymentData.external_reference || "").trim();
  if (!orderId) {
    return;
  }

  const storeId = getStoreId({});
  const paymentStatus = normalizeWebhookPaymentStatus(paymentData.status);

  await updateOrderFromPayment({
    storeId,
    orderId,
    providerPaymentId: String(paymentData.id || ""),
    paymentStatus,
    rawPayload: {
      id: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      payment_method_id: paymentData.payment_method_id,
      payment_type_id: paymentData.payment_type_id,
    },
  });

  logInfo("mercadopago_notification_processed", {mpPaymentId, orderId, paymentStatus});
}

export const paymentWebhook = onRequest(FUNCTION_CONFIG, async (request, response) => {
  if (request.method === "GET" || request.method === "HEAD") {
    response.status(200).json({ok: true, message: "paymentWebhook online"});
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({error: "method_not_allowed"});
    return;
  }

  try {
    const payload = request.body || {};

    // Detect MercadoPago IPN (query params) or Webhooks (body) format
    const queryTopic = String(request.query?.topic || "").trim().toLowerCase();
    const queryId = String(request.query?.id || "").trim();
    const isMpIpn = queryTopic === "payment" && Boolean(queryId);
    const isMpWebhook = payload.type === "payment" && Boolean(payload.data?.id);

    if (isMpIpn || isMpWebhook) {
      const mpPaymentId = isMpIpn ? queryId : String(payload.data.id);
      try {
        await handleMercadoPagoNotification(mpPaymentId);
      } catch (mpError) {
        logger.error("mercadopago_notification_error", {structuredData: true, message: mpError.message, mpPaymentId});
      }
      response.status(200).json({ok: true});
      return;
    }

    // Manual webhook — validate custom secret
    const expectedSecret = globalThis.process?.env?.PAYMENT_WEBHOOK_SECRET || "";
    if (expectedSecret) {
      const receivedSecret = String(request.headers["x-webhook-secret"] || "");
      if (!receivedSecret || receivedSecret !== expectedSecret) {
        response.status(401).json({error: "invalid webhook secret"});
        return;
      }
    }

    const orderId = String(
      payload?.external_reference ||
      payload?.metadata?.orderId ||
      payload?.data?.orderId ||
      ""
    ).trim();
    const storeId = getStoreId(payload);
    if (!orderId) {
      response.status(200).json({received: true});
      return;
    }

    const providerPaymentId = String(payload?.id || payload?.data?.id || "").trim();
    const paymentStatus = normalizeWebhookPaymentStatus(payload?.status || payload?.data?.status);
    await updateOrderFromPayment({storeId, orderId, providerPaymentId, paymentStatus, rawPayload: payload});

    response.status(200).json({ok: true});
  } catch (error) {
    logger.error("paymentWebhook_error", {
      structuredData: true,
      message: error.message,
      stack: error.stack,
      code: error.code || "internal",
    });
    response.status(500).json({error: "internal"});
  }
});

export const updateOrderStatusByAdmin = onCall(FUNCTION_CONFIG, async (request) => {
  requireAdmin(request);

  const orderId = String(request.data?.orderId || "").trim();
  const lojaId = getStoreId(request.data);
  const nextStatus = String(request.data?.status || "").trim().toLowerCase();
  const paymentStatus = String(request.data?.paymentStatus || "").trim().toLowerCase();
  const adminNotes = String(request.data?.adminNotes || "").trim();
  const trackingCode = String(request.data?.trackingCode || "").trim();

  if (!orderId) {
    throw new HttpsError("invalid-argument", "orderId é obrigatório.");
  }

  if (!ALLOWED_ORDER_STATUS.has(nextStatus)) {
    throw new HttpsError("invalid-argument", "Status do pedido inválido.");
  }

  if (paymentStatus && !ALLOWED_PAYMENT_STATUS.has(paymentStatus)) {
    throw new HttpsError("invalid-argument", "Status de pagamento inválido.");
  }

  const orderRef = db.doc(`lojas/${lojaId}/orders/${orderId}`);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) {
    throw new HttpsError("not-found", "Pedido não encontrado.");
  }

  const updateData = {
    status: nextStatus,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (paymentStatus) {
    updateData.paymentStatus = paymentStatus;
  }
  if (adminNotes) {
    updateData.adminNotes = adminNotes;
  }
  if (trackingCode) {
    updateData.trackingCode = trackingCode;
  }

  await orderRef.set(updateData, {merge: true});
  const orderData = orderSnap.data() || {};

  if (nextStatus === "pago" || paymentStatus === "paid") {
    await queueTransactionalEmail({
      lojaId,
      orderId,
      orderNumber: orderData.orderNumber || "",
      type: "payment_approved",
      to: orderData.customerEmail || "",
      customerName: orderData.customerName || "",
      payload: {
        total: orderData.total,
        paymentMethod: orderData.paymentMethod,
      },
    });
  }

  return {ok: true};
});

export const cancelOrderByCustomer = onCall(FUNCTION_CONFIG, async (request) => {
  requireAuth(request);
  const uid = request.auth.uid;
  const lojaId = getStoreId(request.data);
  const orderId = String(request.data?.orderId || "").trim();

  if (!orderId) {
    throw new HttpsError("invalid-argument", "orderId é obrigatório.");
  }

  const orderRef = db.doc(`lojas/${lojaId}/orders/${orderId}`);

  await db.runTransaction(async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists) {
      throw new HttpsError("not-found", "Pedido não encontrado.");
    }

    const order = orderSnap.data();

    if (order.customerId !== uid) {
      throw new HttpsError("permission-denied", "Acesso negado.");
    }

    if (order.status !== "pendente") {
      throw new HttpsError("failed-precondition", "Apenas pedidos pendentes podem ser cancelados pelo cliente.");
    }

    const items = order.items || [];
    const inventoryRefs = items.map((item) =>
      db.doc(`lojas/${lojaId}/products/${item.productId}/inventory/${item.size}`)
    );
    const inventorySnaps = await Promise.all(inventoryRefs.map((ref) => transaction.get(ref)));

    transaction.update(orderRef, {
      status: "cancelado",
      cancelledAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    inventorySnaps.forEach((snap, i) => {
      if (!snap.exists) return;
      const data = snap.data();
      transaction.update(inventoryRefs[i], {
        quantity: Number(data.quantity || 0) + items[i].quantity,
        sold: Math.max(0, Number(data.sold || 0) - items[i].quantity),
        lastUpdated: FieldValue.serverTimestamp(),
      });
    });
  });

  return {ok: true};
});

function validateFilesMetadata(filesMeta) {
  if (!Array.isArray(filesMeta) || filesMeta.length === 0) {
    throw new HttpsError("invalid-argument", "filesMeta inválido.");
  }

  return filesMeta.map((fileMeta) => {
    const kind = String(fileMeta.kind || "").trim();
    const contentType = normalizeMimeType(fileMeta.contentType);
    const size = Number(fileMeta.size || 0);
    const extension = String(fileMeta.extension || "").trim().toLowerCase();

    if (!["image", "video"].includes(kind) || !contentType || !Number.isFinite(size) || size <= 0) {
      throw new HttpsError("invalid-argument", "Metadados de arquivo inválidos.");
    }

    if (kind === "image" && (!ALLOWED_IMAGE_TYPES.has(contentType) || size > MAX_IMAGE_SIZE_BYTES)) {
      throw new HttpsError("invalid-argument", "Imagem fora da política.");
    }

    if (kind === "video" && (!ALLOWED_VIDEO_TYPES.has(contentType) || size > MAX_VIDEO_SIZE_BYTES)) {
      throw new HttpsError("invalid-argument", "Vídeo fora da política.");
    }

    return {kind, contentType, size, extension};
  });
}

export const createUploadSession = onCall(FUNCTION_CONFIG, async (request) => {
  requireAdmin(request);
  const uid = request.auth.uid;
  const requestId = request.rawRequest?.headers["x-cloud-trace-context"] || crypto.randomUUID();

  try {
    const lojaId = getStoreId(request.data);
    const productId = String(request.data?.productId || "").trim();
    const filesMeta = validateFilesMetadata(request.data?.filesMeta);

    if (!productId) {
      throw new HttpsError("invalid-argument", "productId é obrigatório.");
    }

    const bucket = storage.bucket();
    const expires = Date.now() + 15 * 60 * 1000;
    const uploads = [];

    for (const fileMeta of filesMeta) {
      const objectKey = `lojas/${lojaId}/produtos/${productId}/${fileMeta.kind === "image" ? "imagens" : "videos"}/${crypto.randomUUID()}.${fileMeta.extension || "bin"}`;
      const file = bucket.file(objectKey);
      const [signedUrl] = await file.getSignedUrl({
        version: "v4",
        action: "write",
        expires,
        contentType: fileMeta.contentType,
      });

      uploads.push({
        kind: fileMeta.kind,
        objectKey,
        signedUrl,
        contentType: fileMeta.contentType,
        size: fileMeta.size,
        expiresAt: expires,
      });
    }

    logInfo("createUploadSession_success", {
      requestId,
      uid,
      lojaId,
      productId,
      filesCount: uploads.length,
    });

    return {uploads};
  } catch (error) {
    logError("createUploadSession_error", {
      requestId,
      uid: request.auth?.uid,
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    if (error instanceof HttpsError) {
      throw error;
    }
    const detail = error && error.message ? String(error.message).trim() : "Erro desconhecido";
    const hint =
      /signBlob|signblob|Token Creator|iam\.serviceaccounts/i.test(detail) ?
        " No GCP: conceda roles/iam.serviceAccountTokenCreator à conta que roda a função " +
        "(ex.: default compute) sobre ela mesma e, se necessário, sobre " +
        "service-<PROJECT_NUMBER>@gs-project-accounts.iam.gserviceaccount.com." :
        "";
    throw new HttpsError(
        "failed-precondition",
        `createUploadSession: ${detail.slice(0, 450)}${hint}`.slice(0, 500),
    );
  }
});

async function toDownloadUrl(file) {
  const [metadata] = await file.getMetadata();
  const token = metadata.metadata?.firebaseStorageDownloadTokens || crypto.randomUUID();
  if (!metadata.metadata?.firebaseStorageDownloadTokens) {
    try {
      await file.setMetadata({
        metadata: {
          firebaseStorageDownloadTokens: token,
        },
      });
    } catch (metaErr) {
      logError("toDownloadUrl_setMetadata_failed", {
        objectName: file.name,
        message: metaErr.message,
      });
      throw metaErr;
    }
  }
  const bucketName = file.bucket.name;
  const encodedPath = encodeURIComponent(file.name);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;
}

export const commitMedia = onCall(FUNCTION_CONFIG, async (request) => {
  requireAdmin(request);
  const uid = request.auth.uid;
  const requestId = request.rawRequest?.headers["x-cloud-trace-context"] || crypto.randomUUID();

  try {
    const lojaId = getStoreId(request.data);
    const productId = String(request.data?.productId || "").trim();
    const uploadedObjects = Array.isArray(request.data?.uploadedObjects) ? request.data.uploadedObjects : [];
    const keepExistingImageUrls = Array.isArray(request.data?.keepExistingImageUrls) ? request.data.keepExistingImageUrls : [];
    const removedImageUrls = Array.isArray(request.data?.removedImageUrls) ? request.data.removedImageUrls : [];
    const replaceVideo = Boolean(request.data?.replaceVideo);
    const removeVideo = Boolean(request.data?.removeVideo);
    const oldVideoUrl = request.data?.oldVideoUrl ? String(request.data.oldVideoUrl) : "";

    if (!productId) {
      throw new HttpsError("invalid-argument", "productId é obrigatório.");
    }

    const bucket = storage.bucket();
    const images = [];
    let videoUrl = null;

    for (const object of uploadedObjects) {
      const objectKey = String(object.objectKey || "").trim();
      const kind = String(object.kind || "").trim();
      if (!objectKey || !["image", "video"].includes(kind)) {
        throw new HttpsError("invalid-argument", "uploadedObjects inválido.");
      }

      const expectedPrefix = `lojas/${lojaId}/produtos/${productId}/`;
      if (!objectKey.startsWith(expectedPrefix)) {
        throw new HttpsError("permission-denied", "Objeto fora do escopo permitido.");
      }

      const file = bucket.file(objectKey);
      const visible = await waitForStorageObject(file);
      if (!visible) {
        throw new HttpsError(
            "failed-precondition",
            "O arquivo ainda não apareceu no Storage após o upload. Tente salvar novamente.",
        );
      }

      const [metadata] = await file.getMetadata();
      const contentType = normalizeMimeType(metadata.contentType || "");
      const size = Number(metadata.size || 0);

      if (kind === "image" && (!ALLOWED_IMAGE_TYPES.has(contentType) || size > MAX_IMAGE_SIZE_BYTES)) {
        throw new HttpsError(
            "failed-precondition",
            `Tipo ou tamanho de imagem inválido (recebido: ${contentType || "vazio"}). Use JPEG, PNG ou WebP.`,
        );
      }
      if (kind === "video" && (!ALLOWED_VIDEO_TYPES.has(contentType) || size > MAX_VIDEO_SIZE_BYTES)) {
        throw new HttpsError(
            "failed-precondition",
            `Tipo ou tamanho de vídeo inválido (recebido: ${contentType || "vazio"}).`,
        );
      }

      const downloadUrl = await toDownloadUrl(file);
      if (kind === "image") {
        images.push(downloadUrl);
      } else {
        videoUrl = downloadUrl;
      }
    }

    const productRef = db.doc(`lojas/${lojaId}/products/${productId}`);
    const finalImages = [...keepExistingImageUrls, ...images];
    const updatePayload = {
      images: finalImages,
      lastModified: FieldValue.serverTimestamp(),
    };

    if (replaceVideo) {
      updatePayload.video = videoUrl;
    } else if (removeVideo) {
      updatePayload.video = null;
    }

    await productRef.set(updatePayload, {merge: true});

    const toDelete = [...removedImageUrls];
    if ((replaceVideo || removeVideo) && oldVideoUrl) {
      toDelete.push(oldVideoUrl);
    }

    for (const mediaUrl of toDelete) {
      try {
        const decoded = decodeURIComponent(mediaUrl);
        const pathMatch = decoded.match(/\/o\/([^?]+)/);
        if (!pathMatch || !pathMatch[1]) {
          continue;
        }
        const filePath = pathMatch[1];
        if (!filePath.startsWith(`lojas/${lojaId}/produtos/${productId}/`)) {
          continue;
        }
        await bucket.file(filePath).delete({ignoreNotFound: true});
      } catch (error) {
        logError("commitMedia_delete_old_media_failed", {
          uid,
          lojaId,
          productId,
          mediaUrl,
          message: error.message,
        });
      }
    }

    logInfo("commitMedia_success", {
      requestId,
      uid,
      lojaId,
      productId,
      imagesCount: finalImages.length,
      hasVideo: Boolean(updatePayload.video),
    });

    return {
      images: finalImages,
      video: updatePayload.video ?? null,
    };
  } catch (error) {
    logError("commitMedia_error", {
      requestId,
      uid: request.auth?.uid,
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
        "internal",
        "Erro ao confirmar mídia. Veja os logs da função commitMedia no Firebase Console.",
    );
  }
});

export const deleteMedia = onCall(FUNCTION_CONFIG, async (request) => {
  requireAdmin(request);
  const lojaId = getStoreId(request.data);
  const productId = String(request.data?.productId || "").trim();
  const mediaUrls = Array.isArray(request.data?.mediaUrls) ? request.data.mediaUrls : [];
  const objectKeys = Array.isArray(request.data?.objectKeys) ? request.data.objectKeys : [];
  const bucket = storage.bucket();

  if (!productId || (mediaUrls.length === 0 && objectKeys.length === 0)) {
    throw new HttpsError("invalid-argument", "Parâmetros inválidos para remoção.");
  }

  let deletedCount = 0;
  const expectedPrefix = `lojas/${lojaId}/produtos/${productId}/`;

  for (const objectKeyRaw of objectKeys) {
    const objectKey = String(objectKeyRaw || "").trim();
    if (!objectKey || !objectKey.startsWith(expectedPrefix)) {
      continue;
    }
    await bucket.file(objectKey).delete({ignoreNotFound: true});
    deletedCount += 1;
  }

  for (const mediaUrl of mediaUrls) {
    const decoded = decodeURIComponent(String(mediaUrl || ""));
    const pathMatch = decoded.match(/\/o\/([^?]+)/);
    if (!pathMatch || !pathMatch[1]) {
      continue;
    }
    const filePath = pathMatch[1];
    if (!filePath.startsWith(expectedPrefix)) {
      continue;
    }
    await bucket.file(filePath).delete({ignoreNotFound: true});
    deletedCount += 1;
  }

  logInfo("deleteMedia_success", {
    uid: request.auth.uid,
    lojaId,
    productId,
    deletedCount,
  });

  return {deletedCount};
});

export const processEmailQueue = onDocumentCreated(
  {
    document: "lojas/{lojaId}/emailQueue/{docId}",
    region: "southamerica-east1",
    timeoutSeconds: 30,
    memory: "256MiB",
  },
  async (event) => {
    const lojaId = event.params.lojaId;
    const docId = event.params.docId;
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const docRef = snap.ref;

    if (!data || data.status !== "queued") return;

    const apiKey = globalThis.process?.env?.RESEND_API_KEY;
    if (!apiKey) {
      logError("processEmailQueue_no_api_key", {lojaId, docId});
      await docRef.update({
        status: "failed",
        errorMessage: "RESEND_API_KEY não configurado nas variáveis de ambiente.",
        failedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    const {type, to, customerName, orderNumber, payload} = data;

    if (!to || !type || !orderNumber) {
      await docRef.update({
        status: "failed",
        errorMessage: "Dados insuficientes: to, type ou orderNumber ausente.",
        failedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    // Marca como processing para evitar reprocessamento em retry da Cloud Function
    await docRef.update({
      status: "processing",
      updatedAt: FieldValue.serverTimestamp(),
    });

    try {
      const appUrl = String(globalThis.process?.env?.APP_URL || "").trim();
      const emailContent = buildEmail({
        type,
        customerName: String(customerName || ""),
        orderNumber: String(orderNumber || ""),
        total: payload?.total,
        paymentMethod: payload?.paymentMethod,
        appUrl,
      });

      if (!emailContent) {
        throw new Error(`Tipo de email desconhecido: "${type}"`);
      }

      const fromEmail = String(
        globalThis.process?.env?.EMAIL_FROM || "ESDRA Aromas <noreply@esdraaromas.com.br>",
      ).trim();

      const resend = new Resend(apiKey);
      const {data: sendData, error} = await resend.emails.send({
        from: fromEmail,
        to: [to],
        subject: emailContent.subject,
        html: emailContent.html,
      });

      if (error) {
        throw new Error(String(error.message || "Resend API error"));
      }

      await docRef.update({
        status: "sent",
        provider: "resend",
        providerMessageId: String(sendData?.id || ""),
        sentAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      logInfo("processEmailQueue_sent", {lojaId, docId, orderNumber, type, to});
    } catch (err) {
      logError("processEmailQueue_error", {
        lojaId,
        docId,
        orderNumber,
        type,
        message: err.message,
      });
      await docRef.update({
        status: "failed",
        errorMessage: String(err.message || "Erro desconhecido").slice(0, 500),
        failedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  },
);
