import type { FrameMasterConfig } from "frame-master/server/types";
import ReactCompilerPlugin from "../../";

export default {
	HTTPServer: {
		port: 3000,
	},
	pluginsOptions: {
		entrypoints: ["./index.tsx"],
	},
	plugins: [ReactCompilerPlugin()],
} satisfies FrameMasterConfig;
