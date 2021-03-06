import Joi from 'joi';
import rison from 'rison';
import { querySchema } from './util/validation';

export function parseRequestQueries(request) {
	const { method, mime, payload, query } = request;
	const queriesRison =
		(method === 'post' || method === 'patch' || method === 'put') &&
		mime !== 'multipart/form-data'
			? payload.queries
			: query.queries;

	if (!queriesRison) {
		return null;
	}

	const validatedQueries = Joi.validate(
		rison.decode_array(queriesRison),
		Joi.array().items(querySchema)
	);
	if (validatedQueries.error) {
		throw validatedQueries.error;
	}
	return validatedQueries.value;
}

/*
 * The default API proxy handler - just calls the decorated `proxyApi$` method
 * and serializes the API responses
 */
export default (request, h) => {
	const handleResponses = responses =>
		h.response({ responses }).type('application/json');

	return request.proxyApi$(parseRequestQueries(request)).toPromise().then(
		handleResponses,
		err => err // 500 error - will only be thrown on bad implementation
	);
};
