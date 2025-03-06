import fast_glob from 'fast-glob';
import * as path from 'node:path';
import { JavaScriptTinySandbox } from './sandbox/JavascriptSandbox';
import type { DXT } from 'docxtemplater';
import type { IExecuteFunctions } from 'n8n-workflow';

export async function findInstalledDocxtemplaterModules(): Promise<string[]> {
	const n8nPath = require.resolve('n8n'); // will be something like ".../node_modules/n8n/dist/index.js"
	const nodeModulesPath = path.dirname(path.dirname(path.dirname(n8nPath))); // will be something like ".../node_modules/"
	const globOptions = {
		cwd: nodeModulesPath,
		onlyDirectories: true,
		deep: 2, // to support scoped packages such as @someorg/docxtemplater-some-module
	};
	return await fast_glob('**/docxtemplater*module*', globOptions);
}

export async function loadModule(
	this: IExecuteFunctions,
	itemIndex: number,
	config: { name: string; opts: string },
): Promise<DXT.Module> {
	const context: Record<string, any> = { fetch: fetch, helpers: this.helpers, ...this.getWorkflowDataProxy(itemIndex) };


	const sandbox = new JavaScriptTinySandbox(context, config.opts);
	const moduleConfig = await sandbox.runCode<any>();
	const ModuleClass = require(config.name);
	return new ModuleClass(moduleConfig);
}
