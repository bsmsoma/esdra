import { useCart } from "../contexts/CartContext";
import { Link, useNavigate } from "react-router";
import { formatPrice } from "../utils/priceUtils";
import CartItem from "../components/CartItem";
import styles from "./Cart.module.scss";

export default function Cart() {
    const { cartItems, total, loading } = useCart();
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className={styles.cart}>
                <div className={styles.loading}>Carregando carrinho...</div>
            </div>
        );
    }

    if (cartItems.length === 0) {
        return (
            <div className={styles.cart}>
                <h1 className={styles.title}>Carrinho de Compras</h1>
                <div className={styles.emptyState}>
                    <p>Seu carrinho está vazio</p>
                    <Link to="/products" className={styles.shopLink}>
                        Continuar Comprando
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.cart}>
            <h1 className={styles.title}>Carrinho de Compras</h1>

            <div className={styles.cartContainer}>
                <div className={styles.itemsSection}>
                    {cartItems.map(function (item, index) {
                        return (
                            <CartItem
                                key={`${item.productId}-${item.size}-${item.type}-${index}`}
                                item={item}
                            />
                        );
                    })}
                </div>

                <div className={styles.summarySection}>
                    <div className={styles.summaryCard}>
                        <h2 className={styles.summaryTitle}>Resumo do Pedido</h2>
                        <div className={styles.summaryRow}>
                            <span>Subtotal:</span>
                            <span>R$ {formatPrice(total)}</span>
                        </div>
                        <div className={styles.summaryRow}>
                            <span>Frete:</span>
                            <span>Calculado no checkout</span>
                        </div>
                        <div className={styles.summaryDivider}></div>
                        <div className={styles.summaryRowTotal}>
                            <span>Total:</span>
                            <span>R$ {formatPrice(total)}</span>
                        </div>
                        <button
                            className={styles.checkoutButton}
                            onClick={function () {
                                navigate("/checkout");
                            }}
                        >
                            Finalizar Compra
                        </button>
                        <Link to="/products" className={styles.continueShopping}>
                            Continuar Comprando
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
