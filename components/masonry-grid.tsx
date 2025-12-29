"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Image as ImageIcon } from "lucide-react";

interface ImageData {
  id: string;
  filename: string;
  mime_type: string;
  size: number;
  storage_path: string;
  user_id: string;
  created_at: string;
}

interface MasonryImageProps {
  image: ImageData;
  onClick: () => void;
}

function MasonryImage({ image, onClick }: MasonryImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);

  const imageUrl = `/api/images/${image.id}`;

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => {
      setAspectRatio(img.width / img.height);
      setLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  return (
    <Card
      className="overflow-hidden cursor-pointer group relative mb-4 p-0"
      onClick={onClick}
    >
      <div
        className="relative w-full"
        style={{ paddingBottom: loaded ? `${100 / aspectRatio}%` : "100%" }}
      >
        {!loaded && <Skeleton className="absolute inset-0 rounded-none" />}
        <img
          ref={imgRef}
          src={imageUrl}
          alt={image.filename}
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          } group-hover:scale-105`}
          onLoad={() => setLoaded(true)}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <ImageIcon className="h-8 w-8 text-white" />
        </div>
      </div>
    </Card>
  );
}

interface MasonryGridProps {
  images: ImageData[];
  onImageClick: (image: ImageData) => void;
}

export function MasonryGrid({ images, onImageClick }: MasonryGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(3);

  // Responsive column count - fewer columns for larger images
  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width < 640) setColumnCount(2);
      else if (width < 1024) setColumnCount(3);
      else if (width < 1536) setColumnCount(4);
      else setColumnCount(5);
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  // Distribute images across columns (fill first column first)
  const columns = useMemo(() => {
    const cols: ImageData[][] = Array.from({ length: columnCount }, () => []);

    images.forEach((image, index) => {
      // Distribute round-robin style to fill columns evenly
      cols[index % columnCount].push(image);
    });

    return cols;
  }, [images, columnCount]);

  return (
    <div
      ref={containerRef}
      className="masonry-grid w-full"
      style={{
        columnCount,
        columnGap: "12px",
      }}
    >
      {images.map((image) => (
        <MasonryImage
          key={image.id}
          image={image}
          onClick={() => onImageClick(image)}
        />
      ))}
    </div>
  );
}
