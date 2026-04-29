import React, { useEffect, useMemo } from "react";
import styles from "./Home.module.scss";
import { Link, useNavigate, useLoaderData, useLocation } from "react-router";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import {
    getProductsCollection,
    getDocs,
    query,
    orderBy,
    limit,
} from "../firebase";
import { generateCacheKey, getCachedData, setCachedData } from "../utils/cache";
import ProductCard from "../components/ProductCard";

const HERO_LOOP_VIDEO_URL =
    "https://firebasestorage.googleapis.com/v0/b/esdra-ba71d.firebasestorage.app/o/lojas%2Fesdra-aromas%2Fassets%2FloopHeroVideoWeb.webm?alt=media";

const TRUST_ITEMS = [
    {
        id: "entrega",
        label: "Entrega para todo o Brasil com rastreio atualizado.",
        icon: (
            <path
                d="M3 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1h2.5c.65 0 1.24.32 1.6.86l1.7 2.54c.13.2.2.43.2.67V16a2 2 0 0 1-2 2h-.17a3 3 0 0 1-5.66 0H9.17a3 3 0 0 1-5.66 0H3V7Zm2 0v9h.17a3 3 0 0 1 5.66 0H14V7H5Zm11 3v6h.17a3 3 0 0 1 5.66 0H22v-3.4L20.23 10H16Zm-9.5 8a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm12 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
                fill="currentColor"
            />
        ),
    },
    {
        id: "pagamento",
        label: "Pagamento seguro via Pix, cartao e boleto.",
        icon: (
            <path
                d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2H4V6Zm16 4H4v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8Zm-9 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm7-2a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"
                fill="currentColor"
            />
        ),
    },
    {
        id: "origem",
        label: "Produtos artesanais com ingredientes selecionados.",
        icon: (
            <path
                d="M12 2 4 6v6c0 5 3.4 9.74 8 11 4.6-1.26 8-6 8-11V6l-8-4Zm0 2.18 6 3v4.82c0 4.01-2.55 7.99-6 9.29-3.45-1.3-6-5.28-6-9.29V7.18l6-3Zm-1.25 10.82 5-5-1.41-1.41-3.59 3.58-1.84-1.83L7.5 11.75l3.25 3.25Z"
                fill="currentColor"
            />
        ),
    },
];


function mapSnapshotProducts(snapshot) {
    return snapshot.docs.map(function (doc) {
        return {
            ...doc.data(),
            id: doc.id,
        };
    });
}

function getEmptyVideos(length = 5) {
    return Array.from({ length: length }, function () {
        return { id: null, videoUrl: null };
    });
}

function getProductImage(product) {
    const coverImageIndex = product.coverIndex || 0;
    if (product.images && product.images[coverImageIndex]) {
        return product.images[coverImageIndex];
    }
    if (product.images && product.images[0]) {
        return product.images[0];
    }
    return null;
}

function getProductPrice(product) {
    return product.sellValue ?? product.rentValue ?? null;
}

function getProductDescription(product) {
    return (
        product.productDetail ||
        product.description ||
        "Produto artesanal para autocuidado e bem-estar."
    );
}

// Loader function to fetch the last 4 products by code and last 5 videos
export async function homeLoader() {
    const cacheKey = generateCacheKey("home");
    const videosCacheKey = generateCacheKey("home-videos");

    // Try to get from cache first
    const cachedData = getCachedData(cacheKey);
    const cachedVideos = getCachedData(videosCacheKey);

    let products = cachedData;
    let videos = cachedVideos;

    if (products === null) {
        try {
            const q = query(
                getProductsCollection(),
                orderBy("code", "desc"),
                limit(4)
            );
            const snapshot = await getDocs(q);
            products = mapSnapshotProducts(snapshot);

            // Store in cache
            setCachedData(cacheKey, products);
        } catch (error) {
            console.error("Erro ao buscar produtos recentes:", error);
            products = [];
        }
    }

    if (videos === null) {
        try {
            // Buscar produtos ordenados por code (mais recentes primeiro)
            // Buscar mais produtos para garantir que temos vídeos suficientes
            const allProductsQuery = query(
                getProductsCollection(),
                orderBy("code", "desc"),
                limit(50)
            );
            const allProductsSnapshot = await getDocs(allProductsQuery);
            const allProducts = mapSnapshotProducts(allProductsSnapshot);

            // Filtrar produtos com vídeo e pegar os 5 mais recentes
            const productsWithVideos = allProducts
                .filter(function (product) {
                    return (
                        product.video &&
                        product.video !== null &&
                        product.video !== ""
                    );
                })
                .sort(function (a, b) {
                    // Ordenar por createdAt se disponível, senão por code
                    if (a.createdAt && b.createdAt) {
                        const aTime = a.createdAt.toMillis
                            ? a.createdAt.toMillis()
                            : 0;
                        const bTime = b.createdAt.toMillis
                            ? b.createdAt.toMillis()
                            : 0;
                        return bTime - aTime;
                    }
                    return (b.code || 0) - (a.code || 0);
                })
                .slice(0, 5);

            videos = productsWithVideos.map(function (product) {
                return {
                    id: product.id,
                    videoUrl: product.video,
                };
            });

            // Se não houver vídeos suficientes, preencher com null
            videos = [...videos, ...getEmptyVideos()].slice(0, 5);

            // Store in cache
            setCachedData(videosCacheKey, videos);
        } catch (error) {
            console.error("Erro ao buscar vídeos:", error);
            videos = getEmptyVideos();
        }
    }

    return {
        products: products || [],
        videos: videos || [],
    };
}

function Home() {
    const navigate = useNavigate();
    const loaderData = useLoaderData();
    const recentProducts = loaderData.products || [];
    const mainHeroVideos = loaderData.videos || [];
    const location = useLocation();

    const validHeroVideos = useMemo(function () {
        return mainHeroVideos.filter(function (video) {
            return video && video.videoUrl;
        });
    }, [mainHeroVideos]);

    // Handle scroll to section when hash is present in URL
    useEffect(
        function () {
            if (location.hash) {
                const sectionId = location.hash.replace("#", "");
                const element = document.getElementById(sectionId);

                if (element) {
                    // Small delay to ensure page is fully loaded
                    setTimeout(function () {
                        element.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                        });
                    }, 100);
                }
            } else {
                // If no hash, scroll to top
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        },
        [location.hash]
    );

    function handlePromotionClick() {
        navigate("/products?query=sabonete%20artesanal");
    }

    // Helper function to render ProductCard
    function renderProductCard(product) {
        const productImage = getProductImage(product);
        const productPrice = getProductPrice(product);
        const categoryBadge = product.category || "Aromas";
        const shortDescription = getProductDescription(product);

        return (
            <ProductCard
                key={product.id}
                productLink={`products/${product.id}`}
                imageSrc={productImage}
                imageAlt={product.name}
                badge={categoryBadge}
                name={product.name}
                description={shortDescription}
                price={productPrice}
                installment=""
                onAddToCart={function () {}}
            />
        );
    }

    const showVideoColumn = validHeroVideos.length > 0;

    return (
        <div id="home" className={styles.homeContainer}>
            <section
                className={
                    showVideoColumn
                        ? styles.heroSection
                        : `${styles.heroSection} ${styles.heroSectionBannerOnly}`
                }
            >
                <div
                    className={
                        showVideoColumn
                            ? styles.topGridSection
                            : `${styles.topGridSection} ${styles.topGridSectionBannerOnly}`
                    }
                >
                    {showVideoColumn && (
                        <div className={styles.portraitVideoContainer}>
                            <Swiper
                                className={styles.heroVideoSwiper}
                                modules={[Pagination]}
                                pagination={{
                                    clickable: true,
                                }}
                                spaceBetween={0}
                                slidesPerView={1}
                            >
                                {validHeroVideos.map(function (video, index) {
                                    return (
                                        <SwiperSlide
                                            key={video.id || `video-${index}`}
                                            className={styles.heroVideoSlide}
                                        >
                                            <video
                                                className={styles.portraitVideo}
                                                autoPlay
                                                loop
                                                muted
                                                playsInline
                                            >
                                                <source
                                                    src={video.videoUrl}
                                                    type="video/mp4"
                                                />
                                                Seu navegador não suporta vídeos.
                                            </video>
                                        </SwiperSlide>
                                    );
                                })}
                            </Swiper>
                        </div>
                    )}
                    <div className={styles.promotionBanner}>
                        <video
                            className={styles.promotionVideo}
                            autoPlay
                            loop
                            muted
                            playsInline
                            preload="metadata"
                        >
                            <source src={HERO_LOOP_VIDEO_URL} type="video/webm" />
                            Seu navegador nao suporta videos.
                        </video>
                        <div className={styles.promotionContent}>
                            <h2 className={styles.promotionTitle}>
                                Velas Artesanais Premium
                            </h2>
                            <p className={styles.promotionEyebrow}>
                                Luxo artesanal
                            </p>
                            <p className={styles.promotionSubtitle}>
                                A chama que transforma o ambiente em um ritual de presenca.
                            </p>
                            <p className={styles.promotionDescription}>
                                Velas artesanais com fragrancias autorais, acabamento impecavel e
                                uma experiencia sensorial sofisticada para casa ou presente.
                            </p>
                            <div className={styles.promotionActions}>
                                <button
                                    type="button"
                                    className={styles.promotionButton}
                                    onClick={handlePromotionClick}
                                >
                                    Comprar agora
                                </button>
                                <Link
                                    to="/products"
                                    className={styles.promotionButtonSecondary}
                                >
                                    Ver catalogo completo
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section
                className={`${styles.sectionBand} ${styles.sectionBandTrust}`}
                aria-label="Diferenciais da loja"
            >
                <div className={styles.trustStrip}>
                    {TRUST_ITEMS.map(function (item) {
                        return (
                            <div key={item.id} className={styles.trustItem}>
                                <span className={styles.trustIcon} aria-hidden="true">
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        {item.icon}
                                    </svg>
                                </span>
                                <p className={styles.trustText}>{item.label}</p>
                            </div>
                        );
                    })}
                </div>
            </section>

            {recentProducts.length > 0 && (
                <section
                    className={styles.sectionBandReleases}
                    aria-label="Lançamentos"
                >
                    <div className={styles.sectionInner}>
                        <div className={styles.releasesHeader}>
                            <h2 className={styles.recentProductsTitle}>
                                Lançamentos
                            </h2>
                            <Link to="/products" className={styles.releasesViewAll}>
                                Ver todos
                            </Link>
                        </div>
                        <div className={styles.recentProductsGrid}>
                            {recentProducts.map(renderProductCard)}
                        </div>
                        <div className={styles.recentProductsSwiper}>
                            <Swiper
                                className={styles.recentProductsSwiperContainer}
                                spaceBetween={12}
                                slidesPerView={1.2}
                                breakpoints={{
                                    450: { slidesPerView: 1.5 },
                                }}
                            >
                                {recentProducts.map(function (product, index) {
                                    return (
                                        <SwiperSlide
                                            key={product.id || `product-slide-${index}`}
                                            className={styles.recentProductSlide}
                                        >
                                            {renderProductCard(product)}
                                        </SwiperSlide>
                                    );
                                })}
                            </Swiper>
                        </div>
                    </div>
                </section>
            )}

            <section className={styles.manifestoSection} aria-label="Nossa essência">
                <div className={styles.manifestoGrid}>
                    <div className={styles.manifestoImagePanel}>
                        {recentProducts[0] && getProductImage(recentProducts[0]) ? (
                            <img
                                src={getProductImage(recentProducts[0])}
                                alt="Produto ESDRA"
                                className={styles.manifestoImg}
                                loading="lazy"
                            />
                        ) : (
                            <div className={styles.manifestoImgFallback} />
                        )}
                        <div className={styles.manifestoImgOverlay} />
                        <span className={styles.manifestoSideLabel} aria-hidden="true">
                            RITUAL
                        </span>
                    </div>
                    <div className={styles.manifestoContent}>
                        <span className={styles.manifestoEyebrow}>
                            ESDRA · Artesanal
                        </span>
                        <div className={styles.manifestoAccentLine} aria-hidden="true" />
                        <h2 className={styles.manifestoHeadline}>
                            Para quem<br />
                            transforma<br />
                            o cuidado<br />
                            em <em>ritual.</em>
                        </h2>
                        <p className={styles.manifestoBody}>
                            Cada produto ESDRA é feito à mão, com ingredientes
                            que você reconhece e aromas que ficam na memória.
                            Não é rotina — é a pausa que você merece.
                        </p>
                        <Link to="/products" className={styles.manifestoCta}>
                            Conhecer a coleção
                            <span className={styles.manifestoCtaArrow} aria-hidden="true">→</span>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Home;
