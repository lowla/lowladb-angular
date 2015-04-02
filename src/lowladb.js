(function (exports) {
  'use strict';

  angular
    .module('lowladb', [])
    .value('LowlaDB', exports.LowlaDB)
    .factory('$lowlaArray', lowlaDbArray)
    .factory('$lowlaDefer', lowlaDefer);

  lowlaDefer.$inject = ['$q'];
  function lowlaDefer($q) {
    return function (lowlaPromise) {
      var defer = $q.defer();
      lowlaPromise.then(defer.resolve, defer.reject);
      return defer.promise;
    };
  }

  lowlaDbArray.$inject = ['$log', '$timeout', '$q', 'LowlaDB', '$rootScope', '$lowlaDefer'];
  function lowlaDbArray($log, $timeout, $q, LowlaDB, $rootScope, $lowlaDefer) {
    function LowlaDBArray(cursor, scope) {
      if (!(this instanceof LowlaDBArray)) {
        return new LowlaDBArray(cursor, scope);
      }

      var self = this;
      this.$defer = $lowlaDefer;
      this.$data = [];
      scope = scope || $rootScope;

      var syncArr = LowlaDB.utils.debounce(syncArrFn, 10);

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
})(window);
