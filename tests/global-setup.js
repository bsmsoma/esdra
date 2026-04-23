import { spawn } from "child_process";
import { writeFile, mkdir, readFile } from "fs/promises";
import admin from "firebase-admin";

// Load .env.local into process.env (Vite handles this for the app, but not for Node scripts)
try {
  const raw = await readFile(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of raw.split("\n")) {
    const match = line.match(/^([^#\s][^=]*)=(.*)$/);
    if (match && !(match[1] in process.env)) process.env[match[1].trim()] = match[2].trim();
  }
} catch { /* .env.local opcional em CI — usar variáveis de ambiente do sistema */ }

const PROJECT_ID = "esdra-ba71d";
const STORE_ID = "esdra-aromas";
const API_KEY = process.env.VITE_FIREBASE_API_KEY;
if (!API_KEY) throw new Error("VITE_FIREBASE_API_KEY não definida. Verifique o arquivo .env.local.");

export const TEST_USER_EMAIL = "test-checkout@esdra.test";
export const TEST_USER_PASSWORD = "TestPass123!";
export const TEST_PRODUCT_ID = "test-product-e2e";

let emulatorProcess;

async function waitForUrl(url, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const resp = await fetch(url);
      if (resp.status < 500) return;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Emulator at ${url} not ready after ${maxAttempts}s`);
}

async function startEmulators() {
  console.log("[setup] Starting Firebase emulators...");
  emulatorProcess = spawn(
    "firebase",
    ["emulators:start", "--only", "auth,firestore,functions", "--project", PROJECT_ID],
    { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"], detached: false }
  );

  emulatorProcess.stdout.on("data", (d) => {
    const line = d.toString().trim();
    if (line.includes("All emulators ready")) console.log("[emulator] Ready");
  });
  emulatorProcess.stderr.on("data", (d) => {
    const line = d.toString().trim();
    if (line && !line.includes("ExperimentalWarning")) console.error("[emulator]", line);
  });

  // Store PID for teardown
  process.env.EMULATOR_PID = String(emulatorProcess.pid);

  await waitForUrl("http://127.0.0.1:9099/");
  await waitForUrl("http://127.0.0.1:8080/");
  console.log("[setup] Emulators ready");
}

async function initAdmin() {
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

  if (!admin.apps.length) {
    admin.initializeApp({ projectId: PROJECT_ID });
  }
}

async function getOrCreateTestUser() {
  const auth = admin.auth();
  try {
    const user = await auth.getUserByEmail(TEST_USER_EMAIL);
    return user.uid;
  } catch {
    const user = await auth.createUser({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      emailVerified: true,
      displayName: "Test User",
    });
    return user.uid;
  }
}

async function seedFirestoreData(uid) {
  const db = admin.firestore();
  const batch = db.batch();

  batch.set(db.doc(`lojas/${STORE_ID}/customers/${uid}`), {
    uid,
    firstName: "Test",
    lastName: "User",
    email: TEST_USER_EMAIL,
    phone: "11999999999",
    document: "12345678900",
    addresses: [
      {
        id: "addr-test-1",
        name: "Casa",
        type: "home",
        street: "Rua das Flores",
        number: "123",
        complement: "",
        neighborhood: "Centro",
        city: "São Paulo",
        state: "SP",
        zipCode: "01000-000",
        isDefault: true,
      },
    ],
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastLogin: admin.firestore.FieldValue.serverTimestamp(),
  });

  batch.set(db.doc(`lojas/${STORE_ID}/carts/${uid}`), {
    items: [
      {
        productId: TEST_PRODUCT_ID,
        productName: "Perfume Teste Floral",
        size: "M",
        quantity: 1,
        price: 199.9,
        type: "sale",
      },
    ],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  batch.set(db.doc(`lojas/${STORE_ID}/products/${TEST_PRODUCT_ID}`), {
    name: "Perfume Teste Floral",
    code: "TST-001",
    sku: "TST-001-M",
    sellValue: 199.9,
    images: ["https://placehold.co/400x400"],
    coverIndex: 0,
    isActive: true,
  });

  batch.set(db.doc(`lojas/${STORE_ID}/products/${TEST_PRODUCT_ID}/inventory/M`), {
    size: "M",
    quantity: 9999,
    reserved: 0,
    sold: 0,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Reset order counter so order numbers are predictable
  batch.set(
    db.doc(`lojas/${STORE_ID}/meta/orderCounter`),
    { year: new Date().getFullYear(), value: 0 },
    { merge: true }
  );

  await batch.commit();
  console.log("[setup] Firestore test data seeded");
}

async function createAuthStorageState(uid) {
  // Sign in via Auth emulator REST API to get real (emulated) tokens
  const signInResp = await fetch(
    `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
        returnSecureToken: true,
      }),
    }
  );

  if (!signInResp.ok) {
    throw new Error(`Auth sign-in failed: ${await signInResp.text()}`);
  }

  const { idToken, refreshToken } = await signInResp.json();

  const authState = {
    uid,
    email: TEST_USER_EMAIL,
    emailVerified: true,
    displayName: "Test User",
    isAnonymous: false,
    providerData: [
      {
        providerId: "password",
        uid: TEST_USER_EMAIL,
        email: TEST_USER_EMAIL,
        displayName: null,
        photoURL: null,
        phoneNumber: null,
      },
    ],
    stsTokenManager: {
      refreshToken,
      accessToken: idToken,
      expirationTime: Date.now() + 3600 * 1000,
    },
    createdAt: String(Date.now()),
    lastLoginAt: String(Date.now()),
    apiKey: API_KEY,
    appName: "[DEFAULT]",
  };

  const storageState = {
    cookies: [],
    origins: [
      {
        origin: "http://127.0.0.1:4174",
        localStorage: [
          {
            name: `firebase:authUser:${API_KEY}:[DEFAULT]`,
            value: JSON.stringify(authState),
          },
        ],
      },
    ],
  };

  await mkdir("tests/.auth", { recursive: true });
  await writeFile("tests/.auth/user.json", JSON.stringify(storageState, null, 2));
  console.log("[setup] Auth state saved to tests/.auth/user.json");
}

export default async function globalSetup() {
  await startEmulators();
  await initAdmin();
  const uid = await getOrCreateTestUser();
  await seedFirestoreData(uid);
  await createAuthStorageState(uid);
  console.log("[setup] Global setup complete. Test UID:", uid);
}
