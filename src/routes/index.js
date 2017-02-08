import chalk from 'chalk';

import apiProxy$ from '../apiProxy/api-proxy';

import getApiProxyRoutes from '../apiProxy/apiProxyRoutes';
import getApplicationRoute from './appRoute';

export const pingRoute = {
	path: '/ping',
	method: 'GET',
	handler: (request, reply) => reply('pong!'),
};

export default function getRoutes(renderRequestMap, env, apiProxyFn$ = apiProxy$) {

	console.log(
		chalk.green(`Supported languages:\n${Object.keys(renderRequestMap).join('\n')}`)
	);

	return [
		pingRoute,
		...getApiProxyRoutes('/mu_api', env, apiProxyFn$),
		getApplicationRoute(renderRequestMap),
	];
}

