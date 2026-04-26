import { useEffect, useMemo, useState, useCallback } from "react";
import {
    getAllOrdersPaginated,
    updateOrderStatusByAdmin,
} from "../firebase";
import { formatPrice } from "../utils/priceUtils";
import styles from "./DashboardOrders.module.scss";

const PAGE_SIZE = 20;

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

const STATUS_FILTER_OPTIONS = [
    { value: "", label: "Todos" },
    { value: "pendente", label: "Pendente" },
    { value: "pago", label: "Pago" },
    { value: "enviado", label: "Enviado" },
    { value: "entregue", label: "Entregue" },
    { value: "cancelado", label: "Cancelado" },
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
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [statusFilter, setStatusFilter] = useState("");
    const [savingOrderId, setSavingOrderId] = useState("");
    const [feedbackMessage, setFeedbackMessage] = useState("");
    const [feedbackType, setFeedbackType] = useState("success");
    const [orderDrafts, setOrderDrafts] = useState({});

    const fetchOrders = useCallback(async function ({ append = false, currentLastDoc = null } = {}) {
        try {
            const result = await getAllOrdersPaginated({ pageSize: PAGE_SIZE, lastDoc: currentLastDoc });
            setOrders(function (prev) { return append ? [...prev, ...result.orders] : result.orders; });
            setLastDoc(result.lastDoc);
            setHasMore(result.hasMore);
            setError(null);
        } catch (err) {
            console.error("Erro ao carregar pedidos do dashboard:", err);
            setError("Não foi possível carregar os pedidos. Tente novamente.");
        }
    }, []);

    useEffect(function initialLoad() {
        setLoading(true);
        fetchOrders().finally(function () { setLoading(false); });
    }, [fetchOrders]);

    async function handleLoadMore() {
        setLoadingMore(true);
        await fetchOrders({ append: true, currentLastDoc: lastDoc });
        setLoadingMore(false);
    }

    const filteredRows = useMemo(
        function applyFilter() {
            const filtered = statusFilter
                ? orders.filter(function (o) { return o.status === statusFilter; })
                : orders;
            return filtered.map(function (order) {
                const draft = orderDrafts[order.id] || {};
                return {
                    ...order,
                    nextStatus: draft.nextStatus || order.status || "pendente",
                    paymentStatus: draft.paymentStatus || "",
                    adminNotes: draft.adminNotes || "",
                };
            });
        },
        [orderDrafts, orders, statusFilter]
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
                    if (currentOrder.id !== order.id) return currentOrder;
                    return {
                        ...currentOrder,
                        status: order.nextStatus,
                        paymentStatus: order.paymentStatus || currentOrder.paymentStatus || "pending",
                        adminNotes: order.adminNotes || currentOrder.adminNotes || "",
                    };
                });
            });

            setOrderDrafts(function removeDraft(previous) {
                const next = { ...previous };
                delete next[order.id];
                return next;
            });

            setFeedbackType("success");
            setFeedbackMessage(`Pedido #${order.orderNumber} atualizado com sucesso.`);
        } catch (err) {
            setFeedbackType("error");
            setFeedbackMessage(err?.message || "Erro ao atualizar status do pedido.");
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

            {error && (
                <div className={`${styles.feedback} ${styles.feedbackError}`} role="alert">
                    {error}
                    <button
                        className={styles.retryButton}
                        onClick={function () {
                            setError(null);
                            setLoading(true);
                            fetchOrders().finally(function () { setLoading(false); });
                        }}
                    >
                        Tentar novamente
                    </button>
                </div>
            )}

            {feedbackMessage && (
                <div
                    className={`${styles.feedback} ${feedbackType === "error" ? styles.feedbackError : styles.feedbackSuccess}`}
                    role="status"
                >
                    {feedbackMessage}
                </div>
            )}

            <div className={styles.filters}>
                <label className={styles.filterLabel} htmlFor="statusFilter">
                    Filtrar por status:
                </label>
                <select
                    id="statusFilter"
                    className={styles.filterSelect}
                    value={statusFilter}
                    onChange={function (e) { setStatusFilter(e.target.value); }}
                >
                    {STATUS_FILTER_OPTIONS.map(function (opt) {
                        return (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        );
                    })}
                </select>
                <span className={styles.filterCount}>
                    {filteredRows.length} pedido{filteredRows.length !== 1 ? "s" : ""}
                    {statusFilter ? ` com status "${getStatusLabel(statusFilter)}"` : " carregados"}
                </span>
            </div>

            {filteredRows.length === 0 ? (
                <div className={styles.emptyState}>Nenhum pedido encontrado.</div>
            ) : (
                <>
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
                                {filteredRows.map(function (order) {
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
                                                        updateDraft(order.id, "nextStatus", event.target.value);
                                                    }}
                                                >
                                                    {ORDER_STATUS_OPTIONS.map(function (statusOption) {
                                                        return (
                                                            <option key={statusOption.value} value={statusOption.value}>
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
                                                        updateDraft(order.id, "paymentStatus", event.target.value);
                                                    }}
                                                >
                                                    {PAYMENT_STATUS_OPTIONS.map(function (paymentOption) {
                                                        return (
                                                            <option key={paymentOption.value || "keep"} value={paymentOption.value}>
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
                                                        updateDraft(order.id, "adminNotes", event.target.value);
                                                    }}
                                                    placeholder="Observação interna"
                                                />
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    onClick={function onSaveClick() { handleSaveStatus(order); }}
                                                    disabled={savingOrderId === order.id}
                                                >
                                                    {savingOrderId === order.id ? "Salvando..." : "Salvar"}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {hasMore && (
                        <div className={styles.pagination}>
                            <button
                                className={styles.loadMoreButton}
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                            >
                                {loadingMore ? "Carregando..." : "Carregar mais pedidos"}
                            </button>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}
