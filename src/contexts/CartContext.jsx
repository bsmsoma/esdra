import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { useAuth } from "./AuthContext";
import {
    getCartByUserId,
    createOrUpdateCart,
    reserveStock,
    releaseReservation,
    clearCart as clearCartFirestore,
} from "../firebase";

const CartContext = createContext();

export function CartProvider({ children }) {
    const { user } = useAuth();
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const cartItemsRef = useRef([]);

    useEffect(
        function syncCartItemsRef() {
            cartItemsRef.current = cartItems;
        },
        [cartItems]
    );

    // Load cart from localStorage or Firestore
    useEffect(function loadCart() {
        async function fetchCart() {
            try {
                if (user) {
                    // Load from Firestore
                    const cart = await getCartByUserId(user.uid);
                    if (cart && cart.items) {
                        setCartItems(cart.items);
                    } else {
                        // Try to migrate from localStorage
                        const localCart = localStorage.getItem("cart");
                        if (localCart) {
                            try {
                                const parsed = JSON.parse(localCart);
                                if (parsed.items && parsed.items.length > 0) {
                                    await createOrUpdateCart(user.uid, parsed.items);
                                    setCartItems(parsed.items);
                                    localStorage.removeItem("cart");
                                }
                            } catch (error) {
                                console.error("Erro ao migrar carrinho:", error);
                            }
                        }
                    }
                } else {
                    // Load from localStorage
                    const localCart = localStorage.getItem("cart");
                    if (localCart) {
                        try {
                            const parsed = JSON.parse(localCart);
                            setCartItems(parsed.items || []);
                        } catch (error) {
                            console.error("Erro ao carregar carrinho:", error);
                        }
                    }
                }
            } catch (error) {
                console.error("Erro ao carregar carrinho:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchCart();
    }, [user]);

    // Save cart to localStorage or Firestore
    const saveCart = useCallback(
        async function saveCart(items) {
            try {
                if (user) {
                    await createOrUpdateCart(user.uid, items);
                } else {
                    localStorage.setItem(
                        "cart",
                        JSON.stringify({
                            items: items,
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                        })
                    );
                }
            } catch (error) {
                console.error("Erro ao salvar carrinho:", error);
            }
        },
        [user]
    );

    // Add item to cart
    const addToCart = useCallback(
        async function addToCart(item) {
            try {
                const currentItems = cartItemsRef.current;

                // Check if item already exists in cart
                const existingIndex = currentItems.findIndex(function (cartItem) {
                    return (
                        cartItem.productId === item.productId &&
                        cartItem.size === item.size &&
                        cartItem.type === item.type
                    );
                });

                let newItems;
                let quantityToReserve = item.quantity;

                if (existingIndex >= 0) {
                    // Item already exists, calculate difference
                    const existingItem = currentItems[existingIndex];
                    const newQuantity = existingItem.quantity + item.quantity;
                    quantityToReserve = item.quantity; // Reserve only the additional quantity
                    newItems = [...currentItems];
                    newItems[existingIndex].quantity = newQuantity;
                } else {
                    // Add new item
                    newItems = [...currentItems, item];
                }

                // Reserve stock (only the additional quantity)
                try {
                    await reserveStock(item.productId, item.size, quantityToReserve);
                } catch (error) {
                    console.error("Erro ao reservar estoque:", error);
                    throw new Error("Estoque insuficiente");
                }

                cartItemsRef.current = newItems;
                setCartItems(newItems);
                await saveCart(newItems);
            } catch (error) {
                throw error;
            }
        },
        [saveCart]
    );

    // Remove item from cart
    const removeFromCart = useCallback(
        async function removeFromCart(productId, size, type) {
            const currentItems = cartItemsRef.current;
            const item = currentItems.find(function (cartItem) {
                return (
                    cartItem.productId === productId &&
                    cartItem.size === size &&
                    cartItem.type === type
                );
            });

            if (item) {
                // Release stock reservation
                try {
                    await releaseReservation(productId, size, item.quantity);
                } catch (error) {
                    console.error("Erro ao liberar estoque:", error);
                }
            }

            const newItems = currentItems.filter(function (cartItem) {
                return !(
                    cartItem.productId === productId &&
                    cartItem.size === size &&
                    cartItem.type === type
                );
            });

            cartItemsRef.current = newItems;
            setCartItems(newItems);
            await saveCart(newItems);
        },
        [saveCart]
    );

    // Update item quantity
    const updateQuantity = useCallback(
        async function updateQuantity(productId, size, type, newQuantity) {
            if (newQuantity <= 0) {
                await removeFromCart(productId, size, type);
                return;
            }

            const currentItems = cartItemsRef.current;
            const item = currentItems.find(function (cartItem) {
                return (
                    cartItem.productId === productId &&
                    cartItem.size === size &&
                    cartItem.type === type
                );
            });

            if (item) {
                const quantityDiff = newQuantity - item.quantity;

                // Update stock reservation
                try {
                    if (quantityDiff > 0) {
                        await reserveStock(productId, size, quantityDiff);
                    } else {
                        await releaseReservation(productId, size, Math.abs(quantityDiff));
                    }
                } catch (error) {
                    console.error("Erro ao atualizar estoque:", error);
                    throw new Error("Estoque insuficiente");
                }

                const newItems = currentItems.map(function (cartItem) {
                    if (
                        cartItem.productId === productId &&
                        cartItem.size === size &&
                        cartItem.type === type
                    ) {
                        return { ...cartItem, quantity: newQuantity };
                    }
                    return cartItem;
                });

                cartItemsRef.current = newItems;
                setCartItems(newItems);
                await saveCart(newItems);
            }
        },
        [removeFromCart, saveCart]
    );

    // Clear cart
    const clearCart = useCallback(
        async function clearCart() {
            const currentItems = cartItemsRef.current;

            // Release all stock reservations
            const releasePromises = currentItems.map(function (item) {
                return releaseReservation(item.productId, item.size, item.quantity).catch(
                    function (error) {
                        console.error("Erro ao liberar estoque:", error);
                    }
                );
            });
            await Promise.all(releasePromises);

            cartItemsRef.current = [];
            setCartItems([]);
            if (user) {
                await clearCartFirestore(user.uid);
            } else {
                localStorage.removeItem("cart");
            }
        },
        [user]
    );

    // Calculate total
    const total = useMemo(function () {
        return cartItems.reduce(function (sum, item) {
            return sum + item.price * item.quantity;
        }, 0);
    }, [cartItems]);

    // Get item count
    const itemCount = useMemo(function () {
        return cartItems.reduce(function (sum, item) {
            return sum + item.quantity;
        }, 0);
    }, [cartItems]);

    const contextValue = useMemo(
        function () {
            return {
                cartItems,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                total,
                itemCount,
                loading,
            };
        },
        [
            cartItems,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            total,
            itemCount,
            loading,
        ]
    );

    return (
        <CartContext.Provider value={contextValue}>
            {children}
        </CartContext.Provider>
    );
}

CartProvider.propTypes = {
    children: PropTypes.node,
};

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error("useCart must be used within CartProvider");
    }
    return context;
}
