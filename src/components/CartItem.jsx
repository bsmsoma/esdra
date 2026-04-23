import { useCart } from "../contexts/CartContext";
import { formatPrice } from "../utils/priceUtils";
import { Link } from "react-router";
import styles from "./CartItem.module.scss";
import { toast } from "react-toastify";

export default function CartItem({ item }) {
    const { updateQuantity, removeFromCart } = useCart();

    function handleQuantityChange(e) {
        const newQuantity = parseInt(e.target.value, 10);
        if (!isNaN(newQuantity) && newQuantity > 0) {
            updateQuantity(item.productId, item.size, item.type, newQuantity).catch(function (
                error
            ) {
                toast.error(error.message || "Erro ao atualizar quantidade");
            });
        }
    }

    function handleRemove() {
        removeFromCart(item.productId, item.size, item.type)
            .then(function () {
                toast.success("Item removido do carrinho");
            })
            .catch(function (error) {
                console.error("Erro ao remover item:", error);
                toast.error("Erro ao remover item do carrinho");
            });
    }

    return (
        <div className={styles.cartItem}>
            <Link to={`/products/${item.productId}`} className={styles.imageLink}>
                <img src={item.productImage} alt={item.productName} className={styles.image} />
            </Link>

            <div className={styles.itemInfo}>
                <Link to={`/products/${item.productId}`} className={styles.productLink}>
                    <h3 className={styles.productName}>{item.productName}</h3>
                </Link>
                <p className={styles.productCode}>Código: {item.productCode}</p>
                <p className={styles.productDetails}>
                    Tamanho: {item.size} | Tipo: Compra
                </p>
            </div>

            <div className={styles.quantitySection}>
                <label htmlFor={`quantity-${item.productId}-${item.size}`} className={styles.quantityLabel}>
                    Quantidade:
                </label>
                <input
                    type="number"
                    id={`quantity-${item.productId}-${item.size}`}
                    min="1"
                    value={item.quantity}
                    onChange={handleQuantityChange}
                    className={styles.quantityInput}
                />
            </div>

            <div className={styles.priceSection}>
                <p className={styles.unitPrice}>R$ {formatPrice(item.price)}</p>
                <p className={styles.totalPrice}>
                    Total: R$ {formatPrice(item.price * item.quantity)}
                </p>
            </div>

            <button
                className={styles.removeButton}
                onClick={handleRemove}
                aria-label="Remover item do carrinho"
            >
                ×
            </button>
        </div>
    );
}
