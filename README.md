# LowlaDB Angular #

> An AngularJS integration for LowlaDB

## Installation ##

Install LowlaDB-Angular via Bower:

```bash
$ bower install lowladb-angular --save
```

Then, include it in your HTML:

```html
<!-- AngularJS -->
<script src="bower_components/angular/angular.min.js"></script>

<!-- LowlaDB -->
<script src="bower_components/lowladb/dist/lowladb.min.js"></script>

<!-- LowlaDB-Angular -->
<script src="bower_components/lowladb-angular/dist/lowladb-angular.js"></script>
```

Then, add the `lowladb` module to your app's dependencies:

```js
angular.module('myApp', ['lowladb']);
```

Now you can use the `$lowla`, `$lowlaArray`, `$lowlaDocument` and `$lowlaDefer` services in your AngularJS application.

## Overview

LowlaDB-Angular does not replace the core LowlaDB APIs.  You will still need to create an instance of LowlaDB in your
application and use the core APIs to create cursors that `$lowlaArray` can then manage for you.

The `example/` folder includes a [TodoMVC](http://todomvc.com) implementation that uses LowlaDB for storage.  The 
`lowlaStorage` service (located [here](example/todomvc/js/services/todoStorage.js)) uses `$lowlaArray` to persist, 
synchronize, and provide offline access to TODOs across multiple browsers via 
[lowladb-node](https://github.com/lowladb/lowladb-node).

## $lowla

LowlaDB-Angular includes a provider for instances of LowlaDB.  You can configure the sync URL as well as other 
Lowla configuration options via `angular.config`:
 
```js
angular
  .module('myApp')
  .config(lowlaConfig)
  .run(appRun)
  
function lowlaConfig($lowlaProvider) {
  // To set the sync URL (default is the current page's location):
  $lowlaProvider.setLowlaUrl('http://lowla.io');
  
  // To set the LowlaDB configuration (default uses a Memory datastore):
  $lowlaProvider.setConfig({ datastore: 'IndexedDB' });
}

function appRun($lowla) {
  var docCollection = $lowla.collection('mydb', 'docs');
  // ...
}

```

## $lowlaArray

It's common to bind a collection of documents to a scope for display.  Given a cursor, `$lowlaArray` takes care of 
fetching the documents into an array as well as keeping the array up-to-date as changes are made via LowlaDB's live 
cursor feature.

The array returned by `$lowlaArray` should be considered "read-only" -- do not use `push()`, `splice()`, etc. to modify
the array as those changes will not be reflected back to the underlying collection.  `$lowlaArray` provides functions
on the array itself to modify the collection.

A simple example:

```js
function MyController($lowlaArray, $scope) {
  // Pass the scope into $lowlaArray to automatically clean up the live cursor when the scope is destroyed
  $scope.myDocs = $lowlaArray(someCollection.find({}), $scope);

  // Use $save(documentOrIndex) to save a changed item in the array to the collection
  $scope.saveEditedDocument = function (theDoc) {
    $scope.myDocs.$save(theDoc);
  }

  // Use $remove(documentOrIndex) to delete an item in the array from the collection
  $scope.deleteDocumentAt = function (docIdx) {
    $scope.myDocs.$remove(docIdx);
  }

  // Use $add(newDocument) to create a new document in the collection
  $scope.creteDocument = function (newDoc) {
    $scope.myDocs.$add(newDoc);
  }
}
```

## $lowlaDocument

To synchronize a single document rather than a collection, use `$lowlaDocument`.  The returned object will be kept
up-to-date via LowlaDB's live cursors.

```js
function MyEditController($lowlaDocument, $scope) {
  // Pass the scope into $lowlaDocument to automatically clean up the live cursors when the scope is destroyed
  $scope.editDoc = $lowlaDocument(someCollection.find({_id: '...'}), $scope);

  $scope.saveDocument = function() {
    someCollection.findAndModify({_id: $scope.editDoc._id}, $scope.editDoc);
  };
}
```
  
## $lowlaDefer

The core LowlaDB library uses promises that are similar but not directly compatible with Angular's `$q` promise
library.  To bridge the gap, LowalDB-Angular includes `$lowlaDefer` to wrap LowlaDB's promises in `$q` promises.

```js
// set a scope variable to an object from a LowlaDB collection
var myColl = lowla.collection('myDb', 'myColl'); 
$lowlaDefer(myColl.findOne({_id: 1234)).then(function (doc) {
  $scope.myDoc = doc;
});

// Also useful in resolve blocks for routing
$routeProvider.when('/completed', {
  templateUrl: 'completed.html',
  resolve: {
    docs: function ($lowlaDefer) { return $lowlaDefer(someCollection.find({someField: 'someVal'}).toArray()) }
  },
  controller: function($scope, docs) {
    $scope.docs = docs;
  }
});
```
