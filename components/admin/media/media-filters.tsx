import { MEDIA_FORMATS } from "@/lib/cms/media-formats";
import { Input, Select } from "../ui/fields";

export function MediaFilterFields({
  q = "",
  type = "",
  imagesOnly = false,
}: {
  q?: string;
  type?: string;
  imagesOnly?: boolean;
}) {
  return (
    <>
      <Input
        name="q"
        aria-label="Search media"
        placeholder="Search media…"
        defaultValue={q}
        maxLength={120}
        className="min-w-0 flex-1 basis-44"
      />
      <Select
        name="type"
        aria-label="File format"
        defaultValue={type}
        className="max-w-full"
      >
        <option value="">All formats</option>
        {!imagesOnly && (
          <>
            <option value="image">All images</option>
            <option value="video">All videos</option>
          </>
        )}
        {Object.entries(MEDIA_FORMATS)
          .filter(([, format]) => !imagesOnly || format.kind === "image")
          .map(([mime, format]) => (
            <option key={mime} value={mime}>
              {format.label}
            </option>
          ))}
      </Select>
    </>
  );
}
