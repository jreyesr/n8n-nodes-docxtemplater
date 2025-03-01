import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeApiError,
	NodeConnectionType,
	NodeOperationError,
} from 'n8n-workflow';
import type { Tool } from '@langchain/core/tools';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

export class DocxTemplater implements INodeType {
	description: INodeTypeDescription = {
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				// displayOptions: {
				// 	show: {
				// 		resource: ['contact'],
				// 	},
				// },
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
				displayName: 'Input file name',
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
						displayName: 'Paragraph Loop',
						name: 'paragraphLoop',
						type: 'boolean',
						default: true,
						description:
							"If enabled, looped paragraphs won't have additional spaces due to the loop tags. See <a href='https://docxtemplater.com/docs/configuration/#how-to-use-it'>https://docxtemplater.com/docs/configuration/#how-to-use-it</a>.",
					},
					{
						displayName: 'Render Newlines',
						name: 'linebreaks',
						type: 'boolean',
						default: true,
						description:
							"If enabled, newline characters (\\n) in tags will show up in the output, otherwise they will be ignored. See <a href='https://docxtemplater.com/docs/configuration/#linebreaks'>https://docxtemplater.com/docs/configuration/#linebreaks</a>.",
					},
					{
						displayName: 'Enable Angular parser',
						name: 'enableAngularParser',
						type: 'boolean',
						default: true,
						description:
							"If enabled, Angular expressions (e.g. addition, nested property access and filters) will be available in the template. See <a href='https://docxtemplater.com/docs/angular-parse/'>https://docxtemplater.com/docs/angular-parse/</a>.",
					},
					{
						displayName: 'Put Output File in Field',
						name: 'binaryPropertyOutput',
						type: 'string',
						default: 'data',
						hint: 'The name of the output binary field to put the rendered document in',
					},
					{
						displayName: 'File Name',
						name: 'outputFileName',
						type: 'string',
						default: 'rendered.docx',
						description: 'Name of the output file',
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
		// icon: 'file:friendGrid.svg',
		version: 1,
		description: 'Generate an Office document from a template',
		defaults: {
			name: 'DocxTemplater',
		},
		inputs: [
			{ displayName: '', type: NodeConnectionType.Main },
			{
				displayName: 'Formatters',
				type: NodeConnectionType.AiTool,
				required: false,
			},
		],
		outputs: [NodeConnectionType.Main],
	};

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

					const expressionParser = require('docxtemplater/expressions.js'); // NOTE: Dynamic import to ensure a new version each time?

					// make tools available as filters
					const connectedTools =
						((await this.getInputConnectionData(NodeConnectionType.AiTool, i)) as Tool[]) || [];
					for (const t of connectedTools) {
						expressionParser.filters[t.name] = function (input: any) {
							if (!input) {
								// short-circuit undefineds
								return input;
							}
							return t.invoke({ args: {query: input, arguments} })
						};
					}

					const inputDataBuffer = await this.helpers.getBinaryDataBuffer(i, inputFileProperty);
					const zip = new PizZip(inputDataBuffer);
					const doc = new Docxtemplater(zip, {
						paragraphLoop: this.getNodeParameter('options.paragraphLoop', i, true, {
							extractValue: true,
							ensureType: 'boolean',
						}) as boolean,
						linebreaks: true,
						parser: expressionParser,
					});
					this.logger.debug('render', {
						inputFileName: inputFileProperty,
						inputDataBuffer: inputDataBuffer.length,
						context,
					});
					doc.render(context);
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
					message: 'Error while rendering',
				});
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: nodeOperationError.message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}
		return [returnData];
	}
}
