angular.module('pgdb.words')
    .service('Words', function ($http, $location, __env) {
        var base_url = __env.apiUrl + 'corpora/';
        var Words = {};

        Words.all = function (corpus_id, offset, ordering, query) {
            query_params = {};
            for (i=0;i<query.word.length; i++){
                if (query.word[i]['property'] === ''){
                    continue
                }
                if (query.word[i]['value'] === ''){
                    continue
                }
                query_params[query.word[i]['property']] = query.word[i]['value']
            }
            for (i=0;i<query.utterance.length; i++){
                if (query.utterance[i]['property'] === ''){
                    continue
                }
                if (query.utterance[i]['value'] === ''){
                    continue
                }
                query_params['utterance__' + query.utterance[i]['property']] = query.utterance[i]['value']
            }

            for (i=0;i<query.speaker.length; i++){
                if (query.speaker[i]['property'] === ''){
                    continue
                }
                if (query.speaker[i]['value'] === ''){
                    continue
                }
                query_params['speaker__' + query.speaker[i]['property']] = query.speaker[i]['value']
            }

            for (i=0;i<query.discourse.length; i++){
                if (query.discourse[i]['property'] === ''){
                    continue
                }
                if (query.discourse[i]['value'] === ''){
                    continue
                }
                query_params['discourse__' + query.discourse[i]['property']] = query.discourse[i]['value']
            }

            query_params.ordering = ordering;
            query_params.offset = offset;
            return $http.get(base_url + corpus_id + '/words/', {params: query_params});
        };


        return Words;
    });