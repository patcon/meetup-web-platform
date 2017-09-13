// @flow
import React from 'react';
import { withRouter } from 'react-router';
import JSCookie from 'js-cookie';

/*
 * A simple lifecycle component that records a 'geoip' cookie based on a
 * querystring param
 */
class GeoIPWriter extends React.Component {
	props: {
		location: LocationShape,
		children: React$Element<*>,
	};
	componentDidMount() {
		const { search } = this.props.location;
		if (search) {
			const searchParams = new URLSearchParams(search);
			const geoip = searchParams.get('set_geoip');
			if (geoip) {
				JSCookie.set('geoip', geoip); // make it permanent
			}
		}
	}
	render() {
		return this.props.children;
	}
}

export default withRouter(GeoIPWriter);
