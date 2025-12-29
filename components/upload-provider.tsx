"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";

interface UploadContextType {
  uploading: boolean;
  triggerUpload: () => void;
  handleFiles: (files: FileList | null) => void;
  user: { id: string } | null;
  dragOver: boolean;
  setDragOver: (value: boolean) => void;
  refreshImages: () => void;
}

const UploadContext = createContext<UploadContextType | null>(null);

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUpload must be used within UploadProvider");
  }
  return context;
}

interface UploadProviderProps {
  children: ReactNode;
  onImagesChange?: (images: any[]) => void;
}

export function UploadProvider({
  children,
  onImagesChange,
}: UploadProviderProps) {
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUser = useCallback(() => {
    fetch("/api/user")
      .then((res) => res.json())
      .then((data) => setUser(data));
  }, []);

  useEffect(() => {
    fetchUser();

    // 監聽頁面焦點變化，當頁面重新獲得焦點時重新獲取用戶狀態
    const handleFocus = () => {
      fetchUser();
    };

    // 監聽可見性變化，當頁面變為可見時重新獲取用戶狀態
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchUser();
      }
    };

    // 監聽自定義登出事件
    const handleSignOut = () => {
      setUser(null);
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("signOut", handleSignOut);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("signOut", handleSignOut);
    };
  }, [fetchUser]);

  const refreshImages = useCallback(() => {
    fetch("/api/images")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && onImagesChange) {
          onImagesChange(data);
        }
      });
  }, [onImagesChange]);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || !user) return;

      setUploading(true);

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/images", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          // Dispatch event to notify listeners
          window.dispatchEvent(new CustomEvent("imageUploaded"));
        }
      }

      setUploading(false);
    },
    [user]
  );

  const triggerUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <UploadContext.Provider
      value={{
        uploading,
        triggerUpload,
        handleFiles,
        user,
        dragOver,
        setDragOver,
        refreshImages,
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {children}
    </UploadContext.Provider>
  );
}

export function UploadButton() {
  const { uploading, triggerUpload, user } = useUpload();

  if (!user) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={uploading}
      onClick={triggerUpload}
      className="rounded-full"
    >
      {uploading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Upload className="h-4 w-4" />
      )}
    </Button>
  );
}

interface GlobalDropZoneProps {
  children: ReactNode;
}

export function GlobalDropZone({ children }: GlobalDropZoneProps) {
  const { handleFiles, dragOver, setDragOver, user } = useUpload();

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (user) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles, setDragOver, user]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (user) {
        setDragOver(true);
      }
    },
    [setDragOver, user]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
    },
    [setDragOver]
  );

  return (
    <div
      className="relative w-full h-full"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {children}
      {dragOver && user && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-background/90 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3">
            <Upload className="h-6 w-6 text-primary" />
            <span className="text-lg font-medium">放開以上傳圖片</span>
          </div>
        </div>
      )}
    </div>
  );
}
