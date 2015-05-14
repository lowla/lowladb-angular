(function (exports) {
  'use strict';

  angular
    .module('lowladb', [])
    .value('LowlaDB', exports.LowlaDB)
    .provider('$lowla', lowlaProvider)
    .factory('$lowlaArray', lowlaDbArray)
    .factory('$lowlaDocument', lowlaDbDocument)
    .factory('$lowlaDefer', lowlaDefer);

  function lowlaProvider() {
    /* jshint validthis:true */
    var lowlaUrl;
    var config = {datastore: 'Memory'};
    var _lowla;

    this.setLowlaUrl = function (url) {
      lowlaUrl = url;
    };

    this.setConfig = function (_config) {
      angular.copy(config, _config);
    };

    this.$get = ['$location', function ($location) {
      if (!_lowla) {
        lowlaUrl = lowlaUrl || $location.protocol() + '://' + $location.host() + ':' + $location.port();
        _lowla = new LowlaDB(config);
        _lowla.sync(lowlaUrl);
      }

      return _lowla;
    }];
  }

  lowlaDefer.$inject = ['$q'];
  function lowlaDefer($q) {
    return function (lowlaPromise) {
      var defer = $q.defer();
      lowlaPromise.then(defer.resolve, defer.reject);
      return defer.promise;
    };
  }

  lowlaDbArray.$inject = ['$log', '$timeout', '$q', '$rootScope', '$lowlaDefer'];
  function lowlaDbArray($log, $timeout, $q, $rootScope, $lowlaDefer) {
    function LowlaDBArray(cursor, scope) {
      if (!(this instanceof LowlaDBArray)) {
        return new LowlaDBArray(cursor, scope);
      }

      var self = this;
      this.$defer = $lowlaDefer;
      this.$data = [];
      scope = scope || $rootScope;

      var syncArr = _debounce(syncArrFn, 10);

      if (cursor) {
        this.$off = cursor.on(function (err, c) {
          if (err) {
            $log.warn('LowlaDBArray: cursor error ' + err);
          }
          else {
            syncArr(c);
          }
        });

        if (scope && this.$off) {
          scope.$on('$destroy', this.$off);
        }

        this.$data.$add = function (doc) {
          return $lowlaDefer(cursor._collection.insert(doc));
        };

        this.$data.$remove = function (docOrIdx) {
          var doc = _findDoc(docOrIdx);
          if (!doc) {
            return $q.reject('Invalid document or index');
          }

          return $lowlaDefer(cursor._collection.remove({_id: doc._id}));
        };

        this.$data.$save = function (docOrIdx) {
          var doc = _findDoc(docOrIdx);
          if (!doc) {
            return $q.reject('Invalid document or index');
          }

          return $lowlaDefer(cursor._collection.findAndModify({_id: doc._id}, docOrIdx));
        };
      }

      return this.$data;

      function syncArrFn(c) {
        c.toArray().then(function (arr) {
          $timeout(function () {
            self.$data.length = 0;
            self.$data.push.apply(self.$data, arr);
          });
        });
      }

      function _findDoc(docOrIdx) {
        var data = self.$data;
        if (angular.isNumber(docOrIdx) && 0 <= docOrIdx && docOrIdx < data.length) {
          return self.$data[docOrIdx];
        }
        else if (angular.isObject(docOrIdx) && angular.isDefined(docOrIdx._id)) {
          var pos = -1;
          for (var x = 0, len = data.length; x < len; x++) {
            if (data[x]._id === docOrIdx._id) {
              pos = x;
              break;
            }
          }

          if (-1 !== pos) {
            return data[pos];
          }
        }

        return null;
      }
    }

    return LowlaDBArray;
  }

  lowlaDbDocument.$inject = ['$rootScope', '$timeout', '$log'];
  function lowlaDbDocument($rootScope, $timeout, $log) {
    function LowlaDBDocument(cursor, scope) {
      if (!(this instanceof LowlaDBDocument)) {
        return new LowlaDBDocument(cursor, scope);
      }

      var self = this;
      self.$data = {};
      scope = scope || $rootScope;

      if (cursor) {
        self.$off = cursor.on(function (err, c) {
          if (err) {
            $log.warn('LowlaDBDocument: cursor error ' + err);
          }
          else {
            syncObj(c);
          }
        });

        if (scope && this.$off) {
          scope.$on('$destroy', this.$off);
        }
      }

      return self.$data;

      function syncObj(c) {
        c.toArray().then(function (arr) {
          $timeout(function () {
            clearData();
            if (arr.length > 0 && arr[0]) {
              angular.copy(arr[0], self.$data);
              //copyData(arr[0]);
            }
          });
        });
      }

      function clearData() {
        for (var k in self.$data) {
          if (self.$data.hasOwnProperty(k)) {
            delete self.$data[k];
          }
        }
      }

      function copyData(src, dest) {
        dest = dest || self.$data;
        angular.copy(src, dest);
        for (var k in src) {
          if (src.hasOwnProperty(k)) {
            if (src[k] && typeof src[k] === 'object') {
              dest[k] = {};
              copyData(src[k], dest[k]);
            }
            else {
              dest[k] = src[k];
            }
          }
        }
      }
    }

    return LowlaDBDocument;
  }

  function _debounce(func, wait, immediate) {
    var timeout;
    return function () {
      var context = this;
      var args = arguments;
      var later = function () {
        timeout = null;
        if (!immediate) {
          func.apply(context, args);
        }
      };

      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) {
        func.apply(context, args);
      }
    };
  }

})(window);
