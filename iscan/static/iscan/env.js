(function (window) {
    window.__env = window.__env || {};
    if (window.location.port) {
        window.__env.hostUrl = 'http://' + window.location.hostname + ':' + window.location.port + '/';
    }
    else {
        window.__env.hostUrl = 'http://' + window.location.hostname + '/';
    }
    window.__env.apiUrl = window.__env.hostUrl + 'api/';
    window.__env.intontationUrl = window.__env.hostUrl + 'intonation/';
    window.__env.annotatorUrl = window.__env.hostUrl + 'annotator/api/';
    window.__env.baseUrl = '/';
    window.__env.siteName = 'ISCAN';
    window.__env.enableDebug = true;
}(this));
