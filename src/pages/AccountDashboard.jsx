import { useAuth } from "../contexts/AuthContext";
import { getCustomerByUid } from "../firebase";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import styles from "./AccountDashboard.module.scss";

export default function AccountDashboard() {
    const { user } = useAuth();
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(function loadCustomer() {
        async function fetchCustomer() {
            if (user) {
                try {
                    const customerData = await getCustomerByUid(user.uid);
                    setCustomer(customerData);
                } catch (error) {
                    console.error("Erro ao carregar dados do cliente:", error);
                } finally {
                    setLoading(false);
                }
            }
        }
        fetchCustomer();
    }, [user]);

    if (loading) {
        return <div className={styles.loading}>Carregando...</div>;
    }

    return (
        <div className={styles.dashboard}>
            <h1 className={styles.title}>Minha Conta</h1>
            
            <div className={styles.welcomeSection}>
                <h2>Bem-vindo, {customer?.firstName || "Cliente"}!</h2>
                <p>Gerencie suas informações e pedidos</p>
            </div>

            <div className={styles.menuGrid}>
                <Link to="/account/profile" className={styles.menuCard}>
                    <h3>Perfil</h3>
                    <p>Atualize suas informações pessoais</p>
                </Link>

                <Link to="/account/orders" className={styles.menuCard}>
                    <h3>Meus Pedidos</h3>
                    <p>Visualize e acompanhe seus pedidos</p>
                </Link>

                <Link to="/account/addresses" className={styles.menuCard}>
                    <h3>Endereços</h3>
                    <p>Gerencie seus endereços de entrega</p>
                </Link>
            </div>
        </div>
    );
}
