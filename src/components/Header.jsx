import React, { useState, useEffect, useRef } from "react";
import styles from "./Header.module.scss";
import { NavLink, Link, useNavigate, redirect } from "react-router";
import { toast } from "react-toastify";
import { auth, signOut, getCustomerByUid } from "../firebase";
import { useAuth, useIsAdmin } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import HamburgerMenu from "./HamburgerMenu";
import {
    LogoutIcon,
    LogoEsdras,
    MagnifierIcon,
    UserIcon,
    CartIcon,
} from "../assets/icons";

// Derives the first name to show in the header: customer doc, then displayName, then email, then fallback.
function getDisplayFirstName(customer, firebaseUser) {
    if (customer?.firstName) {
        return customer.firstName.trim();
    }
    if (firebaseUser?.displayName) {
        const first = firebaseUser.displayName.trim().split(/\s+/)[0];
        if (first) return first;
    }
    if (firebaseUser?.email) {
        const local = firebaseUser.email.split("@")[0];
        if (local) return local;
    }
    return "Olá";
}

function Header() {
    const { user } = useAuth(); // Verify if the user is logged in; if not, the dropdown will not be shown
    const { isAdmin } = useIsAdmin(); // Check if user is admin
    const { itemCount } = useCart();
    const navigate = useNavigate();
    // State area
    const [searchState, setSearchState] = useState(false);
    const [hasText, setHasText] = useState(false); // If there is text in the searchbar, it will not close and will stop the animation
    const [searchText, setSearchText] = useState("");
    const [displayFirstName, setDisplayFirstName] = useState("");
    const [cartBouncing, setCartBouncing] = useState(false);
    const prevItemCountRef = useRef(itemCount);

    // Load customer to show first name (customer doc, or Google displayName/email as fallback)
    useEffect(function loadDisplayName() {
        if (!user) {
            setDisplayFirstName("");
            return;
        }
        let cancelled = false;
        getCustomerByUid(user.uid)
            .then(function (customer) {
                if (!cancelled) {
                    setDisplayFirstName(getDisplayFirstName(customer, user));
                }
            })
            .catch(function () {
                if (!cancelled) {
                    setDisplayFirstName(getDisplayFirstName(null, user));
                }
            });
        return function () {
            cancelled = true;
        };
    }, [user]);

    // UseEffect area
    useEffect(function() {
        // Handles UI logic for the searchbar
        // Cannot close the searchbar if there is text in it
        // Can be closed if there is no text in it when user clicks outside of the searchbar
        const handleClickOutside = (e) => {
            if (searchState && !hasText) {
                setSearchState(false);
            }
        };

        if (searchState) {
            document.addEventListener("click", handleClickOutside);
        }

        return function() {
            document.removeEventListener("click", handleClickOutside);
        };
    }, [searchState, hasText]);

    // New useEffect to handle click outside of mobile searchBar
    useEffect(() => {
        function handleMobileClickOutside(e) {
            const searchBarMobile = document.querySelector(
                `.${styles.searchBarMobile}`
            );
            if (
                searchState &&
                !hasText &&
                searchBarMobile &&
                !searchBarMobile.contains(e.target)
            ) {
                setSearchState(false);
            }
        }

        if (searchState) {
            document.addEventListener("click", handleMobileClickOutside);
        }

        return () => {
            document.removeEventListener("click", handleMobileClickOutside);
        };
    }, [searchState, hasText]);

    useEffect(function triggerCartBounce() {
        if (itemCount > prevItemCountRef.current) {
            setCartBouncing(true);
            const timer = setTimeout(() => setCartBouncing(false), 700);
            prevItemCountRef.current = itemCount;
            return () => clearTimeout(timer);
        }
        prevItemCountRef.current = itemCount;
    }, [itemCount]);

    // Function area
    function handleSearch() {
        if (searchText.trim()) {
            navigate(
                `/products?query=${encodeURIComponent(
                    searchText.trim().toLowerCase()
                )}`
            );
        }
    }
    function handleLogout() {
        signOut(auth)
            .then(() => {
                toast.success("Até logo!");
                navigate("/login");
            })
            .catch((error) => {
                console.error(error);
                toast.error("Erro ao sair. Tente novamente.");
            });
    }

    return (
        <>
            <header>
                <Link to="/" className={styles.logo} aria-label="Ir para página inicial da ESDRA">
                    <LogoEsdras aria-hidden="true" focusable="false" />
                </Link>
                <nav className={styles.menu}>
                    <ul>
                        <li>
                            <div
                                className={`
                                    ${styles.searchbar} 
                                    ${searchState ? styles.searchbaropen : ""}
                                    ${hasText ? styles.hideAnimation : ""}
                                    `}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSearchState(true);
                                }}
                            >
                                <input
                                    id="desktopSearchInput"
                                    name="desktopSearchInput"
                                    aria-label="Buscar produtos"
                                    className={styles.searchInput}
                                    type="text"
                                    value={searchText}
                                    onChange={(e) => {
                                        setHasText(e.target.value.length > 0);
                                        setSearchText(e.target.value);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleSearch();
                                        }
                                    }}
                                />
                                {searchText && (
                                    <button
                                        className={styles.clearButtonDesktop}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSearchText("");
                                            setHasText(false);
                                        }}
                                        aria-label="Limpar busca"
                                    >
                                        ×
                                    </button>
                                )}
                                <div className={styles.magnifierContainer}>
                                    <MagnifierIcon
                                        className={styles.magnifierIcon}
                                        onClick={handleSearch}
                                    />
                                </div>
                            </div>
                        </li>
                        <li>
                            <NavLink to="products">
                                Todos os Produtos
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="products?category=Velas Aromaticas">
                                Velas Aromaticas
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="products?category=Sabonetes Artesanais">
                                Sabonetes Artesanais
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="about">Sobre Nós</NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="cart"
                                className={`${styles.cartIcon}${cartBouncing ? ` ${styles.cartIconBouncing}` : ""}`}
                            >
                                <CartIcon />
                                <span className={`${styles.cartItemCount}${cartBouncing ? ` ${styles.badgePulse}` : ""}`}>{itemCount}</span>
                            </NavLink>
                        </li>
                        <li>
                            {user ? (
                                <div className={styles.dropdown}>
                                    <div className={styles.userTrigger}>
                                        <span className={styles.userDisplayName}>
                                            Olá, {displayFirstName}
                                        </span>
                                        <div className={styles.iconWithCaret}>
                                            <UserIcon
                                                className={styles.dropbtn}
                                                height={24}
                                                width={24}
                                            />
                                            <span
                                                className={styles.dropdownCaret}
                                                aria-hidden="true"
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.dropdownContent}>
                                        <div
                                            onClick={() => navigate("/account")}
                                        >
                                            Minha Conta
                                        </div>
                                        {isAdmin && (
                                            <div
                                                onClick={() =>
                                                    navigate("/dashboard")
                                                }
                                            >
                                                Dashboard
                                            </div>
                                        )}
                                        <div onClick={handleLogout}>
                                            Sair
                                            <LogoutIcon
                                                height={24}
                                                width={24}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <NavLink to="login">
                                    <UserIcon
                                        className={styles.dropbtn}
                                        height={24}
                                        width={24}
                                    />
                                </NavLink>
                            )}
                        </li>
                    </ul>
                </nav>
                <div className={styles.mobileActions}>
                    <Link
                        to="/cart"
                        className={styles.mobileCartButton}
                        aria-label={`Carrinho, ${itemCount} ${itemCount === 1 ? "item" : "itens"}`}
                    >
                        <CartIcon />
                        {itemCount > 0 && (
                            <span className={styles.mobileCartBadge}>{itemCount}</span>
                        )}
                    </Link>
                    <HamburgerMenu handleLogout={handleLogout} />
                </div>
            </header>
            <div
                className={`${styles.searchBarMobile} ${
                    searchState ? styles.active : ""
                }`}
                onClick={(e) => {
                    e.stopPropagation();
                    setSearchState(true);
                }}
            >
                <input
                    className={styles.searchInputMobile}
                    type="text"
                    value={searchText}
                    id="mobileSearchInput"
                    name="mobileSearchInput"
                    aria-label="Buscar produtos"
                    onChange={(e) => {
                        setHasText(e.target.value.length > 0);
                        setSearchText(e.target.value);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            handleSearch();
                        }
                    }}
                />
                {searchText && (
                    <button
                        className={styles.clearButton}
                        onClick={(e) => {
                            e.stopPropagation();
                            setSearchText("");
                            setHasText(false);
                        }}
                        aria-label="Limpar busca"
                    >
                        ×
                    </button>
                )}
                <button className={styles.searchButton} aria-label="Buscar">
                    <MagnifierIcon
                        className={styles.magnifierIcon}
                        onClick={handleSearch}
                    />
                </button>
            </div>
            <div className={styles.pagedivider}></div>
        </>
    );
}

export default Header;
