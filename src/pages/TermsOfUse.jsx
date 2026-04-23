import styles from "./LegalPages.module.scss";

export default function TermsOfUse() {
    return (
        <section className={styles.legalPage}>
            <h1>Termos de Uso</h1>
            <p>Última atualização: 16/04/2026</p>

            <h2>1. Aceite</h2>
            <p>
                Ao navegar e comprar na plataforma, você concorda com estes termos
                e com a política de privacidade.
            </p>

            <h2>2. Pedidos e pagamento</h2>
            <p>
                A confirmação do pedido depende da aprovação do pagamento e da
                validação operacional dos dados informados.
            </p>

            <h2>3. Entrega e frete</h2>
            <p>
                O prazo e o valor de entrega são informados no checkout e passam a
                compor o valor total do pedido.
            </p>

            <h2>4. Cancelamentos</h2>
            <p>
                Solicitações de cancelamento e estorno seguem as regras legais e o
                estágio de processamento do pedido.
            </p>

            <h2>5. Responsabilidades</h2>
            <p>
                O cliente deve manter dados cadastrais verdadeiros e atualizados,
                incluindo endereço, telefone e documento.
            </p>
        </section>
    );
}

