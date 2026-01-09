import { additionalPackages } from "@trigger.dev/build/extensions/core";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";
import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
	project: "proj_nwrjmmlvaqcsgsxcysot",
	runtime: "node-22",
	tsconfig: "./tsconfig.json",
	logLevel: "log",
	maxDuration: 300,
	dirs: ["./trigger"],
	build: {
		extensions: [
			additionalPackages({
				packages: ["zod-prisma-types"],
			}),
			prismaExtension({
				schema: "../database/prisma/schema.prisma",
				clientGenerator: "client",
				typedSql: true,
				directUrlEnvVarName: "DATABASE_URL_UNPOOLED",
			}),
		],
		external: [
			"@react-email/render",
			"@react-email/components",
			"react-dom",
			"react",
		],
	},
});
