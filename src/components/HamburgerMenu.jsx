import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from "react-router";
import { FaUser } from "react-icons/fa";
import { useAuth, useIsAdmin } from "../contexts/AuthContext";
import styles from './HamburgerMenu.module.scss';
import {
    PlaceholderIcon,
    UserIcon,
    LogoutIcon,
} from "../assets/icons";

function HamburgerMenu(props) {
    const [isOpen, setIsOpen] = useState(false);
    const { user } = useAuth();
    const { isAdmin } = useIsAdmin(); // Check if user is admin
    const navigate = useNavigate();
    const location = useLocation();

    // This is to prevent the menu from being open when the user navigates to a new page.
    useEffect(function() {
        setIsOpen(false);
    }, [location.pathname]);

    // This is to prevent the page from scrolling when the menu is open.
    // in mobile devices.
    useEffect(function() {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        // Cleanup function to ensure the scroll is restored
        return function() {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    function handleClick() {
        setIsOpen(!isOpen);
    }
    

    return (
        <>
            <button 
                className={`${styles.hamburger} ${isOpen ? styles.active : ''}`} 
                onClick={handleClick}
                aria-label="Menu"
            >
                <span className={styles.line}></span>
                <span className={styles.line}></span>
                <span className={styles.line}></span>
            </button>

            {/* Backdrop to close menu when clicking outside */}
            <div 
                className={`${styles.backdrop} ${isOpen ? styles.active : ''}`}
                style={{
                    opacity: isOpen ? 1 : 0,
                    pointerEvents: isOpen ? 'auto' : 'none'
                }}
                onClick={() => setIsOpen(false)}
            />

            <div className={`${styles.mobileMenu} ${isOpen ? styles.active : ''}`}>
                <ul>
                    <li>
                        <NavLink to="products?category=Velas Aromaticas" onClick={function() { setIsOpen(false); }}>
                            <PlaceholderIcon />
                            Velas Aromaticas
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="products?category=Sabonetes Artesanais" onClick={function() { setIsOpen(false); }}>
                            <PlaceholderIcon />
                            Sabonetes Artesanais
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="products?category=Difusores" onClick={function() { setIsOpen(false); }}>
                            <PlaceholderIcon />
                            Difusores
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="products?category=Kits de Autocuidado" onClick={function() { setIsOpen(false); }}>
                            <PlaceholderIcon />
                            Kits de Autocuidado
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="about" onClick={function() { setIsOpen(false); }}>
                            <PlaceholderIcon />
                            Sobre Nós
                        </NavLink>
                    </li>
                    {user ? (
                        <>
                            <li>
                                <NavLink to="/account" onClick={function() { setIsOpen(false); }}>
                                    <UserIcon />
                                    Minha Conta
                                </NavLink>
                            </li>
                            {isAdmin && (
                                <li>
                                    <NavLink to="/dashboard" onClick={function() { setIsOpen(false); }}>
                                        <UserIcon />
                                        Dashboard
                                    </NavLink>
                                </li>
                            )}
                            <li>
                                <button onClick={function() {
                                    props.handleLogout();
                                    setIsOpen(false);
                                    navigate("/login");
                                }} className={styles.logoutButton}>
                                    <LogoutIcon />
                                    Sair
                                </button>
                            </li>
                        </>
                    ) : (
                        <li>
                            <NavLink to="login" onClick={function() { setIsOpen(false); }}>
                                <FaUser className={styles.userIcon} />
                                Entrar
                            </NavLink>
                        </li>
                    )}
                </ul>
            </div>
        </>
    );
}

export default HamburgerMenu;
