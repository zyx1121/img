import { Bar } from "@/components/bar";
import { ImagePanel } from "@/components/image-panel";
import { UploadProvider, GlobalDropZone } from "@/components/upload-provider";

export default function Home() {
  return (
    <UploadProvider>
      <GlobalDropZone>
        <div className="h-dvh w-dvw flex flex-col">
          <div className="flex flex-col h-full w-full gap-4 py-4">
            <div className="w-full h-8 px-4 shrink-0">
              <Bar />
            </div>
            <main className="w-full px-4 flex-1 min-h-0 overflow-hidden">
              <ImagePanel />
            </main>
          </div>
        </div>
      </GlobalDropZone>
    </UploadProvider>
  );
}
