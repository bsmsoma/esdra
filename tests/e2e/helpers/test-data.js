export const TEST_PRODUCT_ID = "test-product-e2e";

export const MOCK_ORDER_RESULT = {
  orderId: "test-order-abc123",
  orderNumber: "ESD-2026-001",
  reused: false,
  payment: {
    provider: "manual",
    providerPaymentId: "manual_test-order-abc123",
    providerStatus: "pending",
    paymentStatus: "pending",
    pixQrCode: "",
    pixQrCodeBase64: "",
    paymentUrl: "",
    rawPayload: {},
  },
};

export const MOCK_ORDER_DOC = {
  id: MOCK_ORDER_RESULT.orderId,
  orderNumber: MOCK_ORDER_RESULT.orderNumber,
  status: "pendente",
  paymentStatus: "pending",
  total: 214.8,
  shipping: 14.9,
  subtotal: 199.9,
  items: [
    {
      productId: TEST_PRODUCT_ID,
      productName: "Perfume Teste Floral",
      size: "M",
      quantity: 1,
      unitPrice: 199.9,
      lineTotal: 199.9,
    },
  ],
};
