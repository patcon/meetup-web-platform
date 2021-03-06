import { generateCanonicalUrl } from './links';
import { getSocialLinks } from '../../util/socialHelper';
import {
	padNumber,
	getFormattedTime,
	convertToLocalTime,
} from '../dateTimeUtils';

export const DEFAULT_TITLE = 'Meetup';
export const SCHEMA_ORG = 'http://schema.org';
export const MEETUP_SWARM_LOGO_URL = 'https://secure.meetupstatic.com/s/img/786824251364989575000/logo/swarm/m_swarm_630x630.png';

/**
 * Generated Object of LD-JSON of organization info
 * @see https://json-ld.org/ - to learn more about ld-json
 * @param {String} baseUrl base url of the page (protocol + hostname)
 * @param {String} localeCode locale of user
 * @param {String} route redux'd route to the current page
 * @return {Object} accumulated json object
 */
export const generateOrganizationLdJson = (baseUrl, localeCode, route) => {
	const socialLinks = getSocialLinks(localeCode);
	const url = generateCanonicalUrl(baseUrl, localeCode, route);
	return {
		'@type': 'Organization',
		'@context': SCHEMA_ORG,
		url,
		name: DEFAULT_TITLE,
		logo: MEETUP_SWARM_LOGO_URL,
		sameAs: [
			socialLinks.facebook,
			socialLinks.twitter,
			socialLinks.youtube,
			socialLinks.googlePlus,
			socialLinks.instagram,
		],
	};
};

/**
 * Generated Object of LD-JSON used if event has a venue
 * @see https://json-ld.org/ - to learn more about ld-json
 * @param {Object} venue venue object associated with the event
 * @return {Object} accumulated json object
 */
export const generateLocationLdJson = venue => {
	const address = {
		'@type': 'PostalAddress',
		streetAddress: [venue.address_1, venue.address_2, venue.address_3]
			.filter(k => k !== undefined && k !== '')
			.join(' '),
		addressLocality: venue.city,
		postalCode: venue.zip,
		addressRegion: venue.state,
		addressCountry: venue.localized_country_name,
	};

	const geo = {
		'@type': 'GeoCoordinates',
		latitude: venue.lat,
		longitude: venue.lon,
	};

	return {
		location: {
			'@type': 'Place',
			name: venue.name,
			address,
			geo,
		},
	};
};

/**
 * Generated Object of LD-JSON if event has a fee associated
 * @see https://json-ld.org/ - to learn more about ld-json
 * @param {Object} fee Fee data associated with event
 * @return {Object} accumulated json object
 */
export const generateFeeLdJson = fee =>
	({
		offers: {
			'@type': 'Offer',
			price: fee.amount,
			priceCurrency: fee.currency,
		},
	});

/**
 * Generated Object of LD-JSON used for search engines to read data on page
 * @see https://json-ld.org/ - to learn more about ld-json
 * @param {Object} eventInfo event object for the page
 * @return {Object} accumulated json object
 */
export const generateEventLdJson = eventInfo => {
	const startDate =
		eventInfo.time && generateEventDateForSeo(eventInfo.time, eventInfo.utc_offset);
	const endDate =
		eventInfo.time &&
		eventInfo.duration &&
		generateEventDateForSeo(
			eventInfo.time + eventInfo.duration,
			eventInfo.utc_offset
		);
	const offers = eventInfo.fee ? generateFeeLdJson(eventInfo.fee) : {};
	const location = eventInfo.venue ? generateLocationLdJson(eventInfo.venue) : {};

	// trim description to 500 characters
	const description = (
		eventInfo.plain_text_no_images_description ||
		eventInfo.description ||
		''
	).substring(0, 500);

	return {
		'@context': SCHEMA_ORG,
		'@type': 'Event',
		name: eventInfo.name,
		url: eventInfo.link,
		description,
		startDate,
		endDate,
		...location,
		...offers,
	};
};

export const generateEventDateForSeo = (time, offset = 0) => {
	const localDate = convertToLocalTime(time, offset);
	const localYear = localDate.getFullYear();
	const localMonth = padNumber(localDate.getMonth() + 1);
	const localDay = padNumber(localDate.getDate());
	const localTime = getFormattedTime(localDate).replace(/:[^:]+$/, ''); // strip the last `:` and everything after

	const offsetHoursMins = offset / (60 * 1000);
	const offsetHours = padNumber(parseInt(Math.abs(offsetHoursMins / 60)));
	const offsetMins = padNumber(Math.abs(offsetHoursMins % 60));
	const operator = offset < 0 ? '-' : '+';
	const formattedOffset = `${operator}${offsetHours}:${offsetMins}`;

	// this will create a startDate in this format 2018-02-23T18:00+04:00
	return `${localYear}-${localMonth}-${localDay}T${localTime}${formattedOffset}`;
};
