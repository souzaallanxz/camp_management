import { UploadButton, UploadDropzone, Uploader } from "@uploadthing/react";
import { type ReactNode } from "react";
import { type OurFileRouter } from "@/lib/uploadthing";

interface UploadThingProviderProps {
  children: ReactNode;
}

export function UploadThingProvider({ children }: UploadThingProviderProps) {
  return <>{children}</>;
}

// Re-export the components from uploadthing
export { UploadButton, UploadDropzone, Uploader };
export type { OurFileRouter }; 