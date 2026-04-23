import imageCompression from "browser-image-compression";
import { debug } from "./logger";

/**
 * Comprime uma imagem para otimização web
 * @param {File} file - Arquivo de imagem original
 * @returns {Promise<File>} - Arquivo de imagem comprimido
 */
export async function compressImage(file) {
    // Opções de compressão
    const options = {
        maxSizeMB: 1, // Tamanho máximo do arquivo após compressão (1 MB)
        quality: 0.7, // Qualidade da imagem (0 a 1, onde 0.7 = 70%)
        useWebWorker: true, // Usar Web Worker para não bloquear a UI
        fileType: file.type, // Preservar o tipo MIME original
    };

    try {
        debug(`Comprimindo imagem: ${file.name}`);
        debug(`Tamanho original: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

        const compressedFile = await imageCompression(file, options);

        debug(`Tamanho comprimido: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);

        // Retornar o arquivo comprimido com o nome original
        return new File([compressedFile], file.name, {
            type: compressedFile.type,
            lastModified: Date.now(),
        });
    } catch (error) {
        console.error("Erro ao comprimir imagem:", error);
        // Em caso de erro, retornar o arquivo original
        return file;
    }
}

/**
 * Comprime múltiplas imagens
 * @param {File[]} files - Array de arquivos de imagem
 * @returns {Promise<File[]>} - Array de arquivos comprimidos
 */
export async function compressImages(files) {
    const compressionPromises = files.map((file) => compressImage(file));
    return Promise.all(compressionPromises);
}

