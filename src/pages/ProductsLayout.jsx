import React, { useState, useRef, useEffect, createContext, useContext, useMemo } from "react";
import styles from "./ProductsLayout.module.scss";
import { Outlet, useLoaderData, useLocation, useSearchParams } from "react-router";
import SidebarContent from "../components/SidebarContent";
import { FilterIcon } from "../assets/icons";
import { getProductsCollection, getDocs, query, where, orderBy, limit, or } from "../firebase";
import { normalizeString } from "../firebase";
import { normalizeProductSizeToken } from "../utils/productSizes";
import { generateCacheKey, getCachedData, setCachedData } from "../utils/cache";

// =============================== OVERVIEW =============================== //
// This layout handles UI States, Context and LoaderData for:
// productsCardsLayout and sideBarContent

// =============================== CONSTANTS =============================== //

// =============================== CONTEXT =============================== //
export const ProductsContext = createContext();

function getProductPrice(product) {
    if (product.sellValue != null) {
        return product.sellValue;
    }
    if (product.rentValue != null) {
        return product.rentValue;
    }
    return null;
}

function categoryMatchesFilter(product, categoryFilter) {
    if (!categoryFilter) {
        return true;
    }

    const normalizedFilter = normalizeString(categoryFilter);
    const normalizedProductCategory =
        product.searchableCategory || normalizeString(product.category || "");

    return normalizedProductCategory === normalizedFilter;
}

// =============================== HELPER FUNCTIONS =============================== //
/**
 * Applies client-side filters to products array
 * Used when text search is active to avoid Firestore query incompatibilities
 * @param {Array} products - Array of products to filter
 * @param {Object} filters - Filter parameters
 * @returns {Array} Filtered products
 */
function applyClientFilters(products, filters) {
    return products.filter(function (product) {
        const productPrice = getProductPrice(product);

        // Unified price filter
        if (filters.minPrice && productPrice != null && productPrice < parseInt(filters.minPrice)) {
            return false;
        }
        if (filters.maxPrice && productPrice != null && productPrice > parseInt(filters.maxPrice)) {
            return false;
        }
        if ((filters.minPrice || filters.maxPrice) && productPrice == null) {
            return false;
        }

        // Size filter (supports multiple sizes)
        if (filters.size) {
            const sizes = filters.size.split(",").map(function (s) {
                return parseInt(s.trim());
            }).filter(function (s) {
                return !isNaN(s);
            });
            
            if (sizes.length > 0) {
                // Check if product has availableSizes array (for suits/ternos)
                if (Array.isArray(product.availableSizes) && product.availableSizes.length > 0) {
                    const normalizedAvailableSizes = product.availableSizes
                        .map(function (size) {
                            return normalizeProductSizeToken(size);
                        })
                        .filter(function (s) {
                            return s != null;
                        });

                    const numericSizesInProduct = normalizedAvailableSizes.filter(
                        function (s) {
                            return typeof s === "number";
                        }
                    );

                    // Só tamanho simbólico (ex.: "unico"): não excluir por filtro numérico legado
                    if (
                        numericSizesInProduct.length === 0 &&
                        normalizedAvailableSizes.length > 0
                    ) {
                        // mantém o produto na listagem
                    } else {
                        const hasMatchingSize = sizes.some(function (selectedSize) {
                            return normalizedAvailableSizes.includes(selectedSize);
                        });
                        if (!hasMatchingSize) {
                            return false;
                        }
                    }
                } else if (product.size !== undefined && product.size !== null) {
                    const token = normalizeProductSizeToken(product.size);
                    if (token == null) {
                        return false;
                    }
                    if (typeof token === "string") {
                        // tamanho simbólico único — não excluir por filtro numérico
                    } else if (!sizes.includes(token)) {
                        return false;
                    }
                } else {
                    // Product has no size information, exclude it
                    return false;
                }
            }
        }

        // Color filter (supports multiple colors)
        if (filters.color) {
            const colors = filters.color.split(",").map(function (c) {
                return c.trim();
            }).filter(function (c) {
                return c.length > 0;
            });
            
            if (colors.length > 0 && !colors.includes(product.color)) {
                return false;
            }
        }

        // Collection filter
        if (filters.collection) {
            const normalizedCollection = normalizeString(filters.collection);
            if (product.searchableCollection !== normalizedCollection) {
                return false;
            }
        }

        return true;
    });
}

// =============================== LOADER =============================== //
export async function productsLayoutLoader({ request }) {
    // get the url parameters
    const url = new URL(request.url);
    
    // Generate cache key based on all query parameters
    const cacheParams = {
        category: url.searchParams.get("category") || "",
        query: url.searchParams.get("query") || "",
        minPrice: url.searchParams.get("minPrice") || "",
        maxPrice: url.searchParams.get("maxPrice") || "",
        size: url.searchParams.get("size") || "",
        color: url.searchParams.get("color") || "",
        collection: url.searchParams.get("collection") || "",
        page: url.searchParams.get("page") || "1",
    };
    
    const cacheKey = generateCacheKey("productsLayout", cacheParams);
    
    // Try to get from cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData !== null) {
        return cachedData;
    }

    // get the category parameter from url parameters "products?category=..."
    const urlQueryCategory = url.searchParams.get("category");

    // get the search query from url parameters "products?query=..."
    const urlQuerySearch = url.searchParams.get("query");

    // get unified min and max price values from url parameters
    const urlQueryMinPrice = url.searchParams.get("minPrice") || url.searchParams.get("minSalePrice");
    const urlQueryMaxPrice = url.searchParams.get("maxPrice") || url.searchParams.get("maxSalePrice");

    // get the size parameter from url parameters "products?size=..."
    const urlQuerySize = url.searchParams.get("size");

    // get the color parameter from url parameters "products?color=..."
    const urlQueryColor = url.searchParams.get("color");

    // get the collection parameter from url parameters "products?collection=..."
    const urlQueryCollection = url.searchParams.get("collection");

    // get the page parameter from url parameters "products?page=..."
    const urlQueryPage = url.searchParams.get("page");
    const currentPage = urlQueryPage ? parseInt(urlQueryPage, 10) : 1;

    try {
        /**
         * Calculates filter data (prices, sizes, colors) from a products array
         * This ensures filters reflect the actual search results
         * @param {Array} products - Array of products to analyze
         * @returns {Object} Filter data (min/max prices, sizes, colors, collection name)
         */
        function calculateFilterData(products) {
            // Calculate unified price range (filter out null values)
            const allPrices = products
                .map(function (product) {
                    return getProductPrice(product);
                })
                .filter(function (price) {
                    return price != null;
                });
            const filteredMinPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
            const filteredMaxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0;

            // Extract unique sizes and colors
            // For sizes: prioritize availableSizes (array) with fallback to size (single value)
            const allSizes = products.flatMap(function (product) {
                // Check if product has availableSizes array (for suits/ternos)
                if (Array.isArray(product.availableSizes) && product.availableSizes.length > 0) {
                    return product.availableSizes;
                }
                // Fallback to single size property
                if (product.size !== undefined && product.size !== null) {
                    return [product.size];
                }
                return [];
            }).filter(function (size) {
                // Filter out invalid values (undefined, null, NaN)
                return size !== undefined && size !== null && !isNaN(size);
            }).map(function (size) {
                // Convert strings to numbers and ensure numeric type
                const numSize = typeof size === 'string' ? parseInt(size, 10) : size;
                return isNaN(numSize) ? null : numSize;
            }).filter(function (size) {
                return size !== null;
            });
            
            // Remove duplicates and sort numerically
            const filteredProductSizes = [...new Set(allSizes)].sort(function (a, b) {
                return a - b;
            });
            
            const filteredProductColors = [...new Set(products.flatMap(function (product) {
                return product.color;
            }))];

            // Get collection display name from first product
            const collectionDisplayName = products.length > 0 && products[0].collection ? products[0].collection : null;

            // Extract unique collections from all filtered products
            const collections = [...new Set(
                products.map(function (p) { return p.collection; }).filter(Boolean)
            )].sort();

            return {
                filteredMinPrice,
                filteredMaxPrice,
                filteredProductSizes,
                filteredProductColors,
                collectionDisplayName,
                collections,
            };
        }

        /**
         * HYBRID STRATEGY for efficient product filtering:
         * 
         * STRATEGY 1 - WITH TEXT SEARCH:
         * When user searches by text, we prioritize the search and fetch more results (100 docs).
         * This avoids Firestore limitations with combining or() + orderBy() + range filters.
         * 
         * Multi-term search behavior:
         * - Firestore: Uses or() to fetch products containing ANY search term
         * - Client-side: Filters to ensure ALL terms are present
         * - Example: "vestido preto" returns only products with BOTH words
         * 
         * Additional filters (price, size, color) are applied CLIENT-SIDE.
         * Cost: ~100 reads per search (acceptable for 300 products catalog).
         * 
         * STRATEGY 2 - WITHOUT TEXT SEARCH:
         * When no text search, all filters are applied in Firestore for optimal performance.
         * Fetches all matching products to calculate dynamic filters accurately.
         * This ensures filter options reflect actual available products.
         * Cost: Variable based on category/filters (typically 20-150 reads).
         * 
         * NOTE: Filter data is now calculated from actual filtered products,
         * ensuring filters only show relevant options (e.g., if search returns 0 products,
         * filters will be empty too).
         * 
         * This approach solves Firestore query incompatibilities while maintaining good performance.
         */
        async function getFilteredProducts() {
            // STRATEGY 1: TEXT SEARCH ACTIVE
            if (urlQuerySearch) {
                const normalizedQuery = normalizeString(urlQuerySearch);
                const searchTerms = normalizedQuery.split(" ").filter(function (term) {
                    return term.length > 0;
                });

                // Build base query with ordering by code (most recent first)
                let q = query(getProductsCollection(), orderBy("code", "desc"));

                // Build search conditions using or()
                const searchConditions = [
                    where("searchableName", "==", normalizedQuery),
                    where("searchableCategory", "==", normalizedQuery),
                    where("searchableColor", "==", normalizedQuery),
                ];

                // Add array-contains conditions for each search term
                if (searchTerms.length > 0) {
                    searchTerms.forEach(function (term) {
                        searchConditions.push(where("searchableNameArray", "array-contains", term));
                    });
                }

                // Apply the or() search conditions
                q = query(q, or(...searchConditions));

                // Fetch more results (100) to ensure enough products after client-side filtering
                q = query(q, limit(100));

                const snapshot = await getDocs(q);
                let products = snapshot.docs.map(function (doc) {
                    return {
                        ...doc.data(),
                        id: doc.id,
                    };
                });

                // Category is filtered client-side using normalized values.
                // This avoids strict equality issues (accent/case mismatches)
                // and supports legacy products that may not have searchableCategory.
                if (urlQueryCategory) {
                    products = products.filter(function (product) {
                        return categoryMatchesFilter(product, urlQueryCategory);
                    });
                }

                // Filter to ensure ALL search terms are present (not just ANY)
                // This ensures "vestido preto" returns only black dresses, not all dresses
                if (searchTerms.length > 1) {
                    products = products.filter(function (product) {
                        // Combine all searchable fields into a single string
                        const searchableContent = [
                            product.searchableName || '',
                            product.searchableCategory || '',
                            product.searchableColor || '',
                            product.searchableCollection || '',
                        ].join(' ');

                        // Check if ALL search terms are present in the content
                        return searchTerms.every(function (term) {
                            return searchableContent.includes(term);
                        });
                    });
                }

                // Apply remaining filters CLIENT-SIDE to avoid Firestore query incompatibilities
                products = applyClientFilters(products, {
                    minPrice: urlQueryMinPrice,
                    maxPrice: urlQueryMaxPrice,
                    size: urlQuerySize,
                    color: urlQueryColor,
                    collection: urlQueryCollection,
                });

                return products;
            }

            // STRATEGY 2: NO TEXT SEARCH - Apply all filters in Firestore
            // Order by code (most recent first) - higher codes are newer products
            let q = query(getProductsCollection(), orderBy("code", "desc"));

            // Size filter is applied client-side to support products with availableSizes array
            // Firestore queries don't support array-contains-any for availableSizes efficiently
            // So we fetch all products matching other filters and filter by size client-side
            // Note: Size filter will be applied after fetching products

            // Apply color filter (supports multiple colors)
            if (urlQueryColor) {
                const colors = urlQueryColor.split(",").map(function (c) {
                    return c.trim();
                }).filter(function (c) {
                    return c.length > 0;
                });
                
                if (colors.length > 0) {
                    if (colors.length === 1) {
                        q = query(q, where("color", "==", colors[0]));
                    } else {
                        q = query(q, where("color", "in", colors));
                    }
                }
            }

            // Apply collection filter
            if (urlQueryCollection) {
                const normalizedCollection = normalizeString(urlQueryCollection);
                q = query(q, where("searchableCollection", "==", normalizedCollection));
            }

            // Fetch all matching products to calculate filters dynamically
            // With 300 products catalog, this is acceptable performance-wise
            const snapshot = await getDocs(q);
            let products = snapshot.docs.map(function (doc) {
                return {
                    ...doc.data(),
                    id: doc.id,
                };
            });

            // Category is filtered client-side using normalized values to keep
            // compatibility with category spelling variations in old/new records.
            if (urlQueryCategory) {
                products = products.filter(function (product) {
                    return categoryMatchesFilter(product, urlQueryCategory);
                });
            }

            // Apply client-side filters for compatibility with legacy pricing fields
            products = applyClientFilters(products, {
                minPrice: urlQueryMinPrice,
                maxPrice: urlQueryMaxPrice,
                size: urlQuerySize,
            });

            return products;
        }

        // Get filtered products first
        const products = await getFilteredProducts();

        // Calculate filter data based on actual filtered results
        // This ensures filters only show options from visible products
        // IMPORTANT: Calculate filterData with ALL products before pagination
        const filterData = calculateFilterData(products);

        // Calculate pagination
        const totalProducts = products.length;
        const totalPages = Math.ceil(totalProducts / 16);
        
        // Validate and adjust currentPage
        let validatedCurrentPage = currentPage;
        if (validatedCurrentPage < 1) {
            validatedCurrentPage = 1;
        } else if (validatedCurrentPage > totalPages && totalPages > 0) {
            validatedCurrentPage = totalPages;
        } else if (totalPages === 0) {
            validatedCurrentPage = 1;
        }

        // Apply pagination slice (16 products per page)
        const paginatedProducts = products.slice((validatedCurrentPage - 1) * 16, validatedCurrentPage * 16);

        const result = {
            products: paginatedProducts,
            category: urlQueryCategory,
            searchQuery: urlQuerySearch,
            collection: urlQueryCollection,
            collectionDisplayName: filterData.collectionDisplayName,
            collections: filterData.collections,
            sizes: filterData.filteredProductSizes,
            colors: filterData.filteredProductColors,
            minPrice: filterData.filteredMinPrice,
            maxPrice: filterData.filteredMaxPrice,
            totalPages: totalPages,
            currentPage: validatedCurrentPage,
            totalProducts: totalProducts,
        };
        
        // Store in cache
        setCachedData(cacheKey, result);
        
        return result;
    } catch (error) {
        console.error("Erro ao carregar os dados:", error);
        const errorResult = {
            products: [],
            category: null,
            searchQuery: null,
            collection: null,
            collectionDisplayName: null,
            collections: [],
            sizes: [],
            colors: [],
            minPrice: null,
            maxPrice: null,
            totalPages: 1,
            currentPage: 1,
            totalProducts: 0,
        };
        // Don't cache error results
        return errorResult;
    }
}
// this layout is used to handle the UI states for the products cards layout and the sidebar.
export default function ProductsLayout() {
    // This data is coming from the loader function.
    const { products, searchQuery, category, collection, collectionDisplayName, collections, colors, minPrice, maxPrice, sizes, totalPages, currentPage, totalProducts } =
        useLoaderData();
    const location = useLocation();

    // this state is used to handle the mobile filter open state.
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [filterSearchParams] = useSearchParams();
    const activeFilterCount = ["color", "size", "minPrice", "collection"].filter(
        function (key) { return filterSearchParams.get(key); }
    ).length;
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const mobileSidebarRef = useRef(null);
    const previousSearchRef = useRef(location.search);
    const scrollSaveTimeoutRef = useRef(null);

    // Save scroll position continuously while on products page
    useEffect(function saveScrollPosition() {
        const isOnProductsPage = location.pathname === "/products" || location.pathname.startsWith("/products?");
        const navigatingFromDetails = sessionStorage.getItem("navigatingToProductDetails") === "true";
        
        if (!isOnProductsPage) {
            return;
        }

        // If coming back from details, preserve scroll position immediately
        if (navigatingFromDetails) {
            const storageKey = `scroll_${location.pathname}${location.search}`;
            const savedPosition = sessionStorage.getItem(storageKey);
            if (savedPosition) {
                const scrollPosition = parseInt(savedPosition, 10);
                // Set scroll immediately to prevent flash to top
                // Use both methods to ensure compatibility
                if (document.documentElement) {
                    document.documentElement.scrollTop = scrollPosition;
                }
                if (document.body) {
                    document.body.scrollTop = scrollPosition;
                }
                window.scrollTo(0, scrollPosition);
            }
        }

        function saveScroll() {
            const currentScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
            const storageKey = `scroll_${location.pathname}${location.search}`;
            sessionStorage.setItem(storageKey, currentScroll.toString());
        }

        // Save on scroll with debounce
        function handleScroll() {
            if (scrollSaveTimeoutRef.current) {
                clearTimeout(scrollSaveTimeoutRef.current);
            }
            scrollSaveTimeoutRef.current = setTimeout(function debouncedSave() {
                saveScroll();
            }, 100);
        }

        // Save initial position (but don't override if we just restored)
        if (!navigatingFromDetails) {
            saveScroll();
        }

        window.addEventListener("scroll", handleScroll, { passive: true });

        return function cleanup() {
            window.removeEventListener("scroll", handleScroll);
            if (scrollSaveTimeoutRef.current) {
                clearTimeout(scrollSaveTimeoutRef.current);
                // Save final position on cleanup
                saveScroll();
            }
        };
    }, [location.pathname, location.search]);

    // Restore scroll position when returning to products page
    useEffect(function restoreScrollPosition() {
        const isOnProductsPage = location.pathname === "/products" || location.pathname.startsWith("/products?");
        const navigatingFromDetails = sessionStorage.getItem("navigatingToProductDetails") === "true";
        const searchChanged = previousSearchRef.current !== location.search;
        
        if (isOnProductsPage) {
            // If coming back from product details and search didn't change, restore scroll smoothly
            if (navigatingFromDetails && !searchChanged) {
                const storageKey = `scroll_${location.pathname}${location.search}`;
                const savedPosition = sessionStorage.getItem(storageKey);
                const savedCardTop = sessionStorage.getItem(`${storageKey}_cardTop`);
                const savedProductId = sessionStorage.getItem(`${storageKey}_productId`);
                
                if (savedPosition) {
                    const scrollPosition = parseInt(savedPosition, 10);
                    
                    // Immediately set scroll position to prevent "flash" to top
                    // This happens synchronously before React finishes rendering
                    // Use multiple methods to ensure it works across browsers
                    if (document.documentElement) {
                        document.documentElement.scrollTop = scrollPosition;
                    }
                    if (document.body) {
                        document.body.scrollTop = scrollPosition;
                    }
                    window.scrollTo(0, scrollPosition);
                    
                    // Wait a bit before starting fine-tuning restoration to let React Router finish rendering
                    setTimeout(function startRestore() {
                        // Wait for content to be fully rendered
                        function restoreScroll(attempts) {
                        if (attempts <= 0) {
                            // Final attempt - restore anyway
                            window.scrollTo(0, scrollPosition);
                            return;
                        }
                        
                        // Check if products are rendered
                        const productsGrid = document.querySelector('[class*="productsGrid"]');
                        const hasProducts = productsGrid && productsGrid.children.length > 0;
                        
                        if (hasProducts) {
                            // Try to find the product card that was clicked
                            let targetPosition = scrollPosition;
                            
                            // Store product link for later use after images load
                            let productCardElement = null;
                            if (savedProductId && savedCardTop) {
                                // Try to find the product card by finding the link with the product ID
                                // The Link uses relative path, so it could be just the ID or /products/ID
                                const possibleSelectors = [
                                    `a[href="${savedProductId}"]`,
                                    `a[href="/products/${savedProductId}"]`,
                                    `a[href*="${savedProductId}"]`
                                ];
                                
                                let productLink = null;
                                for (let i = 0; i < possibleSelectors.length; i++) {
                                    const links = document.querySelectorAll(possibleSelectors[i]);
                                    if (links.length > 0) {
                                        productLink = links[0];
                                        break;
                                    }
                                }
                                
                                if (productLink) {
                                    productCardElement = productLink.closest('[class*="card"]') || productLink.parentElement || productLink;
                                }
                            }
                            
                            // Check if images are loaded (important for accurate scroll position)
                            const images = document.querySelectorAll('[class*="productsGrid"] img');
                            let imagesLoaded = true;
                            if (images.length > 0) {
                                // Check if at least the first few images are loaded
                                const firstImages = Array.from(images).slice(0, Math.min(8, images.length));
                                imagesLoaded = firstImages.every(function checkImage(img) {
                                    return img.complete && img.naturalHeight > 0;
                                });
                            }
                            
                            if (images.length === 0 || imagesLoaded) {
                                // Content is ready, restore scroll smoothly without animation
                                if (productCardElement) {
                                    // Use scrollIntoView for more reliable positioning (especially on mobile)
                                    // Calculate position first to avoid visual jump
                                    const cardRect = productCardElement.getBoundingClientRect();
                                    const currentScroll = window.scrollY || window.pageYOffset;
                                    const cardTop = cardRect.top + currentScroll;
                                    
                                    // Set position immediately (no animation)
                                    window.scrollTo(0, Math.max(0, cardTop - 20));
                                    
                                    // Fine-tune with scrollIntoView if needed (but only if position is off)
                                    setTimeout(function fineTune() {
                                        const currentPos = window.scrollY || window.pageYOffset;
                                        const expectedPos = Math.max(0, cardTop - 20);
                                        const diff = Math.abs(currentPos - expectedPos);
                                        
                                        if (diff > 50) {
                                            // Position is off, use scrollIntoView as fallback
                                            productCardElement.scrollIntoView({
                                                behavior: "auto",
                                                block: "start",
                                                inline: "nearest"
                                            });
                                        }
                                    }, 50);
                                } else {
                                    // Fallback to absolute position (already set, just verify)
                                    const currentPos = window.scrollY || window.pageYOffset;
                                    const diff = Math.abs(currentPos - targetPosition);
                                    
                                    if (diff > 100) {
                                        // Position is significantly off, correct it
                                        requestAnimationFrame(function correct() {
                                            window.scrollTo({
                                                top: targetPosition,
                                                left: 0,
                                                behavior: "auto"
                                            });
                                        });
                                    }
                                }
                            } else {
                                // Images not loaded yet, retry
                                setTimeout(function retry() {
                                    restoreScroll(attempts - 1);
                                }, 200);
                            }
                        } else {
                            // Products not rendered yet, retry
                            setTimeout(function retry() {
                                restoreScroll(attempts - 1);
                            }, 100);
                        }
                        }
                        
                        // Start restoration (up to 40 attempts = ~8 seconds max)
                        restoreScroll(40);
                    }, 50); // Reduced delay for smoother experience
                    
                    // Clear the navigation flag after starting restoration
                    sessionStorage.removeItem("navigatingToProductDetails");
                } else {
                    // No saved position, go to top smoothly
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    sessionStorage.removeItem("navigatingToProductDetails");
                }
            } else {
                // Filters changed or first load, go to top
                // Only scroll to top if we're not already there to avoid unnecessary movement
                const currentScroll = window.scrollY || window.pageYOffset;
                if (currentScroll > 0) {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                }
                sessionStorage.removeItem("navigatingToProductDetails");
            }
        }

        // Update previous search
        previousSearchRef.current = location.search;
    }, [location.pathname, location.search]);

    // this function is used to handle the touch start event for the mobile filter.
    function handleTouchStart(event) {
        const target = event.target;
        const touchX = event.touches[0].clientX;
        
        // Check only for specific interactive elements that should block swipe
        // Don't block swipe for entire content area, only specific interactive components
        let element = target;
        let depth = 0;
        while (element && depth < 8) {
            const className = element.className || '';
            const classStr = typeof className === 'string' ? className : '';
            
            // Check for slider/track/thumb elements (react-range components)
            if (
                classStr.includes('priceRangeFilter') ||
                classStr.includes('track') ||
                classStr.includes('thumb') ||
                element.getAttribute('role') === 'slider'
            ) {
                touchStartX.current = null;
                touchStartY.current = null;
                return;
            }
            
            // Check if element is directly an interactive element
            if (
                element.tagName === 'INPUT' ||
                (element.tagName === 'BUTTON' && !element.classList.contains('closeSiderbarButton')) ||
                element.closest && (
                    element.closest('[class*="colorBtn"]') ||
                    element.closest('[class*="sizeBtn"]')
                )
            ) {
                touchStartX.current = null;
                touchStartY.current = null;
                return;
            }
            
            element = element.parentElement;
            depth++;
        }
        
        touchStartX.current = touchX;
        touchStartY.current = event.touches[0].clientY;
    }

    // this function is used to handle the touch move event for the mobile filter.
    function handleTouchMove(event) {
        if (!isMobileFilterOpen) return;
        
        // Don't process swipe if we didn't start tracking
        if (touchStartX.current === null || touchStartY.current === null) {
            return;
        }
        
        const target = event.target;
        const currentX = event.touches[0].clientX;
        const currentY = event.touches[0].clientY;
        
        // Check if currently on interactive elements that should block swipe
        let element = target;
        let depth = 0;
        while (element && depth < 8) {
            const className = element.className || '';
            const classStr = typeof className === 'string' ? className : '';
            
            // Check for slider/track/thumb elements (react-range components)
            if (
                classStr.includes('priceRangeFilter') ||
                classStr.includes('track') ||
                classStr.includes('thumb') ||
                element.getAttribute('role') === 'slider'
            ) {
                touchStartX.current = null;
                touchStartY.current = null;
                return;
            }
            
            // Check if element is directly an interactive element
            if (
                element.tagName === 'INPUT' ||
                (element.tagName === 'BUTTON' && !element.classList.contains('closeSiderbarButton')) ||
                element.closest && (
                    element.closest('[class*="colorBtn"]') ||
                    element.closest('[class*="sizeBtn"]')
                )
            ) {
                touchStartX.current = null;
                touchStartY.current = null;
                return;
            }
            
            element = element.parentElement;
            depth++;
        }
        
        // Calculate movement differences
        const diffX = touchStartX.current - currentX;
        const diffY = Math.abs(touchStartY.current - currentY);
        
        // Only close if movement is primarily horizontal (swipe)
        // and horizontal movement is significantly greater than vertical
        if (diffX > 100 && diffX > diffY * 2) {
            setIsMobileFilterOpen(false);
            touchStartX.current = null;
            touchStartY.current = null;
        }
    }

    // this effect is used to handle the overflow of the body when the mobile filter is open.
    useEffect(() => {
        if (isMobileFilterOpen) {
            document.body.style.overflow = "hidden";
            
            // Hide only the logo and disable its pointer events when sidebar is open
            const logo = document.querySelector('header .logo') || document.querySelector('header a[href="/"]');
            if (logo) {
                logo.style.pointerEvents = 'none';
                logo.style.opacity = '0';
                logo.style.transition = 'opacity 0.3s ease';
            }
        } else {
            document.body.style.overflow = "unset";
            
            // Re-enable logo when sidebar is closed
            const logo = document.querySelector('header .logo') || document.querySelector('header a[href="/"]');
            if (logo) {
                logo.style.pointerEvents = '';
                logo.style.opacity = '';
            }
        }

        // this effect is used to handle the overflow of the body when the mobile filter is closed.
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isMobileFilterOpen]);

    // Memoriza o valor do contexto para evitar re-renders desnecessários
    // O objeto só é recriado quando alguma das dependências realmente mudar
    const contextValue = useMemo(
        function () {
            return {
                products,
                searchQuery,
                category,
                collection,
                collectionDisplayName,
                collections,
                colors,
                minPrice,
                maxPrice,
                sizes,
                totalPages,
                currentPage,
                totalProducts,
            };
        },
        [products, searchQuery, category, collection, collectionDisplayName, collections, colors, minPrice, maxPrice, sizes, totalPages, currentPage, totalProducts]
    );
    
    return (
        <ProductsContext.Provider value={contextValue}>
            <div className={styles.productsLayout}>
                <aside className={styles.sidebar}>
                    <SidebarContent isMobile={false} />
                </aside>
                {/* In responsive mode this creates a DIV with two buttons for the filters and the reset filters */}
                <div className={styles.filterMobileContainer}>
                    <button
                        className={styles.filtersMobileButton}
                        onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
                    >
                        <FilterIcon height={24} width={24} /> Filtros
                        {activeFilterCount > 0 && (
                            <span className={styles.filterBadge}>{activeFilterCount}</span>
                        )}
                    </button>
                    <button
                        className={styles.resetFiltersMobileButton}
                        onClick={() => mobileSidebarRef.current?.resetFilters()}
                    >
                        Limpar Filtros
                    </button>
                </div>
                {/* Backdrop to block interactions with elements behind the sidebar */}
                <div
                    className={`${styles.mobileSidebarBackdrop} ${isMobileFilterOpen ? styles.active : ""}`}
                    style={{
                        opacity: isMobileFilterOpen ? 1 : 0,
                        pointerEvents: isMobileFilterOpen ? 'auto' : 'none'
                    }}
                    onClick={() => setIsMobileFilterOpen(false)}
                />
                {/* In responsive mode this creates a DIV with the sidebar content */}
                <div
                    className={`${styles.mobileSidebarOverlay} ${isMobileFilterOpen ? styles.active : ""}`}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                >
                    <button
                        className={styles.closeSiderbarButton}
                        onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
                    >
                        X
                    </button>
                    <SidebarContent
                        ref={mobileSidebarRef}
                        isMobile={isMobileFilterOpen}
                        onClose={() => setIsMobileFilterOpen(false)}
                    />
                </div>
                <div className={styles.productsOutlet}>
                    <Outlet />
                </div>
            </div>
        </ProductsContext.Provider>
    );
}

export function useProducts() {
    return useContext(ProductsContext);
}
