export function profilePhotoSrc(path) {
  if (!path) return "";
  const apiUrl = import.meta.env.VITE_API_URL || "/api/v1";
  const origin = new URL(apiUrl, window.location.href).origin;
  return new URL(path, `${origin}/`).href;
}

export function cropProfilePhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith("image/")) {
      reject(new Error("Choose an image for your profile photo."));
      return;
    }
    const source = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      try {
        const side = Math.min(image.naturalWidth, image.naturalHeight);
        if (!side) throw new Error("This image could not be opened.");
        const x = (image.naturalWidth - side) / 2;
        const y = (image.naturalHeight - side) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("This browser cannot crop the image.");
        context.drawImage(image, x, y, side, side, 0, 0, 512, 512);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.84);
        if (dataUrl.length > 2_900_000)
          throw new Error("That image is too large. Choose a smaller photo.");
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(source);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(source);
      reject(new Error("This image could not be opened."));
    };
    image.src = source;
  });
}
