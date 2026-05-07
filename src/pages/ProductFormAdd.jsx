import styles from "./ProductFormAdd.module.scss";
import { useState, useEffect } from "react";
import {
    useActionData,
    Form,
    redirect,
    useSubmit,
    useNavigate,
} from "react-router";
import {
    updateDoc,
    deleteDoc,
    normalizeString,
    createSearchableArray,
    getProductDocRef,
    getStoreId,
    setInventorySize,
    createUploadSession,
    createProduct,
    commitMedia,
    deleteMediaSecure,
    uploadFileWithSignedUrl,
} from "../firebase"; // add, delete, update, handle upload and download of files
import { parsePrice } from "../utils/priceUtils";
import { clampProductCoverIndex } from "../utils/productMedia";
import { normalizeFileContentType } from "../utils/mimeUtils";
import { getCallableErrorMessage } from "../utils/firebaseCallableErrors";
import { toast } from "react-toastify";
import { compressImages } from "../utils/imageCompression";
import { invalidateCache } from "../utils/cache";
import { VideoIcon } from "../assets/icons";
export async function productFormAddAction({ request }) {
    const formData = await request.formData();
    //variables that i need to normalize to handle search
    const normalizeName = normalizeString(formData.get("name"));
    const normalizeCategory = normalizeString(formData.get("category"));
    const normalizeCollection = formData.get("collection")
        ? normalizeString(formData.get("collection"))
        : "";

    try {
        const availableSizes = ["unico"];
        const sellValue = parsePrice(formData.get("sellValue"));

        if (sellValue === null) {
            return {
                error: "Por favor, preencha o valor de venda.",
                type: "missing_sell_price",
            };
        }

        const productDataPayload = {
            name: formData.get("name"),
            category: formData.get("category"),
            availableSizes: availableSizes,
            productDetail: formData.get("productDetail"),
            color: "",
            collection: formData.get("collection") || "",
            coverIndex: 0,
            lastModified: "",
            searchableName: normalizeName,
            searchableCategory: normalizeCategory,
            searchableNameArray: createSearchableArray(normalizeName),
            searchableColor: "",
            searchableCollection: normalizeCollection,
            rentValue: null,
            sellValue: sellValue,
        };

        const images = formData.getAll("images");
        const videoFile = formData.get("video");

        const filesToUpload = [];

        images.forEach(function (image) {
            if (!image || image.size <= 0) {
                return;
            }
            filesToUpload.push({
                kind: "image",
                file: image,
                contentType: normalizeFileContentType(image.type, image.name),
                size: image.size,
                extension: image.name.split(".").pop().toLowerCase(),
            });
        });

        if (videoFile && videoFile.size > 0) {
            filesToUpload.push({
                kind: "video",
                file: videoFile,
                contentType: normalizeFileContentType(
                    videoFile.type,
                    videoFile.name
                ),
                size: videoFile.size,
                extension: videoFile.name.split(".").pop().toLowerCase(),
            });
        }

        const imageFileCount = filesToUpload.filter(function (f) {
            return f.kind === "image";
        }).length;

        if (imageFileCount === 0) {
            return {
                error: "Adicione pelo menos uma imagem do produto.",
                type: "missing_images",
            };
        }

        const { productId: actualProductId } = await createProduct({
            productData: productDataPayload,
            storeId: getStoreId(),
        });
        const productDocRef = getProductDocRef(actualProductId);
        const uploadedObjects = [];
        let committedMediaUrls = [];

        try {
            const session = await createUploadSession({
                productId: actualProductId,
                filesMeta: filesToUpload.map(function (item) {
                    return {
                        kind: item.kind,
                        contentType: item.contentType,
                        size: item.size,
                        extension: item.extension,
                    };
                }),
            });

            for (let index = 0; index < filesToUpload.length; index += 1) {
                const sessionItem = session.uploads[index];
                const fileItem = filesToUpload[index];
                await uploadFileWithSignedUrl(
                    fileItem.file,
                    sessionItem.signedUrl,
                    fileItem.contentType
                );
                uploadedObjects.push({
                    kind: fileItem.kind,
                    objectKey: sessionItem.objectKey,
                });
            }

            const mediaResult = await commitMedia({
                productId: actualProductId,
                uploadedObjects,
                replaceVideo: Boolean(videoFile && videoFile.size > 0),
            });
            committedMediaUrls = [
                ...(mediaResult.images || []),
                ...(mediaResult.video ? [mediaResult.video] : []),
            ];

            const finalImages = mediaResult.images || [];
            const safeCover = clampProductCoverIndex(
                formData.get("coverImageIndex"),
                finalImages.length
            );

            await updateDoc(productDocRef, {
                images: finalImages,
                video: mediaResult.video || null,
                coverIndex: safeCover,
            });

            const stockQuantity = Number(formData.get("stockQuantity") || 0);
            await setInventorySize(
                actualProductId,
                "unico",
                Math.max(0, stockQuantity)
            );

            invalidateCache("productsLayout");
            invalidateCache("home");
            invalidateCache("productDetails");

            return redirect(
                "/dashboard?message=Produto adicionado com sucesso!&type=success"
            );
        } catch (mediaError) {
            console.error("productFormAddAction mídia:", mediaError);
            try {
                if (committedMediaUrls.length > 0) {
                    await deleteMediaSecure({
                        productId: actualProductId,
                        mediaUrls: committedMediaUrls,
                    });
                } else if (uploadedObjects.length > 0) {
                    await deleteMediaSecure({
                        productId: actualProductId,
                        objectKeys: uploadedObjects.map(function (item) {
                            return item.objectKey;
                        }),
                    });
                }
            } catch (cleanupErr) {
                console.error("productFormAddAction cleanup mídia:", cleanupErr);
            }
            try {
                await deleteDoc(productDocRef);
            } catch (delErr) {
                console.error("productFormAddAction rollback:", delErr);
            }
            const detail = getCallableErrorMessage(
                mediaError,
                "Falha ao enviar imagens ou confirmar mídia."
            );
            return redirect(
                "/dashboard?message=" +
                    encodeURIComponent(detail) +
                    "&type=error"
            );
        }
    } catch (error) {
        console.error("productFormAddAction:", error);
        const detail = getCallableErrorMessage(
            error,
            "Erro ao adicionar produto."
        );
        return redirect(
            "/dashboard?message=" + encodeURIComponent(detail) + "&type=error"
        );
    }
}

export default function ProductFormAdd() {
    const actionData = useActionData();
    const [selectedImages, setSelectedImages] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [previewVideoUrl, setPreviewVideoUrl] = useState(null);
    const [coverImageIndex, setCoverImageIndex] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);
    const [category, setCategory] = useState("");

    const submit = useSubmit();
    const navigate = useNavigate();

    function handleCategoryChange(e) {
        setCategory(e.target.value);
    }

    // Reset submitting state when there's an error
    useEffect(
        function resetSubmittingOnError() {
            if (
                actionData?.error ||
                actionData?.type === "missing_sell_price" ||
                actionData?.type === "missing_images"
            ) {
                setIsSubmitting(false);
            }
        },
        [actionData]
    );

    function handleSubmit(e) {
        e.preventDefault();

        // Prevenir múltiplos cliques
        if (isSubmitting) {
            return;
        }

        const formData = new FormData(e.target);

        // Validate selling price
        const sellValue = formData.get("sellValue");
        const parsedSellValue = parsePrice(sellValue);

        if (parsedSellValue === null) {
            toast.warn("Por favor, preencha o valor de venda.");
            return;
        }

        setIsSubmitting(true);

        // Remover as imagens antigas do input file (se houver)
        formData.delete("images");
        formData.delete("video");

        // Adicionar as imagens do estado
        selectedImages.forEach(function appendImage(imageObj) {
            formData.append("images", imageObj.file);
        });

        // Adicionar o vídeo se houver
        if (selectedVideo) {
            formData.append("video", selectedVideo);
        }

        // Add the cover image index to the form data
        formData.append("coverImageIndex", coverImageIndex.toString());

        formData.set("availableSizes", JSON.stringify(["unico"]));

        submit(formData, {
            method: "post",
            encType: "multipart/form-data",
        });
    }

    async function handleImageChange(e) {
        const files = Array.from(e.target.files);

        if (selectedImages.length + files.length > 5) {
            toast.warn("Máximo de 5 imagens permitido");
            return;
        }

        try {
            setIsCompressing(true);

            // Comprimir as imagens
            const compressedFiles = await compressImages(files);

            const isFirstUpload = selectedImages.length === 0;
            const newImages = compressedFiles.map((file, index) => ({
                file,
                isCover: isFirstUpload && index === 0, // Apenas a primeira imagem do primeiro upload será capa
            }));

            setSelectedImages((prev) => [...prev, ...newImages]);

            // Criar previews
            const newPreviewUrls = compressedFiles.map((file) =>
                URL.createObjectURL(file)
            );
            setPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
        } catch (error) {
            console.error("Erro ao processar imagens:", error);
            toast.error(
                "Erro ao processar as imagens. Por favor, tente novamente."
            );
        } finally {
            setIsCompressing(false);
        }
    }

    const removeImage = (index) => {
        setSelectedImages((prev) => prev.filter((_, i) => i !== index));
        setPreviewUrls((prev) => {
            // Limpar URL do objeto
            URL.revokeObjectURL(prev[index]);
            return prev.filter((_, i) => i !== index);
        });
        // Se a imagem removida era a capa, define a imagem anterior como capa
        if (selectedImages[index]?.isCover && selectedImages.length > 0) {
            const newCoverIndex = index > 0 ? index - 1 : 0;
            setSelectedImages((prev) =>
                prev.map((image, i) => ({
                    ...image,
                    isCover: i === newCoverIndex,
                }))
            );
            setCoverImageIndex(newCoverIndex);
        }
    };

    function handleVideoChange(e) {
        const file = e.target.files[0];
        if (!file) {
            return;
        }

        // Verificar se é um arquivo de vídeo
        if (!file.type.startsWith("video/")) {
            toast.warn("Por favor, selecione um arquivo de vídeo.");
            return;
        }

        // Limitar a 1 vídeo por produto
        if (selectedVideo) {
            if (previewVideoUrl) {
                URL.revokeObjectURL(previewVideoUrl);
            }
        }

        setSelectedVideo(file);
        const videoUrl = URL.createObjectURL(file);
        setPreviewVideoUrl(videoUrl);
    }

    function removeVideo() {
        if (previewVideoUrl) {
            URL.revokeObjectURL(previewVideoUrl);
        }
        setSelectedVideo(null);
        setPreviewVideoUrl(null);
    }

    const toggleCoverImage = (index) => {
        setSelectedImages((prev) =>
            prev.map((image, i) => ({
                ...image,
                isCover: i === index,
            }))
        );
        setCoverImageIndex(index);
    };

    // Listener para colar imagens e vídeos com Cmd+V ou Ctrl+V
    useEffect(
        function setupPasteListener() {
            async function handlePaste(e) {
                // Verificar se há itens na área de transferência
                if (!e.clipboardData || !e.clipboardData.items) {
                    return;
                }

                const items = Array.from(e.clipboardData.items);
                const imageItems = items.filter(
                    (item) => item.type.indexOf("image") !== -1
                );
                const videoItems = items.filter(
                    (item) => item.type.indexOf("video") !== -1
                );

                // Processar vídeos primeiro (apenas 1 vídeo permitido)
                if (videoItems.length > 0) {
                    e.preventDefault();

                    const videoItem = videoItems[0];
                    const blob = videoItem.getAsFile();
                    if (blob) {
                        const timestamp = Date.now();
                        const randomId = Math.random()
                            .toString(36)
                            .substring(2, 9);
                        const extension = blob.type.split("/")[1] || "mp4";
                        const fileName = `pasted-video-${timestamp}-${randomId}.${extension}`;

                        const file = new File([blob], fileName, {
                            type: blob.type,
                        });

                        if (selectedVideo) {
                            if (previewVideoUrl) {
                                URL.revokeObjectURL(previewVideoUrl);
                            }
                        }

                        setSelectedVideo(file);
                        const videoUrl = URL.createObjectURL(file);
                        setPreviewVideoUrl(videoUrl);
                    }
                    return;
                }

                // Processar imagens
                if (imageItems.length === 0) {
                    return;
                }

                // Verificar se não excede o limite de 5 imagens
                if (selectedImages.length + imageItems.length > 5) {
                    toast.warn(
                        `Máximo de 5 imagens permitido. Você pode adicionar apenas ${
                            5 - selectedImages.length
                        } imagem(ns).`
                    );
                    return;
                }

                e.preventDefault();

                try {
                    setIsCompressing(true);

                    // Converter os itens da área de transferência em arquivos
                    const filesPromises = imageItems.map((item) => {
                        return new Promise((resolve) => {
                            const blob = item.getAsFile();
                            if (blob) {
                                // Criar um nome único para o arquivo
                                const timestamp = Date.now();
                                const randomId = Math.random()
                                    .toString(36)
                                    .substring(2, 9);
                                const extension =
                                    blob.type.split("/")[1] || "png";
                                const fileName = `pasted-image-${timestamp}-${randomId}.${extension}`;

                                // Criar um novo File a partir do Blob
                                const file = new File([blob], fileName, {
                                    type: blob.type,
                                });
                                resolve(file);
                            } else {
                                resolve(null);
                            }
                        });
                    });

                    const files = await Promise.all(filesPromises);
                    const validFiles = files.filter((file) => file !== null);

                    if (validFiles.length === 0) {
                        return;
                    }

                    // Comprimir as imagens
                    const compressedFiles = await compressImages(validFiles);

                    const isFirstUpload = selectedImages.length === 0;
                    const newImages = compressedFiles.map((file, index) => ({
                        file,
                        isCover: isFirstUpload && index === 0,
                    }));

                    setSelectedImages((prev) => [...prev, ...newImages]);

                    // Criar previews
                    const newPreviewUrls = compressedFiles.map((file) =>
                        URL.createObjectURL(file)
                    );
                    setPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
                } catch (error) {
                    console.error("Erro ao processar imagens coladas:", error);
                    toast.error(
                        "Erro ao processar as imagens. Por favor, tente novamente."
                    );
                } finally {
                    setIsCompressing(false);
                }
            }

            document.addEventListener("paste", handlePaste);

            return function cleanup() {
                document.removeEventListener("paste", handlePaste);
            };
        },
        [selectedImages, selectedVideo, previewVideoUrl, isCompressing]
    );

    return (
        <>
            <Form
                method="post"
                className={styles.productform}
                encType="multipart/form-data"
                onSubmit={handleSubmit}
            >
                {actionData?.error && (
                    <div className={styles.error}>⚠️ {actionData.error}</div>
                )}
                {actionData?.message && (
                    <div
                        className={
                            actionData.success ? styles.success : styles.error
                        }
                    >
                        {actionData.message}
                    </div>
                )}
                <div className={styles.formgroup}>
                    <label htmlFor="name">Nome do Produto:</label>
                    <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        aria-label="Nome do produto"
                    />
                </div>
                <div className={styles.formgroup}>
                    <label htmlFor="category">Categoria:</label>
                    <select
                        name="category"
                        id="category"
                        required
                        aria-label="Categoria do produto"
                        onChange={handleCategoryChange}
                        value={category}
                    >
                        <option value="">Selecione a categoria</option>
                        <option value="Velas Aromaticas">Velas Aromaticas</option>
                        <option value="Sabonetes Artesanais">Sabonetes Artesanais</option>
                        <option value="Difusores">Difusores</option>
                        <option value="Kits de Autocuidado">Kits de Autocuidado</option>
                    </select>
                </div>
                <div className={styles.formgroup}>
                    <label htmlFor="collection">Coleção:</label>
                    <input
                        type="text"
                        name="collection"
                        id="collection"
                        placeholder="Deixe em branco se não pertencer a nenhuma coleção"
                        aria-label="Coleção do produto"
                    />
                </div>
                <div className={styles.formgroup}>
                    <label htmlFor="stockQuantity">Estoque Inicial:</label>
                    <input
                        type="number"
                        name="stockQuantity"
                        id="stockQuantity"
                        min="0"
                        defaultValue="0"
                        required
                        aria-label="Quantidade inicial em estoque"
                    />
                </div>
                <div className={styles.formgroup}>
                    <label htmlFor="productDetail">Detalhe do Produto:</label>
                    <textarea
                        type="text"
                        name="productDetail"
                        id="productDetail"
                        required
                        aria-label="Detalhes do produto"
                    />
                </div>
                <div className={styles.formgroup}>
                    <label htmlFor="sellValue">Valor de Venda:</label>
                    <input
                        type="text"
                        inputMode="decimal"
                        name="sellValue"
                        id="sellValue"
                        placeholder="Ex: 59,90"
                        aria-label="Valor de venda"
                        required
                    />
                </div>
                <div className={styles.imageUploadSection}>
                    <div className={styles.pasteHint}>
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M9 2C8.44772 2 8 2.44772 8 3C8 3.55228 8.44772 4 9 4H15C15.5523 4 16 3.55228 16 3C16 2.44772 15.5523 2 15 2H9Z"
                                fill="#666"
                            />
                            <path
                                d="M6 5C6 3.89543 6.89543 3 8 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V5C19 3.89543 18.1046 3 17 3H16C17.1046 3 18 3.89543 18 5V19C18 20.1046 17.1046 21 16 21H8C6.89543 21 6 20.1046 6 19V5Z"
                                fill="#666"
                            />
                        </svg>
                        <span>
                            Dica: Você pode colar imagens e vídeos diretamente do
                            clipboard com <kbd>Cmd+V</kbd> (Mac) ou{" "}
                            <kbd>Ctrl+V</kbd>
                        </span>
                    </div>
                    <div className={styles.imagePreviewContainer}>
                        {previewUrls.map((url, index) => (
                            <div key={index} className={styles.imagePreview}>
                                <img src={url} alt={`Preview ${index + 1}`} />
                                <button
                                    type="button"
                                    onClick={() => removeImage(index)}
                                    className={styles.removeImage}
                                >
                                    ×
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.coverImage} ${
                                        coverImageIndex === index
                                            ? styles.active
                                            : ""
                                    }`}
                                    onClick={() => toggleCoverImage(index)}
                                >
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="-1.7 -1.7 20.40 20.40"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <g>
                                            <rect
                                                x="-1.7"
                                                y="-1.7"
                                                width="20.40"
                                                height="20.40"
                                                rx="10.2"
                                                fill={
                                                    coverImageIndex === index
                                                        ? "#14db36"
                                                        : "#666"
                                                }
                                            />
                                        </g>
                                        <g>
                                            <path
                                                d="M3.432,6.189 C3.824,5.798 4.455,5.798 4.847,6.189 L6.968,8.31 L13.147,2.131 C13.531,1.747 14.157,1.753 14.548,2.144 L16.67,4.266 C17.06,4.657 17.066,5.284 16.684,5.666 L7.662,14.687 C7.278,15.07 6.651,15.064 6.261,14.673 L1.311,9.723 C0.92,9.333 0.92,8.7 1.311,8.31 L3.432,6.189 Z"
                                                fill="#ffffff"
                                            />
                                        </g>
                                    </svg>
                                </button>
                            </div>
                        ))}

                        {previewVideoUrl && (
                            <div className={styles.videoPreview}>
                                <video src={previewVideoUrl} controls />
                                <button
                                    type="button"
                                    onClick={removeVideo}
                                    className={styles.removeImage}
                                >
                                    ×
                                </button>
                                <div className={styles.videoIcon}>
                                    <VideoIcon />
                                </div>
                            </div>
                        )}

                        {previewUrls.length < 5 && (
                            <label className={styles.uploadButton}>
                                <input
                                    type="file"
                                    id="productImages"
                                    name="images"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageChange}
                                    style={{ display: "none" }}
                                    disabled={isCompressing}
                                />
                                <div className={styles.uploadPlaceholder}>
                                    <svg
                                        width="64px"
                                        height="64px"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <g
                                            id="SVGRepo_bgCarrier"
                                            strokeWidth="0"
                                        ></g>
                                        <g
                                            id="SVGRepo_tracerCarrier"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        ></g>
                                        <g id="SVGRepo_iconCarrier">
                                            <circle
                                                cx="12"
                                                cy="13"
                                                r="3"
                                                stroke="#000000"
                                                strokeWidth="1.5"
                                            ></circle>
                                            <path
                                                d="M2 13.3636C2 10.2994 2 8.76721 2.74902 7.6666C3.07328 7.19014 3.48995 6.78104 3.97524 6.46268C4.69555 5.99013 5.59733 5.82123 6.978 5.76086C7.63685 5.76086 8.20412 5.27068 8.33333 4.63636C8.52715 3.68489 9.37805 3 10.3663 3H13.6337C14.6219 3 15.4728 3.68489 15.6667 4.63636C15.7959 5.27068 16.3631 5.76086 17.022 5.76086C18.4027 5.82123 19.3044 5.99013 20.0248 6.46268C20.51 6.78104 20.9267 7.19014 21.251 7.6666C22 8.76721 22 10.2994 22 13.3636C22 16.4279 22 17.9601 21.251 19.0607C20.9267 19.5371 20.51 19.9462 20.0248 20.2646C18.9038 21 17.3433 21 14.2222 21H9.77778C6.65675 21 5.09624 21 3.97524 20.2646C3.48995 19.9462 3.07328 19.5371 2.74902 19.0607C2.53746 18.7498 2.38566 18.4045 2.27673 18"
                                                stroke="#000000"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                            ></path>{" "}
                                            <path
                                                d="M19 10H18"
                                                stroke="#000000"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                            ></path>
                                        </g>
                                    </svg>
                                    <span>Adicionar foto</span>
                                    <span className={styles.imageCount}>
                                        {previewUrls.length + 1}/5
                                    </span>
                                </div>
                            </label>
                        )}

                        {!previewVideoUrl && (
                            <label className={styles.uploadButton}>
                                <input
                                    type="file"
                                    id="productVideo"
                                    name="video"
                                    accept="video/*"
                                    onChange={handleVideoChange}
                                    style={{ display: "none" }}
                                />
                                <div className={styles.uploadPlaceholder}>
                                    <svg
                                        width="64px"
                                        height="64px"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <path
                                            d="M15 10L19.553 7.276C20.217 6.886 21 7.33 21 8.118V15.882C21 16.67 20.217 17.114 19.553 16.724L15 14V10Z"
                                            fill="#000000"
                                        />
                                        <rect
                                            x="3"
                                            y="6"
                                            width="10"
                                            height="12"
                                            rx="2"
                                            stroke="#000000"
                                            strokeWidth="2"
                                            fill="none"
                                        />
                                    </svg>
                                    <span>Adicionar vídeo</span>
                                </div>
                            </label>
                        )}
                    </div>
                    {isCompressing && (
                        <div className={styles.compressionFeedback}>
                            <span>Comprimindo imagens...</span>
                        </div>
                    )}
                </div>
                <div className={styles.buttonsContainer}>
                    <button
                        type="button"
                        className={styles.cancelbutton}
                        onClick={() => navigate("/dashboard")}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className={styles.submitbutton}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Salvando..." : "Salvar Produto"}
                    </button>
                </div>
            </Form>
        </>
    );
}
