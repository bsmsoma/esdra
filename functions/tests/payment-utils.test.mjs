import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeWebhookPaymentStatus,
  mapPaymentStatusToOrderStatus,
  normalizeShippingAmount,
  normalizePaymentMethod,
  validateShippingAddress,
  validateCustomerSnapshot,
  normalizeOrderItems,
} from "../src/payment-utils.js";

describe("normalizeWebhookPaymentStatus", () => {
  test("approved → paid", () => assert.equal(normalizeWebhookPaymentStatus("approved"), "paid"));
  test("paid → paid", () => assert.equal(normalizeWebhookPaymentStatus("paid"), "paid"));
  test("accredited → paid", () => assert.equal(normalizeWebhookPaymentStatus("accredited"), "paid"));
  test("APPROVED uppercase → paid", () => assert.equal(normalizeWebhookPaymentStatus("APPROVED"), "paid"));
  test("rejected → failed", () => assert.equal(normalizeWebhookPaymentStatus("rejected"), "failed"));
  test("failed → failed", () => assert.equal(normalizeWebhookPaymentStatus("failed"), "failed"));
  test("cancelled → failed", () => assert.equal(normalizeWebhookPaymentStatus("cancelled"), "failed"));
  test("canceled → failed", () => assert.equal(normalizeWebhookPaymentStatus("canceled"), "failed"));
  test("refunded → refunded", () => assert.equal(normalizeWebhookPaymentStatus("refunded"), "refunded"));
  test("chargeback → refunded", () => assert.equal(normalizeWebhookPaymentStatus("chargeback"), "refunded"));
  test("pending → pending", () => assert.equal(normalizeWebhookPaymentStatus("pending"), "pending"));
  test("in_process → pending", () => assert.equal(normalizeWebhookPaymentStatus("in_process"), "pending"));
  test("empty string → pending", () => assert.equal(normalizeWebhookPaymentStatus(""), "pending"));
  test("null → pending", () => assert.equal(normalizeWebhookPaymentStatus(null), "pending"));
  test("undefined → pending", () => assert.equal(normalizeWebhookPaymentStatus(undefined), "pending"));
});

describe("mapPaymentStatusToOrderStatus", () => {
  test("paid → pago", () => assert.equal(mapPaymentStatusToOrderStatus("paid", "pendente"), "pago"));
  test("failed + pendente → pendente", () => assert.equal(mapPaymentStatusToOrderStatus("failed", "pendente"), "pendente"));
  test("failed + cancelado → cancelado", () => assert.equal(mapPaymentStatusToOrderStatus("failed", "cancelado"), "cancelado"));
  test("pending + pago → pago (preserves previous)", () => assert.equal(mapPaymentStatusToOrderStatus("pending", "pago"), "pago"));
  test("unknown + undefined previous → pendente", () => assert.equal(mapPaymentStatusToOrderStatus("unknown", undefined), "pendente"));
  test("refunded + pago → pago (preserves)", () => assert.equal(mapPaymentStatusToOrderStatus("refunded", "pago"), "pago"));
});

describe("normalizeShippingAmount", () => {
  test("14.9 → 14.9", () => assert.equal(normalizeShippingAmount(14.9), 14.9));
  test("0 → 0 (free shipping valid)", () => assert.equal(normalizeShippingAmount(0), 0));
  test("string '14.90' → 14.9", () => assert.equal(normalizeShippingAmount("14.90"), 14.9));
  test("rounds to 2 decimals", () => assert.equal(normalizeShippingAmount(14.999), 15.0));
  test("negative throws", () => assert.throws(() => normalizeShippingAmount(-1)));
  test("NaN throws", () => assert.throws(() => normalizeShippingAmount(NaN)));
  test("non-numeric string throws", () => assert.throws(() => normalizeShippingAmount("abc")));
  test("Infinity throws", () => assert.throws(() => normalizeShippingAmount(Infinity)));
});

describe("normalizePaymentMethod", () => {
  test("pix", () => assert.equal(normalizePaymentMethod("pix"), "pix"));
  test("credit", () => assert.equal(normalizePaymentMethod("credit"), "credit"));
  test("debit", () => assert.equal(normalizePaymentMethod("debit"), "debit"));
  test("boleto", () => assert.equal(normalizePaymentMethod("boleto"), "boleto"));
  test("paypal throws", () => assert.throws(() => normalizePaymentMethod("paypal")));
  test("empty string throws", () => assert.throws(() => normalizePaymentMethod("")));
  test("PIX uppercase throws (case sensitive)", () => assert.throws(() => normalizePaymentMethod("PIX")));
});

describe("validateShippingAddress", () => {
  const validAddress = {
    street: "Rua das Flores",
    number: "123",
    neighborhood: "Centro",
    city: "São Paulo",
    state: "sp",
    zipCode: "01000-000",
    complement: "Apto 1",
    name: "Casa",
    type: "home",
  };

  test("valid address passes and returns normalized object", () => {
    const result = validateShippingAddress(validAddress);
    assert.equal(result.street, "Rua das Flores");
    assert.equal(result.city, "São Paulo");
  });

  test("state is uppercased", () => {
    const result = validateShippingAddress(validAddress);
    assert.equal(result.state, "SP");
  });

  test("optional complement defaults to empty string", () => {
    const result = validateShippingAddress({ ...validAddress, complement: undefined });
    assert.equal(result.complement, "");
  });

  test("missing street throws", () => assert.throws(() => validateShippingAddress({ ...validAddress, street: "" })));
  test("missing number throws", () => assert.throws(() => validateShippingAddress({ ...validAddress, number: "" })));
  test("missing neighborhood throws", () => assert.throws(() => validateShippingAddress({ ...validAddress, neighborhood: "" })));
  test("missing city throws", () => assert.throws(() => validateShippingAddress({ ...validAddress, city: "" })));
  test("missing state throws", () => assert.throws(() => validateShippingAddress({ ...validAddress, state: "" })));
  test("missing zipCode throws", () => assert.throws(() => validateShippingAddress({ ...validAddress, zipCode: "" })));
  test("null throws", () => assert.throws(() => validateShippingAddress(null)));
  test("non-object throws", () => assert.throws(() => validateShippingAddress("rua qualquer")));
});

describe("validateCustomerSnapshot", () => {
  const validCustomer = {
    firstName: "João",
    lastName: "Silva",
    email: "JOAO@TEST.COM",
    phone: "11999999999",
    document: "12345678900",
  };

  test("valid customer passes", () => {
    const result = validateCustomerSnapshot(validCustomer);
    assert.equal(result.firstName, "João");
    assert.equal(result.phone, "11999999999");
  });

  test("email is lowercased", () => {
    const result = validateCustomerSnapshot(validCustomer);
    assert.equal(result.email, "joao@test.com");
  });

  test("missing firstName throws", () => assert.throws(() => validateCustomerSnapshot({ ...validCustomer, firstName: "" })));
  test("missing lastName throws", () => assert.throws(() => validateCustomerSnapshot({ ...validCustomer, lastName: "" })));
  test("missing phone throws", () => assert.throws(() => validateCustomerSnapshot({ ...validCustomer, phone: "" })));

  test("missing email throws when allowMissingSensitiveFields=false", () => {
    assert.throws(() => validateCustomerSnapshot({ ...validCustomer, email: "" }));
  });

  test("missing document throws when allowMissingSensitiveFields=false", () => {
    assert.throws(() => validateCustomerSnapshot({ ...validCustomer, document: "" }));
  });

  test("missing email/document OK when allowMissingSensitiveFields=true", () => {
    const result = validateCustomerSnapshot(
      { ...validCustomer, email: "", document: "" },
      { allowMissingSensitiveFields: true }
    );
    assert.equal(result.firstName, "João");
  });

  test("null throws", () => assert.throws(() => validateCustomerSnapshot(null)));
});

describe("normalizeOrderItems", () => {
  const validItem = { productId: "prod-abc", type: "sale", size: "M", quantity: 2 };

  test("valid sale item passes", () => {
    const [result] = normalizeOrderItems([validItem]);
    assert.equal(result.productId, "prod-abc");
    assert.equal(result.type, "sale");
    assert.equal(result.quantity, 2);
  });

  test("rent type is valid", () => {
    const [result] = normalizeOrderItems([{ ...validItem, type: "rent" }]);
    assert.equal(result.type, "rent");
  });

  test("'sell' type is normalized to 'sale'", () => {
    const [result] = normalizeOrderItems([{ ...validItem, type: "sell" }]);
    assert.equal(result.type, "sale");
  });

  test("missing productId throws", () => assert.throws(() => normalizeOrderItems([{ ...validItem, productId: "" }])));
  test("invalid type 'gift' throws", () => assert.throws(() => normalizeOrderItems([{ ...validItem, type: "gift" }])));
  test("zero quantity throws", () => assert.throws(() => normalizeOrderItems([{ ...validItem, quantity: 0 }])));
  test("negative quantity throws", () => assert.throws(() => normalizeOrderItems([{ ...validItem, quantity: -1 }])));
  test("float quantity throws", () => assert.throws(() => normalizeOrderItems([{ ...validItem, quantity: 1.5 }])));
  test("empty array throws", () => assert.throws(() => normalizeOrderItems([])));
  test("null throws", () => assert.throws(() => normalizeOrderItems(null)));
  test("non-array throws", () => assert.throws(() => normalizeOrderItems("item")));

  test("multiple items all normalized", () => {
    const items = [validItem, { ...validItem, productId: "prod-xyz", size: "G", quantity: 1 }];
    const result = normalizeOrderItems(items);
    assert.equal(result.length, 2);
    assert.equal(result[1].productId, "prod-xyz");
  });
});
