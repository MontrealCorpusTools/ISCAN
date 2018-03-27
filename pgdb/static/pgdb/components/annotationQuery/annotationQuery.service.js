angular.module('pgdb.annotationQuery')
    .service('AnnotationQuery', function ($http, $location, __env) {
        var base_url = __env.apiUrl + 'corpora/';
        var AnnotationQuery = {};
        var annotation_types = ['phone', 'syllable', 'word', 'utterance'];

        AnnotationQuery.sound_file_url = function (corpus_id, id) {
            return base_url + corpus_id + '/annotations/' + id + '/sound_file/';
        };

        AnnotationQuery.export_pitch_tracks = function (corpus_id) {
            return __env.apiUrl + corpus_id + '/export_pitch/';

        };

        AnnotationQuery.subset = function (corpus_id, annotation_type, offset, ordering, with_pitch, params) {

            params = Object.assign({}, params, {
                with_pitch: with_pitch,
                offset: offset, ordering: ordering, annotation_type: annotation_type
            });

            return $http.get(base_url + corpus_id + '/annotations/', {params: params});

        };

        AnnotationQuery.export = function (corpus_id, annotation_type, ordering, with_pitch, query) {
            query_params = {
                filters: {},
                columns: []
            };
            var name;
            var inc;
            var key;
            for (j = 0; j < annotation_types.length; j++) {
                inc = j >= annotation_types.indexOf(annotation_type);
                if (!inc) {
                    continue
                }
                for (i = 0; i < query.query[annotation_types[j]].length; i++) {
                    if (query.query[annotation_types[j]][i]['property'] === '') {
                        continue
                    }
                    if (query.query[annotation_types[j]][i]['value'] === '') {
                        continue
                    }
                    if (annotation_type == annotation_types[j]) {
                        name = query.query[annotation_types[j]][i]['property'];
                    }
                    else {
                        name = annotation_types[j] + '__' + query.query[annotation_types[j]][i]['property'];
                    }
                    query_params.filters[name] = query.query[annotation_types[j]][i]['value']
                }
                for (key in query.columns[annotation_types[j]]) {
                    // check if the property/key is defined in the object itself, not in parent
                    if (query.columns[annotation_types[j]].hasOwnProperty(key) && query.columns[annotation_types[j]]) {
                        if (annotation_type == annotation_types[j]) {
                            name = key;
                        }
                        else {
                            name = annotation_types[j] + '__' + key;
                        }
                        query_params.columns.push(name);
                    }
                }
            }


            for (i = 0; i < query.query.speaker.length; i++) {
                if (query.query.speaker[i]['property'] === '') {
                    continue
                }
                if (query.query.speaker[i]['value'] === '') {
                    continue
                }
                query_params['speaker__' + query.query.speaker[i]['property']] = query.query.speaker[i]['value'];
                for (key in query.columns.speaker) {
                    // check if the property/key is defined in the object itself, not in parent
                    if (query.columns.speaker.hasOwnProperty(key) && query.columns.speaker) {
                        name = 'speaker__' + key;
                        query_params.columns.push(name);
                    }
                }
            }

            for (i = 0; i < query.query.discourse.length; i++) {
                if (query.query.discourse[i]['property'] === '') {
                    continue
                }
                if (query.query.discourse[i]['value'] === '') {
                    continue
                }
                query_params['discourse__' + query.query.discourse[i]['property']] = query.query.discourse[i]['value'];
                for (key in query.columns.discourse) {
                    // check if the property/key is defined in the object itself, not in parent
                    if (query.columns.discourse.hasOwnProperty(key) && query.columns.discourse) {
                        name = 'discourse__' + key;
                        query_params.columns.push(name);
                    }
                }
            }
            query_params.annotation_type = annotation_type;
            query_params.ordering = ordering.replace(annotation_type + '.', '');
            query_params.with_pitch = with_pitch;
            query_params.annotation_type = annotation_type;
            console.log($http.defaults.headers.post);
            return $http.post(base_url + corpus_id + '/export/', query_params);
        };

        AnnotationQuery.all = function (corpus_id, annotation_type, offset, ordering, with_pitch, query) {
            query_params = {};
            var name;
            if (annotation_type == 'phone') {
                for (i = 0; i < query.phone.length; i++) {
                    if (query.phone[i]['property'] === '') {
                        continue
                    }
                    if (query.phone[i]['value'] === '') {
                        continue
                    }
                    if (annotation_type == 'phone') {
                        name = query.phone[i]['property'];
                    }
                    else {
                        name = 'phone__' + query.phone[i]['property'];
                    }
                    query_params[query.phone[i]['property']] = query.phone[i]['value']
                }

            }
            if (annotation_type == 'syllable' || annotation_type == 'phone') {
                for (i = 0; i < query.syllable.length; i++) {
                    if (query.syllable[i]['property'] === '') {
                        continue
                    }
                    if (query.syllable[i]['value'] === '') {
                        continue
                    }
                    if (annotation_type == 'syllable') {
                        name = query.syllable[i]['property'];
                    }
                    else {
                        name = 'syllable__' + query.syllable[i]['property'];
                    }
                    query_params[query.syllable[i]['property']] = query.syllable[i]['value']
                }

            }
            if (annotation_type == 'word' || annotation_type == 'syllable' || annotation_type == 'phone') {
                for (i = 0; i < query.word.length; i++) {
                    if (query.word[i]['property'] === '') {
                        continue
                    }
                    if (query.word[i]['value'] === '') {
                        continue
                    }
                    if (annotation_type == 'word') {
                        name = query.word[i]['property'];
                    }
                    else {
                        name = 'word__' + query.word[i]['property'];
                    }

                    query_params[name] = query.word[i]['value']
                }

            }
            for (i = 0; i < query.utterance.length; i++) {
                if (query.utterance[i]['property'] === '') {
                    continue
                }
                if (query.utterance[i]['value'] === '') {
                    continue
                }
                if (annotation_type == 'utterance') {
                    name = query.utterance[i]['property'];
                }
                else {
                    name = 'utterance__' + query.utterance[i]['property'];
                }
                query_params[name] = query.utterance[i]['value']
            }

            for (i = 0; i < query.speaker.length; i++) {
                if (query.speaker[i]['property'] === '') {
                    continue
                }
                if (query.speaker[i]['value'] === '') {
                    continue
                }
                query_params['speaker__' + query.speaker[i]['property']] = query.speaker[i]['value']
            }

            for (i = 0; i < query.discourse.length; i++) {
                if (query.discourse[i]['property'] === '') {
                    continue
                }
                if (query.discourse[i]['value'] === '') {
                    continue
                }
                query_params['discourse__' + query.discourse[i]['property']] = query.discourse[i]['value']
            }
            query_params.ordering = ordering.replace(annotation_type + '.', '');
            query_params.offset = offset;
            query_params.with_pitch = with_pitch;
            query_params.annotation_type = annotation_type;
            return $http.get(base_url + corpus_id + '/annotations/', {params: query_params});
        };

        AnnotationQuery.one = function (corpus_id, annotation_type, id, with_pitch, with_waveform, with_spectrogram) {
            return $http.get(base_url + corpus_id + '/annotations/' + id + '/', {
                params: {
                    with_pitch: with_pitch,
                    with_waveform: with_waveform,
                    with_spectrogram: with_spectrogram,
                    annotation_type: annotation_type
                }
            });
        };
        AnnotationQuery.generate_pitch_track = function (corpus_id, id, newPitchSetings) {
            newPitchSetings.utterance_id = id;
            return $http.get(base_url + corpus_id + '/utterance_pitch_track/', {
                params: newPitchSetings
            });
        };

        AnnotationQuery.save_pitch_track = function (corpus_id, id, new_track) {
            return $http.post(__env.apiUrl + corpus_id + '/save/pitch/' + id + '/', new_track);

        };

        return AnnotationQuery;
    });
