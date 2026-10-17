// Checks the homepage grid packer against the real project list.
// Run with: node test/grid-pack.test.js
'use strict';
var assert = require('assert');
var GridPack = require('../js/grid-pack.js');

// Newest first, as on the homepage: [name, photo aspect, tier]
var PROJECTS = [
	['sewing-table', 0.75, 'S'],
	['thesis', 1.14, 'L'],
	['gooey', 1.57, 'M'],
	['bodice', 2.15, 'S'],
	['trio', 1.50, 'L'],
	['burns', 1.50, 'XL'],
	['burns-link', 1.78, 'M'],
	['good', 1.00, 'XL'],
	['web', 1.33, 'M'],
	['tension', 1.00, 'XL'],
	['abLED6', 1.34, 'S'],
	['abLED5', 0.75, 'M'],
	['nixie', 1.34, 'M'],
	['tea', 0.67, 'M'],
	['abLED5pcb', 0.81, 'S'],
	['charger', 1.00, 'S'],
	['fpga', 1.34, 'M'],
	['suspender', 1.00, 'M'],
	['poem', 1.00, 'L'],
	['arch', 1.00, 'S'],
	['alarm', 1.33, 'M'],
	['abLED1', 1.00, 'S'],
	['tessa', 1.34, 'M'],
	['omnichord', 0.89, 'S'],
	['ewi', 1.00, 'S']
];

var tiles = PROJECTS.map(function(p) { return { aspect: p[1], tier: p[2] }; });
var verbose = process.argv.indexOf('-v') > -1;

[12, 3, 2].forEach(function(cols) {
	var t0 = Date.now();
	var result = GridPack.pack(tiles, cols);
	var ms = Date.now() - t0;
	var cells = result.rows * cols;

	// Every tile placed, inside the grid, with no overlaps
	var grid = [];
	for (var y = 0; y < result.rows; y++) grid.push(new Array(cols).fill('.'));
	result.placements.forEach(function(p, i) {
		assert.ok(p, cols + ' cols: tile ' + PROJECTS[i][0] + ' not placed');
		assert.ok(p.col >= 0 && p.col + p.w <= cols, cols + ' cols: ' + PROJECTS[i][0] + ' out of bounds');
		for (var y = p.row; y < p.row + p.h; y++) {
			for (var x = p.col; x < p.col + p.w; x++) {
				assert.strictEqual(grid[y][x], '.', cols + ' cols: overlap at ' + x + ',' + y);
				grid[y][x] = String.fromCharCode(65 + i);
			}
		}
	});

	// Reading order (top-left corners, row-major) stays within MAX_SHIFT of date order
	var reading = result.placements
		.map(function(p, i) { return { i: i, key: p.row * cols + p.col }; })
		.sort(function(a, b) { return a.key - b.key; })
		.map(function(t) { return t.i; });
	var maxShift = 0;
	reading.forEach(function(i, pos) { maxShift = Math.max(maxShift, Math.abs(i - pos)); });
	assert.ok(maxShift <= GridPack.MAX_SHIFT, cols + ' cols: a tile moved ' + maxShift + ' places');

	// Portrait photos never get landscape tiles, or the reverse
	result.placements.forEach(function(p, i) {
		var a = PROJECTS[i][1], t = p.w / p.h;
		if (cols < 3) return; // phone grid may fall back for panoramas
		assert.ok(!(a < 0.9 && t > 1) && !(a > 1.11 && t < 1),
			cols + ' cols: ' + PROJECTS[i][0] + ' (' + a + ') got a ' + p.w + 'x' + p.h + ' tile');
	});

	console.log(cols + ' cols: ' + result.rows + ' rows, ' + result.holes + ' holes, ' +
		result.bottom + ' empty along the bottom (' + (100 * (result.holes + result.bottom) / cells).toFixed(1) +
		'%), max shift ' + maxShift + ', ' + ms + ' ms');
	if (verbose) {
		console.log(grid.map(function(r) { return '  ' + r.join(''); }).join('\n'));
		result.placements.forEach(function(p, i) {
			console.log('  ' + String.fromCharCode(65 + i) + ' ' + PROJECTS[i][0] + ' ' + PROJECTS[i][2] +
				' photo ' + PROJECTS[i][1] + ' -> ' + p.w + 'x' + p.h);
		});
	}

	// No holes inside the grid
	assert.strictEqual(result.holes, 0, cols + ' cols: ' + result.holes + ' empty cells inside the grid');
});
console.log('ok');
