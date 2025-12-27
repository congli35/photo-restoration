import { runs } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { protectedProcedure } from "../../../orpc/procedures";

export const getRestorationProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/ai/restoration/{handle}",
		tags: ["AI"],
		summary: "Get restoration status",
		description: "Get the status and result of a restoration task",
	})
	.input(
		z.object({
			handle: z.string(),
		}),
	)
	.handler(async ({ input }) => {
		const run = await runs.retrieve(input.handle);

		return {
			status: run.status,
			output: run.output,
			error: run.error,
		};
	});
