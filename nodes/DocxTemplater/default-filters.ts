import { Filter } from './mozjexl-parser';
import { NodeOperationError } from 'n8n-workflow';
import type { INode } from 'n8n-workflow';

const filters: Record<string, Filter> = {
	JSONstringify: JSON.stringify,
	JSONparse: JSON.parse,
	length: (value) => value.length,
};

export default filters;

/**
 * Returns a Proxy object that wraps the provided ``filters``, raising a NodeOperationError if any that don't exist
 * are referenced, unlike plain Objects that would return ``undefined`` and fail afterwards.
 *
 * @param node A reference to the N8N node, necessary to raise the appropriate errors
 * @param filters A map of filter names to filters. The returned object will contain the same objects, plus logic to handle missing key access
 */
export function makeFilterContainer(
	node: INode,
	filters: Record<string, Filter>,
): Record<string, Filter> {
	return new Proxy(filters, {
		get(target: Record<string, Filter>, prop: string | symbol, receiver: any): any {
			if (!Reflect.has(target, prop)) {
				const availableFilterNames = Reflect.ownKeys(target).map(String).join(', ');
				throw new NodeOperationError(node, 'Tried to access invalid filter', {
					message: `Tried to access invalid filter ${String(prop)}`,
					description: `Filter \`${String(prop)}\` isn't registered. Use one of: ${availableFilterNames}`,
				});
			}
			return Reflect.get(target, prop, receiver);
		},
	});
}
