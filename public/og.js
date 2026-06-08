// api/og.js — Genera meta tags Open Graph por producto

module.exports = async (req, res) => {
  const slug = (req.query.slug || "").toLowerCase().trim();

  const STORE_NAME = "DS Distribuidora San Francisco";
  const baseUrl = "https://" + req.headers.host;

  if (!slug) {
    res.setHeader("Location", "/");
    res.status(302).end();
    return;
  }

  // ── Buscar producto en Firebase ─────────────────────────────────
  const FIREBASE_URL = "https://dsdistribuidorasfc-2e8ed-default-rtdb.firebaseio.com/products.json";

  let ogTitle = STORE_NAME;
  let ogDesc = STORE_NAME;
  let ogImage = "";
  let ogPrice = "";

  try {
    const fbRes = await fetch(FIREBASE_URL);
    if (fbRes.ok) {
      const data = await fbRes.json();
      if (data) {
        const productos = Object.values(data);
        const producto = productos.find(p => {
          if (p.slug && p.slug.toLowerCase() === slug) return true;
          if (p.name) {
            const generado = p.name.toLowerCase()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "");
            if (generado === slug) return true;
          }
          return false;
        });

        if (producto) {
          ogTitle = producto.name || STORE_NAME;
          // Bug 1 fix: precio con 2 decimales
          ogPrice = producto.price ? Number(producto.price).toFixed(2) : "";
          const priceStr = ogPrice ? " — Q" + ogPrice : "";
          // Bug 2 fix: descripción siempre incluye el nombre + precio
          ogDesc = (producto.desc && producto.desc.trim())
            ? producto.desc + priceStr
            : ogTitle + priceStr;
          ogImage = producto.imgUrl || producto.img || "";
          // Imágenes base64 no sirven en OG — ignorar
          if (ogImage.startsWith("data:")) ogImage = "";
        }
      }
    }
  } catch (err) {
    console.error("Error consultando Firebase:", err);
  }

  const pageUrl = baseUrl + "/" + slug;
  // Bug 3 fix: el SPA espera /?producto= con el nombre, no producto_slug
  // Se redirige al slug directamente para que el rewrite del SPA lo abra
  const redirectUrl = "/?producto=" + encodeURIComponent(ogTitle !== STORE_NAME ? ogTitle : slug);

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${ogTitle}</title>
<meta name="description" content="${ogDesc}">
<meta http-equiv="refresh" content="0;url=${redirectUrl}">
<meta property="og:type" content="product">
<meta property="og:url" content="${pageUrl}">
<meta property="og:title" content="${ogTitle}">
<meta property="og:description" content="${ogDesc}">
<meta property="og:site_name" content="${STORE_NAME}">
${ogImage ? '<meta property="og:image" content="' + ogImage + '">\n<meta property="og:image:width" content="800">\n<meta property="og:image:height" content="800">' : ""}
${ogPrice ? '<meta property="og:price:amount" content="' + ogPrice + '">\n<meta property="og:price:currency" content="GTQ">' : ""}
<meta name="twitter:card" content="${ogImage ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${ogTitle}">
<meta name="twitter:description" content="${ogDesc}">
${ogImage ? '<meta name="twitter:image" content="' + ogImage + '">' : ""}
</head>
<body>
<script>window.location.replace(${JSON.stringify(redirectUrl)});</script>
<p>Cargando...</p>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=3600");
  res.status(200).send(html);
};
