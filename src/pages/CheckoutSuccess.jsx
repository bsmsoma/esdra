import { useSearchParams, Link } from "react-router";
import { getOrderById } from "../firebase";
import { useEffect, useState } from "react";
import { formatPrice } from "../utils/priceUtils";
import { trackEvent } from "../utils/analytics";
import styles from "./CheckoutSuccess.module.scss";

export default function CheckoutSuccess() {
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get("orderId");
    // MercadoPago Checkout Pro return params
    const mpStatus = searchParams.get("mp_status") || searchParams.get("collection_status") || searchParams.get("status");
    const mpPaymentId = searchParams.get("payment_id") || searchParams.get("collection_id");
    const isFailure = mpStatus === "failure" || mpStatus === "rejected";
    const isPending = mpStatus === "pending" || mpStatus === "in_process";
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(function loadOrder() {
        async function fetchOrder() {
            if (orderId) {
                try {
                    const orderData = await getOrderById(orderId);
                    setOrder(orderData);
                } catch (error) {
                    console.error("Erro ao carregar pedido:", error);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        }
        fetchOrder();
    }, [orderId]);

    useEffect(
        function trackPurchase() {
            if (!order || !order.id) {
                return;
            }
            trackEvent("purchase", {
                transaction_id: order.orderNumber || order.id,
                currency: "BRL",
                value: Number(order.total || 0),
                shipping: Number(order.shipping || 0),
                items: (order.items || []).map(function (item, index) {
                    return {
                        item_id: String(item.productCode || item.productId || ""),
                        item_name: item.productName || "",
                        item_variant: item.size || "",
                        index,
                        price: Number(item.unitPrice || 0),
                        quantity: Number(item.quantity || 1),
                    };
                }),
            });
        },
        [order]
    );

    if (loading) {
        return <div className={styles.loading}>Carregando...</div>;
    }

    if (!order) {
        return (
            <div className={styles.success}>
                <h1>Pedido Confirmado!</h1>
                <p>Seu pedido foi processado com sucesso.</p>
                <Link to="/account/orders" className={styles.link}>
                    Ver Meus Pedidos
                </Link>
            </div>
        );
    }

    const statusLabels = {
        pendente: "Pendente",
        pago: "Pago",
        enviado: "Enviado",
        entregue: "Entregue",
        cancelado: "Cancelado",
        pending: "Pendente",
        paid: "Pago",
        shipped: "Enviado",
        delivered: "Entregue",
        cancelled: "Cancelado",
        confirmed: "Pago",
    };

    if (isFailure) {
        return (
            <div className={styles.success}>
                <div className={styles.successIcon} style={{color: "var(--color-error, #e53e3e)"}}>✕</div>
                <h1 className={styles.title}>Pagamento não concluído</h1>
                <p className={styles.message}>
                    O pagamento não foi processado. Nenhuma cobrança foi realizada.
                    {order && ` Seu pedido ${order.orderNumber} está aguardando pagamento.`}
                </p>
                <div className={styles.actions}>
                    <Link to="/account/orders" className={styles.primaryButton}>
                        Ver Meus Pedidos
                    </Link>
                    <Link to="/cart" className={styles.secondaryButton}>
                        Voltar ao Carrinho
                    </Link>
                </div>
            </div>
        );
    }

    if (isPending) {
        return (
            <div className={styles.success}>
                <div className={styles.successIcon} style={{color: "var(--color-warning, #d69e2e)"}}>⏳</div>
                <h1 className={styles.title}>Pagamento em análise</h1>
                <p className={styles.message}>
                    Seu pagamento está sendo processado pelo Mercado Pago.
                    {order && ` Pedido ${order.orderNumber}.`}
                    {" "}Você receberá uma confirmação assim que for aprovado.
                    {mpPaymentId && <><br /><small>ID do pagamento: {mpPaymentId}</small></>}
                </p>
                <div className={styles.actions}>
                    <Link to="/account/orders" className={styles.primaryButton}>
                        Acompanhar Pedido
                    </Link>
                    <Link to="/products" className={styles.secondaryButton}>
                        Continuar Comprando
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.success}>
            <div className={styles.successIcon}>✓</div>
            <h1 className={styles.title}>Pedido Confirmado!</h1>
            <p className={styles.message}>
                Obrigado pela sua compra. Seu pedido foi recebido e está sendo processado.
            </p>

            <div className={styles.orderInfo}>
                <h2>Detalhes do Pedido</h2>
                <p className={styles.orderNumber}>
                    <strong>Número do Pedido:</strong> {order.orderNumber}
                </p>
                <p className={styles.orderStatus}>
                    <strong>Status:</strong>{" "}
                    <span className={styles.statusBadge}>
                        {statusLabels[order.status] || order.status}
                    </span>
                </p>
                <p className={styles.orderTotal}>
                    <strong>Total:</strong> R$ {formatPrice(order.total)}
                </p>
                {mpPaymentId && (
                    <p className={styles.orderNumber}>
                        <strong>ID do Pagamento:</strong> {mpPaymentId}
                    </p>
                )}
            </div>

            <div className={styles.actions}>
                <Link to="/account/orders" className={styles.primaryButton}>
                    Ver Meus Pedidos
                </Link>
                <Link to="/products" className={styles.secondaryButton}>
                    Continuar Comprando
                </Link>
            </div>
        </div>
    );
}
