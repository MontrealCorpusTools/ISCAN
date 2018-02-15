angular.module("pgdb.auth").factory("AuthService", [
    '__env', 'HttpService', function(__env, HttpService) {
      return {
        login: function(user) {
          var url;
          url = __env.apiUrl + "api-token-auth/";
          return HttpService.post(url, user);
        },
        checkAuth: function() {
          var url;
          url = __env.apiUrl + "check-auth/";
          return HttpService.get(url);
        },
        createSessionFor: function(user) {
          var group, ind;
          return {
            user: user,
            userRoles: [
              (function() {
                var _ref, _results;
                _ref = user.groups;
                _results = [];
                for (ind in _ref) {
                  group = _ref[ind];
                  _results.push(group.name);
                }
                return _results;
              })()
            ][0]
          };
        },
        isAuthorized: function(authorizedRoles, session) {
          var role, _i, _len;
          if (!angular.isArray(authorizedRoles)) {
            authorizedRoles = [authorizedRoles];
          }
          if (authorizedRoles.length === 0) {
            return true;
          }
          for (_i = 0, _len = authorizedRoles.length; _i < _len; _i++) {
            role = authorizedRoles[_i];
            if (__indexOf.call(session.userRoles, role) >= 0) {
              return true;
            }
          }
          return false;
        },
        isRestricted: function(restrictedRoles, session) {
          var role, _i, _len, _ref;
          if (!angular.isArray(restrictedRoles)) {
            restrictedRoles = [restrictedRoles];
          }
          if (restrictedRoles.length === 0) {
            return false;
          }
          _ref = session.userRoles;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            role = _ref[_i];
            if (__indexOf.call(restrictedRoles, role) >= 0) {
              return true;
            }
          }
          return false;
        }
      };
    }
  ]).factory("CookieService", [
    '$cookies', function($cookies) {
      return {
        get: function(name) {
          if ($cookies.get) {
            return $cookies.get(name);
          } else {
            return $cookies[name];
          }
        },
        put: function(name, value) {
          if ($cookies.put) {
            return $cookies.put(name, value);
          } else {
            return $cookies[name] = value;
          }
        },
        remove: function(name) {
          if ($cookies.remove) {
            return $cookies.remove(name);
          } else {
            return delete $cookies[name];
          }
        }
      };
    }
  ]).factory("HttpService", [
    "$http", "$q", "$timeout", function($http, $q, $timeout) {
      var ensureEndsWithSlash;
      ensureEndsWithSlash = function(url) {
        if (url[url.length - 1] === "/") {
          return url;
        } else {
          return url + "/";
        }
      };
      return {
        get: function(url, timeout) {
          var defer;
          defer = $q.defer();
          $http({
            method: "GET",
            url: url
          }).then(function(data) {
            if (timeout) {
              $timeout((function() {
                defer.resolve(data);
              }), timeout);
            } else {
              defer.resolve(data);
            }
          }).catch(function(data) {
            console.error("HttpService.get error: " + data);
            defer.reject(data);
          });
          return defer.promise;
        },
        getblob: function(url) {
          var defer;
          defer = $q.defer();
          $http({
            method: "GET",
            url: url,
            responseType: "blob"
          }).then(function(data) {
            defer.resolve(data);
          }).catch(function(data) {
            console.error("HttpService.get error: " + data);
            defer.reject(data);
          });
          return defer.promise;
        },
        post: function(url, data) {
          var defer, surl;
          defer = $q.defer();
          surl = ensureEndsWithSlash(url);
          $http({
            method: "POST",
            url: surl,
            data: data
          }).then(function(data) {
            defer.resolve(data);
          }).catch(function(data) {
            console.error("HttpService.post error: " + data);
            defer.reject(data);
          });
          return defer.promise;
        },
        put: function(url, data) {
          var defer, surl;
          defer = $q.defer();
          surl = ensureEndsWithSlash(url);
          $http({
            method: "PUT",
            url: surl,
            data: data
          }).then(function(data) {
            defer.resolve(data);
          }).catch(function(data) {
            console.error("HttpService.put error: " + data);
            defer.reject(data);
          });
          return defer.promise;
        },
        "delete": function(url, data) {
          var defer, surl;
          defer = $q.defer();
          surl = ensureEndsWithSlash(url);
          $http({
            method: "DELETE",
            url: surl,
            data: data
          }).then(function(data) {
            defer.resolve(data);
          }).catch(function(data) {
            console.error("HttpService.put error: " + data);
            defer.reject(data);
          });
          return defer.promise;
        }
      };
    }
  ]);