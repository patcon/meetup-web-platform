// @flow
const buildPaths = require('mwp-config').paths;
const path = require('path');

/*
 * The service worker plugin will register a root-level route for serving the
 * service worker script file.
 *
 * Disk location of the script file is determined by builder CLI config import.
 */
export function register(server: Object, options: ?Object) {
	/*
	 * Route for service worker script at top-level path. Depends on `Inert`
	 * `path` must match client `serviceWorker.register` call - MWP provides this
	 * in the `<ServiceWorker>` component
	 */
	server.route({
		method: 'GET',
		path: '/asset-service-worker.{localeCode}.js',
		options: {
			auth: false,
		},
		handler: (request, h) => {
			const { localeCode } = request.params;
			const swPath = path.resolve(
				buildPaths.output.browser,
				localeCode,
				'asset-service-worker.js'
			);
			return h.file(swPath);
		},
	});
}

export const plugin = {
	register,
	name: 'mwp-service-worker',
	version: '1.0.0',
	dependencies: 'inert', // decorates `h.file`
};
