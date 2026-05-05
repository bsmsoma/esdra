 Passo a passo completo                                                                                                                                                                                  
                                                                                                                                                                                                          
  Parte 1 — Resend (provedor de email)                                                                                                                                                                    
                                                                                                                                                                                                          
  1. Criar conta                                                                                                                                                                                        
  Acesse resend.com → clique em Sign Up → crie com Google ou email.
                                                                                                                                                                                                          
  2. Pegar a API Key
  No painel do Resend:                                                                                                                                                                                    
  - Menu esquerdo → API Keys                                                                                                                                                                              
  - Clique Create API Key   
  - Dê um nome (ex: esdra-production)                                                                                                                                                                     
  - Permissão: Full Access                                                                                                                                                                              
  - Clique Add → copie a chave (começa com re_)
                                                                                                                                                                                                          
  ▎ Guarde bem — ela só aparece uma vez.                                                                                                                                                                  
                                                                                                                                                                                                          
  3. Verificar o domínio (para produção)                                                                                                                                                                  
  - Menu esquerdo → Domains → Add Domain                                                                                                                                                                
  - Digite o domínio: esdra.com.br                                                                                                                                                                        
  - O Resend vai mostrar 3 registros DNS para adicionar no seu provedor (Registro MX, TXT, DKIM)                                                                                                        
  - Adicione esses registros no painel DNS do seu domínio (Cloudflare, Registro.br, etc.)                                                                                                                 
  - Volte ao Resend e clique Verify DNS Records                                                                                                                                                           
                                                                                                                                                                                                          
  ▎ Para testar antes de verificar o domínio: use onboarding@resend.dev como remetente — o Resend permite isso em modo de teste, mas os emails só chegam no endereço da sua conta Resend.                 
                                                                                                                                                                                                          
  ---                                                                                                                                                                                                     
  Parte 2 — Adicionar as variáveis ao projeto                                                                                                                                                             
                                                                                                                                                                                                        
  Abra o arquivo functions/.env (já existe no projeto) e adicione as duas linhas no final:
                                                                                                                                                                                                          
  RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
  EMAIL_FROM=ESDRA Aromas <noreply@esdra.com.br>                                                                                                                                                          
                                                                                                                                                                                                        
  Substitua re_xxxxxxxxxxxxxxxxxxxx pela chave que você copiou no passo 2.                                                                                                                                
                                                                                                                                                                                                        
  ---                                                                                                                                                                                                     
  Parte 3 — Deploy das Cloud Functions                                                                                                                                                                  
                                      
  No terminal, dentro da pasta do projeto:
                                                                                                                                                                                                          
  cd functions && npm install
  cd ..                                                                                                                                                                                                   
  firebase deploy --only functions                                                                                                                                                                      

  ▎ Se não tiver o Firebase CLI instalado: npm install -g firebase-tools e depois firebase login.                                                                                                         
  
  Depois do deploy, qualquer novo pedido criado já vai disparar o email automaticamente.                                                                                                                  
                                                                                                                                                                                                        
  ---                                                                                                                                                                                                     
  Como confirmar que está funcionando                                                                                                                                                                   
                                     
  No Firebase Console (console.firebase.google.com):
  - Acesse Firestore → lojas/esdra-aromas/emailQueue                                                                                                                                                      
  - Faça um pedido de teste                                                                                                                                                                               
  - O documento criado deve mudar de status: "queued" → "processing" → "sent" em poucos segundos                                                                                                          
  - Se aparecer "failed", o campo errorMessage vai dizer exatamente o que deu errado                                                                                                                      
                                                                                                                                                                                                          
  Quer que eu adicione as duas linhas no .env agora?    