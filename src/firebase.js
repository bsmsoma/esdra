import { initializeApp } from "firebase/app";
import {
    getFirestore,
    collection,
    doc,
    deleteDoc,
    updateDoc,
    addDoc,
    getDocs,
    getDoc,
    setDoc,
    serverTimestamp,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    getCountFromServer,
    or,
    increment,
} from "firebase/firestore";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    connectAuthEmulator,
} from "firebase/auth";
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
} from "firebase/storage";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";
import { connectFirestoreEmulator } from "firebase/firestore";
import { debug } from "./utils/logger";
import { normalizeProductSizeToken } from "./utils/productSizes";

// Firebase configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase config
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const functions = getFunctions(app, "southamerica-east1");

if (import.meta.env.VITE_USE_EMULATORS === "true") {
    connectAuthEmulator(getAuth(app), "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

// Store ID for multi-tenant support
export function getStoreId() {
    return import.meta.env.VITE_STORE_ID || "esdra-aromas";
}

// Get products collection with multi-tenant structure
export function getProductsCollection() {
    return collection(db, "lojas", getStoreId(), "products");
}

// Initialize Firebase Storage
export const storage = getStorage(app);

//handle authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    createUserWithEmailAndPassword,
};

// Documents
export {
    doc,
    collection,
    deleteDoc,
    updateDoc,
    addDoc,
    setDoc,
    getDocs,
    getDoc,
    serverTimestamp,
    increment,
};

// Queries and Pagination
export { query, where, orderBy, limit, startAfter, getCountFromServer, or };

// Storage of files
export { getStorage, ref, uploadBytes, getDownloadURL, deleteObject };

// Helper function to get product document reference (multi-tenant structure)
export function getProductDocRef(productId) {
    return doc(db, "lojas", getStoreId(), "products", productId);
}

//my custom functions to handle database
// Normaliza uma string para busca flexível
export const normalizeString = (str) => {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
};

export const formatDisplayName = (str) => {
    // Capitaliza a primeira letra de cada palavra
    return str
        .trim()
        .split(" ")
        .map(
            (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ");
};

export const createSearchableArray = (str) => {
    return normalizeString(str).split(" ");
};

// Extrai o caminho da imagem a partir da URL do Firebase Storage
export const getImagePathFromUrl = (url) => {
    try {
        // URL padrão: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
        const urlObj = new URL(url);
        const pathMatch = urlObj.pathname.match(/\/o\/(.+)/);
        if (pathMatch && pathMatch[1]) {
            // Decodifica o path (ex: images%2Ffilename.jpg -> images/filename.jpg)
            return decodeURIComponent(pathMatch[1].split("?")[0]);
        }
        return null;
    } catch (error) {
        console.error("Erro ao extrair caminho da URL:", error);
        return null;
    }
};

// Deleta uma imagem do Firebase Storage
export const deleteImageFromStorage = async (imageUrl) => {
    try {
        const imagePath = getImagePathFromUrl(imageUrl);
        if (!imagePath) {
            console.error(
                "Não foi possível extrair o caminho da imagem:",
                imageUrl
            );
            return false;
        }

        const imageRef = ref(storage, imagePath);
        await deleteObject(imageRef);
        debug("Imagem deletada com sucesso:", imagePath);
        return true;
    } catch (error) {
        console.error("Erro ao deletar imagem:", error);
        return false;
    }
};

// Deleta múltiplas imagens do Firebase Storage
export const deleteImagesFromStorage = async (imageUrls) => {
    const deletePromises = imageUrls.map((url) => deleteImageFromStorage(url));
    const results = await Promise.allSettled(deletePromises);

    const successCount = results.filter(
        (result) => result.status === "fulfilled" && result.value === true
    ).length;
    const failCount = results.length - successCount;

    if (failCount > 0) {
        console.warn(
            `${failCount} imagem(ns) não puderam ser deletadas de ${results.length}`
        );
    }

    return { successCount, failCount, total: results.length };
};

// Gera um nome de arquivo formatado para upload de imagens: "Code - Nome do Produto - X.extensão"
export const formatImageFileName = (
    productCode,
    productName,
    originalFileName,
    imageIndex = 0
) => {
    // Normaliza o nome do produto removendo caracteres especiais que podem causar problemas
    const normalizedName = productName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[^a-zA-Z0-9\s]/g, "") // Remove caracteres especiais exceto letras, números e espaços
        .trim()
        .replace(/\s+/g, " "); // Remove espaços múltiplos

    // Pega a extensão do arquivo original
    const extension = originalFileName.split(".").pop().toLowerCase();

    // Formata: "Code - Nome do Produto - X.extensão" (onde X é o índice da imagem)
    return `${productCode} - ${normalizedName} - ${
        imageIndex + 1
    }.${extension}`;
};

// Gera um nome de arquivo formatado para upload de vídeos: "código-nome.extensão"
export const formatVideoFileName = (
    productCode,
    productName,
    originalFileName
) => {
    // Normaliza o nome do produto removendo caracteres especiais que podem causar problemas
    const normalizedName = productName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[^a-zA-Z0-9\s]/g, "") // Remove caracteres especiais exceto letras, números e espaços
        .trim()
        .replace(/\s+/g, "-"); // Substitui espaços por hífens

    // Pega a extensão do arquivo original
    const extension = originalFileName.split(".").pop().toLowerCase();

    // Formata: "código-nome.extensão"
    return `${productCode}-${normalizedName}.${extension}`;
};

// Gera o caminho completo no Storage para imagens de produtos (estrutura multi-tenant)
export function getProductStoragePath(productId, fileName) {
    const storeId = getStoreId();
    return `lojas/${storeId}/produtos/${productId}/imagens/${fileName}`;
}

// Gera o caminho completo no Storage para vídeos de produtos (estrutura multi-tenant)
export function getProductVideoPath(productId, fileName) {
    const storeId = getStoreId();
    return `lojas/${storeId}/produtos/${productId}/videos/${fileName}`;
}

// =============================== INVENTORY FUNCTIONS =============================== //

// Obter referência da coleção de estoque
export function getInventoryCollection(productId) {
    return collection(db, "lojas", getStoreId(), "products", productId, "inventory");
}

// Obter referência de estoque por tamanho
export function getInventorySizeRef(productId, size) {
    return doc(db, "lojas", getStoreId(), "products", productId, "inventory", size.toString());
}

// Verificar disponibilidade
export async function checkAvailability(productId, size, quantity = 1) {
    const sizeRef = getInventorySizeRef(productId, size);
    const snap = await getDoc(sizeRef);
    if (!snap.exists()) return false;
    const data = snap.data();
    const available = data.quantity - data.reserved;
    return available >= quantity;
}

// Obter quantidade disponível
export async function getAvailableQuantity(productId, size) {
    const sizeRef = getInventorySizeRef(productId, size);
    const snap = await getDoc(sizeRef);
    if (!snap.exists()) return 0;
    const data = snap.data();
    return Math.max(0, data.quantity - data.reserved);
}

// Criar ou atualizar estoque para um tamanho
export async function setInventorySize(productId, size, quantity) {
    const sizeRef = getInventorySizeRef(productId, size);
    const snap = await getDoc(sizeRef);
    
    debug(`setInventorySize - productId: ${productId}, size: ${size}, quantity: ${quantity}, exists: ${snap.exists()}`);
    
    if (snap.exists()) {
        // Se o documento já existe, preservar reserved e sold, apenas atualizar quantity
        const existingData = snap.data();
        debug(`setInventorySize - Existing data for size ${size}:`, existingData);
        await updateDoc(sizeRef, {
            quantity: quantity,
            lastUpdated: serverTimestamp(),
        });
        debug(`setInventorySize - Updated quantity to ${quantity} for size ${size}`);
    } else {
        // Se não existe, criar novo documento com valores iniciais
        const sizeForField =
            normalizeProductSizeToken(size) ??
            (size != null ? String(size) : "");
        await setDoc(sizeRef, {
            size: sizeForField,
            quantity: quantity,
            reserved: 0,
            sold: 0,
            lastUpdated: serverTimestamp(),
        });
        debug(`setInventorySize - Created new inventory document for size ${size} with quantity ${quantity}`);
    }
}

// Reservar estoque (para carrinho)
export async function reserveStock(productId, size, quantity) {
    const sizeRef = getInventorySizeRef(productId, size);
    const snap = await getDoc(sizeRef);
    
    if (!snap.exists()) {
        throw new Error(`Estoque não encontrado para produto ${productId}, tamanho ${size}`);
    }
    
    const data = snap.data();
    const available = data.quantity - data.reserved;
    
    if (available < quantity) {
        throw new Error(`Estoque insuficiente. Disponível: ${available}, Solicitado: ${quantity}`);
    }
    
    await updateDoc(sizeRef, {
        reserved: increment(quantity),
        lastUpdated: serverTimestamp(),
    });
}

// Liberar reserva (remover do carrinho)
export async function releaseReservation(productId, size, quantity) {
    const sizeRef = getInventorySizeRef(productId, size);
    const snap = await getDoc(sizeRef);
    
    if (!snap.exists()) {
        console.warn(`Estoque não encontrado para produto ${productId}, tamanho ${size}`);
        return;
    }
    
    const data = snap.data();
    const newReserved = Math.max(0, data.reserved - quantity);
    
    await updateDoc(sizeRef, {
        reserved: newReserved,
        lastUpdated: serverTimestamp(),
    });
}

// Vender (confirmar pedido)
export async function sellStock(productId, size, quantity) {
    const sizeRef = getInventorySizeRef(productId, size);
    const snap = await getDoc(sizeRef);
    
    if (!snap.exists()) {
        throw new Error(`Estoque não encontrado para produto ${productId}, tamanho ${size}`);
    }
    
    const data = snap.data();
    const available = data.quantity - data.reserved;
    
    if (available < quantity) {
        throw new Error(`Estoque insuficiente. Disponível: ${available}, Solicitado: ${quantity}`);
    }
    
    await updateDoc(sizeRef, {
        reserved: increment(-quantity),
        sold: increment(quantity),
        quantity: increment(-quantity),
        lastUpdated: serverTimestamp(),
    });
}

// Obter todos os estoques de um produto
export async function getProductInventory(productId) {
    const inventoryRef = getInventoryCollection(productId);
    const snapshot = await getDocs(inventoryRef);
    
    const inventory = {};
    snapshot.forEach((doc) => {
        inventory[doc.id] = { id: doc.id, ...doc.data() };
    });
    
    return inventory;
}

// =============================== CUSTOMER FUNCTIONS =============================== //

// Obter coleção de clientes
export function getCustomersCollection() {
    return collection(db, "lojas", getStoreId(), "customers");
}

// Obter referência de cliente
export function getCustomerDocRef(customerId) {
    return doc(db, "lojas", getStoreId(), "customers", customerId);
}

// Criar ou atualizar cliente
export async function createOrUpdateCustomer(uid, customerData) {
    const customerRef = getCustomerDocRef(uid);
    const customerSnap = await getDoc(customerRef);
    
    if (customerSnap.exists()) {
        await updateDoc(customerRef, {
            ...customerData,
            lastLogin: serverTimestamp(),
        });
        return { id: customerSnap.id, ...customerSnap.data(), ...customerData };
    } else {
        await setDoc(customerRef, {
            uid,
            ...customerData,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            isActive: true,
        });
        return { id: uid, ...customerData };
    }
}

// Buscar cliente por UID
export async function getCustomerByUid(uid) {
    const customerRef = getCustomerDocRef(uid);
    const customerSnap = await getDoc(customerRef);
    return customerSnap.exists() ? { id: customerSnap.id, ...customerSnap.data() } : null;
}

// =============================== CART FUNCTIONS =============================== //

// Obter coleção de carrinhos
export function getCartsCollection() {
    return collection(db, "lojas", getStoreId(), "carts");
}

// Obter referência de carrinho
export function getCartDocRef(userId) {
    return doc(db, "lojas", getStoreId(), "carts", userId);
}

// Obter carrinho por ID do usuário
export async function getCartByUserId(userId) {
    const cartRef = getCartDocRef(userId);
    const cartSnap = await getDoc(cartRef);
    return cartSnap.exists() ? { id: cartSnap.id, ...cartSnap.data() } : null;
}

// Criar ou atualizar carrinho
export async function createOrUpdateCart(userId, items) {
    const cartRef = getCartDocRef(userId);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expira em 7 dias

    await setDoc(
        cartRef,
        {
            items: items,
            updatedAt: serverTimestamp(),
            expiresAt: expiresAt,
        },
        { merge: true }
    );
}

// =============================== ORDER FUNCTIONS =============================== //

// Obter coleção de pedidos
export function getOrdersCollection() {
    return collection(db, "lojas", getStoreId(), "orders");
}

// Obter referência de pedido
export function getOrderDocRef(orderId) {
    return doc(db, "lojas", getStoreId(), "orders", orderId);
}

// Gerar número único do pedido
export async function generateOrderNumber() {
    const year = new Date().getFullYear();
    const ordersRef = getOrdersCollection();
    
    // Buscar último pedido do ano
    const yearQuery = query(
        ordersRef,
        where("orderNumber", ">=", `ESD-${year}-000`),
        where("orderNumber", "<", `ESD-${year + 1}-000`),
        orderBy("orderNumber", "desc"),
        limit(1)
    );
    
    const snapshot = await getDocs(yearQuery);
    
    if (snapshot.empty) {
        return `ESD-${year}-001`;
    }
    
    const lastOrder = snapshot.docs[0].data();
    const lastNumber = parseInt(lastOrder.orderNumber.split("-")[2], 10);
    const newNumber = String(lastNumber + 1).padStart(3, "0");
    
    return `ESD-${year}-${newNumber}`;
}

// Criar pedido
export async function createOrder(orderData) {
    const ordersRef = getOrdersCollection();
    const orderNumber = await generateOrderNumber();
    
    const order = {
        ...orderData,
        orderNumber: orderNumber,
        status: "pending",
        paymentStatus: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(ordersRef, order);
    return { id: docRef.id, ...order };
}

// Obter pedidos por cliente
export async function getOrdersByCustomer(customerId) {
    const ordersRef = getOrdersCollection();
    const customerQuery = query(
        ordersRef,
        where("customerId", "==", customerId),
        orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(customerQuery);
    return snapshot.docs.map(function (doc) {
        return { id: doc.id, ...doc.data() };
    });
}

// Obter todos os pedidos para operação/admin
export async function getAllOrders() {
    const ordersRef = getOrdersCollection();
    const allOrdersQuery = query(ordersRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(allOrdersQuery);
    return snapshot.docs.map(function (orderDoc) {
        return { id: orderDoc.id, ...orderDoc.data() };
    });
}

// Obter pedidos paginados para o painel admin
export async function getAllOrdersPaginated({ pageSize = 20, lastDoc = null }) {
    const ordersRef = getOrdersCollection();
    const constraints = [orderBy("createdAt", "desc"), limit(pageSize)];
    if (lastDoc) {
        constraints.push(startAfter(lastDoc));
    }
    const q = query(ordersRef, ...constraints);
    const snapshot = await getDocs(q);
    const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
    return {
        orders: snapshot.docs.map(function (d) { return { id: d.id, ...d.data() }; }),
        lastDoc: lastVisible,
        hasMore: snapshot.docs.length === pageSize,
    };
}

// Obter pedido por ID
export async function getOrderById(orderId) {
    const orderRef = getOrderDocRef(orderId);
    const orderSnap = await getDoc(orderRef);
    return orderSnap.exists() ? { id: orderSnap.id, ...orderSnap.data() } : null;
}

// Atualizar status do pedido
export async function updateOrderStatus(orderId, status, adminNotes = "") {
    const orderRef = getOrderDocRef(orderId);
    const updateData = {
        status: status,
        updatedAt: serverTimestamp(),
    };
    
    if (adminNotes) {
        updateData.adminNotes = adminNotes;
    }
    
    await updateDoc(orderRef, updateData);
}

// Atualizar status de pagamento do pedido
export async function updateOrderPaymentStatus(orderId, paymentStatus) {
    const orderRef = getOrderDocRef(orderId);
    await updateDoc(orderRef, {
        paymentStatus: paymentStatus,
        updatedAt: serverTimestamp(),
    });
}

// Mockup function to simulate payment processing
export async function processMockPayment(orderId, paymentMethod) {
    // Simulate payment processing delay (500ms - 2s)
    const delay = Math.floor(Math.random() * 1500) + 500;
    await new Promise(function (resolve) {
        return setTimeout(resolve, delay);
    });
    
    // Simulate 95% success rate
    const success = Math.random() > 0.05;
    
    if (success) {
        await updateOrderPaymentStatus(orderId, "paid");
        await updateOrderStatus(orderId, "confirmed");
        return {
            success: true,
            message: `Pagamento ${paymentMethod || "mock"} processado com sucesso`,
        };
    } else {
        await updateOrderPaymentStatus(orderId, "failed");
        return {
            success: false,
            message: `Falha no processamento do pagamento ${paymentMethod || "mock"}`,
        };
    }
}

// Limpar carrinho
export async function clearCart(userId) {
    const cartRef = getCartDocRef(userId);
    await setDoc(cartRef, {
        items: [],
        updatedAt: serverTimestamp(),
    }, { merge: true });
}

// =============================== CLOUD FUNCTIONS =============================== //

export async function createOrderSecure({
    cartItems,
    shippingAddress,
    shippingAmount,
    paymentMethod,
    customer,
    notes = "",
    idempotencyKey,
    storeId = getStoreId(),
}) {
    const callable = httpsCallable(functions, "createOrder");
    const response = await callable({
        cartItems,
        shippingAddress,
        shippingAmount,
        paymentMethod,
        customer,
        notes,
        idempotencyKey,
        storeId,
    });
    return response.data;
}

export async function updateOrderStatusByAdmin({
    orderId,
    status,
    paymentStatus = "",
    adminNotes = "",
    storeId = getStoreId(),
}) {
    const callable = httpsCallable(functions, "updateOrderStatusByAdmin");
    const response = await callable({
        orderId,
        status,
        paymentStatus,
        adminNotes,
        storeId,
    });
    return response.data;
}

export async function cancelOrderByCustomer({ orderId, storeId = getStoreId() }) {
    const callable = httpsCallable(functions, "cancelOrderByCustomer");
    const response = await callable({ orderId, storeId });
    return response.data;
}

export async function createUploadSession({
    productId,
    filesMeta,
    storeId = getStoreId(),
}) {
    const callable = httpsCallable(functions, "createUploadSession");
    const response = await callable({
        productId,
        filesMeta,
        storeId,
    });
    return response.data;
}

export async function commitMedia({
    productId,
    uploadedObjects,
    keepExistingImageUrls = [],
    removedImageUrls = [],
    replaceVideo = false,
    removeVideo = false,
    oldVideoUrl = "",
    storeId = getStoreId(),
}) {
    const callable = httpsCallable(functions, "commitMedia");
    const response = await callable({
        productId,
        uploadedObjects,
        keepExistingImageUrls,
        removedImageUrls,
        replaceVideo,
        removeVideo,
        oldVideoUrl,
        storeId,
    });
    return response.data;
}

export async function deleteMediaSecure({
    productId,
    mediaUrls = [],
    objectKeys = [],
    storeId = getStoreId(),
}) {
    const callable = httpsCallable(functions, "deleteMedia");
    const response = await callable({
        productId,
        mediaUrls,
        objectKeys,
        storeId,
    });
    return response.data;
}

export async function uploadFileWithSignedUrl(file, signedUrl, contentType) {
    const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        headers: {
            "Content-Type": contentType || file.type || "application/octet-stream",
        },
        body: file,
    });

    if (!uploadResponse.ok) {
        throw new Error("Falha no upload de mídia.");
    }
}

