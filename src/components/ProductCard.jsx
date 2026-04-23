import styles from "./ProductCard.module.scss";
import { Link } from "react-router";
import PropTypes from "prop-types";
import { formatPrice } from "../utils/priceUtils";

function toCurrencyLabel(value) {
    if (value == null || Number.isNaN(Number(value))) {
        return "";
    }
    return `R$ ${formatPrice(Number(value))}`;
}

export function ProductCard({
    productId,
    productLink,
    imageSrc,
    imageAlt,
    badge,
    name,
    description,
    price,
    installment,
    onAddToCart,
}) {
    const cardLink = productLink || (productId ? `${productId}` : null);
    const fallbackAlt = imageAlt || name || "Produto";
    const displayPrice = toCurrencyLabel(price);

    return (
        <article className={styles.productCard}>
            {cardLink ? (
                <Link to={cardLink} className={styles.productCardMedia}>
                    <img src={imageSrc} alt={fallbackAlt} loading="lazy" decoding="async" />
                </Link>
            ) : (
                <figure className={styles.productCardMedia}>
                    <img src={imageSrc} alt={fallbackAlt} loading="lazy" decoding="async" />
                </figure>
            )}

            {badge ? <span className={styles.productCardBadge}>{badge}</span> : null}

            <h3 className={styles.productCardTitle}>{name}</h3>
            <p className={styles.productCardDescription}>{description}</p>

            <div className={styles.productCardFooter}>
                <div className={styles.productCardPriceBlock}>
                    <strong className={styles.productCardPrice}>{displayPrice}</strong>
                    {installment ? (
                        <span className={styles.productCardInstallment}>{installment}</span>
                    ) : null}
                </div>
            </div>

            <button
                type="button"
                className={styles.productCardButton}
                onClick={onAddToCart}
            >
                Adicionar ao carrinho
            </button>
        </article>
    );
}

ProductCard.propTypes = {
    productId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    productLink: PropTypes.string,
    imageSrc: PropTypes.string,
    imageAlt: PropTypes.string,
    badge: PropTypes.string,
    name: PropTypes.string,
    description: PropTypes.string,
    price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    installment: PropTypes.string,
    onAddToCart: PropTypes.func,
};

export default ProductCard;
