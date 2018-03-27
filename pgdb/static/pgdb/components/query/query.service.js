angular.module('pgdb.query').factory('QueryState', function () {
    var QueryState = {};
    QueryState.state = {};
    QueryState.reset = function (annotation_type) {
        QueryState.state = {
            type: annotation_type,
            query: {
                phone: [],
                syllable: [],
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
            queryRunning: false,
            queryText: 'Run query',
            exportText: 'Export to csv',
            columns: {
                phone: {},
                syllable: {},
                word: {},
                utterance: {},
                discourse: {},
                speaker: {}
            }
        }
    };

    return QueryState;
});