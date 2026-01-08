import { orpcClient } from "@shared/lib/orpc-client";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { RestorationResolution } from "@repo/utils";

export const restoreImageMutationKey = ["restore-image"] as const;

export const useRestoreImageMutation = () => {
	return useMutation({
		mutationKey: restoreImageMutationKey,
		mutationFn: async ({
			image,
			mimeType,
		}: {
			image: string;
			mimeType: string;
		}) => {
			const result = await orpcClient.ai.chats.restore({
				image,
				mimeType,
			});

			return result.handle;
		},
	});
};

// New hooks for S3 upload flow
export const useCreateImageUploadUrl = () => {
	return useMutation({
		mutationKey: ["create-image-upload-url"],
		mutationFn: async ({ mimeType }: { mimeType: string }) => {
			return await orpcClient.ai.imageUploadUrl({ mimeType });
		},
	});
};

export const useTriggerRestoration = () => {
	return useMutation({
		mutationKey: ["trigger-restoration"],
		mutationFn: async ({
			imageId,
			resolution,
		}: {
			imageId: string;
			resolution: RestorationResolution;
		}) => {
			const result = await orpcClient.ai.triggerRestoration({
				imageId,
				resolution,
			});
			return result.handle;
		},
	});
};

export const useRestorationStatusQuery = (handle: string | null) => {
	return useQuery({
		queryKey: ["restoration-status", handle],
		queryFn: async () => {
			if (!handle) {
				throw new Error("No handle provided");
			}
			return await orpcClient.ai.chats.getRestoration({ handle });
		},
		enabled: !!handle,
		refetchInterval: (query) => {
			const data = query.state.data;
			// Poll every 2 seconds if pending/executing, stop if completed/failed
			if (
				data?.status === "COMPLETED" ||
				data?.status === "FAILED" ||
				data?.status === "CRASHED"
			) {
				return false;
			}
			return 2000;
		},
	});
};
