import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Form, redirect, useActionData, useNavigation, Link } from "react-router";
import { getCustomerByUid, createOrderSecure } from "../firebase";
import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "../utils/priceUtils";
import { mapItemsForAnalytics, trackEvent } from "../utils/analytics";
import MercadoPagoIcon from "../assets/icons/MercadoPagoIcon";
import styles from "./Checkout.module.scss";

function getAddressDisplayTitle(address) {
    const custom = address.name && String(address.name).trim();
    if (custom) {
        return custom;
    }
    if (address.type === "home") {
        return "Casa";
    }
    if (address.type === "work") {
        return "Trabalho";
    }
    return "Outro";
}

export async function checkoutLoader() {
    // This will check if user is logged in and has items in cart
    return null;
}

export async function checkoutAction({ request }) {
    const formData = await request.formData();
    const cartItemsJson = formData.get("cartItems");
    const shippingAddressJson = formData.get("shippingAddress");
    const customerJson = formData.get("customer");
    const paymentMethod = formData.get("paymentMethod");
    const notes = formData.get("notes") || "";
    const idempotencyKey = formData.get("idempotencyKey");
    const shippingAmountRaw = formData.get("shippingAmount");

    try {
        const cartItems = JSON.parse(cartItemsJson);
        const shippingAddress = JSON.parse(shippingAddressJson);
        const customer = JSON.parse(customerJson);
        const shippingAmount = Number(shippingAmountRaw || 0);
        const orderResult = await createOrderSecure({
            cartItems,
            shippingAddress,
            shippingAmount,
            paymentMethod,
            customer,
            notes,
            idempotencyKey,
        });
        // Checkout Pro: redirect to MercadoPago hosted page
        if (orderResult.payment?.checkoutUrl) {
            return { checkoutUrl: orderResult.payment.checkoutUrl, orderId: orderResult.orderId };
        }
        return redirect(`/checkout/success?orderId=${orderResult.orderId}`);
    } catch (error) {
        console.error("Erro ao criar pedido:", error);
        return { error: error.message || "Erro ao processar pedido" };
    }
}

export default function Checkout() {
    const { cartItems, total, loading: cartLoading } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();
    const actionData = useActionData();
    const navigation = useNavigation();
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedAddressId, setSelectedAddressId] = useState(null);

    useEffect(function redirectToMercadoPago() {
        if (actionData?.checkoutUrl) {
            window.location.href = actionData.checkoutUrl;
        }
    }, [actionData]);

    useEffect(function loadCustomer() {
        async function fetchCustomer() {
            if (user) {
                try {
                    const customerData = await getCustomerByUid(user.uid);
                    setCustomer(customerData);
                    // Set default address
                    if (customerData?.addresses?.length > 0) {
                        const defaultAddress = customerData.addresses.find(function (addr) {
                            return addr.isDefault;
                        });
                        if (defaultAddress) {
                            setSelectedAddressId(defaultAddress.id);
                        } else {
                            setSelectedAddressId(customerData.addresses[0].id);
                        }
                    }
                } catch (error) {
                    console.error("Erro ao carregar dados do cliente:", error);
                } finally {
                    setLoading(false);
                }
            } else {
                navigate("/login?redirectTo=/checkout");
            }
        }
        fetchCustomer();
    }, [user, navigate]);

    useEffect(function checkCart() {
        if (!cartLoading && cartItems.length === 0) {
            navigate("/cart");
        }
    }, [cartItems, cartLoading, navigate]);

    const selectedAddress = customer?.addresses?.find(function (addr) {
        return addr.id === selectedAddressId;
    });

    const fixedShippingAmount = useMemo(function () {
        const envShipping = Number(import.meta.env.VITE_CHECKOUT_SHIPPING_FIXED);
        if (Number.isFinite(envShipping) && envShipping >= 0) {
            return envShipping;
        }
        return 14.9;
    }, []);

    const sandboxPayerFallbackEnabled = useMemo(function getSandboxPayerFallbackEnabled() {
        return (
            String(import.meta.env.VITE_MP_SANDBOX_FORCE_PAYER || "")
                .trim()
                .toLowerCase() === "true"
        );
    }, []);

    const customerSnapshot = useMemo(function getCustomerSnapshot() {
        return {
            firstName: customer?.firstName || "",
            lastName: customer?.lastName || "",
            email: customer?.email || user?.email || "",
            phone: customer?.phone || "",
            document: customer?.document || "",
        };
    }, [customer, user]);

    const missingCheckoutData = useMemo(function calculateMissingCheckoutData() {
        const missing = [];
        if (!selectedAddress) {
            missing.push("endereço de entrega");
        }
        if (!customerSnapshot.firstName) {
            missing.push("nome");
        }
        if (!customerSnapshot.lastName) {
            missing.push("sobrenome");
        }
        if (!sandboxPayerFallbackEnabled && !customerSnapshot.email) {
            missing.push("email");
        }
        if (!customerSnapshot.phone) {
            missing.push("telefone");
        }
        if (!sandboxPayerFallbackEnabled && !customerSnapshot.document) {
            missing.push("documento");
        }
        return missing;
    }, [customerSnapshot, sandboxPayerFallbackEnabled, selectedAddress]);

    useEffect(
        function trackBeginCheckout() {
            if (!cartItems.length) {
                return;
            }
            trackEvent("begin_checkout", {
                currency: "BRL",
                value: total,
                items: mapItemsForAnalytics(cartItems),
            });
        },
        [cartItems, total]
    );

    const subtotal = total;
    const shipping = fixedShippingAmount;
    const discount = 0; // TODO: Apply coupons
    const finalTotal = subtotal + shipping - discount;

    const isSubmitting = navigation.state !== "idle";
    const isRedirecting = Boolean(actionData?.checkoutUrl);
    const isLoading = isSubmitting || isRedirecting;
    const submitLabel = isRedirecting
        ? "Redirecionando..."
        : isSubmitting
        ? "Processando..."
        : "Ir para o Pagamento";

    if (loading || cartLoading) {
        return <div className={styles.loading}>Carregando...</div>;
    }

    if (!user) {
        return null; // Will redirect
    }

    if (cartItems.length === 0) {
        return null; // Will redirect
    }

    return (
        <div className={styles.checkout}>
            <h1 className={styles.title}>Finalizar Compra</h1>

            {actionData?.error && (
                <div className={styles.errorMessage}>{actionData.error}</div>
            )}

            {missingCheckoutData.length > 0 && (
                <div className={styles.errorMessage}>
                    Para finalizar sua compra, complete: {missingCheckoutData.join(", ")}.
                    {missingCheckoutData.includes("documento") && (
                        <>
                            {" "}
                            <Link to="/account/profile">Atualizar perfil</Link>
                        </>
                    )}
                </div>
            )}
            {sandboxPayerFallbackEnabled && (
                <div className={styles.errorMessage}>
                    Modo sandbox ativo: o documento/email do pagador será enviado pelo fallback das functions.
                </div>
            )}

            <Form method="post" className={styles.checkoutForm}>
                <input
                    type="hidden"
                    name="cartItems"
                    value={JSON.stringify(cartItems)}
                />
                <input
                    type="hidden"
                    name="idempotencyKey"
                    value={`${user.uid}-${Date.now()}-${cartItems.length}`}
                />
                <input
                    type="hidden"
                    name="shippingAmount"
                    value={shipping}
                />
                <div className={styles.checkoutContainer}>
                    <div className={styles.leftSection}>
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>Endereço de Entrega</h2>
                            {customer?.addresses && customer.addresses.length > 0 ? (
                                <div className={styles.addressesList}>
                                    {customer.addresses.map(function (address) {
                                        return (
                                            <label
                                                key={address.id}
                                                className={`${styles.addressOption} ${
                                                    selectedAddressId === address.id
                                                        ? styles.selected
                                                        : ""
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="addressId"
                                                    value={address.id}
                                                    checked={selectedAddressId === address.id}
                                                    onChange={function () {
                                                        setSelectedAddressId(address.id);
                                                    }}
                                                />
                                                <div className={styles.addressContent}>
                                                    <div className={styles.addressHeader}>
                                                        <strong>
                                                            {getAddressDisplayTitle(address)}
                                                        </strong>
                                                        {address.isDefault && (
                                                            <span className={styles.defaultBadge}>
                                                                Padrão
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p>
                                                        {address.street}, {address.number}
                                                        {address.complement &&
                                                            ` - ${address.complement}`}
                                                    </p>
                                                    <p>
                                                        {address.neighborhood}, {address.city} -{" "}
                                                        {address.state}
                                                    </p>
                                                    <p>CEP: {address.zipCode}</p>
                                                </div>
                                            </label>
                                        );
                                    })}
                                    <Link
                                        to="/account/addresses"
                                        className={styles.addAddressLink}
                                    >
                                        + Adicionar novo endereço
                                    </Link>
                                </div>
                            ) : (
                                <div className={styles.noAddresses}>
                                    <p>Nenhum endereço cadastrado</p>
                                    <Link to="/account/addresses" className={styles.addAddressButton}>
                                        Adicionar Endereço
                                    </Link>
                                </div>
                            )}

                            {selectedAddress && (
                                <input
                                    type="hidden"
                                    name="shippingAddress"
                                    value={JSON.stringify(selectedAddress)}
                                />
                            )}
                            <input
                                type="hidden"
                                name="customer"
                                value={JSON.stringify(customerSnapshot)}
                            />
                        </div>

                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>Pagamento</h2>
                            <div className={styles.checkoutProNotice}>
                                <div className={styles.mpHeader}>
                                    <MercadoPagoIcon size={36} className={styles.mpIcon} />
                                    <div className={styles.mpHeaderText}>
                                        <strong>Mercado Pago</strong>
                                        <span>Ambiente seguro e criptografado</span>
                                    </div>
                                </div>
                                <p className={styles.mpDescription}>
                                    Você será redirecionado para escolher sua forma de pagamento.
                                </p>
                                <div className={styles.mpMethods}>
                                    <span className={styles.mpMethod}>PIX</span>
                                    <span className={styles.mpMethod}>Cartão de crédito</span>
                                    <span className={styles.mpMethod}>Boleto</span>
                                </div>
                            </div>
                            <input type="hidden" name="paymentMethod" value="checkout_pro" />
                        </div>

                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>Observações (Opcional)</h2>
                            <textarea
                                name="notes"
                                className={styles.notesInput}
                                placeholder="Alguma observação sobre o pedido?"
                                rows="4"
                            />
                        </div>
                    </div>

                    <div className={styles.rightSection}>
                        <div className={styles.orderSummary}>
                            <h2 className={styles.summaryTitle}>Resumo do Pedido</h2>
                            <div className={styles.summaryItems}>
                                {cartItems.map(function (item, index) {
                                    return (
                                        <div key={index} className={styles.summaryItem}>
                                            <div className={styles.itemInfo}>
                                                <p className={styles.itemName}>{item.productName}</p>
                                                <p className={styles.itemDetails}>
                                                    Tamanho {item.size} | Compra | Qtd: {item.quantity}
                                                </p>
                                            </div>
                                            <p className={styles.itemPrice}>
                                                R$ {formatPrice(item.price * item.quantity)}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className={styles.summaryTotals}>
                                <div className={styles.summaryRow}>
                                    <span>Subtotal:</span>
                                    <span>R$ {formatPrice(subtotal)}</span>
                                </div>
                                <div className={styles.summaryRow}>
                                    <span>Frete:</span>
                                    <span>R$ {formatPrice(shipping)}</span>
                                </div>
                                {discount > 0 && (
                                    <div className={styles.summaryRow}>
                                        <span>Desconto:</span>
                                        <span>- R$ {formatPrice(discount)}</span>
                                    </div>
                                )}
                                <div className={styles.summaryDivider}></div>
                                <div className={styles.summaryRowTotal}>
                                    <span>Total:</span>
                                    <span>R$ {formatPrice(finalTotal)}</span>
                                </div>
                            </div>
                            <button
                                type="submit"
                                className={styles.submitButton}
                                disabled={missingCheckoutData.length > 0 || isRedirecting}
                                aria-busy={isLoading}
                            >
                                {isLoading && (
                                    <span className={styles.spinner} aria-hidden="true" />
                                )}
                                <span className={isLoading ? styles.buttonTextLoading : ""}>
                                    {submitLabel}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </Form>
        </div>
    );
}
