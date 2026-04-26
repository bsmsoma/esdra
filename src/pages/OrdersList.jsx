import { useAuth } from "../contexts/AuthContext";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getOrdersByCustomer } from "../firebase";
import styles from "./OrdersList.module.scss";

export async function ordersLoader() {
    return null;
}

const STATUS_LABELS = {
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

const STATUS_STYLE = {
    pendente: styles.statusPendente,
    pago: styles.statusPago,
    enviado: styles.statusEnviado,
    entregue: styles.statusEntregue,
    cancelado: styles.statusCancelado,
    pending: styles.statusPendente,
    paid: styles.statusPago,
    shipped: styles.statusEnviado,
    delivered: styles.statusEntregue,
    cancelled: styles.statusCancelado,
    confirmed: styles.statusPago,
};

export default function OrdersList() {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(function loadOrders() {
        async function fetchOrders() {
            if (user) {
                try {
                    const ordersData = await getOrdersByCustomer(user.uid);
                    setOrders(ordersData || []);
                } catch (err) {
                    console.error("Erro ao carregar pedidos:", err);
                    setError("Não foi possível carregar seus pedidos. Tente novamente.");
                    setOrders([]);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        }
        fetchOrders();
    }, [user]);

    if (loading) {
        return <div className={styles.loading}>Carregando...</div>;
    }

    if (error) {
        return (
            <div className={styles.ordersList}>
                <h1 className={styles.title}>Meus Pedidos</h1>
                <div className={styles.errorState}>
                    <p>{error}</p>
                    <button
                        className={styles.retryButton}
                        onClick={function () {
                            setError(null);
                            setLoading(true);
                            getOrdersByCustomer(user.uid)
                                .then(function (data) { setOrders(data || []); })
                                .catch(function () { setError("Não foi possível carregar seus pedidos. Tente novamente."); })
                                .finally(function () { setLoading(false); });
                        }}
                    >
                        Tentar novamente
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.ordersList}>
            <h1 className={styles.title}>Meus Pedidos</h1>

            {orders.length === 0 ? (
                <div className={styles.emptyState}>
                    <p>Você ainda não possui pedidos.</p>
                    <Link to="/products" className={styles.shopLink}>
                        Ver Produtos
                    </Link>
                </div>
            ) : (
                <div className={styles.ordersGrid}>
                    {orders.map(function (order) {
                        return (
                            <Link
                                key={order.id}
                                to={`/account/orders/${order.id}`}
                                className={styles.orderCard}
                            >
                                <div className={styles.orderHeader}>
                                    <h3>Pedido #{order.orderNumber}</h3>
                                    <span className={`${styles.status} ${STATUS_STYLE[order.status] || ""}`}>
                                        {STATUS_LABELS[order.status] || order.status}
                                    </span>
                                </div>
                                <p className={styles.date}>
                                    {order.createdAt?.toDate
                                        ? new Date(order.createdAt.toDate()).toLocaleDateString("pt-BR")
                                        : "N/A"}
                                </p>
                                <p className={styles.total}>
                                    Total: R$ {order.total ? order.total.toFixed(2).replace(".", ",") : "0,00"}
                                </p>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
