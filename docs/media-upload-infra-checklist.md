# Checklist de Infra - Upload de Mídia (Firebase Functions Gen2)

Este guia evita regressões no fluxo de upload (`createUploadSession` -> PUT em URL assinada -> `commitMedia`).

## 1) Alinhamento de ambiente (obrigatório)

- Frontend (`.env.local`):
  - `VITE_FIREBASE_PROJECT_ID` deve apontar para o mesmo projeto do deploy.
  - `VITE_FIREBASE_STORAGE_BUCKET` deve ser o bucket correto do projeto.
  - `VITE_STORE_ID` deve bater com o tenant esperado em `lojas/<storeId>/...`.
- Backend (Functions):
  - `DEFAULT_STORE_ID` deve refletir o tenant padrão desejado.

## 2) Deploy das functions

No projeto correto:

```bash
firebase use <project-id>
firebase deploy --only functions
```

## 3) IAM necessário para URL assinada (signBlob)

Sem essa permissão, `createUploadSession` falha com `iam.serviceAccounts.signBlob denied`.

Passos:

1. Descobrir service account de runtime da função:

```bash
gcloud functions describe createUploadSession \
  --gen2 \
  --region=southamerica-east1 \
  --format="value(serviceConfig.serviceAccountEmail)"
```

2. Conceder Token Creator da runtime sobre ela mesma:

```bash
gcloud iam service-accounts add-iam-policy-binding <runtime-sa> \
  --member="serviceAccount:<runtime-sa>" \
  --role="roles/iam.serviceAccountTokenCreator"
```

3. Opcional (alguns projetos exigem):

```bash
gcloud iam service-accounts add-iam-policy-binding \
  service-<project-number>@gcp-sa-storage.iam.gserviceaccount.com \
  --member="serviceAccount:<runtime-sa>" \
  --role="roles/iam.serviceAccountTokenCreator"
```

## 4) CORS do bucket para ambiente local

Sem CORS, o upload via `fetch(PUT signedUrl)` falha com `No 'Access-Control-Allow-Origin'`.

Exemplo:

```json
[
  {
    "origin": ["http://localhost:5173", "http://127.0.0.1:5173"],
    "method": ["GET", "HEAD", "PUT", "POST", "OPTIONS"],
    "responseHeader": ["Content-Type", "x-goog-resumable"],
    "maxAgeSeconds": 3600
  }
]
```

Aplicação:

```bash
gsutil cors set cors.json gs://<bucket-name>
gsutil cors get gs://<bucket-name>
```

## 5) Invoker para function Gen2 (quando preflight OPTIONS retorna 403)

Se `commitMedia` falhar no preflight com 403:

```bash
gcloud functions add-invoker-policy-binding commitMedia \
  --gen2 \
  --region=southamerica-east1 \
  --member="allUsers"
```

## 6) Sintomas comuns e causa provável

- `createUploadSession` 500/400 com `signBlob denied`:
  - Falta de `roles/iam.serviceAccountTokenCreator`.
- `TypeError: Failed to fetch` no PUT da signed URL:
  - CORS do bucket não aplicado ou bloqueador de navegador.
- `OPTIONS` 403 em `commitMedia`:
  - Invoker/CORS da função Gen2 sem configuração adequada.
- Produto salvo sem miniatura:
  - Falha parcial no pipeline de mídia ou ausência de imagem no cadastro.

## 7) Verificação rápida antes de liberar

- Upload de novo produto com imagem funciona.
- Edição com troca de imagem funciona.
- Dashboard exibe miniatura.
- Logs das functions não mostram erro recorrente de IAM/CORS.

