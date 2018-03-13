declare type ParsedQueryResponses = {
	successes: Array<QueryState>,
	errors: Array<QueryState>,
};
declare type QueryFetcher = (queries: Array<Query>): Promise<ParsedQueryResponses>
