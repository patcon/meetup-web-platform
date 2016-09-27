/**
 * Provides a cache outside of Redux state that can optimistically update state
 * before an asynchronous API call returns
 *
 * @module CacheMiddleware
 */
import Rx from 'rxjs';
import { bindActionCreators } from 'redux';
import {
	cacheSuccess,
	cacheRequest,
	cacheSet,
	cacheClear,
} from '../actions/cacheActionCreators';

import {
	makeCache,
	cacheReader,
	cacheWriter,
} from '../util/cacheUtils';


export function checkEnable() {
	if (typeof window !== 'undefined' && window.location) {
		const params = new URLSearchParams(window.location.search.slice(1));
		return !params.has('__nocache');
	}
	return true;
}

/**
 * The cache middleware triggers a 'set'/store action when new data is received
 * from the API (API_SUCCESS), and is queried when queries are sent to the API
 * (API_REQUEST). These events trigger cache-specific events, CACHE_SET and
 * CACHE_QUERY, which are then used to update the cache or update the
 * application state (CACHE_SUCCESS)
 *
 * @returns {Function} the curried state => action => next middleware function
 */
const CacheMiddleware = store => {

	if (!checkEnable()) {
		return next => action => next(action);
	}
	// get a cache, any cache (that conforms to the Promise-based API)
	const cache = makeCache();

	// get a function that can read from the cache for a specific query
	const readCache = cacheReader(cache);
	// get a function that can write to the cache for a specific query-response
	const writeCache = cacheWriter(cache);

	return next => action => {
		/**
		 * API_REQUEST means the application wants data described by the
		 * `queries` in the action payload - just forward those to the
		 * CACHE_REQUEST action and dispatch it
		 */
		if (action.type === 'API_REQUEST') {
			store.dispatch(cacheRequest(action.payload));
		}
		if (action.type === 'LOGOUT_REQUEST') {
			store.dispatch(cacheClear());
		}

		/**
		 * API_SUCCESS means there is fresh data ready to be stored - extract the
		 * queries and their responses, then dispatch `CACHE_SET` actions with each
		 * pair
		 */
		if (action.type === 'API_SUCCESS') {
			const dispatchCacheSet = bindActionCreators(cacheSet, store.dispatch);
			const { queries, responses } = action.payload;
			queries.forEach((query, i) => {
				const response = responses[i];
				dispatchCacheSet(query, response);
			});
		}

		/**
		 * Observables are heavily used in CACHE_REQUEST because each query results in
		 * an async 'get' (Promise) from the Cache - all 'gets' happen in parallel and
		 * the results are collated into a single response object containing the cache
		 * hits.
		 */
		if (action.type === 'CACHE_REQUEST') {
			const dispatchCacheSuccess = bindActionCreators(cacheSuccess, store.dispatch);

			const cachedResponse$ = Rx.Observable.from(action.payload) // fan-out
				.flatMap(readCache)                                      // look for a cache hit
				.filter(([ query, response ]) => response)               // ignore misses
				.reduce((acc, [ query, response ]) => {                  // fan-in to create response
					acc.queries.push(query);
					acc.responses.push(response);
					return acc;
				}, { queries: [], responses: [] })                       // empty response structure
				.filter(({ queries, responses }) => queries.length);     // only deliver if hits

			cachedResponse$.subscribe(
				dispatchCacheSuccess,
				err => console.log('Problem reading from cache', err)    // cache error is no-op
			);
		}

		/**
		 * CACHE_SET is a specific instruction to add a single query-response pair
		 * to the cache. Do it.
		 */
		if (action.type === 'CACHE_SET') {
			const { query, response } = action.payload;
			// this is async - technically values aren't immediately available
			writeCache(query, response);
		}

		if (action.type === 'CACHE_CLEAR') {
			cache.clear();
		}

		return next(action);
	};
};

export default CacheMiddleware;

