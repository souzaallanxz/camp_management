"use client";

import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { uploadRouter } from "@/lib/uploadthing";
import { UploadThingProvider } from "@/components/providers/upload-thing-provider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Admin Dashboard</title>
      </head>
      <body>
        <NextSSRPlugin
          routerConfig={extractRouterConfig(uploadRouter)}
        />
        <UploadThingProvider>
          {children}
        </UploadThingProvider>
      </body>
    </html>
  );
} 