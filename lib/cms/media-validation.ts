import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { mediaFormat } from "./media-formats";

export async function inspectMedia(bytes: Buffer, mime: string) {
  const format = mediaFormat(mime);
  const signature = await fileTypeFromBuffer(bytes);
  if (!format || signature?.mime !== mime)
    throw new Error("File content does not match the selected format.");
  if (format.kind === "video")
    return { width: null, height: null, thumbnail: null };

  const image = sharp(bytes, { limitInputPixels: 32_000_000, failOn: "error" });
  const meta = await image.metadata();
  const frameHeight = meta.pageHeight ?? meta.height;
  if (!meta.width || !frameHeight || meta.width * frameHeight > 32_000_000)
    throw new Error("Image dimensions could not be read.");
  const turned = meta.orientation && meta.orientation >= 5;
  const width = turned ? frameHeight : meta.width;
  const height = turned ? meta.width : frameHeight;
  // GIF is played from the preserved original when explicitly opened.
  const thumbnail =
    mime === "image/gif"
      ? null
      : await image
          .rotate()
          .resize(480, 360, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
  return { width, height, thumbnail };
}
