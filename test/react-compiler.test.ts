import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import framemasterpluginreactcompiler from "../index";

const tempDirs: string[] = [];

function registerOnLoadHandler(
	options?: Parameters<typeof framemasterpluginreactcompiler>[0],
) {
	let registration:
		| {
				filter: RegExp;
				callback: (args: {
					path: string;
					namespace: string;
					loader: Bun.Loader;
					defer: () => Promise<void>;
				}) => unknown | Promise<unknown>;
		  }
		| undefined;

	const buildConfig =
		framemasterpluginreactcompiler(options).build?.buildConfig;

	if (!buildConfig || typeof buildConfig === "function") {
		throw new Error(
			"React Compiler buildConfig must resolve to a Bun config object.",
		);
	}

	const bunPlugin = buildConfig.plugins?.[0];

	if (!bunPlugin) {
		throw new Error("React Compiler Bun plugin was not registered.");
	}

	bunPlugin.setup({
		onLoad(constraints, callback) {
			registration = { filter: constraints.filter, callback };
			return this;
		},
	} as Bun.PluginBuilder);

	if (!registration) {
		throw new Error(
			"The React Compiler plugin did not register an onLoad handler.",
		);
	}

	return registration;
}

function createTempFile(relativePath: string, contents: string) {
	const tempDir = mkdtempSync(join(tmpdir(), "frame-master-react-compiler-"));
	tempDirs.push(tempDir);

	const filePath = join(tempDir, relativePath);
	mkdirSync(join(filePath, ".."), { recursive: true });
	Bun.write(filePath, contents);

	return filePath;
}

afterEach(() => {
	while (tempDirs.length > 0) {
		const tempDir = tempDirs.pop();

		if (tempDir) {
			rmSync(tempDir, { recursive: true, force: true });
		}
	}
});

describe("frame-master React Compiler plugin", () => {
	test("transforms TSX with React Compiler and preserves the Bun loader", async () => {
		const { callback } = registerOnLoadHandler({ sourceMaps: true });
		const filePath = createTempFile(
			"Greeting.tsx",
			[
				'import { useState } from "react";',
				"export function Greeting({ name }: { name: string }) {",
				"\tconst [count] = useState(0);",
				'\treturn <div className="greeting">{name} {count}</div>;',
				"}",
			].join("\n"),
		);

		const result = (await callback({
			path: filePath,
			namespace: "file",
			loader: "tsx",
			defer: async () => {},
		})) as
			| {
					contents?: string | ArrayBuffer | ArrayBufferView;
					loader?: Bun.Loader;
			  }
			| undefined;

		expect(result).toBeDefined();
		expect(result?.loader).toBe("tsx");
		expect(typeof result?.contents).toBe("string");
		expect(result?.contents).toContain('from "react/compiler-runtime"');
		expect(result?.contents).toContain("sourceMappingURL=data:");
	});

	test("skips node_modules by default", async () => {
		const { callback } = registerOnLoadHandler();
		const filePath = createTempFile(
			join("node_modules", "pkg", "Component.jsx"),
			"export function Component() { return <div />; }",
		);

		const result = await callback({
			path: filePath,
			namespace: "file",
			loader: "jsx",
			defer: async () => {},
		});

		expect(result).toBeUndefined();
	});

	test("skips files matched by exclude patterns", async () => {
		const { callback } = registerOnLoadHandler({
			exclude: ["**/*.skip.tsx", /ignored\.jsx$/],
		});
		const skippedTsxPath = createTempFile(
			join("src", "Component.skip.tsx"),
			"export function Component() { return <div />; }",
		);
		const ignoredJsxPath = createTempFile(
			join("src", "ignored.jsx"),
			"export function Ignored() { return <div />; }",
		);

		const skippedTsxResult = await callback({
			path: skippedTsxPath,
			namespace: "file",
			loader: "tsx",
			defer: async () => {},
		});
		const ignoredJsxResult = await callback({
			path: ignoredJsxPath,
			namespace: "file",
			loader: "jsx",
			defer: async () => {},
		});

		expect(skippedTsxResult).toBeUndefined();
		expect(ignoredJsxResult).toBeUndefined();
	});
});
