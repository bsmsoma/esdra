import React from "react";
import { useNavigate, useSearchParams } from "react-router";
import ProductCard from "./ProductCard";
import styles from "./ProductsCardsLayout.module.scss";
import { useProducts } from "../pages/ProductsLayout";
import { useCart } from "../contexts/CartContext";
import { getAvailableQuantity } from "../firebase";
import { toast } from "react-toastify";

export default function ProductsCardsLayout() {
    const context = useProducts();
    const { products = [], totalPages = 1, currentPage = 1, totalProducts = 0, searchQuery = null, category = null, collection = null, collectionDisplayName = null } = context || {};
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();

    // Parâmetros que não são considerados filtros aplicados
    const nonFilterParams = ["category", "page"];

    const filterParamKeys = React.useMemo(() => {
        return Array.from(searchParams.keys()).filter((param) => !nonFilterParams.includes(param));
    }, [searchParams]);

    const hasFiltersApplied = filterParamKeys.length > 0;

    function formatList(items) {
        if (items.length === 0) {
            return "";
        }
        if (items.length === 1) {
            return items[0];
        }
        const initial = items.slice(0, -1).join(", ");
        const last = items[items.length - 1];
        return `${initial} e ${last}`;
    }

    const appliedFilters = React.useMemo(() => {
        if (!hasFiltersApplied) {
            return [];
        }

        const filters = [];

        const categoryParam = searchParams.get("category") || category;
        if (categoryParam) {
            filters.push(categoryParam);
        }

        const sizeParam = searchParams.get("size");
        if (sizeParam) {
            const sizes = sizeParam
                .split(",")
                .map((size) => size.trim())
                .filter(Boolean);
            if (sizes.length > 0) {
                const labelPrefix = sizes.length > 1 ? "Tamanhos" : "Tamanho";
                filters.push(`${labelPrefix}: ${formatList(sizes)}`);
            }
        }

        const colorParam = searchParams.get("color");
        if (colorParam) {
            const colors = colorParam
                .split(",")
                .map((color) => color.trim())
                .filter(Boolean)
                .map((color) => color.charAt(0).toUpperCase() + color.slice(1));
            if (colors.length > 0) {
                const labelPrefix = colors.length > 1 ? "Cores" : "Cor";
                filters.push(`${labelPrefix}: ${formatList(colors)}`);
            }
        }

        const minPrice = searchParams.get("minPrice");
        const maxPrice = searchParams.get("maxPrice");
        if (minPrice || maxPrice) {
            const formatCurrency = (value) =>
                Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
            if (minPrice && maxPrice) {
                filters.push(`Faixa base: ${formatCurrency(minPrice)} a ${formatCurrency(maxPrice)}`);
            } else if (minPrice) {
                filters.push(`Faixa base a partir de ${formatCurrency(minPrice)}`);
            } else if (maxPrice) {
                filters.push(`Faixa base até ${formatCurrency(maxPrice)}`);
            }
        }

        return filters;
    }, [hasFiltersApplied, searchParams, category]);

    const handlePageChange = (newPage) => {
        setSearchParams((prev) => {
            prev.set("page", newPage);
            return prev;
        });
    };

    function formatProductsMessage(count) {
        if (count === 0) {
            return "Nenhum resultado encontrado";
        }
        const produto = count === 1 ? "produto" : "produtos";
        const encontrado = count === 1 ? "encontrado" : "encontrados";
        return `${count} ${produto} ${encontrado}`;
    }

    // TODO: a function to handle the filter of the products cards.
    // TODO: a function to handle the sort of the products cards.

    const productsCards = products.map((product) => {
        const coverImageIndex = product.coverIndex || 0;
        const imageSrc =
            product.images && product.images[coverImageIndex]
                ? product.images[coverImageIndex]
                : product.images && product.images[0]
                ? product.images[0]
                : "";

        const productPrice = product.sellValue ?? product.rentValue ?? null;
        const categoryBadge = product.category || "Aromas";
        const shortDescription =
            product.productDetail ||
            product.description ||
            "Produto artesanal para autocuidado e bem-estar.";

        async function handleAddCardToCart() {
            try {
                const availableSizes =
                    product.availableSizes ||
                    (product.size ? [product.size] : []);
                const normalizedSizes = availableSizes.filter(Boolean);

                if (normalizedSizes.length === 0) {
                    toast.warn("Selecione um produto com tamanho disponível.");
                    navigate(`/products/${product.id}`);
                    return;
                }

                if (normalizedSizes.length > 1) {
                    toast.info("Selecione o tamanho na página do produto.");
                    navigate(`/products/${product.id}`);
                    return;
                }

                const size = normalizedSizes[0];
                const available = await getAvailableQuantity(product.id, size);
                if (available <= 0) {
                    toast.error("Produto indisponível no momento.");
                    return;
                }

                if (productPrice == null) {
                    toast.error("Preço indisponível para este produto.");
                    return;
                }

                await addToCart({
                    productId: product.id,
                    productCode: product.code,
                    productName: product.name,
                    productImage: imageSrc,
                    size,
                    quantity: 1,
                    price: productPrice,
                    type: "sale",
                });

                toast.success("Produto adicionado ao carrinho!");
            } catch (error) {
                toast.error(error.message || "Erro ao adicionar ao carrinho.");
            }
        }

        return (
            <ProductCard
                key={product.id}
                productId={product.id}
                imageSrc={imageSrc}
                imageAlt={product.name}
                badge={categoryBadge}
                name={product.name}
                description={shortDescription}
                price={productPrice}
                installment=""
                onAddToCart={handleAddCardToCart}
            />
        );
    });

    return (
        <div className={styles.productsContainer}>
            {collection && (
                <div className={styles.collectionBanner}>
                    <div className={styles.collectionContent}>
                        <span className={styles.collectionLabel}>Coleção</span>
                        <h2 className={styles.collectionName}>{collectionDisplayName || collection}</h2>
                        <p className={styles.collectionDescription}>
                            Explore nossa seleção exclusiva de produtos desta coleção
                        </p>
                    </div>
                </div>
            )}
            
            <div className={styles.searchResults}>
                {searchQuery && <h2>Resultados para: &quot;{searchQuery}&quot;</h2>}
                {hasFiltersApplied && appliedFilters.length > 0 && (
                    <div className={styles.filtersInfo}>
                        <span className={styles.filtersInfoLabel}>Filtros aplicados:</span>
                        <div className={styles.filtersInfoList}>
                            {appliedFilters.map((filter, index) => (
                                <span key={filter + index} className={styles.filtersInfoTag}>
                                    {filter}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                <p>{formatProductsMessage(totalProducts)}</p>
            </div>

            <div className={styles.productsGrid}>{productsCards}</div>

            {totalPages > 1 && (
                <div className={styles.pagination}>
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
                        Anterior
                    </button>

                    <span>
                        Página {currentPage} de {totalPages}
                    </span>

                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                        Próxima
                    </button>
                </div>
            )}
        </div>
    );
}
