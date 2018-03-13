import { applyMiddleware, createStore } from 'redux';
import { getApiMiddleware } from 'mwp-api-state';

import getFetchQueries from './fetchQueries';
import catchMiddleware from '../middleware/catch';
/**
 * the server needs a slightly different store than the browser because the
 * server doesn't need to make an internal request to the api proxy endpoint
 * when the store dispatches an API request action
 *
 * @param {Object} routes the React Router routes object
 * @param {Array} middleware additional middleware to inject into store
 * @param {Object} request the Hapi request for this store
 */
export function getServerCreateStore(resolveRoutes, middleware, request) {
	const middlewareToApply = [
		catchMiddleware(err =>
			request.server.app.logger.error({
				err,
				context: request,
				...request.raw,
			})
		),
		getApiMiddleware(resolveRoutes, getFetchQueries(request), {
			noCache: true,
		}),
		...middleware,
	];

	const middlewareEnhancer = applyMiddleware(...middlewareToApply);

	return middlewareEnhancer(createStore);
}
