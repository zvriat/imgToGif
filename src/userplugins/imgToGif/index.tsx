/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin from "@utils/types";
import { CloudUpload } from "@vencord/discord-types";
import { findByCodeLazy } from "@webpack";
import { ChannelStore, DraftType, SelectedChannelStore, Toasts, UploadAttachmentStore, UploadHandler, UploadManager, useState } from "@webpack/common";
import { applyPalette, GIFEncoder, quantize } from "gifenc";

const ActionBarIcon = findByCodeLazy("Children.map", "isValidElement", "dangerous:");
const MAX_DIMENSION = 1024;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp)$/i;

function isSupportedImage(file: File) {
    return IMAGE_TYPES.has(file.type) || IMAGE_EXTENSIONS.test(file.name);
}

async function convertToGif(file: File): Promise<File> {
    const bitmap = await createImageBitmap(file);

    try {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Could not create an image canvas.");

        context.drawImage(bitmap, 0, 0, width, height);

        const { data } = context.getImageData(0, 0, width, height);

        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3] / 255;
            if (alpha < 0.5) continue;

            data[i] = Math.round(data[i] * alpha + 255 * (1 - alpha));
            data[i + 1] = Math.round(data[i + 1] * alpha + 255 * (1 - alpha));
            data[i + 2] = Math.round(data[i + 2] * alpha + 255 * (1 - alpha));
            data[i + 3] = 255;
        }

        const palette = quantize(data, 255);
        const indexedPixels = applyPalette(data, palette);
        for (let pixel = 0; pixel < indexedPixels.length; pixel++) {
            if (data[pixel * 4 + 3] < 128) indexedPixels[pixel] = 255;
        }

        const gif = GIFEncoder();
        gif.writeFrame(indexedPixels, width, height, {
            delay: 100,
            palette,
            transparent: true,
            transparentIndex: 255
        });
        gif.finish();

        const name = file.name.replace(/\.[^.]+$/, "") || "image";
        return new File([new Uint8Array(gif.bytesView())], `${name}.gif`, { type: "image/gif" });
    } finally {
        bitmap.close();
    }
}

function GifIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M4 3h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm1 4v10h2.5c2.3 0 3.5-1.2 3.5-3.2 0-1.9-1.2-3-3.3-3H7V9h4V7H5Zm2 5.7h.7c.9 0 1.3.4 1.3 1.1 0 .8-.4 1.2-1.4 1.2H7v-2.3ZM14 7v10h2v-4h3v-2h-3V9h4V7h-6Z" />
        </svg>
    );
}

function ConvertButton({ upload }: { upload: CloudUpload; }) {
    const [busy, setBusy] = useState(false);

    if (!upload.isImage || !isSupportedImage(upload.item.file)) return null;

    async function convertAttachments() {
        if (busy) return;
        setBusy(true);

        try {
            const channelId = SelectedChannelStore.getChannelId();
            if (!channelId) throw new Error("Could not determine the current channel.");

            const uploads = UploadAttachmentStore.getUploads(channelId, DraftType.ChannelMessage);
            const sourceFiles = uploads.map(upload => upload.item.file);
            const sourceFile = upload.item.file;
            if (!sourceFiles.includes(sourceFile)) throw new Error("This image is no longer queued for upload.");

            const convertedFile = await convertToGif(sourceFile);
            const convertedFiles = sourceFiles.map(file => file === sourceFile ? convertedFile : file);
            const currentFiles = UploadAttachmentStore.getUploads(channelId, DraftType.ChannelMessage).map(upload => upload.item.file);

            if (currentFiles.length !== sourceFiles.length || currentFiles.some((file, i) => file !== sourceFiles[i])) {
                throw new Error("The queued attachments changed during conversion. Nothing was replaced; try again.");
            }

            const channel = ChannelStore.getChannel(channelId);
            if (!channel) throw new Error("Could not find the current channel.");

            UploadManager.clearAll(channelId, DraftType.ChannelMessage);
            UploadHandler.promptToUpload(convertedFiles, channel, DraftType.ChannelMessage);
            Toasts.show({ message: "Converted image attachments to GIF.", type: Toasts.Type.SUCCESS });
        } catch (error) {
            console.error("[pngToGif] Failed to convert attachments:", error);
            Toasts.show({
                message: error instanceof Error ? error.message : "Could not convert the image attachments.",
                type: Toasts.Type.FAILURE
            });
        } finally {
            setBusy(false);
        }
    }

    return (
        <ActionBarIcon
            tooltip={busy ? "Converting to GIF..." : "Convert to GIF"}
            onClick={convertAttachments}
        >
            <GifIcon />
        </ActionBarIcon>
    );
}

export default definePlugin({
    name: "imgToGif",
    description: "Convert attached PNG, JPG, and WebP images to GIF before sending.",
    authors: [],
    patches: [
        {
            find: "#{intl::ATTACHMENT_UTILITIES_SPOILER}",
            replacement: {
                match: /(?<=children:\[)(?=.{10,80}tooltip:.{0,100}#{intl::ATTACHMENT_UTILITIES_SPOILER})/,
                replace: "arguments[0].canEdit!==false?$self.ConvertUploadButton(arguments[0]):null,"
            }
        }
    ],
    ConvertUploadButton: ErrorBoundary.wrap(({ upload }: { upload: CloudUpload; }) => <ConvertButton upload={upload} />, { noop: true })
});
