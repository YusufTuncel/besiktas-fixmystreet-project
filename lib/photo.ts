// Fotoğrafı istemcide küçültüp JPEG'e çevirir (sunucuya ≤ ~200 KB gider)
export function resizePhoto(file: File, max = 800): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => rej(new Error("image")); img.src = u;
  });
}
