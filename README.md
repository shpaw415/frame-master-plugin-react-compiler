# frame-master-plugin-react-compiler

Frame Master plugin that runs the official React Compiler Babel plugin inside Bun.build.

It registers a Bun `onLoad` hook for JavaScript and TypeScript modules, transforms matching files with `babel-plugin-react-compiler`, and then hands the original loader back to Bun so Bun can keep handling JSX and TypeScript normally.

## Installation

```bash
bun add frame-master-plugin-react-compiler
```

## Usage

```ts
import type { FrameMasterConfig } from "frame-master/server/types";
import framemasterpluginreactcompiler from "frame-master-plugin-react-compiler";

const config: FrameMasterConfig = {
  HTTPServer: { port: 3000 },
  plugins: [framemasterpluginreactcompiler()],
};

export default config;
```

## Options

```ts
import framemasterpluginreactcompiler from "frame-master-plugin-react-compiler";

framemasterpluginreactcompiler({
  sourceMaps: true,
  includeNodeModules: false,
  exclude: ["**/*.stories.tsx", /legacy\\//],
  compilerOptions: {
    // Pass-through options for babel-plugin-react-compiler.
  },
});
```

Available options:

- `filter`: Overrides the Bun `onLoad` filter. Defaults to `/\.[cm]?[jt]sx?$/`.
- `compilerOptions`: Passed directly to `babel-plugin-react-compiler`.
- `exclude`: Skips matching files before compilation. Accepts Bun glob strings and regular expressions.
- `includeNodeModules`: Compiles files inside `node_modules` when set to `true`. Defaults to `false`.
- `sourceMaps`: Emits inline source maps from Babel when set to `true`. Defaults to `false`.

## Notes

- The React Compiler Babel plugin runs before any other Babel transforms inside this plugin.
- The plugin preserves Bun's original loader so `.ts`, `.tsx`, `.js`, and `.jsx` files continue through Bun's native pipeline.
- For React Compiler configuration details, see the official guide: https://react.dev/learn/react-compiler/installation

## License

MIT
