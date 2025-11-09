import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
	{ files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
	{ languageOptions: { globals: globals.browser } },
	pluginJs.configs.recommended,
	...tseslint.configs.recommended,
	pluginReact.configs.flat.recommended,
	{
		// Add this rule con1figuration to disable requiring React in scope
		rules: {
			"react/react-in-jsx-scope": "off",
			"react/jsx-uses-react": "off",
			// Add these rules to catch console.log and no-unused-vars
			"no-console": ["error", { allow: ["warn", "error"] }],
			"@typescript-eslint/no-unused-vars": "error",
		},
		settings: {
			react: {
				version: "detect",
			},
		},
	},
];
