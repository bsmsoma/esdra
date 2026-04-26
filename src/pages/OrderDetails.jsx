import { useParams, Link } from "react-router";
import { getOrderById, cancelOrderByCustomer } from "../firebase";
import { useEffect, useState } from "react";
import { formatPrice } from "../utils/priceUtils";
import styles from "./OrderDetails.module.scss";

export async function orderDetailsLoader({ params }) {
    const orderId = params.orderId;
    if (!orderId) {
        throw new Error("ID do pedido não encontrado");
    }

    try {
        const order = await getOrderById(orderId);
        if (!order) {
            throw new Error("Pedido não encontrado");
        }
        return { order };
    } catch (error) {
        console.error("Erro ao carregar pedido:", error);
        throw error;
    }
}

const STATUS_LABELS = {
    pendente: "Aguardando Pagamento",
    pago: "Pago",
    enviado: "Enviado",
    entregue: "Entregue",
    cancelado: "Cancelado",
    pending: "Aguardando Pagamento",
    confirmed: "Confirmado",
    preparing: "Preparando",
    shipped: "Enviado",
    delivered: "Entregue",
    cancelled: "Cancelado",
};

const STATUS_BADGE_STYLE = {
    pendente: styles.statusPendente,
    pago: styles.statusPago,
    enviado: styles.statusEnviado,
    entregue: styles.statusEntregue,
    cancelado: styles.statusCancelado,
};

export default function OrderDetails() {
    const { orderId } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [cancelling, setCancelling] = useState(false);
    const [cancelError, setCancelError] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(function loadOrder() {
        async function fetchOrder() {
            try {
                const orderData = await getOrderById(orderId);
                setOrder(orderData);
            } catch (error) {
                console.error("Erro ao carregar pedido:", error);
                setLoadError("Não foi possível carregar os detalhes do pedido.");
            } finally {
                setLoading(false);
            }
        }
        fetchOrder();
    }, [orderId]);

    async function handleCancel() {
        setCancelling(true);
        setCancelError(null);
        try {
            await cancelOrderByCustomer({ orderId });
            setOrder(function (prev) { return { ...prev, status: "cancelado" }; });
            setShowConfirm(false);
        } catch (err) {
            setCancelError(err?.message || "Não foi possível cancelar o pedido. Tente novamente.");
        } finally {
            setCancelling(false);
        }
    }

    if (loading) {
        return <div className={styles.loading}>Carregando...</div>;
    }

    if (loadError || !order) {
        return (
            <div className={styles.error}>
                <p>{loadError || "Pedido não encontrado"}</p>
                <Link to="/account/orders">Voltar para Meus Pedidos</Link>
            </div>
        );
    }

    const canCancel = order.status === "pendente";

    return (
        <div className={styles.orderDetails}>
            <Link to="/account/orders" className={styles.backLink}>
                ← Voltar para Meus Pedidos
            </Link>

            <h1 className={styles.title}>Detalhes do Pedido</h1>

            <div className={styles.orderHeader}>
                <div className={styles.orderInfo}>
                    <p className={styles.orderNumber}>
                        <strong>Número do Pedido:</strong> {order.orderNumber}
                    </p>
                    <p className={styles.orderDate}>
                        <strong>Data:</strong>{" "}
                        {order.createdAt?.toDate
                            ? new Date(order.createdAt.toDate()).toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                              })
                            : "N/A"}
                    </p>
                    <p className={styles.orderStatus}>
                        <strong>Status:</strong>{" "}
                        <span className={`${styles.statusBadge} ${STATUS_BADGE_STYLE[order.status] || ""}`}>
                            {STATUS_LABELS[order.status] || order.status}
                        </span>
                    </p>
                </div>

                {canCancel && (
                    <div className={styles.cancelArea}>
                        {!showConfirm ? (
                            <button
                                className={styles.cancelButton}
                                onClick={function () { setShowConfirm(true); setCancelError(null); }}
                            >
                                Cancelar pedido
                            </button>
                        ) : (
                            <div className={styles.confirmBox}>
                                <p className={styles.confirmText}>
                                    Tem certeza que deseja cancelar este pedido?
                                </p>
                                <div className={styles.confirmActions}>
                                    <button
                                        className={styles.confirmYes}
                                        onClick={handleCancel}
                                        disabled={cancelling}
                                    >
                                        {cancelling ? "Cancelando..." : "Sim, cancelar"}
                                    </button>
                                    <button
                                        className={styles.confirmNo}
                                        onClick={function () { setShowConfirm(false); setCancelError(null); }}
                                        disabled={cancelling}
                                    >
                                        Voltar
                                    </button>
                                </div>
                                {cancelError && (
                                    <p className={styles.cancelError}>{cancelError}</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Itens do Pedido</h2>
                <div className={styles.itemsList}>
                    {order.items?.map(function (item, index) {
                        return (
                            <div key={index} className={styles.orderItem}>
                                {item.productImage ? (
                                    <img
                                        src={item.productImage}
                                        alt={item.productName}
                                        className={styles.itemImage}
                                    />
                                ) : (
                                    <div className={styles.itemImage} aria-hidden="true"></div>
                                )}
                                <div className={styles.itemInfo}>
                                    <h3 className={styles.itemName}>{item.productName}</h3>
                                    <p className={styles.itemCode}>Código: {item.productCode}</p>
                                    {item.sku && (
                                        <p className={styles.itemCode}>SKU: {item.sku}</p>
                                    )}
                                    <p className={styles.itemDetails}>
                                        Tamanho: {item.size} | Compra | Qtd: {item.quantity}
                                    </p>
                                </div>
                                <div className={styles.itemPrice}>
                                    <p>R$ {formatPrice(item.unitPrice)}</p>
                                    <p className={styles.itemTotal}>
                                        Total: R$ {formatPrice(item.totalPrice || item.unitPrice * item.quantity)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Endereço de Entrega</h2>
                {order.shippingAddress ? (
                    <div className={styles.address}>
                        <p>
                            {order.shippingAddress.street}, {order.shippingAddress.number}
                            {order.shippingAddress.complement &&
                                ` - ${order.shippingAddress.complement}`}
                        </p>
                        <p>
                            {order.shippingAddress.neighborhood}, {order.shippingAddress.city} -{" "}
                            {order.shippingAddress.state}
                        </p>
                        <p>CEP: {order.shippingAddress.zipCode}</p>
                    </div>
                ) : (
                    <p>Endereço não disponível</p>
                )}
            </div>

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Resumo Financeiro</h2>
                <div className={styles.summary}>
                    <div className={styles.summaryRow}>
                        <span>Subtotal:</span>
                        <span>R$ {formatPrice(order.subtotal || 0)}</span>
                    </div>
                    {order.shipping > 0 && (
                        <div className={styles.summaryRow}>
                            <span>Frete:</span>
                            <span>R$ {formatPrice(order.shipping)}</span>
                        </div>
                    )}
                    {order.discount > 0 && (
                        <div className={styles.summaryRow}>
                            <span>Desconto:</span>
                            <span>- R$ {formatPrice(order.discount)}</span>
                        </div>
                    )}
                    <div className={styles.summaryDivider}></div>
                    <div className={styles.summaryRowTotal}>
                        <span>Total:</span>
                        <span>R$ {formatPrice(order.total || 0)}</span>
                    </div>
                </div>
            </div>

            {order.notes && (
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Observações</h2>
                    <p className={styles.notes}>{order.notes}</p>
                </div>
            )}
        </div>
    );
}
