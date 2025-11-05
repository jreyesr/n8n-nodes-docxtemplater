import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	NodeOperationError,
} from 'n8n-workflow';
import type { StructuredTool } from '@langchain/core/tools';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import jexlParser, { Filter } from './jexl-parser';
import defaultFilters, { makeFilterContainer } from './default-filters';
import { findInstalledDocxtemplaterModules, loadModule } from './modules-loader';

async function getExtraModulesOptions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return (await findInstalledDocxtemplaterModules()).map((m) => ({
		name: m,
		value: m,
		description: m,
	}));
}

export class DocxTemplater implements INodeType {
	description: INodeTypeDescription = {
		codex: {
			resources: {
				primaryDocumentation: [{ url: 'https://github.com/jreyesr/n8n-nodes-docxtemplater' }],
			},
		},
		properties: [
			{
				// HACK: Forces the code editors for the Modules to behave as Code nodes in "Run Once for each item" mode
				// otherwise we don't get the suggestions for $index and such
				displayName: 'Mode',
				name: 'mode',
				type: 'hidden',
				default: 'runOnceForEachItem',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Render',
						value: 'render',
						description: 'Render a template into a document',
						action: 'Render a template',
					},
				],
				default: 'render',
				noDataExpression: true,
			},
			{
				displayName: 'Input File Name',
				name: 'binaryProperty',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['render'],
					},
				},
				default: 'data',
				noDataExpression: true,
			},
			{
				displayName: 'Data',
				name: 'context',
				type: 'json',
				displayOptions: {
					show: {
						operation: ['render'],
					},
				},
				default: '{}',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Extra Modules',
						name: 'extraModules',
						type: 'fixedCollection',
						placeholder: 'Add Module',
						default: {},
						typeOptions: {
							multipleValues: true,
						},
						options: [
							{
								displayName: 'Module',
								name: 'module',
								values: [
									{
										// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
										displayName: 'Name',
										name: 'name',
										default: '',
										type: 'options',
										// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
										description:
											'Choose any other modules Docxtemplater modules to load. They must be installed in the N8N environment.',
										typeOptions: {
											loadOptionsMethod: 'getExtraModulesOptions',
										},
									},
									{
										displayName: 'Options',
										name: 'opts',
										type: 'string',
										typeOptions: {
											editor: 'codeNodeEditor',
											editorIsReadOnly: false,
											editorLanguage: 'javaScript',
											alwaysOpenEditWindow: false,
										},
										default:
											'let opts = {};	\n\n// Add any necessary properties on opts\n\nreturn opts;',
										description:
											"JavaScript code to setup the module. See the module's docs for more information on the required options.",
										noDataExpression: true,
									},
								],
							},
						],
					},
					{
						displayName: 'File Name',
						name: 'outputFileName',
						type: 'string',
						default: 'rendered.docx',
						description: 'Name of the output file',
					},
					{
						displayName: 'Paragraph Loop',
						name: 'paragraphLoop',
						type: 'boolean',
						default: true,
						description:
							"Whether to remove additional spaces due to the loop tags. See <a href='https://docxtemplater.com/docs/configuration/#how-to-use-it'>https://docxtemplater.com/docs/configuration/#how-to-use-it</a>.",
					},
					{
						displayName: 'Put Output File in Field',
						name: 'binaryPropertyOutput',
						type: 'string',
						default: 'data',
						hint: 'The name of the output binary field to put the rendered document in',
					},
					{
						displayName: 'Render Newlines',
						name: 'linebreaks',
						type: 'boolean',
						default: true,
						description:
							"Whether to allow newline characters (\\n) in tags will show up in the output, otherwise they will be ignored. See <a href='https://docxtemplater.com/docs/configuration/#linebreaks'>https://docxtemplater.com/docs/configuration/#linebreaks</a>.",
					},
				],
				displayOptions: {
					show: {
						operation: ['render'],
					},
				},
			},
		],
		displayName: 'DocxTemplater',
		name: 'docxTemplater',
		group: ['transform'],
		icon: 'file:docxtemplater.svg',
		version: 1,
		description: 'Generate an Office document from a template',
		defaults: {
			name: 'DocxTemplater',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [
			{ displayName: '', type: NodeConnectionType.Main },
			{
				displayName: 'Data Resolvers',
				type: NodeConnectionType.AiTool,
				required: false,
			},
			{
				displayName: 'Transforms',
				type: NodeConnectionType.AiTool,
				required: false,
			},
		],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.Main],
		parameterPane: 'wide',
	};

	methods = { loadOptions: { getExtraModulesOptions } };

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		let responseData;
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < items.length; i++) {
			try {
				if (operation === 'render') {
					const inputFileProperty = this.getNodeParameter('binaryProperty', i);
					const outputFileProperty = this.getNodeParameter(
						'options.binaryPropertyOutput',
						i,
						'data',
						{
							ensureType: 'string',
						},
					) as string;
					const outputFileName = this.getNodeParameter(
						'options.outputFileName',
						i,
						'rendered.docx',
						{
							ensureType: 'string',
						},
					) as string;
					const context = this.getNodeParameter('context', i, {}, { ensureType: 'json' });

					// TOOLS SETUP
					const connectedTools =
						((await this.getInputConnectionData(
							NodeConnectionType.AiTool,
							i,
						)) as StructuredTool[]) || [];
					const wrapper: (t: StructuredTool) => Filter =
						(t: StructuredTool) =>
						(arg1: any, ...args: any[]): any => {
							// will look like {arg0: <val>, arg1: <val>, ...}
							const argsAsObject = Object.fromEntries(args.map((a, i) => [`arg${i}`, a]));
							let toolArgs = args.length > 0 ? { input: arg1, args: args, ...argsAsObject } : arg1;
							if (args.length === 0 && t.schema._def.typeName === 'ZodObject') {
								// Manually wrap in object if no args passed but tool expects an Object
								const expectedKey = Object.keys(t.schema._def.shape())[0];
								toolArgs = { [expectedKey]: toolArgs };
							}

							this.logger.debug('docxtemplater.customfilter', {
								name: t.name,
								input: arg1,
								args: args,
								toolArgs,
							});

							const retVal = t.invoke(toolArgs);

							return retVal
								.then((val) => {
									// hook onto the .invoke() promise being resolved so we can print it
									this.logger.debug('=> docxtemplater.customfilter.retval', {
										name: t.name,
										toolArgs,
										val,
									});
									return val; // NOTE: Remember to forward the original .invoke() return val back from this promise!
								})
								.then((val) => {
									// Code tool (and maybe others?) is limited to returning only strings or numbers, so we try to unwrap
									// possible JSON-serialized values here
									try {
										// attempt to parse output as JSON, if possible then liberate from the shackles of String
										val = JSON.parse(val);
									} catch {} // if error, do nothing, it isn't parsable JSON so it should already be a primitive
									return val;
								});
						};

					// handmade regexy rules to convert Tool node names (e.g. "Date & Time") into safe transform names (e.g. "date_time")
					const transformSafeName = (toolName: string) =>
						toolName // "Date_&_Time", the space-into-underscore replacement is done by create-node-as-tool in N8N, https://github.com/n8n-io/n8n/blob/24681f843c906c6b83c8c686b5c11fa18d792fd7/packages/core/src/execution-engine/node-execution-context/utils/create-node-as-tool.ts#L122
							.toLowerCase() // => "date_&_time"
							.replace(/-/, '_') // => "date_&_time"
							.replace(/[^a-z0-9_]/, '') // => "date__time": only keep a subset of very safe characters for transform names
							.replace(/_{2,}/, '_'); // => "date_time": replace runs of _s by a single one
					const mapOfTools = Object.fromEntries(
						connectedTools.map((t) => [transformSafeName(t.name), wrapper(t)]),
					);
					this.logger.debug('docxtemplater.tools', { tools: Object.keys(mapOfTools) });
					const filters = makeFilterContainer(this.getNode(), { ...defaultFilters, ...mapOfTools });
					// END TOOLS SETUP

					// MODULES SETUP
					const extraModules = this.getNodeParameter('options.extraModules.module', i, []) as {
						name: string;
						opts: string;
					}[];
					const modules = await Promise.all(extraModules.map(loadModule.bind(this, i)));
					this.logger.debug('docxtemplater.modules', { modules });
					// END MODULES SETUP

					// DATA RESOLVERS SETUP
					const dataResolverWrapper: (t: StructuredTool) => (...args: any[]) => Promise<any> = (
						t: StructuredTool,
					) => {
						return async function (...args): Promise<any> {
							// will look like {arg0: <val>, arg1: <val>, ...}
							const argsAsObject = Object.fromEntries(args.map((a, i) => [`arg${i}`, a]));
							return t.invoke({ input: '', args: args, ...argsAsObject });
						};
					};
					const connectedResolvers = Object.fromEntries(
						connectedTools.map((t) => [t.name, dataResolverWrapper(t)]),
					);
					this.logger.debug('docxtemplater.dataResolvers', { connectedResolvers });
					// END DATA RESOLVERS SETUP

					const jexlparser = jexlParser({ filters, resolvers: connectedResolvers });

					const inputDataBuffer = await this.helpers.getBinaryDataBuffer(i, inputFileProperty);
					const zip = new PizZip(inputDataBuffer);
					const doc = new Docxtemplater(zip, {
						modules,
						paragraphLoop: this.getNodeParameter('options.paragraphLoop', i, true, {
							extractValue: true,
							ensureType: 'boolean',
						}) as boolean,
						linebreaks: true,
						parser: jexlparser,
					});
					this.logger.debug('render', {
						inputFileName: inputFileProperty,
						inputDataBuffer: inputDataBuffer.length,
						context,
					});
					await doc.renderAsync(context);
					const outputDataBuffer = doc
						.getZip()
						.generate({ type: 'nodebuffer', compression: 'DEFLATE' });

					const binaryData = await this.helpers.prepareBinaryData(outputDataBuffer, outputFileName);
					responseData = {
						binary: {
							[outputFileProperty]: binaryData,
						},
						json: {},
						pairedItem: { item: i },
					};
					returnData.push(responseData);
				}
			} catch (error) {
				const nodeOperationError = new NodeOperationError(this.getNode(), error, {
					itemIndex: i,
					message: error.properties.message ?? 'Error while rendering',
					description:
						error.properties.explanation ?? 'See the N8N logs for more details on the error',
				});

				// Docxtemplater's special errors, if there's only one error we can expose it at the top level
				if (
					error.name === 'TemplateError' &&
					error.message === 'Multi error' &&
					error.properties.errors.length === 1
				) {
					nodeOperationError.message = error.properties.errors[0].message;
					nodeOperationError.description = error.properties.errors[0].properties.explanation;
					nodeOperationError.context = error.properties.errors[0];
					nodeOperationError.stack = error.properties.errors[0].stack;
				}

				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: nodeOperationError.message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw nodeOperationError;
			}
		}
		return [returnData];
	}
}
