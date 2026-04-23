import React from "react";
import { useLocation } from "react-router";
import styles from "./About.module.scss";

export default function About() {
    const [isVisible, setIsVisible] = React.useState(false);
    const location = useLocation();

    React.useEffect(function() {
        // Define o componente como visível após a montagem
        setIsVisible(true);
    }, []);

    // Handle scroll to section when hash is present in URL
    React.useEffect(function() {
        if (location.hash) {
            const sectionId = location.hash.replace('#', '');
            const element = document.getElementById(sectionId);
            
            if (element) {
                // Small delay to ensure page is fully loaded
                setTimeout(function() {
                    element.scrollIntoView({ 
                        behavior: "smooth",
                        block: "start"
                    });
                }, 100);
            }
        } else {
            // If no hash, scroll to top
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    }, [location.hash]);

    return (
        <section
            id='aboutus'
            className={`${styles.aboutus} ${isVisible ? styles.visible : ""}`}
        >
            <h2>Sobre Nós</h2>
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
        </section>
    );
}
