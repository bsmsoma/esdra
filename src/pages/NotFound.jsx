import styles from "./NotFound.module.scss";
import { useNavigate } from "react-router";

export default function () {
    const navigate = useNavigate();

    function handleClick() {
        navigate("/");
    }

    return (
        <div className={styles.notfound}>
            <div className={styles.textarea}>
                <h1>404 - Página não encontrada</h1>
                <h2>Acho que nos perdemos</h2>
                <button onClick={handleClick}>Go back to home</button>
            </div>
            <div className={`${styles.animationcontainer} ${styles.additionalClass}`}>
                <p>!?</p>
                <p>??</p>
                <p>!?</p>
                <div className={`${styles.tear} ${styles.tear1}`}></div>
                <div className={`${styles.tear} ${styles.tear2}`}></div>
                <div className={styles.confusedFace} aria-hidden="true">
                    ( ; _ ; )
                </div>
            </div>
        </div>
    )
}