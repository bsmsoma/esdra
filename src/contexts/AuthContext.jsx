import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { auth, onAuthStateChanged, getCustomerByUid, createOrUpdateCustomer } from "../firebase";
import { redirect } from "react-router";
import Loading from "../components/Loading";

const AuthContext = createContext();

// Wait for Firebase authentication state to be available
// Useful for React Router loaders that need to verify authentication before rendering
export function waitForAuth() {
    return new Promise(function (resolve, reject) {
        // If there's already a user, resolve immediately
        if (auth.currentUser) {
            resolve(auth.currentUser);
            return;
        }

        // Otherwise, wait for onAuthStateChanged
        const unsubscribe = onAuthStateChanged(auth, function (user) {
            unsubscribe();
            resolve(user);
        }, function (error) {
            unsubscribe();
            reject(error);
        });
    });
}

// Function to use in React Router loaders
// Checks if user is authenticated and redirects if not
export async function requireAuth() {
    // Wait for authentication state to be available
    const user = await waitForAuth();
    
    if (!user) {
        throw redirect("/login?message=Você precisa estar logado para acessar esta página");
    }

    try {
        // Check if token is still valid
        await user.getIdToken(true);
        return null;
    } catch (error) {
        console.error("Erro de autenticação:", error);
        throw redirect("/login?message=Sua sessão expirou. Por favor, faça login novamente");
    }
}

// Function to check if user is admin (using Custom Claims)
export async function isUserAdmin(user) {
    if (!user) {
        return false;
    }
    
    try {
        // Get token with custom claims
        const token = await user.getIdTokenResult(true);
        return token.claims.admin === true;
    } catch (error) {
        console.error("Erro ao verificar claims do usuário:", error);
        return false;
    }
}

// Function to use in React Router loaders for admin routes
// Checks if user is authenticated AND is admin, redirects if not
export async function requireAdminAuth() {
    // Wait for authentication state to be available
    const user = await waitForAuth();
    
    if (!user) {
        throw redirect("/login?message=Você precisa estar logado para acessar esta página");
    }

    try {
        // Check if token is still valid and get claims
        const token = await user.getIdTokenResult(true);
        const isAdmin = token.claims.admin === true;
        
        if (!isAdmin) {
            throw redirect("/login?message=Acesso negado. Esta área é restrita para administradores.");
        }
        
        return null;
    } catch (error) {
        // If it's a redirect, re-throw it
        if (error.status === 302 || error.status === 307) {
            throw error;
        }
        
        console.error("Erro de autenticação:", error);
        throw redirect("/login?message=Sua sessão expirou. Por favor, faça login novamente");
    }
}

// Function to use in React Router loaders for customer routes
// Checks if user is authenticated and creates customer profile if it doesn't exist
export async function requireCustomerAuth() {
    const user = await waitForAuth();
    
    if (!user) {
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
        throw redirect(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
    }
    
    try {
        // Check if token is still valid
        await user.getIdToken(true);
        
        // Check if it's a customer (not admin)
        // Create customer profile if it doesn't exist
        const customer = await getCustomerByUid(user.uid);
        if (!customer) {
            // Create basic customer profile
            const displayName = user.displayName || "";
            const nameParts = displayName.split(" ");
            const firstName = nameParts[0] || "";
            const lastName = nameParts.slice(1).join(" ") || "";
            
            await createOrUpdateCustomer(user.uid, {
                email: user.email || "",
                firstName: firstName,
                lastName: lastName,
                phone: user.phoneNumber || "",
                addresses: [],
                preferences: {
                    newsletter: false,
                    smsNotifications: false,
                    emailNotifications: true,
                },
            });
        } else if (
            (customer.email == null || String(customer.email).trim() === "") &&
            user.email
        ) {
            // Corrige documentos antigos em que o e-mail ficou null (ex.: campo disabled no form não era enviado no POST).
            await createOrUpdateCustomer(user.uid, {
                email: user.email,
            });
        }
        
        return null;
    } catch (error) {
        console.error("Erro de autenticação:", error);
        throw redirect("/login?message=Sua sessão expirou. Por favor, faça login novamente");
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(function() {
        const unsubscribe = onAuthStateChanged(auth, function(user) {
            setUser(user);
            try {
                if (user) {
                    // User is signed in, see docs for a list of available properties
                    // https://firebase.google.com/docs/reference/js/auth.user
                    const uid = user.uid;
                    localStorage.setItem("isLoggedIn", true);
                    
                } else {
                    // User is signed out
                    setUser(null);
                    localStorage.removeItem("isLoggedIn");
                    
                }
            } catch (error) {
                console.error("Erro ao processar autenticação:", error);
                setUser(null);
                localStorage.removeItem("isLoggedIn");
            }
            setLoading(false);
        });
        return function() {
            unsubscribe();
        };
    }, []);
    
    // Memoize the value to avoid unnecessary re-renders
    const contextValue = useMemo(function() {
        return { user };
    }, [user]);
    
    if (loading) {
        return <Loading />;
    }
    
    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}

// Hook para verificar se o usuário atual é admin
export function useIsAdmin() {
    const { user } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(function() {
        async function checkAdmin() {
            if (!user) {
                setIsAdmin(false);
                setLoading(false);
                return;
            }

            try {
                const adminStatus = await isUserAdmin(user);
                setIsAdmin(adminStatus);
            } catch (error) {
                console.error("Erro ao verificar se usuário é admin:", error);
                setIsAdmin(false);
            } finally {
                setLoading(false);
            }
        }

        checkAdmin();
    }, [user]);

    return { isAdmin, loading };
}