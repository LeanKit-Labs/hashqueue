var hasher = require( 'haberdasher' );
var when = require( 'when' );

function addTask( hash, id, task ) {
	return hash.get( id.toString() )
		.then( function( queue ) {
			return queue.push( task );
		} );
}

function createQueue() {
	var queue = [];
	return {
		list: queue,
		pending: undefined,
		push: function( task ) {
			var deferred = when.defer();
			var item = {
				task: task,
				deferred: deferred
			}
			if ( this.pending ) {
				this.pending.resolve( item );
				this.pending = undefined;
			} else {
				queue.push( item );
			}
			return deferred.promise;
		},
		pop: function() {
			if ( queue.length ) {
				return when( queue.pop() );
			} else {
				this.pending = when.defer();
				return this.pending.promise;
			}
		}
	}
}

function looper( queue ) {
	queue.pop()
		.then( function( item ) {
			if ( !item ) {
				return when( undefined );
			} else {
				var result = item.task();
				if ( result && when.isPromiseLike( result ) ) {
					return result
						.then( function( x ) {
							item.deferred.resolve( x );
							return item;
						} );
				} else {
					item.deferred.resolve( result );
					return when( item );
				}
			}
		} )
		.then( function( item ) {
			if ( !queue.stopped ) {
				looper( queue );
			}
		} );
}

function createHashQueue( limit ) {
	limit = limit || 4;
	var hash = hasher();
	var queues = [];
	var state = {
		add: addTask.bind( undefined, hash ),
		hash: hash,
		queues: queues,
		stop: function() {
			this.stopped = true;
			this.queues.forEach( function( queue ) {
				if ( queue.pending ) {
					queue.pending.resolve( undefined );
				}
			} );
		},
		stopped: false
	};
	for (var i = 0; i < limit; i++) {
		var id = i;
		var queue = queues[ i ] = createQueue();
		hash.add( i, queue );
		looper( queue );
	}
	return state;
}

module.exports = {
	create: createHashQueue
};
