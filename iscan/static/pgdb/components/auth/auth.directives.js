angular.module("pgdb.auth").directive('hasPermission', [
    '$rootScope', function($rootScope) {
      return {
        scope: {
          user: '='
        },
        link: function(scope, element, attrs) {
          var group, hasPermission, notPermissionFlag, permission, value, _i, _j, _len, _len1, _ref, _ref1;
          value = attrs.hasPermission.trim();
          notPermissionFlag = value[0] === '!';
          if (notPermissionFlag) {
            value = value.slice(1).trim();
          }
          hasPermission = false;
          if (scope.user) {
            _ref = scope.user.groups;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              group = _ref[_i];
              _ref1 = group.permissions;
              for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                permission = _ref1[_j];
                if (permission.codename === value) {
                  hasPermission = true;
                }
              }
            }
          }
          if (hasPermission && !notPermissionFlag || !hasPermission && notPermissionFlag) {
            return element.show();
          } else {
            return element.hide();
          }
        }
      };
    }
  ]).directive('hasPermissionToObject', [
    '$rootScope', function($rootScope) {
      return {
        scope: {
          object: '=',
          user: '=',
          disable: '='
        },
        link: function(scope, element, attrs) {
          var group, hasPermission, notPermissionFlag, object, permission, value, visibility, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2;
          value = attrs.hasPermissionToObject.trim();
          notPermissionFlag = value[0] === '!';
          if (notPermissionFlag) {
            value = value.slice(1).trim();
          }
          object = scope.object;
          hasPermission = false;
          if (object && !object.visibility) {
            hasPermission = true;
          } else {
            if (scope.user) {
              _ref = scope.user.groups;
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                group = _ref[_i];
                _ref1 = group.permissions;
                for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                  permission = _ref1[_j];
                  if (permission.codename === value) {
                    if (!object) {
                      hasPermission = true;
                    } else {
                      _ref2 = object.visibility;
                      for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
                        visibility = _ref2[_k];
                        if (visibility.permission === permission.id) {
                          hasPermission = true;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          if (hasPermission && !notPermissionFlag || !hasPermission && notPermissionFlag) {
            if (scope.disable) {
              element.removeAttr('disabled');
              element.trigger('chosen:updated');
            }
            return element.show();
          } else {
            if (scope.disable) {
              attrs.$set('disabled', 'disabled');
              return element.trigger('chosen:updated');
            } else {
              return element.hide();
            }
          }
        }
      };
    }
  ]);