import styles from "./BannerTop.module.scss";

export default function BannerTop() {
    return (
        <div className={styles.bannerTop} role="status" aria-live="polite">
            <p className={styles.bannerText}>
                ESDRA | Velas aromáticas, sabonetes artesanais, difusores e kits de autocuidado
            </p>
        </div>
    );
}
