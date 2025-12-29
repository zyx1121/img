"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Copy, Check, Trash2 } from "lucide-react";
import { useUpload } from "@/components/upload-provider";
import { MasonryGrid } from "@/components/masonry-grid";

interface ImageData {
    id: string;
    filename: string;
    mime_type: string;
    size: number;
    storage_path: string;
    user_id: string;
    created_at: string;
}

export function ImagePanel() {
    const [images, setImages] = useState<ImageData[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
    const { user } = useUpload();

    // Fetch images on mount and when refreshImages is called
    const fetchImages = useCallback(async () => {
        const res = await fetch("/api/images");
        const data = await res.json();
        setImages(Array.isArray(data) ? data : []);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchImages();
    }, [fetchImages]);

    // Subscribe to upload events
    useEffect(() => {
        const handleUploadComplete = () => fetchImages();
        window.addEventListener("imageUploaded", handleUploadComplete);
        return () => window.removeEventListener("imageUploaded", handleUploadComplete);
    }, [fetchImages]);

    const handleDelete = async (id: string) => {
        const res = await fetch(`/api/images/${id}`, { method: "DELETE" });
        if (res.ok) {
            setImages((prev) => prev.filter((img) => img.id !== id));
            setSelectedImage(null);
        }
    };

    const copyUrl = (id: string) => {
        const url = `${window.location.origin}/${id}`;
        navigator.clipboard.writeText(url);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const getImageUrl = (image: ImageData) => {
        return `/api/images/${image.id}`;
    };

    if (loading) {
        // Fixed heights to avoid hydration mismatch (no Math.random)
        const heights = [240, 320, 200, 280, 220, 300, 260, 340];
        return (
            <div className="w-full columns-1 sm:columns-2 md:columns-3 lg:columns-4 2xl:columns-5 gap-3">
                {heights.map((height, i) => (
                    <Skeleton
                        key={i}
                        className="mb-3 rounded-lg"
                        style={{ height: `${height}px` }}
                    />
                ))}
            </div>
        );
    }

    if (!user && images.length === 0) {
        return (
            <Empty className="w-full h-full">
                <EmptyHeader>
                    <EmptyTitle>尚無圖片</EmptyTitle>
                    <EmptyDescription>登入後即可上傳圖片</EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    }

    if (images.length === 0) {
        return (
            <Empty className="w-full h-full">
                <EmptyHeader>
                    <EmptyTitle>尚無圖片</EmptyTitle>
                    <EmptyDescription>拖放圖片至任意位置或點擊上傳按鈕</EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    }

    return (
        <TooltipProvider>
            <div className="w-full h-full overflow-auto">
                <MasonryGrid
                    images={images}
                    onImageClick={setSelectedImage}
                />

                {/* Image detail dialog */}
                <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
                    <DialogContent className="max-w-3xl">
                        {selectedImage && (
                            <>
                                <DialogHeader>
                                    <DialogTitle className="truncate">{selectedImage.filename}</DialogTitle>
                                    <DialogDescription>
                                        {(selectedImage.size / 1024).toFixed(1)} KB
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="flex flex-col gap-4">
                                    <img
                                        src={getImageUrl(selectedImage)}
                                        alt={selectedImage.filename}
                                        className="w-full max-h-[60vh] object-contain rounded-lg"
                                    />
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 bg-muted px-3 py-2 rounded text-sm truncate">
                                            {`${window.location.origin}/${selectedImage.id}`}
                                        </code>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => copyUrl(selectedImage.id)}
                                                >
                                                    {copied === selectedImage.id ? (
                                                        <Check className="h-4 w-4" />
                                                    ) : (
                                                        <Copy className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>複製連結</TooltipContent>
                                        </Tooltip>
                                        {user && selectedImage.user_id === user.id && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="destructive"
                                                        size="icon"
                                                        onClick={() => handleDelete(selectedImage.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>刪除圖片</TooltipContent>
                                            </Tooltip>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
}