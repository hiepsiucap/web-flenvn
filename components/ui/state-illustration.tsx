"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

const illustrations = {
  books: { src: "/images/states/empty-books.webp", width: 640, height: 427 },
  search: { src: "/images/states/search-empty.webp", width: 640, height: 427 },
  connection: { src: "/images/states/connection-error.webp", width: 640, height: 585 },
  "not-found": { src: "/images/states/not-found.webp", width: 640, height: 427 },
};

export type StateIllustrationKind = keyof typeof illustrations;

export function StateIllustration({ kind, className }: { kind: StateIllustrationKind; className?: string }) {
  const [failedSource, setFailedSource] = useState("");
  const image = illustrations[kind];
  if (failedSource === image.src) return null;

  return (
    <Image
      {...image}
      alt=""
      sizes="(min-width: 640px) 240px, 192px"
      className={cn("h-auto max-h-56 w-48 object-contain sm:w-60", className)}
      onError={() => setFailedSource(image.src)}
    />
  );
}
