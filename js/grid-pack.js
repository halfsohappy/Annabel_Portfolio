//
//
// Grid Pack — places the homepage project tiles
//
// Tiles go on a grid of square cells, newest first, always filling the
// top-left-most empty cell. Each tile has a size tier (S / M / L / XL) that
// allows a range of areas, and its photo's aspect ratio limits which shapes it
// may take. A beam search picks, for each hole, one of the next few tiles and
// a shape for it, trading off empty cells, cropping, and distance from date
// order. No tile ever moves more than MAX_SHIFT places from date order.
//
// Works in the browser (window.GridPack) and in Node (module.exports), so the
// layout can be tested without a browser.
//
//
(function (root) {
	'use strict';

	// Allowed tile areas (in cells) per tier, keyed by column count. The table
	// with the largest key not above the actual column count is used.
	var TIERS = {
		2:  { S: [1, 1], M: [1, 1], L: [1, 2],  XL: [2, 4] },
		3:  { S: [1, 1], M: [1, 2], L: [2, 4],  XL: [4, 6] },
		12: { S: [1, 2], M: [4, 6], L: [9, 12], XL: [16, 25] }
	};

	// grid_width values that name a tier
	var TIER_NAMES = { 'auto-small': 'S', 'auto-medium': 'M', 'auto-large': 'L', 'auto-xl': 'XL', 'auto': 'M' };

	// Fixed grid_width / grid_height numbers are desktop spans; they only apply
	// at this many columns or more. Narrower grids use the tile's tier instead.
	var LOCK_MIN_COLS = 12;

	var MAX_SHIFT = 2;      // furthest a tile may move from date order
	var MAX_STRETCH = 1.35; // tile shape may differ from the photo's by this factor
	var BEAM_WIDTH = 200;

	var COST = {
		gap: 3,       // per empty cell inside the grid
		bottom: 1,    // per empty cell along the ragged bottom edge
		crop: 3,      // per unit of |ln(tile aspect / photo aspect)|
		offTier: 4,   // per unit of ln(area outside the tier's range)
		inTier: 0.5,  // per unit of ln(area away from the tier's middle)
		shift: 0.8    // per place moved from date order
	};

	// "16:9", "4:3" or "1.78" -> number (null if missing or invalid)
	function parseAspectRatio(val) {
		if (val === null || val === undefined || val === '') return null;
		val = String(val);
		if (val.indexOf(':') > -1) {
			var parts = val.split(':');
			var a = parseFloat(parts[0]), b = parseFloat(parts[1]);
			return (a > 0 && b > 0) ? a / b : null;
		}
		var f = parseFloat(val);
		return (f > 0) ? f : null;
	}

	function tierTable(cols) {
		var best = null;
		Object.keys(TIERS).forEach(function(k) {
			k = +k;
			if (k <= cols && (best === null || k > best)) best = k;
		});
		return TIERS[best === null ? 2 : best];
	}

	// Tier for a tile that only has a fixed desktop span, judged by its area
	function tierForArea(area) {
		if (area >= 16) return 'XL';
		if (area >= 8) return 'L';
		if (area >= 3) return 'M';
		return 'S';
	}

	// Whether a tile of aspect t may show this photo. Portraits never become
	// landscape (or the reverse), and no tile strays more than MAX_STRETCH from
	// the photo's shape. A tile's own min/max aspect replaces these rules.
	function shapeAllowed(t, tile) {
		var eps = 1e-6;
		if (tile.minAspect || tile.maxAspect) {
			return (!tile.minAspect || t >= tile.minAspect - eps) &&
				(!tile.maxAspect || t <= tile.maxAspect + eps);
		}
		var a = tile.aspect;
		var r = t / a;
		if (r < 1 / MAX_STRETCH - eps || r > MAX_STRETCH + eps) return false;
		if (a < 0.9 && t > 1 + eps) return false;
		if (a > 1.11 && t < 1 - eps) return false;
		return true;
	}

	function shapeCost(w, h, tile, range) {
		var area = w * h;
		var cost = COST.crop * Math.abs(Math.log((w / h) / tile.aspect));
		if (area < range[0]) cost += COST.offTier * Math.log(range[0] / area);
		if (area > range[1]) cost += COST.offTier * Math.log(area / range[1]);
		cost += COST.inTier * Math.abs(Math.log(area / Math.sqrt(range[0] * range[1])));
		return cost;
	}

	// Every shape a tile may take at this column count, with its cost
	function shapesFor(tile, cols) {
		var lock = cols >= LOCK_MIN_COLS ? tile.lock : null;
		var tier = tile.tier;
		if (!tier && tile.lock) {
			var lw = tile.lock.w || Math.max(1, Math.round(tile.lock.h * tile.aspect));
			var lh = tile.lock.h || Math.max(1, Math.round(tile.lock.w / tile.aspect));
			tier = tierForArea(lw * lh);
		}
		var range = tierTable(cols)[tier || 'M'];

		if (lock && lock.w && lock.h) {
			var fw = Math.min(lock.w, cols);
			return [{ w: fw, h: lock.h, cost: shapeCost(fw, lock.h, tile, range) }];
		}

		var minArea = Math.max(1, Math.floor(range[0] / 2));
		var maxArea = range[1] * 2;
		var shapes = [];
		for (var w = 1; w <= cols; w++) {
			if (lock && lock.w && w !== Math.min(lock.w, cols)) continue;
			for (var h = 1; w * h <= maxArea; h++) {
				if (lock && lock.h && h !== lock.h) continue;
				if (w * h < minArea) continue;
				if (!shapeAllowed(w / h, tile)) continue;
				shapes.push({ w: w, h: h, cost: shapeCost(w, h, tile, range) });
			}
		}

		// Nothing satisfies the rules (e.g. a panorama on a 2-column phone grid):
		// fall back to the closest-shaped tile in the tier's range.
		if (!shapes.length) {
			var best = null;
			for (var bw = 1; bw <= cols; bw++) {
				if (lock && lock.w && bw !== Math.min(lock.w, cols)) continue;
				for (var bh = 1; bw * bh <= Math.max(range[1], bw); bh++) {
					if (lock && lock.h && bh !== lock.h) continue;
					var c = shapeCost(bw, bh, tile, range);
					if (!best || c < best.cost) best = { w: bw, h: bh, cost: c };
				}
			}
			shapes.push(best || { w: 1, h: 1, cost: 0 });
		}

		shapes.sort(function(a, b) { return a.cost - b.cost; });
		return shapes;
	}

	function bit(c) { return 1 << c; }

	function rowBits(rows, r) { return rows[r] || 0; }

	function rectFree(rows, r, c, w, h) {
		var mask = ((1 << w) - 1) << c;
		for (var y = r; y < r + h; y++) {
			if (rowBits(rows, y) & mask) return false;
		}
		return true;
	}

	// First empty cell at or after (r, c), row-major
	function nextFree(rows, r, c, cols) {
		while (rowBits(rows, r) & bit(c)) {
			c++;
			if (c >= cols) { c = 0; r++; }
		}
		return { r: r, c: c };
	}

	function popcount(n) {
		var count = 0;
		while (n) { count += n & 1; n >>>= 1; }
		return count;
	}

	// The tiles that may fill the next hole: the first few unplaced ones, or
	// only the oldest unplaced tile once MAX_SHIFT tiles have jumped it.
	// state.ahead has bit k set when tile lo + 1 + k is already placed.
	function candidates(state, n) {
		if (popcount(state.ahead) >= MAX_SHIFT) return [state.lo];
		var out = [];
		for (var j = state.lo; j < n && out.length <= MAX_SHIFT; j++) {
			if (j === state.lo || !(state.ahead & bit(j - state.lo - 1))) out.push(j);
		}
		return out;
	}

	function markPlaced(state, j) {
		if (j > state.lo) return { lo: state.lo, ahead: state.ahead | bit(j - state.lo - 1) };
		var m = 0;
		while ((state.ahead >>> m) & 1) m++;
		return { lo: state.lo + 1 + m, ahead: state.ahead >>> (m + 1) };
	}

	// Children of a state: every way to fill its first empty cell with one of
	// the candidate tiles. When nothing fits, the cell is left empty.
	function expand(state, shapes, cols, n) {
		var rows = state.rows;
		var cur = { r: state.r, c: state.c };
		var cost = state.cost;
		var copied = false;

		for (;;) {
			cur = nextFree(rows, cur.r, cur.c, cols);
			var run = 0;
			while (cur.c + run < cols && !(rowBits(rows, cur.r) & bit(cur.c + run))) run++;

			var children = [];
			candidates(state, n).forEach(function(j) {
				shapes[j].forEach(function(s) {
					if (s.w > run || !rectFree(rows, cur.r, cur.c, s.w, s.h)) return;
					var next = rows.slice();
					var mask = ((1 << s.w) - 1) << cur.c;
					for (var y = cur.r; y < cur.r + s.h; y++) next[y] = rowBits(next, y) | mask;
					var placed = markPlaced(state, j);
					children.push({
						rows: next,
						r: cur.r,
						c: cur.c,
						lo: placed.lo,
						ahead: placed.ahead,
						count: state.count + 1,
						cost: cost + s.cost + COST.shift * Math.abs(j - state.count),
						last: { prev: state.last, i: j, row: cur.r, col: cur.c, w: s.w, h: s.h }
					});
				});
			});
			if (children.length) return children;

			if (!copied) { rows = rows.slice(); copied = true; }
			rows[cur.r] = rowBits(rows, cur.r) | bit(cur.c);
			cost += COST.gap;
		}
	}

	function stateKey(s) {
		return s.lo + '|' + s.ahead + '|' + s.rows.join(',');
	}

	function tierRangeFor(tile, cols) {
		var tier = tile.tier;
		if (!tier && tile.lock) {
			var lw = tile.lock.w || Math.max(1, Math.round(tile.lock.h * tile.aspect));
			var lh = tile.lock.h || Math.max(1, Math.round(tile.lock.w / tile.aspect));
			tier = tierForArea(lw * lh);
		}
		return tierTable(cols)[tier || 'M'];
	}

	// Empty cells within the grid's height, split into holes (something sits
	// below them) and the ragged bottom edge (nothing below).
	function countEmpty(placements, cols) {
		var height = 0;
		placements.forEach(function(p) { height = Math.max(height, p.row + p.h); });
		var filled = [];
		for (var y = 0; y < height; y++) filled.push(new Array(cols).fill(false));
		placements.forEach(function(p) {
			for (var y = p.row; y < p.row + p.h; y++) {
				for (var x = p.col; x < p.col + p.w; x++) filled[y][x] = true;
			}
		});
		var holes = 0, bottom = 0;
		for (var x = 0; x < cols; x++) {
			var lowest = -1;
			for (var y2 = 0; y2 < height; y2++) if (filled[y2][x]) lowest = y2;
			for (var y3 = 0; y3 < height; y3++) {
				if (filled[y3][x]) continue;
				if (y3 < lowest) holes++; else bottom++;
			}
		}
		return { rows: height, holes: holes, bottom: bottom, filled: filled };
	}

	function scoreLayout(placements, tiles, cols, order) {
		var cost = 0;
		placements.forEach(function(p, i) {
			cost += shapeCost(p.w, p.h, tiles[i], tierRangeFor(tiles[i], cols));
		});
		order.forEach(function(i, pos) { cost += COST.shift * Math.abs(i - pos); });
		var empty = countEmpty(placements, cols);
		return cost + COST.gap * empty.holes + COST.bottom * empty.bottom;
	}

	// Let tiles grow right or down into empty cells next to them, when the new
	// shape is still allowed and the fuller grid outweighs the extra crop.
	// Top-left corners stay put, so reading order is unchanged.
	function growIntoGaps(placements, tiles, cols) {
		var changed = true;
		while (changed) {
			changed = false;
			var empty = countEmpty(placements, cols);
			var filled = empty.filled;
			for (var i = 0; i < placements.length; i++) {
				var p = placements[i];
				var tile = tiles[i];
				if (cols >= LOCK_MIN_COLS && tile.lock) continue;
				var range = tierRangeFor(tile, cols);
				var growths = [];

				var x = p.col + p.w;
				if (x < cols) {
					var freeRight = true;
					for (var y = p.row; y < p.row + p.h; y++) if (filled[y][x]) freeRight = false;
					if (freeRight) growths.push({ w: p.w + 1, h: p.h, cells: p.h });
				}
				var yb = p.row + p.h;
				if (yb < empty.rows) {
					var freeDown = true;
					for (var xx = p.col; xx < p.col + p.w; xx++) if (filled[yb][xx]) freeDown = false;
					if (freeDown) growths.push({ w: p.w, h: p.h + 1, cells: p.w });
				}

				for (var g = 0; g < growths.length; g++) {
					var s = growths[g];
					if (s.w * s.h > range[1] * 1.5 || !shapeAllowed(s.w / s.h, tile)) continue;
					var extra = shapeCost(s.w, s.h, tile, range) - shapeCost(p.w, p.h, tile, range);
					if (extra >= s.cells * COST.bottom) continue;
					p.w = s.w;
					p.h = s.h;
					changed = true;
					break;
				}
				if (changed) break;
			}
		}
	}

	// tiles: [{ aspect, tier?, lock?: { w?, h? }, minAspect?, maxAspect? }] in
	// date order (newest first). Returns { placements: [{ col, row, w, h }] in
	// the same order (0-based cells), order: tile indices in reading order,
	// rows, holes, bottom }.
	function pack(tiles, cols) {
		var n = tiles.length;
		if (!n) return { placements: [], order: [], rows: 0, holes: 0, bottom: 0 };
		cols = Math.max(1, Math.min(cols, 30));

		var shapes = tiles.map(function(t) { return shapesFor(t, cols); });
		var beam = [{ rows: [], r: 0, c: 0, lo: 0, ahead: 0, count: 0, cost: 0, last: null }];

		for (var step = 0; step < n; step++) {
			var seen = {};
			var next = [];
			beam.forEach(function(state) {
				expand(state, shapes, cols, n).forEach(function(child) {
					var key = stateKey(child);
					if (seen[key] !== undefined && next[seen[key]].cost <= child.cost) return;
					if (seen[key] !== undefined) { next[seen[key]] = child; return; }
					seen[key] = next.length;
					next.push(child);
				});
			});
			next.sort(function(a, b) { return a.cost - b.cost; });
			beam = next.slice(0, BEAM_WIDTH);
		}

		var best = null;
		beam.forEach(function(state) {
			var placements = new Array(n);
			var order = [];
			for (var link = state.last; link; link = link.prev) {
				placements[link.i] = { col: link.col, row: link.row, w: link.w, h: link.h };
				order.unshift(link.i);
			}
			growIntoGaps(placements, tiles, cols);
			var cost = scoreLayout(placements, tiles, cols, order);
			if (!best || cost < best.cost) best = { placements: placements, order: order, cost: cost };
		});

		var empty = countEmpty(best.placements, cols);
		return {
			placements: best.placements,
			order: best.order,
			rows: empty.rows,
			holes: empty.holes,
			bottom: empty.bottom
		};
	}

	var GridPack = {
		pack: pack,
		shapesFor: shapesFor,
		shapeAllowed: shapeAllowed,
		parseAspectRatio: parseAspectRatio,
		TIER_NAMES: TIER_NAMES,
		MAX_SHIFT: MAX_SHIFT
	};

	if (typeof module !== 'undefined' && module.exports) module.exports = GridPack;
	else root.GridPack = GridPack;
})(this);
