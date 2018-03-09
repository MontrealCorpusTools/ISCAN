angular.module('pgdb.query').factory('QueryState', function () {
    return {
        type: 'word',
        query: {
            word: [],
            utterance: [],
            discourse: [],
            speaker: []
        },
        detailIndex: 0,
        results: [],
        count: 0,
        ordering: '-discourse.name',
        currentPage: 1,
        resultsPerPage: 100,
        offset: 0,
        numPages: 0,
        pages: [],
        query_running: false,
        query_text: 'Run query',
        columns: {
            word: {},
            utterance: {},
            discourse: {},
            speaker: {}
        }
    }
});