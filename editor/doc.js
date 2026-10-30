// Reads and writes project/page source files for the page editor.
//
// A file splits into front matter and a body of blocks that match what the
// site renders: headings, text, lists, images, galleries, story timelines,
// videos, hidden notes. Every block keeps the exact source it came from and
// is written back unchanged unless its content changes, so opening and saving
// a file never reformats it. Anything the editor doesn't recognise becomes a
// "raw" block that passes through untouched.
//
// Pure functions only (no DOM), so it runs in the browser and under Node:
//   node test/editor-doc.test.js
(function (root, factory) {
	if (typeof module === 'object' && module.exports) {
		module.exports = factory();
	} else {
		root.EditorDoc = factory();
	}
}(typeof self !== 'undefined' ? self : this, function () {
	'use strict';

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Helpers

	function escapeHtml(s) {
		return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	function escapeAttr(s) {
		return escapeHtml(s).replace(/"/g, '&quot;');
	}

	function decodeEntities(s) {
		var named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
		return String(s).replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, function (m, e) {
			if (e[0] === '#') {
				var code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
				return isNaN(code) ? m : String.fromCodePoint(code);
			}
			return Object.prototype.hasOwnProperty.call(named, e.toLowerCase()) ? named[e.toLowerCase()] : m;
		});
	}

	// Attributes of an HTML tag, in source order: [{ name, value }]
	function parseAttrs(tag) {
		var attrs = [];
		var body = tag.replace(/^<\/?[a-zA-Z][\w-]*/, '').replace(/\/?>\s*$/, '');
		var re = /([^\s=\/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
		var m;
		while ((m = re.exec(body))) {
			var v = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : null;
			attrs.push({ name: m[1].toLowerCase(), value: v === null ? null : decodeEntities(v) });
		}
		return attrs;
	}

	function attr(attrs, name) {
		for (var i = 0; i < attrs.length; i++) {
			if (attrs[i].name === name) return attrs[i].value;
		}
		return null;
	}

	function imgTag(src, alt) {
		return '<img src="' + escapeAttr(src) + '"' + (alt ? ' alt="' + escapeAttr(alt) + '"' : '') + '>';
	}

	// Every <img ...> in an HTML fragment as { src, alt }
	function findImages(html) {
		var out = [];
		var re = /<img\b[^>]*>/gi;
		var m;
		while ((m = re.exec(html))) {
			var a = parseAttrs(m[0]);
			out.push({ src: attr(a, 'src') || '', alt: attr(a, 'alt') || '' });
		}
		return out;
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Front matter
	// Line-based so untouched keys, comments, quoting and ordering survive.
	// Each entry is a top-level `key:` line plus its indented/list lines.

	function FrontMatter(text) {
		this.entries = [];
		var lines = text.split('\n');
		var cur = null;
		for (var i = 0; i < lines.length; i++) {
			var line = lines[i];
			var m = /^([A-Za-z0-9_][\w-]*)\s*:(.*)$/.exec(line);
			if (m) {
				cur = { key: m[1], lines: [line] };
				this.entries.push(cur);
			} else if (cur && /^(\s+\S|-)/.test(line)) {
				cur.lines.push(line);
			} else {
				cur = null;
				this.entries.push({ key: null, lines: [line] });
			}
		}
	}

	FrontMatter.prototype.toString = function () {
		return this.entries.map(function (e) { return e.lines.join('\n'); }).join('\n');
	};

	FrontMatter.prototype.find = function (key) {
		for (var i = 0; i < this.entries.length; i++) {
			if (this.entries[i].key === key) return this.entries[i];
		}
		return null;
	};

	FrontMatter.prototype.has = function (key) {
		return !!this.find(key);
	};

	FrontMatter.prototype.keys = function () {
		return this.entries.filter(function (e) { return e.key; }).map(function (e) { return e.key; });
	};

	function stripComment(s) {
		// A # starts a comment only outside quotes and after whitespace
		var q = null;
		for (var i = 0; i < s.length; i++) {
			var c = s[i];
			if (q) {
				if (c === q) q = null;
			} else if (c === '"' || c === "'") {
				if (!s.slice(0, i).trim()) q = c;
			} else if (c === '#' && (i === 0 || /\s/.test(s[i - 1]))) {
				return s.slice(0, i);
			}
		}
		return s;
	}

	function quoteStyle(raw) {
		raw = raw.trim();
		if (raw[0] === "'") return 'single';
		if (raw[0] === '"') return 'double';
		return null;
	}

	function parseScalar(raw) {
		var s = stripComment(raw).trim();
		if (s === '' || s === '~' || /^null$/i.test(s)) return null;
		if (s[0] === "'" && s[s.length - 1] === "'" && s.length > 1) {
			return s.slice(1, -1).replace(/''/g, "'");
		}
		if (s[0] === '"' && s[s.length - 1] === '"' && s.length > 1) {
			return s.slice(1, -1).replace(/\\(u[0-9a-fA-F]{4}|.)/g, function (m, e) {
				if (e[0] === 'u') return String.fromCharCode(parseInt(e.slice(1), 16));
				return { n: '\n', t: '\t', '"': '"', '\\': '\\', '/': '/' }[e] || e;
			});
		}
		if (/^(true|yes|on)$/i.test(s)) return true;
		if (/^(false|no|off)$/i.test(s)) return false;
		return s;
	}

	FrontMatter.prototype.get = function (key) {
		var e = this.find(key);
		if (!e) return undefined;
		var rest = e.lines[0].replace(/^[^:]*:/, '');
		if (stripComment(rest).trim() !== '') {
			var first = stripComment(rest).trim();
			if (first === '|' || first === '>' || /^[|>][+-]?$/.test(first)) {
				return e.lines.slice(1).map(function (l) { return l.trim(); }).join(first[0] === '|' ? '\n' : ' ');
			}
			return parseScalar(rest);
		}
		var items = e.lines.slice(1).filter(function (l) { return /^\s*-(\s|$)/.test(l); });
		if (items.length) {
			return items.map(function (l) {
				var v = parseScalar(l.replace(/^\s*-/, ''));
				return v === null ? '' : String(v);
			});
		}
		return null;
	};

	function needsQuotes(s) {
		if (s === '') return true;
		if (/^\s|\s$/.test(s)) return true;
		if (/^[-?:,\[\]{}#&*!|>'"%@`]/.test(s)) return true;
		if (/: |:$| #/.test(s)) return true;
		if (/^(true|false|yes|no|on|off|null|~)$/i.test(s)) return true;
		if (/^[-+]?(\d[\d_]*)?\.?\d+([eE][-+]?\d+)?$/.test(s)) return true;
		if (/\n/.test(s)) return true;
		return false;
	}

	function quote(s, style) {
		s = String(s);
		if (style === 'plain' && !needsQuotes(s)) return s;
		if (style === 'double' || /\n/.test(s)) {
			return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
		}
		return "'" + s.replace(/'/g, "''") + "'";
	}

	// Writes a value: string, true (badge on), false/null (left blank),
	// or an array of strings (a YAML list). Returns true if anything changed.
	FrontMatter.prototype.set = function (key, value) {
		var cur = this.get(key);
		if (JSON.stringify(cur === undefined ? null : cur) === JSON.stringify(value === undefined ? null : value)) {
			return false;
		}
		var e = this.find(key);
		var oldRest = e ? e.lines[0].replace(/^[^:]*:/, '') : '';
		var lines;
		if (Array.isArray(value)) {
			var indent = '  ';
			var itemStyle = 'plain';
			if (e) {
				var firstItem = e.lines.slice(1).filter(function (l) { return /^\s*-/.test(l); })[0];
				if (firstItem) {
					indent = /^(\s*)/.exec(firstItem)[1];
					itemStyle = quoteStyle(firstItem.replace(/^\s*-/, '')) || 'plain';
				}
			}
			lines = [key + ':'].concat(value.map(function (v) {
				return indent + '- ' + quote(v, itemStyle);
			}));
		} else if (value === true) {
			lines = [key + ': true'];
		} else if (value === false || value === null || value === undefined) {
			lines = [key + ':'];
		} else {
			var style = quoteStyle(stripComment(oldRest));
			if (value === '') {
				lines = [key + ':' + (style ? ' ' + quote('', style) : '')];
			} else {
				lines = [key + ': ' + quote(value, style || (e ? 'plain' : 'single'))];
			}
		}
		if (e) {
			e.lines = lines;
		} else {
			// Append after the last key, ahead of any trailing blank lines
			var at = this.entries.length;
			while (at > 0 && !this.entries[at - 1].key && !this.entries[at - 1].lines.join('').trim()) at--;
			this.entries.splice(at, 0, { key: key, lines: lines });
		}
		return true;
	};

	FrontMatter.prototype.remove = function (key) {
		var e = this.find(key);
		if (e) this.entries.splice(this.entries.indexOf(e), 1);
	};

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Inline markdown
	// Renders paragraph/list markdown to HTML for the editing surface. Covers
	// what the site's writing uses: **bold**, *italic*, `code`, [links](url),
	// inline HTML such as <br>, and backslash escapes.

	var INLINE_TAGS = /^(a|abbr|b|br|code|del|em|i|kbd|mark|s|small|span|strong|sub|sup|u)$/i;

	function sanitizeTag(tag) {
		var m = /^<(\/?)([a-zA-Z][\w-]*)/.exec(tag);
		if (!m || !INLINE_TAGS.test(m[2])) return escapeHtml(tag);
		if (m[1]) return '</' + m[2].toLowerCase() + '>';
		var keep = parseAttrs(tag).filter(function (a) {
			return !/^on/i.test(a.name) && !(a.value && /^\s*javascript:/i.test(a.value));
		});
		return '<' + m[2].toLowerCase() + keep.map(function (a) {
			return ' ' + a.name + (a.value === null ? '' : '="' + escapeAttr(a.value) + '"');
		}).join('') + '>';
	}

	function isWordChar(c) {
		return !!c && /[\p{L}\p{N}]/u.test(c);
	}

	function findClosingBracket(s, i) {
		var depth = 0;
		for (var j = i; j < s.length; j++) {
			if (s[j] === '\\') { j++; continue; }
			if (s[j] === '[') depth++;
			else if (s[j] === ']') {
				depth--;
				if (depth === 0) return j;
			}
		}
		return -1;
	}

	// Link/image destination right after "](": returns { url, end } or null
	function parseDestination(s, i) {
		var m = /^\(\s*(<[^>]*>|[^\s()]*(?:\([^\s()]*\)[^\s()]*)*)(?:\s+("[^"]*"|'[^']*'))?\s*\)/.exec(s.slice(i));
		if (!m) return null;
		var url = m[1];
		if (url[0] === '<') url = url.slice(1, -1);
		return { url: url, title: m[2] ? m[2].slice(1, -1) : null, end: i + m[0].length };
	}

	function findEmphasisClose(s, from, ch, n) {
		for (var j = from; j < s.length; j++) {
			var c = s[j];
			if (c === '\\') { j++; continue; }
			if (c === '`') {
				var run = /^`+/.exec(s.slice(j))[0];
				var close = s.indexOf(run, j + run.length);
				if (close > -1) { j = close + run.length - 1; }
				continue;
			}
			if (c !== ch) continue;
			var len = 1;
			while (s[j + len] === ch) len++;
			var prev = s[j - 1];
			var next = s[j + len];
			var canClose = prev && !/\s/.test(prev) && (ch !== '_' || !isWordChar(next));
			if (len === n && canClose) return j;
			if (len === 3 && n < 3 && canClose) return j;
			j += len - 1;
		}
		return -1;
	}

	function mdInlineToHtml(s) {
		s = String(s || '');
		var out = '';
		var i = 0;
		while (i < s.length) {
			var c = s[i];
			var rest = s.slice(i);
			var m;

			if (c === '\\' && /[\\`*_{}\[\]()#+\-.!|<>~"']/.test(s[i + 1] || '')) {
				out += escapeHtml(s[i + 1]);
				i += 2;
				continue;
			}

			if (c === '`') {
				var run = /^`+/.exec(rest)[0];
				var close = s.indexOf(run, i + run.length);
				if (close > -1) {
					out += '<code>' + escapeHtml(s.slice(i + run.length, close).replace(/^ (.*) $/, '$1')) + '</code>';
					i = close + run.length;
					continue;
				}
				out += run;
				i += run.length;
				continue;
			}

			if (c === '<') {
				if ((m = /^<(https?:\/\/[^>\s]+)>/.exec(rest))) {
					out += '<a href="' + escapeAttr(m[1]) + '">' + escapeHtml(m[1]) + '</a>';
					i += m[0].length;
					continue;
				}
				if ((m = /^<!--[\s\S]*?-->/.exec(rest))) {
					i += m[0].length;
					continue;
				}
				if ((m = /^<\/?[a-zA-Z][\w-]*(?:\s+[^<>]*?)?\/?>/.exec(rest))) {
					out += sanitizeTag(m[0]);
					i += m[0].length;
					continue;
				}
				out += '&lt;';
				i++;
				continue;
			}

			if (c === '&') {
				if ((m = /^&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/i.exec(rest))) {
					out += m[0];
					i += m[0].length;
					continue;
				}
				out += '&amp;';
				i++;
				continue;
			}

			if (c === '>') {
				out += '&gt;';
				i++;
				continue;
			}

			if ((c === '!' && s[i + 1] === '[') || c === '[') {
				var isImg = c === '!';
				var open = isImg ? i + 1 : i;
				var closeB = findClosingBracket(s, open);
				if (closeB > -1 && s[closeB + 1] === '(') {
					var dest = parseDestination(s, closeB + 1);
					if (dest) {
						var label = s.slice(open + 1, closeB);
						if (isImg) {
							out += imgTag(dest.url, label);
						} else {
							out += '<a href="' + escapeAttr(dest.url) + '"' +
								(dest.title ? ' title="' + escapeAttr(dest.title) + '"' : '') + '>' +
								mdInlineToHtml(label) + '</a>';
						}
						i = dest.end;
						continue;
					}
				}
				out += isImg ? '!' : '[';
				i++;
				continue;
			}

			if (c === '*' || c === '_') {
				var n = 1;
				while (s[i + n] === c) n++;
				var after = s[i + n];
				var before = s[i - 1];
				var canOpen = after && !/\s/.test(after) && (c !== '_' || !isWordChar(before));
				if (canOpen && n <= 3) {
					var end = findEmphasisClose(s, i + n, c, n);
					if (end > -1) {
						var inner = mdInlineToHtml(s.slice(i + n, end));
						if (n === 3) out += '<strong><em>' + inner + '</em></strong>';
						else if (n === 2) out += '<strong>' + inner + '</strong>';
						else out += '<em>' + inner + '</em>';
						i = end + n;
						continue;
					}
				}
				out += s.slice(i, i + n);
				i += n;
				continue;
			}

			out += c;
			i++;
		}
		return out;
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Block parsing

	var BLOCK_HTML = /<\/?(p|div|h[1-6]|ul|ol|li|table|figure|iframe|blockquote|pre|section)\b/i;
	var VOID_TAGS = /^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/i;

	function isBlank(l) { return /^\s*$/.test(l); }
	function isIndented(l) { return /^(\t| {4})/.test(l) && !isBlank(l); }
	function isListItem(l) { return /^ {0,3}([*+-]|\d+[.)])[ \t]+\S/.test(l); }

	var IMAGE_LINE = /^!\[([^\]]*)\]\(\s*<?([^\s()<>]+)>?(?:\s+("[^"]*"|'[^']*'))?\s*\)(\{:[^}]*\})?\s*$/;

	// Index of the line where an HTML element opened on line i closes
	function scanBalanced(lines, i, tag) {
		var depth = 0;
		var openRe = new RegExp('<' + tag + '(?=[\\s>/])[^>]*?(/?)>', 'gi');
		var closeRe = new RegExp('</' + tag + '\\s*>', 'gi');
		for (var j = i; j < lines.length; j++) {
			var l = lines[j];
			var m;
			openRe.lastIndex = 0;
			while ((m = openRe.exec(l))) { if (!m[1]) depth++; }
			closeRe.lastIndex = 0;
			while (closeRe.exec(l)) depth--;
			if (depth <= 0) return j;
		}
		return -1;
	}

	function untilBlank(lines, i) {
		var j = i;
		while (j + 1 < lines.length && !isBlank(lines[j + 1])) j++;
		return j;
	}

	function parseIal(ial) {
		// {:width="100%" alt="X"} → [{ name, value }]
		return ial ? parseAttrs('<x ' + ial.replace(/^\{:\s*/, '').replace(/\}$/, '') + '>') : [];
	}

	function classify(raw, firstTrim, kind) {
		var b = { raw: raw };
		var m;

		if (kind === 'comment') {
			b.type = 'comment';
			b.data = { raw: raw };
			return b;
		}

		if (kind === 'figure') {
			var inner = raw.replace(/^\s*\{%\s*figure[^%]*%\}/, '').replace(/\{%\s*endfigure\s*%\}\s*$/, '');
			var iframe = /<iframe\b[^>]*>[\s\S]*?<\/iframe>/i.exec(inner);
			if (iframe) {
				b.type = 'embed';
				b.data = { src: attr(parseAttrs(iframe[0].replace(/>[\s\S]*$/, '>')), 'src') || '', form: 'figure', raw: raw };
				return b;
			}
			var imgs = findImages(inner);
			var leftover = inner.replace(/<img\b[^>]*>/gi, '').replace(/<\/?p>/gi, '').trim();
			if (imgs.length && !leftover) {
				b.type = 'image';
				b.data = { form: 'figure', images: imgs, ial: [] };
				return b;
			}
		}

		if (kind === 'html') {
			var tagM = /^<([a-zA-Z][\w-]*)/.exec(firstTrim);
			var tag = tagM[1].toLowerCase();
			var openTag = (/^\s*<[^>]*>/.exec(raw) || [''])[0];
			var attrs = parseAttrs(openTag);
			var cls = ' ' + (attr(attrs, 'class') || '') + ' ';

			if (/^h[1-6]$/.test(tag) && (m = /^\s*<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>\s*$/i.exec(raw)) && !m[2].trim()) {
				b.type = 'heading';
				b.data = { level: +m[1], html: m[3].trim(), style: 'html' };
				return b;
			}

			var galleryHtml = raw;
			var wrapP = false;
			if (tag === 'p' && (m = /^\s*<p>\s*(<div\b[\s\S]*<\/div>)\s*<\/p>\s*$/i.exec(raw))) {
				galleryHtml = m[1];
				wrapP = true;
				attrs = parseAttrs(/^<[^>]*>/.exec(galleryHtml)[0]);
				cls = ' ' + (attr(attrs, 'class') || '') + ' ';
			}
			if ((tag === 'div' || wrapP) && cls.indexOf(' gallery ') > -1) {
				var gInner = galleryHtml.replace(/^\s*<div[^>]*>/, '').replace(/<\/div>\s*$/, '');
				if (!gInner.replace(/<img\b[^>]*>/gi, '').trim()) {
					b.type = 'gallery';
					b.data = {
						style: attr(attrs, 'data-style') || null,
						columns: attr(attrs, 'data-columns') || null,
						images: findImages(gInner)
					};
					return b;
				}
			}

			if (tag === 'div' && cls.indexOf(' story ') > -1) {
				var steps = [];
				var chunks = raw.split(/<div class="story__step">/).slice(1);
				var ok = chunks.length > 0;
				chunks.forEach(function (chunk) {
					var text = /<div class="story__text">([\s\S]*?)<\/div>/.exec(chunk);
					var media = /<div class="story__media">\s*(<img\b[^>]*>)\s*<\/div>/.exec(chunk);
					var stripped = chunk
						.replace(/<div class="story__dot"><\/div>/, '')
						.replace(/<div class="story__text">[\s\S]*?<\/div>/, '')
						.replace(/<div class="story__media">\s*<img\b[^>]*>\s*<\/div>/, '')
						.replace(/<\/div>/g, '').trim();
					if (stripped) ok = false;
					var im = media ? findImages(media[1])[0] : null;
					steps.push({ html: text ? text[1].trim() : '', src: im ? im.src : '', alt: im ? im.alt : '' });
				});
				if (ok) {
					b.type = 'story';
					b.data = { steps: steps };
					return b;
				}
			}

			// A plain <p>…</p> paragraph written as HTML (inner text is HTML)
			if (tag === 'p' && (m = /^\s*<p>(\s*)([\s\S]*?)(\s*)<\/p>\s*$/i.exec(raw)) &&
				!BLOCK_HTML.test(m[2]) && !/<img\b/i.test(m[2]) && !/\{%|\{\{/.test(m[2])) {
				b.type = 'paragraph';
				b.data = { html: m[2], style: 'html', pre: m[1], post: m[3] };
				return b;
			}

			if (tag === 'iframe' || (tag === 'p' && /^\s*<p>\s*<iframe\b[\s\S]*<\/iframe>\s*<\/p>\s*$/i.test(raw))) {
				var ifr = /<iframe\b[^>]*>/i.exec(raw)[0];
				b.type = 'embed';
				b.data = { src: attr(parseAttrs(ifr), 'src') || '', form: 'bare', raw: raw };
				return b;
			}
		}

		if (kind === 'heading' && (m = /^\s*(#{1,6})\s+(.*?)\s*#*\s*$/.exec(raw))) {
			b.type = 'heading';
			b.data = { level: m[1].length, html: mdInlineToHtml(m[2]), md: m[2], style: 'md' };
			return b;
		}

		if (kind === 'para') {
			if ((m = IMAGE_LINE.exec(raw.trim()))) {
				var ial = parseIal(m[4]);
				var altIal = attr(ial, 'alt');
				b.type = 'image';
				b.data = {
					form: 'md',
					images: [{ src: m[2], alt: altIal !== null ? altIal : m[1] }],
					altIn: altIal !== null || !m[1] ? 'ial' : 'brackets',
					ial: ial.filter(function (a) { return a.name !== 'alt'; }),
					title: m[3] || null
				};
				return b;
			}
			// Liquid, kramdown attributes or block-level HTML: leave as source
			if (!/\{%|\{\{|^\s*\{:/.test(raw) && !BLOCK_HTML.test(raw)) {
				b.type = 'paragraph';
				b.data = { md: raw };
				return b;
			}
		}

		if (kind === 'list') {
			var items = [];
			var lines = raw.split('\n');
			var simple = true;
			var marker = null;
			var ordered = false;
			lines.forEach(function (l) {
				var lm = /^ {0,3}([*+-]|\d+[.)])[ \t]+(.*)$/.exec(l);
				if (lm) {
					var isOrd = /\d/.test(lm[1]);
					if (marker === null) { marker = isOrd ? '.' : lm[1]; ordered = isOrd; }
					if (isOrd !== ordered) simple = false;
					items.push(lm[2]);
				} else if (isBlank(l)) {
					// a loose list: still one list
				} else if (/^\s{2,}\S/.test(l) && items.length && !/^\s{0,3}([*+-]|\d+[.)])\s/.test(l.trim()) && !/^\s*([*+-]|\d+[.)])\s/.test(l)) {
					items[items.length - 1] += '\n' + l.trim();
				} else {
					simple = false;
				}
			});
			if (simple && items.length) {
				b.type = 'list';
				b.data = { ordered: ordered, marker: marker, items: items };
				return b;
			}
		}

		b.type = 'raw';
		b.data = { raw: raw };
		return b;
	}

	function isMedia(b) {
		return b && (b.type === 'image' || b.type === 'gallery' || b.type === 'embed');
	}

	// Splits a body into blocks. Each block records the blank lines before it
	// (sep) so the body can be rebuilt byte-for-byte.
	function parseBody(body) {
		var lines = body.split('\n');
		var blocks = [];
		var i = 0;
		var lastEnd = 0;

		function sepBefore(start) {
			var gap = lines.slice(lastEnd, start).map(function (l) { return l + '\n'; }).join('');
			return (blocks.length || lastEnd > 0 ? '\n' : '') + gap;
		}

		while (i < lines.length) {
			var line = lines[i];
			if (isBlank(line)) { i++; continue; }
			var t = line.trim();
			var end;
			var kind;

			if (t.indexOf('<!--') === 0) {
				kind = 'comment';
				end = i;
				var from = line.indexOf('<!--') + 4;
				while (end < lines.length && lines[end].indexOf('-->', end === i ? from : 0) < 0) end++;
				if (end >= lines.length) end = lines.length - 1;
			} else if (/^\{%-?\s*figure\b/.test(t)) {
				kind = 'figure';
				end = i;
				while (end < lines.length && !/\{%-?\s*endfigure\s*-?%\}/.test(lines[end])) end++;
				if (end >= lines.length) { end = untilBlank(lines, i); kind = 'raw'; }
			} else if (/^(```|~~~)/.test(t)) {
				kind = 'raw';
				var fence = t.slice(0, 3);
				end = i + 1;
				while (end < lines.length && lines[end].trim().indexOf(fence) !== 0) end++;
				if (end >= lines.length) end = lines.length - 1;
			} else if (/^<[a-zA-Z]/.test(t)) {
				var tag = /^<([a-zA-Z][\w-]*)/.exec(t)[1];
				kind = 'html';
				if (VOID_TAGS.test(tag)) {
					end = untilBlank(lines, i);
					kind = 'raw';
				} else {
					end = scanBalanced(lines, i, tag);
					if (end < 0) { end = untilBlank(lines, i); kind = 'raw'; }
				}
			} else if (/^#{1,6}\s/.test(t)) {
				kind = 'heading';
				end = i;
			} else if (isListItem(line)) {
				kind = 'list';
				end = i;
				var j = i + 1;
				while (j < lines.length) {
					if (isBlank(lines[j])) {
						var k = j;
						while (k < lines.length && isBlank(lines[k])) k++;
						if (k < lines.length && isListItem(lines[k])) { j = k; continue; }
						break;
					}
					end = j;
					j++;
				}
			} else if (isIndented(line)) {
				// An indented run: a caption when it follows media, else a code block
				end = i;
				var c = i + 1;
				while (c < lines.length) {
					if (isIndented(lines[c])) { end = c; c++; continue; }
					if (isBlank(lines[c])) {
						var n2 = c;
						while (n2 < lines.length && isBlank(lines[n2])) n2++;
						if (n2 < lines.length && isIndented(lines[n2])) { c = n2; continue; }
					}
					break;
				}
				var prev = blocks[blocks.length - 1];
				var capRaw = lines.slice(i, end + 1).join('\n');
				if (isMedia(prev) && !prev.capRaw) {
					prev.capSep = sepBefore(i);
					prev.capRaw = capRaw;
					prev.data.caption = captionText(capRaw);
					lastEnd = end + 1;
					i = end + 1;
					continue;
				}
				kind = 'raw';
			} else if (/^(\||>|(-[ \t]*){3,}$|(\*[ \t]*){3,}$|(_[ \t]*){3,}$)/.test(t)) {
				// Tables, quotes and rules: kept as source
				kind = 'raw';
				end = untilBlank(lines, i);
			} else {
				kind = 'para';
				end = untilBlank(lines, i);
			}

			var raw = lines.slice(i, end + 1).join('\n');
			var block = classify(raw, t, kind);
			block.sep = sepBefore(i);
			blocks.push(block);
			lastEnd = end + 1;
			i = end + 1;
		}

		var tail = blocks.length ? lines.slice(lastEnd).map(function (l) { return '\n' + l; }).join('') : body;
		blocks.forEach(function (b, k) {
			b.id = nextId();
			b.base = canon(b);
			b.origPrev = k ? blocks[k - 1].id : null;
			b.origLast = k === blocks.length - 1;
		});
		return { blocks: blocks, tail: tail };
	}

	function captionText(raw) {
		return raw.split('\n').map(function (l) { return l.replace(/^(\t| {4})/, '').replace(/\s+$/, ''); })
			.join('\n').trim();
	}

	var idCounter = 0;
	function nextId() { return 'b' + (++idCounter); }

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Canonical output
	// The source the editor writes for a block's current content, in the
	// site's conventions (see _projects/2018-06-30-demo-project.md).

	function galleryOpenTag(d) {
		var a = '<div class="gallery"';
		if (d.style) a += ' data-style="' + escapeAttr(d.style) + '"';
		if (d.columns) a += ' data-columns="' + escapeAttr(d.columns) + '"';
		return a + '>';
	}

	function serializeIal(attrs) {
		if (!attrs.length) return '';
		return '{:' + attrs.map(function (a) {
			return a.name + (a.value === null ? '' : '="' + String(a.value).replace(/"/g, '&quot;') + '"');
		}).join(' ') + '}';
	}

	function embedTag(src) {
		if (/drive\.google\.com/.test(src)) {
			return '<iframe src="' + escapeAttr(src) + '" width="640" height="360" allow="autoplay"></iframe>';
		}
		return '<iframe width="560" height="315" src="' + escapeAttr(src) + '" title="Video player" frameborder="0" ' +
			'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
			'referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';
	}

	function canonMain(b) {
		var d = b.data;
		switch (b.type) {
			case 'heading':
				if (d.style === 'md') return '#'.repeat(d.level) + ' ' + (d.md != null ? d.md : d.html);
				return '<h' + d.level + '> ' + d.html + ' </h' + d.level + '>';
			case 'paragraph':
				if (d.style === 'html') return '<p>' + (d.pre || '') + d.html + (d.post || '') + '</p>';
				return d.md;
			case 'list':
				return d.items.map(function (it, k) {
					var mk = d.ordered ? (k + 1) + '.' : (d.marker || '*');
					return mk + ' ' + it.replace(/\n/g, '\n  ');
				}).join('\n');
			case 'image':
				if (d.form === 'figure') {
					return '{% figure %}\n' + d.images.map(function (im) {
						return '<p>' + imgTag(im.src, im.alt) + '</p>';
					}).join('\n') + '\n{% endfigure %}';
				} else {
					var im = d.images[0] || { src: '', alt: '' };
					var ial = d.ial ? d.ial.slice() : [];
					var bracket = '';
					if (d.altIn === 'brackets') bracket = im.alt.replace(/([\[\]])/g, '\\$1');
					else if (im.alt) ial.push({ name: 'alt', value: im.alt });
					return '![' + bracket + '](' + im.src + (d.title ? ' ' + d.title : '') + ')' + serializeIal(ial);
				}
			case 'gallery':
				return galleryOpenTag(d) + '\n' + d.images.map(function (im) {
					return '\t' + imgTag(im.src, im.alt);
				}).join('\n') + '\n</div>';
			case 'story':
				return '<div class="story">\n' + d.steps.map(function (s) {
					var out = '\t<div class="story__step">\n\t\t<div class="story__dot"></div>\n';
					if (s.html) out += '\t\t<div class="story__text">' + s.html + '</div>\n';
					if (s.src) out += '\t\t<div class="story__media">' + imgTag(s.src, s.alt) + '</div>\n';
					return out + '\t</div>';
				}).join('\n') + '\n</div>';
			case 'embed':
				if (d.raw) {
					return d.raw.replace(/(<iframe\b[^>]*?\bsrc\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+)/i, function (m, pre) {
						return pre + '"' + escapeAttr(d.src) + '"';
					});
				}
				if (d.form === 'figure') return '{% figure %}\n<p>\n' + embedTag(d.src) + '\n</p>\n{% endfigure %}';
				return embedTag(d.src);
			default:
				return d.raw;
		}
	}

	function canonCaption(b) {
		var c = b.data.caption;
		if (!isMedia(b) || !c || !c.trim()) return '';
		return c.trim().split('\n').map(function (l) { return '\t' + l; }).join('\n');
	}

	function canon(b) {
		return { main: canonMain(b), caption: canonCaption(b) };
	}

	function serializeBlock(b) {
		var c = canon(b);
		var keep = b.raw != null && b.base;
		var main = keep && c.main === b.base.main ? b.raw : c.main;
		var cap = '';
		if (b.capRaw != null && b.base && c.caption === b.base.caption) {
			cap = b.capSep + b.capRaw;
		} else if (c.caption) {
			cap = (b.capSep || '\n\n') + c.caption;
		}
		return main + cap;
	}

	function makeBlock(type, data) {
		var b = { id: nextId(), type: type, data: data, raw: null, base: null, sep: '\n\n' };
		return b;
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Files

	function parse(text) {
		var bom = text.charCodeAt(0) === 0xfeff ? '﻿' : '';
		if (bom) text = text.slice(1);
		var crlf = text.indexOf('\r\n') > -1;
		if (crlf) text = text.replace(/\r\n/g, '\n');

		var doc = { bom: bom, crlf: crlf, fm: null, fmOpen: '', fmClose: '' };
		var m = /^(---[ \t]*\n)([\s\S]*?)(\n---[ \t]*)(\n|$)/.exec(text);
		if (!m && /^---[ \t]*\n---[ \t]*(\n|$)/.test(text)) {
			m = /^(---[ \t]*\n)()(---[ \t]*)(\n|$)/.exec(text);
		}
		var body = text;
		if (m) {
			doc.fm = new FrontMatter(m[2]);
			doc.fmEmpty = m[2] === '';
			doc.fmOpen = m[1];
			doc.fmClose = m[3] + m[4];
			body = text.slice(m[0].length);
		}
		var parsed = parseBody(body);
		doc.blocks = parsed.blocks;
		doc.tail = parsed.tail;
		return doc;
	}

	// afterFrontMatter: the body follows a front matter block, so a new first
	// block gets one blank line above it
	function serializeBody(blocks, tail, afterFrontMatter) {
		var out = '';
		var last = null;
		blocks.forEach(function (b) {
			var text = serializeBlock(b);
			// Blocks emptied in the editor drop out rather than leave blank lines
			if (!text.trim()) return;
			var sep = b.sep;
			var keep = b.raw != null && (last ? b.origPrev === last.id : b.origPrev === null);
			if (!last && !keep) sep = afterFrontMatter ? '\n' : '';
			// Blocks that weren't neighbours before need a blank line between
			// them, or two paragraphs would run together
			else if (last && !keep && (sep.match(/\n/g) || []).length < 2) sep = '\n\n';
			out += sep + text;
			last = b;
		});
		tail = tail || '';
		if (last && !last.origLast && !/\n$/.test(tail)) tail += '\n';
		return out + tail;
	}

	function serialize(doc) {
		var text = '';
		if (doc.fm) {
			var fmText = doc.fm.toString();
			text += doc.fmOpen + fmText + (doc.fmEmpty && fmText === '' ? '' : doc.fmEmpty ? '\n' : '') + doc.fmClose;
		}
		text += serializeBody(doc.blocks, doc.tail, !!doc.fm);
		if (doc.crlf) text = text.replace(/\n/g, '\r\n');
		return doc.bom + text;
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Misc

	// A pasted video link → an embeddable player URL (YouTube, Vimeo, Drive)
	function embedUrl(url) {
		url = String(url || '').trim();
		var m;
		if ((m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/.exec(url))) {
			return 'https://www.youtube.com/embed/' + m[1];
		}
		if ((m = /vimeo\.com\/(?:video\/)?(\d+)/.exec(url))) return 'https://player.vimeo.com/video/' + m[1];
		if ((m = /drive\.google\.com\/file\/d\/([\w-]+)/.exec(url))) return 'https://drive.google.com/file/d/' + m[1] + '/preview';
		return url;
	}

	function slugify(s) {
		return String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '')
			.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'untitled';
	}

	// Line diff (LCS) for the review-before-saving view: [{ op: ' '|'+'|'-', text }]
	function diffLines(a, b) {
		var A = a.split('\n');
		var B = b.split('\n');
		var pre = 0;
		while (pre < A.length && pre < B.length && A[pre] === B[pre]) pre++;
		var suf = 0;
		while (suf < A.length - pre && suf < B.length - pre && A[A.length - 1 - suf] === B[B.length - 1 - suf]) suf++;
		var a2 = A.slice(pre, A.length - suf);
		var b2 = B.slice(pre, B.length - suf);
		var n = a2.length;
		var m = b2.length;
		var dp = [];
		for (var x = 0; x <= n; x++) {
			dp.push(new Uint32Array(m + 1));
		}
		for (x = n - 1; x >= 0; x--) {
			for (var y = m - 1; y >= 0; y--) {
				dp[x][y] = a2[x] === b2[y] ? dp[x + 1][y + 1] + 1 : Math.max(dp[x + 1][y], dp[x][y + 1]);
			}
		}
		var out = [];
		A.slice(0, pre).forEach(function (t) { out.push({ op: ' ', text: t }); });
		x = 0;
		y = 0;
		while (x < n || y < m) {
			if (x < n && y < m && a2[x] === b2[y]) { out.push({ op: ' ', text: a2[x] }); x++; y++; }
			else if (x < n && (y >= m || dp[x + 1][y] >= dp[x][y + 1])) { out.push({ op: '-', text: a2[x] }); x++; }
			else { out.push({ op: '+', text: b2[y] }); y++; }
		}
		A.slice(A.length - suf).forEach(function (t) { out.push({ op: ' ', text: t }); });
		return out;
	}

	return {
		parse: parse,
		serialize: serialize,
		parseBody: parseBody,
		serializeBody: serializeBody,
		serializeBlock: serializeBlock,
		canon: canon,
		makeBlock: makeBlock,
		FrontMatter: FrontMatter,
		mdInlineToHtml: mdInlineToHtml,
		escapeHtml: escapeHtml,
		escapeAttr: escapeAttr,
		decodeEntities: decodeEntities,
		parseAttrs: parseAttrs,
		embedUrl: embedUrl,
		slugify: slugify,
		diffLines: diffLines
	};
}));
