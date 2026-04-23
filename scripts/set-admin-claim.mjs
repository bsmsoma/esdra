/**
 * Define ou remove o custom claim `admin: true` no Firebase Auth (necessário para /dashboard).
 *
 * Pré-requisitos:
 * - Conta de serviço com permissão "Firebase Authentication Admin" (ou papel Editor no projeto).
 * - JSON da conta de serviço: variável de ambiente OU arquivo em um dos caminhos padrão (veja loadServiceAccount).
 *
 * Uso por UID:
 *   GOOGLE_APPLICATION_CREDENTIALS=./secrets/serviceAccount.json node scripts/set-admin-claim.mjs <UID>
 *   npm run set-admin -- abc123xyz
 *
 * Uso por e-mail (detecta automaticamente se contiver @):
 *   npm run set-admin -- admin@loja.com
 *
 * Forçar interpretação como e-mail (ex.: teste raro):
 *   npm run set-admin -- --email usuario@dominio.com
 *
 * Remover privilégio de admin (claim vira admin: false):
 *   npm run set-admin -- usuario@dominio.com --revoke
 *
 * O UID está em Firebase Console → Authentication → usuário → User UID.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const DEFAULT_CREDENTIAL_FILES = [
    "scripts/firebase-service-account.json",
    "secrets/serviceAccount.json",
    "secrets/firebase-service-account.json",
];

function looksLikeServiceAccountJson(parsed) {
    return (
        parsed &&
        typeof parsed === "object" &&
        parsed.type === "service_account" &&
        typeof parsed.private_key === "string" &&
        typeof parsed.client_email === "string"
    );
}

/**
 * Qualquer JSON válido de conta de serviço em secrets/ (ex.: *-firebase-adminsdk-*.json baixado do Console).
 */
function findCredentialInSecretsDir() {
    const secretsDir = resolve(process.cwd(), "secrets");
    if (!existsSync(secretsDir)) {
        return null;
    }

    let entries;
    try {
        entries = readdirSync(secretsDir, { withFileTypes: true });
    } catch {
        return null;
    }

    const jsonNames = entries
        .filter(function (e) {
            return e.isFile() && e.name.endsWith(".json");
        })
        .map(function (e) {
            return e.name;
        });

    const scored = jsonNames.map(function (name) {
        const prefersAdminSdk = name.includes("firebase-adminsdk") ? 0 : 1;
        return { name, prefersAdminSdk };
    });
    scored.sort(function (a, b) {
        if (a.prefersAdminSdk !== b.prefersAdminSdk) {
            return a.prefersAdminSdk - b.prefersAdminSdk;
        }
        return a.name.localeCompare(b.name);
    });

    for (let i = 0; i < scored.length; i += 1) {
        const absolutePath = join(secretsDir, scored[i].name);
        try {
            const parsed = JSON.parse(readFileSync(absolutePath, "utf8"));
            if (looksLikeServiceAccountJson(parsed)) {
                return absolutePath;
            }
        } catch {
            /* ignora JSON inválido ou ilegível */
        }
    }

    return null;
}

function readCredentialCert(absolutePath) {
    try {
        const json = JSON.parse(readFileSync(absolutePath, "utf8"));
        return cert(json);
    } catch (err) {
        console.error("Não foi possível ler o JSON da conta de serviço:", absolutePath);
        console.error(err.message);
        process.exit(1);
    }
}

function loadServiceAccount() {
    const fromEnv = (
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        process.env.FIREBASE_SERVICE_ACCOUNT ||
        ""
    ).trim();

    if (fromEnv) {
        const absolutePath = resolve(process.cwd(), fromEnv);
        if (!existsSync(absolutePath)) {
            console.error("Arquivo de credencial não encontrado:", absolutePath);
            console.error(
                "Ajuste GOOGLE_APPLICATION_CREDENTIALS ou FIREBASE_SERVICE_ACCOUNT para o caminho correto do JSON.",
            );
            process.exit(1);
        }
        return readCredentialCert(absolutePath);
    }

    for (let i = 0; i < DEFAULT_CREDENTIAL_FILES.length; i += 1) {
        const relative = DEFAULT_CREDENTIAL_FILES[i];
        const absolutePath = resolve(process.cwd(), relative);
        if (existsSync(absolutePath)) {
            return readCredentialCert(absolutePath);
        }
    }

    const fromSecretsDir = findCredentialInSecretsDir();
    if (fromSecretsDir) {
        return readCredentialCert(fromSecretsDir);
    }

    console.error("Nenhuma credencial de conta de serviço encontrada.");
    console.error("");
    console.error("Opção 1 — variável de ambiente (recomendado):");
    console.error(
        '  export GOOGLE_APPLICATION_CREDENTIALS="/caminho/absoluto/seu-projeto-firebase-adminsdk-xxxxx.json"',
    );
    console.error("  npm run set-admin -- seu@email.com");
    console.error("");
    console.error("Opção 2 — coloque o JSON baixado do Firebase em um destes locais (raiz do repo):");
    DEFAULT_CREDENTIAL_FILES.forEach(function (p) {
        console.error("  -", p);
    });
    console.error("  - secrets/*.json (conta de serviço; prioriza nome *firebase-adminsdk*)");
    console.error("");
    console.error(
        "Obter o arquivo: Firebase Console → Project settings → Service accounts → Generate new private key.",
    );
    process.exit(1);
}

function parseArgs(argv) {
    const args = argv.slice(2);
    const revoke = args.includes("--revoke");
    const filtered = args.filter(function (a) {
        return a !== "--revoke";
    });

    const emailFlagIndex = filtered.indexOf("--email");
    let byEmail = false;
    let identifier;

    if (emailFlagIndex !== -1) {
        byEmail = true;
        identifier = filtered[emailFlagIndex + 1];
        if (!identifier || identifier.startsWith("--")) {
            console.error("Uso: após --email informe o endereço (ex.: --email admin@loja.com).");
            process.exit(1);
        }
    } else {
        const positional = filtered.filter(function (a) {
            return !a.startsWith("--");
        });
        identifier = positional[0];
        if (identifier && identifier.includes("@")) {
            byEmail = true;
        }
    }

    return { identifier, revoke, byEmail };
}

async function resolveUserRecord(auth, identifier, byEmail) {
    if (byEmail) {
        try {
            return await auth.getUserByEmail(identifier.trim().toLowerCase());
        } catch (err) {
            if (err.code === "auth/user-not-found") {
                console.error("Nenhum usuário encontrado com este e-mail:", identifier);
                process.exit(1);
            }
            throw err;
        }
    }

    try {
        return await auth.getUser(identifier);
    } catch (err) {
        if (err.code === "auth/user-not-found") {
            console.error("Nenhum usuário encontrado com este UID:", identifier);
            process.exit(1);
        }
        throw err;
    }
}

async function main() {
    const { identifier, revoke, byEmail } = parseArgs(process.argv);

    if (!identifier) {
        console.error("Uso:");
        console.error("  node scripts/set-admin-claim.mjs <UID> [--revoke]");
        console.error("  node scripts/set-admin-claim.mjs <email@dominio.com> [--revoke]");
        console.error("  node scripts/set-admin-claim.mjs --email <email@dominio.com> [--revoke]");
        console.error("Exemplos:");
        console.error("  npm run set-admin -- abc123xyz");
        console.error("  npm run set-admin -- admin@loja.com");
        process.exit(1);
    }

    initializeApp({
        credential: loadServiceAccount(),
    });

    const auth = getAuth();
    const user = await resolveUserRecord(auth, identifier, byEmail);
    const uid = user.uid;

    if (revoke) {
        await auth.setCustomUserClaims(uid, { admin: false });
        console.log("Claim atualizado: admin=false (usuário deve fazer login de novo ou aguardar renovação do token).");
    } else {
        await auth.setCustomUserClaims(uid, { admin: true });
        console.log("Claim atualizado: admin=true (usuário deve fazer login de novo ou forçar refresh do token).");
    }

    const updated = await auth.getUser(uid);
    console.log(
        "OK —",
        updated.uid,
        updated.email || "(sem email)",
        "| customClaims:",
        updated.customClaims || {},
    );
}

main().catch(function (err) {
    console.error(err);
    process.exit(1);
});
