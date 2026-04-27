import styles from "./ProductDetails.module.scss";
import React, { useState } from "react";
import { useLoaderData, Link, useNavigate, useParams } from "react-router";
import { getDoc, getProductDocRef, getAvailableQuantity } from "../firebase";
import { generateCacheKey, getCachedData, setCachedData } from "../utils/cache";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, HashNavigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import { colors as ColorsUtils } from "../utils/colors";
import { formatPrice } from "../utils/priceUtils";
import {
    normalizeAndSortSizeList,
    formatSizeLabelForDisplay,
    normalizeProductSizeToken,
} from "../utils/productSizes";
import { trackEvent } from "../utils/analytics";
import { VideoIcon } from "../assets/icons";
import { useCart } from "../contexts/CartContext";
import { toast } from "react-toastify";

export async function productDetailsLoader({ params }) {
    const cacheKey = generateCacheKey("productDetails", { id: params.id });

    // Try to get from cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData !== null) {
        return cachedData;
    }

    const productRef = getProductDocRef(params.id);
    const productSnap = await getDoc(productRef);
    if (productSnap.exists()) {
        const productData = {
            ...productSnap.data(),
            id: productSnap.id,
        };

        // Store in cache
        setCachedData(cacheKey, productData);

        return productData;
    } else {
        throw new Error("Produto não encontrado");
    }
}

// Style for the mobile version. figma link: https://www.figma.com/design/TORRZBY53rNH8FhFT4fhgN/Ecommerce%3A-Product-Detail-Page-(Community)?node-id=0-1&p=f
export default function ProductDetails() {
    // Receives the product from the loader
    const currentProduct = useLoaderData();
    const { id } = useParams();

    // Ensure product has id
    if (!currentProduct.id) {
        currentProduct.id = id;
    }
    const hasVideo = currentProduct.video && currentProduct.video !== null;
    // Show video as main image if video exists, otherwise show first image
    const [isShowingVideo, setIsShowingVideo] = useState(hasVideo);
    const [coverImage, setCoverImage] = useState(
        hasVideo ? -1 : (currentProduct.coverIndex || 0)
    );
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalCurrentIndex, setModalCurrentIndex] = useState(0);
    const totalMediaCount = currentProduct.images.length + (hasVideo ? 1 : 0);
    const [modalImageLength] = useState(totalMediaCount);
    const [selectedSize, setSelectedSize] = useState(null);
    const swiperRef = React.useRef(null);
    const videoRef = React.useRef(null); // Video ref for modal
    const mainVideoRef = React.useRef(null); // Video ref for main image
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [availableQuantity, setAvailableQuantity] = useState(null);

    // Reset scroll to top when component mounts or product id changes
    React.useEffect(
        function resetScrollOnMount() {
            window.scrollTo(0, 0);
        },
        [id]
    );

    const productColorValue =
        typeof currentProduct.color === "string"
            ? currentProduct.color.trim()
            : "";
    const color = ColorsUtils.find(
        (availableColor) =>
            availableColor.name.toLowerCase() ===
            productColorValue.toLowerCase()
    );
    const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
    const colorHex = color?.hex
        ? color.hex
        : hexColorPattern.test(productColorValue)
          ? productColorValue
          : "#D9D9D9";
    const productPrice = currentProduct.sellValue ?? currentProduct.rentValue ?? null;

    React.useEffect(
        function trackProductView() {
            trackEvent("view_item", {
                currency: "BRL",
                value: Number(productPrice || 0),
                items: [
                    {
                        item_id: String(currentProduct.code || currentProduct.id || ""),
                        item_name: currentProduct.name || "",
                        item_category: currentProduct.category || "",
                        price: Number(productPrice || 0),
                        quantity: 1,
                    },
                ],
            });
        },
        [currentProduct.category, currentProduct.code, currentProduct.id, currentProduct.name, productPrice]
    );

    // All possible sizes from 36 to 70
    const ALL_SIZES = [
        36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70,
    ];

    // Get available sizes from product data (array or fallback to old single size).
    // Mantém labels simbólicos (ex.: "unico") sem NaN — usado em estoque e UI.
    const availableSizes = normalizeAndSortSizeList(
        currentProduct.availableSizes ||
            (currentProduct.size ? [currentProduct.size] : [])
    );

    // Format sizes for display - returns text like "Todos", "36 - 58", or shows buttons
    function formatSizesDisplay() {
        if (availableSizes.length === 0) {
            return { type: "text", value: "-" };
        }

        if (availableSizes.length === 1) {
            return { type: "single", value: availableSizes[0] };
        }

        // 4 or less sizes: show buttons
        if (availableSizes.length <= 4) {
            return { type: "buttons", value: availableSizes };
        }

        // 5+ sizes: show summary text
        const min = availableSizes[0];
        const max = availableSizes[availableSizes.length - 1];

        // Check if it's ALL sizes (36-70)
        if (
            availableSizes.length === ALL_SIZES.length &&
            min === 36 &&
            max === 70
        ) {
            return { type: "summary", value: "Todos", sizes: availableSizes };
        }

        // Show range
        return {
            type: "summary",
            value: `${min} - ${max}`,
            sizes: availableSizes,
        };
    }

    const sizesDisplay = formatSizesDisplay();

    // handle go back to the previous page with dynamic category name
    function handleGoBack() {
        navigate(-1);
    }

    function handleSpecialistClick() {
        const mensagem =
            `Olá! Tenho interesse no seguinte produto da ESDRA:\n\n` +
            `Código: ${currentProduct.code}\n` +
            `Nome: ${currentProduct.name}\n` +
            `Categoria: ${currentProduct.category}\n` +
            `Cor: ${currentProduct.color}\n` +
            `Tamanho: ${
                selectedSize != null
                    ? formatSizeLabelForDisplay(selectedSize)
                    : "Nao selecionado"
            }\n` +
            `Preco: ${productPrice != null ? `R$ ${formatPrice(productPrice)}` : "Nao informado"}\n\n` +
            `Link do produto: ${window.location.href}`;

        window.open(
            `https://wa.me/6332152474?text=${encodeURIComponent(mensagem)}`,
            "_blank"
        );
    }

    function handleSizeSelection(size) {
        setSelectedSize(size);
    }

    // Auto-select size if product has only 1 size and 1 unit available
    React.useEffect(
        function autoSelectSingleSize() {
            async function checkAndAutoSelect() {
                if (
                    currentProduct.id &&
                    availableSizes.length === 1 &&
                    !selectedSize
                ) {
                    try {
                        const singleSize = availableSizes[0];
                        const available = await getAvailableQuantity(
                            currentProduct.id,
                            singleSize
                        );
                        // Auto-select whenever there is stock for the only size option
                        if (available > 0) {
                            setSelectedSize(singleSize);
                            setAvailableQuantity(available);
                        }
                    } catch (error) {
                        console.error(
                            "Erro ao verificar disponibilidade:",
                            error
                        );
                    }
                }
            }
            checkAndAutoSelect();
        },
        [currentProduct.id, availableSizes, selectedSize]
    );

    // Check availability when size is selected
    React.useEffect(
        function checkAvailability() {
            async function check() {
                if (currentProduct.id && selectedSize) {
                    try {
                        const available = await getAvailableQuantity(
                            currentProduct.id,
                            selectedSize
                        );
                        setAvailableQuantity(available);
                    } catch (error) {
                        console.error(
                            "Erro ao verificar disponibilidade:",
                            error
                        );
                        setAvailableQuantity(null);
                    }
                } else {
                    setAvailableQuantity(null);
                }
            }
            check();
        },
        [currentProduct.id, selectedSize]
    );

    async function handleAddToCart() {
        let sizeToUse = selectedSize;
        let quantityToCheck = availableQuantity;

        // Check if product has multiple sizes and user hasn't selected one
        if (!selectedSize) {
            // If there are multiple sizes, user must select one
            if (availableSizes.length > 1) {
                setError("Por favor, selecione um tamanho");
                toast.warn("Por favor, selecione um tamanho antes de adicionar ao carrinho");
                return;
            }
            // If only one size, auto-use it when there is stock
            if (availableSizes.length === 1) {
                try {
                    const singleSize = availableSizes[0];
                    const available = await getAvailableQuantity(
                        currentProduct.id,
                        singleSize
                    );
                    if (available > 0) {
                        sizeToUse = singleSize;
                        quantityToCheck = available;
                        setSelectedSize(singleSize);
                        setAvailableQuantity(available);
                    } else {
                        setError("Produto indisponível");
                        toast.error("Produto indisponível");
                        return;
                    }
                } catch (error) {
                    console.error("Erro ao verificar disponibilidade:", error);
                    setError("Por favor, selecione um tamanho");
                    toast.warn("Por favor, selecione um tamanho");
                    return;
                }
            } else {
                setError("Por favor, selecione um tamanho");
                toast.warn("Por favor, selecione um tamanho");
                return;
            }
        }

        if (quantityToCheck !== null && quantityToCheck <= 0) {
            setError("Produto indisponível neste tamanho");
            toast.error("Produto indisponível neste tamanho");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (productPrice == null) {
                throw new Error("Preco nao disponivel");
            }

            await addToCart({
                productId: currentProduct.id,
                productCode: currentProduct.code,
                productName: currentProduct.name,
                productImage:
                    currentProduct.images?.[currentProduct.coverIndex || 0] ||
                    currentProduct.images?.[0],
                size: sizeToUse,
                quantity: 1,
                price: productPrice,
                type: "sale",
            });

            trackEvent("add_to_cart", {
                currency: "BRL",
                value: Number(productPrice || 0),
                items: [
                    {
                        item_id: String(currentProduct.code || currentProduct.id || ""),
                        item_name: currentProduct.name || "",
                        item_variant: sizeToUse || "",
                        item_category: currentProduct.category || "",
                        price: Number(productPrice || 0),
                        quantity: 1,
                    },
                ],
            });

            // Success feedback
            setError(null);
            toast.success("Produto adicionado ao carrinho!");
        } catch (error) {
            setError(error.message || "Erro ao adicionar ao carrinho");
            toast.error(error.message || "Erro ao adicionar ao carrinho");
        } finally {
            setLoading(false);
        }
    }

    const handleShare = async () => {
        const shareData = {
            title: currentProduct.name,
            text:
                `Olha esse produto que encontrei na ESDRA!\n\n` +
                `${currentProduct.name} - ${currentProduct.category}\n` +
                `${productPrice != null ? `Preco: ${formatPrice(productPrice)}\n` : ""}`,
            url: window.location.href,
        };
        await navigator.share(shareData);
    };

    const handleImageClick = React.useCallback(
        (index) => {
            setCoverImage(index);
            setIsShowingVideo(false);
        },
        [setCoverImage]
    );

    function handleVideoClick() {
        setIsShowingVideo(true);
        setCoverImage(-1); // Indica que estamos mostrando vídeo
    }

    function handleRightClick() {
        if (isShowingVideo) {
            // Se está mostrando vídeo, ir para primeira imagem
            setIsShowingVideo(false);
            setCoverImage(0);
        } else if (coverImage < currentProduct.images.length - 1) {
            setCoverImage(coverImage + 1);
        } else if (hasVideo) {
            // Se está na última imagem e tem vídeo, voltar para o vídeo
            setIsShowingVideo(true);
            setCoverImage(-1);
        }
    }

    function handleLeftClick() {
        if (isShowingVideo) {
            // Se está mostrando vídeo, ir para última imagem
            setIsShowingVideo(false);
            setCoverImage(currentProduct.images.length - 1);
        } else if (coverImage > 0) {
            setCoverImage(coverImage - 1);
        } else if (hasVideo) {
            // Se está na primeira imagem e tem vídeo, voltar para o vídeo
            setIsShowingVideo(true);
            setCoverImage(-1);
        }
    }
    // handles arrow keys for main image navigation (when modal is closed)
    React.useEffect(() => {
        function handleMainImageKeyPress(event) {
            if (isModalOpen) return;

            if (event.key === "ArrowRight") {
                handleRightClick();
            }
            if (event.key === "ArrowLeft") {
                handleLeftClick();
            }
        }

        document.addEventListener("keydown", handleMainImageKeyPress);
        return () => {
            document.removeEventListener("keydown", handleMainImageKeyPress);
        };
    }, [
        coverImage,
        isShowingVideo,
        currentProduct.images.length,
        isModalOpen,
        hasVideo,
    ]);

    // handles arrow keys when modal is open
    React.useEffect(() => {
        function handleKeyPress(event) {
            if (!isModalOpen) return;

            const currentSlide = swiperRef.current?.swiper.activeIndex || 0;
            const totalSlides = totalMediaCount;

            if (event.key === "ArrowRight" && currentSlide < totalSlides - 1) {
                swiperRef.current?.swiper.slideNext();
            }
            if (event.key === "ArrowLeft" && currentSlide > 0) {
                swiperRef.current?.swiper.slidePrev();
            }
        }

        document.addEventListener("keydown", handleKeyPress);
        return () => {
            document.removeEventListener("keydown", handleKeyPress);
        };
    }, [isModalOpen, totalMediaCount]);

    function handleCloseModal() {
        // Pausar vídeo ao fechar modal e sincronizar tempo com vídeo principal
        if (videoRef.current && isShowingVideo && hasVideo) {
            const modalVideoTime = videoRef.current.currentTime;
            videoRef.current.pause();
            
            // Sincronizar tempo com vídeo principal (-1 segundo)
            if (mainVideoRef.current && modalVideoTime > 0) {
                const newTime = Math.max(0, modalVideoTime - 1);
                mainVideoRef.current.currentTime = newTime;
                // Continuar reprodução do vídeo principal após sincronizar
                setTimeout(() => {
                    if (mainVideoRef.current) {
                        mainVideoRef.current.play().catch(function (error) {
                            console.error("Erro ao reproduzir vídeo principal:", error);
                        });
                    }
                }, 100);
            }
        }
        setIsModalOpen(false);
    }

    function handleModalImage() {
        setIsModalOpen(true);
        
        // Capturar tempo do vídeo principal (mesmo que não esteja tocando)
        let mainVideoTime = 0;
        if (mainVideoRef.current && hasVideo) {
            mainVideoTime = mainVideoRef.current.currentTime;
            // Pausar vídeo principal se estiver tocando
            if (isShowingVideo) {
                mainVideoRef.current.pause();
            }
        }
        
        // Definir slide inicial baseado no que está sendo mostrado
        // Se vídeo existe, ele é o índice 0, então imagens começam em 1
        const initialIndex =
            isShowingVideo && hasVideo ? 0 : hasVideo ? coverImage + 1 : coverImage;
        setModalCurrentIndex(initialIndex);
        
        // Usar setTimeout para garantir que o swiper está pronto
        setTimeout(() => {
            swiperRef.current?.swiper.slideTo(initialIndex);
            // Se o vídeo for o slide inicial, sincronizar tempo e tocar
            if (
                hasVideo &&
                initialIndex === 0 &&
                videoRef.current
            ) {
                // Sincronizar tempo do vídeo do modal (-1 segundo do vídeo principal)
                if (mainVideoTime > 0) {
                    const modalVideoTime = Math.max(0, mainVideoTime - 1);
                    videoRef.current.currentTime = modalVideoTime;
                }
                
                setTimeout(() => {
                    videoRef.current?.play().catch(function (error) {
                        console.error("Erro ao reproduzir vídeo:", error);
                    });
                }, 200);
            }
        }, 100);
    }
    // handles escape key when modal is open
    React.useEffect(() => {
        function handleEscapeKey(event) {
            if (event.key === "Escape") {
                handleCloseModal();
            }
        }

        document.addEventListener("keydown", handleEscapeKey);

        return () => {
            document.removeEventListener("keydown", handleEscapeKey);
        };
    }, [isModalOpen]);

    return (
        <>
            <Link onClick={handleGoBack} className={styles.backButton}>
                <svg
                    className={styles.backButtonIcon}
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                >
                    <path
                        d="M15 18L9 12L15 6"
                        stroke="#000000"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
                <p className={styles.backButtonText}>
                    Voltar para {`${currentProduct.category}`}
                </p>
            </Link>
            <div className={styles.productDetailsContainer}>
                <div className={`${styles.imageContainer} ${totalMediaCount <= 1 ? styles.noPreview : ''}`}>
                    {isModalOpen && (
                        <div className={styles.modal} onClick={handleCloseModal}>
                            <p className={styles.modalImageLength}>
                                {modalCurrentIndex + 1} / {modalImageLength}
                            </p>
                            <button
                                className={styles.closeModalButton}
                                onClick={handleCloseModal}
                                aria-label="Fechar"
                            >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                </svg>
                            </button>
                            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                                <Swiper
                                    ref={swiperRef}
                                    className={styles.modalSwiper}
                                    spaceBetween={30}
                                    hashNavigation={{
                                        watchState: true,
                                    }}
                                    pagination={{
                                        clickable: true,
                                    }}
                                    navigation={true}
                                    modules={[
                                        Pagination,
                                        Navigation,
                                        HashNavigation,
                                    ]}
                                    initialSlide={
                                        isShowingVideo && hasVideo
                                            ? 0
                                            : hasVideo
                                            ? coverImage + 1
                                            : coverImage
                                    }
                                    onSlideChange={(swiper) => {
                                        const activeIndex = swiper.activeIndex;
                                        setModalCurrentIndex(activeIndex);

                                        // Controlar reprodução do vídeo apenas quando estiver no slide do vídeo
                                        if (videoRef.current) {
                                            if (hasVideo && activeIndex === 0) {
                                                // Vídeo está ativo, tocar
                                                videoRef.current
                                                    .play()
                                                    .catch(function (error) {
                                                        console.error(
                                                            "Erro ao reproduzir vídeo:",
                                                            error
                                                        );
                                                    });
                                                setIsShowingVideo(true);
                                                setCoverImage(-1);
                                            } else {
                                                // Vídeo não está ativo, pausar
                                                videoRef.current.pause();
                                                setIsShowingVideo(false);
                                                setCoverImage(hasVideo ? activeIndex - 1 : activeIndex);
                                            }
                                        } else {
                                            if (hasVideo && activeIndex === 0) {
                                                setIsShowingVideo(true);
                                                setCoverImage(-1);
                                            } else {
                                                setIsShowingVideo(false);
                                                setCoverImage(hasVideo ? activeIndex - 1 : activeIndex);
                                            }
                                        }
                                    }}
                                >
                                    {hasVideo && (
                                        <SwiperSlide
                                            className={styles.modalImageContainer}
                                        >
                                            <video
                                                ref={videoRef}
                                                className={styles.modalVideo}
                                                src={currentProduct.video}
                                                controls
                                                playsInline
                                            />
                                        </SwiperSlide>
                                    )}
                                    {currentProduct.images.map(
                                        (imageUrl, index) => (
                                            <SwiperSlide
                                                className={styles.modalImageContainer}
                                                key={index}
                                            >
                                                <img
                                                    className={styles.modalImage}
                                                    src={imageUrl}
                                                    alt={currentProduct.name}
                                                />
                                            </SwiperSlide>
                                        )
                                    )}
                                </Swiper>
                            </div>
                        </div>
                    )}
                    {isShowingVideo && hasVideo ? (
                        <video
                            ref={mainVideoRef}
                            className={styles.imageCover}
                            onClick={handleModalImage}
                            src={currentProduct.video}
                            autoPlay
                            loop
                            muted
                            playsInline
                        />
                    ) : (
                        <img
                            className={styles.imageCover}
                            onClick={handleModalImage}
                            src={currentProduct.images[coverImage]}
                            alt={currentProduct.name}
                        />
                    )}
                    {totalMediaCount > 1 && (
                        <div className={styles.miniContainer}>
                            {hasVideo && (
                                <div
                                    className={`${styles.videoMini} ${
                                        isShowingVideo ? styles.selectedImage : ""
                                    }`}
                                    onClick={handleVideoClick}
                                >
                                    <video
                                        className={styles.videoMiniPlayer}
                                        src={currentProduct.video}
                                        muted
                                    />
                                    <div className={styles.videoMiniIcon}>
                                        <VideoIcon />
                                    </div>
                                </div>
                            )}
                            {currentProduct.images.map((imageUrl, index) => (
                                <img
                                    key={index}
                                    className={`${styles.imageMini} ${
                                        index === coverImage && !isShowingVideo
                                            ? styles.selectedImage
                                            : ""
                                    }`}
                                    src={imageUrl}
                                    alt={`${currentProduct.name} - Imagem ${
                                        index + 1
                                    }`}
                                    onClick={() => handleImageClick(index)}
                                />
                            ))}
                        </div>
                    )}
                    <div className={styles.buttonsContainer}>
                        <div className={styles.shareAndLikeContainer}>
                            <div className={styles.shareWrapper}>
                                <button
                                    className={styles.shareButton}
                                    onClick={handleShare}
                                >
                                    <svg
                                        onClick={() => {
                                            navigator.clipboard.writeText(
                                                window.location.href
                                            );
                                        }}
                                        className={styles.shareButton}
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <g id="Communication">
                                            <path
                                                id="Vector"
                                                d="M9 6L12 3M12 3L15 6M12 3V13M7.00023 10C6.06835 10 5.60241 10 5.23486 10.1522C4.74481 10.3552 4.35523 10.7448 4.15224 11.2349C4 11.6024 4 12.0681 4 13V17.8C4 18.9201 4 19.4798 4.21799 19.9076C4.40973 20.2839 4.71547 20.5905 5.0918 20.7822C5.5192 21 6.07899 21 7.19691 21H16.8036C17.9215 21 18.4805 21 18.9079 20.7822C19.2842 20.5905 19.5905 20.2839 19.7822 19.9076C20 19.4802 20 18.921 20 17.8031V13C20 12.0681 19.9999 11.6024 19.8477 11.2349C19.6447 10.7448 19.2554 10.3552 18.7654 10.1522C18.3978 10 17.9319 10 17 10"
                                                stroke="#000000"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </g>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        {totalMediaCount > 1 && (
                            <div className={styles.controlsContainer}>
                                <svg
                                    className={styles.leftButton}
                                    onClick={() => handleLeftClick()}
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    style={{ transform: "rotate(180deg)" }}
                                >
                                    <path
                                        d="M6 12H18M18 12L13 7M18 12L13 17"
                                        stroke="#000000"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                                <svg
                                    className={styles.rightButton}
                                    onClick={() => handleRightClick()}
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M6 12H18M18 12L13 7M18 12L13 17"
                                        stroke="#000000"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                        )}
                    </div>
                </div>
                <div className={styles.productInfoContainer}>
                    <div className={styles.productPriceContainer}>
                        <h4 className={styles.category}>
                            {currentProduct.category}
                        </h4>
                        <h3 className={styles.name}>{currentProduct.name}</h3>
                        {productPrice != null && (
                            <>
                                <h4 className={styles.category}>Preco:</h4>
                                <p className={styles.sellValue}>
                                    R$ {formatPrice(productPrice)}
                                </p>
                            </>
                        )}
                    </div>
                    <div className={styles.productDetailContainer}>
                        <h4>Código: {currentProduct.code}</h4>
                        <h4>Descrição:</h4>
                        <p className={styles.productDetail}>
                            {currentProduct.productDetail}
                        </p>
                        <p className={styles.color}>
                            Cor: <span>{currentProduct.color}</span>
                        </p>
                        <div className={styles.colorContainer}>
                            <div className={styles.colorBlock}>
                                <div
                                    className={styles.colorInside}
                                    style={{ backgroundColor: colorHex }}
                                ></div>
                            </div>
                        </div>
                        <div className={styles.productSizeContainer}>
                            <h4>Tamanhos Disponíveis: </h4>

                            {sizesDisplay.type === "text" && (
                                <span className={styles.sizeText}>
                                    {sizesDisplay.value}
                                </span>
                            )}

                            {sizesDisplay.type === "single" && (
                                <div className={styles.sizeButtonsContainer}>
                                    <button
                                        className={`${styles.sizeButton} ${
                                            selectedSize === sizesDisplay.value
                                                ? styles.selectedSize
                                                : ""
                                        }`}
                                        onClick={function onSingleSizeClick() {
                                            handleSizeSelection(
                                                sizesDisplay.value
                                            );
                                        }}
                                    >
                                        {formatSizeLabelForDisplay(
                                            sizesDisplay.value
                                        )}
                                    </button>
                                </div>
                            )}

                            {sizesDisplay.type === "buttons" && (
                                <div className={styles.sizeButtonsContainer}>
                                    {sizesDisplay.value.map(
                                        function renderSizeButton(size) {
                                            return (
                                                <button
                                                    key={String(size)}
                                                    className={`${
                                                        styles.sizeButton
                                                    } ${
                                                        selectedSize === size
                                                            ? styles.selectedSize
                                                            : ""
                                                    }`}
                                                    onClick={function onSizeClick() {
                                                        handleSizeSelection(
                                                            size
                                                        );
                                                    }}
                                                >
                                                    {formatSizeLabelForDisplay(
                                                        size
                                                    )}
                                                </button>
                                            );
                                        }
                                    )}
                                </div>
                            )}

                            {sizesDisplay.type === "summary" && (
                                <div className={styles.sizeSummaryContainer}>
                                    <span className={styles.sizeSummaryText}>
                                        {sizesDisplay.value}
                                    </span>
                                    <select
                                        className={styles.sizeSelect}
                                        value={selectedSize || ""}
                                        onChange={function onSizeSelectChange(
                                            e
                                        ) {
                                            const v = e.target.value;
                                            if (v === "") {
                                                handleSizeSelection(null);
                                                return;
                                            }
                                            handleSizeSelection(
                                                normalizeProductSizeToken(v)
                                            );
                                        }}
                                    >
                                        <option value="">Selecione</option>
                                        {sizesDisplay.sizes.map(
                                            function renderSizeOption(size) {
                                                return (
                                                    <option
                                                        key={String(size)}
                                                        value={size}
                                                    >
                                                        {formatSizeLabelForDisplay(
                                                            size
                                                        )}
                                                    </option>
                                                );
                                            }
                                        )}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className={styles.rentAndBuyContainer}>
                            <button
                                className={styles.rentButton}
                                onClick={handleSpecialistClick}
                            >
                                Falar com especialista
                            </button>
                            {productPrice != null && (
                                <div className={styles.addToCartWrapper}>
                                    <div className={styles.addToCartContainer}>
                                        {availableQuantity !== null &&
                                            availableQuantity > 0 && (
                                                <p
                                                    className={
                                                        styles.availability
                                                    }
                                                >
                                                    {availableQuantity <= 3
                                                        ? `Últimas ${availableQuantity} unidade(s)`
                                                        : `${availableQuantity} disponível(is)`}
                                                </p>
                                            )}
                                        {availableQuantity !== null &&
                                            availableQuantity === 0 && (
                                                <p
                                                    className={
                                                        styles.unavailable
                                                    }
                                                >
                                                    Indisponível
                                                </p>
                                            )}
                                        {error && (
                                            <p className={styles.error}>
                                                {error}
                                            </p>
                                        )}
                                        <button
                                            className={styles.addToCartButton}
                                            onClick={handleAddToCart}
                                            disabled={
                                                loading ||
                                                (availableSizes.length > 1 &&
                                                    !selectedSize) ||
                                                availableQuantity === null ||
                                                availableQuantity <= 0
                                            }
                                        >
                                            {loading
                                                ? "Adicionando..."
                                                : "Adicionar ao Carrinho"}
                                        </button>
                                    </div>
                                </div>
                            )}
                            {productPrice == null && (
                                    <p className={styles.noPriceMessage}>
                                        Preco nao disponivel
                                    </p>
                                )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
