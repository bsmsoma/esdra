import styles from "./Footer.module.scss";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";
import { Link } from "react-router";
import { LogoBrunno, LogoEsdras } from "../assets/icons";

const navigationLinks = [
    { to: "/", label: "Início" },
    { to: "/products", label: "Produtos" },
    { to: "/about", label: "Sobre a Esdra" },
    { to: "/cart", label: "Carrinho" },
    { to: "/account", label: "Minha conta" },
];

const supportLinks = [
    { to: "/checkout", label: "Finalizar compra" },
    { to: "/politica-de-privacidade", label: "Política de Privacidade" },
    { to: "/termos-de-uso", label: "Termos de Uso" },
];

function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <>
            <div className={styles.pagedivider}></div>
            <footer className={styles.footer}>
                <div className={styles.footerContainer}>
                    <div className={`${styles.footerSection} ${styles.footerBrand}`}>
                        <h3 className={styles.footerTitle}>
                            <LogoEsdras
                                className={styles.brandLogo}
                                aria-hidden="true"
                                focusable="false"
                            />
                        </h3>
                        <p className={styles.footerDescription}>
                            Velas e produtos sensoriais artesanais para transformar
                            momentos cotidianos em rituais elegantes de bem-estar.
                        </p>
                        <div className={styles.socialLinks}>
                            <a
                                href="https://instagram.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.socialIcon}
                                aria-label="Instagram"
                            >
                                <FaInstagram />
                            </a>
                            <a
                                href="https://wa.me"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.socialIcon}
                                aria-label="WhatsApp"
                            >
                                <FaWhatsapp />
                            </a>
                        </div>
                    </div>

                    <div className={styles.footerSection}>
                        <h3 className={styles.footerTitle}>Navegação</h3>
                        <ul className={styles.footerLinks}>
                            {navigationLinks.map(function (item) {
                                return (
                                    <li key={item.to}>
                                        <Link to={item.to}>{item.label}</Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    <div className={styles.footerSection}>
                        <h3 className={styles.footerTitle}>Suporte</h3>
                        <ul className={styles.footerLinks}>
                            {supportLinks.map(function (item) {
                                return (
                                    <li key={item.to}>
                                        <Link to={item.to}>{item.label}</Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>

                <div className={styles.footerBottom}>
                    <div className={styles.footerBottomContent}>
                        <p className={styles.copyright}>
                            © {currentYear} ESDRA - Todos os direitos reservados.
                        </p>
                        <p className={styles.developer}>
                            Desenvolvido por{" "}
                            <a
                                href="https://brunnomota.com.br"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.developerLink}
                            >
                                Brunno Mota
                                <LogoBrunno className={styles.developerLogo} />
                            </a>
                        </p>
                    </div>
                </div>
            </footer>
        </>
    );
}

export default Footer;
