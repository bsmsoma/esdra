import { Link } from "react-router";
import styles from "./LegalPages.module.scss";

export default function PrivacyPolicy() {
    return (
        <section className={styles.legalPage}>
            <h1>Política de Privacidade</h1>
            <p className={styles.lastUpdated}>Última atualização: 22/05/2026</p>

            {/* ── CONTROLADOR ── */}
            <h2>1. Quem somos (Controlador de dados)</h2>
            <div className={styles.contactBlock}>
                <p><strong>Razão social:</strong> Esdra Gomes da Silva — CNPJ 66.664.303/0001-17</p>
                <p><strong>Endereço:</strong> [COMPLETAR ENDEREÇO COMERCIAL]</p>
                <p><strong>E-mail de contato:</strong> <a href="mailto:privacidade@esdraaromas.com.br">privacidade@esdraaromas.com.br</a></p>
                <p><strong>Encarregado (DPO):</strong> [COMPLETAR NOME] — <a href="mailto:privacidade@esdraaromas.com.br">privacidade@esdraaromas.com.br</a></p>
            </div>
            <p>
                A Esdra Aromas é responsável pelo tratamento dos dados pessoais coletados nesta
                plataforma, na qualidade de <strong>Controladora</strong>, nos termos da Lei nº 13.709/2018
                (Lei Geral de Proteção de Dados — LGPD).
            </p>

            {/* ── DADOS COLETADOS ── */}
            <h2>2. Quais dados coletamos e por quê</h2>
            <p>
                Coletamos apenas os dados necessários para viabilizar sua experiência de compra.
                A tabela abaixo descreve cada categoria, sua finalidade e a base legal aplicável.
            </p>

            <table className={styles.operatorsTable}>
                <thead>
                    <tr>
                        <th>Dado</th>
                        <th>Finalidade</th>
                        <th>Base legal (LGPD)</th>
                        <th>Retenção</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Nome completo</td>
                        <td>Identificação, emissão de nota fiscal e entrega</td>
                        <td>Execução de contrato (art. 7º, V)</td>
                        <td>Enquanto houver conta ativa + 5 anos após encerramento</td>
                    </tr>
                    <tr>
                        <td>E-mail</td>
                        <td>Autenticação, confirmações de pedido e comunicados transacionais</td>
                        <td>Execução de contrato (art. 7º, V)</td>
                        <td>Enquanto houver conta ativa + 5 anos após encerramento</td>
                    </tr>
                    <tr>
                        <td>CPF</td>
                        <td>Processamento de pagamento junto ao MercadoPago e obrigações fiscais</td>
                        <td>Obrigação legal (art. 7º, II) + Execução de contrato (art. 7º, V)</td>
                        <td>5 anos após a última transação (prazo fiscal)</td>
                    </tr>
                    <tr>
                        <td>Telefone</td>
                        <td>Contato em caso de problema com o pedido</td>
                        <td>Execução de contrato (art. 7º, V)</td>
                        <td>Enquanto houver conta ativa + 5 anos após encerramento</td>
                    </tr>
                    <tr>
                        <td>Endereço de entrega</td>
                        <td>Cálculo de frete e envio do pedido</td>
                        <td>Execução de contrato (art. 7º, V)</td>
                        <td>Enquanto salvo pelo titular; histórico de pedidos por 5 anos</td>
                    </tr>
                    <tr>
                        <td>Histórico de pedidos</td>
                        <td>Atendimento, garantia, rastreio e obrigações fiscais</td>
                        <td>Obrigação legal (art. 7º, II) + Execução de contrato (art. 7º, V)</td>
                        <td>5 anos (prazo prescricional e fiscal)</td>
                    </tr>
                    <tr>
                        <td>Dados de navegação e comportamento (cookies)</td>
                        <td>Analytics para melhoria da plataforma — <strong>apenas com seu consentimento</strong></td>
                        <td>Consentimento (art. 7º, I)</td>
                        <td>Até 13 meses no Google Analytics; revogável a qualquer tempo</td>
                    </tr>
                </tbody>
            </table>

            <div className={styles.infoBox}>
                <p>
                    <strong>Não coletamos dados sensíveis</strong> (origem racial, convicção religiosa, dados
                    de saúde, biometria etc.) conforme definidos no art. 5º, II da LGPD.
                </p>
            </div>

            {/* ── COOKIES ── */}
            <h2>3. Cookies e tecnologias de rastreamento</h2>
            <p>
                Utilizamos cookies para duas finalidades distintas, com tratamentos diferentes:
            </p>

            <h3>Cookies estritamente necessários</h3>
            <p>
                Essenciais para o funcionamento da plataforma (autenticação, carrinho, sessão).
                Não requerem consentimento, pois são indispensáveis ao serviço contratado.
            </p>

            <h3>Cookies de analytics (opcionais)</h3>
            <p>
                Usamos o <strong>Google Analytics</strong> e o <strong>Google Tag Manager</strong> para entender
                como os visitantes navegam na loja. Esses cookies <strong>só são ativados após seu
                consentimento explícito</strong>, coletado pelo banner na parte inferior desta página.
                Você pode revogar o consentimento a qualquer momento limpando o item
                {" "}<code>esdra_analytics_consent</code> do armazenamento local do seu navegador,
                ou entrando em contato conosco.
            </p>
            <p>
                Cookies de analytics coletam: endereço IP (anonimizado pelo Google), páginas
                visitadas, tempo de visita, dispositivo e navegador. Nenhum dado pessoal identificável
                é enviado ao Google Analytics por nossa plataforma.
            </p>

            {/* ── COMPARTILHAMENTO ── */}
            <h2>4. Com quem compartilhamos seus dados (Operadores)</h2>
            <p>
                Seus dados são compartilhados apenas com os prestadores de serviço abaixo,
                estritamente necessários para o funcionamento do e-commerce, que atuam como
                <strong> Operadores</strong> sob nossas instruções:
            </p>

            <table className={styles.operatorsTable}>
                <thead>
                    <tr>
                        <th>Operador</th>
                        <th>Função</th>
                        <th>Dados compartilhados</th>
                        <th>País</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Google Firebase</strong> (Google LLC)</td>
                        <td>Infraestrutura, banco de dados, autenticação e armazenamento de arquivos</td>
                        <td>Todos os dados de cadastro e pedidos</td>
                        <td>Brasil (região southamerica-east1) / EUA</td>
                    </tr>
                    <tr>
                        <td><strong>MercadoPago</strong> (MercadoPago LLC)</td>
                        <td>Gateway de pagamento</td>
                        <td>Nome, e-mail, CPF, valor do pedido</td>
                        <td>Brasil</td>
                    </tr>
                    <tr>
                        <td><strong>Resend</strong> (Resend Inc.)</td>
                        <td>Envio de e-mails transacionais (confirmação de pedido, pagamento)</td>
                        <td>Nome, e-mail, número do pedido</td>
                        <td>EUA</td>
                    </tr>
                    <tr>
                        <td><strong>ViaCEP</strong></td>
                        <td>Autopreenchimento de endereço a partir do CEP</td>
                        <td>Apenas o CEP digitado (sem identificação pessoal)</td>
                        <td>Brasil</td>
                    </tr>
                    <tr>
                        <td><strong>Google Analytics / GTM</strong></td>
                        <td>Analytics de navegação — apenas com consentimento</td>
                        <td>Dados de navegação anônimos</td>
                        <td>EUA</td>
                    </tr>
                </tbody>
            </table>

            <p>
                Não vendemos, alugamos nem cedemos seus dados a terceiros para fins comerciais.
                Podemos compartilhar dados com autoridades públicas quando exigido por lei (art. 7º, VI da LGPD).
            </p>

            {/* ── DIREITOS ── */}
            <h2>5. Seus direitos como titular (art. 18 da LGPD)</h2>
            <p>
                Você tem os seguintes direitos em relação aos seus dados pessoais:
            </p>

            <div className={styles.rightsGrid}>
                <div className={styles.rightCard}>
                    <strong>Acesso</strong>
                    <p>Confirmar se tratamos seus dados e obter uma cópia deles.</p>
                </div>
                <div className={styles.rightCard}>
                    <strong>Correção</strong>
                    <p>Solicitar a atualização de dados incompletos, inexatos ou desatualizados.</p>
                </div>
                <div className={styles.rightCard}>
                    <strong>Exclusão</strong>
                    <p>Pedir a exclusão dos dados tratados com base no seu consentimento.</p>
                </div>
                <div className={styles.rightCard}>
                    <strong>Portabilidade</strong>
                    <p>Receber seus dados em formato estruturado para transferência a outro serviço.</p>
                </div>
                <div className={styles.rightCard}>
                    <strong>Revogação de consentimento</strong>
                    <p>Retirar o consentimento para cookies de analytics a qualquer momento.</p>
                </div>
                <div className={styles.rightCard}>
                    <strong>Informação sobre compartilhamento</strong>
                    <p>Saber com quais entidades públicas ou privadas seus dados são compartilhados.</p>
                </div>
            </div>

            <p>
                Para exercer qualquer um desses direitos, use nosso{" "}
                <Link to="/privacidade/direitos"><strong>formulário de solicitação de dados</strong></Link>{" "}
                ou entre em contato pelo e-mail{" "}
                <a href="mailto:privacidade@esdraaromas.com.br">privacidade@esdraaromas.com.br</a>.
                Responderemos em até <strong>15 dias úteis</strong>, conforme art. 18, §3º da LGPD.
                Também é possível gerenciar seus dados diretamente em{" "}
                <Link to="/account/profile">Minha Conta → Perfil</Link> e{" "}
                <Link to="/account/addresses">Minha Conta → Endereços</Link>.
            </p>

            {/* ── SEGURANÇA ── */}
            <h2>6. Segurança dos dados</h2>
            <p>
                Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados:
            </p>
            <ul>
                <li>Comunicação criptografada em trânsito via TLS (HTTPS)</li>
                <li>Dados em repouso armazenados com criptografia gerenciada pelo Google Firebase</li>
                <li>Controle de acesso por função (RBAC): dados de clientes acessíveis apenas pelo próprio titular e pela equipe administrativa</li>
                <li>Autenticação via Firebase Authentication com tokens de curta duração</li>
                <li>Segredos e credenciais fora do repositório de código (variáveis de ambiente)</li>
            </ul>
            <p>
                Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos
                titulares, notificaremos a ANPD e os afetados dentro do prazo legal (art. 48 da LGPD).
            </p>

            {/* ── RETENÇÃO ── */}
            <h2>7. Retenção e exclusão de dados</h2>
            <p>
                Mantemos seus dados pelo tempo necessário para as finalidades descritas nesta
                política ou pelo prazo exigido por obrigação legal. De forma geral:
            </p>
            <ul>
                <li>Dados de conta ativa: mantidos enquanto a conta existir</li>
                <li>Histórico de pedidos e dados fiscais (incluindo CPF): 5 anos após a última transação</li>
                <li>Dados de e-mails transacionais: excluídos 30 dias após o envio confirmado</li>
                <li>Cookies de analytics: até 13 meses, conforme configuração do Google Analytics</li>
            </ul>
            <p>
                Ao solicitar a exclusão da conta, anonimizaremos ou deletaremos seus dados
                pessoais, exceto aqueles que precisamos manter por obrigação legal.
            </p>

            {/* ── MENORES ── */}
            <h2>8. Crianças e adolescentes</h2>
            <p>
                Nossa plataforma não é direcionada a menores de 18 anos. Não coletamos
                intencionalmente dados de crianças ou adolescentes. Se você identificar que
                um menor forneceu dados sem autorização, entre em contato para exclusão imediata.
            </p>

            {/* ── ALTERAÇÕES ── */}
            <h2>9. Alterações nesta política</h2>
            <p>
                Podemos atualizar esta política periodicamente para refletir mudanças na nossa
                operação ou na legislação. A data de "Última atualização" no topo indica quando
                a versão vigente foi publicada. Alterações relevantes serão comunicadas por e-mail
                ou por aviso na plataforma com antecedência mínima de 10 dias.
            </p>

            {/* ── CONTATO ── */}
            <h2>10. Contato e Encarregado (DPO)</h2>
            <div className={styles.contactBlock}>
                <p><strong>Encarregado pelo tratamento de dados (DPO):</strong> [COMPLETAR NOME]</p>
                <p><strong>E-mail:</strong> <a href="mailto:privacidade@esdraaromas.com.br">privacidade@esdraaromas.com.br</a></p>
                <p><strong>Prazo de resposta:</strong> até 15 dias úteis</p>
                <p>
                    Você também pode registrar reclamações perante a{" "}
                    <strong>Autoridade Nacional de Proteção de Dados (ANPD)</strong> pelo portal{" "}
                    <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer">
                        gov.br/anpd
                    </a>.
                </p>
            </div>
        </section>
    );
}
