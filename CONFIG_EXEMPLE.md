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
