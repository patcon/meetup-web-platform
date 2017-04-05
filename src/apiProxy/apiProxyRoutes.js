import Joi from 'joi';
import { getApiProxyRouteHandler } from './apiProxyHandler';

const validApiPayloadSchema = Joi.object({
	queries: Joi.string().required(), // should be rison.encode_array-encoded
	logout: Joi.any(),
});

const getApiProxyRoutes = (path, apiProxyFn$) => {
	/**
	 * This handler converts the application-supplied queries into external API
	 * calls, and converts the API call responses into a standard format that
	 * the application expects.
	 *
	 * @returns Array query responses, which are in the format defined
	 *   by `apiAdapter.apiResponseToQueryResponse`
	 */
	const routeBase = {
		path,
		handler: getApiProxyRouteHandler(apiProxyFn$),
		config: {
			plugins: {
				'electrode-csrf-jwt': {
					enabled: true,
				}
			},
			state: {
				failAction: 'ignore',  // ignore cookie validation, just accept
			},
		},
	};
	const apiGetRoute = {
		...routeBase,
		method: ['GET', 'DELETE'],
		config: {
			...routeBase.config,
			validate: {
				query: validApiPayloadSchema
			},
		},
	};
	const apiPostRoute = {
		...routeBase,
		method: ['POST', 'PATCH'],
		config: {
			...routeBase.config,
			payload: {
				allow: [
					'application/x-www-form-urlencoded',
					'multipart/form-data',
				],
				multipart: {
					output: 'stream',  // parse file uploads into streams
				},
				maxBytes: 1024 * 1024 * 10  // 10 MB max upload
			},
		},
	};

	return [apiGetRoute, apiPostRoute];
};

export default getApiProxyRoutes;

