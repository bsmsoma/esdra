import { useEffect, useMemo, useCallback } from "react";
import {
    useLoaderData,
    useNavigate,
    useSearchParams,
    Link,
} from "react-router";
import styles from "./Dashboard.module.scss";
import { deleteDoc, getDoc } from "firebase/firestore";
import {
    getProductsCollection,
    getDocs,
    deleteImagesFromStorage,
    normalizeString,
    getProductDocRef,
    getProductInventory,
} from "../firebase";
import { EditIcon, DeleteIcon } from "../assets/icons";
import { useSearch } from "../components/DashboardLayout";
import { toast } from "react-toastify";
import { formatPrice } from "../utils/priceUtils";
import { formatSizesDisplayForAdmin } from "../utils/productSizes";
import { getProductCoverImageUrl } from "../utils/productMedia";
import { invalidateCache } from "../utils/cache";
import { debug } from "../utils/logger";

export async function dashboardLoader() {
    // A autenticação já é verificada no loader do DashboardLayout (rota pai)
    const snapshot = await getDocs(getProductsCollection());
    const products = snapshot.docs.map(function (d) {
        return { ...d.data(), id: d.id };
    });

    // Fetch inventory for each product and compute total available stock
    const productsWithStock = await Promise.all(
        products.map(async function (product) {
            const inventory = await getProductInventory(product.id);
            let totalStock = 0;
            Object.values(inventory).forEach(function (sizeData) {
                const q = sizeData.quantity || 0;
                const r = sizeData.reserved || 0;
                totalStock += Math.max(0, q - r);
            });
            return { ...product, totalStock };
        })
    );

    return productsWithStock;
}

export default function Dashboard() {
    const products = useLoaderData(); // get products from database using loader,
    // it fetch the data from the database. before the component is mounted.
    const navigate = useNavigate(); //Since i`m using loaders, when i delete a product,
    //the navigate the user back to the dashboard page and i can use the useLocation.state.message to show
    //a message to the user.
    const [searchParams, setSearchParams] = useSearchParams();
    const { searchText, searchCode } = useSearch(); // Get search values from DashboardLayout context

    // Efeito para mostrar toast quando houver mensagem na URL
    useEffect(
        function handleToastMessages() {
            const message = searchParams.get("message");
            const type = searchParams.get("type");

            if (message) {
                if (type === "success") {
                    toast.success(message);
                } else if (type === "error") {
                    toast.error(message);
                }

                // Limpar os parâmetros da URL após mostrar a mensagem
                setSearchParams({});
            }
        },
        [searchParams, setSearchParams]
    );

    // delete product - memoizado com useCallback
    const handleDelete = useCallback(
        async function (id) {
            try {
                // 1. Buscar dados do produto antes de deletar
                const productDoc = await getDoc(getProductDocRef(id));

                if (!productDoc.exists()) {
                    toast.error("Produto não encontrado!");
                    return;
                }

                const productData = productDoc.data();

                // 2. Deletar imagens do Storage (se existirem)
                if (productData.images && productData.images.length > 0) {
                    const deleteResult = await deleteImagesFromStorage(
                        productData.images
                    );
                    debug(
                        `Imagens deletadas: ${deleteResult.successCount}/${deleteResult.total}`
                    );

                    if (deleteResult.failCount > 0) {
                        console.warn(
                            `${deleteResult.failCount} imagem(ns) não puderam ser deletadas`
                        );
                    }
                }

                // 3. Deletar o documento do Firestore
                await deleteDoc(getProductDocRef(id));

                // Invalidate all product caches since a product was deleted
                invalidateCache("productsLayout");
                invalidateCache("home");
                invalidateCache("productDetails");

                toast.success("Produto excluído com sucesso!");

                // Navegar para forçar revalidação dos dados sem refresh completo
                navigate("/dashboard", { replace: true });
            } catch (error) {
                console.error("Erro ao excluir produto:", error);
                toast.error("Erro ao excluir produto!");
            }
        },
        [navigate]
    );

    // navigate to edit page - memoizado com useCallback
    const handleEdit = useCallback(
        function (id) {
            navigate(`/dashboard/edit?productId=${id}`);
        },
        [navigate]
    );

    // Filter products based on search criteria - memoizado com useMemo
    const filteredProducts = useMemo(
        function () {
            return products.filter(function (product) {
                // Filter by text search (name, category, color)
                if (searchText.trim()) {
                    const normalizedSearchText = normalizeString(searchText);
                    const searchableContent = [
                        normalizeString(product.name),
                        normalizeString(product.category),
                        normalizeString(product.color),
                        normalizeString(product.collection || ""),
                    ].join(" ");

                    if (!searchableContent.includes(normalizedSearchText)) {
                        return false;
                    }
                }

                // Filter by code search
                if (searchCode.trim()) {
                    const codeStr = product.code.toString();
                    if (!codeStr.includes(searchCode.trim())) {
                        return false;
                    }
                }

                return true;
            });
        },
        [products, searchText, searchCode]
    );

    // Pagination: 20 products per page
    const ITEMS_PER_PAGE = 20;
    const { totalPages, currentPage, paginatedProducts } = useMemo(
        function () {
            const sorted = [...filteredProducts].sort(function (a, b) {
                return b.createdAt - a.createdAt;
            });
            const total = sorted.length;
            const totalPgs = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
            const pageParam = searchParams.get("page");
            const parsed = parseInt(pageParam || "1", 10);
            const current = isNaN(parsed) || parsed < 1 ? 1 : parsed;
            const validated = Math.min(current, totalPgs);
            const start = (validated - 1) * ITEMS_PER_PAGE;
            const paginated = sorted.slice(start, start + ITEMS_PER_PAGE);
            return {
                totalPages: totalPgs,
                currentPage: validated,
                paginatedProducts: paginated,
            };
        },
        [filteredProducts, searchParams]
    );

    function handlePageChange(newPage) {
        setSearchParams(function (prev) {
            const next = new URLSearchParams(prev);
            next.set("page", String(newPage));
            return next;
        });
    }

    // map products from database to table - memoizado com useMemo (uses paginated list)
    const productsRow = useMemo(
        function () {
            return paginatedProducts.map(function (product) {
                    // Get available sizes from product data (array or fallback to old single size)
                    const availableSizes =
                        product.availableSizes ||
                        (product.size ? [product.size] : []);
                    const sizesDisplay = formatSizesDisplayForAdmin(availableSizes);
                    const productPrice =
                        product.sellValue != null
                            ? product.sellValue
                            : product.rentValue;
                    const coverUrl = getProductCoverImageUrl(product);

                    return (
                        <tr key={product.id}>
                            <td className={styles.codeCell}>{product.sku || product.code}</td>
                            <td>{product.name}</td>
                            <td>{product.category}</td>
                            <td>
                                {productPrice != null
                                    ? `R$ ${formatPrice(productPrice)}`
                                    : "-"}
                            </td>
                            <td>{sizesDisplay}</td>
                            <td>{product.totalStock ?? "-"}</td>
                            <td className={styles.imageCell}>
                                <Link to={`/products/${product.id}`}>
                                    {coverUrl ? (
                                        <img
                                            src={coverUrl}
                                            alt={product.name}
                                        />
                                    ) : (
                                        <span
                                            className={styles.noImage}
                                            title="Sem imagem no cadastro"
                                        >
                                            —
                                        </span>
                                    )}
                                </Link>
                            </td>
                            <td className={styles.actions}>
                                <div className={styles.buttonsContainer}>
                                    <button
                                        type="button"
                                        className={styles.editButton}
                                        title="Editar"
                                        onClick={function () {
                                            handleEdit(product.id);
                                        }}
                                    >
                                        <EditIcon />
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.deleteButton}
                                        title="Excluir"
                                        onClick={function () {
                                            handleDelete(product.id);
                                        }}
                                    >
                                        <DeleteIcon />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    );
                });
        },
        [paginatedProducts, handleEdit, handleDelete]
    );

    return (
        <>
            {(searchText || searchCode) && (
                <div className={styles.searchResults}>
                    Mostrando {filteredProducts.length} de {products.length}{" "}
                    produtos
                </div>
            )}
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.codeCell}>SKU</th>
                            <th>Nome</th>
                            <th>Categoria</th>
                            <th>Preco</th>
                            <th>Tamanho</th>
                            <th>Estoque</th>
                            <th>Imagem</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody className={styles.tableBody}>{productsRow}</tbody>
                </table>
            </div>
            {totalPages > 1 && (
                <div className={styles.pagination}>
                    <button
                        type="button"
                        onClick={function () {
                            handlePageChange(currentPage - 1);
                        }}
                        disabled={currentPage === 1}
                    >
                        Anterior
                    </button>
                    <span>
                        Página {currentPage} de {totalPages}
                    </span>
                    <button
                        type="button"
                        onClick={function () {
                            handlePageChange(currentPage + 1);
                        }}
                        disabled={currentPage === totalPages}
                    >
                        Próxima
                    </button>
                </div>
            )}
        </>
    );
}
