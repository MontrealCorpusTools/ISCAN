angular.module('pgdb.query').factory('QueryState', function () {
    return {
        wordQuery: {
            word: [],
            utterance: [],
            discourse: [],
            speaker: []
        },
        wordQueryResults: [],
        wordQueryResultCount: 0,
        wordOrdering: '-discourse.name',
        wordCurrentPage: 1,
        wordResultsPerPage: 100,
        wordOffset: 0,
        wordNumPages: 0,
        wordQueryRunning: false,
        wordQueryText: 'Run query',
        wordQueryColumns: {}
    }
});