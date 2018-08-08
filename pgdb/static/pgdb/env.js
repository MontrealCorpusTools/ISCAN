(function (window) {
  window.__env = window.__env || {};
  window.__env.hostUrl = 'http://ps-app:24465/';
//  window.__env.hostUrl = 'http://localhost:8080/';
  window.__env.apiUrl = window.__env.hostUrl+'api/';
  window.__env.intontationUrl = window.__env.hostUrl +'intonation/';
  window.__env.annotatorUrl = window.__env.hostUrl +'annotator/api/';
  window.__env.baseUrl = '/';
  window.__env.siteName = 'ISCAN';
  window.__env.enableDebug = true;
}(this));
