import { useState, useEffect, useRef } from "react";
import styles from "./HydrateFallback.module.scss";

function HydrateFallback() {
    const [count, setCount] = useState(0);
    const rafRef = useRef(null);

    useEffect(() => {
        const duration = 820;
        const start = performance.now();

        function tick(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 2.8);
            setCount(Math.floor(eased * 100));

            if (progress < 1) {
                rafRef.current = requestAnimationFrame(tick);
            }
        }

        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, []);

    return (
        <div className={styles.root} role="status" aria-label="Carregando">
            <div className={styles.inner}>
                <span className={styles.brand}>ESDRA · Aromas</span>
                <div className={styles.counterWrap}>
                    <span className={styles.counter}>{count}</span>
                    <span className={styles.pct}>%</span>
                </div>
                <div className={styles.bar}>
                    <div
                        className={styles.barFill}
                        style={{ width: `${count}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

export default HydrateFallback;
