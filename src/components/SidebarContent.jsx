import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import styles from "./SidebarContent.module.scss";
import PriceRangeFilter from "./PriceRangeFilter";
import { colors as colorsUtils } from "../utils/colors";
import { useSearchParams } from "react-router";
import { useProducts } from "../pages/ProductsLayout";

// This component is used to display the filters for the sidebar and the products cards layout

const SidebarContent = forwardRef(function SidebarContent({ isMobile, onClose }, ref) {
    // Retrieves necessary data from the products context
    const { minPrice, maxPrice, sizes, colors } = useProducts();
    
    const [searchParams, setSearchParams] = useSearchParams();

    const [priceRange, setPriceRange] = useState([minPrice, maxPrice]);
    const [disablePriceUI, setDisablePriceUI] = useState(priceRange[0] === priceRange[1]);

    const [selectedColors, setSelectedColors] = useState([]);
    const [selectedSizes, setSelectedSizes] = useState([]);

    const category = searchParams.get("category");

    // Gets the colors from the context and filters them in colorsUtils to get the hex code,
    // then we can use the hex code to display the color in the UI
    // Sorts colors in ascending order by their hexadecimal value
    const filteredColors = colorsUtils
        .filter((color) => colors.includes(color.name))
        .sort(function (a, b) {
            // Convert hex to number for numerical comparison
            const hexA = parseInt(a.hex.replace('#', ''), 16);
            const hexB = parseInt(b.hex.replace('#', ''), 16);
            return hexA - hexB;
        });
    
    // Filter and sort sizes to remove invalid values (NaN, undefined, null)
    // Ensure sizes is always an array of valid numbers
    const validSizes = (Array.isArray(sizes) ? sizes : []).filter(function (size) {
        // Filter out invalid values
        return size !== undefined && size !== null && !isNaN(size);
    }).map(function (size) {
        // Convert strings to numbers if needed
        const numSize = typeof size === 'string' ? parseInt(size, 10) : size;
        return isNaN(numSize) ? null : numSize;
    }).filter(function (size) {
        return size !== null;
    }).sort(function (a, b) {
        // Sort numerically
        return a - b;
    });
    
    // Sync states with changes in the URL and context data
    useEffect(function() {
        // Update price ranges when context data changes
        setPriceRange([minPrice, maxPrice]);

        // Update disable states for price filters
        setDisablePriceUI(minPrice === maxPrice);

        setSelectedColors([]);
        setSelectedSizes([]);
    }, [minPrice, maxPrice, category]);

    // Sync states with URL parameters
    useEffect(function() {
        // Sync selected colors with URL
        const urlColor = searchParams.get("color");
        if (urlColor) {
            // Separar múltiplas cores por vírgula
            const colorsInUrl = urlColor.split(",").filter((c) => c.trim().length > 0);
            setSelectedColors(colorsInUrl);
        } else {
            setSelectedColors([]);
        }

        // Sync selected size with URL
        const urlSize = searchParams.get("size");
        if (urlSize) {
            setSelectedSizes(urlSize.split(",").map(function(s) {
                return parseInt(s.trim());
            }));
        } else {
            setSelectedSizes([]);
        }

        // Sync price ranges with URL
        const urlMinPrice = searchParams.get("minPrice");
        const urlMaxPrice = searchParams.get("maxPrice");
        if (urlMinPrice && urlMaxPrice) {
            setPriceRange([parseInt(urlMinPrice), parseInt(urlMaxPrice)]);
        } else {
            setPriceRange([minPrice, maxPrice]);
        }
    }, [searchParams, minPrice, maxPrice]);

    function handleColorChange(color) {
        setSelectedColors((prev) => {
            if (prev.includes(color)) {
                return prev.filter((col) => col !== color);
            }
            return [...prev, color];
        });
    }

    function handleSizeChange(size) {
        setSelectedSizes((prev) => {
            if (prev.includes(size)) {
                return prev.filter((s) => s !== size);
            }
            return [...prev, size];
        });
    }
    function handlePriceChange(value) {
        setPriceRange([parseInt(value[0]), parseInt(value[1])]);
    }

    function handleApplyFilters() {
        const params = new URLSearchParams();

        // Keep existing parameters
        const currentCategory = searchParams.get("category");
        const currentQuery = searchParams.get("query");
        const currentPage = searchParams.get("page");

        if (currentCategory) {
            params.set("category", currentCategory);
        }
        if (currentQuery) {
            params.set("query", currentQuery);
        }
        if (currentPage) {
            params.set("page", currentPage);
        }

        // Apply color filter (multiple colors)
        if (selectedColors.length > 0) {
            params.set("color", selectedColors.join(",")); // Join multiple colors separated by comma
        }

        // Apply size filter (multiple sizes)
        if (selectedSizes.length > 0) {
            params.set("size", selectedSizes.join(",")); // Join multiple sizes separated by comma
        }

        // Apply price filters
        if (priceRange[0] !== minPrice || priceRange[1] !== maxPrice) {
            params.set("minPrice", priceRange[0]);
            params.set("maxPrice", priceRange[1]);
        }

        setSearchParams(params);

        if (isMobile && typeof onClose === "function") {
            onClose();
        }
    }

    function handleResetFilters() {
        setSelectedColors([]);
        setSelectedSizes([]);
        setPriceRange([minPrice, maxPrice]);

        // Clear all filter parameters, keeping only the category if it exists
        const params = new URLSearchParams();
        const currentCategory = searchParams.get("category");
        if (currentCategory) {
            params.set("category", currentCategory);
        }
        setSearchParams(params);

        if (isMobile && typeof onClose === "function") {
            onClose();
        }
    }

    useImperativeHandle(ref, () => ({
        resetFilters: handleResetFilters,
    }));

    return (
        <div className={`${styles.sidebarWrapper} ${isMobile ? styles.mobileWrapper : ""}`}>
            {!isMobile && <h2 className={styles.sidebarheader}>Filtros</h2>}
            <div className={`${styles.sidebarcontent} ${isMobile ? styles.mobileContent : ""}`}>
                <div className={styles.filterSection}>
                    <h3 className={styles.categoryTitle}>{category}</h3>
                </div>
                {!disablePriceUI && (
                    <div className={styles.filterSection}>
                        <h3>Preco</h3>
                        <PriceRangeFilter
                            min={minPrice}
                            max={maxPrice}
                            value={priceRange}
                            onChange={handlePriceChange}
                        />
                    </div>
                )}

                <div className={styles.filterSection}>
                    <h3>Cores</h3>
                    <div className={styles.colorFilters}>
                        {filteredColors.map(({ name, hex }) => (
                            <button
                                key={name}
                                className={`${styles.colorBtn} ${selectedColors.includes(name) ? styles.active : ""}`}
                                style={{ backgroundColor: hex }}
                                onClick={() => handleColorChange(name)}
                                title={name}
                            />
                        ))}
                    </div>
                </div>

                <div className={styles.filterSection}>
                    <h3>Tamanhos</h3>
                    <div className={styles.sizeFilters}>
                        {validSizes.map(function (size) {
                            return (
                                <button
                                    key={size}
                                    className={`${styles.sizeBtn} ${selectedSizes.includes(size) ? styles.active : ""}`}
                                    onClick={function () {
                                        return handleSizeChange(size);
                                    }}
                                >
                                    {size}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className={`${styles.sidebarfooter} ${isMobile ? styles.mobileFooter : ""}`}>
                <button onClick={handleApplyFilters}>
                    Aplicar
                </button>
                <button className={styles.resetButton} onClick={handleResetFilters}>
                    Limpar Filtros
                </button>
            </div>
        </div>
    );
});

export default SidebarContent;
