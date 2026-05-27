import type {} from "frame-master/plugin";
import type { FrameMasterPlugin } from "frame-master/plugin/types";
import type { PluginOptions as ReactCompilerPluginOptions } from "babel-plugin-react-compiler";
import { transformAsync } from "@babel/core";
import { name, version } from "./package.json";

const DEFAULT_FILTER = /\.[cm]?[jt]sx?$/;
const NODE_MODULES_PATTERN = /[/\\]node_modules[/\\]/;
const REACT_COMPILER_PLUGIN = "babel-plugin-react-compiler";

export type ReactCompilerOptions = {
	filter?: RegExp;
	compilerOptions?: Partial<ReactCompilerPluginOptions>;
	includeNodeModules?: boolean;
	sourceMaps?: boolean;
};

async function getSourceText(args: Bun.OnLoadArgs): Promise<string> {
	if (typeof args.__chainedContents === "string") {
		return args.__chainedContents;
	}

	if (args.__chainedContents instanceof Uint8Array) {
		return new TextDecoder().decode(args.__chainedContents);
	}

	return Bun.file(args.path).text();
}

function getLoader(path: string, fallbackLoader: Bun.Loader): Bun.Loader {
	if (
		fallbackLoader === "js" ||
		fallbackLoader === "jsx" ||
		fallbackLoader === "ts" ||
		fallbackLoader === "tsx"
	) {
		return fallbackLoader;
	}

	if (path.endsWith(".tsx")) {
		return "tsx";
	}

	if (path.endsWith(".ts") || path.endsWith(".mts") || path.endsWith(".cts")) {
		return "ts";
	}

	if (path.endsWith(".jsx")) {
		return "jsx";
	}

	return "js";
}

function getParserPlugins(loader: Bun.Loader): Array<"jsx" | "typescript"> {
	const plugins: Array<"jsx" | "typescript"> = [];

	if (loader === "jsx" || loader === "tsx") {
		plugins.push("jsx");
	}

	if (loader === "ts" || loader === "tsx") {
		plugins.push("typescript");
	}

	return plugins;
}

/**
 * frame-master-plugin-react-compiler - Frame-Master Plugin
 *
 * Runs React Compiler through Bun.build by transforming JavaScript and TypeScript
 * modules with the official Babel plugin before Bun finishes bundling them.
 */
export default function framemasterpluginreactcompiler(
	options: ReactCompilerOptions = {},
): FrameMasterPlugin {
	const {
		filter = DEFAULT_FILTER,
		compilerOptions = {},
		includeNodeModules = false,
		sourceMaps = false,
	} = options;

	return {
		name,
		version,
		requirement: {
			frameMasterVersion: ">=3.0.0",
			bunVersion: ">=1.3.0",
		},
		build: {
			buildConfig: {
				plugins: [
					{
						name: "react-compiler",
						setup(build) {
							build.onLoad({ filter }, async (args) => {
								if (
									!includeNodeModules &&
									NODE_MODULES_PATTERN.test(args.path)
								) {
									return;
								}

								const loader = getLoader(args.path, args.loader);
								const source = await getSourceText(args);

								try {
									const result = await transformAsync(source, {
										filename: args.path,
										babelrc: false,
										configFile: false,
										sourceMaps: sourceMaps ? "inline" : false,
										sourceFileName: args.path,
										parserOpts: {
											sourceType: "module",
											plugins: getParserPlugins(loader),
										},
										plugins: [[REACT_COMPILER_PLUGIN, compilerOptions]],
									});

									return {
										contents: result?.code ?? source,
										loader,
									};
								} catch (error) {
									throw new Error(`React Compiler failed for ${args.path}`, {
										cause: error,
									});
								}
							});
						},
					},
				],
			},
		},
	};
}
