import Rx from 'rxjs';
import {
	apiSuccess,
	apiError,
} from '../actions/syncActionCreators';
/**
 * PostEpic provides a generic interface for triggering POST requests and
 * dispatching particular actions with the API response. The POST action must
 * follow this structure:
 *
 * ```
 * {
 *   type: 'POST_<SOMETHING>' (or '<SOMETHING>_POST'),
 *   payload: {
 *     query: a 'reactive query' object that maps to an API call,
 *     onSuccess: a callback that takes the API response as an argument, and
 *       returns an action object. The middleware takes care of dispatch
 *     onError: a callback that takes an Error argument and returns an action
 *       object
 *   }
 * }
 * ```
 *
 * This structure usually allows the success/error handling code to be bundled
 * alongside the POST action creator, with the expectation that all response
 * processing can be done there
 *
 * @module PostEpic
 */

/**
 * get a function that receives a post action and returns the corresponding
 * fetch Promise
 *
 * The wrapping function needs current app state in order to apply correct
 * config
 *
 * @param {Object} { apiUrl } from state.config
 * @param {Object} postAction, providing query, onSuccess, and onError
 * @return {Promise} results of the fetch, either onSuccess or onError
 */
const getPostQueryFetch = (fetchQueries, store) =>
	query => {
		// force presence of 'post' method
		query.meta = { ...(query.meta || {}), method: 'post' };
		const { config: { apiUrl } } = store.getState();
		return fetchQueries(apiUrl, { method: 'POST' })([query]);
	};

/**
 * Make the POST call to the API and send the responses to the appropriate
 * places
 *
 * 1. Always send successful post responses to API_SUCCESS action
 * 2. If POST action has an 'onSuccess' action creators, send successful
 *    responses there as well
 * 3. Failed POST responses will be sent to the POST action's `onError`
 */
const doPost$ = fetchPostQuery => ({ query, onSuccess, onError }) =>
	Rx.Observable.fromPromise(fetchPostQuery(query))  // make the fetch call
		.flatMap(responses => {
			// success! return API_SUCCESS and whatever the POST action wants to do onSuccess
			const actions = [apiSuccess(responses)];
			if (onSuccess) {
				actions.push(onSuccess(responses));
			}
			return Rx.Observable.from(actions);
		})
		.catch(err => {
			const actions = [apiError(err)];
			if (onError) {
				actions.push(onError(err));
			}
			return Rx.Observable.from(actions);
		});

const getPostEpic = fetchQueries => (action$, store) =>
	action$.filter(({ type }) => type.endsWith('_POST') || type.startsWith('POST_'))
		.map(({ payload }) => payload)
		.flatMap(
			doPost$(
				getPostQueryFetch(fetchQueries, store)
			)
		);

export default getPostEpic;