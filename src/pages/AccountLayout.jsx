import { Outlet, NavLink } from "react-router";
import { requireCustomerAuth } from "../contexts/AuthContext";
import styles from "./AccountLayout.module.scss";

export async function accountLayoutLoader() {
    return await requireCustomerAuth();
}

export default function AccountLayout() {
    return (
        <div className={styles.accountLayout}>
            <div className={styles.accountContainer}>
                <nav className={styles.accountNav}>
                    <NavLink 
                        to="/account" 
                        end 
                        className={function({isActive}) { 
                            return isActive ? styles.activeLink : styles.navLink;
                        }}
                    >
                        Visão Geral
                    </NavLink>
                    <NavLink 
                        to="/account/profile" 
                        className={function({isActive}) { 
                            return isActive ? styles.activeLink : styles.navLink;
                        }}
                    >
                        Perfil
                    </NavLink>
                    <NavLink 
                        to="/account/orders" 
                        className={function({isActive}) { 
                            return isActive ? styles.activeLink : styles.navLink;
                        }}
                    >
                        Meus Pedidos
                    </NavLink>
                    <NavLink 
                        to="/account/addresses" 
                        className={function({isActive}) { 
                            return isActive ? styles.activeLink : styles.navLink;
                        }}
                    >
                        Endereços
                    </NavLink>
                </nav>
                <Outlet />
            </div>
        </div>
    );
}
