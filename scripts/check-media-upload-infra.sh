#!/usr/bin/env bash
set -euo pipefail

# Script de apoio para checar (e opcionalmente aplicar) requisitos de infra
# do fluxo de upload de mídia.
#
# Uso:
#   ./scripts/check-media-upload-infra.sh \
#     --project esdra-ba71d \
#     --bucket esdra-ba71d.firebasestorage.app
#
# Opcional para aplicar CORS:
#   ./scripts/check-media-upload-infra.sh \
#     --project esdra-ba71d \
#     --bucket esdra-ba71d.firebasestorage.app \
#     --apply-cors

PROJECT_ID=""
BUCKET_NAME=""
APPLY_CORS="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)
      PROJECT_ID="${2:-}"
      shift 2
      ;;
    --bucket)
      BUCKET_NAME="${2:-}"
      shift 2
      ;;
    --apply-cors)
      APPLY_CORS="true"
      shift 1
      ;;
    *)
      echo "Argumento inválido: $1"
      exit 1
      ;;
  esac
done

if [[ -z "$PROJECT_ID" || -z "$BUCKET_NAME" ]]; then
  echo "Uso: $0 --project <project-id> --bucket <bucket-name> [--apply-cors]"
  exit 1
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud não encontrado. Use Cloud Shell ou instale o Google Cloud SDK."
  exit 1
fi

if ! command -v gsutil >/dev/null 2>&1; then
  echo "gsutil não encontrado. Use Cloud Shell para aplicar/consultar CORS."
  exit 1
fi

echo "-> Configurando projeto: $PROJECT_ID"
gcloud config set project "$PROJECT_ID" >/dev/null

echo "-> Descobrindo número do projeto"
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
echo "   projectNumber: $PROJECT_NUMBER"

echo "-> Lendo service account de runtime da createUploadSession"
RUNTIME_SA="$(gcloud functions describe createUploadSession \
  --gen2 \
  --region=southamerica-east1 \
  --format='value(serviceConfig.serviceAccountEmail)')"
echo "   runtimeSA: $RUNTIME_SA"

echo "-> Conferindo bucket"
gcloud storage buckets describe "gs://$BUCKET_NAME" --format='value(name)' >/dev/null
echo "   bucket ok: $BUCKET_NAME"

echo "-> CORS atual no bucket (se vier vazio/null, CORS pode não estar configurado)"
gsutil cors get "gs://$BUCKET_NAME" || true

if [[ "$APPLY_CORS" == "true" ]]; then
  echo "-> Aplicando CORS padrão para localhost:5173"
  cat > /tmp/esdra-cors.json <<'EOF'
[
  {
    "origin": ["http://localhost:5173", "http://127.0.0.1:5173"],
    "method": ["GET", "HEAD", "PUT", "POST", "OPTIONS"],
    "responseHeader": ["Content-Type", "x-goog-resumable"],
    "maxAgeSeconds": 3600
  }
]
EOF
  gsutil cors set /tmp/esdra-cors.json "gs://$BUCKET_NAME"
  echo "-> CORS aplicado. Estado atual:"
  gsutil cors get "gs://$BUCKET_NAME"
fi

cat <<EOF

Próximas checagens manuais:
1) Se houver erro signBlob:
   gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" \\
     --member="serviceAccount:$RUNTIME_SA" \\
     --role="roles/iam.serviceAccountTokenCreator"

2) Se commitMedia der OPTIONS 403:
   gcloud functions add-invoker-policy-binding commitMedia \\
     --gen2 \\
     --region=southamerica-east1 \\
     --member="allUsers"

3) Revalidar upload no admin (add/edit produto com imagem).
EOF

