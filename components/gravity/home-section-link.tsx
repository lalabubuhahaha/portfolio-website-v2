"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<"a">, "href"> & {
  section: "about" | "contact" | "drop" | "shape" | "release";
};
export function HomeSectionLink({ section, children, ...props }: Props) {
  const pathname = usePathname();
  // Native fragments preserve the current query, history, and mounted WebGL world.
  return pathname === "/" ? (
    <a href={`#${section}`} {...props}>
      {children}
    </a>
  ) : (
    <Link href={`/#${section}`} {...props}>
      {children}
    </Link>
  );
}
