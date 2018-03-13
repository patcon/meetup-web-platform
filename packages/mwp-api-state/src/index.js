// @flow
import { createEpicMiddleware, combineEpics } from './redux-promise-epic';

import getSyncEpic from './sync';
import getCacheEpic from './cache';
import { postEpic, deleteEpic } from './mutate'; // DEPRECATED

// export specific values of internal modules
export {
	API_REQ,
	API_RESP_SUCCESS,
	API_RESP_COMPLETE,
	API_RESP_ERROR,
	API_RESP_FAIL,
	get,
	post,
	patch,
	del,
} from './sync/apiActionCreators';
export { api, app, DEFAULT_API_STATE } from './reducer';

type ApiMiddlewareOpts = {
	noCache: boolean,
};
/**
 * The middleware is exported as a getter because it needs the application's
 * routes in order to set up the nav-related epic(s) that are part of the
 * final middleware
 */
export const getApiMiddleware = (
	resolveRoutes: RouteResolver,
	fetchQueriesFn: QueryFetcher,
	opts: ApiMiddlewareOpts = {}
) => {
	const epics = [
		getSyncEpic(resolveRoutes, fetchQueriesFn),
		postEpic, // DEPRECATED
		deleteEpic, // DEPRECATED
	];
	if (!opts.noCache) {
		epics.push(getCacheEpic());
	}

	createEpicMiddleware(combineEpics(...epics));
};
