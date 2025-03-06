// Loosely based on https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/nodes/Code/JavaScriptSandbox.ts

import EventEmitter from 'events';
import { makeResolverFromLegacyOptions, NodeVM, Resolver } from 'vm2';

const { NODE_FUNCTION_ALLOW_BUILTIN: builtIn, NODE_FUNCTION_ALLOW_EXTERNAL: external } =
	process.env;

export const vmResolver = makeResolverFromLegacyOptions({
	external: external
		? {
				modules: external.split(','),
				transitive: false,
			}
		: false,
	builtin: builtIn?.split(',') ?? [],
});

export class JavaScriptTinySandbox extends EventEmitter {
	private readonly vm: NodeVM;

	constructor(
		context: any,
		private jsCode: string,
		options?: { resolver?: Resolver },
	) {
		super();
		this.vm = new NodeVM({
			console: 'redirect',
			wrapper: 'none',
			sandbox: context,
			require: options?.resolver ?? vmResolver,
			wasm: false,
			strict: true
		});

		this.vm.on('console.log', (...args: unknown[]) => this.emit('output', ...args));
	}

	async runCode<T = unknown>(): Promise<T> {
		return this.vm.run(this.jsCode, __dirname) as T;
	}
}
