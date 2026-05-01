import { createContext, useContext, useState, useMemo } from "react";
import styles from "./DashboardLayout.module.scss";
import { Outlet, useNavigate, useLocation } from "react-router";
import { PlusIcon, MagnifierIcon } from "../assets/icons";

// Busca local ao dashboard (lista admin). A vitrine em /products não usa este contexto.
// Create Search Context to share search state across dashboard pages
const SearchContext = createContext();

export function useSearch() {
    const context = useContext(SearchContext);
    if (!context) {
        throw new Error("useSearch must be used within DashboardLayout");
    }
    return context;
}

export default function DashboardLayout() {
    const [searchText, setSearchText] = useState("");
    const [searchCode, setSearchCode] = useState("");
    const navigate = useNavigate();
    const location = useLocation();

    const isOrders = location.pathname === "/dashboard/orders";
    const showSearch = !isOrders;

    // Memoize the context to avoid unnecessary re-renders
    const searchContextValue = useMemo(
        function () {
            return {
                searchText,
                searchCode,
                setSearchText,
                setSearchCode,
            };
        },
        [searchText, searchCode]
    );

    return (
        <SearchContext.Provider value={searchContextValue}>
            <section>
                <nav className={styles.dashboardNav}>
                    <div className={styles.navButtons}>
                        <button
                            className={`${styles.feedButton} ${location.pathname === "/dashboard" ? styles.active : ""}`}
                            onClick={function () { navigate("/dashboard"); }}
                            aria-current={location.pathname === "/dashboard" ? "page" : undefined}
                        >
                            Produtos
                        </button>
                        <button
                            className={`${styles.addButton} ${location.pathname.startsWith("/dashboard/add") || location.pathname.startsWith("/dashboard/edit") ? styles.active : ""}`}
                            onClick={function () { navigate("/dashboard/add"); }}
                            aria-current={location.pathname.startsWith("/dashboard/add") || location.pathname.startsWith("/dashboard/edit") ? "page" : undefined}
                        >
                            <PlusIcon />
                            Adicionar Produto
                        </button>
                        <button
                            className={`${styles.feedButton} ${isOrders ? styles.active : ""}`}
                            onClick={function () { navigate("/dashboard/orders"); }}
                            aria-current={isOrders ? "page" : undefined}
                        >
                            Pedidos
                        </button>
                    </div>
                    {showSearch && <div className={styles.searchFields}>
                        <div className={styles.searchField}>
                            <MagnifierIcon className={styles.searchIcon} />
                            <input
                                type="text"
                                id="dashboardSearchText"
                                name="dashboardSearchText"
                                placeholder="Nome, categoria, cor..."
                                className={styles.searchInput}
                                value={searchText}
                                onChange={function (e) {
                                    setSearchText(e.target.value);
                                }}
                            />
                            {searchText && (
                                <button
                                    className={styles.clearButton}
                                    onClick={function () {
                                        setSearchText("");
                                    }}
                                    aria-label="Limpar busca por texto"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                        <div className={styles.searchField}>
                            <MagnifierIcon className={styles.searchIcon} />
                            <input
                                type="number"
                                id="dashboardSearchCode"
                                name="dashboardSearchCode"
                                placeholder="Código..."
                                className={styles.searchInput}
                                value={searchCode}
                                onChange={function (e) {
                                    setSearchCode(e.target.value);
                                }}
                            />
                            {searchCode && (
                                <button
                                    className={styles.clearButton}
                                    onClick={function () {
                                        setSearchCode("");
                                    }}
                                    aria-label="Limpar busca por código"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </div>}
                </nav>
                <Outlet />
            </section>
        </SearchContext.Provider>
    );
}
