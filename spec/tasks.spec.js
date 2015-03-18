var chai = require( 'chai' );
var should = chai.should();
var _ = require( 'lodash' );
var when = require( 'when' );
var HQ = require( '../src/index' );

var state = {};
var inUse = {};
function read( id ) {
	if ( inUse[ id ] ) {
		return when.reject( new Error( 'Concurrent access violation!' ) );
	} else {
		inUse[ id ] = true;
		return when.promise( function( resolve ) {
			setTimeout( function() {
				resolve( state[ id ] );
			}, 10 );
		} );
	}
}

function reset() {
	inUse = {};
	state = {};
}

function write( id, val ) {
	if ( !inUse[ id ] ) {
		return when.reject( new Error( 'Don\'t go changing things all willy-nilly!' ) );
	} else {
		return when.promise( function( resolve ) {
			setTimeout( function() {
				state[ id ] = val;
				inUse[ id ] = false;
				resolve( val );
			}, 10 );
		} );
	}
}

function createTask( id ) {
	return function() {
		return read( id )
			.then( function( thing ) {
				return write( id, thing );
			} );
	};
}

describe( 'Without queue', function() {
	describe( 'With a single id', function() {
		var err;
		before( function() {
			var tasks = [
				createTask( 1 ),
				createTask( 1 ),
				createTask( 1 )
			];
			var promises = _.map( tasks, function( t ) {
				return t().catch( function( e ) {
					err = e;
				} );
			} );
			return when.settle( promises );
		} );

		it( 'should result in an exception', function() {
			err.message.should.equal( 'Concurrent access violation!' );
		} );

		after( function() {
			reset();
		} );
	} );
} );

describe( 'With queue', function() {
	describe( 'With a single id', function() {
		var err;
		var hq;
		before( function() {
			hq = HQ.create();
			var promises = [
				hq.add( 1, createTask( 1 ) ),
				hq.add( 1, createTask( 1 ) ),
				hq.add( 1, createTask( 1 ) )
			];
			return when.settle( promises );
		} );

		it( 'should not result in an exception', function() {
			( err === undefined ).should.be.true;
		} );

		after( function() {
			hq.stop();
			reset();
		} );
	} );

	describe( 'With task results', function() {
		var results;
		var hq;
		before( function() {
			hq = HQ.create();
			var promises = [
				hq.add( 1, function() {
					return 1;
				} ),
				hq.add( 1, function() {
					return when.promise( function( resolve ) {
						setTimeout( function() {
							resolve( 2 );
						}, 10 );
					} )
				} ),
				hq.add( 1, function() {
					return when( 3 );
				} ),
			];
			return when.all( promises ).then( function( x ) {
				results = x;
			} );
		} );

		it( 'should produce expected results', function() {
			results.should.eql( [ 1, 2, 3 ] );
		} );

		after( function() {
			hq.stop();
			reset();
		} );
	} );
} );
