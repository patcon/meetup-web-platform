/**
 * Utilities for interacting with the Router and getting location data
 * @module routeUtils
 */
import matchPath from 'react-router-dom/matchPath';

export const decodeParams = params =>
	Object.keys(params).reduce((decodedParams, key) => {
		decodedParams[key] = params[key] && decodeURI(params[key]);
		return decodedParams;
	}, {});

// THIS MIGHT NEED TO BE A PROMISE to resolve nested routes
export const getNestedRoutes = ({ route, match }) =>
	Promise.resolve(
		match.isExact && route.indexRoute
			? [route.indexRoute] // only render index route
			: route.routes
	); // pass along any defined nested routes

const routePath = (route, matchedPath) =>
	`${matchedPath}${route.path || ''}`.replace('//', '/');

/**
 * find all routes from a given array of route config objects that match the
 * supplied `url`
 *
 * this function matches the signature of `react-router-config`'s `matchRoutes`
 * function, but interprets all `route.path` settings as nested
 *
 * @see {@link https://github.com/ReactTraining/react-router/tree/master/packages/react-router-config#matchroutesroutes-pathname}
 *
 * @param {Array} routes the routes to match
 * @param {String} url a URL path (no host) starting with `/`
 * @param {Array} matchedRoutes an array of [ route, match ] tuples
 * @param {String} matchedPath the part of the total path matched so far
 * @return {Promise<Array>} an array of { route, match } objects
 */
export const matchRoutes = (
	routes = [],
	url = '',
	matchedRoutes = [],
	matchedPath = ''
) => {
	const route = routes.find(r => matchPath(url, routePath(r, matchedPath))); // take the first match
	if (!route) {
		return matchedRoutes;
	}

	// add the route and its `match` object to the array of matched routes
	const currentMatchedPath = routePath(route, matchedPath);
	const match = matchPath(url, currentMatchedPath);
	const currentMatchedRoutes = [...matchedRoutes, { route, match }];

	// add any nested route matches
	return getNestedRoutes({ route, match }).then(
		nestedRoutes =>
			(nestedRoutes
				? matchRoutes(
						nestedRoutes,
						url,
						currentMatchedRoutes,
						currentMatchedPath
					)
				: currentMatchedRoutes)
	);
};

/**
 * @param {String} url the original request URL
 * @param {Array} queries an array of query function results
 * @param {Object} matchedRoute a { route, match } object to inspect for query functions
 * @return {Array} an array of returned query objects
 */
export const matchedRouteQueriesReducer = location => (
	queries,
	{ route, match }
) => {
	if (!route.query) {
		return queries;
	}
	const routeQueryFns = route.query instanceof Array
		? route.query
		: [route.query];

	// call the query functions with non-url-encoded params
	const params = decodeParams(match.params);
	const routeQueries = routeQueryFns
		.map(queryFn => queryFn({ location, params }))
		.filter(query => query);

	return [...queries, ...routeQueries];
};

/**
 * Populate the 'component' property of all async routes
 *
 * @param {Array} routes an array of route objects
 * @param {String} url the current URL path
 * @param {URL} location the parsed url
 * @return {Promise} resolves with all matched routes when their components
 *   have been resolved
 */
export const resolveRouteComponents = (routes, baseUrl) => location => {
	const url = location.pathname.replace(baseUrl, '');
	const matchedRoutes = matchRoutes(routes, url);
	const componentPromises = matchedRoutes.map(
		({ route }) =>
			(route.load
				? route.load().then(c => route.component = c).then(() => route)
				: Promise.resolve(route))
	);
	return Promise.all(componentPromises);
};

/**
 * Populate the 'routes' property of all async routes
 *
 * @param {Array} routes an array of route objects
 * @param {String} url the current URL path
 * @param {URL} location the parsed url
 * @return {Promise} resolves with all matched routes when their `routes`
 *   children have been resolved
 */
export const resolveNestedRoutes = (routes, baseUrl) => location => {
	const url = location.pathname.replace(baseUrl, '');
	return matchRoutes(routes, url); // if this was a promise, job done
};

/**
 * Get the queries from all currently-active routes at the requested url path
 * @param {Array} routes an array of route objects
 * @param {String} url the current URL path
 * @return {Array} the queries attached to the active routes
 */
export const activeRouteQueries = (routes, baseUrl) => location =>
	matchRoutes(routes, location.pathname.replace(baseUrl, '')).reduce(
		matchedRouteQueriesReducer(location),
		[]
	);
