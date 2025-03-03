import { Filter } from './mozjexl-parser';

const filters: Record<string, Filter> = {
	JSONstringify: JSON.stringify,
	JSONparse: JSON.parse,
	length: (value) => value.length,
};

export default filters;
