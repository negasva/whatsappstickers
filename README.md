# ⚡ StickerCut - Creador Rápido de Stickers para WhatsApp

Una aplicación web moderna, rápida y 100% privada para crear stickers de WhatsApp con **recorte automático de fondo** y copiado directo al portapapeles sin bordes blancos molestos.

---

## ✨ Características Principales

* 🔒 **100% Privado & Costo $0:** Todo el recorte por IA ocurre directamente en el navegador del usuario vía WebAssembly. Las fotos jamás se suben a ningún servidor ni base de datos.
* 🤖 **Recorte Inteligente Automático:** Aísla el sujeto principal con bordes limpios y transparentes al instante.
* 👻 **Modo Guía / Fantasma (30% Opacidad):** Al activar el pincel o borrador, el fondo original se muestra al 30% de opacidad para que puedas ver exactamente qué corregir.
* 🖌️ **Pincel Restaurador:** Recupera detalles que la IA haya borrado por error.
* 🧹 **Borrador Manual:** Elimina elementos no deseados con control de tamaño del trazo.
* ✂️ **Ajuste de Encuadre (Crop):** Opción de auto-ajuste al sujeto recortado para centrar el sticker.
* 🔤 **Texto Rápido:** Agrega texto estilo meme con borde negro para stickers divertidos.
* 📋 **Copiar Directo a WhatsApp:** Copia el sticker al portapapeles en un solo clic listo para pegar (`Ctrl + V` o pegar en móvil) en el chat de WhatsApp.
* 📲 **Compartir / Descargar:** Soporte nativo para Web Share API o descarga en formato PNG transparente 512x512 estándar.

---

## 🚀 Despliegue en Vercel

1. Ve a [Vercel](https://vercel.com).
2. Haz clic en **Add New Project**.
3. Importa el repositorio: `https://github.com/negasva/whatsappstickers`.
4. El framework preset se detectará automáticamente como **Vite**.
5. Haz clic en **Deploy**. ¡Listo en menos de 1 minuto!

---

## 💻 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build
```
