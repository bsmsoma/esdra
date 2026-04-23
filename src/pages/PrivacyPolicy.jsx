import styles from "./LegalPages.module.scss";

export default function PrivacyPolicy() {
    return (
        <section className={styles.legalPage}>
            <h1>Política de Privacidade</h1>
            <p>Última atualização: 16/04/2026</p>

            <h2>1. Dados coletados</h2>
            <p>
                Coletamos dados de cadastro, contato, endereço de entrega e
                informações de pedido para viabilizar o processo de compra.
            </p>

            <h2>2. Finalidade</h2>
            <p>
                Utilizamos os dados para processamento de pagamentos, envio de
                pedidos, atendimento e comunicação transacional obrigatória.
            </p>

            <h2>3. Compartilhamento</h2>
            <p>
                Compartilhamos apenas com provedores necessários para operação do
                e-commerce, como gateway de pagamento, infraestrutura e logística.
            </p>

            <h2>4. Segurança</h2>
            <p>
                Aplicamos controles de segurança para proteger dados pessoais em
                trânsito e em armazenamento, com acesso restrito por função.
            </p>

            <h2>5. Direitos do titular</h2>
            <p>
                O titular pode solicitar confirmação de tratamento, correção e
                exclusão de dados conforme legislação vigente.
            </p>
        </section>
    );
}

