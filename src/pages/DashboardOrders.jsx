import { useEffect, useMemo, useState } from "react";
import {
    getAllOrders,
    updateOrderStatusByAdmin,
} from "../firebase";
import { formatPrice } from "../utils/priceUtils";
import styles from "./DashboardOrders.module.scss";

const ORDER_STATUS_OPTIONS = [
    { value: "pendente", label: "Pendente" },
    { value: "pago", label: "Pago" },
    { value: "enviado", label: "Enviado" },
    { value: "entregue", label: "Entregue" },
    { value: "cancelado", label: "Cancelado" },
];

const PAYMENT_STATUS_OPTIONS = [
    { value: "", label: "Manter status atual" },
    { value: "pending", label: "Pendente" },
    { value: "paid", label: "Pago" },
    { value: "failed", label: "Falhou" },
    { value: "refunded", label: "Reembolsado" },
];

function getStatusLabel(status) {
    const labels = {
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
    return labels[status] || status || "-";
}

export default function DashboardOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingOrderId, setSavingOrderId] = useState("");
    const [feedbackMessage, setFeedbackMessage] = useState("");
    const [orderDrafts, setOrderDrafts] = useState({});

    useEffect(function loadAllOrders() {
        async function fetchOrders() {
            try {
                const ordersData = await getAllOrders();
                setOrders(ordersData || []);
            } catch (error) {
                console.error("Erro ao carregar pedidos do dashboard:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchOrders();
    }, []);

    const rows = useMemo(
        function mapRows() {
            return orders.map(function (order) {
                const draft = orderDrafts[order.id] || {};
                return {
                    ...order,
                    nextStatus: draft.nextStatus || order.status || "pendente",
                    paymentStatus: draft.paymentStatus || "",
                    adminNotes: draft.adminNotes || "",
                };
            });
        },
        [orderDrafts, orders]
    );

    async function handleSaveStatus(order) {
        setSavingOrderId(order.id);
        setFeedbackMessage("");
        try {
            await updateOrderStatusByAdmin({
                orderId: order.id,
                status: order.nextStatus,
                paymentStatus: order.paymentStatus,
                adminNotes: order.adminNotes,
            });

            setOrders(function updateOrders(previous) {
                return previous.map(function (currentOrder) {
                    if (currentOrder.id !== order.id) {
                        return currentOrder;
                    }
                    return {
                        ...currentOrder,
                        status: order.nextStatus,
                        paymentStatus:
                            order.paymentStatus || currentOrder.paymentStatus || "pending",
                        adminNotes: order.adminNotes || currentOrder.adminNotes || "",
                    };
                });
            });

            setOrderDrafts(function removeDraft(previous) {
                const next = { ...previous };
                delete next[order.id];
                return next;
            });

            setFeedbackMessage(`Pedido #${order.orderNumber} atualizado com sucesso.`);
        } catch (error) {
            setFeedbackMessage(
                error?.message || "Erro ao atualizar status do pedido."
            );
        } finally {
            setSavingOrderId("");
        }
    }

    function updateDraft(orderId, key, value) {
        setOrderDrafts(function updateCurrentDraft(previous) {
            return {
                ...previous,
                [orderId]: {
                    ...(previous[orderId] || {}),
                    [key]: value,
                },
            };
        });
    }

    if (loading) {
        return <div className={styles.loading}>Carregando pedidos...</div>;
    }

    return (
        <section className={styles.ordersAdmin}>
            <header className={styles.header}>
                <h1>Operação de Pedidos</h1>
                <p>
                    Atualize status sem acesso manual ao banco e mantenha o ciclo
                    operacional completo.
                </p>
            </header>

            {feedbackMessage && (
                <div className={styles.feedback} role="status">
                    {feedbackMessage}
                </div>
            )}

            {rows.length === 0 ? (
                <div className={styles.emptyState}>Nenhum pedido encontrado.</div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Pedido</th>
                                <th>Cliente</th>
                                <th>Total</th>
                                <th>Status atual</th>
                                <th>Novo status</th>
                                <th>Pagamento</th>
                                <th>Notas</th>
                                <th>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(function (order) {
                                return (
                                    <tr key={order.id}>
                                        <td>#{order.orderNumber}</td>
                                        <td>{order.customerName || "-"}</td>
                                        <td>R$ {formatPrice(order.total || 0)}</td>
                                        <td>{getStatusLabel(order.status)}</td>
                                        <td>
                                            <select
                                                value={order.nextStatus}
                                                onChange={function handleStatusChange(event) {
                                                    updateDraft(
                                                        order.id,
                                                        "nextStatus",
                                                        event.target.value
                                                    );
                                                }}
                                            >
                                                {ORDER_STATUS_OPTIONS.map(function (statusOption) {
                                                    return (
                                                        <option
                                                            key={statusOption.value}
                                                            value={statusOption.value}
                                                        >
                                                            {statusOption.label}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </td>
                                        <td>
                                            <select
                                                value={order.paymentStatus}
                                                onChange={function handlePaymentChange(event) {
                                                    updateDraft(
                                                        order.id,
                                                        "paymentStatus",
                                                        event.target.value
                                                    );
                                                }}
                                            >
                                                {PAYMENT_STATUS_OPTIONS.map(function (paymentOption) {
                                                    return (
                                                        <option
                                                            key={paymentOption.value || "keep"}
                                                            value={paymentOption.value}
                                                        >
                                                            {paymentOption.label}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={order.adminNotes}
                                                onChange={function handleNotesChange(event) {
                                                    updateDraft(
                                                        order.id,
                                                        "adminNotes",
                                                        event.target.value
                                                    );
                                                }}
                                                placeholder="Observação interna"
                                            />
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                onClick={function onSaveClick() {
                                                    handleSaveStatus(order);
                                                }}
                                                disabled={savingOrderId === order.id}
                                            >
                                                {savingOrderId === order.id
                                                    ? "Salvando..."
                                                    : "Salvar"}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
