var jot_modules = { }
/* Utility code for running the library within a browser. */

function require(module_name) {
	module_name = module_name.replace(/^(\.\/)?jot\//, "");
	if (module_name in jot_modules)
		return jot_modules[module_name].exports;
	throw module_name + " not available!";
}

jot_modules['platform.js'] = {
	exports: {
		load_module: require
	}
};

jot_modules['deep-equal'] =  (function(module) {
module.exports = { };
var exports = module.exports;
var __dirname = 'jot';
var pSlice = Array.prototype.slice;
var Object_keys = typeof Object.keys === 'function'
    ? Object.keys
    : function (obj) {
        var keys = [];
        for (var key in obj) keys.push(key);
        return keys;
    }
;

var deepEqual = module.exports = function (actual, expected, opts) {
  if (!opts) opts = {};
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();

  // 7.3. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (typeof actual != 'object' && typeof expected != 'object') {
    return opts.strict ? actual === expected : actual == expected;

  // 7.4. For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected, opts);
  }
}

function isUndefinedOrNull(value) {
  return value === null || value === undefined;
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b, opts) {
  if (!opts) opts = {};
  if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return deepEqual(a, b, opts);
  }
  try {
    var ka = Object_keys(a),
        kb = Object_keys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!deepEqual(a[key], b[key], opts)) return false;
  }
  return true;
}
return module;}( {} ));

jot_modules['base.js'] =  (function(module) {
module.exports = { };
var exports = module.exports;
var __dirname = 'jot';
/* Base functions for the operational transformation library. */

var jot_platform = require(__dirname + "/platform.js");

exports.run_op_func = function(op, method/*, arg1, arg2, ... */) {
	/* Runs a method defined in the operation's library. */
	var lib = jot_platform.load_module(op.module_name);
	var args = [op];
	for (var i = 2; i < arguments.length; i++)
		args.push(arguments[i]);
	return lib[method].apply(null, args);
}

exports.simplify = function(op) {
	/* Simplifies any operation by loading its library's simplify function.
	   The return value is op or any operation equivalent to op, and it is
       typically used to turn degenerate cases of operations, like an insertion
       of the empty string, into no-ops.*/
	if (op.type == "no-op") return op; // has no module_name
	return exports.run_op_func(op, "simplify");
}

exports.apply = function(op, document) {
	/* Applies any operation to a document by loading its library's apply function.
	   The document may be modified in place or the new value may be returned,
	   depending on how the particular operation's library works. */
	if (op.type == "no-op") return document; // has no module_name
	return exports.run_op_func(op, "apply", document);
}

exports.invert = function(op) {
	/* Inverts any operation by loading its library's invert function.
	   The inverse operation has the opposite effect as op. Composing an operation
	   and its inverse must result in a no-op.*/
	if (op.type == "no-op") return op; // has no module_name
	return exports.run_op_func(op, "invert");
}

exports.compose = function(a, b) {
	/* Composes any two operations. The return value is a new operation that when
	   applied to a document yields the same value as apply(b, apply(a, document)).
	   May return null indicating a composition was not possible. */
	if (a.type == "no-op") return b;
	if (b.type == "no-op") return a;
	if (a.module_name != b.module_name) return null; // can't compose operations from different modules
	return exports.run_op_func(a, "compose", b);
}

exports.rebase = function(a, b) {
	/* Rebases b against a. If a and be are simultaneous operations, returns a
       new operation that can be composed with a to yield the logical composition
       of a and b. Or returns null indicating a conflict. The order (a, b) is
       to signify the order the caller wants to compose the operations in.
       
       The rebase operation's contract has two parts:
         1) compose(a, rebase(a, b)) == compose(b, rebase(b, a)).
         2) If a = compose(a1, a2), then
            rebase(a, b) == rebase(a2, rebase(a1, b))
            
       This method can be called on operations in any library. It will load the
       library's rebase function.
       */

	if (a.type == "no-op") return b; // rebasing against no-op leaves operation unchanged
	if (b.type == "no-op") return b; // rebasing a no-op is still a no-op
	if (a.module_name != b.module_name) return null; // can't rebase operations from different modules
	return exports.run_op_func(a, "rebase", b);
}

exports.normalize_array = function(ops) {
	/* Takes an array of operations and composes consecutive operations where possible,
	   removes no-ops, and returns a new array of operations. */
	var new_ops = [];
	for (var i = 0; i < ops.length; i++) {
		if (ops[i].type == "no-op") continue; // don't put no-ops into the new list
		if (new_ops.length == 0) {
			new_ops.push(ops[i]); // first operation
		} else {
			// try to compose with the previous op
			var c = exports.compose(new_ops[new_ops.length-1], ops[i]);
			if (c) {
				if (c.type == "no-op")
					new_ops.pop(); // they obliterated each other, so remove the one that we already added
				else
					new_ops[new_ops.length-1] = c; // replace with composition
			} else {
				new_ops.push(ops[i]);
			}
		}
	}
	return new_ops;
}

exports.apply_array = function(ops, document) {
	/* Takes an array of operations and applies them successively to a document.
	   This basically treats the array as the composition of all of the array
	   elements. */
	for (var i = 0; i < ops.length; i++)
		document = exports.apply(ops[i], document);
	return document;
}

exports.invert_array = function(ops) {
	/* Takes an array of operations and returns the inverse of the whole array,
	   i.e. the inverse of each operation in reverse order. */
	var new_ops = [];
	for (var i = ops.length-1; i >= 0; i--)
		new_ops.push(exports.invert(ops[i]));
	return new_ops;
}
		
exports.rebase_array = function(base, ops) {
	/* Takes an array of operations ops and rebases them against operation base.
	   Base may be an array of operations or just a single operation.
	   Returns an array of operations.*/
	   
	/*
	* To see the logic, it will help to put this in a symbolic form.
	*
	*   Let a + b == compose(a, b)
	*   and a / b == rebase(b, a)
	*
	* The contract of rebase has two parts;
	*
	* 	1) a + (b/a) == b + (a/b)
	* 	2) x/(a + b) == (x/a)/b
	*
	* Also note that the compose operator is associative, so
	*
	*	a + (b+c) == (a+b) + c
	*
	* Our return value here in symbolic form is:
	*
	*   (op1/base) + (op2/(base/op1))
	*   where ops = op1 + op2
	*
	* To see that we've implemented rebase correctly, let's look
	* at what happens when we compose our result with base as per
	* the rebase rule:
	*
	*   base + (ops/base)
	*
	* And then do some algebraic manipulations:
	*
	*   base + [ (op1/base) + (op2/(base/op1)) ]   (substituting our hypothesis for self/base)
	*   [ base + (op1/base) ] + (op2/(base/op1))   (associativity)
	*   [ op1 + (base/op1) ] + (op2/(base/op1))    (rebase's contract on the left side)
	*   op1 + [ (base/op1)  + (op2/(base/op1)) ]   (associativity)
	*   op1 + [ op2 + ((base/op1)/op2) ]           (rebase's contract on the right side)
	*   (op1 + op2) + ((base/op1)/op2)             (associativity)
	*   self + [(base/op1)/op2]                    (substituting self for (op1+op2))
	*   self + [base/(op1+op2)]                    (rebase's second contract)
	*   self + (base/self)                         (substitution)
	*
	* Thus we've proved that the rebase contract holds for our return value.
	*/
	
	ops = exports.normalize_array(ops);

	if (ops.length == 0) return ops; // basically a no-op
	
	if (base instanceof Array) {
		// from the second part of the rebase contract
		for (var i = 0; i < base.length; i++) {
			ops = exports.rebase_array(base[i], ops);
			if (!ops) return null;
		}
		return ops;
		
	} else {
		// handle edge case
		if (ops.length == 1) {
			var op = exports.rebase(base, ops[0]);
			if (!op) return null; // conflict
			return [op];
		}
		
		var op1 = ops[0];
		var op2 = ops.slice(1); // remaining operations
		
		var r1 = exports.rebase(base, op1);
		if (!r1) return null; // rebase failed
		
		var r2 = exports.rebase(op1, base);
		if (!r2) return null; // rebase failed (must be the same as r1, so this test should never succeed)
		
		var r3 = exports.rebase_array(r2, op2);
		if (!r3) return null; // rebase failed
		
		// returns a new array
		return [r1].concat(r3);
	}
}



return module;}( {} ));

jot_modules['values.js'] =  (function(module) {
module.exports = { };
var exports = module.exports;
var __dirname = 'jot';
/*  An operational transformation library for atomic values. This
	library provides two operations: replace and map. These
	functions are generic over various sorts of data types.
	
	REP(old_value, new_value[, global_order])
	
	The atomic replacement of one value with another. Works for
	any data type.
	
	global_order is optional. When supplied and when guaranteed
	to be unique, creates a conflict-less replace operation by
	favoring the operation with the higher global_order value.
	
	The replace operation has the following internal form:
	
	{
	 module_name: "values.js",
	 type: "rep",
	 old_value: ...a value...,
	 new_value: ...a value...,
	 global_order: ...a value...,
	}
	
	MAP(operator, value)
	
	Applies a commutative, invertable function to a value. The supported
	operators are:
	
	on numbers:
	
	"add": addition by a number (use a negative number to decrement)
	
	"mult": multiplication by a number (use the reciprocal to divide)
	
	"rot": addition by a number followed by modulus (the value is
	       given as a list of the increment and the modulus). The document
	       object must be non-negative and less than the modulus.
	
	on boolean values:
	
	"xor": exclusive-or (really only useful with 'true' which makes
	this a bit-flipper; 'false' is a no-op)
	
	Note that by commutative we mean that the operation is commutative
	under the composition transform, i.e. add(1)+add(2) == add(2)+add(1).
	
	(You might think the union and relative-complement set operators
	would work here, but relative-complement does not have a right-
	inverse. That is, relcomp composed with union may not be a no-op
	because the union may add keys not found in the original.)
	
	The map operation has the following internal form:
	
	{
	 module_name: "values.js",
	 type: "map",
	 operator: "add" | "mult" | "rot" | "xor"
	 value: ...a value...,
	}
	
	*/
	
var deepEqual = require("deep-equal");

// constructors

exports.NO_OP = function() {
	return { "type": "no-op" }; // no module_name is required on no-ops
}

exports.REP = function (old_value, new_value, global_order) {
	return { // don't simplify here -- breaks tests
		module_name: "values.js",
		type: "rep",
		old_value: old_value,
		new_value: new_value,
		global_order: global_order || null
	};
}

exports.MAP = function (operator, value) {
	return { // don't simplify here -- breaks tests
		module_name: "values.js",
		type: "map",
		operator: operator,
		value: value
	};
}

// operations

exports.apply = function (op, value) {
	/* Applies the operation to a value. */
		
	if (op.type == "no-op")
		return value;

	if (op.type == "rep")
		return op.new_value;
	
	if (op.type == "map" && op.operator == "add")
		return value + op.value;

	if (op.type == "map" && op.operator == "rot")
		return (value + op.value[0]) % op.value[1];
	
	if (op.type == "map" && op.operator == "mult")
		return value * op.value;
	
	if (op.type == "map" && op.operator == "xor")
		return value ^ op.value;
}

exports.simplify = function (op) {
	/* Returns a new atomic operation that is a simpler version
		of another operation. For instance, simplify on a replace
		operation that replaces one value with the same value
		returns a no-op operation. If there's no simpler operation,
		returns the op unchanged. */
		
	if (op.type == "rep" && deepEqual(op.old_value, op.new_value))
		return exports.NO_OP();
	
	if (op.type == "map" && op.operator == "add" && op.value == 0)
		return exports.NO_OP();
	
	if (op.type == "map" && op.operator == "rot" && op.value[0] == 0)
		return exports.NO_OP();

	if (op.type == "map" && op.operator == "rot")
		// ensure the first value is less than the modulus
		return exports.MAP("rot", [op.value[0] % op.value[1], op.value[1]]);
	
	if (op.type == "map" && op.operator == "mult" && op.value == 1)
		return exports.NO_OP();
	
	if (op.type == "map" && op.operator == "xor" && op.value == false)
		return exports.NO_OP();
	
	if (op.type == "map" && op.operator == "xor" && op.value == false)
		return exports.NO_OP();
	
	return op; // no simplification is possible
}

exports.invert = function (op) {
	/* Returns a new atomic operation that is the inverse of op */
		
	if (op.type == "no-op")
		return op;

	if (op.type == "rep")
		return exports.REP(op.new_value, op.old_value, op.global_order);
	
	if (op.type == "map" && op.operator == "add")
		return exports.MAP("add", -op.value);

	if (op.type == "map" && op.operator == "rot")
		return exports.MAP("rot", [-op.value[0], op.value[1]]);
	
	if (op.type == "map" && op.operator == "mult")
		return exports.MAP("mult", 1.0/op.value);
	
	if (op.type == "map" && op.operator == "xor")
		return op; // it's its own inverse
}

exports.compose = function (a, b) {
	/* Creates a new atomic operation that combines the operations a
		and b, if an atomic operation is possible, otherwise returns
		null. */

	a = exports.simplify(a);
	b = exports.simplify(b);
	
	if (a.type == "no-op")
		return b;

	if (b.type == "no-op")
		return a;

	if (a.type == "rep" && b.type == "rep" && a.global_order == b.global_order)
		return exports.simplify(exports.REP(a.old_value, b.new_value, a.global_order));
	
	if (a.type == "map" && b.type == "map" && a.operator == b.operator && a.operator == "add")
		return exports.simplify(exports.MAP("add", a.value + b.value));

	if (a.type == "map" && b.type == "map" && a.operator == b.operator && a.operator == "rot" && a.value[1] == b.value[1])
		return exports.simplify(exports.MAP("rot", [a.value[0] + b.value[0], a.value[1]]));

	if (a.type == "map" && b.type == "map" && a.operator == b.operator && a.operator == "mult")
		return exports.simplify(exports.MAP("mult", a.value * b.value));

	if (a.type == "map" && b.type == "map" && a.operator == b.operator && a.operator == "xor") {
		if (a.value == false && b.value == false)
			return exports.NO_OP();
		if (a.value == true && b.value == true)
			return exports.NO_OP();
		if (a.value == true)
			return a;
		if (b.value == true)
			return b;
	}
		
	return null; // no composition is possible
}
	
exports.rebase = function (a, b) {
	/* Transforms b, an operation that was applied simultaneously as a,
		so that it can be composed with a. rebase(a, b) == rebase(b, a). */

	a = exports.simplify(a);
	b = exports.simplify(b);

	if (a.type == "no-op")
		return b;

	if (b.type == "no-op")
		return b;

	if (a.type == "rep" && b.type == "rep") {
		if (deepEqual(a.new_value, b.new_value))
			return exports.NO_OP();
		
		if (b.global_order > a.global_order)
			// clobber a's operation
			return exports.simplify(exports.REP(a.new_value, b.new_value, b.global_order));
			
		if (b.global_order < a.global_order)
			return exports.NO_OP(); // this replacement gets clobbered
		
		// If their global_order is the same (e.g. null and null), then
		// this results in a conflict error (thrown below).
	}
	
	// Since the map operators are commutative, it doesn't matter which order
	// they are applied in. That makes the rebase trivial.
	if (a.type == "map" && b.type == "map" && a.operator == b.operator) {
		if (a.operator == "rot" && a.value[1] != b.value[1]) return null; // rot must have same modulus
		return b;
	}
		
	// Return null indicating this is an unresolvable conflict.
	return null;
}

return module;}( {} ));

jot_modules['sequences.js'] =  (function(module) {
module.exports = { };
var exports = module.exports;
var __dirname = 'jot';
/* An operational transformation library for sequence-like objects,
   including strings and arrays.
   
   Three operations are provided:
   
   SPLICE(pos, old_value, new_value[, global_order])

    Replaces values in the sequence. Replace nothing with
    something to insert, or replace something with nothing to
    delete. pos is zero-based.
    
    Shortcuts are provided:
    
    INS(pos, new_value[, global_order])
    
       (Equivalent to SPLICE(pos, [], new_value, global_order)
       for arrays or SPLICE(pos, "", new_value, global_order)
       for strings.)
       
    DEL(pos, old_value[, global_order])
    
       (Equivalent to SPLICE(pos, old_value, [], global_order)
       for arrays or SPLICE(pos, old_value, "", global_order)
       for strings.)

	The SPLICE operation has the following internal form:
	
	{
	 module_name: "sequences.js",
	 type: "splice",
	 pos: ...an index...
	 old_value: ...a value...,
	 new_value: ...a value...,
	 global_order: ...a value...,
	}

   MOVE(pos, count, new_pos)

    Moves the subsequence starting at pos and count items long
    to a new location starting at index new_pos.  pos is zero-based.

	The MOVE operation has the following internal form:
	
	{
	 module_name: "sequences.js",
	 type: "move",
	 pos: ...an index...,
	 count: ...a length...,
	 new_pos: ...a new index...,
	}
   
   APPLY(pos, operation)

    Applies another sort of operation to a single element. For
    arrays only. Use any of the operations in values.js on an
    element. Or if the element is an array or object, use the
    operators in this module or the objects.js module, respectively.
    pos is zero-based.

    Example:
    
    To replace an element at index 2 with a new value:
    
      APPLY(2, values.REP("old_value", "new_value"))
      
	The APPLY operation has the following internal form:
	
	{
	 module_name: "sequences.js",
	 type: "apply",
	 pos: ...an index...,
	 op: ...an operation from another module...,
	}
	
   */
   
var jot_platform = require(__dirname + "/platform.js");
var deepEqual = require("deep-equal");

// constructors

exports.NO_OP = function() {
	return { "type": "no-op" }; // module_name is not required on no-ops
}

exports.SPLICE = function (pos, old_value, new_value, global_order) {
	return { // don't simplify here -- breaks tests
		module_name: "sequences.js",
		type: "splice",
		pos: pos,
		old_value: old_value,
		new_value: new_value,
		global_order: global_order || null
	};
}

exports.INS = function (pos, value, global_order) {
	// value.slice(0,0) is a shorthand for constructing an empty string or empty list, generically
	return exports.SPLICE(pos, value.slice(0,0), value, global_order);
}

exports.DEL = function (pos, old_value, global_order) {
	// value.slice(0,0) is a shorthand for constructing an empty string or empty list, generically
	return exports.SPLICE(pos, old_value, old_value.slice(0,0), global_order);
}

exports.MOVE = function (pos, count, new_pos) {
	return { // don't simplify here -- breaks tests
		module_name: "sequences.js",
		type: "move",
		pos: pos,
		count: count,
		new_pos: new_pos
	};
}

exports.APPLY = function (pos, op) {
	if (op.type == "no-op") return op; // don't embed because it never knows its package name
	return { // don't simplify here -- breaks tests
		module_name: "sequences.js",
		type: "apply",
		pos: pos,
		op: op
	};
}

// utilities

function concat2(item1, item2) {
	if (item1 instanceof String)
		return item1 + item2;
	return item1.concat(item2);
}
function concat3(item1, item2, item3) {
	if (item1 instanceof String)
		return item1 + item2 + item3;
	return item1.concat(item2).concat(item3);
}
function concat4(item1, item2, item3, item4) {
	if (item1 instanceof String)
		return item1 + item2 + item3 + item4;
	return item1.concat(item2).concat(item3).concat(item4);
}

// operations

exports.apply = function (op, value) {
	/* Applies the operation to a value. */
		
	if (op.type == "no-op")
		return value;

	if (op.type == "splice") {
		return concat3(value.slice(0, op.pos), op.new_value, value.slice(op.pos+op.old_value.length));
	}

	if (op.type == "move") {
		if (op.pos < op.new_pos)
			return concat3(value.slice(0, op.pos), value.slice(op.pos+op.count, op.new_pos), value.slice(op.pos, op.pos+op.count) + value.slice(op.new_pos));
		else
			return concat3(value.slice(0, op.new_pos), value.slice(op.pos, op.pos+op.count), value.slice(op.new_pos, op.pos), value.slice(op.pos+op.count));
	}
	
	if (op.type == "apply") {
		// modifies value in-place
		var lib = jot_platform.load_module(op.op.module_name);
		value[op.pos] = lib.apply(op.op, value[op.pos]);
		return value;
	}
}

exports.simplify = function (op) {
	/* Returns a new atomic operation that is a simpler version
		of another operation. For instance, simplify on a replace
		operation that replaces one value with the same value
		returns a no-op operation. If there's no simpler operation,
		returns the op unchanged. */
		
	if (op.type == "splice" && deepEqual(op.old_value, op.new_value))
		return exports.NO_OP();
	
	if (op.type == "move" && op.pos == op.new_pos)
		return exports.NO_OP();
	
	if (op.type == "apply") {
		var lib = jot_platform.load_module(op.op.module_name);
		var op2 = lib.simplify(op.op);
		if (op2.type == "no-op")
			return exports.NO_OP();
	}
	
	return op; // no simplification is possible
}

exports.invert = function (op) {
	/* Returns a new atomic operation that is the inverse of op */
		
	if (op.type == "splice")
		return exports.SPLICE(op.pos, op.new_value, op.old_value, op.global_order);
	
	if (op.type == "move" && op.new_pos > op.pos)
		return exports.MOVE(op.new_pos - op.count, op.count, op.pos);
	if (op.type == "move")
		return exports.MOVE(op.new_pos, op.count, op.pos + op.count);

	if (op.type == "apply") {
		var lib = jot_platform.load_module(op.op.module_name);
		return exports.APPLY(op.pos, lib.invert(op.op));
	}
}

exports.compose = function (a, b) {
	/* Creates a new atomic operation that combines the operations a
		and b, if an atomic operation is possible, otherwise returns
		null. */

	a = exports.simplify(a);
	b = exports.simplify(b);

	if (a.type == "no-op")
		return b;

	if (b.type == "no-op")
		return a;

	if (a.type == 'splice' && b.type == 'splice' && a.global_order == b.global_order) {
		if (a.pos <= b.pos && b.pos+b.old_value.length <= a.pos+a.new_value.length) {
			// b replaces some of the values a inserts
			// also takes care of adjacent inserts
			return exports.SPLICE(a.pos,
				a.old_value,
				concat3(
					a.new_value.slice(0, b.pos-a.pos),
					b.new_value,
					a.new_value.slice(a.new_value.length + (b.pos+b.old_value.length)-(a.pos+a.new_value.length))
					) // in the final component, don't use a negative index because it might be zero (which is always treated as positive)
				);
		}
		if (b.pos <= a.pos && a.pos+a.new_value.length <= b.pos+b.old_value.length) {
			// b replaces all of the values a inserts
			// also takes care of adjacent deletes
			return exports.SPLICE(b.pos,
				concat3(
					b.old_value.slice(0, a.pos-b.pos),
					a.old_value,
					b.old_value.slice(b.old_value.length + (a.pos+a.new_value.length)-(b.pos+b.old_value.length))
					),
				b.new_value
				);
		}
		// TODO: a and b partially overlap with each other
	}
	
	if (a.type == "move" && b.type == "move" && a.new_pos == b.pos && a.count == b.count)
		return exports.MOVE(a.pos, b.new_pos, a.count)

	if (a.type == "apply" && b.type == "apply" && a.pos == b.pos && a.op.module_name == b.op.module_name) {
		var lib = jot_platform.load_module(a.op.module_name);
		var op2 = lib.compose(a.op, b.op);
		if (op2)
			return exports.APPLY(a.pos, op2);
	}
	
	return null; // no composition is possible
}
	
exports.rebase = function (a, b) {
	/* Transforms b, an operation that was applied simultaneously as a,
		so that it can be composed with a. rebase(a, b) == rebase(b, a).
		If no rebase is possible (i.e. a conflict) then null is returned.
		Or an array of operations can be returned if the rebase involves
		multiple steps.*/

	a = exports.simplify(a);
	b = exports.simplify(b);
	
	if (a.type == "no-op")
		return b;

	if (b.type == "no-op")
		return b;

	if (a.type == "splice" && b.type == "splice") {
		// Two insertions at the same location.
		if (a.pos == b.pos && a.old_value.length == 0 && b.old_value.length == 0) {
			// insert to the left
			if (b.global_order < a.global_order)
				return b;
			
			// insert to the right
			if (b.global_order > a.global_order)
				return exports.SPLICE(b.pos+a.new_value.length, b.old_value, b.new_value, b.global_order);
		}

		// b takes place before the range that a affects
		if (b.pos + b.old_value.length <= a.pos)
			return b;
		
		// b takes place after the range that a affects
		if (b.pos >= a.pos + a.old_value.length)
			return exports.SPLICE(b.pos+(a.new_value.length-a.old_value.length), b.old_value, b.new_value, b.global_order);
		
		if (a.pos <= b.pos && b.pos+b.old_value.length <= a.pos+a.old_value.length && b.global_order < a.global_order) {
			// b's replacement is entirely within a's replacement, and a takes precedence
			return exports.NO_OP()
		}
		if (b.pos <= a.pos && a.pos+a.new_value.length <= b.pos+b.old_value.length && b.global_order > a.global_order) {
			// b replaces more than a and b takes precedence; fix b so that it's old value is correct
			return exports.SPLICE(b.pos,
				concat3(
					b.old_value.slice(0, a.pos-b.pos),
					a.new_value,
					b.old_value.slice((a.pos+a.old_value.length)-(b.pos+b.old_value.length))
					),
				b.new_value
				);
		}
	}
	
	function map_index(pos) {
		if (pos >= a.pos && pos < a.pos+a.count) return (pos-a.pos) + a.new_pos; // within the move
		if (pos < a.pos && pos < a.new_pos) return pos; // before the move
		if (pos < a.pos) return pos + a.count; // a moved around by from right to left
		if (pos > a.pos && pos >= a.new_pos) return pos; // after the move
		if (pos > a.pos) return pos - a.count; // a moved around by from left to right
		return null; // ???
	}

	if (a.type == "move" && b.type == "move") {
		// moves intersect
		if (b.pos+b.count >= a.pos && b.pos < a.pos+a.count)
			return null;
		return exports.MOVE(map_index(b.pos), b.count, map_index(b.new_pos));
	}

	if (a.type == "apply" && b.type == "apply") {
		if (a.pos != b.pos)
			return b;
			
		if (a.op.module_name == b.op.module_name) {
			var lib = jot_platform.load_module(a.op.module_name);
			var op2 = lib.rebase(a.op, b.op);
			if (op2)
				return exports.APPLY(b.pos, op2);
		}
	}
	
	if (a.type == "splice" && b.type == "move") {
		// operations intersect
		if (b.pos+b.count >= a.pos && b.pos < a.pos+a.old_value.length)
			return null;
		if (b.pos < a.pos && b.new_pos < a.pos)
			return b; // not affected
		if (b.pos < a.pos && b.new_pos > a.pos)
			return exports.MOVE(b.pos, b.count, b.new_pos + (a.new_value.length-a.old_value.length));
		if (b.pos > a.pos && b.new_pos > a.pos)
			return exports.MOVE(b.pos + (a.new_value.length-a.old_value.length), b.count, b.new_pos + (a.new_value.length-a.old_value.length));
		if (b.pos > a.pos && b.new_pos < a.pos)
			return exports.MOVE(b.pos + (a.new_value.length-a.old_value.length), b.count, b.new_pos);
	}
	
	if (a.type == "splice" && b.type == "apply") {
		// operations intersect
		if (b.pos >= a.pos && b.pos < a.pos+a.old_value.length)
			return null;
		if (b.pos < a.pos)
			return b;
		return exports.APPLY(b.pos + (a.new_value.length-a.old_value.length), b.op);
	}
	
	if (a.type == "move" && b.type == "splice") {
		// operations intersect
		if (b.pos+b.old_value.length >= a.pos && b.pos < a.pos+a.count)
			return null;
		return exports.SPLICE(map_index(b.pos), b.old_value, b.new_value, b.global_index);
	}
	
	if (a.type == "move" && b.type == "apply")
		return exports.APPLY(map_index(b.pos), b.op);
	
	if (a.type == "apply" && b.type == "splice") {
		// operations intersect
		if (a.pos >= b.pos && a.pos < b.pos+b.old_value.length)
			return null;
		return b; // otherwise, no impact
	}

	if (a.type == "apply" && b.type == "move") {
		return b; // no impact
	}
	
	// Return null indicating this is an unresolvable conflict.
	return null;
}

// Use google-diff-match-patch to convert a string REP to a list of insertions
// and deletions.

exports.from_string_rep = function(rep_op, global_order) {
	// Do a diff, which results in an array of operations of the form
	//  (op_type, op_data)
	// where
	//  op_type ==  0 => text same on both sides
	//  op_type == -1 => text deleted (op_data is deleted text)
	//  op_type == +1 => text inserted (op_data is inserted text)
	var diff_match_patch = require('googlediff');
	var base = require(__dirname + "/base.js");
	var dmp = new diff_match_patch();
	var d = dmp.diff_main(rep_op.old_value, rep_op.new_value);
	var ret = [];
	var pos = 0;
	for (var i = 0; i < d.length; i++) {
		if (d[i][0] == 0) {
			pos += d[i][1].length;
		} else if (d[i][0] == -1) {
			ret.push(exports.DEL(pos, d[i][1], global_order));
			// don't increment pos because next operation sees the string with this part deleted
		} else if (d[i][0] == 1) {
			ret.push(exports.INS(pos, d[i][1], global_order));
			pos += d[i][1].length;
		}
	}
	return base.normalize_array(ret);
}

return module;}( {} ));

jot_modules['objects.js'] =  (function(module) {
module.exports = { };
var exports = module.exports;
var __dirname = 'jot';
/* An operational transformation library for objects
   (associative arrays).
   
   Two operations are provided:
   
   PROP(old_key, new_key, old_value, new_value)

    Creates, deletes, or renames a property.

    Shortcuts are provided:
    
    PUT(key, value)
    
      (Equivalent to PROP(null, key, null, value).)

    DEL(key, old_value)
    
      (Equivalent to PROP(key, null, old_value, null).)

    REN(old_key, new_key)
    
      (Equivalent to PROP(old_key, new_key, null, null).)
      
    It is not possible to rename a key and change its value
    in the same operation, or to change a value on an existing
    key.
      
	The PROP operation has the following internal form:
	
	{
	 module_name: "objects.js",
	 type: "prop",
	 old_key: ...a key name, or null to create a key...,
	 new_key: ...a new key name, or null to delete a key...,
	 old_value: ...the existing value of the key; null when creating or renaming a key...,
	 new_value: ...the new value for the key; null when deleting or renaming a key...,
	}
   
   APPLY(key, operation)

    Applies another sort of operation to a property's value. Use any
    operation defined in any of the modules depending on the data type
    of the property. For instance, the operations in values.js can be
    applied to any property. The operations in sequences.js can be used
    if the property's value is a string or array. And the operations in
    this module can be used if the value is another object.
    
    Example:
    
    To replace the value of a property with a new value:
    
      APPLY("key1", values.REP("old_value", "new_value"))
      
    You can also use the 'access' helper method to construct recursive
    APPLY operations:
    
      access(["key1", subkey1"], values.REP("old_value", "new_value"))
      or
      access(["key1", subkey1"], "values.js", "REP", "old_value", "new_value")
      
      is equivalent to
      
      APPLY("key1", APPLY("subkey1", values.REP("old_value", "new_value")))

	The APPLY operation has the following internal form:

	{
	 module_name: "objects.js",
	 type: "apply",
	 key: ...a key name...,
	 op: ...operation from another module...,
	}
	
   */
   
var jot_platform = require(__dirname + "/platform.js");
var deepEqual = require("deep-equal");

// constructors

exports.NO_OP = function() {
	return { "type": "no-op" }; // module_name is not required on no-ops
}

exports.PROP = function (old_key, new_key, old_value, new_value) {
	if (old_key == new_key && old_ney != null && old_value != new_value) throw "invalid arguments";
	return {
		module_name: "objects.js",
		type: "prop",
		old_key: old_key,
		new_key: new_key,
		old_value: old_value,
		new_value: new_value
	};
}

exports.PUT = function (key, value) {
	return exports.PROP(null, key, null, value);
}

exports.DEL = function (key, old_value) {
	return exports.PROP(key, null, old_value, null);
}

exports.REN = function (old_key, new_key) {
	return exports.PROP(old_key, new_key, null, null);
}

exports.APPLY = function (key, op) {
	if (op.type == "no-op") return op; // don't embed because it never knows its package name
	return { // don't simplify here -- breaks tests
		module_name: "objects.js",
		type: "apply",
		key: key,
		op: op
	};
}

exports.access = function(path, module_name, op_name /*, op_args */) {
	// also takes an op directly passed as the second argument
	var op;
	if (module_name instanceof Object) {
		op = module_name;
	} else {
		var op_args = [];
		for (var i = 3; i < arguments.length; i++)
			op_args.push(arguments[i]);
		
		var lib = jot_platform.load_module(module_name);
		op = lib[op_name].apply(null, op_args);
	}
	
	var seqs = jot_platform.load_module('sequences.js');
	for (var i = path.length-1; i >= 0; i--) {
		if (typeof path[i] == 'string') {
			op = exports.APPLY(path[i], op);
		} else {
			op = seqs.APPLY(path[i], op);
		}
	}
	return op;
}

// operations

exports.apply = function (op, value) {
	/* Applies the operation to a value. */
		
	if (op.type == "no-op")
		return value;

	if (op.type == "prop") {
		if (op.old_key == null)
			value[op.new_key] = op.new_value;
		else if (op.new_key == null)
			delete value[op.old_key];
		else {
			var v = value[op.old_key];
			delete value[op.old_key];
			value[op.new_key] = v;
		}
		return value;
	}
	
	if (op.type == "apply") {
		// modifies value in-place
		var lib = jot_platform.load_module(op.op.module_name);
		value[op.key] = lib.apply(op.op, value[op.key]);
		return value;
	}
}

exports.simplify = function (op) {
	/* Returns a new atomic operation that is a simpler version
		of another operation. For instance, simplify on a replace
		operation that replaces one value with the same value
		returns a no-op operation. If there's no simpler operation,
		returns the op unchanged. */
		
	if (op.type == "prop" && op.old_key == op.new_key && deepEqual(op.old_value, op.new_value))
		return exports.NO_OP();
		
	if (op.type == "apply") {
		var lib = jot_platform.load_module(op.op.module_name);
		var op2 = lib.simplify(op.op);
		if (op2.type == "no-op")
			return exports.NO_OP();
	}
	
	return op; // no simplification is possible
}

exports.invert = function (op) {
	/* Returns a new atomic operation that is the inverse of op */
		
	if (op.type == "prop")
		return exports.PROP(op.new_key, op.old_key, op.new_value, op.old_value);
	
	if (op.type == "apply") {
		var lib = jot_platform.load_module(op.op.module_name);
		return exports.APPLY(op.key, lib.invert(op.op));
	}
}

exports.compose = function (a, b) {
	/* Creates a new atomic operation that combines the operations a
		and b, if an atomic operation is possible, otherwise returns
		null. */

	a = exports.simplify(a);
	b = exports.simplify(b);

	if (a.type == "no-op")
		return b;

	if (b.type == "no-op")
		return a;
	
	if (a.type == "prop" && b.type == "prop" && a.new_key == b.old_key) {
		if (a.old_key == b.new_key && deepEqual(a.old_value, b.new_value))
			return exports.NO_OP()
		if (a.old_key != b.new_key && !deepEqual(a.old_value, b.new_value))
			return null; // prevent a rename and a change in value in the same operation
		return exports.PROP(a.old_key, b.new_key, a.old_value, b.new_value);
	}
		
	if (a.type == "apply" && b.type == "apply" && a.key == b.key && a.op.module_name == b.op.module_name) {
		var lib = jot_platform.load_module(a.op.module_name);
		var op2 = lib.compose(a.op, b.op);
		if (op2)
			return exports.APPLY(a.key, op2);
	}
	
	return null; // no composition is possible
}
	
exports.rebase = function (a, b) {
	/* Transforms b, an operation that was applied simultaneously as a,
		so that it can be composed with a. rebase(a, b) == rebase(b, a).
		If no rebase is possible (i.e. a conflict) then null is returned.
		Or an array of operations can be returned if the rebase involves
		multiple steps.*/

	a = exports.simplify(a);
	b = exports.simplify(b);
	
	if (a.type == "no-op")
		return b;

	if (b.type == "no-op")
		return b;
	
	if (a.type == "prop" && b.type == "prop") {
		if (a.old_key == b.old_key && a.new_key == b.new_key) {
			// both deleted, or both changed the value to the same thing, or both inserted the same thing
			if (deepEqual(a.new_value, b.new_value))
				return exports.NO_OP();
			
			// values were changed differently
			else
				return null;
		}
		
		// rename to different things (conflict)
		if (a.old_key == b.old_key && a.new_key != b.new_key && a.old_key != null)
			return null;

		// rename different things to the same key (conflict)
		if (a.old_key != b.old_key && a.new_key == b.new_key && a.new_key != null)
			return null;
		
		// otherwise, the keys are not related so b isn't changed
		return b;
	}
	
	if (a.type == "apply" && b.type == "apply" && a.op.module_name == b.op.module_name) {
		var lib = jot_platform.load_module(a.op.module_name);
		var op2 = lib.rebase(a.op, b.op);
		if (op2)
			return exports.APPLY(a.key, op2);
	}

	if (a.type == "prop" && b.type == "apply") {
		// a operated on some other key that doesn't affect b
		if (a.old_key != b.key)
			return b;
		
		// a renamed the key b was working on, so revise b to use the new name
		if (a.old_key != a.new_key)
			return exports.APPLY(a.new_key, b.op);
	}
	
	if (a.type == "apply" && b.type == "prop") {
		// a modified a different key than prop, so b is unaffected
		if (a.key != b.old_key)
			return b;
		
		// b renamed the key, so continue to apply the rename after a
		if (b.old_key != b.new_key)
			return b
	}
	
	// Return null indicating this is an unresolvable conflict.
	return null;
}

return module;}( {} ));

jot_modules['collab.js'] =  (function(module) {
module.exports = { };
var exports = module.exports;
var __dirname = 'jot';
var ot = require(__dirname + "/base.js");

exports.TwoWayCollaboration = function(document_updater, the_wire, asymmetric, id) {
	/* The TwoWayCollaboration class is a shared state between you and another editor.
	It runs synchronously with your local changes but asynchronously with remote changes.
	
	What synchronously means here is that when the local user makes a
	change to the document, local_revision() must be called with that operation
	(or an array of operations) before any further calls to process_remote_message().
	
	document_updater is a method  which takes an array of operation objects and
	a dict of metadata as its argument, and it is responsible for
	updating the local document with changes from the remote end.
	
	the_wire is an method responsible for putting messages
	on the wire to the remote user. It accepts any object to be sent over the wire."""
	*/
	
	this.id = id || "";
	this.document_updater = document_updater;
	this.to_the_wire = the_wire;
	this.asymmetric = asymmetric || false;
		
	this.our_hist_start = 0;
	this.our_history = [];
	this.rolled_back = 0;
	
	this.remote_hist_start = 0;
	this.remote_history = [];
	this.needs_ack = 0; // 0=do nothing, 1=send no-op, 2=send ping
	
	// symmetric mode
	this.remote_conflict_pending_undo = false;
	
	// asymmetric mode
	this.remote_conflicted_operations = [];
	
	// public methods

	this.local_revision = function(operation, operation_metadata) {
		/* The user calls this to indicate they made a local change to
		   the document. */
		
		if (operation instanceof Array)
			this.our_history = this.our_history.concat(operation);
		else
			this.our_history.push(operation);
		
		if (!operation_metadata) operation_metadata = { };
		if (!("type" in operation_metadata)) operation_metadata["type"] = "normal";
		
		this.to_the_wire({
			base_rev: this.remote_hist_start + this.remote_history.length - 1,
			op: operation,
			metadata: operation_metadata});
		this.needs_ack = 0;
		
		this.log_queue_sizes();		
	}
	
	this.send_ping = function(as_no_op) {
		if (this.needs_ack == 1) {
			this.local_revision({ type: "no-op" });
		} else if (this.needs_ack == 2) {
			this.to_the_wire({
				base_rev: this.remote_hist_start + this.remote_history.length - 1,
				op: "PING"
			});
			this.needs_ack = 0;
		}
	};
	
	this.process_remote_message = function(msg) {
		/* The user calls this when they receive a message over the wire. */
		return this.remote_revision(msg.base_rev, msg.op, msg.metadata);
	}
		
	this.remote_revision = function(base_revision, operation, operation_metadata) {
		/*
		 * Our remote collaborator sends us an operation and the
		 * number of the last operation they received from us.

		 * Imaging this scenario:
		 *
		 * remote: X -> A -> B 
		 * local:  X -> Y -> A -> Z [ -> B]
		 *
		 * X is a base revision (say, zero). We've already received
		 * A, and the remote end is now sending us B. But they haven't
		 * yet applied our local changes Y or Z. (Y and Z are applied
		 * locally and are on the wire.)
		 *
		 * In remote_history, we track the remote revisions that we've
		 * already applied to our tree (and their corresponding base
		 * revision).
		 *
		 * remote_history = [ (0, A) ]
		 * base_revision = 0
		 * operation = B
		 *
		 * our_history = [ X, Y, Z ]
		 *
		 * To apply B, we rebase it against (Y+Z) rebased against (A).
		 */
		
		// Clear previous entries in remote_history we no longer need.
		while (this.remote_history.length > 0 && this.remote_history[0][0] < base_revision) {
			this.remote_history.shift();
			this.remote_hist_start += 1;
		}

		// Clear previous entries in local_history we no longer need
		// (everything *through* base_revision).
		if (base_revision >= this.our_hist_start) {
			this.our_history = this.our_history.slice(base_revision-this.our_hist_start+1);
			this.rolled_back -= base_revision-this.our_hist_start+1;
			if (this.rolled_back < 0) this.rolled_back = 0;
			this.our_hist_start = base_revision+1;
		}
		
		// This might just be a ping that allows us to clear buffers knowing that the
		// other end has received and applied our base_revision revision.
		if (operation == "PING") {
			this.log_queue_sizes();
			return;
		}
			
		// Get the remote operations we've already applied (the 2nd elements in this.remote_history).
		var remote_ops = [];
		for (var i = 0; i < this.remote_history.length; i++)
			remote_ops.push(this.remote_history[i][1]);
		
		// Get the current operations coming in, appended to any held-back operations from a conflict (asymmetric).
		if (!(operation instanceof Array)) operation = [operation];
		var original_operation = operation;
		operation = this.remote_conflicted_operations.concat(operation);
		operation = ot.normalize_array(operation);
		
		// Rebase against (our recent changes rebased against the remote operations we've already applied).
		var local_ops = ot.normalize_array(this.our_history.slice(this.rolled_back));
		var r1 = ot.rebase_array(remote_ops, local_ops);
		if (r1 == null)
			operation = null; // flag conflict
		else
			operation = ot.rebase_array(r1, operation); // may also be null, returns array
		
		if (operation == null) {
			if (!asymmetric) {
				// Symmetric Mode
				// --------------
				// Both sides will experience a similar conflict. Since each side has
				// committed to the document a different set of changes since the last
				// point the documents were sort of in sync, each side has to roll
				// back their changes independently.
				//
				// Once we've rolled back our_history, there is no need to rebase the incoming
				// remote operation. So we can just continue below. But we'll note that it's
				// a conflict.
				var undo = ot.normalize_array( ot.invert_array(this.our_history.slice(this.rolled_back)) );
				this.rolled_back = this.our_history.length;
				if (undo.length > 0) {
					this.document_updater(undo, { "type": "local-conflict-undo" }); // send to local user
					for (var i = 0; i < undo.length; i++) {
						this.local_revision(undo[i], { "type" : "conflict-undo" }); // send to remote user
						this.rolled_back += 1; // because we just put the undo on the history inside local_revision
					}
				}
				operation_metadata["type"] = "conflicted"; // flag that this is probably going to be reset
				this.remote_conflict_pending_undo = true;
				
				operation = original_operation;
				
			} else {
				// Asymmetric Mode
				// ---------------
				// In asymmetric mode, one side (this side!) is privileged. The other side
				// runs with asymmetric=false, and it will still blow away its own changes
				// and send undo-operations when there is a conflict.
				//
				// The privileged side (this side) will not blow away its own changes. Instead,
				// we wait for the remote end to send enough undo operations so that there's
				// no longer a conflict.
				for (var i = 0; i < original_operation.length; i++)
					this.remote_conflicted_operations.push(original_operation[i]);
				return;
			}
		}
		
		// Apply.
		
		if (operation_metadata["type"] == "conflict-undo")
			this.remote_conflict_pending_undo = false; // reset flag
		else if (operation_metadata["type"] == "normal" && this.remote_conflict_pending_undo)
			// turn "normal" into "conflicted" from the point of first conflict
			// until a conflict-undo is received.
			operation_metadata["type"] = "conflicted";
			
		operation_metadata["type"] = "remote-" + operation_metadata["type"];
				
		// we may get a no-op as a ping, don't pass that along
		operation = ot.normalize_array(operation);
		if (operation.length > 0)
			this.document_updater(operation, operation_metadata);
		
		// Append this operation to the remote_history.
		this.remote_history.push( [base_revision, operation] );
		this.needs_ack = (operation.length > 0 ? 1 : 2); // will send a no-op, unless this operation was a no-op in which case we'll just ping
		
		// Conflict resolved (asymmetric mode).
		this.remote_conflicted_operations = []
		
		this.log_queue_sizes();
	};
	
	this.log_queue_sizes = function() {
		console.log(this.id + " | queue sizes: " + this.our_history.length + "/" + this.remote_history.length);
	};
};

exports.CollaborationServer = function (){
	/* The CollaborationServer class manages a collaboration between two or more
	   remote participants. The server handles all message passing between participants. */
	   
	this.collaborator_count = 0;
	this.collaborators = { };
	this.doc = { };
	this.ack_interval = 3000;
	this.max_ack_time = 6000;
	
	var me = this;
	
	// send no-ops to each collaborator like pings so that buffers can be
	// cleared when everyone gets on the same page.
	function send_acks_around() {
		for (var c in me.collaborators) {
		  var cb = me.collaborators[c].collab;
		  if (cb.needs_ack) {
			  if (cb.last_ack_time >= me.max_ack_time) {
				  cb.send_ping();
				  cb.last_ack_time = 0;
			  } else {
				  cb.last_ack_time += me.ack_interval;
			  }
		  }
		}
	}
	var timerid = setInterval(send_acks_around, this.ack_interval);
	   
	this.destroy = function() {
		clearInterval(timerid); // ?
	}
	
	this.add_collaborator = function(the_wire) {
		// Registers a new collaborator who can be sent messages through
		// the_wire(msg). Returns an object with properties id and document
		// which holds the current document state.
		
		var id = this.collaborator_count;
		this.collaborator_count += 1;
		console.log("collaborator " + id + " added.");
		
		function doc_updatr(op, op_metadata) {
		   me.document_updated(id, op, op_metadata);
		}
		
		this.collaborators[id] = {
		   // create an asynchronous collaborator
		   collab: new exports.TwoWayCollaboration(doc_updatr, the_wire, true, "c:"+id)
		};
		
		this.collaborators[id].collab.last_ack_time = 0;
		
		return {
		   id: id,
		   document: this.doc
		};
	};
	
	this.remove_collaborator = function(id) {
		console.log("collaborator " + id + " removed.");
		delete this.collaborators[id];
	};
	
	this.process_remote_message = function(id, msg) {
		// We've received a message from a particular collaborator. Pass the message
		// to the TwoWayCollaboration instance, which in turn will lead to
		// document_updated being called.
		this.collaborators[id].collab.process_remote_message(msg);
	};
	
	this.document_updated = function(collaborator_id, operation, operation_metadata) {
		// Apply the operation to our local copy of the document.
		if (!(operation instanceof Array)) operation = [operation];
		ot.apply_array(operation, this.doc);
		
		// Send the operation to every other collaborator.
		for (var c in this.collaborators) {
			if (c != collaborator_id) {
				this.collaborators[c].collab.local_revision(operation, operation_metadata);
				this.collaborators[c].collab.last_ack_time = 0;
			}
		}
	};
	
	this.start_socketio_server = function(port, with_examples) {
		var me = this;
		
		var app = require('http').createServer(handler);
		var io = require('socket.io').listen(app, { log: false });
		
		app.listen(port);
		
		function handler (req, res) {
		  if (with_examples) {
		  	  var cs = require("connect").static(with_examples, {});
		  	  return cs(req, res, function () { res.end(); });
		  }
		  
		  res.writeHead(403);
		  res.end("Nothing here but a socket.io server.");
		}

		//var io = require('socket.io').listen(port);
		
		io.sockets.on('connection', function (socket) {
			var collab_info = me.add_collaborator(function(msg) { socket.emit("op", msg); });

			socket.emit("doc", collab_info.document); // send current state
			
			socket.on("op", function(msg) {
				// message received from client
				me.process_remote_message(collab_info.id, msg);
			});
			socket.on("disconnect", function() {
				me.remove_collaborator(collab_info.id);
			});
		});   	   
	};
};

return module;}( {} ));

/**
 * Diff Match and Patch
 *
 * Copyright 2006 Google Inc.
 * http://code.google.com/p/google-diff-match-patch/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Computes the difference between two texts to create a patch.
 * Applies the patch onto another text, allowing for errors.
 * @author fraser@google.com (Neil Fraser)
 */

/**
 * Class containing the diff, match and patch methods.
 * @constructor
 */
function diff_match_patch() {

  // Defaults.
  // Redefine these in your program to override the defaults.

  // Number of seconds to map a diff before giving up (0 for infinity).
  this.Diff_Timeout = 1.0;
  // Cost of an empty edit operation in terms of edit characters.
  this.Diff_EditCost = 4;
  // At what point is no match declared (0.0 = perfection, 1.0 = very loose).
  this.Match_Threshold = 0.5;
  // How far to search for a match (0 = exact location, 1000+ = broad match).
  // A match this many characters away from the expected location will add
  // 1.0 to the score (0.0 is a perfect match).
  this.Match_Distance = 1000;
  // When deleting a large block of text (over ~64 characters), how close do
  // the contents have to be to match the expected contents. (0.0 = perfection,
  // 1.0 = very loose).  Note that Match_Threshold controls how closely the
  // end points of a delete need to match.
  this.Patch_DeleteThreshold = 0.5;
  // Chunk size for context length.
  this.Patch_Margin = 4;

  // The number of bits in an int.
  this.Match_MaxBits = 32;
}


//  DIFF FUNCTIONS


/**
 * The data structure representing a diff is an array of tuples:
 * [[DIFF_DELETE, 'Hello'], [DIFF_INSERT, 'Goodbye'], [DIFF_EQUAL, ' world.']]
 * which means: delete 'Hello', add 'Goodbye' and keep ' world.'
 */
var DIFF_DELETE = -1;
var DIFF_INSERT = 1;
var DIFF_EQUAL = 0;

/** @typedef {{0: number, 1: string}} */
diff_match_patch.Diff;


/**
 * Find the differences between two texts.  Simplifies the problem by stripping
 * any common prefix or suffix off the texts before diffing.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {boolean=} opt_checklines Optional speedup flag. If present and false,
 *     then don't run a line-level diff first to identify the changed areas.
 *     Defaults to true, which does a faster, slightly less optimal diff.
 * @param {number} opt_deadline Optional time when the diff should be complete
 *     by.  Used internally for recursive calls.  Users should set DiffTimeout
 *     instead.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 */
diff_match_patch.prototype.diff_main = function(text1, text2, opt_checklines,
    opt_deadline) {
  // Set a deadline by which time the diff must be complete.
  if (typeof opt_deadline == 'undefined') {
    if (this.Diff_Timeout <= 0) {
      opt_deadline = Number.MAX_VALUE;
    } else {
      opt_deadline = (new Date).getTime() + this.Diff_Timeout * 1000;
    }
  }
  var deadline = opt_deadline;

  // Check for null inputs.
  if (text1 == null || text2 == null) {
    throw new Error('Null input. (diff_main)');
  }

  // Check for equality (speedup).
  if (text1 == text2) {
    if (text1) {
      return [[DIFF_EQUAL, text1]];
    }
    return [];
  }

  if (typeof opt_checklines == 'undefined') {
    opt_checklines = true;
  }
  var checklines = opt_checklines;

  // Trim off common prefix (speedup).
  var commonlength = this.diff_commonPrefix(text1, text2);
  var commonprefix = text1.substring(0, commonlength);
  text1 = text1.substring(commonlength);
  text2 = text2.substring(commonlength);

  // Trim off common suffix (speedup).
  commonlength = this.diff_commonSuffix(text1, text2);
  var commonsuffix = text1.substring(text1.length - commonlength);
  text1 = text1.substring(0, text1.length - commonlength);
  text2 = text2.substring(0, text2.length - commonlength);

  // Compute the diff on the middle block.
  var diffs = this.diff_compute_(text1, text2, checklines, deadline);

  // Restore the prefix and suffix.
  if (commonprefix) {
    diffs.unshift([DIFF_EQUAL, commonprefix]);
  }
  if (commonsuffix) {
    diffs.push([DIFF_EQUAL, commonsuffix]);
  }
  this.diff_cleanupMerge(diffs);
  return diffs;
};


/**
 * Find the differences between two texts.  Assumes that the texts do not
 * have any common prefix or suffix.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {boolean} checklines Speedup flag.  If false, then don't run a
 *     line-level diff first to identify the changed areas.
 *     If true, then run a faster, slightly less optimal diff.
 * @param {number} deadline Time when the diff should be complete by.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @private
 */
diff_match_patch.prototype.diff_compute_ = function(text1, text2, checklines,
    deadline) {
  var diffs;

  if (!text1) {
    // Just add some text (speedup).
    return [[DIFF_INSERT, text2]];
  }

  if (!text2) {
    // Just delete some text (speedup).
    return [[DIFF_DELETE, text1]];
  }

  var longtext = text1.length > text2.length ? text1 : text2;
  var shorttext = text1.length > text2.length ? text2 : text1;
  var i = longtext.indexOf(shorttext);
  if (i != -1) {
    // Shorter text is inside the longer text (speedup).
    diffs = [[DIFF_INSERT, longtext.substring(0, i)],
             [DIFF_EQUAL, shorttext],
             [DIFF_INSERT, longtext.substring(i + shorttext.length)]];
    // Swap insertions for deletions if diff is reversed.
    if (text1.length > text2.length) {
      diffs[0][0] = diffs[2][0] = DIFF_DELETE;
    }
    return diffs;
  }

  if (shorttext.length == 1) {
    // Single character string.
    // After the previous speedup, the character can't be an equality.
    return [[DIFF_DELETE, text1], [DIFF_INSERT, text2]];
  }

  // Check to see if the problem can be split in two.
  var hm = this.diff_halfMatch_(text1, text2);
  if (hm) {
    // A half-match was found, sort out the return data.
    var text1_a = hm[0];
    var text1_b = hm[1];
    var text2_a = hm[2];
    var text2_b = hm[3];
    var mid_common = hm[4];
    // Send both pairs off for separate processing.
    var diffs_a = this.diff_main(text1_a, text2_a, checklines, deadline);
    var diffs_b = this.diff_main(text1_b, text2_b, checklines, deadline);
    // Merge the results.
    return diffs_a.concat([[DIFF_EQUAL, mid_common]], diffs_b);
  }

  if (checklines && text1.length > 100 && text2.length > 100) {
    return this.diff_lineMode_(text1, text2, deadline);
  }

  return this.diff_bisect_(text1, text2, deadline);
};


/**
 * Do a quick line-level diff on both strings, then rediff the parts for
 * greater accuracy.
 * This speedup can produce non-minimal diffs.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {number} deadline Time when the diff should be complete by.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @private
 */
diff_match_patch.prototype.diff_lineMode_ = function(text1, text2, deadline) {
  // Scan the text on a line-by-line basis first.
  var a = this.diff_linesToChars_(text1, text2);
  text1 = a.chars1;
  text2 = a.chars2;
  var linearray = a.lineArray;

  var diffs = this.diff_main(text1, text2, false, deadline);

  // Convert the diff back to original text.
  this.diff_charsToLines_(diffs, linearray);
  // Eliminate freak matches (e.g. blank lines)
  this.diff_cleanupSemantic(diffs);

  // Rediff any replacement blocks, this time character-by-character.
  // Add a dummy entry at the end.
  diffs.push([DIFF_EQUAL, '']);
  var pointer = 0;
  var count_delete = 0;
  var count_insert = 0;
  var text_delete = '';
  var text_insert = '';
  while (pointer < diffs.length) {
    switch (diffs[pointer][0]) {
      case DIFF_INSERT:
        count_insert++;
        text_insert += diffs[pointer][1];
        break;
      case DIFF_DELETE:
        count_delete++;
        text_delete += diffs[pointer][1];
        break;
      case DIFF_EQUAL:
        // Upon reaching an equality, check for prior redundancies.
        if (count_delete >= 1 && count_insert >= 1) {
          // Delete the offending records and add the merged ones.
          diffs.splice(pointer - count_delete - count_insert,
                       count_delete + count_insert);
          pointer = pointer - count_delete - count_insert;
          var a = this.diff_main(text_delete, text_insert, false, deadline);
          for (var j = a.length - 1; j >= 0; j--) {
            diffs.splice(pointer, 0, a[j]);
          }
          pointer = pointer + a.length;
        }
        count_insert = 0;
        count_delete = 0;
        text_delete = '';
        text_insert = '';
        break;
    }
    pointer++;
  }
  diffs.pop();  // Remove the dummy entry at the end.

  return diffs;
};


/**
 * Find the 'middle snake' of a diff, split the problem in two
 * and return the recursively constructed diff.
 * See Myers 1986 paper: An O(ND) Difference Algorithm and Its Variations.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {number} deadline Time at which to bail if not yet complete.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @private
 */
diff_match_patch.prototype.diff_bisect_ = function(text1, text2, deadline) {
  // Cache the text lengths to prevent multiple calls.
  var text1_length = text1.length;
  var text2_length = text2.length;
  var max_d = Math.ceil((text1_length + text2_length) / 2);
  var v_offset = max_d;
  var v_length = 2 * max_d;
  var v1 = new Array(v_length);
  var v2 = new Array(v_length);
  // Setting all elements to -1 is faster in Chrome & Firefox than mixing
  // integers and undefined.
  for (var x = 0; x < v_length; x++) {
    v1[x] = -1;
    v2[x] = -1;
  }
  v1[v_offset + 1] = 0;
  v2[v_offset + 1] = 0;
  var delta = text1_length - text2_length;
  // If the total number of characters is odd, then the front path will collide
  // with the reverse path.
  var front = (delta % 2 != 0);
  // Offsets for start and end of k loop.
  // Prevents mapping of space beyond the grid.
  var k1start = 0;
  var k1end = 0;
  var k2start = 0;
  var k2end = 0;
  for (var d = 0; d < max_d; d++) {
    // Bail out if deadline is reached.
    if ((new Date()).getTime() > deadline) {
      break;
    }

    // Walk the front path one step.
    for (var k1 = -d + k1start; k1 <= d - k1end; k1 += 2) {
      var k1_offset = v_offset + k1;
      var x1;
      if (k1 == -d || (k1 != d && v1[k1_offset - 1] < v1[k1_offset + 1])) {
        x1 = v1[k1_offset + 1];
      } else {
        x1 = v1[k1_offset - 1] + 1;
      }
      var y1 = x1 - k1;
      while (x1 < text1_length && y1 < text2_length &&
             text1.charAt(x1) == text2.charAt(y1)) {
        x1++;
        y1++;
      }
      v1[k1_offset] = x1;
      if (x1 > text1_length) {
        // Ran off the right of the graph.
        k1end += 2;
      } else if (y1 > text2_length) {
        // Ran off the bottom of the graph.
        k1start += 2;
      } else if (front) {
        var k2_offset = v_offset + delta - k1;
        if (k2_offset >= 0 && k2_offset < v_length && v2[k2_offset] != -1) {
          // Mirror x2 onto top-left coordinate system.
          var x2 = text1_length - v2[k2_offset];
          if (x1 >= x2) {
            // Overlap detected.
            return this.diff_bisectSplit_(text1, text2, x1, y1, deadline);
          }
        }
      }
    }

    // Walk the reverse path one step.
    for (var k2 = -d + k2start; k2 <= d - k2end; k2 += 2) {
      var k2_offset = v_offset + k2;
      var x2;
      if (k2 == -d || (k2 != d && v2[k2_offset - 1] < v2[k2_offset + 1])) {
        x2 = v2[k2_offset + 1];
      } else {
        x2 = v2[k2_offset - 1] + 1;
      }
      var y2 = x2 - k2;
      while (x2 < text1_length && y2 < text2_length &&
             text1.charAt(text1_length - x2 - 1) ==
             text2.charAt(text2_length - y2 - 1)) {
        x2++;
        y2++;
      }
      v2[k2_offset] = x2;
      if (x2 > text1_length) {
        // Ran off the left of the graph.
        k2end += 2;
      } else if (y2 > text2_length) {
        // Ran off the top of the graph.
        k2start += 2;
      } else if (!front) {
        var k1_offset = v_offset + delta - k2;
        if (k1_offset >= 0 && k1_offset < v_length && v1[k1_offset] != -1) {
          var x1 = v1[k1_offset];
          var y1 = v_offset + x1 - k1_offset;
          // Mirror x2 onto top-left coordinate system.
          x2 = text1_length - x2;
          if (x1 >= x2) {
            // Overlap detected.
            return this.diff_bisectSplit_(text1, text2, x1, y1, deadline);
          }
        }
      }
    }
  }
  // Diff took too long and hit the deadline or
  // number of diffs equals number of characters, no commonality at all.
  return [[DIFF_DELETE, text1], [DIFF_INSERT, text2]];
};


/**
 * Given the location of the 'middle snake', split the diff in two parts
 * and recurse.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {number} x Index of split point in text1.
 * @param {number} y Index of split point in text2.
 * @param {number} deadline Time at which to bail if not yet complete.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @private
 */
diff_match_patch.prototype.diff_bisectSplit_ = function(text1, text2, x, y,
    deadline) {
  var text1a = text1.substring(0, x);
  var text2a = text2.substring(0, y);
  var text1b = text1.substring(x);
  var text2b = text2.substring(y);

  // Compute both diffs serially.
  var diffs = this.diff_main(text1a, text2a, false, deadline);
  var diffsb = this.diff_main(text1b, text2b, false, deadline);

  return diffs.concat(diffsb);
};


/**
 * Split two texts into an array of strings.  Reduce the texts to a string of
 * hashes where each Unicode character represents one line.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {{chars1: string, chars2: string, lineArray: !Array.<string>}}
 *     An object containing the encoded text1, the encoded text2 and
 *     the array of unique strings.
 *     The zeroth element of the array of unique strings is intentionally blank.
 * @private
 */
diff_match_patch.prototype.diff_linesToChars_ = function(text1, text2) {
  var lineArray = [];  // e.g. lineArray[4] == 'Hello\n'
  var lineHash = {};   // e.g. lineHash['Hello\n'] == 4

  // '\x00' is a valid character, but various debuggers don't like it.
  // So we'll insert a junk entry to avoid generating a null character.
  lineArray[0] = '';

  /**
   * Split a text into an array of strings.  Reduce the texts to a string of
   * hashes where each Unicode character represents one line.
   * Modifies linearray and linehash through being a closure.
   * @param {string} text String to encode.
   * @return {string} Encoded string.
   * @private
   */
  function diff_linesToCharsMunge_(text) {
    var chars = '';
    // Walk the text, pulling out a substring for each line.
    // text.split('\n') would would temporarily double our memory footprint.
    // Modifying text would create many large strings to garbage collect.
    var lineStart = 0;
    var lineEnd = -1;
    // Keeping our own length variable is faster than looking it up.
    var lineArrayLength = lineArray.length;
    while (lineEnd < text.length - 1) {
      lineEnd = text.indexOf('\n', lineStart);
      if (lineEnd == -1) {
        lineEnd = text.length - 1;
      }
      var line = text.substring(lineStart, lineEnd + 1);
      lineStart = lineEnd + 1;

      if (lineHash.hasOwnProperty ? lineHash.hasOwnProperty(line) :
          (lineHash[line] !== undefined)) {
        chars += String.fromCharCode(lineHash[line]);
      } else {
        chars += String.fromCharCode(lineArrayLength);
        lineHash[line] = lineArrayLength;
        lineArray[lineArrayLength++] = line;
      }
    }
    return chars;
  }

  var chars1 = diff_linesToCharsMunge_(text1);
  var chars2 = diff_linesToCharsMunge_(text2);
  return {chars1: chars1, chars2: chars2, lineArray: lineArray};
};


/**
 * Rehydrate the text in a diff from a string of line hashes to real lines of
 * text.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @param {!Array.<string>} lineArray Array of unique strings.
 * @private
 */
diff_match_patch.prototype.diff_charsToLines_ = function(diffs, lineArray) {
  for (var x = 0; x < diffs.length; x++) {
    var chars = diffs[x][1];
    var text = [];
    for (var y = 0; y < chars.length; y++) {
      text[y] = lineArray[chars.charCodeAt(y)];
    }
    diffs[x][1] = text.join('');
  }
};


/**
 * Determine the common prefix of two strings.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {number} The number of characters common to the start of each
 *     string.
 */
diff_match_patch.prototype.diff_commonPrefix = function(text1, text2) {
  // Quick check for common null cases.
  if (!text1 || !text2 || text1.charAt(0) != text2.charAt(0)) {
    return 0;
  }
  // Binary search.
  // Performance analysis: http://neil.fraser.name/news/2007/10/09/
  var pointermin = 0;
  var pointermax = Math.min(text1.length, text2.length);
  var pointermid = pointermax;
  var pointerstart = 0;
  while (pointermin < pointermid) {
    if (text1.substring(pointerstart, pointermid) ==
        text2.substring(pointerstart, pointermid)) {
      pointermin = pointermid;
      pointerstart = pointermin;
    } else {
      pointermax = pointermid;
    }
    pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
  }
  return pointermid;
};


/**
 * Determine the common suffix of two strings.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {number} The number of characters common to the end of each string.
 */
diff_match_patch.prototype.diff_commonSuffix = function(text1, text2) {
  // Quick check for common null cases.
  if (!text1 || !text2 ||
      text1.charAt(text1.length - 1) != text2.charAt(text2.length - 1)) {
    return 0;
  }
  // Binary search.
  // Performance analysis: http://neil.fraser.name/news/2007/10/09/
  var pointermin = 0;
  var pointermax = Math.min(text1.length, text2.length);
  var pointermid = pointermax;
  var pointerend = 0;
  while (pointermin < pointermid) {
    if (text1.substring(text1.length - pointermid, text1.length - pointerend) ==
        text2.substring(text2.length - pointermid, text2.length - pointerend)) {
      pointermin = pointermid;
      pointerend = pointermin;
    } else {
      pointermax = pointermid;
    }
    pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
  }
  return pointermid;
};


/**
 * Determine if the suffix of one string is the prefix of another.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {number} The number of characters common to the end of the first
 *     string and the start of the second string.
 * @private
 */
diff_match_patch.prototype.diff_commonOverlap_ = function(text1, text2) {
  // Cache the text lengths to prevent multiple calls.
  var text1_length = text1.length;
  var text2_length = text2.length;
  // Eliminate the null case.
  if (text1_length == 0 || text2_length == 0) {
    return 0;
  }
  // Truncate the longer string.
  if (text1_length > text2_length) {
    text1 = text1.substring(text1_length - text2_length);
  } else if (text1_length < text2_length) {
    text2 = text2.substring(0, text1_length);
  }
  var text_length = Math.min(text1_length, text2_length);
  // Quick check for the worst case.
  if (text1 == text2) {
    return text_length;
  }

  // Start by looking for a single character match
  // and increase length until no match is found.
  // Performance analysis: http://neil.fraser.name/news/2010/11/04/
  var best = 0;
  var length = 1;
  while (true) {
    var pattern = text1.substring(text_length - length);
    var found = text2.indexOf(pattern);
    if (found == -1) {
      return best;
    }
    length += found;
    if (found == 0 || text1.substring(text_length - length) ==
        text2.substring(0, length)) {
      best = length;
      length++;
    }
  }
};


/**
 * Do the two texts share a substring which is at least half the length of the
 * longer text?
 * This speedup can produce non-minimal diffs.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {Array.<string>} Five element Array, containing the prefix of
 *     text1, the suffix of text1, the prefix of text2, the suffix of
 *     text2 and the common middle.  Or null if there was no match.
 * @private
 */
diff_match_patch.prototype.diff_halfMatch_ = function(text1, text2) {
  if (this.Diff_Timeout <= 0) {
    // Don't risk returning a non-optimal diff if we have unlimited time.
    return null;
  }
  var longtext = text1.length > text2.length ? text1 : text2;
  var shorttext = text1.length > text2.length ? text2 : text1;
  if (longtext.length < 4 || shorttext.length * 2 < longtext.length) {
    return null;  // Pointless.
  }
  var dmp = this;  // 'this' becomes 'window' in a closure.

  /**
   * Does a substring of shorttext exist within longtext such that the substring
   * is at least half the length of longtext?
   * Closure, but does not reference any external variables.
   * @param {string} longtext Longer string.
   * @param {string} shorttext Shorter string.
   * @param {number} i Start index of quarter length substring within longtext.
   * @return {Array.<string>} Five element Array, containing the prefix of
   *     longtext, the suffix of longtext, the prefix of shorttext, the suffix
   *     of shorttext and the common middle.  Or null if there was no match.
   * @private
   */
  function diff_halfMatchI_(longtext, shorttext, i) {
    // Start with a 1/4 length substring at position i as a seed.
    var seed = longtext.substring(i, i + Math.floor(longtext.length / 4));
    var j = -1;
    var best_common = '';
    var best_longtext_a, best_longtext_b, best_shorttext_a, best_shorttext_b;
    while ((j = shorttext.indexOf(seed, j + 1)) != -1) {
      var prefixLength = dmp.diff_commonPrefix(longtext.substring(i),
                                               shorttext.substring(j));
      var suffixLength = dmp.diff_commonSuffix(longtext.substring(0, i),
                                               shorttext.substring(0, j));
      if (best_common.length < suffixLength + prefixLength) {
        best_common = shorttext.substring(j - suffixLength, j) +
            shorttext.substring(j, j + prefixLength);
        best_longtext_a = longtext.substring(0, i - suffixLength);
        best_longtext_b = longtext.substring(i + prefixLength);
        best_shorttext_a = shorttext.substring(0, j - suffixLength);
        best_shorttext_b = shorttext.substring(j + prefixLength);
      }
    }
    if (best_common.length * 2 >= longtext.length) {
      return [best_longtext_a, best_longtext_b,
              best_shorttext_a, best_shorttext_b, best_common];
    } else {
      return null;
    }
  }

  // First check if the second quarter is the seed for a half-match.
  var hm1 = diff_halfMatchI_(longtext, shorttext,
                             Math.ceil(longtext.length / 4));
  // Check again based on the third quarter.
  var hm2 = diff_halfMatchI_(longtext, shorttext,
                             Math.ceil(longtext.length / 2));
  var hm;
  if (!hm1 && !hm2) {
    return null;
  } else if (!hm2) {
    hm = hm1;
  } else if (!hm1) {
    hm = hm2;
  } else {
    // Both matched.  Select the longest.
    hm = hm1[4].length > hm2[4].length ? hm1 : hm2;
  }

  // A half-match was found, sort out the return data.
  var text1_a, text1_b, text2_a, text2_b;
  if (text1.length > text2.length) {
    text1_a = hm[0];
    text1_b = hm[1];
    text2_a = hm[2];
    text2_b = hm[3];
  } else {
    text2_a = hm[0];
    text2_b = hm[1];
    text1_a = hm[2];
    text1_b = hm[3];
  }
  var mid_common = hm[4];
  return [text1_a, text1_b, text2_a, text2_b, mid_common];
};


/**
 * Reduce the number of edits by eliminating semantically trivial equalities.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 */
diff_match_patch.prototype.diff_cleanupSemantic = function(diffs) {
  var changes = false;
  var equalities = [];  // Stack of indices where equalities are found.
  var equalitiesLength = 0;  // Keeping our own length var is faster in JS.
  /** @type {?string} */
  var lastequality = null;
  // Always equal to diffs[equalities[equalitiesLength - 1]][1]
  var pointer = 0;  // Index of current position.
  // Number of characters that changed prior to the equality.
  var length_insertions1 = 0;
  var length_deletions1 = 0;
  // Number of characters that changed after the equality.
  var length_insertions2 = 0;
  var length_deletions2 = 0;
  while (pointer < diffs.length) {
    if (diffs[pointer][0] == DIFF_EQUAL) {  // Equality found.
      equalities[equalitiesLength++] = pointer;
      length_insertions1 = length_insertions2;
      length_deletions1 = length_deletions2;
      length_insertions2 = 0;
      length_deletions2 = 0;
      lastequality = diffs[pointer][1];
    } else {  // An insertion or deletion.
      if (diffs[pointer][0] == DIFF_INSERT) {
        length_insertions2 += diffs[pointer][1].length;
      } else {
        length_deletions2 += diffs[pointer][1].length;
      }
      // Eliminate an equality that is smaller or equal to the edits on both
      // sides of it.
      if (lastequality && (lastequality.length <=
          Math.max(length_insertions1, length_deletions1)) &&
          (lastequality.length <= Math.max(length_insertions2,
                                           length_deletions2))) {
        // Duplicate record.
        diffs.splice(equalities[equalitiesLength - 1], 0,
                     [DIFF_DELETE, lastequality]);
        // Change second copy to insert.
        diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT;
        // Throw away the equality we just deleted.
        equalitiesLength--;
        // Throw away the previous equality (it needs to be reevaluated).
        equalitiesLength--;
        pointer = equalitiesLength > 0 ? equalities[equalitiesLength - 1] : -1;
        length_insertions1 = 0;  // Reset the counters.
        length_deletions1 = 0;
        length_insertions2 = 0;
        length_deletions2 = 0;
        lastequality = null;
        changes = true;
      }
    }
    pointer++;
  }

  // Normalize the diff.
  if (changes) {
    this.diff_cleanupMerge(diffs);
  }
  this.diff_cleanupSemanticLossless(diffs);

  // Find any overlaps between deletions and insertions.
  // e.g: <del>abcxxx</del><ins>xxxdef</ins>
  //   -> <del>abc</del>xxx<ins>def</ins>
  // e.g: <del>xxxabc</del><ins>defxxx</ins>
  //   -> <ins>def</ins>xxx<del>abc</del>
  // Only extract an overlap if it is as big as the edit ahead or behind it.
  pointer = 1;
  while (pointer < diffs.length) {
    if (diffs[pointer - 1][0] == DIFF_DELETE &&
        diffs[pointer][0] == DIFF_INSERT) {
      var deletion = diffs[pointer - 1][1];
      var insertion = diffs[pointer][1];
      var overlap_length1 = this.diff_commonOverlap_(deletion, insertion);
      var overlap_length2 = this.diff_commonOverlap_(insertion, deletion);
      if (overlap_length1 >= overlap_length2) {
        if (overlap_length1 >= deletion.length / 2 ||
            overlap_length1 >= insertion.length / 2) {
          // Overlap found.  Insert an equality and trim the surrounding edits.
          diffs.splice(pointer, 0,
              [DIFF_EQUAL, insertion.substring(0, overlap_length1)]);
          diffs[pointer - 1][1] =
              deletion.substring(0, deletion.length - overlap_length1);
          diffs[pointer + 1][1] = insertion.substring(overlap_length1);
          pointer++;
        }
      } else {
        if (overlap_length2 >= deletion.length / 2 ||
            overlap_length2 >= insertion.length / 2) {
          // Reverse overlap found.
          // Insert an equality and swap and trim the surrounding edits.
          diffs.splice(pointer, 0,
              [DIFF_EQUAL, deletion.substring(0, overlap_length2)]);
          diffs[pointer - 1][0] = DIFF_INSERT;
          diffs[pointer - 1][1] =
              insertion.substring(0, insertion.length - overlap_length2);
          diffs[pointer + 1][0] = DIFF_DELETE;
          diffs[pointer + 1][1] =
              deletion.substring(overlap_length2);
          pointer++;
        }
      }
      pointer++;
    }
    pointer++;
  }
};


/**
 * Look for single edits surrounded on both sides by equalities
 * which can be shifted sideways to align the edit to a word boundary.
 * e.g: The c<ins>at c</ins>ame. -> The <ins>cat </ins>came.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 */
diff_match_patch.prototype.diff_cleanupSemanticLossless = function(diffs) {
  /**
   * Given two strings, compute a score representing whether the internal
   * boundary falls on logical boundaries.
   * Scores range from 6 (best) to 0 (worst).
   * Closure, but does not reference any external variables.
   * @param {string} one First string.
   * @param {string} two Second string.
   * @return {number} The score.
   * @private
   */
  function diff_cleanupSemanticScore_(one, two) {
    if (!one || !two) {
      // Edges are the best.
      return 6;
    }

    // Each port of this function behaves slightly differently due to
    // subtle differences in each language's definition of things like
    // 'whitespace'.  Since this function's purpose is largely cosmetic,
    // the choice has been made to use each language's native features
    // rather than force total conformity.
    var char1 = one.charAt(one.length - 1);
    var char2 = two.charAt(0);
    var nonAlphaNumeric1 = char1.match(diff_match_patch.nonAlphaNumericRegex_);
    var nonAlphaNumeric2 = char2.match(diff_match_patch.nonAlphaNumericRegex_);
    var whitespace1 = nonAlphaNumeric1 &&
        char1.match(diff_match_patch.whitespaceRegex_);
    var whitespace2 = nonAlphaNumeric2 &&
        char2.match(diff_match_patch.whitespaceRegex_);
    var lineBreak1 = whitespace1 &&
        char1.match(diff_match_patch.linebreakRegex_);
    var lineBreak2 = whitespace2 &&
        char2.match(diff_match_patch.linebreakRegex_);
    var blankLine1 = lineBreak1 &&
        one.match(diff_match_patch.blanklineEndRegex_);
    var blankLine2 = lineBreak2 &&
        two.match(diff_match_patch.blanklineStartRegex_);

    if (blankLine1 || blankLine2) {
      // Five points for blank lines.
      return 5;
    } else if (lineBreak1 || lineBreak2) {
      // Four points for line breaks.
      return 4;
    } else if (nonAlphaNumeric1 && !whitespace1 && whitespace2) {
      // Three points for end of sentences.
      return 3;
    } else if (whitespace1 || whitespace2) {
      // Two points for whitespace.
      return 2;
    } else if (nonAlphaNumeric1 || nonAlphaNumeric2) {
      // One point for non-alphanumeric.
      return 1;
    }
    return 0;
  }

  var pointer = 1;
  // Intentionally ignore the first and last element (don't need checking).
  while (pointer < diffs.length - 1) {
    if (diffs[pointer - 1][0] == DIFF_EQUAL &&
        diffs[pointer + 1][0] == DIFF_EQUAL) {
      // This is a single edit surrounded by equalities.
      var equality1 = diffs[pointer - 1][1];
      var edit = diffs[pointer][1];
      var equality2 = diffs[pointer + 1][1];

      // First, shift the edit as far left as possible.
      var commonOffset = this.diff_commonSuffix(equality1, edit);
      if (commonOffset) {
        var commonString = edit.substring(edit.length - commonOffset);
        equality1 = equality1.substring(0, equality1.length - commonOffset);
        edit = commonString + edit.substring(0, edit.length - commonOffset);
        equality2 = commonString + equality2;
      }

      // Second, step character by character right, looking for the best fit.
      var bestEquality1 = equality1;
      var bestEdit = edit;
      var bestEquality2 = equality2;
      var bestScore = diff_cleanupSemanticScore_(equality1, edit) +
          diff_cleanupSemanticScore_(edit, equality2);
      while (edit.charAt(0) === equality2.charAt(0)) {
        equality1 += edit.charAt(0);
        edit = edit.substring(1) + equality2.charAt(0);
        equality2 = equality2.substring(1);
        var score = diff_cleanupSemanticScore_(equality1, edit) +
            diff_cleanupSemanticScore_(edit, equality2);
        // The >= encourages trailing rather than leading whitespace on edits.
        if (score >= bestScore) {
          bestScore = score;
          bestEquality1 = equality1;
          bestEdit = edit;
          bestEquality2 = equality2;
        }
      }

      if (diffs[pointer - 1][1] != bestEquality1) {
        // We have an improvement, save it back to the diff.
        if (bestEquality1) {
          diffs[pointer - 1][1] = bestEquality1;
        } else {
          diffs.splice(pointer - 1, 1);
          pointer--;
        }
        diffs[pointer][1] = bestEdit;
        if (bestEquality2) {
          diffs[pointer + 1][1] = bestEquality2;
        } else {
          diffs.splice(pointer + 1, 1);
          pointer--;
        }
      }
    }
    pointer++;
  }
};

// Define some regex patterns for matching boundaries.
diff_match_patch.nonAlphaNumericRegex_ = /[^a-zA-Z0-9]/;
diff_match_patch.whitespaceRegex_ = /\s/;
diff_match_patch.linebreakRegex_ = /[\r\n]/;
diff_match_patch.blanklineEndRegex_ = /\n\r?\n$/;
diff_match_patch.blanklineStartRegex_ = /^\r?\n\r?\n/;

/**
 * Reduce the number of edits by eliminating operationally trivial equalities.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 */
diff_match_patch.prototype.diff_cleanupEfficiency = function(diffs) {
  var changes = false;
  var equalities = [];  // Stack of indices where equalities are found.
  var equalitiesLength = 0;  // Keeping our own length var is faster in JS.
  /** @type {?string} */
  var lastequality = null;
  // Always equal to diffs[equalities[equalitiesLength - 1]][1]
  var pointer = 0;  // Index of current position.
  // Is there an insertion operation before the last equality.
  var pre_ins = false;
  // Is there a deletion operation before the last equality.
  var pre_del = false;
  // Is there an insertion operation after the last equality.
  var post_ins = false;
  // Is there a deletion operation after the last equality.
  var post_del = false;
  while (pointer < diffs.length) {
    if (diffs[pointer][0] == DIFF_EQUAL) {  // Equality found.
      if (diffs[pointer][1].length < this.Diff_EditCost &&
          (post_ins || post_del)) {
        // Candidate found.
        equalities[equalitiesLength++] = pointer;
        pre_ins = post_ins;
        pre_del = post_del;
        lastequality = diffs[pointer][1];
      } else {
        // Not a candidate, and can never become one.
        equalitiesLength = 0;
        lastequality = null;
      }
      post_ins = post_del = false;
    } else {  // An insertion or deletion.
      if (diffs[pointer][0] == DIFF_DELETE) {
        post_del = true;
      } else {
        post_ins = true;
      }
      /*
       * Five types to be split:
       * <ins>A</ins><del>B</del>XY<ins>C</ins><del>D</del>
       * <ins>A</ins>X<ins>C</ins><del>D</del>
       * <ins>A</ins><del>B</del>X<ins>C</ins>
       * <ins>A</del>X<ins>C</ins><del>D</del>
       * <ins>A</ins><del>B</del>X<del>C</del>
       */
      if (lastequality && ((pre_ins && pre_del && post_ins && post_del) ||
                           ((lastequality.length < this.Diff_EditCost / 2) &&
                            (pre_ins + pre_del + post_ins + post_del) == 3))) {
        // Duplicate record.
        diffs.splice(equalities[equalitiesLength - 1], 0,
                     [DIFF_DELETE, lastequality]);
        // Change second copy to insert.
        diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT;
        equalitiesLength--;  // Throw away the equality we just deleted;
        lastequality = null;
        if (pre_ins && pre_del) {
          // No changes made which could affect previous entry, keep going.
          post_ins = post_del = true;
          equalitiesLength = 0;
        } else {
          equalitiesLength--;  // Throw away the previous equality.
          pointer = equalitiesLength > 0 ?
              equalities[equalitiesLength - 1] : -1;
          post_ins = post_del = false;
        }
        changes = true;
      }
    }
    pointer++;
  }

  if (changes) {
    this.diff_cleanupMerge(diffs);
  }
};


/**
 * Reorder and merge like edit sections.  Merge equalities.
 * Any edit section can move as long as it doesn't cross an equality.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 */
diff_match_patch.prototype.diff_cleanupMerge = function(diffs) {
  diffs.push([DIFF_EQUAL, '']);  // Add a dummy entry at the end.
  var pointer = 0;
  var count_delete = 0;
  var count_insert = 0;
  var text_delete = '';
  var text_insert = '';
  var commonlength;
  while (pointer < diffs.length) {
    switch (diffs[pointer][0]) {
      case DIFF_INSERT:
        count_insert++;
        text_insert += diffs[pointer][1];
        pointer++;
        break;
      case DIFF_DELETE:
        count_delete++;
        text_delete += diffs[pointer][1];
        pointer++;
        break;
      case DIFF_EQUAL:
        // Upon reaching an equality, check for prior redundancies.
        if (count_delete + count_insert > 1) {
          if (count_delete !== 0 && count_insert !== 0) {
            // Factor out any common prefixies.
            commonlength = this.diff_commonPrefix(text_insert, text_delete);
            if (commonlength !== 0) {
              if ((pointer - count_delete - count_insert) > 0 &&
                  diffs[pointer - count_delete - count_insert - 1][0] ==
                  DIFF_EQUAL) {
                diffs[pointer - count_delete - count_insert - 1][1] +=
                    text_insert.substring(0, commonlength);
              } else {
                diffs.splice(0, 0, [DIFF_EQUAL,
                                    text_insert.substring(0, commonlength)]);
                pointer++;
              }
              text_insert = text_insert.substring(commonlength);
              text_delete = text_delete.substring(commonlength);
            }
            // Factor out any common suffixies.
            commonlength = this.diff_commonSuffix(text_insert, text_delete);
            if (commonlength !== 0) {
              diffs[pointer][1] = text_insert.substring(text_insert.length -
                  commonlength) + diffs[pointer][1];
              text_insert = text_insert.substring(0, text_insert.length -
                  commonlength);
              text_delete = text_delete.substring(0, text_delete.length -
                  commonlength);
            }
          }
          // Delete the offending records and add the merged ones.
          if (count_delete === 0) {
            diffs.splice(pointer - count_insert,
                count_delete + count_insert, [DIFF_INSERT, text_insert]);
          } else if (count_insert === 0) {
            diffs.splice(pointer - count_delete,
                count_delete + count_insert, [DIFF_DELETE, text_delete]);
          } else {
            diffs.splice(pointer - count_delete - count_insert,
                count_delete + count_insert, [DIFF_DELETE, text_delete],
                [DIFF_INSERT, text_insert]);
          }
          pointer = pointer - count_delete - count_insert +
                    (count_delete ? 1 : 0) + (count_insert ? 1 : 0) + 1;
        } else if (pointer !== 0 && diffs[pointer - 1][0] == DIFF_EQUAL) {
          // Merge this equality with the previous one.
          diffs[pointer - 1][1] += diffs[pointer][1];
          diffs.splice(pointer, 1);
        } else {
          pointer++;
        }
        count_insert = 0;
        count_delete = 0;
        text_delete = '';
        text_insert = '';
        break;
    }
  }
  if (diffs[diffs.length - 1][1] === '') {
    diffs.pop();  // Remove the dummy entry at the end.
  }

  // Second pass: look for single edits surrounded on both sides by equalities
  // which can be shifted sideways to eliminate an equality.
  // e.g: A<ins>BA</ins>C -> <ins>AB</ins>AC
  var changes = false;
  pointer = 1;
  // Intentionally ignore the first and last element (don't need checking).
  while (pointer < diffs.length - 1) {
    if (diffs[pointer - 1][0] == DIFF_EQUAL &&
        diffs[pointer + 1][0] == DIFF_EQUAL) {
      // This is a single edit surrounded by equalities.
      if (diffs[pointer][1].substring(diffs[pointer][1].length -
          diffs[pointer - 1][1].length) == diffs[pointer - 1][1]) {
        // Shift the edit over the previous equality.
        diffs[pointer][1] = diffs[pointer - 1][1] +
            diffs[pointer][1].substring(0, diffs[pointer][1].length -
                                        diffs[pointer - 1][1].length);
        diffs[pointer + 1][1] = diffs[pointer - 1][1] + diffs[pointer + 1][1];
        diffs.splice(pointer - 1, 1);
        changes = true;
      } else if (diffs[pointer][1].substring(0, diffs[pointer + 1][1].length) ==
          diffs[pointer + 1][1]) {
        // Shift the edit over the next equality.
        diffs[pointer - 1][1] += diffs[pointer + 1][1];
        diffs[pointer][1] =
            diffs[pointer][1].substring(diffs[pointer + 1][1].length) +
            diffs[pointer + 1][1];
        diffs.splice(pointer + 1, 1);
        changes = true;
      }
    }
    pointer++;
  }
  // If shifts were made, the diff needs reordering and another shift sweep.
  if (changes) {
    this.diff_cleanupMerge(diffs);
  }
};


/**
 * loc is a location in text1, compute and return the equivalent location in
 * text2.
 * e.g. 'The cat' vs 'The big cat', 1->1, 5->8
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @param {number} loc Location within text1.
 * @return {number} Location within text2.
 */
diff_match_patch.prototype.diff_xIndex = function(diffs, loc) {
  var chars1 = 0;
  var chars2 = 0;
  var last_chars1 = 0;
  var last_chars2 = 0;
  var x;
  for (x = 0; x < diffs.length; x++) {
    if (diffs[x][0] !== DIFF_INSERT) {  // Equality or deletion.
      chars1 += diffs[x][1].length;
    }
    if (diffs[x][0] !== DIFF_DELETE) {  // Equality or insertion.
      chars2 += diffs[x][1].length;
    }
    if (chars1 > loc) {  // Overshot the location.
      break;
    }
    last_chars1 = chars1;
    last_chars2 = chars2;
  }
  // Was the location was deleted?
  if (diffs.length != x && diffs[x][0] === DIFF_DELETE) {
    return last_chars2;
  }
  // Add the remaining character length.
  return last_chars2 + (loc - last_chars1);
};


/**
 * Convert a diff array into a pretty HTML report.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {string} HTML representation.
 */
diff_match_patch.prototype.diff_prettyHtml = function(diffs) {
  var html = [];
  var pattern_amp = /&/g;
  var pattern_lt = /</g;
  var pattern_gt = />/g;
  var pattern_para = /\n/g;
  for (var x = 0; x < diffs.length; x++) {
    var op = diffs[x][0];    // Operation (insert, delete, equal)
    var data = diffs[x][1];  // Text of change.
    var text = data.replace(pattern_amp, '&amp;').replace(pattern_lt, '&lt;')
        .replace(pattern_gt, '&gt;').replace(pattern_para, '&para;<br>');
    switch (op) {
      case DIFF_INSERT:
        html[x] = '<ins style="background:#e6ffe6;">' + text + '</ins>';
        break;
      case DIFF_DELETE:
        html[x] = '<del style="background:#ffe6e6;">' + text + '</del>';
        break;
      case DIFF_EQUAL:
        html[x] = '<span>' + text + '</span>';
        break;
    }
  }
  return html.join('');
};


/**
 * Compute and return the source text (all equalities and deletions).
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {string} Source text.
 */
diff_match_patch.prototype.diff_text1 = function(diffs) {
  var text = [];
  for (var x = 0; x < diffs.length; x++) {
    if (diffs[x][0] !== DIFF_INSERT) {
      text[x] = diffs[x][1];
    }
  }
  return text.join('');
};


/**
 * Compute and return the destination text (all equalities and insertions).
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {string} Destination text.
 */
diff_match_patch.prototype.diff_text2 = function(diffs) {
  var text = [];
  for (var x = 0; x < diffs.length; x++) {
    if (diffs[x][0] !== DIFF_DELETE) {
      text[x] = diffs[x][1];
    }
  }
  return text.join('');
};


/**
 * Compute the Levenshtein distance; the number of inserted, deleted or
 * substituted characters.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {number} Number of changes.
 */
diff_match_patch.prototype.diff_levenshtein = function(diffs) {
  var levenshtein = 0;
  var insertions = 0;
  var deletions = 0;
  for (var x = 0; x < diffs.length; x++) {
    var op = diffs[x][0];
    var data = diffs[x][1];
    switch (op) {
      case DIFF_INSERT:
        insertions += data.length;
        break;
      case DIFF_DELETE:
        deletions += data.length;
        break;
      case DIFF_EQUAL:
        // A deletion and an insertion is one substitution.
        levenshtein += Math.max(insertions, deletions);
        insertions = 0;
        deletions = 0;
        break;
    }
  }
  levenshtein += Math.max(insertions, deletions);
  return levenshtein;
};


/**
 * Crush the diff into an encoded string which describes the operations
 * required to transform text1 into text2.
 * E.g. =3\t-2\t+ing  -> Keep 3 chars, delete 2 chars, insert 'ing'.
 * Operations are tab-separated.  Inserted text is escaped using %xx notation.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {string} Delta text.
 */
diff_match_patch.prototype.diff_toDelta = function(diffs) {
  var text = [];
  for (var x = 0; x < diffs.length; x++) {
    switch (diffs[x][0]) {
      case DIFF_INSERT:
        text[x] = '+' + encodeURI(diffs[x][1]);
        break;
      case DIFF_DELETE:
        text[x] = '-' + diffs[x][1].length;
        break;
      case DIFF_EQUAL:
        text[x] = '=' + diffs[x][1].length;
        break;
    }
  }
  return text.join('\t').replace(/%20/g, ' ');
};


/**
 * Given the original text1, and an encoded string which describes the
 * operations required to transform text1 into text2, compute the full diff.
 * @param {string} text1 Source string for the diff.
 * @param {string} delta Delta text.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @throws {!Error} If invalid input.
 */
diff_match_patch.prototype.diff_fromDelta = function(text1, delta) {
  var diffs = [];
  var diffsLength = 0;  // Keeping our own length var is faster in JS.
  var pointer = 0;  // Cursor in text1
  var tokens = delta.split(/\t/g);
  for (var x = 0; x < tokens.length; x++) {
    // Each token begins with a one character parameter which specifies the
    // operation of this token (delete, insert, equality).
    var param = tokens[x].substring(1);
    switch (tokens[x].charAt(0)) {
      case '+':
        try {
          diffs[diffsLength++] = [DIFF_INSERT, decodeURI(param)];
        } catch (ex) {
          // Malformed URI sequence.
          throw new Error('Illegal escape in diff_fromDelta: ' + param);
        }
        break;
      case '-':
        // Fall through.
      case '=':
        var n = parseInt(param, 10);
        if (isNaN(n) || n < 0) {
          throw new Error('Invalid number in diff_fromDelta: ' + param);
        }
        var text = text1.substring(pointer, pointer += n);
        if (tokens[x].charAt(0) == '=') {
          diffs[diffsLength++] = [DIFF_EQUAL, text];
        } else {
          diffs[diffsLength++] = [DIFF_DELETE, text];
        }
        break;
      default:
        // Blank tokens are ok (from a trailing \t).
        // Anything else is an error.
        if (tokens[x]) {
          throw new Error('Invalid diff operation in diff_fromDelta: ' +
                          tokens[x]);
        }
    }
  }
  if (pointer != text1.length) {
    throw new Error('Delta length (' + pointer +
        ') does not equal source text length (' + text1.length + ').');
  }
  return diffs;
};


//  MATCH FUNCTIONS


/**
 * Locate the best instance of 'pattern' in 'text' near 'loc'.
 * @param {string} text The text to search.
 * @param {string} pattern The pattern to search for.
 * @param {number} loc The location to search around.
 * @return {number} Best match index or -1.
 */
diff_match_patch.prototype.match_main = function(text, pattern, loc) {
  // Check for null inputs.
  if (text == null || pattern == null || loc == null) {
    throw new Error('Null input. (match_main)');
  }

  loc = Math.max(0, Math.min(loc, text.length));
  if (text == pattern) {
    // Shortcut (potentially not guaranteed by the algorithm)
    return 0;
  } else if (!text.length) {
    // Nothing to match.
    return -1;
  } else if (text.substring(loc, loc + pattern.length) == pattern) {
    // Perfect match at the perfect spot!  (Includes case of null pattern)
    return loc;
  } else {
    // Do a fuzzy compare.
    return this.match_bitap_(text, pattern, loc);
  }
};


/**
 * Locate the best instance of 'pattern' in 'text' near 'loc' using the
 * Bitap algorithm.
 * @param {string} text The text to search.
 * @param {string} pattern The pattern to search for.
 * @param {number} loc The location to search around.
 * @return {number} Best match index or -1.
 * @private
 */
diff_match_patch.prototype.match_bitap_ = function(text, pattern, loc) {
  if (pattern.length > this.Match_MaxBits) {
    throw new Error('Pattern too long for this browser.');
  }

  // Initialise the alphabet.
  var s = this.match_alphabet_(pattern);

  var dmp = this;  // 'this' becomes 'window' in a closure.

  /**
   * Compute and return the score for a match with e errors and x location.
   * Accesses loc and pattern through being a closure.
   * @param {number} e Number of errors in match.
   * @param {number} x Location of match.
   * @return {number} Overall score for match (0.0 = good, 1.0 = bad).
   * @private
   */
  function match_bitapScore_(e, x) {
    var accuracy = e / pattern.length;
    var proximity = Math.abs(loc - x);
    if (!dmp.Match_Distance) {
      // Dodge divide by zero error.
      return proximity ? 1.0 : accuracy;
    }
    return accuracy + (proximity / dmp.Match_Distance);
  }

  // Highest score beyond which we give up.
  var score_threshold = this.Match_Threshold;
  // Is there a nearby exact match? (speedup)
  var best_loc = text.indexOf(pattern, loc);
  if (best_loc != -1) {
    score_threshold = Math.min(match_bitapScore_(0, best_loc), score_threshold);
    // What about in the other direction? (speedup)
    best_loc = text.lastIndexOf(pattern, loc + pattern.length);
    if (best_loc != -1) {
      score_threshold =
          Math.min(match_bitapScore_(0, best_loc), score_threshold);
    }
  }

  // Initialise the bit arrays.
  var matchmask = 1 << (pattern.length - 1);
  best_loc = -1;

  var bin_min, bin_mid;
  var bin_max = pattern.length + text.length;
  var last_rd;
  for (var d = 0; d < pattern.length; d++) {
    // Scan for the best match; each iteration allows for one more error.
    // Run a binary search to determine how far from 'loc' we can stray at this
    // error level.
    bin_min = 0;
    bin_mid = bin_max;
    while (bin_min < bin_mid) {
      if (match_bitapScore_(d, loc + bin_mid) <= score_threshold) {
        bin_min = bin_mid;
      } else {
        bin_max = bin_mid;
      }
      bin_mid = Math.floor((bin_max - bin_min) / 2 + bin_min);
    }
    // Use the result from this iteration as the maximum for the next.
    bin_max = bin_mid;
    var start = Math.max(1, loc - bin_mid + 1);
    var finish = Math.min(loc + bin_mid, text.length) + pattern.length;

    var rd = Array(finish + 2);
    rd[finish + 1] = (1 << d) - 1;
    for (var j = finish; j >= start; j--) {
      // The alphabet (s) is a sparse hash, so the following line generates
      // warnings.
      var charMatch = s[text.charAt(j - 1)];
      if (d === 0) {  // First pass: exact match.
        rd[j] = ((rd[j + 1] << 1) | 1) & charMatch;
      } else {  // Subsequent passes: fuzzy match.
        rd[j] = (((rd[j + 1] << 1) | 1) & charMatch) |
                (((last_rd[j + 1] | last_rd[j]) << 1) | 1) |
                last_rd[j + 1];
      }
      if (rd[j] & matchmask) {
        var score = match_bitapScore_(d, j - 1);
        // This match will almost certainly be better than any existing match.
        // But check anyway.
        if (score <= score_threshold) {
          // Told you so.
          score_threshold = score;
          best_loc = j - 1;
          if (best_loc > loc) {
            // When passing loc, don't exceed our current distance from loc.
            start = Math.max(1, 2 * loc - best_loc);
          } else {
            // Already passed loc, downhill from here on in.
            break;
          }
        }
      }
    }
    // No hope for a (better) match at greater error levels.
    if (match_bitapScore_(d + 1, loc) > score_threshold) {
      break;
    }
    last_rd = rd;
  }
  return best_loc;
};


/**
 * Initialise the alphabet for the Bitap algorithm.
 * @param {string} pattern The text to encode.
 * @return {!Object} Hash of character locations.
 * @private
 */
diff_match_patch.prototype.match_alphabet_ = function(pattern) {
  var s = {};
  for (var i = 0; i < pattern.length; i++) {
    s[pattern.charAt(i)] = 0;
  }
  for (var i = 0; i < pattern.length; i++) {
    s[pattern.charAt(i)] |= 1 << (pattern.length - i - 1);
  }
  return s;
};


//  PATCH FUNCTIONS


/**
 * Increase the context until it is unique,
 * but don't let the pattern expand beyond Match_MaxBits.
 * @param {!diff_match_patch.patch_obj} patch The patch to grow.
 * @param {string} text Source text.
 * @private
 */
diff_match_patch.prototype.patch_addContext_ = function(patch, text) {
  if (text.length == 0) {
    return;
  }
  var pattern = text.substring(patch.start2, patch.start2 + patch.length1);
  var padding = 0;

  // Look for the first and last matches of pattern in text.  If two different
  // matches are found, increase the pattern length.
  while (text.indexOf(pattern) != text.lastIndexOf(pattern) &&
         pattern.length < this.Match_MaxBits - this.Patch_Margin -
         this.Patch_Margin) {
    padding += this.Patch_Margin;
    pattern = text.substring(patch.start2 - padding,
                             patch.start2 + patch.length1 + padding);
  }
  // Add one chunk for good luck.
  padding += this.Patch_Margin;

  // Add the prefix.
  var prefix = text.substring(patch.start2 - padding, patch.start2);
  if (prefix) {
    patch.diffs.unshift([DIFF_EQUAL, prefix]);
  }
  // Add the suffix.
  var suffix = text.substring(patch.start2 + patch.length1,
                              patch.start2 + patch.length1 + padding);
  if (suffix) {
    patch.diffs.push([DIFF_EQUAL, suffix]);
  }

  // Roll back the start points.
  patch.start1 -= prefix.length;
  patch.start2 -= prefix.length;
  // Extend the lengths.
  patch.length1 += prefix.length + suffix.length;
  patch.length2 += prefix.length + suffix.length;
};


/**
 * Compute a list of patches to turn text1 into text2.
 * Use diffs if provided, otherwise compute it ourselves.
 * There are four ways to call this function, depending on what data is
 * available to the caller:
 * Method 1:
 * a = text1, b = text2
 * Method 2:
 * a = diffs
 * Method 3 (optimal):
 * a = text1, b = diffs
 * Method 4 (deprecated, use method 3):
 * a = text1, b = text2, c = diffs
 *
 * @param {string|!Array.<!diff_match_patch.Diff>} a text1 (methods 1,3,4) or
 * Array of diff tuples for text1 to text2 (method 2).
 * @param {string|!Array.<!diff_match_patch.Diff>} opt_b text2 (methods 1,4) or
 * Array of diff tuples for text1 to text2 (method 3) or undefined (method 2).
 * @param {string|!Array.<!diff_match_patch.Diff>} opt_c Array of diff tuples
 * for text1 to text2 (method 4) or undefined (methods 1,2,3).
 * @return {!Array.<!diff_match_patch.patch_obj>} Array of Patch objects.
 */
diff_match_patch.prototype.patch_make = function(a, opt_b, opt_c) {
  var text1, diffs;
  if (typeof a == 'string' && typeof opt_b == 'string' &&
      typeof opt_c == 'undefined') {
    // Method 1: text1, text2
    // Compute diffs from text1 and text2.
    text1 = /** @type {string} */(a);
    diffs = this.diff_main(text1, /** @type {string} */(opt_b), true);
    if (diffs.length > 2) {
      this.diff_cleanupSemantic(diffs);
      this.diff_cleanupEfficiency(diffs);
    }
  } else if (a && typeof a == 'object' && typeof opt_b == 'undefined' &&
      typeof opt_c == 'undefined') {
    // Method 2: diffs
    // Compute text1 from diffs.
    diffs = /** @type {!Array.<!diff_match_patch.Diff>} */(a);
    text1 = this.diff_text1(diffs);
  } else if (typeof a == 'string' && opt_b && typeof opt_b == 'object' &&
      typeof opt_c == 'undefined') {
    // Method 3: text1, diffs
    text1 = /** @type {string} */(a);
    diffs = /** @type {!Array.<!diff_match_patch.Diff>} */(opt_b);
  } else if (typeof a == 'string' && typeof opt_b == 'string' &&
      opt_c && typeof opt_c == 'object') {
    // Method 4: text1, text2, diffs
    // text2 is not used.
    text1 = /** @type {string} */(a);
    diffs = /** @type {!Array.<!diff_match_patch.Diff>} */(opt_c);
  } else {
    throw new Error('Unknown call format to patch_make.');
  }

  if (diffs.length === 0) {
    return [];  // Get rid of the null case.
  }
  var patches = [];
  var patch = new diff_match_patch.patch_obj();
  var patchDiffLength = 0;  // Keeping our own length var is faster in JS.
  var char_count1 = 0;  // Number of characters into the text1 string.
  var char_count2 = 0;  // Number of characters into the text2 string.
  // Start with text1 (prepatch_text) and apply the diffs until we arrive at
  // text2 (postpatch_text).  We recreate the patches one by one to determine
  // context info.
  var prepatch_text = text1;
  var postpatch_text = text1;
  for (var x = 0; x < diffs.length; x++) {
    var diff_type = diffs[x][0];
    var diff_text = diffs[x][1];

    if (!patchDiffLength && diff_type !== DIFF_EQUAL) {
      // A new patch starts here.
      patch.start1 = char_count1;
      patch.start2 = char_count2;
    }

    switch (diff_type) {
      case DIFF_INSERT:
        patch.diffs[patchDiffLength++] = diffs[x];
        patch.length2 += diff_text.length;
        postpatch_text = postpatch_text.substring(0, char_count2) + diff_text +
                         postpatch_text.substring(char_count2);
        break;
      case DIFF_DELETE:
        patch.length1 += diff_text.length;
        patch.diffs[patchDiffLength++] = diffs[x];
        postpatch_text = postpatch_text.substring(0, char_count2) +
                         postpatch_text.substring(char_count2 +
                             diff_text.length);
        break;
      case DIFF_EQUAL:
        if (diff_text.length <= 2 * this.Patch_Margin &&
            patchDiffLength && diffs.length != x + 1) {
          // Small equality inside a patch.
          patch.diffs[patchDiffLength++] = diffs[x];
          patch.length1 += diff_text.length;
          patch.length2 += diff_text.length;
        } else if (diff_text.length >= 2 * this.Patch_Margin) {
          // Time for a new patch.
          if (patchDiffLength) {
            this.patch_addContext_(patch, prepatch_text);
            patches.push(patch);
            patch = new diff_match_patch.patch_obj();
            patchDiffLength = 0;
            // Unlike Unidiff, our patch lists have a rolling context.
            // http://code.google.com/p/google-diff-match-patch/wiki/Unidiff
            // Update prepatch text & pos to reflect the application of the
            // just completed patch.
            prepatch_text = postpatch_text;
            char_count1 = char_count2;
          }
        }
        break;
    }

    // Update the current character count.
    if (diff_type !== DIFF_INSERT) {
      char_count1 += diff_text.length;
    }
    if (diff_type !== DIFF_DELETE) {
      char_count2 += diff_text.length;
    }
  }
  // Pick up the leftover patch if not empty.
  if (patchDiffLength) {
    this.patch_addContext_(patch, prepatch_text);
    patches.push(patch);
  }

  return patches;
};


/**
 * Given an array of patches, return another array that is identical.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 * @return {!Array.<!diff_match_patch.patch_obj>} Array of Patch objects.
 */
diff_match_patch.prototype.patch_deepCopy = function(patches) {
  // Making deep copies is hard in JavaScript.
  var patchesCopy = [];
  for (var x = 0; x < patches.length; x++) {
    var patch = patches[x];
    var patchCopy = new diff_match_patch.patch_obj();
    patchCopy.diffs = [];
    for (var y = 0; y < patch.diffs.length; y++) {
      patchCopy.diffs[y] = patch.diffs[y].slice();
    }
    patchCopy.start1 = patch.start1;
    patchCopy.start2 = patch.start2;
    patchCopy.length1 = patch.length1;
    patchCopy.length2 = patch.length2;
    patchesCopy[x] = patchCopy;
  }
  return patchesCopy;
};


/**
 * Merge a set of patches onto the text.  Return a patched text, as well
 * as a list of true/false values indicating which patches were applied.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 * @param {string} text Old text.
 * @return {!Array.<string|!Array.<boolean>>} Two element Array, containing the
 *      new text and an array of boolean values.
 */
diff_match_patch.prototype.patch_apply = function(patches, text) {
  if (patches.length == 0) {
    return [text, []];
  }

  // Deep copy the patches so that no changes are made to originals.
  patches = this.patch_deepCopy(patches);

  var nullPadding = this.patch_addPadding(patches);
  text = nullPadding + text + nullPadding;

  this.patch_splitMax(patches);
  // delta keeps track of the offset between the expected and actual location
  // of the previous patch.  If there are patches expected at positions 10 and
  // 20, but the first patch was found at 12, delta is 2 and the second patch
  // has an effective expected position of 22.
  var delta = 0;
  var results = [];
  for (var x = 0; x < patches.length; x++) {
    var expected_loc = patches[x].start2 + delta;
    var text1 = this.diff_text1(patches[x].diffs);
    var start_loc;
    var end_loc = -1;
    if (text1.length > this.Match_MaxBits) {
      // patch_splitMax will only provide an oversized pattern in the case of
      // a monster delete.
      start_loc = this.match_main(text, text1.substring(0, this.Match_MaxBits),
                                  expected_loc);
      if (start_loc != -1) {
        end_loc = this.match_main(text,
            text1.substring(text1.length - this.Match_MaxBits),
            expected_loc + text1.length - this.Match_MaxBits);
        if (end_loc == -1 || start_loc >= end_loc) {
          // Can't find valid trailing context.  Drop this patch.
          start_loc = -1;
        }
      }
    } else {
      start_loc = this.match_main(text, text1, expected_loc);
    }
    if (start_loc == -1) {
      // No match found.  :(
      results[x] = false;
      // Subtract the delta for this failed patch from subsequent patches.
      delta -= patches[x].length2 - patches[x].length1;
    } else {
      // Found a match.  :)
      results[x] = true;
      delta = start_loc - expected_loc;
      var text2;
      if (end_loc == -1) {
        text2 = text.substring(start_loc, start_loc + text1.length);
      } else {
        text2 = text.substring(start_loc, end_loc + this.Match_MaxBits);
      }
      if (text1 == text2) {
        // Perfect match, just shove the replacement text in.
        text = text.substring(0, start_loc) +
               this.diff_text2(patches[x].diffs) +
               text.substring(start_loc + text1.length);
      } else {
        // Imperfect match.  Run a diff to get a framework of equivalent
        // indices.
        var diffs = this.diff_main(text1, text2, false);
        if (text1.length > this.Match_MaxBits &&
            this.diff_levenshtein(diffs) / text1.length >
            this.Patch_DeleteThreshold) {
          // The end points match, but the content is unacceptably bad.
          results[x] = false;
        } else {
          this.diff_cleanupSemanticLossless(diffs);
          var index1 = 0;
          var index2;
          for (var y = 0; y < patches[x].diffs.length; y++) {
            var mod = patches[x].diffs[y];
            if (mod[0] !== DIFF_EQUAL) {
              index2 = this.diff_xIndex(diffs, index1);
            }
            if (mod[0] === DIFF_INSERT) {  // Insertion
              text = text.substring(0, start_loc + index2) + mod[1] +
                     text.substring(start_loc + index2);
            } else if (mod[0] === DIFF_DELETE) {  // Deletion
              text = text.substring(0, start_loc + index2) +
                     text.substring(start_loc + this.diff_xIndex(diffs,
                         index1 + mod[1].length));
            }
            if (mod[0] !== DIFF_DELETE) {
              index1 += mod[1].length;
            }
          }
        }
      }
    }
  }
  // Strip the padding off.
  text = text.substring(nullPadding.length, text.length - nullPadding.length);
  return [text, results];
};


/**
 * Add some padding on text start and end so that edges can match something.
 * Intended to be called only from within patch_apply.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 * @return {string} The padding string added to each side.
 */
diff_match_patch.prototype.patch_addPadding = function(patches) {
  var paddingLength = this.Patch_Margin;
  var nullPadding = '';
  for (var x = 1; x <= paddingLength; x++) {
    nullPadding += String.fromCharCode(x);
  }

  // Bump all the patches forward.
  for (var x = 0; x < patches.length; x++) {
    patches[x].start1 += paddingLength;
    patches[x].start2 += paddingLength;
  }

  // Add some padding on start of first diff.
  var patch = patches[0];
  var diffs = patch.diffs;
  if (diffs.length == 0 || diffs[0][0] != DIFF_EQUAL) {
    // Add nullPadding equality.
    diffs.unshift([DIFF_EQUAL, nullPadding]);
    patch.start1 -= paddingLength;  // Should be 0.
    patch.start2 -= paddingLength;  // Should be 0.
    patch.length1 += paddingLength;
    patch.length2 += paddingLength;
  } else if (paddingLength > diffs[0][1].length) {
    // Grow first equality.
    var extraLength = paddingLength - diffs[0][1].length;
    diffs[0][1] = nullPadding.substring(diffs[0][1].length) + diffs[0][1];
    patch.start1 -= extraLength;
    patch.start2 -= extraLength;
    patch.length1 += extraLength;
    patch.length2 += extraLength;
  }

  // Add some padding on end of last diff.
  patch = patches[patches.length - 1];
  diffs = patch.diffs;
  if (diffs.length == 0 || diffs[diffs.length - 1][0] != DIFF_EQUAL) {
    // Add nullPadding equality.
    diffs.push([DIFF_EQUAL, nullPadding]);
    patch.length1 += paddingLength;
    patch.length2 += paddingLength;
  } else if (paddingLength > diffs[diffs.length - 1][1].length) {
    // Grow last equality.
    var extraLength = paddingLength - diffs[diffs.length - 1][1].length;
    diffs[diffs.length - 1][1] += nullPadding.substring(0, extraLength);
    patch.length1 += extraLength;
    patch.length2 += extraLength;
  }

  return nullPadding;
};


/**
 * Look through the patches and break up any which are longer than the maximum
 * limit of the match algorithm.
 * Intended to be called only from within patch_apply.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 */
diff_match_patch.prototype.patch_splitMax = function(patches) {
  var patch_size = this.Match_MaxBits;
  for (var x = 0; x < patches.length; x++) {
    if (patches[x].length1 <= patch_size) {
      continue;
    }
    var bigpatch = patches[x];
    // Remove the big old patch.
    patches.splice(x--, 1);
    var start1 = bigpatch.start1;
    var start2 = bigpatch.start2;
    var precontext = '';
    while (bigpatch.diffs.length !== 0) {
      // Create one of several smaller patches.
      var patch = new diff_match_patch.patch_obj();
      var empty = true;
      patch.start1 = start1 - precontext.length;
      patch.start2 = start2 - precontext.length;
      if (precontext !== '') {
        patch.length1 = patch.length2 = precontext.length;
        patch.diffs.push([DIFF_EQUAL, precontext]);
      }
      while (bigpatch.diffs.length !== 0 &&
             patch.length1 < patch_size - this.Patch_Margin) {
        var diff_type = bigpatch.diffs[0][0];
        var diff_text = bigpatch.diffs[0][1];
        if (diff_type === DIFF_INSERT) {
          // Insertions are harmless.
          patch.length2 += diff_text.length;
          start2 += diff_text.length;
          patch.diffs.push(bigpatch.diffs.shift());
          empty = false;
        } else if (diff_type === DIFF_DELETE && patch.diffs.length == 1 &&
                   patch.diffs[0][0] == DIFF_EQUAL &&
                   diff_text.length > 2 * patch_size) {
          // This is a large deletion.  Let it pass in one chunk.
          patch.length1 += diff_text.length;
          start1 += diff_text.length;
          empty = false;
          patch.diffs.push([diff_type, diff_text]);
          bigpatch.diffs.shift();
        } else {
          // Deletion or equality.  Only take as much as we can stomach.
          diff_text = diff_text.substring(0,
              patch_size - patch.length1 - this.Patch_Margin);
          patch.length1 += diff_text.length;
          start1 += diff_text.length;
          if (diff_type === DIFF_EQUAL) {
            patch.length2 += diff_text.length;
            start2 += diff_text.length;
          } else {
            empty = false;
          }
          patch.diffs.push([diff_type, diff_text]);
          if (diff_text == bigpatch.diffs[0][1]) {
            bigpatch.diffs.shift();
          } else {
            bigpatch.diffs[0][1] =
                bigpatch.diffs[0][1].substring(diff_text.length);
          }
        }
      }
      // Compute the head context for the next patch.
      precontext = this.diff_text2(patch.diffs);
      precontext =
          precontext.substring(precontext.length - this.Patch_Margin);
      // Append the end context for this patch.
      var postcontext = this.diff_text1(bigpatch.diffs)
                            .substring(0, this.Patch_Margin);
      if (postcontext !== '') {
        patch.length1 += postcontext.length;
        patch.length2 += postcontext.length;
        if (patch.diffs.length !== 0 &&
            patch.diffs[patch.diffs.length - 1][0] === DIFF_EQUAL) {
          patch.diffs[patch.diffs.length - 1][1] += postcontext;
        } else {
          patch.diffs.push([DIFF_EQUAL, postcontext]);
        }
      }
      if (!empty) {
        patches.splice(++x, 0, patch);
      }
    }
  }
};


/**
 * Take a list of patches and return a textual representation.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 * @return {string} Text representation of patches.
 */
diff_match_patch.prototype.patch_toText = function(patches) {
  var text = [];
  for (var x = 0; x < patches.length; x++) {
    text[x] = patches[x];
  }
  return text.join('');
};


/**
 * Parse a textual representation of patches and return a list of Patch objects.
 * @param {string} textline Text representation of patches.
 * @return {!Array.<!diff_match_patch.patch_obj>} Array of Patch objects.
 * @throws {!Error} If invalid input.
 */
diff_match_patch.prototype.patch_fromText = function(textline) {
  var patches = [];
  if (!textline) {
    return patches;
  }
  var text = textline.split('\n');
  var textPointer = 0;
  var patchHeader = /^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@$/;
  while (textPointer < text.length) {
    var m = text[textPointer].match(patchHeader);
    if (!m) {
      throw new Error('Invalid patch string: ' + text[textPointer]);
    }
    var patch = new diff_match_patch.patch_obj();
    patches.push(patch);
    patch.start1 = parseInt(m[1], 10);
    if (m[2] === '') {
      patch.start1--;
      patch.length1 = 1;
    } else if (m[2] == '0') {
      patch.length1 = 0;
    } else {
      patch.start1--;
      patch.length1 = parseInt(m[2], 10);
    }

    patch.start2 = parseInt(m[3], 10);
    if (m[4] === '') {
      patch.start2--;
      patch.length2 = 1;
    } else if (m[4] == '0') {
      patch.length2 = 0;
    } else {
      patch.start2--;
      patch.length2 = parseInt(m[4], 10);
    }
    textPointer++;

    while (textPointer < text.length) {
      var sign = text[textPointer].charAt(0);
      try {
        var line = decodeURI(text[textPointer].substring(1));
      } catch (ex) {
        // Malformed URI sequence.
        throw new Error('Illegal escape in patch_fromText: ' + line);
      }
      if (sign == '-') {
        // Deletion.
        patch.diffs.push([DIFF_DELETE, line]);
      } else if (sign == '+') {
        // Insertion.
        patch.diffs.push([DIFF_INSERT, line]);
      } else if (sign == ' ') {
        // Minor equality.
        patch.diffs.push([DIFF_EQUAL, line]);
      } else if (sign == '@') {
        // Start of next patch.
        break;
      } else if (sign === '') {
        // Blank line?  Whatever.
      } else {
        // WTF?
        throw new Error('Invalid patch mode "' + sign + '" in: ' + line);
      }
      textPointer++;
    }
  }
  return patches;
};


/**
 * Class representing one patch operation.
 * @constructor
 */
diff_match_patch.patch_obj = function() {
  /** @type {!Array.<!diff_match_patch.Diff>} */
  this.diffs = [];
  /** @type {?number} */
  this.start1 = null;
  /** @type {?number} */
  this.start2 = null;
  /** @type {number} */
  this.length1 = 0;
  /** @type {number} */
  this.length2 = 0;
};


/**
 * Emmulate GNU diff's format.
 * Header: @@ -382,8 +481,9 @@
 * Indicies are printed as 1-based, not 0-based.
 * @return {string} The GNU diff string.
 */
diff_match_patch.patch_obj.prototype.toString = function() {
  var coords1, coords2;
  if (this.length1 === 0) {
    coords1 = this.start1 + ',0';
  } else if (this.length1 == 1) {
    coords1 = this.start1 + 1;
  } else {
    coords1 = (this.start1 + 1) + ',' + this.length1;
  }
  if (this.length2 === 0) {
    coords2 = this.start2 + ',0';
  } else if (this.length2 == 1) {
    coords2 = this.start2 + 1;
  } else {
    coords2 = (this.start2 + 1) + ',' + this.length2;
  }
  var text = ['@@ -' + coords1 + ' +' + coords2 + ' @@\n'];
  var op;
  // Escape the body of the patch with %xx notation.
  for (var x = 0; x < this.diffs.length; x++) {
    switch (this.diffs[x][0]) {
      case DIFF_INSERT:
        op = '+';
        break;
      case DIFF_DELETE:
        op = '-';
        break;
      case DIFF_EQUAL:
        op = ' ';
        break;
    }
    text[x + 1] = op + encodeURI(this.diffs[x][1]) + '\n';
  }
  return text.join('').replace(/%20/g, ' ');
};


// Export these global variables so that they survive Google's JS compiler.
// In a browser, 'this' will be 'window'.
// Users of node.js should 'require' the uncompressed version since Google's
// JS compiler may break the following exports for non-browser environments.
this['diff_match_patch'] = diff_match_patch;
this['DIFF_DELETE'] = DIFF_DELETE;
this['DIFF_INSERT'] = DIFF_INSERT;
this['DIFF_EQUAL'] = DIFF_EQUAL;
jot_modules['googlediff'] = { exports: diff_match_patch };
