## hashqueue
A task queue that serializes tasks based on id. Guarantees that no two tasks assigned the same id can execute concurrently.

Recommended use for limiting concurrent mutation of state within a service boundary.

## API

__Example__
```javascript
var hashqueue = require( 'hashqueue' );
var tasks = hashqueue.create( 2 );

when.all( [
	tasks.add( 1, function() { console.log( 1 ); } ),
	tasks.add( 2, function() { console.log( 2 ); } ),
	tasks.add( 3, function() { console.log( 3 ); } ),
	tasks.add( 4, function() { console.log( 4 ); } )
] )
.then( function( results ) {
	// results will be empty since the tasks aren't returning anything
} );
```

### create( concurrencyLimit )

Creates a new hashqueue with the specified concurrency limit. The default limit is 4. Higher limits are better as the set of ids increase. Long-running tasks can slow things down, especially with lower limits.

```javascript
var queue = hashqueue.create( 2 );
```

### add( id, task )
Add a task to the queue. Returns a promise that will resolve to the value returned from the task when the task has completed.

> IMPORTANT: A promise __must__ be returned from tasks that are asynchronous.

```javascript
// this example will print 'tada' after roughly 100 ms.
var promise = queue.add( 100, function() {
	return when.promise( function( resolve ) {
		setTimeout( function() {
			resolve( 'tada' );
		}, 100 );
	} );
} );

promise.then( console.log );
```

### stop()
Stops all task runners. Ideally only used before disposal of the queue; a use case that will generally come up in testing.
