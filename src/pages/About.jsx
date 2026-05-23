import React from "react";
import { useLocation } from "react-router";
import styles from "./About.module.scss";
import SEOHead, { SITE_URL } from "../components/SEOHead";
import saboneteImg from "../assets/image/sabonete-pedra-clara_compressed_1778737230954_compressed_1778737251957.jpg";

export default function About() {
    const [isVisible, setIsVisible] = React.useState(false);
    const location = useLocation();

    React.useEffect(function() {
        setIsVisible(true);
    }, []);

    React.useEffect(function() {
        if (location.hash) {
            const sectionId = location.hash.replace('#', '');
            const element = document.getElementById(sectionId);
            if (element) {
                setTimeout(function() {
                    element.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 100);
            }
        } else {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    }, [location.hash]);

    return (
        <>
        <SEOHead
            title="Nossa História"
            description="Conheça a Esdra Aromas: perfumes e cosméticos artesanais feitos à mão com ingredientes naturais. Uma marca brasileira com alma."
            canonical={`${SITE_URL}/about`}
        />
        <section
            id='aboutus'
            className={`${styles.aboutus} ${isVisible ? styles.visible : ""}`}
        >
            <div className={styles.inner}>
                <div className={styles.imageWrap}>
                    <img src={saboneteImg} alt="Sabonete Pedra Clara Esdra" />
                </div>
                <div className={styles.content}>
                    <h2 className={styles.heading}>Sobre Nós</h2>
                    <span className={styles.rule} aria-hidden="true" />
                    <div className={styles.body}>
                        <p>
                            A ESDRA nasceu para transformar momentos simples em pausas de
                            cuidado. Cada produto combina aroma, textura e design para criar
                            experiências sensoriais acolhedoras no dia a dia.
                        </p>
                        <p>
                            Nosso catalogo reune velas aromáticas, sabonetes artesanais,
                            difusores e kits de autocuidado com curadoria atenta de materias-primas,
                            acabamento e identidade olfativa.
                        </p>
                        <p>
                            Trabalhamos com um olhar minimalista e funcional para que cada
                            item se encaixe com naturalidade na rotina e se torne parte de
                            um ritual de bem-estar.
                        </p>
                    </div>
                </div>
            </div>
        </section>
        </>
    );
}
