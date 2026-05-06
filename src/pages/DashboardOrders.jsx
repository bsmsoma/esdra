import { Fragment, useEffect, useMemo, useState, useCallback } from "react";
import {
    getAllOrdersPaginated,
    updateOrderStatusByAdmin,
    normalizeString,
} from "../firebase";
import { formatPrice } from "../utils/priceUtils";
import styles from "./DashboardOrders.module.scss";

function formatDate(ts) {
    if (!ts) return "-";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatAddress(addr) {
    if (!addr) return "-";
    const parts = [
        addr.street && addr.number ? `${addr.street}, ${addr.number}` : addr.street,
        addr.complement,
        addr.neighborhood,
        addr.city && addr.state ? `${addr.city} – ${addr.state}` : addr.city,
        addr.zipCode,
    ].filter(Boolean);
    return parts.join(", ") || "-";
}

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
    const [searchQuery, setSearchQuery] = useState("");
    const [savingOrderId, setSavingOrderId] = useState("");
    const [feedbackMessage, setFeedbackMessage] = useState("");
    const [feedbackType, setFeedbackType] = useState("success");
    const [orderDrafts, setOrderDrafts] = useState({});
    const [expandedOrderId, setExpandedOrderId] = useState(null);
    const [printingOrder, setPrintingOrder] = useState(null);

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
            const query = normalizeString(searchQuery);
            const filtered = orders.filter(function (o) {
                if (statusFilter && o.status !== statusFilter) return false;
                if (query) {
                    const haystack = normalizeString(
                        [o.orderNumber, o.customerName, o.customerEmail].filter(Boolean).join(" ")
                    );
                    if (!haystack.includes(query)) return false;
                }
                return true;
            });
            return filtered.map(function (order) {
                const draft = orderDrafts[order.id] || {};
                return {
                    ...order,
                    rawPaymentStatus: order.paymentStatus,
                    nextStatus: draft.nextStatus || order.status || "pendente",
                    paymentStatus: draft.paymentStatus || "",
                    adminNotes: draft.adminNotes || "",
                    trackingCode: draft.trackingCode !== undefined ? draft.trackingCode : (order.trackingCode || ""),
                };
            });
        },
        [orderDrafts, orders, statusFilter, searchQuery]
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
                trackingCode: order.trackingCode,
            });

            setOrders(function updateOrders(previous) {
                return previous.map(function (currentOrder) {
                    if (currentOrder.id !== order.id) return currentOrder;
                    return {
                        ...currentOrder,
                        status: order.nextStatus,
                        paymentStatus: order.paymentStatus || currentOrder.paymentStatus || "pending",
                        adminNotes: order.adminNotes || currentOrder.adminNotes || "",
                        trackingCode: order.trackingCode || currentOrder.trackingCode || "",
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

    function toggleExpand(orderId) {
        setExpandedOrderId(function (prev) { return prev === orderId ? null : orderId; });
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

    function handlePrint(orderId) {
        const target = orders.find(function (o) { return o.id === orderId; });
        if (!target) return;
        setPrintingOrder(target);
        requestAnimationFrame(function () {
            window.print();
            window.addEventListener("afterprint", function () { setPrintingOrder(null); }, { once: true });
        });
    }

    if (loading) {
        return <div className={styles.loading}>Carregando pedidos...</div>;
    }

    return (
        <section className={styles.ordersAdmin}>
            <div className={styles.header}>
                <h1>Operação de Pedidos</h1>
                <p>
                    Atualize status sem acesso manual ao banco e mantenha o ciclo
                    operacional completo.
                </p>
            </div>

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
                <input
                    type="search"
                    className={styles.searchInput}
                    placeholder="Buscar por nº, cliente ou email…"
                    value={searchQuery}
                    onChange={function (e) { setSearchQuery(e.target.value); }}
                    aria-label="Buscar pedidos"
                />
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
                                    <th></th>
                                    <th>Pedido</th>
                                    <th>Cliente</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th>Pgto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.map(function (order) {
                                    const isExpanded = expandedOrderId === order.id;
                                    return (
                                        <Fragment key={order.id}>
                                            <tr>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className={`${styles.expandButton} ${isExpanded ? styles.expanded : ""}`}
                                                        onClick={function () { toggleExpand(order.id); }}
                                                        title="Ver detalhes do pedido"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                                                            <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    </button>
                                                </td>
                                                <td>#{order.orderNumber}</td>
                                                <td>{order.customerName || "-"}</td>
                                                <td>R$ {formatPrice(order.total || 0)}</td>
                                                <td>{getStatusLabel(order.status)}</td>
                                                <td>{getStatusLabel(order.rawPaymentStatus) || "-"}</td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className={styles.orderDetailRow}>
                                                    <td colSpan={6}>
                                                        <div className={styles.orderDetailPanel}>
                                                            <div className={styles.detailSection}>
                                                                <h4>Dados do comprador</h4>
                                                                <div className={styles.detailField}>
                                                                    <span className={styles.fieldLabel}>Nome</span>
                                                                    <span className={styles.fieldValue}>{order.customerName || "-"}</span>
                                                                </div>
                                                                <div className={styles.detailField}>
                                                                    <span className={styles.fieldLabel}>Email</span>
                                                                    <span className={styles.fieldValue}>{order.customerEmail || "-"}</span>
                                                                </div>
                                                                <div className={styles.detailField}>
                                                                    <span className={styles.fieldLabel}>Fone</span>
                                                                    <span className={styles.fieldValue}>{order.customerPhone || "-"}</span>
                                                                </div>
                                                                {order.customerDocument && (
                                                                    <div className={styles.detailField}>
                                                                        <span className={styles.fieldLabel}>CPF</span>
                                                                        <span className={styles.fieldValue}>{order.customerDocument}</span>
                                                                    </div>
                                                                )}
                                                                <div className={styles.detailField}>
                                                                    <span className={styles.fieldLabel}>Pedido em</span>
                                                                    <span className={styles.fieldValue}>{formatDate(order.createdAt)}</span>
                                                                </div>
                                                            </div>

                                                            <div className={styles.detailSection}>
                                                                <h4>Endereço de entrega</h4>
                                                                <p className={styles.addressText}>{formatAddress(order.shippingAddress)}</p>
                                                            </div>

                                                            <div className={styles.detailSection}>
                                                                <h4>Resumo financeiro</h4>
                                                                <div className={styles.financialSummary}>
                                                                    {order.subtotal !== undefined && (
                                                                        <div className={styles.summaryRow}>
                                                                            <span>Subtotal</span>
                                                                            <span>R$ {formatPrice(order.subtotal)}</span>
                                                                        </div>
                                                                    )}
                                                                    {order.shipping !== undefined && (
                                                                        <div className={styles.summaryRow}>
                                                                            <span>Frete</span>
                                                                            <span>R$ {formatPrice(order.shipping)}</span>
                                                                        </div>
                                                                    )}
                                                                    <div className={styles.summaryTotal}>
                                                                        <span>Total</span>
                                                                        <span>R$ {formatPrice(order.total || 0)}</span>
                                                                    </div>
                                                                    {order.paymentMethod && (
                                                                        <div className={`${styles.summaryRow} ${styles.paymentMethodRow}`}>
                                                                            <span>Pagamento</span>
                                                                            <span>{order.paymentMethod}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {order.notes && (
                                                                <div className={styles.detailSection}>
                                                                    <h4>Observações do comprador</h4>
                                                                    <p className={styles.notesText}>"{order.notes}"</p>
                                                                </div>
                                                            )}

                                                            {Array.isArray(order.items) && order.items.length > 0 && (
                                                                <div className={`${styles.detailSection} ${styles.fullWidth}`}>
                                                                    <h4>Itens do pedido</h4>
                                                                    <div className={styles.itemsList}>
                                                                        {order.items.map(function (item, idx) {
                                                                            const imgSrc = item.imageUrl || item.image || null;
                                                                            const itemSubtotal = (item.price || 0) * (item.quantity || 1);
                                                                            return (
                                                                                <div key={idx} className={styles.itemRow}>
                                                                                    {imgSrc ? (
                                                                                        <img src={imgSrc} alt={item.name} className={styles.itemImage} />
                                                                                    ) : (
                                                                                        <div className={styles.itemImagePlaceholder} />
                                                                                    )}
                                                                                    <div className={styles.itemDetails}>
                                                                                        <div className={styles.itemName}>{item.name}</div>
                                                                                        <div className={styles.itemMeta}>
                                                                                            {item.size ? `${item.size} · ` : ""}
                                                                                            {item.quantity}× · R$ {formatPrice(item.price || 0)} cada
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className={styles.itemPrice}>
                                                                                        R$ {formatPrice(itemSubtotal)}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className={styles.detailSection}>
                                                                <h4>Gerenciar pedido</h4>
                                                                <div className={styles.orderActions}>
                                                                    <div>
                                                                        <label htmlFor={`status-${order.id}`}>Status do pedido</label>
                                                                        <select
                                                                            id={`status-${order.id}`}
                                                                            value={order.nextStatus}
                                                                            onChange={function (e) { updateDraft(order.id, "nextStatus", e.target.value); }}
                                                                        >
                                                                            {ORDER_STATUS_OPTIONS.map(function (opt) {
                                                                                return (
                                                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                                );
                                                                            })}
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <label htmlFor={`payment-${order.id}`}>Status de pagamento</label>
                                                                        <select
                                                                            id={`payment-${order.id}`}
                                                                            value={order.paymentStatus}
                                                                            onChange={function (e) { updateDraft(order.id, "paymentStatus", e.target.value); }}
                                                                        >
                                                                            {PAYMENT_STATUS_OPTIONS.map(function (opt) {
                                                                                return (
                                                                                    <option key={opt.value || "keep"} value={opt.value}>{opt.label}</option>
                                                                                );
                                                                            })}
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <label htmlFor={`notes-${order.id}`}>Notas internas</label>
                                                                        <input
                                                                            id={`notes-${order.id}`}
                                                                            type="text"
                                                                            value={order.adminNotes}
                                                                            onChange={function (e) { updateDraft(order.id, "adminNotes", e.target.value); }}
                                                                            placeholder="Observação interna do admin"
                                                                        />
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={function () { handleSaveStatus(order); }}
                                                                        disabled={savingOrderId === order.id}
                                                                    >
                                                                        {savingOrderId === order.id ? "Salvando..." : "Salvar"}
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className={styles.detailSection}>
                                                                <h4>Código de rastreio</h4>
                                                                <input
                                                                    type="text"
                                                                    className={styles.trackingInput}
                                                                    value={order.trackingCode}
                                                                    onChange={function (e) { updateDraft(order.id, "trackingCode", e.target.value); }}
                                                                    placeholder="Ex: BR123456789BR"
                                                                    spellCheck={false}
                                                                />
                                                                <p className={styles.trackingHint}>Salve para atualizar o cliente.</p>
                                                            </div>

                                                            <div className={`${styles.detailSection} ${styles.fullWidth} ${styles.printActions}`}>
                                                                <button
                                                                    type="button"
                                                                    className={styles.printButton}
                                                                    onClick={function () { handlePrint(order.id); }}
                                                                >
                                                                    Imprimir pedido
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
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
            <div className={styles.printSlip} aria-hidden="true">
                {printingOrder && (
                    <>
                        <div className={styles.printHeader}>
                            <span className={styles.printBrand}>ESDRA Aromas</span>
                            <span className={styles.printOrderNumber}>#{printingOrder.orderNumber}</span>
                            <span className={styles.printDate}>Impresso em {new Date().toLocaleString("pt-BR")}</span>
                        </div>

                        <section className={styles.printSection}>
                            <h3>Dados do comprador</h3>
                            <p>{printingOrder.customerName || "-"}</p>
                            <p>{printingOrder.customerEmail || "-"}</p>
                            <p>{printingOrder.customerPhone || "-"}</p>
                            {printingOrder.customerDocument && <p>CPF: {printingOrder.customerDocument}</p>}
                            <p>Pedido em: {formatDate(printingOrder.createdAt)}</p>
                        </section>

                        <section className={styles.printSection}>
                            <h3>Endereço de entrega</h3>
                            <p>{formatAddress(printingOrder.shippingAddress)}</p>
                        </section>

                        {Array.isArray(printingOrder.items) && printingOrder.items.length > 0 && (
                            <section className={styles.printSection}>
                                <h3>Itens do pedido</h3>
                                <table className={styles.printTable}>
                                    <thead>
                                        <tr>
                                            <th>Produto</th>
                                            <th>Tam.</th>
                                            <th>Qtd.</th>
                                            <th>Unitário</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {printingOrder.items.map(function (item, i) {
                                            const unitPrice = item.price || item.unitPrice || 0;
                                            const qty = item.quantity || 1;
                                            const lineTotal = item.lineTotal || unitPrice * qty;
                                            return (
                                                <tr key={i}>
                                                    <td>{item.name || item.productName || "-"}</td>
                                                    <td>{item.size || "-"}</td>
                                                    <td>{qty}</td>
                                                    <td>R$ {formatPrice(unitPrice)}</td>
                                                    <td>R$ {formatPrice(lineTotal)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </section>
                        )}

                        <section className={styles.printSection}>
                            <h3>Resumo financeiro</h3>
                            {printingOrder.subtotal != null && <p>Subtotal: R$ {formatPrice(printingOrder.subtotal)}</p>}
                            {printingOrder.shipping != null && <p>Frete: R$ {formatPrice(printingOrder.shipping)}</p>}
                            <p><strong>Total: R$ {formatPrice(printingOrder.total || 0)}</strong></p>
                            {printingOrder.paymentMethod && <p>Pagamento: {printingOrder.paymentMethod}</p>}
                            <p>Status: {getStatusLabel(printingOrder.status)}</p>
                        </section>

                        {printingOrder.notes && (
                            <section className={styles.printSection}>
                                <h3>Observações do comprador</h3>
                                <p>{printingOrder.notes}</p>
                            </section>
                        )}

                        {printingOrder.adminNotes && (
                            <section className={styles.printSection}>
                                <h3>Notas internas</h3>
                                <p>{printingOrder.adminNotes}</p>
                            </section>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}
