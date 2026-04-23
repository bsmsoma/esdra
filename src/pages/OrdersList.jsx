import { useAuth } from "../contexts/AuthContext";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getOrdersByCustomer } from "../firebase";
import styles from "./OrdersList.module.scss";

export async function ordersLoader() {
    // Get user from auth - this will be handled by the parent route loader
    return null;
}

export default function OrdersList() {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(function loadOrders() {
        async function fetchOrders() {
            if (user) {
                try {
                    const ordersData = await getOrdersByCustomer(user.uid);
                    setOrders(ordersData || []);
                } catch (error) {
                    console.error("Erro ao carregar pedidos:", error);
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
                                    <span className={styles.status}>
                                        {statusLabels[order.status] || order.status}
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
