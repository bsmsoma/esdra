import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import styles from "./SidebarContent.module.scss";
import PriceRangeFilter from "./PriceRangeFilter";
import { colors as colorsUtils } from "../utils/colors";
import { useSearchParams } from "react-router";
import { useProducts } from "../pages/ProductsLayout";
import { formatSizeLabelForDisplay } from "../utils/productSizes";

const SidebarContent = forwardRef(function SidebarContent({ isMobile, onClose }, ref) {
    const { minPrice, maxPrice, sizes, colors, collections } = useProducts();

    const [searchParams, setSearchParams] = useSearchParams();

    const [priceRange, setPriceRange] = useState([minPrice, maxPrice]);
    const [disablePriceUI, setDisablePriceUI] = useState(priceRange[0] === priceRange[1]);
    const [selectedColors, setSelectedColors] = useState([]);
    const [selectedSizes, setSelectedSizes] = useState([]);
    const [selectedCollection, setSelectedCollection] = useState(null);

    const category = searchParams.get("category");

    const filteredColors = colorsUtils
        .filter((color) => colors.includes(color.name))
        .sort(function (a, b) {
            const hexA = parseInt(a.hex.replace('#', ''), 16);
            const hexB = parseInt(b.hex.replace('#', ''), 16);
            return hexA - hexB;
        });

    // Numeric sizes only (volumes in ml for cosmetics)
    const validSizes = (Array.isArray(sizes) ? sizes : []).filter(function (size) {
        return size !== undefined && size !== null && !isNaN(size);
    }).map(function (size) {
        const numSize = typeof size === 'string' ? parseInt(size, 10) : size;
        return isNaN(numSize) ? null : numSize;
    }).filter(function (size) {
        return size !== null;
    }).sort(function (a, b) {
        return a - b;
    });

    const hasNumericSizes = validSizes.length > 0;
    const showCollections = Array.isArray(collections) && collections.length > 1;

    function formatVolumeLabel(size) {
        return typeof size === 'number' ? `${size}ml` : formatSizeLabelForDisplay(size);
    }

    // Sync when context price/category changes
    useEffect(function () {
        setPriceRange([minPrice, maxPrice]);
        setDisablePriceUI(minPrice === maxPrice);
        setSelectedColors([]);
        setSelectedSizes([]);
        setSelectedCollection(null);
    }, [minPrice, maxPrice, category]);

    // Sync with URL params
    useEffect(function () {
        const urlColor = searchParams.get("color");
        setSelectedColors(urlColor
            ? urlColor.split(",").filter((c) => c.trim().length > 0)
            : []
        );

        const urlSize = searchParams.get("size");
        setSelectedSizes(urlSize
            ? urlSize.split(",").map(function (s) { return parseInt(s.trim(), 10); }).filter(function (n) { return !isNaN(n); })
            : []
        );

        const urlMinPrice = searchParams.get("minPrice");
        const urlMaxPrice = searchParams.get("maxPrice");
        if (urlMinPrice && urlMaxPrice) {
            setPriceRange([parseInt(urlMinPrice, 10), parseInt(urlMaxPrice, 10)]);
        } else {
            setPriceRange([minPrice, maxPrice]);
        }

        const urlCollection = searchParams.get("collection");
        setSelectedCollection(urlCollection || null);
    }, [searchParams, minPrice, maxPrice]);

    function handleColorChange(color) {
        setSelectedColors(function (prev) {
            return prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color];
        });
    }

    function handleSizeChange(size) {
        setSelectedSizes(function (prev) {
            return prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size];
        });
    }

    function handleCollectionChange(name) {
        setSelectedCollection(function (prev) { return prev === name ? null : name; });
    }

    function handlePriceChange(value) {
        setPriceRange([parseInt(value[0], 10), parseInt(value[1], 10)]);
    }

    function handleApplyFilters() {
        const params = new URLSearchParams();

        const currentCategory = searchParams.get("category");
        const currentQuery = searchParams.get("query");
        const currentPage = searchParams.get("page");

        if (currentCategory) params.set("category", currentCategory);
        if (currentQuery) params.set("query", currentQuery);
        if (currentPage) params.set("page", currentPage);

        if (selectedColors.length > 0) params.set("color", selectedColors.join(","));
        if (selectedSizes.length > 0) params.set("size", selectedSizes.join(","));
        if (priceRange[0] !== minPrice || priceRange[1] !== maxPrice) {
            params.set("minPrice", priceRange[0]);
            params.set("maxPrice", priceRange[1]);
        }
        if (selectedCollection) params.set("collection", selectedCollection);

        setSearchParams(params);

        if (isMobile && typeof onClose === "function") onClose();
    }

    function handleResetFilters() {
        setSelectedColors([]);
        setSelectedSizes([]);
        setSelectedCollection(null);
        setPriceRange([minPrice, maxPrice]);

        const params = new URLSearchParams();
        const currentCategory = searchParams.get("category");
        if (currentCategory) params.set("category", currentCategory);
        setSearchParams(params);

        if (isMobile && typeof onClose === "function") onClose();
    }

    useImperativeHandle(ref, function () {
        return { resetFilters: handleResetFilters };
    });

    return (
        <div className={`${styles.sidebarWrapper} ${isMobile ? styles.mobileWrapper : ""}`}>
            {!isMobile && <h2 className={styles.sidebarheader}>Filtros</h2>}
            <div className={`${styles.sidebarcontent} ${isMobile ? styles.mobileContent : ""}`}>

                {/* Categoria ativa */}
                {category && (
                    <div className={styles.filterSection}>
                        <h3 className={styles.categoryTitle}>{category}</h3>
                    </div>
                )}

                {/* Coleções */}
                {showCollections && (
                    <div className={styles.filterSection}>
                        <h3>Coleção</h3>
                        <div className={styles.collectionFilters}>
                            {collections.map(function (name) {
                                return (
                                    <button
                                        key={name}
                                        className={`${styles.collectionBtn} ${selectedCollection === name ? styles.active : ""}`}
                                        onClick={function () { handleCollectionChange(name); }}
                                    >
                                        {name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Faixa de preço */}
                {!disablePriceUI && (
                    <div className={styles.filterSection}>
                        <h3>Faixa de Preço</h3>
                        <PriceRangeFilter
                            min={minPrice}
                            max={maxPrice}
                            value={priceRange}
                            onChange={handlePriceChange}
                        />
                    </div>
                )}

                {/* Cores */}
                {filteredColors.length > 0 && (
                    <div className={styles.filterSection}>
                        <h3>Cor</h3>
                        <div className={styles.colorFilters}>
                            {filteredColors.map(function ({ name, hex }) {
                                return (
                                    <button
                                        key={name}
                                        className={`${styles.colorBtn} ${selectedColors.includes(name) ? styles.active : ""}`}
                                        style={{ backgroundColor: hex }}
                                        onClick={function () { handleColorChange(name); }}
                                        title={name}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Volume (ml) — oculto se não houver tamanhos numéricos */}
                {hasNumericSizes && (
                    <div className={styles.filterSection}>
                        <h3>Volume</h3>
                        <div className={styles.sizeFilters}>
                            {validSizes.map(function (size) {
                                return (
                                    <button
                                        key={size}
                                        className={`${styles.sizeBtn} ${selectedSizes.includes(size) ? styles.active : ""}`}
                                        onClick={function () { handleSizeChange(size); }}
                                    >
                                        {formatVolumeLabel(size)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <div className={`${styles.sidebarfooter} ${isMobile ? styles.mobileFooter : ""}`}>
                <button onClick={handleApplyFilters}>Aplicar</button>
                <button className={styles.resetButton} onClick={handleResetFilters}>
                    Limpar Filtros
                </button>
            </div>
        </div>
    );
});

export default SidebarContent;
