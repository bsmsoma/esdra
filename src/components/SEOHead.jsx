import { Helmet } from "react-helmet-async";

export const SITE_URL = import.meta.env.VITE_SITE_URL || "https://esdraaromas.com.br";
const SITE_NAME = "Esdra Aromas";
const DEFAULT_DESCRIPTION =
    "Perfumes artesanais, sabonetes naturais e cosméticos únicos. Compre online com entrega para todo o Brasil.";

export default function SEOHead({
    title,
    description,
    image,
    canonical,
    type = "website",
    noindex = false,
    schema,
}) {
    const pageTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    const pageDescription = description || DEFAULT_DESCRIPTION;

    return (
        <Helmet>
            <title>{pageTitle}</title>
            <meta name="description" content={pageDescription} />
            {noindex && <meta name="robots" content="noindex, nofollow" />}
            {canonical && <link rel="canonical" href={canonical} />}

            <meta property="og:type" content={type} />
            <meta property="og:title" content={pageTitle} />
            <meta property="og:description" content={pageDescription} />
            <meta property="og:site_name" content={SITE_NAME} />
            {canonical && <meta property="og:url" content={canonical} />}
            {image && <meta property="og:image" content={image} />}
            {image && <meta property="og:image:width" content="1200" />}
            {image && <meta property="og:image:height" content="630" />}
            {image && <meta property="og:image:alt" content={pageTitle} />}

            {schema && (
                <script type="application/ld+json">
                    {JSON.stringify(schema)}
                </script>
            )}
        </Helmet>
    );
}
