/**
 * The root level reducer for the app.
 * @module reducer
 **/

import { combineReducers } from 'redux';
import {
	CLICK_TRACK_ACTION,
	CLICK_TRACK_CLEAR_ACTION
} from '../actions/clickActionCreators';

export const DEFAULT_APP_STATE = { isFetching: false };

/**
 * The primary reducer for data provided by the API
 * `state.app` sub-tree
 *
 * @param {Object} state
 * @param {ReduxAction} action
 * @return {Object}
 */
export function app(state=DEFAULT_APP_STATE, action={}) {
	let newState;

	switch (action.type) {
	case 'API_REQUEST':
		if ((action.meta || {}).logout) {
			return DEFAULT_APP_STATE;  // clear app state during logout
		}
		return { ...state, isFetching: true };
	case 'API_SUCCESS':
		state.isFetching = false;  // fall through - everything else is the same as CACHE_SUCCCESS
	case 'CACHE_SUCCESS':
		// {API|CACHE}_SUCCESS contains an array of responses, but we just need to build a single
		// object to update state with
		newState = action.payload.responses.reduce((newState, response) => {
			const { ref, ...data } = response;
			newState[ref] = data;
			return newState;
		}, {});
		delete state.error;
		return { ...state, ...newState };
	case 'API_ERROR':
		return {
			...state,
			error: action.payload,
			isFetching: false,
		};
	default:
		return state;
	}
}

export const DEFAULT_CLICK_TRACK = { history: [] };
/**
 * @param {Object} data extensible object to store click data {
 *   history: array
 * }
 * @param {Object} action the dispatched action
 * @return {Object} new state
 */
export function clickTracking(state=DEFAULT_CLICK_TRACK, action) {
	if (action.type === CLICK_TRACK_ACTION) {
		const history = [
			...state.history,
			action.payload,
		];
		return {
			...state,
			history,
		};
	}
	if (action.type === CLICK_TRACK_CLEAR_ACTION) {
		return DEFAULT_CLICK_TRACK;
	}
	return state;
}

export function config(state={}, action) {
	switch(action.type) {
	case 'CONFIGURE_API_URL':
		return { ...state, apiUrl: action.payload };
	case 'CONFIGURE_BASE_URL':
		return { ...state, baseUrl: action.payload };
	default:
		return state;
	}
}

/**
 * This reducer manages a list of boolean flags that indicate the 'ready to
 * render' state of the application. It is used exclusively by the server,
 * which triggers actions when initializing a response that should eventually
 * make all flags 'true'
 *
 * The server can then read these flags from state and render when ready
 */
export function preRenderChecklist([apiDataLoaded] = [false], action) {
	return [
		apiDataLoaded || Boolean(['API_COMPLETE', 'API_ERROR'].find(type => type === action.type)),
	];
}

const platformReducers = {
	app,
	clickTracking,
	config,
	preRenderChecklist,
};

/**
 * A function that builds a reducer combining platform-standard reducers and
 * app-specific reducers
 */
export default function makeRootReducer(appReducers={}) {
	Object.keys(appReducers).forEach(reducer => {
		if (reducer in platformReducers) {
			throw new Error(`'${reducer}' is a reserved platform reducer name`);
		}
	});
	return combineReducers({
		...platformReducers,
		...appReducers,
	});
}

