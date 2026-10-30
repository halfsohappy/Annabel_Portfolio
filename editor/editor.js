// Page editor: edit project pages (and other pages) as they look on the
// site, then save them back to their Markdown source.
//
// The canvas reuses the site's own stylesheet and page markup, so what you
// see is what gets published. Source parsing/writing lives in editor/doc.js;
// reading and saving files in editor/backends.js.
(function () {
	'use strict';

	var D = window.EditorDoc;
	var B = window.EditorBackends;
	var SITE = window.EDITOR_SITE;

	var S = {
		backend: null,
		file: null,          // { path, sha, isNew }
		doc: null,
		original: '',        // file text as last loaded/saved
		uploads: {},         // repo path → { blob, url, pending }
		history: [],
		future: [],
		typing: false,
		typingTimer: null,
		dirty: false,
		mode: 'visual',
		dirCache: {},
		drawerOpen: false
	};

	var TEXT_TYPES = { paragraph: 1, heading: 1, list: 1 };
	var GRID_WIDTHS = [
		['auto-small', 'Small'], ['auto-medium', 'Medium'], ['auto-large', 'Large'], ['auto-xl', 'Extra large']
	];
	var CROPS = [['cover', 'Fill the tile (crop)'], ['contain', 'Fit inside the tile'], ['scale-down', 'Never enlarge'], ['fill', 'Stretch'], ['none', 'Natural size']];
	var POSITIONS = ['top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right'];
	var GALLERY_STYLES = [
		['bento', 'Bento grid', { style: 'bento', columns: null }],
		['strip', 'Filmstrip', { style: 'strip', columns: null }],
		['grid2', 'Grid · 2 columns', { style: null, columns: '2' }],
		['grid3', 'Grid · 3 columns', { style: null, columns: '3' }],
		['grid4', 'Grid · 4 columns', { style: null, columns: '4' }],
		['carousel', 'Carousel', { style: null, columns: '1' }]
	];
	var KNOWN_KEYS = ['title', 'subtitle', 'date', 'description', 'featured_image', 'permalink', 'layout',
		'grid_width', 'grid_height', 'grid_crop', 'grid_crop_position', 'created_for', 'status', 'complexity',
		'highlights', 'favorite', 'external_url'].concat(SITE.tags.map(function (t) { return t.key; }));

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - DOM helpers

	function h(tag, props) {
		var el = document.createElement(tag);
		props = props || {};
		Object.keys(props).forEach(function (k) {
			var v = props[k];
			if (v === null || v === undefined || v === false) return;
			if (k === 'class') el.className = v;
			else if (k === 'text') el.textContent = v;
			else if (k === 'html') el.innerHTML = v;
			else if (k.indexOf('on') === 0 && typeof v === 'function') el.addEventListener(k.slice(2), v);
			else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
			else el.setAttribute(k, v === true ? '' : v);
		});
		for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
		return el;
	}

	function append(el, child) {
		if (child === null || child === undefined || child === false) return;
		if (Array.isArray(child)) { child.forEach(function (c) { append(el, c); }); return; }
		el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
	}

	var ICONS = {
		plus: 'M12 5v14M5 12h14',
		grip: 'M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01',
		up: 'M12 19V5M6 11l6-6 6 6',
		down: 'M12 5v14M18 13l-6 6-6-6',
		trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
		x: 'M18 6 6 18M6 6l12 12',
		image: 'M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15.5 9.5h.01',
		gallery: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
		text: 'M5 7V5h14v2M12 5v14M9 19h6',
		heading: 'M6 4v16M18 4v16M6 12h12',
		list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
		olist: 'M10 6h10M10 12h10M10 18h10M4 5l1.5-1v5M3.5 13.5a1.5 1.5 0 0 1 3 .5c0 1-3 2-3 3.5h3',
		video: 'M3 6h13v12H3zM16 10l5-3v10l-5-3',
		story: 'M6 3v18M6 7h.01M6 12h.01M6 17h.01M10 5h10v4H10zM10 15h10v4H10z',
		hide: 'M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10 10 0 0 1 12 5c5 0 9 4.5 10 7a13 13 0 0 1-2.2 3.2M6.6 6.6C4.3 8 2.6 10.2 2 12c1 2.5 5 7 10 7a10 10 0 0 0 5.4-1.6',
		eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
		code: 'M8 6l-6 6 6 6M16 6l6 6-6 6',
		link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
		settings: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4',
		undo: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
		redo: 'M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h3',
		external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
		upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
		swap: 'M4 8h13l-3-3M20 16H7l3 3',
		pages: 'M4 5h7v6H4zM13 5h7v6h-7zM4 13h7v6H4zM13 13h7v6h-7z',
		more: 'M5 12h.01M12 12h.01M19 12h.01',
		copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
		edit: 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4',
		alt: 'M4 6h16M4 12h10M4 18h7',
		cloud: 'M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z',
		folder: 'M3 6h6l2 2h10v11H3z',
		check: 'M5 12l5 5 9-10'
	};

	function icon(name) {
		var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('viewBox', '0 0 24 24');
		svg.setAttribute('class', 'ed-icon');
		svg.setAttribute('aria-hidden', 'true');
		var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		p.setAttribute('d', ICONS[name] || '');
		svg.appendChild(p);
		return svg;
	}

	function btn(label, iconName, onclick, cls) {
		return h('button', { type: 'button', class: 'ed-btn ' + (cls || ''), title: label, 'aria-label': label, onclick: onclick },
			iconName ? icon(iconName) : null, cls && cls.indexOf('ed-btn--label') > -1 ? h('span', { text: label }) : null);
	}

	function toast(msg, kind, ms) {
		var host = document.querySelector('.ed-toasts');
		var t = h('div', { class: 'ed-toast ' + (kind ? 'ed-toast--' + kind : ''), role: 'status' });
		if (typeof msg === 'string') t.textContent = msg; else append(t, msg);
		host.appendChild(t);
		setTimeout(function () { t.classList.add('ed-toast--out'); setTimeout(function () { t.remove(); }, 300); }, ms || 3200);
		return t;
	}

	// Modal dialog. Resolves with the clicked button's value (null if dismissed).
	function dialog(opts) {
		return new Promise(function (resolve) {
			var overlay = h('div', { class: 'ed-overlay' });
			var box = h('div', { class: 'ed-dialog ' + (opts.wide ? 'ed-dialog--wide' : ''), role: 'dialog', 'aria-modal': 'true' });
			if (opts.title) box.appendChild(h('h2', { class: 'ed-dialog__title', text: opts.title }));
			if (opts.body) append(box, h('div', { class: 'ed-dialog__body' }, opts.body));
			var actions = h('div', { class: 'ed-dialog__actions' });
			function close(v) {
				document.removeEventListener('keydown', onKey, true);
				overlay.remove();
				resolve(v);
			}
			(opts.buttons || [{ label: 'OK', value: true, primary: true }]).forEach(function (b) {
				actions.appendChild(h('button', {
					type: 'button',
					class: 'ed-btn ed-btn--label ' + (b.primary ? 'ed-btn--primary' : '') + (b.danger ? ' ed-btn--danger' : ''),
					onclick: function () {
						if (b.validate && !b.validate()) return;
						close(b.value);
					}
				}, b.label));
			});
			box.appendChild(actions);
			overlay.appendChild(box);
			function onKey(e) {
				if (e.key === 'Escape' && opts.dismissable !== false) { e.stopPropagation(); close(null); }
				if (e.key === 'Enter' && e.target.tagName === 'INPUT' && opts.enterValue !== undefined) {
					e.preventDefault();
					var pb = (opts.buttons || []).filter(function (b) { return b.value === opts.enterValue; })[0];
					if (pb && pb.validate && !pb.validate()) return;
					close(opts.enterValue);
				}
			}
			document.addEventListener('keydown', onKey, true);
			overlay.addEventListener('mousedown', function (e) {
				if (e.target === overlay && opts.dismissable !== false) close(null);
			});
			document.body.appendChild(overlay);
			var first = box.querySelector('input, textarea, select') || actions.querySelector('.ed-btn--primary');
			if (first) setTimeout(function () { first.focus(); if (first.select && first.type !== 'file') first.select(); }, 30);
		});
	}

	// A small floating panel anchored to an element; closes on outside click
	var openPop = null;
	function popover(anchor, content, opts) {
		closePopover();
		opts = opts || {};
		var pop = h('div', { class: 'ed-pop ' + (opts.cls || '') }, content);
		document.body.appendChild(pop);
		var r = anchor.getBoundingClientRect();
		var pw = pop.offsetWidth;
		var left = Math.min(Math.max(8, r.left + r.width / 2 - pw / 2), window.innerWidth - pw - 8);
		var top = r.bottom + 6;
		if (top + pop.offsetHeight > window.innerHeight - 8) top = Math.max(8, r.top - pop.offsetHeight - 6);
		pop.style.left = left + 'px';
		pop.style.top = top + 'px';
		openPop = { el: pop, onClose: opts.onClose };
		setTimeout(function () {
			var inp = pop.querySelector('input, textarea');
			if (inp) { inp.focus(); if (inp.select) inp.select(); }
		}, 20);
		return pop;
	}

	function closePopover() {
		if (!openPop) return;
		var p = openPop;
		openPop = null;
		p.el.remove();
		if (p.onClose) p.onClose();
	}

	document.addEventListener('mousedown', function (e) {
		if (openPop && !openPop.el.contains(e.target)) closePopover();
	}, true);

	function menu(anchor, items) {
		var list = h('div', { class: 'ed-menu', role: 'menu' });
		items.forEach(function (it) {
			if (!it) { list.appendChild(h('div', { class: 'ed-menu__sep' })); return; }
			list.appendChild(h('button', {
				type: 'button', role: 'menuitem',
				class: 'ed-menu__item' + (it.active ? ' is-active' : '') + (it.danger ? ' is-danger' : ''),
				onclick: function () { closePopover(); it.run(); }
			}, it.icon ? icon(it.icon) : null, h('span', { text: it.label }), it.hint ? h('small', { text: it.hint }) : null));
		});
		return popover(anchor, list, { cls: 'ed-pop--menu' });
	}

	function field(label, control, hint) {
		return h('label', { class: 'ed-field' }, h('span', { class: 'ed-field__label', text: label }), control,
			hint ? h('span', { class: 'ed-field__hint', html: hint }) : null);
	}

	function store(key, value) {
		try {
			if (value === undefined) return JSON.parse(localStorage.getItem(key));
			if (value === null) localStorage.removeItem(key);
			else localStorage.setItem(key, JSON.stringify(value));
		} catch (e) { return null; }
	}

	function placeCaret(el, atEnd) {
		el.focus();
		var r = document.createRange();
		r.selectNodeContents(el);
		r.collapse(!atEnd);
		var sel = window.getSelection();
		sel.removeAllRanges();
		sel.addRange(r);
	}

	function caretTextOffset(el) {
		var sel = window.getSelection();
		if (!sel.rangeCount) return -1;
		var r = sel.getRangeAt(0);
		if (!el.contains(r.startContainer)) return -1;
		var pre = document.createRange();
		pre.selectNodeContents(el);
		pre.setEnd(r.startContainer, r.startOffset);
		return pre.toString().length;
	}

	function setCaretAtTextOffset(el, offset) {
		el.focus();
		var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
		var n;
		var left = offset;
		while ((n = walker.nextNode())) {
			if (left <= n.length) {
				var r = document.createRange();
				r.setStart(n, left);
				r.collapse(true);
				var sel = window.getSelection();
				sel.removeAllRanges();
				sel.addRange(r);
				return;
			}
			left -= n.length;
		}
		placeCaret(el, true);
	}

	function caretAtStart(el) {
		var sel = window.getSelection();
		return sel.isCollapsed && caretTextOffset(el) === 0;
	}

	// Is the caret on the first (or last) visual line of an editable?
	function caretOnEdgeLine(el, last) {
		var sel = window.getSelection();
		if (!sel.rangeCount || !sel.isCollapsed) return false;
		var r = sel.getRangeAt(0).cloneRange();
		var rect = r.getClientRects()[0];
		if (!rect) return !el.textContent.trim() || (last ? caretTextOffset(el) === el.textContent.length : caretTextOffset(el) === 0);
		var er = el.getBoundingClientRect();
		var lh = parseFloat(getComputedStyle(el).lineHeight) || 24;
		return last ? er.bottom - rect.bottom < lh * 0.9 : rect.top - er.top < lh * 0.9;
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - DOM → source

	var KEEP_TAGS = /^(SUB|SUP|U|S|DEL|MARK|KBD|SMALL)$/;

	// Merge <b>x</b><b>y</b> runs left behind by contenteditable
	function mergeRuns(root) {
		Array.prototype.slice.call(root.childNodes).forEach(function (n) {
			if (n.nodeType === 1) mergeRuns(n);
		});
		var n = root.firstChild;
		while (n) {
			var next = n.nextSibling;
			if (next && n.nodeType === 1 && next.nodeType === 1 && n.nodeName === next.nodeName &&
				/^(B|STRONG|I|EM|CODE)$/.test(n.nodeName)) {
				while (next.firstChild) n.appendChild(next.firstChild);
				next.remove();
				continue;
			}
			n = next;
		}
	}

	function isWord(c) { return !!c && /[\p{L}\p{N}]/u.test(c); }

	function escapeMdText(t) {
		return t.replace(/\\/g, '\\\\')
			.replace(/([*`|])/g, '\\$1')
			.replace(/&(?=#?\w+;)/g, '&amp;')
			.replace(/<(?=[A-Za-z\/!])/g, '&lt;')
			.replace(/_/g, function (m, off, str) { return isWord(str[off - 1]) && isWord(str[off + 1]) ? '_' : '\\_'; })
			.replace(/\[(?=[^\]]*\]\()/g, '\\[');
	}

	function wrapMark(mark, inner) {
		var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(inner);
		if (!m[2]) return inner;
		return m[1] + mark + m[2] + mark + m[3];
	}

	function mdWalk(node) {
		var out = '';
		node.childNodes.forEach(function (n) {
			if (n.nodeType === 3) { out += escapeMdText(n.nodeValue); return; }
			if (n.nodeType !== 1) return;
			var tag = n.nodeName;
			if (tag === 'BR') { out += '<br>'; return; }
			if (tag === 'B' || tag === 'STRONG') { out += wrapMark('**', mdWalk(n)); return; }
			if (tag === 'I' || tag === 'EM') { out += wrapMark('*', mdWalk(n)); return; }
			if (tag === 'CODE') {
				var t = n.textContent;
				var ticks = /`/.test(t) ? '`` ' : '`';
				out += t ? ticks + t + ticks.split('').reverse().join('') : '';
				return;
			}
			if (tag === 'A') {
				var href = (n.getAttribute('href') || '').replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29');
				var inner = mdWalk(n);
				out += inner.trim() ? '[' + inner + '](' + href + ')' : inner;
				return;
			}
			if (tag === 'IMG') { out += '![' + (n.getAttribute('alt') || '') + '](' + (n.getAttribute('data-src') || n.getAttribute('src')) + ')'; return; }
			if (KEEP_TAGS.test(tag)) { out += '<' + tag.toLowerCase() + '>' + mdWalk(n) + '</' + tag.toLowerCase() + '>'; return; }
			if (tag === 'DIV' || tag === 'P') { out += (out && !/\n$/.test(out) ? '\n' : '') + mdWalk(n); return; }
			out += mdWalk(n);
		});
		return out;
	}

	function domToMd(el) {
		var clone = el.cloneNode(true);
		mergeRuns(clone);
		var md = mdWalk(clone)
			.replace(/ /g, ' ')
			.replace(/[ \t]*\n[ \t]*/g, '\n')
			.replace(/[ \t]{2,}/g, ' ')
			.trim();
		// Keep a line that looks like a heading/list/quote from becoming one
		return md.replace(/(^|\n)(#{1,6}\s|[-+]\s|\d+)(\.\s)?|(^|\n)>/g, function (m, a, b, c, d) {
			if (d !== undefined) return d + '\\>';
			if (/^\d+$/.test(b)) return c ? a + b + '\\. ' : m;
			return a + '\\' + b;
		});
	}

	function htmlWalk(node) {
		var out = '';
		node.childNodes.forEach(function (n) {
			if (n.nodeType === 3) { out += D.escapeHtml(n.nodeValue); return; }
			if (n.nodeType !== 1) return;
			var tag = n.nodeName;
			if (tag === 'BR') { out += '<br>'; return; }
			if (tag === 'B' || tag === 'STRONG') { out += '<strong>' + htmlWalk(n) + '</strong>'; return; }
			if (tag === 'I' || tag === 'EM') { out += '<em>' + htmlWalk(n) + '</em>'; return; }
			if (tag === 'CODE') { out += '<code>' + htmlWalk(n) + '</code>'; return; }
			if (tag === 'A') { out += '<a href="' + D.escapeAttr(n.getAttribute('href') || '') + '">' + htmlWalk(n) + '</a>'; return; }
			if (KEEP_TAGS.test(tag)) { out += '<' + tag.toLowerCase() + '>' + htmlWalk(n) + '</' + tag.toLowerCase() + '>'; return; }
			if (tag === 'DIV' || tag === 'P') { out += (out ? '<br>' : '') + htmlWalk(n); return; }
			out += htmlWalk(n);
		});
		return out;
	}

	function domToHtml(el) {
		var clone = el.cloneNode(true);
		mergeRuns(clone);
		return htmlWalk(clone).replace(/ /g, ' ').replace(/^\s+|\s+$/g, '');
	}

	function plainText(el) {
		return el.innerText.replace(/ /g, ' ').split('\n').map(function (l) { return l.replace(/\s+$/, ''); }).join('\n').trim();
	}

	// Only safe inline markup goes into the canvas
	function setRich(el, html) {
		var t = document.createElement('template');
		t.innerHTML = html;
		t.content.querySelectorAll('script, style, iframe, object').forEach(function (n) { n.remove(); });
		t.content.querySelectorAll('*').forEach(function (n) {
			Array.prototype.slice.call(n.attributes).forEach(function (a) {
				if (/^on/i.test(a.name) || /^\s*javascript:/i.test(a.value)) n.removeAttribute(a.name);
			});
			if (n.nodeName === 'IMG' && n.getAttribute('src')) {
				n.setAttribute('data-src', n.getAttribute('src'));
				n.setAttribute('src', resolveSrc(n.getAttribute('src')));
			}
		});
		el.innerHTML = '';
		el.appendChild(t.content);
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Model sync

	function fm() { return S.doc && S.doc.fm; }

	function fmGet(key) {
		var v = fm() ? fm().get(key) : undefined;
		return v === undefined || v === null ? '' : v;
	}

	function fmSet(key, value) {
		if (!fm()) return;
		if (fm().set(key, value)) changed();
	}

	function syncBlock(b) {
		var p = b.parts;
		if (!p) return;
		var d = b.data;
		if (b.type === 'paragraph' && p.text) {
			if (d.style === 'html') d.html = domToHtml(p.text);
			else d.md = domToMd(p.text);
		} else if (b.type === 'heading' && p.text) {
			if (d.style === 'md') d.md = domToMd(p.text);
			d.html = domToHtml(p.text);
		} else if (b.type === 'list' && p.list) {
			d.items = Array.prototype.map.call(p.list.querySelectorAll(':scope > li'), domToMd)
				.filter(function (s) { return s.trim(); });
		} else if (b.type === 'story' && p.steps) {
			p.steps.forEach(function (el, i) { if (d.steps[i]) d.steps[i].html = domToHtml(el); });
		}
		if (p.caption) d.caption = plainText(p.caption);
	}

	function syncAll() {
		if (S.mode !== 'visual' || !S.doc) return;
		S.doc.blocks.forEach(syncBlock);
	}

	function currentText() {
		if (!S.doc) return '';
		if (S.mode === 'source') return document.querySelector('.ed-source').value;
		syncAll();
		return D.serialize(S.doc);
	}

	var changeTimer = null;
	function changed() {
		clearTimeout(changeTimer);
		changeTimer = setTimeout(updateDirty, 120);
	}

	function pendingUploads(text) {
		return Object.keys(S.uploads).filter(function (p) {
			return S.uploads[p].pending && text.indexOf('/' + p) > -1;
		});
	}

	var draftTimer = null;
	function updateDirty() {
		if (!S.doc) return;
		var text = currentText();
		S.dirty = text !== S.original || pendingUploads(text).length > 0 || !!(S.file && S.file.isNew);
		document.body.classList.toggle('ed-is-dirty', S.dirty);
		var save = document.querySelector('.ed-save');
		if (save) save.disabled = !S.dirty;
		var undo = document.querySelector('.ed-undo');
		if (undo) undo.disabled = !S.history.length;
		var redo = document.querySelector('.ed-redo');
		if (redo) redo.disabled = !S.future.length;
		clearTimeout(draftTimer);
		draftTimer = setTimeout(function () {
			if (!S.file) return;
			var key = draftKey();
			if (S.dirty && text !== S.original) store(key, { text: text, sha: S.file.sha, at: Date.now() });
			else store(key, null);
		}, 600);
	}

	function draftKey() {
		return 'ed.draft:' + (S.backend ? S.backend.kind : '') + ':' + S.file.path;
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Undo

	function checkpoint() {
		var t = currentText();
		if (S.history[S.history.length - 1] !== t) S.history.push(t);
		if (S.history.length > 300) S.history.shift();
		S.future = [];
	}

	function endTyping() {
		S.typing = false;
		clearTimeout(S.typingTimer);
	}

	function noteTyping() {
		if (!S.typing) { checkpoint(); S.typing = true; }
		clearTimeout(S.typingTimer);
		S.typingTimer = setTimeout(function () { S.typing = false; }, 900);
	}

	function restoreText(text) {
		var y = window.scrollY;
		S.doc = D.parse(text);
		renderCanvas();
		window.scrollTo(0, y);
		if (S.drawerOpen) renderDrawer();
		changed();
	}

	function undo() {
		endTyping();
		if (!S.history.length) return;
		S.future.push(currentText());
		restoreText(S.history.pop());
	}

	function redo() {
		endTyping();
		if (!S.future.length) return;
		S.history.push(currentText());
		restoreText(S.future.pop());
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Images

	function resolveSrc(src) {
		if (!src) return '';
		var path = src.replace(/^\//, '');
		if (S.uploads[path]) return S.uploads[path].url;
		if (/^(https?:|data:|blob:)/.test(src)) return src;
		return '/' + path;
	}

	function pickFiles(multiple) {
		return new Promise(function (resolve) {
			var input = h('input', { type: 'file', accept: 'image/*', multiple: multiple ? true : null, style: { display: 'none' } });
			input.addEventListener('change', function () { resolve(Array.prototype.slice.call(input.files)); input.remove(); });
			document.body.appendChild(input);
			input.click();
		});
	}

	function decodeImage(file) {
		if (window.createImageBitmap) {
			return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () { return viaImg(file); });
		}
		return viaImg(file);
	}

	function viaImg(file) {
		return new Promise(function (resolve, reject) {
			var img = new Image();
			var url = URL.createObjectURL(file);
			img.onload = function () { resolve(img); };
			img.onerror = function () { reject(new Error('This browser can\'t read ' + file.name + '. Try exporting it as a JPG.')); };
			img.src = url;
		});
	}

	function canvasBlob(canvas, type, q) {
		return new Promise(function (resolve) { canvas.toBlob(resolve, type, q); });
	}

	// Shrinks a photo to at most maxEdge px and converts it to WebP, so
	// straight-off-the-phone photos don't bloat the site
	function prepareImage(file, maxEdge) {
		if (/gif|svg/.test(file.type)) {
			return Promise.resolve({ blob: file, ext: file.type.indexOf('gif') > -1 ? 'gif' : 'svg' });
		}
		return decodeImage(file).then(function (img) {
			var w = img.width;
			var hgt = img.height;
			var scale = Math.min(1, maxEdge / Math.max(w, hgt));
			var canvas = document.createElement('canvas');
			canvas.width = Math.round(w * scale);
			canvas.height = Math.round(hgt * scale);
			canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
			return canvasBlob(canvas, 'image/webp', 0.84).then(function (blob) {
				if (blob && blob.type === 'image/webp') return { blob: blob, ext: 'webp' };
				return canvasBlob(canvas, 'image/jpeg', 0.86).then(function (jb) { return { blob: jb, ext: 'jpg' }; });
			}).then(function (out) {
				var ext = (/\.(\w+)$/.exec(file.name) || [])[1];
				if (scale === 1 && out.blob.size >= file.size && /^(webp|jpe?g|png)$/i.test(ext || '')) {
					return { blob: file, ext: ext.toLowerCase() };
				}
				return out;
			});
		});
	}

	function imagePaths() {
		var out = [];
		(S.doc ? S.doc.blocks : []).forEach(function (b) {
			var d = b.data;
			(d.images || []).forEach(function (im) { out.push(im.src); });
			(d.steps || []).forEach(function (s) { if (s.src) out.push(s.src); });
		});
		return out.filter(Boolean);
	}

	// The folder this page's photos live in, e.g. images/nixie
	function imageDir() {
		var counts = {};
		imagePaths().forEach(function (src) {
			var m = /^\/?(images\/(?!thumbs\/)[^]+)\/[^\/]+$/.exec(src);
			if (m) counts[m[1]] = (counts[m[1]] || 0) + 1;
		});
		var best = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; })[0];
		if (best) return best;
		var link = String(fmGet('permalink') || '').replace(/^\/|\/$/g, '').split('/').pop();
		var base = link || S.file.path.split('/').pop().replace(/\.\w+$/, '').replace(/^\d{4}(-\d{1,2}){0,3}-/, '');
		return 'images/' + D.slugify(base).replace(/-/g, '_');
	}

	function existingNames(dir) {
		if (S.dirCache[dir]) return Promise.resolve(S.dirCache[dir]);
		return S.backend.list(dir).then(function (items) {
			S.dirCache[dir] = items.map(function (i) { return i.name.toLowerCase(); });
			return S.dirCache[dir];
		}).catch(function () { return []; });
	}

	// Prepares files and stages them for the next save. Resolves to their
	// site paths (/images/...).
	function addImages(files, opts) {
		opts = opts || {};
		files = files.filter(function (f) { return /^image\//.test(f.type) || /\.(heic|heif)$/i.test(f.name); });
		if (!files.length) return Promise.resolve([]);
		var dir = opts.dir || imageDir();
		var note = toast(files.length > 1 ? 'Preparing ' + files.length + ' photos…' : 'Preparing photo…', null, 60000);
		return existingNames(dir).then(function (taken) {
			taken = taken.slice();
			return files.reduce(function (p, file) {
				return p.then(function (acc) {
					return prepareImage(file, opts.maxEdge || 2000).then(function (out) {
						var base = opts.name || D.slugify(file.name.replace(/\.\w+$/, '')).replace(/-/g, '_');
						var name = base + '.' + out.ext;
						var n = 2;
						while (taken.indexOf(name.toLowerCase()) > -1 || S.uploads[dir + '/' + name]) {
							name = base + '_' + (n++) + '.' + out.ext;
						}
						taken.push(name.toLowerCase());
						var path = dir + '/' + name;
						S.uploads[path] = { blob: out.blob, url: URL.createObjectURL(out.blob), pending: true };
						return acc.concat('/' + path);
					}).catch(function (err) {
						toast(err.message || 'Couldn\'t read ' + file.name, 'error', 6000);
						return acc;
					});
				});
			}, Promise.resolve([]));
		}).then(function (paths) {
			note.remove();
			changed();
			return paths;
		});
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Block ops

	function blockIndex(b) { return S.doc.blocks.indexOf(b); }

	function blockById(id) {
		return S.doc.blocks.filter(function (b) { return b.id === id; })[0];
	}

	function blockOf(el) {
		var w = el && el.closest && el.closest('.ed-block');
		return w ? blockById(w.getAttribute('data-id')) : null;
	}

	function structural(fn, focus) {
		endTyping();
		checkpoint();
		syncAll();
		fn();
		renderBody();
		changed();
		if (focus) focus();
	}

	function insertBlocks(index, blocks, focusFirst) {
		structural(function () {
			Array.prototype.splice.apply(S.doc.blocks, [index, 0].concat(blocks));
		}, focusFirst ? function () { focusBlock(blocks[0], false); } : null);
	}

	function removeBlock(b) {
		structural(function () { S.doc.blocks.splice(blockIndex(b), 1); });
	}

	function moveBlock(b, delta) {
		var i = blockIndex(b);
		var j = i + delta;
		if (j < 0 || j >= S.doc.blocks.length) return;
		structural(function () {
			S.doc.blocks.splice(i, 1);
			S.doc.blocks.splice(j, 0, b);
		}, function () { b.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); flash(b); });
	}

	function moveBlockTo(b, index) {
		var i = blockIndex(b);
		if (index === i || index === i + 1) return;
		structural(function () {
			S.doc.blocks.splice(i, 1);
			S.doc.blocks.splice(index > i ? index - 1 : index, 0, b);
		}, function () { flash(b); });
	}

	function replaceBlock(b, blocks, focusFirst) {
		structural(function () {
			Array.prototype.splice.apply(S.doc.blocks, [blockIndex(b), 1].concat(blocks));
		}, focusFirst && blocks[0] ? function () { focusBlock(blocks[0], true); } : null);
	}

	function updateBlock(b, fn) {
		structural(function () { fn(b.data); });
	}

	function flash(b) {
		if (!b.el) return;
		b.el.classList.remove('ed-flash');
		void b.el.offsetWidth;
		b.el.classList.add('ed-flash');
	}

	function focusBlock(b, atEnd) {
		if (!b || !b.el) return;
		var t = b.el.querySelector('.ed-text, .ed-caption');
		if (t) {
			if (b.type === 'list') t = t.querySelector(atEnd ? 'li:last-child' : 'li') || t;
			placeCaret(t, atEnd);
		}
		b.el.scrollIntoView({ block: 'nearest' });
	}

	function newParagraph(md) { return D.makeBlock('paragraph', { md: md || '' }); }
	function newHeading(level, html) { return D.makeBlock('heading', { level: level, html: html || '', style: 'html' }); }
	function newList(ordered, items) { return D.makeBlock('list', { ordered: ordered, marker: ordered ? '.' : '*', items: items || [] }); }

	// Plain text of a text block, as markdown (for converting between types)
	function blockMd(b) {
		syncBlock(b);
		var d = b.data;
		if (b.type === 'paragraph') return d.style === 'html' ? domToMd(htmlEl(d.html)) : d.md;
		if (b.type === 'heading') return d.style === 'md' ? d.md : domToMd(htmlEl(d.html));
		if (b.type === 'list') return d.items.join('\n');
		return '';
	}

	function htmlEl(html) {
		var div = document.createElement('div');
		setRich(div, html);
		return div;
	}

	function convertText(b, to) {
		var md = blockMd(b);
		var lines = md.split('\n').filter(function (l) { return l.trim(); });
		var out;
		if (to === 'p') out = (b.type === 'list' ? lines : [md]).map(function (l) { return newParagraph(l); });
		else if (to === 'h3' || to === 'h4') out = [newHeading(to === 'h3' ? 3 : 4, D.mdInlineToHtml(lines.join(' ')))];
		else out = [newList(to === 'ol', lines.length ? lines : [''])];
		replaceBlock(b, out, true);
	}

	function hideBlock(b) {
		syncBlock(b);
		var text = D.serializeBlock(b);
		if (text.indexOf('-->') > -1) { toast('This block contains "-->", so it can\'t be hidden.', 'error'); return; }
		var c = D.makeBlock('comment', { raw: '<!--\n' + text + '\n-->' });
		replaceBlock(b, [c]);
		toast('Hidden. It stays in the file but won\'t show on the site.');
	}

	function commentInner(raw) {
		return raw.replace(/^\s*<!--/, '').replace(/-->\s*$/, '');
	}

	function unhideBlock(b) {
		var parsed = D.parseBody(commentInner(b.data.raw).replace(/^\n+|\s+$/g, ''));
		if (!parsed.blocks.length) { removeBlock(b); return; }
		parsed.blocks[0].sep = b.sep;
		replaceBlock(b, parsed.blocks);
	}

	function duplicateBlock(b) {
		syncBlock(b);
		var copy = D.parseBody(D.serializeBlock(b)).blocks;
		insertBlocks(blockIndex(b) + 1, copy);
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Insert menu

	function insertMenu(anchor, index) {
		menu(anchor, [
			{ label: 'Text', icon: 'text', run: function () { insertBlocks(index, [newParagraph()], true); } },
			{ label: 'Section heading', icon: 'heading', run: function () { insertBlocks(index, [newHeading(3)], true); } },
			{ label: 'Subheading', icon: 'heading', hint: 'smaller', run: function () { insertBlocks(index, [newHeading(4)], true); } },
			{ label: 'Bullet list', icon: 'list', run: function () { insertBlocks(index, [newList(false, [''])], true); } },
			{ label: 'Numbered list', icon: 'olist', run: function () { insertBlocks(index, [newList(true, [''])], true); } },
			null,
			{ label: 'Photo', icon: 'image', run: function () { insertPhotos(index, false); } },
			{ label: 'Gallery', icon: 'gallery', run: function () { insertPhotos(index, true); } },
			{ label: 'Story timeline', icon: 'story', hint: 'photo + text steps', run: function () { insertStory(index); } },
			{ label: 'Video', icon: 'video', hint: 'YouTube, Vimeo, Drive', run: function () { insertVideo(anchor, index); } },
			null,
			{ label: 'Hidden note', icon: 'hide', hint: 'not shown on the site', run: function () {
				var c = D.makeBlock('comment', { raw: '<!-- note -->' });
				insertBlocks(index, [c]);
				editSource(c);
			} },
			{ label: 'HTML / Markdown', icon: 'code', run: function () {
				var r = D.makeBlock('raw', { raw: '' });
				insertBlocks(index, [r]);
				editSource(r);
			} }
		]);
	}

	function insertPhotos(index, asGallery) {
		pickFiles(true).then(addImages).then(function (paths) {
			if (!paths.length) return;
			insertBlocks(index, [mediaBlockFor(paths, asGallery)]);
		});
	}

	function mediaBlockFor(paths, asGallery) {
		var imgs = paths.map(function (p) { return { src: p, alt: '' }; });
		if (imgs.length === 1 && !asGallery) {
			return D.makeBlock('image', { form: 'md', images: imgs, altIn: 'ial', ial: [], caption: '' });
		}
		return D.makeBlock('gallery', { style: imgs.length > 4 ? 'bento' : 'strip', columns: null, images: imgs, caption: '' });
	}

	function insertStory(index) {
		insertBlocks(index, [D.makeBlock('story', { steps: [{ html: '', src: '', alt: '' }, { html: '', src: '', alt: '' }] })]);
	}

	function videoPrompt(anchor, current, done) {
		var input = h('input', { type: 'url', class: 'ed-input', placeholder: 'Paste a YouTube, Vimeo or Google Drive link', value: current || '' });
		var go = function () {
			var url = D.embedUrl(input.value);
			if (!url) return;
			closePopover();
			done(url);
		};
		input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } });
		popover(anchor, h('div', { class: 'ed-pop__form' }, field('Video link', input), h('button', { type: 'button', class: 'ed-btn ed-btn--label ed-btn--primary', onclick: go }, 'Embed')));
	}

	function insertVideo(anchor, index) {
		videoPrompt(anchor, '', function (url) {
			insertBlocks(index, [D.makeBlock('embed', { src: url, form: /drive\.google/.test(url) ? 'figure' : 'bare', raw: null, caption: '' })]);
		});
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Block rendering

	function textEl(tag, html, rich, ph) {
		var el = h(tag, { class: 'ed-text' + (rich ? ' ed-rich' : ''), contenteditable: 'true', 'data-ph': ph || '', spellcheck: 'true' });
		setRich(el, html);
		return el;
	}

	function captionEl(b, cls) {
		var code = h('code', { class: 'ed-caption', contenteditable: 'true', 'data-ph': 'Add a caption…', spellcheck: 'true' });
		code.textContent = b.data.caption || '';
		var wrap = h('div', { class: 'language-plaintext highlighter-rouge ' + (cls || '') },
			h('div', { class: 'highlight' }, h('pre', { class: 'highlight' }, code)));
		var sync = function () { wrap.classList.toggle('ed-cap-empty', !code.textContent.trim()); };
		code.addEventListener('input', sync);
		sync();
		b.parts.caption = code;
		return wrap;
	}

	var RENDER = {
		paragraph: function (b) {
			var d = b.data;
			var el = textEl('p', d.style === 'html' ? d.html : D.mdInlineToHtml(d.md), true, 'Write something…');
			b.parts.text = el;
			return el;
		},

		heading: function (b) {
			var d = b.data;
			var el = textEl('h' + d.level, d.style === 'md' ? D.mdInlineToHtml(d.md) : d.html, false, d.level <= 3 ? 'Section heading' : 'Subheading');
			b.parts.text = el;
			return el;
		},

		list: function (b) {
			var d = b.data;
			var list = h(d.ordered ? 'ol' : 'ul', { class: 'ed-text ed-rich ed-list', contenteditable: 'true', spellcheck: 'true' });
			(d.items.length ? d.items : ['']).forEach(function (it) {
				var li = h('li', { 'data-ph': 'List item' });
				setRich(li, D.mdInlineToHtml(it));
				list.appendChild(li);
			});
			b.parts.list = list;
			return list;
		},

		image: function (b) {
			var d = b.data;
			var plate = h(d.form === 'figure' ? 'figure' : 'div', { class: d.form === 'figure' ? 'ed-media' : 'image-wrap ed-media' });
			d.images.forEach(function (im, i) {
				var img = h('img', { src: resolveSrc(im.src), alt: im.alt, title: 'Click to replace or edit alt text' });
				img.addEventListener('click', function () { imageMenu(img, b, i); });
				append(plate, d.form === 'figure' ? h('p', null, img) : img);
			});
			plate.appendChild(captionEl(b));
			return plate;
		},

		gallery: function (b) {
			var d = b.data;
			var styleKey = galleryKey(d);
			var g = h('div', {
				class: 'gallery gallery--on ed-gallery ' + ({ bento: 'gallery--bento', strip: 'gallery--strip', carousel: 'gallery--carousel ed-carousel' }[styleKey] || 'gallery--grid ed-grid'),
				'data-style': d.style, 'data-columns': d.columns
			});
			var wrap = h('div', { class: 'gallery__wrap' });
			d.images.forEach(function (im, i) {
				var img = h('img', { src: resolveSrc(im.src), alt: im.alt, draggable: 'false' });
				var item = h('div', { class: 'gallery__item', draggable: 'true', 'data-index': i },
					h('a', { class: 'gallery__item__link' }, img),
					h('div', { class: 'ed-item-tools' },
						btn('Alt text / replace', 'edit', function (e) { imageMenu(e.currentTarget, b, i); }),
						btn('Remove from gallery', 'x', function () {
							updateBlock(b, function (dd) { dd.images.splice(i, 1); });
						})));
				if (styleKey === 'bento') {
					var classify = function () {
						if (!img.naturalWidth) return;
						var ratio = img.naturalWidth / img.naturalHeight;
						if (ratio < 0.9) item.classList.add('gallery__item--tall');
						else if (ratio > 1.7) item.classList.add('gallery__item--wide');
						if (i === 0 && d.images.length >= 5 && ratio >= 0.9 && ratio <= 1.7) item.classList.add('gallery__item--hero');
					};
					if (img.complete) classify(); else img.addEventListener('load', classify);
				}
				wrapGalleryDrag(item, b, i);
				wrap.appendChild(item);
			});
			wrap.appendChild(h('button', {
				type: 'button', class: 'gallery__item ed-gallery-add', title: 'Add photos',
				onclick: function () { addToGallery(b); }
			}, icon('plus'), h('span', { text: 'Add photos' })));
			g.appendChild(wrap);
			g.addEventListener('dragover', function (e) {
				if (!hasFiles(e)) return;
				e.preventDefault();
				e.stopPropagation();
				g.classList.add('ed-drop-target');
				hideDropLine();
			});
			g.addEventListener('dragleave', function () { g.classList.remove('ed-drop-target'); });
			g.addEventListener('drop', function (e) {
				if (!hasFiles(e)) return;
				e.preventDefault();
				e.stopPropagation();
				g.classList.remove('ed-drop-target');
				addImages(Array.prototype.slice.call(e.dataTransfer.files)).then(function (paths) {
					if (paths.length) updateBlock(b, function (dd) { paths.forEach(function (p) { dd.images.push({ src: p, alt: '' }); }); });
				});
			});
			if (styleKey === 'strip') {
				g.appendChild(h('div', { class: 'gallery__caption' },
					h('span', { class: 'gallery__count', text: d.images.length + ' photos' }), captionEl(b)));
				return g;
			}
			return [g, captionEl(b, 'ed-cap-standalone')];
		},

		story: function (b) {
			var d = b.data;
			var story = h('div', { class: 'story' });
			b.parts.steps = [];
			d.steps.forEach(function (s, i) {
				var text = textEl('div', s.html, true, 'What happened here?');
				text.classList.add('story__text');
				b.parts.steps.push(text);
				var media;
				if (s.src) {
					var img = h('img', { src: resolveSrc(s.src), alt: s.alt, title: 'Click to replace or edit alt text' });
					img.addEventListener('click', function () { stepImageMenu(img, b, i); });
					media = h('div', { class: 'story__media' }, img);
				} else {
					media = h('button', { type: 'button', class: 'story__media ed-story-add', onclick: function () { setStepImage(b, i); } }, icon('image'), h('span', { text: 'Add photo' }));
				}
				story.appendChild(h('div', { class: 'story__step' },
					h('div', { class: 'story__dot' }),
					text,
					media,
					h('div', { class: 'ed-step-tools' },
						btn('Move step up', 'up', function () { moveStep(b, i, -1); }),
						btn('Move step down', 'down', function () { moveStep(b, i, 1); }),
						btn('Add step below', 'plus', function () { updateBlock(b, function (dd) { dd.steps.splice(i + 1, 0, { html: '', src: '', alt: '' }); }); }),
						btn('Remove step', 'trash', function () { updateBlock(b, function (dd) { dd.steps.splice(i, 1); }); }))));
			});
			var add = h('button', { type: 'button', class: 'ed-btn ed-btn--label ed-story-more', onclick: function () {
				updateBlock(b, function (dd) { dd.steps.push({ html: '', src: '', alt: '' }); });
			} }, icon('plus'), h('span', { text: 'Add step' }));
			return [story, h('div', { class: 'ed-center' }, add)];
		},

		embed: function (b) {
			var d = b.data;
			var frame = h('iframe', { src: d.src, allowfullscreen: true, loading: 'lazy', title: 'Embedded video' });
			var wrap = h('div', { class: 'video-wrap ed-media' },
				h('div', { class: 'video', style: { paddingBottom: '56.25%' } }, frame),
				h('div', { class: 'ed-embed-shield', title: 'Click to change the video link', onclick: function (e) {
					videoPrompt(e.currentTarget, d.src, function (url) { updateBlock(b, function (dd) { dd.src = url; }); });
				} }));
			return [wrap, captionEl(b, 'ed-cap-standalone')];
		},

		comment: function (b) {
			var inner = commentInner(b.data.raw).trim();
			return h('div', { class: 'ed-note' },
				h('div', { class: 'ed-note__label' }, icon('hide'), h('span', { text: 'Hidden — kept in the file, not shown on the site' })),
				h('pre', { class: 'ed-note__text', text: inner.length > 600 ? inner.slice(0, 600) + '…' : inner, onclick: function () { editSource(b); } }));
		},

		raw: function (b) {
			var raw = b.data.raw;
			var wrap = h('div', { class: 'ed-raw' });
			var looksHtml = /^\s*</.test(raw) && !/\{%|\{\{/.test(raw);
			if (looksHtml) {
				var preview = h('div', { class: 'ed-raw__preview' });
				setRich(preview, raw);
				// setRich keeps only inline-safe content; raw blocks may use layout tags
				var t = document.createElement('template');
				t.innerHTML = raw;
				t.content.querySelectorAll('script').forEach(function (n) { n.remove(); });
				t.content.querySelectorAll('*').forEach(function (n) {
					Array.prototype.slice.call(n.attributes).forEach(function (a) {
						if (/^on/i.test(a.name) || /^\s*javascript:/i.test(a.value)) n.removeAttribute(a.name);
					});
					if (n.nodeName === 'IMG' && n.getAttribute('src')) n.setAttribute('src', resolveSrc(n.getAttribute('src')));
				});
				preview.innerHTML = '';
				preview.appendChild(t.content);
				wrap.appendChild(preview);
			} else {
				wrap.appendChild(h('pre', { class: 'ed-raw__src', text: raw }));
			}
			wrap.appendChild(h('button', { type: 'button', class: 'ed-raw__badge', onclick: function () { editSource(b); } }, icon('code'), h('span', { text: 'Edit source' })));
			return wrap;
		}
	};

	function galleryKey(d) {
		if (d.style === 'bento' || d.style === 'strip') return d.style;
		if (d.columns === '1') return 'carousel';
		return 'grid' + (d.columns || '3');
	}

	function imageMenu(anchor, b, i) {
		var im = b.data.images[i];
		var alt = h('input', { type: 'text', class: 'ed-input', value: im.alt || '', placeholder: 'Describe the photo for screen readers' });
		var commit = function () {
			if (alt.value !== (im.alt || '')) updateBlock(b, function (d) { d.images[i].alt = alt.value; });
		};
		alt.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); closePopover(); } });
		popover(anchor, h('div', { class: 'ed-pop__form' },
			h('img', { class: 'ed-pop__thumb', src: resolveSrc(im.src), alt: '' }),
			h('div', { class: 'ed-pop__path', text: im.src }),
			field('Alt text', alt),
			h('div', { class: 'ed-pop__row' },
				h('button', { type: 'button', class: 'ed-btn ed-btn--label', onclick: function () {
					closePopover();
					pickFiles(false).then(addImages).then(function (paths) {
						if (paths[0]) updateBlock(b, function (d) { d.images[i].src = paths[0]; });
					});
				} }, icon('swap'), h('span', { text: 'Replace' })),
				h('a', { class: 'ed-btn ed-btn--label', href: resolveSrc(im.src), target: '_blank', rel: 'noopener' }, icon('external'), h('span', { text: 'Full size' })))
		), { onClose: commit });
	}

	function stepImageMenu(anchor, b, i) {
		var s = b.data.steps[i];
		var alt = h('input', { type: 'text', class: 'ed-input', value: s.alt || '', placeholder: 'Describe the photo' });
		popover(anchor, h('div', { class: 'ed-pop__form' },
			field('Alt text', alt),
			h('div', { class: 'ed-pop__row' },
				h('button', { type: 'button', class: 'ed-btn ed-btn--label', onclick: function () { closePopover(); setStepImage(b, i); } }, icon('swap'), h('span', { text: 'Replace' })),
				h('button', { type: 'button', class: 'ed-btn ed-btn--label', onclick: function () {
					closePopover();
					updateBlock(b, function (d) { d.steps[i].src = ''; d.steps[i].alt = ''; });
				} }, icon('x'), h('span', { text: 'Remove photo' })))
		), { onClose: function () {
			if (alt.value !== (s.alt || '')) updateBlock(b, function (d) { d.steps[i].alt = alt.value; });
		} });
	}

	function setStepImage(b, i) {
		pickFiles(false).then(addImages).then(function (paths) {
			if (paths[0]) updateBlock(b, function (d) { d.steps[i].src = paths[0]; });
		});
	}

	function moveStep(b, i, delta) {
		var j = i + delta;
		if (j < 0 || j >= b.data.steps.length) return;
		updateBlock(b, function (d) { var s = d.steps.splice(i, 1)[0]; d.steps.splice(j, 0, s); });
	}

	function addToGallery(b) {
		pickFiles(true).then(addImages).then(function (paths) {
			if (paths.length) updateBlock(b, function (d) { paths.forEach(function (p) { d.images.push({ src: p, alt: '' }); }); });
		});
	}

	function wrapGalleryDrag(item, b, i) {
		item.addEventListener('dragstart', function (e) {
			S.dragItem = { block: b, index: i };
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', 'gallery-item');
			e.stopPropagation();
		});
		item.addEventListener('dragover', function (e) {
			if (!S.dragItem || S.dragItem.block !== b) return;
			e.preventDefault();
			e.stopPropagation();
			item.classList.add('ed-item-over');
		});
		item.addEventListener('dragleave', function () { item.classList.remove('ed-item-over'); });
		item.addEventListener('drop', function (e) {
			if (!S.dragItem || S.dragItem.block !== b) return;
			e.preventDefault();
			e.stopPropagation();
			var from = S.dragItem.index;
			S.dragItem = null;
			if (from === i) return;
			updateBlock(b, function (d) { var im = d.images.splice(from, 1)[0]; d.images.splice(i, 0, im); });
		});
		item.addEventListener('dragend', function () { S.dragItem = null; });
	}

	// Block chrome: drag handle and + on the left, tools on the right
	function toolsFor(b) {
		var t = [];
		if (TEXT_TYPES[b.type]) {
			var cur = b.type === 'heading' ? 'h' + Math.min(4, Math.max(3, b.data.level)) : b.type === 'list' ? (b.data.ordered ? 'ol' : 'ul') : 'p';
			var labels = { p: 'Text', h3: 'Section heading', h4: 'Subheading', ul: 'Bullet list', ol: 'Numbered list' };
			t.push(h('button', { type: 'button', class: 'ed-btn ed-btn--label ed-btn--small', title: 'Change block type', onclick: function (e) {
				menu(e.currentTarget, ['p', 'h3', 'h4', 'ul', 'ol'].map(function (k) {
					return { label: labels[k], icon: { p: 'text', h3: 'heading', h4: 'heading', ul: 'list', ol: 'olist' }[k], active: k === cur, run: function () { if (k !== cur) convertText(b, k); } };
				}));
			} }, h('span', { text: labels[cur] }), h('span', { class: 'ed-caret', text: '▾' })));
		}
		if (b.type === 'image') {
			t.push(btn('Replace photo', 'swap', function () {
				pickFiles(false).then(addImages).then(function (paths) {
					if (paths[0]) updateBlock(b, function (d) { d.images[0].src = paths[0]; });
				});
			}));
			t.push(btn('Turn into a gallery', 'gallery', function () {
				syncBlock(b);
				var g = D.makeBlock('gallery', { style: 'strip', columns: null, images: b.data.images.slice(), caption: b.data.caption || '' });
				replaceBlock(b, [g]);
				addToGallery(g);
			}));
		}
		if (b.type === 'gallery') {
			var key = galleryKey(b.data);
			t.push(h('button', { type: 'button', class: 'ed-btn ed-btn--label ed-btn--small', title: 'Gallery layout', onclick: function (e) {
				menu(e.currentTarget, GALLERY_STYLES.map(function (s) {
					return { label: s[1], active: s[0] === key, run: function () { updateBlock(b, function (d) { d.style = s[2].style; d.columns = s[2].columns; }); } };
				}));
			} }, h('span', { text: (GALLERY_STYLES.filter(function (s) { return s[0] === key; })[0] || [0, 'Layout'])[1] }), h('span', { class: 'ed-caret', text: '▾' })));
			t.push(btn('Add photos', 'plus', function () { addToGallery(b); }));
		}
		if (b.type === 'embed') {
			t.push(btn('Change video link', 'link', function (e) {
				videoPrompt(e.currentTarget, b.data.src, function (url) { updateBlock(b, function (d) { d.src = url; }); });
			}));
		}
		if (b.type === 'comment') {
			t.push(btn('Edit note', 'edit', function () { editSource(b); }));
			t.push(btn('Show on the site', 'eye', function () { unhideBlock(b); }));
		}
		if (b.type === 'raw') t.push(btn('Edit source', 'code', function () { editSource(b); }));
		t.push(btn('Move up', 'up', function () { moveBlock(b, -1); }));
		t.push(btn('Move down', 'down', function () { moveBlock(b, 1); }));
		t.push(btn('More', 'more', function (e) {
			menu(e.currentTarget, [
				{ label: 'Duplicate', icon: 'copy', run: function () { duplicateBlock(b); } },
				b.type !== 'comment' ? { label: 'Hide from the site', icon: 'hide', hint: 'keeps it in the file', run: function () { hideBlock(b); } } : null,
				b.type !== 'raw' && b.type !== 'comment' ? { label: 'Edit source', icon: 'code', run: function () { editSource(b); } } : null,
				null,
				{ label: 'Delete', icon: 'trash', danger: true, run: function () { removeBlock(b); } }
			].filter(function (x, k, arr) { return x !== null || (k > 0 && arr[k - 1] !== null); }));
		}));
		return t;
	}

	function renderBlock(b) {
		b.parts = {};
		var wrap = h('div', { class: 'ed-block ed-block--' + b.type, 'data-id': b.id });
		// A span, not a button: Firefox won't start a drag from a <button>
		var grip = h('span', { class: 'ed-btn ed-grip', draggable: 'true', title: 'Drag to move (or use the arrows)', 'aria-hidden': 'true' }, icon('grip'));
		grip.addEventListener('dragstart', function (e) {
			syncAll();
			S.dragBlock = b;
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', 'block');
			e.dataTransfer.setDragImage(wrap, 24, 16);
			wrap.classList.add('ed-dragging');
		});
		grip.addEventListener('dragend', function () { S.dragBlock = null; wrap.classList.remove('ed-dragging'); hideDropLine(); });
		wrap.appendChild(h('div', { class: 'ed-gutter' },
			btn('Add a block below', 'plus', function (e) { insertMenu(e.currentTarget, blockIndex(b) + 1); }, 'ed-add'),
			grip));
		wrap.appendChild(h('div', { class: 'ed-tools' }, toolsFor(b)));
		append(wrap, RENDER[b.type] ? RENDER[b.type](b) : RENDER.raw(b));
		b.el = wrap;
		return wrap;
	}

	// Edit a block's source in place (raw blocks, notes, or any block)
	function editSource(b) {
		syncBlock(b);
		var isNote = b.type === 'comment';
		var text = isNote ? commentInner(b.data.raw).replace(/^\n|\n$/g, '') : D.serializeBlock(b);
		var ta = h('textarea', { class: 'ed-code', spellcheck: 'false' });
		ta.value = text;
		var autosize = function () { ta.style.height = 'auto'; ta.style.height = Math.min(600, ta.scrollHeight + 4) + 'px'; };
		ta.addEventListener('input', autosize);
		var done = function () {
			var v = ta.value;
			if (v === text) { renderBody(); return; }
			if (isNote) {
				if (v.indexOf('-->') > -1) { toast('A note can\'t contain "-->".', 'error'); return; }
				var multi = /\n/.test(v);
				var c = D.makeBlock('comment', { raw: '<!--' + (multi ? '\n' + v + '\n' : ' ' + v.trim() + ' ') + '-->' });
				c.sep = b.sep;
				replaceBlock(b, [c]);
				return;
			}
			var parsed = D.parseBody(v.replace(/^\n+|\s+$/g, ''));
			if (parsed.blocks.length) parsed.blocks[0].sep = b.sep;
			replaceBlock(b, parsed.blocks);
		};
		ta.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') { e.preventDefault(); renderBody(); }
			if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); done(); }
			e.stopPropagation();
		});
		var panel = h('div', { class: 'ed-source-edit' },
			h('div', { class: 'ed-source-edit__bar' },
				h('span', { text: isNote ? 'Hidden note' : 'Source' }),
				h('span', { class: 'ed-spacer' }),
				h('button', { type: 'button', class: 'ed-btn ed-btn--label ed-btn--small', onclick: function () { renderBody(); } }, 'Cancel'),
				h('button', { type: 'button', class: 'ed-btn ed-btn--label ed-btn--small ed-btn--primary', onclick: done }, 'Done')),
			ta);
		var content = Array.prototype.slice.call(b.el.children).filter(function (c) {
			return !c.classList.contains('ed-gutter') && !c.classList.contains('ed-tools');
		});
		content.forEach(function (c) { c.remove(); });
		b.el.appendChild(panel);
		b.el.classList.add('ed-editing-source');
		autosize();
		ta.focus();
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Header

	function parseDate(v) {
		var m = /^(\d{4})-(\d{1,2})-(\d{1,2})(.*)$/.exec(String(v || '').trim());
		return m ? { y: +m[1], m: +m[2], d: +m[3], rest: m[4] } : null;
	}

	function formatDate(v) {
		var p = parseDate(v);
		if (!p) return String(v || '');
		return new Date(p.y, p.m - 1, p.d).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	}

	function dateInputValue(v) {
		var p = parseDate(v);
		return p ? p.y + '-' + String(p.m).padStart(2, '0') + '-' + String(p.d).padStart(2, '0') : '';
	}

	function writeDate(isoValue) {
		var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoValue);
		if (!m) return;
		var old = parseDate(fmGet('date'));
		fmSet('date', +m[1] + '-' + (+m[2]) + '-' + (+m[3]) + (old ? old.rest : ' 00:00:00'));
		renderHeader();
	}

	function plainField(tag, key, ph, cls) {
		var el = h(tag, { class: 'ed-plain ' + (cls || ''), contenteditable: 'true', 'data-ph': ph, spellcheck: 'true', 'data-key': key });
		el.textContent = fmGet(key);
		el.addEventListener('input', function () {
			fmSet(key, plainText(el).replace(/\n+/g, ' '));
			if (key === 'title') document.title = (plainText(el) || 'Untitled') + ' – Page Editor';
		});
		return el;
	}

	function badgesRow() {
		var row = h('div', { class: 'ed-badges' });
		var date = fmGet('date');
		if (date) row.appendChild(h('span', { class: 'badge badge--year', text: String(date).slice(0, 4) }));
		SITE.tags.forEach(function (t) {
			var on = !!fm().get(t.key);
			row.appendChild(h('button', {
				type: 'button',
				class: 'badge badge--' + t.key + ' ed-tag' + (on ? '' : ' ed-tag--off'),
				title: (on ? 'Remove the ' : 'Add the ') + t.label + ' tag',
				'aria-pressed': on ? 'true' : 'false',
				onclick: function () {
					endTyping();
					checkpoint();
					fmSet(t.key, !on);
					renderHeader();
				}
			}, t.label));
		});
		return row;
	}

	function metaRow(label, control) {
		return h('div', { class: 'bento__meta-row' }, h('span', { class: 'bento__meta-label', text: label }), control);
	}

	function highlightsBox() {
		var items = fm().get('highlights');
		items = Array.isArray(items) ? items.filter(function (x) { return x.trim(); }) : [];
		var list = h('ul', { class: 'bento__box-list ed-plain-list', contenteditable: 'true', spellcheck: 'true' });
		(items.length ? items : ['']).forEach(function (it) { list.appendChild(h('li', { text: it, 'data-ph': 'Something cool about it!' })); });
		list.addEventListener('input', function () {
			if (!list.querySelector('li')) list.appendChild(h('li', { 'data-ph': 'Something cool about it!' }));
			var vals = Array.prototype.map.call(list.querySelectorAll('li'), function (li) { return plainText(li); })
				.filter(function (s) { return s; });
			var had = fm().has('highlights');
			if (vals.length || had) fmSet('highlights', vals.length ? vals : null);
		});
		return h('div', { class: 'bento__box bento__box--list' }, h('h2', { class: 'bento__box-title', text: 'This one has it all:' }), list);
	}

	function tagGradient() {
		var colors = SITE.tags.filter(function (t) { return fm().get(t.key); }).map(function (t) { return t.color; });
		if (!colors.length) return '';
		return 'repeating-linear-gradient(135deg, ' + colors.map(function (c, i) {
			return c + ' ' + (i * 10) + 'px ' + (i * 10 + 10) + 'px';
		}).join(', ') + ')';
	}

	function layoutName() {
		var l = fmGet('layout');
		if (l) return l;
		return /^_projects\//.test(S.file.path) ? 'wider' : /^_pages\//.test(S.file.path) ? 'page' : 'default';
	}

	function renderHeader() {
		var host = document.querySelector('.ed-header');
		if (!host) return;
		host.innerHTML = '';
		if (!fm()) {
			host.appendChild(h('p', { class: 'ed-warn ed-plain-header', text: 'This file has no front matter (the --- block at the top), so Jekyll doesn\'t build it into a page.' }));
			return;
		}
		var layout = layoutName();
		var title = plainField('h1', 'title', 'Project title');

		if (layout === 'wider' || layout === 'external') {
			host.appendChild(h('section', { class: 'intro' }, h('div', { class: 'wrap wrap--article' }, title, h('br'), badgesRow())));
		}
		if (layout === 'external') {
			var url = h('input', { type: 'url', class: 'ed-input', value: fmGet('external_url'), placeholder: 'https://…' });
			url.addEventListener('input', function () { fmSet('external_url', url.value.trim()); });
			host.appendChild(h('section', { class: 'ed-external' }, h('div', { class: 'wrap' },
				h('p', { text: 'This tile links straight to another site, so it has no page of its own.' }),
				field('Link', url),
				field('Subtitle (shown on the homepage tile)', plainField('div', 'subtitle', 'Short description', 'ed-input'))
			)));
			return;
		}
		if (layout === 'wider') {
			var grad = tagGradient();
			var date = h('button', { type: 'button', class: 'bento__meta-value ed-date', text: formatDate(fmGet('date')) || 'Set a date', onclick: function (e) {
				var input = h('input', { type: 'date', class: 'ed-input', value: dateInputValue(fmGet('date')) });
				input.addEventListener('change', function () { checkpoint(); writeDate(input.value); closePopover(); });
				popover(e.currentTarget, h('div', { class: 'ed-pop__form' }, field('Project date', input, 'Sets the order on the homepage')));
			} });
			var meta = h('div', { class: 'bento__box bento__box--meta' }, h('div', { class: 'bento__meta' },
				metaRow('Date', date),
				metaRow('Complexity', plainField('span', 'complexity', 'e.g. High', 'bento__meta-value')),
				metaRow('Created for', plainField('span', 'created_for', 'a class, a show…', 'bento__meta-value')),
				metaRow('Status', plainField('span', 'status', 'e.g. Complete', 'bento__meta-value'))));
			var desc = h('div', { class: 'bento__box bento__box--desc', style: grad ? { '--tag-border-grad': grad } : null },
				h('div', { class: 'bento__desc' }, plainField('p', 'subtitle', 'A one-line pitch for this project', 'bento__desc-text')));
			if (grad) desc.style.setProperty('--tag-border-grad', grad);
			host.appendChild(h('section', { class: 'bento' }, h('div', { class: 'bento__inner' }, meta, desc, highlightsBox())));
			return;
		}
		if (layout === 'page') {
			host.appendChild(h('section', { class: 'intro' }, h('div', { class: 'wrap' }, title, h('br'),
				plainField('p', 'subtitle', 'Subtitle (optional)'))));
			return;
		}
		host.appendChild(h('div', { class: 'ed-plain-header' }, h('span', { class: 'ed-field__label', text: 'Page title' }), plainField('div', 'title', 'Page title', 'ed-input')));
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Canvas

	function renderBody() {
		var body = document.querySelector('.ed-body');
		if (!body) return;
		closePopover();
		body.innerHTML = '';
		if (layoutName() === 'external') {
			body.hidden = true;
			return;
		}
		body.hidden = false;
		S.doc.blocks.forEach(function (b) { body.appendChild(renderBlock(b)); });
		body.appendChild(h('div', { class: 'ed-end' },
			h('button', { type: 'button', class: 'ed-btn ed-btn--label ed-add-end', onclick: function (e) { insertMenu(e.currentTarget, S.doc.blocks.length); } },
				icon('plus'), h('span', { text: 'Add a block' })),
			h('span', { class: 'ed-end__hint', text: 'or drop photos anywhere on the page' })));
	}

	// After first render, record each block's content as the editor sees it,
	// so blocks you don't touch are saved exactly as they were written
	function baseline() {
		S.doc.blocks.forEach(function (b) {
			if (b.raw == null) return;
			syncBlock(b);
			b.base = D.canon(b);
		});
	}

	function renderCanvas() {
		var canvas = document.querySelector('.ed-canvas');
		var layout = layoutName();
		canvas.innerHTML = '';
		canvas.appendChild(h('div', { class: 'ed-header' }));
		var bodyCls = layout === 'wider' ? 'singles' : layout === 'page' ? 'single' : 'ed-plain-body';
		canvas.appendChild(h('section', { class: 'ed-body ' + bodyCls }));
		renderHeader();
		renderBody();
		baseline();
		document.title = (fmGet('title') || S.file.path) + ' – Page Editor';
	}

	// Headings menu in the top bar for jumping around long pages
	function outlineMenu(anchor) {
		var heads = S.doc ? S.doc.blocks.filter(function (b) { return b.type === 'heading'; }) : [];
		if (!heads.length) { toast('This page has no section headings yet.'); return; }
		menu(anchor, heads.map(function (b) {
			var label = b.parts && b.parts.text ? b.parts.text.textContent.trim() : '';
			return { label: (b.data.level >= 4 ? '\u2003' : '') + (label || 'Untitled section'), run: function () {
				b.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
				flash(b);
			} };
		}));
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Typing

	function onKeyDown(e) {
		var mod = e.metaKey || e.ctrlKey;
		if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
		var inField = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
		if (mod && e.key.toLowerCase() === 'z' && !inField && S.mode === 'visual') {
			e.preventDefault();
			if (e.shiftKey) redo(); else undo();
			return;
		}
		if (mod && e.key.toLowerCase() === 'y' && !inField && S.mode === 'visual') { e.preventDefault(); redo(); return; }

		var t = e.target;
		if (!t.isContentEditable) return;

		if (mod && e.key.toLowerCase() === 'k' && t.closest('.ed-rich')) { e.preventDefault(); showLinkInput(); return; }

		var plain = t.closest('.ed-plain');
		if (plain && e.key === 'Enter') { e.preventDefault(); plain.blur(); return; }
		var plainList = t.closest('.ed-plain-list');
		if (plainList) return;

		var cap = t.closest('.ed-caption');
		if (cap && e.key === 'Enter') { e.preventDefault(); document.execCommand('insertLineBreak'); return; }

		var b = blockOf(t);
		if (!b) return;
		var el = b.parts.text || b.parts.list;
		if (!el || !el.contains(t)) return;

		if (e.key === 'Enter' && !e.shiftKey && b.type !== 'list') {
			e.preventDefault();
			splitBlock(b);
			return;
		}
		if (e.key === 'Enter' && b.type === 'list' && !e.shiftKey) {
			var li = window.getSelection().anchorNode;
			li = li && (li.nodeType === 1 ? li : li.parentNode).closest('li');
			if (li && !li.textContent.trim() && li === el.lastElementChild) {
				e.preventDefault();
				li.remove();
				insertBlocks(blockIndex(b) + 1, [newParagraph()], true);
			}
			return;
		}
		if (e.key === 'Backspace' && b.type !== 'list' && caretAtStart(el)) {
			if (mergeWithPrevious(b)) e.preventDefault();
			return;
		}
		if (e.key === 'Backspace' && b.type === 'list' && !el.textContent.trim() && el.querySelectorAll('li').length <= 1) {
			e.preventDefault();
			replaceBlock(b, [newParagraph()], true);
			return;
		}
		if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.shiftKey && b.type !== 'list') {
			var down = e.key === 'ArrowDown';
			if (caretOnEdgeLine(el, down)) {
				var sib = adjacentText(b, down ? 1 : -1);
				if (sib) { e.preventDefault(); focusBlock(sib, !down); }
			}
		}
	}

	function adjacentText(b, dir) {
		for (var i = blockIndex(b) + dir; i >= 0 && i < S.doc.blocks.length; i += dir) {
			if (TEXT_TYPES[S.doc.blocks[i].type]) return S.doc.blocks[i];
		}
		return null;
	}

	function splitBlock(b) {
		endTyping();
		checkpoint();
		var el = b.parts.text;
		var sel = window.getSelection();
		var r = sel.getRangeAt(0);
		r.deleteContents();
		var after = document.createRange();
		after.setStart(r.endContainer, r.endOffset);
		after.setEnd(el, el.childNodes.length);
		var tmp = document.createElement('div');
		tmp.appendChild(after.extractContents());
		syncAll();
		var md = domToMd(tmp);
		var nb = newParagraph(md);
		S.doc.blocks.splice(blockIndex(b) + 1, 0, nb);
		renderBody();
		changed();
		focusBlock(nb, false);
	}

	function mergeWithPrevious(b) {
		var i = blockIndex(b);
		var prev = S.doc.blocks[i - 1];
		var el = b.parts.text;
		if (!prev || !TEXT_TYPES[prev.type] || prev.type === 'list') {
			if (!el.textContent.trim()) {
				removeBlock(b);
				if (prev) focusBlock(prev, true);
				return true;
			}
			return false;
		}
		endTyping();
		checkpoint();
		var target = prev.parts.text;
		var offset = target.textContent.length;
		while (el.firstChild) target.appendChild(el.firstChild);
		syncAll();
		S.doc.blocks.splice(i, 1);
		renderBody();
		changed();
		setCaretAtTextOffset(prev.parts.text, offset);
		return true;
	}

	// "## " at the start of a paragraph makes a heading, "- " a list, etc.
	function markdownShortcut(b) {
		if (b.type !== 'paragraph' || b.data.style === 'html') return;
		var el = b.parts.text;
		var txt = el.textContent.replace(/ /g, ' ');
		var m = /^(#{1,4}|[-*]|1[.)]) /.exec(txt);
		if (!m || caretTextOffset(el) !== m[0].length) return;
		var rest = domToMd(el).replace(/^\\?(#{1,4}|[-*]|1\\?[.)])\s*/, '');
		var nb;
		if (m[1][0] === '#') nb = newHeading(m[1].length >= 4 ? 4 : 3, D.mdInlineToHtml(rest));
		else nb = newList(/\d/.test(m[1]), [rest]);
		replaceBlock(b, [nb], true);
	}

	function onInput(e) {
		var t = e.target;
		if (t.closest && t.closest('.ed-canvas')) {
			var b = blockOf(t);
			if (b && b.type === 'paragraph') markdownShortcut(b);
		}
		changed();
	}

	function onBeforeInput(e) {
		var t = e.target;
		if (t.isContentEditable || (t.closest && t.closest('.ed-drawer') && /^(INPUT|TEXTAREA)$/.test(t.tagName))) noteTyping();
	}

	function onPaste(e) {
		var t = e.target;
		if (!t.isContentEditable && !(t.closest && t.closest('[contenteditable]'))) {
			// Pasting a photo anywhere else on the page adds it at the end
			var files = Array.prototype.slice.call((e.clipboardData && e.clipboardData.files) || []);
			if (files.length && S.mode === 'visual' && !/^(INPUT|TEXTAREA)$/.test(t.tagName)) {
				e.preventDefault();
				addImages(files).then(function (paths) {
					if (paths.length) insertBlocks(S.doc.blocks.length, [mediaBlockFor(paths, false)]);
				});
			}
			return;
		}
		var cd = e.clipboardData;
		var imgs = Array.prototype.slice.call(cd.files || []).filter(function (f) { return /^image\//.test(f.type); });
		var b = blockOf(t);
		if (imgs.length && b) {
			e.preventDefault();
			addImages(imgs).then(function (paths) {
				if (paths.length) insertBlocks(blockIndex(b) + 1, [mediaBlockFor(paths, false)]);
			});
			return;
		}
		e.preventDefault();
		var text = cd.getData('text/plain') || '';
		var sel = window.getSelection();
		// A link pasted over selected text links it
		if (/^https?:\/\/\S+$/.test(text.trim()) && !sel.isCollapsed && t.closest('.ed-rich')) {
			document.execCommand('createLink', false, text.trim());
			return;
		}
		var rich = t.closest('.ed-rich');
		// Several paragraphs pasted into a text block become blocks of their own
		if (rich && b && b.type === 'paragraph' && /\n\s*\n/.test(text.trim())) {
			var parsed = D.parseBody(text.replace(/\r\n/g, '\n').trim());
			if (parsed.blocks.length > 1) {
				syncBlock(b);
				var empty = !b.parts.text.textContent.trim();
				parsed.blocks.forEach(function (nb) { nb.sep = '\n\n'; });
				if (empty) replaceBlock(b, parsed.blocks); else insertBlocks(blockIndex(b) + 1, parsed.blocks);
				return;
			}
		}
		if (!t.closest('.ed-caption')) text = text.replace(/\s*\n\s*/g, ' ');
		document.execCommand('insertText', false, text);
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Selection toolbar

	var selBar;
	var savedRange = null;

	function buildSelBar() {
		selBar = h('div', { class: 'ed-selbar', role: 'toolbar', 'aria-label': 'Text formatting' },
			h('button', { type: 'button', class: 'ed-selbar__b', title: 'Bold (⌘B)', onclick: function () { format('bold'); } }, h('b', { text: 'B' })),
			h('button', { type: 'button', class: 'ed-selbar__b', title: 'Italic (⌘I)', onclick: function () { format('italic'); } }, h('i', { text: 'I' })),
			h('button', { type: 'button', class: 'ed-selbar__b', title: 'Code', onclick: toggleCode }, icon('code')),
			h('button', { type: 'button', class: 'ed-selbar__b', title: 'Link (⌘K)', onclick: showLinkInput }, icon('link')),
			h('span', { class: 'ed-selbar__link' }));
		selBar.addEventListener('mousedown', function (e) { if (e.target.tagName !== 'INPUT') e.preventDefault(); });
		document.body.appendChild(selBar);
	}

	function format(cmd) {
		document.execCommand(cmd);
		changed();
	}

	function toggleCode() {
		var sel = window.getSelection();
		if (!sel.rangeCount) return;
		noteTyping();
		var node = sel.anchorNode;
		var code = node && (node.nodeType === 1 ? node : node.parentNode).closest('code');
		if (code && code.closest('.ed-rich')) {
			code.replaceWith(document.createTextNode(code.textContent));
		} else if (!sel.isCollapsed) {
			var r = sel.getRangeAt(0);
			var c = document.createElement('code');
			c.textContent = r.toString();
			r.deleteContents();
			r.insertNode(c);
		}
		changed();
		updateSelBar();
	}

	function currentLink() {
		var sel = window.getSelection();
		if (!sel.rangeCount) return null;
		var n = sel.anchorNode;
		var a = n && (n.nodeType === 1 ? n : n.parentNode).closest('a');
		return a && a.closest('.ed-rich') ? a : null;
	}

	function showLinkInput() {
		var sel = window.getSelection();
		if (!sel.rangeCount) return;
		savedRange = sel.getRangeAt(0).cloneRange();
		var a = currentLink();
		var input = h('input', { type: 'text', class: 'ed-input', placeholder: 'https://… or /other-project/', value: a ? a.getAttribute('href') : '' });
		var apply = function () {
			var url = input.value.trim();
			closePopover();
			var s = window.getSelection();
			s.removeAllRanges();
			s.addRange(savedRange);
			noteTyping();
			if (a && !url) { selectNode(a); document.execCommand('unlink'); }
			else if (a) { a.setAttribute('href', url); }
			else if (url && !savedRange.collapsed) document.execCommand('createLink', false, url);
			changed();
		};
		input.addEventListener('keydown', function (e) {
			if (e.key === 'Enter') { e.preventDefault(); apply(); }
			if (e.key === 'Escape') { e.preventDefault(); closePopover(); }
		});
		var anchor = selBar.classList.contains('is-on') ? selBar : (a || savedRange.startContainer.parentNode);
		popover(anchor, h('div', { class: 'ed-pop__form ed-pop__form--row' }, input,
			h('button', { type: 'button', class: 'ed-btn ed-btn--label ed-btn--primary', onclick: apply }, a ? 'Update' : 'Link'),
			a ? h('button', { type: 'button', class: 'ed-btn ed-btn--label', onclick: function () { input.value = ''; apply(); } }, 'Remove') : null));
	}

	function selectNode(n) {
		var r = document.createRange();
		r.selectNodeContents(n);
		var s = window.getSelection();
		s.removeAllRanges();
		s.addRange(r);
	}

	var selFrame = null;
	function updateSelBar() {
		cancelAnimationFrame(selFrame);
		selFrame = requestAnimationFrame(function () {
			var sel = window.getSelection();
			var hide = function () { selBar.classList.remove('is-on'); };
			if (!sel.rangeCount || S.mode !== 'visual') return hide();
			var n = sel.anchorNode;
			var rich = n && (n.nodeType === 1 ? n : n.parentNode).closest('.ed-rich');
			if (!rich || !rich.contains(sel.focusNode)) return hide();
			var a = currentLink();
			if (sel.isCollapsed && !a) return hide();
			var linkLabel = selBar.querySelector('.ed-selbar__link');
			linkLabel.textContent = a ? a.getAttribute('href') : '';
			linkLabel.hidden = !a;
			var rect = sel.isCollapsed ? a.getBoundingClientRect() : sel.getRangeAt(0).getBoundingClientRect();
			selBar.classList.add('is-on');
			var w = selBar.offsetWidth;
			selBar.style.left = Math.min(Math.max(8, rect.left + rect.width / 2 - w / 2), window.innerWidth - w - 8) + 'px';
			selBar.style.top = Math.max(60, rect.top - selBar.offsetHeight - 8) + 'px';
		});
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Drag & drop

	var dropLine;
	function hasFiles(e) {
		return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') > -1;
	}

	function dropIndex(y) {
		var blocks = S.doc.blocks;
		for (var i = 0; i < blocks.length; i++) {
			var r = blocks[i].el.getBoundingClientRect();
			if (y < r.top + r.height / 2) return i;
		}
		return blocks.length;
	}

	function showDropLine(index) {
		var blocks = S.doc.blocks;
		var body = document.querySelector('.ed-body').getBoundingClientRect();
		var y;
		if (index < blocks.length) y = blocks[index].el.getBoundingClientRect().top;
		else if (blocks.length) y = blocks[blocks.length - 1].el.getBoundingClientRect().bottom;
		else y = body.top + 20;
		dropLine.style.top = (y + window.scrollY - 2) + 'px';
		dropLine.style.left = (body.left + body.width * 0.125) + 'px';
		dropLine.style.width = (body.width * 0.75) + 'px';
		dropLine.classList.add('is-on');
	}

	function hideDropLine() { if (dropLine) dropLine.classList.remove('is-on'); }

	function setupDrop() {
		dropLine = h('div', { class: 'ed-dropline' });
		document.body.appendChild(dropLine);
		var canvas = document.querySelector('.ed-canvas');
		document.addEventListener('dragover', function (e) {
			if (!S.doc || S.mode !== 'visual') return;
			if (S.dragItem) return;
			if (!S.dragBlock && !hasFiles(e)) return;
			e.preventDefault();
			if (!canvas.contains(e.target) && !hasFiles(e)) { hideDropLine(); return; }
			showDropLine(dropIndex(e.clientY));
		});
		document.addEventListener('dragleave', function (e) {
			if (!e.relatedTarget) hideDropLine();
		});
		document.addEventListener('drop', function (e) {
			if (!S.doc || S.mode !== 'visual') return;
			var index = dropIndex(e.clientY);
			hideDropLine();
			if (S.dragBlock) {
				e.preventDefault();
				var b = S.dragBlock;
				S.dragBlock = null;
				moveBlockTo(b, index);
				return;
			}
			if (hasFiles(e)) {
				e.preventDefault();
				addImages(Array.prototype.slice.call(e.dataTransfer.files)).then(function (paths) {
					if (paths.length) insertBlocks(index, [mediaBlockFor(paths, false)]);
				});
			}
		});
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Settings drawer

	function input(key, type, ph) {
		var el = h(type === 'textarea' ? 'textarea' : 'input', { class: 'ed-input', type: type === 'textarea' ? null : (type || 'text'), placeholder: ph || '' });
		el.value = fmGet(key);
		el.addEventListener('input', function () {
			fmSet(key, el.value);
			if (key === 'title' || key === 'subtitle') renderHeader();
		});
		return el;
	}

	function select(key, options, fallback) {
		var cur = String(fmGet(key) || fallback || '');
		var opts = options.slice();
		if (cur && !opts.some(function (o) { return o[0] === cur; })) opts.push([cur, cur]);
		var el = h('select', { class: 'ed-input' }, opts.map(function (o) {
			return h('option', { value: o[0], selected: o[0] === cur ? true : null }, o[1]);
		}));
		el.addEventListener('change', function () {
			endTyping();
			checkpoint();
			fmSet(key, el.value);
			if (key === 'layout') { renderCanvas(); renderDrawer(); }
			else renderDrawer();
		});
		return el;
	}

	function thumbField() {
		var cur = fmGet('featured_image');
		var preview = h('div', { class: 'ed-thumb ed-thumb--' + (fmGet('grid_crop') || 'cover') });
		if (cur) {
			preview.appendChild(h('img', {
				src: resolveSrc(cur), alt: '',
				style: { objectFit: fmGet('grid_crop') || 'cover', objectPosition: String(fmGet('grid_crop_position') || 'center').replace('-', ' ') }
			}));
			preview.appendChild(h('div', { class: 'ed-thumb__overlay' },
				h('strong', { text: fmGet('title') || 'Untitled' }), h('span', { text: fmGet('subtitle') || '' })));
		} else {
			preview.appendChild(h('span', { class: 'ed-thumb__empty', text: 'No thumbnail yet — the homepage tile will be blank.' }));
		}
		var path = h('input', { class: 'ed-input', type: 'text', value: cur, placeholder: '/images/thumbs/…' });
		path.addEventListener('change', function () { checkpoint(); fmSet('featured_image', path.value.trim()); renderDrawer(); });
		var choose = h('div', { class: 'ed-thumb-pick' });
		var seen = {};
		imagePaths().forEach(function (src) {
			if (seen[src]) return;
			seen[src] = 1;
			choose.appendChild(h('button', { type: 'button', class: src === cur ? 'is-active' : '', title: src, onclick: function () {
				checkpoint();
				// A page photo is used as-is; Upload makes a resized thumbnail
				fmSet('featured_image', src);
				renderDrawer();
			} }, h('img', { src: resolveSrc(src), alt: '', loading: 'lazy' })));
		});
		return h('div', { class: 'ed-field' },
			h('span', { class: 'ed-field__label', text: 'Homepage thumbnail' }),
			preview,
			h('div', { class: 'ed-pop__row' },
				h('button', { type: 'button', class: 'ed-btn ed-btn--label', onclick: function () {
					pickFiles(false).then(function (files) {
						var slug = D.slugify(String(fmGet('permalink') || '').replace(/\//g, '') || fmGet('title')).replace(/-/g, '_');
						return addImages(files, { dir: 'images/thumbs', maxEdge: 1200, name: slug });
					}).then(function (paths) {
						if (paths[0]) { checkpoint(); fmSet('featured_image', paths[0]); renderDrawer(); }
					});
				} }, icon('upload'), h('span', { text: 'Upload' }))),
			choose.children.length ? h('span', { class: 'ed-field__hint', text: 'Or pick a photo from this page:' }) : null,
			choose.children.length ? choose : null,
			field('Image path', path));
	}

	function positionPicker() {
		var cur = String(fmGet('grid_crop_position') || 'center');
		var grid = h('div', { class: 'ed-pos', role: 'radiogroup', 'aria-label': 'Thumbnail focus' });
		POSITIONS.forEach(function (p) {
			grid.appendChild(h('button', { type: 'button', role: 'radio', 'aria-checked': p === cur ? 'true' : 'false', class: p === cur ? 'is-active' : '', title: p,
				onclick: function () { checkpoint(); fmSet('grid_crop_position', p); renderDrawer(); } }));
		});
		return h('div', { class: 'ed-field' }, h('span', { class: 'ed-field__label', text: 'Thumbnail focus' }), grid,
			h('span', { class: 'ed-field__hint', text: 'Which part of the photo stays visible when the tile crops it.' }));
	}

	function renderDrawer() {
		var drawer = document.querySelector('.ed-drawer');
		if (!drawer || !fm()) return;
		var scroll = drawer.scrollTop;
		drawer.innerHTML = '';
		var isProject = /^_projects\//.test(S.file.path);
		var layout = layoutName();
		var dateIn = h('input', { type: 'date', class: 'ed-input', value: dateInputValue(fmGet('date')) });
		dateIn.addEventListener('change', function () { checkpoint(); writeDate(dateIn.value); });
		var fav = h('input', { type: 'checkbox', checked: fm().get('favorite') ? true : null });
		fav.addEventListener('change', function () { checkpoint(); fmSet('favorite', fav.checked); });

		drawer.appendChild(h('div', { class: 'ed-drawer__head' },
			h('h2', { text: 'Page settings' }),
			btn('Close', 'x', toggleDrawer)));

		var sections = [];
		sections.push(h('div', { class: 'ed-drawer__section' },
			field('Title', input('title')),
			field('Web address', input('permalink', 'text', '/my-project/'), 'Wrap in slashes, like <code>/nixie_pomo/</code>. Changing it breaks old links.'),
			isProject || fm().has('date') ? field('Date', dateIn, 'Sets the order on the homepage.') : null,
			field('Description', input('description', 'textarea', 'One or two sentences for search results and link previews'))));

		if (isProject) {
			sections.push(h('div', { class: 'ed-drawer__section' },
				h('h3', { text: 'Homepage tile' }),
				thumbField(),
				field('Tile size', select('grid_width', GRID_WIDTHS, 'auto-medium'), 'The grid picks the exact shape to fit the photo.'),
				field('Photo fit', select('grid_crop', CROPS, 'cover')),
				positionPicker(),
				h('label', { class: 'ed-check' }, fav, h('span', { text: 'Favorite' }))));
			sections.push(h('div', { class: 'ed-drawer__section' },
				h('h3', { text: 'Page type' }),
				field('Layout', select('layout', [['wider', 'Project page'], ['external', 'Link to another site']], 'wider')),
				layout === 'external' ? field('Link', input('external_url', 'url', 'https://…')) : null));
		} else if (fm().has('featured_image')) {
			sections.push(h('div', { class: 'ed-drawer__section' }, field('Share image', input('featured_image', 'text', '/images/…'))));
		}

		var extra = fm().keys().filter(function (k) {
			return KNOWN_KEYS.indexOf(k) < 0 && !Array.isArray(fm().get(k)) && typeof fm().get(k) !== 'boolean';
		});
		if (extra.length) {
			sections.push(h('div', { class: 'ed-drawer__section' },
				h('h3', { text: 'Other fields' }),
				extra.map(function (k) { return field(k, input(k)); })));
		}
		sections.push(h('div', { class: 'ed-drawer__section ed-drawer__file' },
			h('span', { class: 'ed-field__label', text: 'File' }), h('code', { text: S.file.path })));
		append(drawer, sections);
		drawer.scrollTop = scroll;
	}

	function toggleDrawer() {
		S.drawerOpen = !S.drawerOpen;
		document.body.classList.toggle('ed-drawer-open', S.drawerOpen);
		if (S.drawerOpen) renderDrawer();
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Source mode

	function toggleSource() {
		if (!S.doc) return;
		var src = document.querySelector('.ed-source');
		if (S.mode === 'visual') {
			endTyping();
			src.value = currentText();
			S.mode = 'source';
			document.body.classList.add('ed-mode-source');
			src.focus();
			src.setSelectionRange(0, 0);
		} else {
			var text = src.value;
			src.blur();
			S.mode = 'visual';
			document.body.classList.remove('ed-mode-source');
			if (text !== D.serialize(S.doc)) {
				S.history.push(D.serialize(S.doc));
				S.future = [];
				restoreText(text);
			}
		}
		document.querySelector('.ed-source-toggle').classList.toggle('is-active', S.mode === 'source');
		changed();
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Saving

	function liveUrl() {
		var link = fmGet('permalink');
		if (!link) {
			var known = SITE.files.filter(function (f) { return f.path === S.file.path; })[0];
			link = known ? known.url : '/';
		}
		if (layoutName() === 'external' && fmGet('external_url')) return fmGet('external_url');
		return link;
	}

	function diffView(a, b) {
		var lines = D.diffLines(a, b);
		var keep = lines.map(function () { return false; });
		lines.forEach(function (l, i) {
			if (l.op === ' ') return;
			for (var k = Math.max(0, i - 2); k <= Math.min(lines.length - 1, i + 2); k++) keep[k] = true;
		});
		var pre = h('pre', { class: 'ed-diff' });
		var gap = false;
		lines.forEach(function (l, i) {
			if (!keep[i]) { if (!gap) pre.appendChild(h('div', { class: 'ed-diff__gap', text: '⋯' })); gap = true; return; }
			gap = false;
			pre.appendChild(h('div', { class: 'ed-diff__line ed-diff__line--' + (l.op === '+' ? 'add' : l.op === '-' ? 'del' : 'ctx'), text: l.op + ' ' + l.text }));
		});
		var adds = lines.filter(function (l) { return l.op === '+'; }).length;
		var dels = lines.filter(function (l) { return l.op === '-'; }).length;
		return { el: pre, adds: adds, dels: dels };
	}

	function kb(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }

	function save() {
		if (!S.doc || !S.dirty || S.saving) return;
		endTyping();
		var text = currentText();
		var imgs = pendingUploads(text);
		var gh = S.backend.kind === 'github';
		var diff = diffView(S.file.isNew ? '' : S.original, text);
		var msg = h('input', { type: 'text', class: 'ed-input', value: (S.file.isNew ? 'Add ' : 'Update ') + (fmGet('title') || S.file.path) });
		var warnings = [];
		if (/^_projects\//.test(S.file.path) && layoutName() !== 'external' && !fmGet('featured_image')) {
			warnings.push('No homepage thumbnail yet, so the tile will be blank. Set one in Page settings.');
		}
		var files = h('ul', { class: 'ed-files' },
			h('li', null, icon('edit'), h('code', { text: S.file.path }), h('span', { class: 'ed-files__stat', html: '<b class="add">+' + diff.adds + '</b> <b class="del">−' + diff.dels + '</b>' })),
			imgs.map(function (p) { return h('li', null, icon('image'), h('code', { text: p }), h('span', { class: 'ed-files__stat', text: kb(S.uploads[p].blob.size) })); }));
		var details = h('details', { class: 'ed-details', open: diff.adds + diff.dels <= 40 ? true : null }, h('summary', { text: 'Show changes' }), diff.el);
		dialog({
			title: gh ? 'Publish changes' : 'Save changes',
			wide: true,
			body: [
				h('p', { class: 'ed-muted', text: gh
					? 'This commits to ' + S.backend.label + '. If that\'s the branch the site deploys from, the live site updates in a minute or two.'
					: 'This writes to the files in your local copy. Commit and push them when you\'re ready.' }),
				warnings.map(function (w) { return h('p', { class: 'ed-warn', text: w }); }),
				files,
				details,
				gh ? field('Commit message', msg) : null
			],
			buttons: [{ label: 'Cancel', value: null }, { label: gh ? 'Publish' : 'Save', value: true, primary: true }],
			enterValue: true
		}).then(function (ok) {
			if (ok) doSave(text, imgs, msg.value.trim() || 'Update ' + S.file.path, false);
		});
	}

	function doSave(text, imgs, message, force) {
		S.saving = true;
		document.body.classList.add('ed-is-saving');
		var page = { path: S.file.path, content: text, expectSha: S.file.isNew ? null : S.file.sha };
		if (force) delete page.expectSha;
		var files = [page].concat(imgs.map(function (p) {
			return { path: p, blob: S.uploads[p].blob };
		}));
		Promise.all(files.map(function (f) {
			if (!f.blob) return f;
			return f.blob.arrayBuffer().then(function (buf) { return { path: f.path, content: new Uint8Array(buf) }; });
		})).then(function (prepared) {
			return S.backend.commit(prepared, message);
		}).then(function (res) {
			S.original = text;
			S.file.sha = res.files[S.file.path];
			S.file.isNew = false;
			imgs.forEach(function (p) { S.uploads[p].pending = false; });
			imgs.forEach(function (p) {
				var dir = p.replace(/\/[^\/]+$/, '');
				if (S.dirCache[dir]) S.dirCache[dir].push(p.split('/').pop().toLowerCase());
			});
			store(draftKey(), null);
			updateDirty();
			updateTopBar();
			var gh = S.backend.kind === 'github';
			toast(h('span', null, gh ? 'Published! The site will update shortly. ' : 'Saved. ',
				h('a', { href: liveUrl(), target: '_blank', rel: 'noopener', text: 'View page' }),
				res.url ? ' · ' : null, res.url ? h('a', { href: res.url, target: '_blank', rel: 'noopener', text: 'Commit' }) : null), 'ok', 7000);
		}).catch(function (err) {
			if (err.name === 'ConflictError') {
				return dialog({
					title: 'This page changed somewhere else',
					body: h('p', { text: 'Someone (maybe you on another device, or another editing session) saved ' + err.paths.join(', ') +
						' after you opened it. You can overwrite their version with yours, or keep your edits as a draft and look at theirs first.' }),
					buttons: [{ label: 'Cancel', value: null }, { label: 'Open their version', value: 'reload' }, { label: 'Overwrite', value: 'force', danger: true }]
				}).then(function (v) {
					if (v === 'force') { S.saving = false; return doSave(text, imgs, message, true); }
					if (v === 'reload') {
						store(draftKey(), { text: text, sha: S.file.sha, at: Date.now() });
						S.dirty = false;
						openFile(S.file.path, { skipDraft: true }).then(function () {
							toast('Your edits are saved as a draft — reopen the page to restore them.', null, 7000);
						});
					}
				});
			}
			toast((err && err.message) || 'Saving failed', 'error', 8000);
		}).then(function () {
			S.saving = false;
			document.body.classList.remove('ed-is-saving');
		});
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Files

	function confirmDiscard() {
		if (!S.dirty) return Promise.resolve(true);
		return dialog({
			title: 'Leave without saving?',
			body: h('p', { text: 'Your unsaved changes stay on this device as a draft, and you\'ll be offered them next time you open this page (photos you added will need adding again).' }),
			buttons: [{ label: 'Stay', value: false }, { label: 'Leave', value: true, primary: true }]
		});
	}

	function setHash(h2) {
		history.replaceState(null, '', '#' + h2);
	}

	function loadDoc(path, text, sha, isNew) {
		S.file = { path: path, sha: sha, isNew: !!isNew };
		S.original = isNew ? '' : text;
		S.history = [];
		S.future = [];
		S.mode = 'visual';
		document.body.classList.remove('ed-mode-source');
		var srcToggle = document.querySelector('.ed-source-toggle');
		if (srcToggle) srcToggle.classList.remove('is-active');
		S.doc = D.parse(text);
		renderApp();
		renderCanvas();
		if (S.drawerOpen) renderDrawer();
		setHash('file=' + encodeURIComponent(path));
		window.scrollTo(0, 0);
		changed();
	}

	function openFile(path, opts) {
		opts = opts || {};
		closePicker();
		document.body.classList.add('ed-is-loading');
		return S.backend.read(path).then(function (f) {
			loadDoc(path, f.content, f.sha, false);
			var draft = opts.skipDraft ? null : store(draftKey());
			if (draft && draft.text !== f.content) {
				var stale = draft.sha !== f.sha;
				dialog({
					title: 'Restore unsaved changes?',
					body: [h('p', { text: 'You have unsaved edits to this page from ' + new Date(draft.at).toLocaleString() + '.' }),
						stale ? h('p', { class: 'ed-warn', text: 'The page has been changed and saved since then. Restoring puts your draft on top, replacing those changes when you save.' }) : null],
					buttons: [{ label: 'Discard draft', value: false }, { label: 'Restore', value: true, primary: true }]
				}).then(function (yes) {
					if (yes) { checkpoint(); restoreText(draft.text); }
					else store(draftKey(), null);
				});
			}
		}).catch(function (err) {
			toast('Couldn\'t open ' + path + ': ' + err.message, 'error', 7000);
			showPicker();
		}).then(function () {
			document.body.classList.remove('ed-is-loading');
		});
	}

	function newProject() {
		var title = h('input', { type: 'text', class: 'ed-input', placeholder: 'Coffeehouse Lighting Console' });
		var today = new Date();
		var date = h('input', { type: 'date', class: 'ed-input', value: today.toISOString().slice(0, 10) });
		var link = h('input', { type: 'text', class: 'ed-input', placeholder: '/coffeehouse-lighting-console/' });
		var linkTouched = false;
		link.addEventListener('input', function () { linkTouched = true; });
		title.addEventListener('input', function () {
			if (!linkTouched) link.value = title.value.trim() ? '/' + D.slugify(title.value) + '/' : '';
		});
		return dialog({
			title: 'New project',
			body: [field('Title', title), field('Date', date, 'Sets its place on the homepage.'), field('Web address', link)],
			buttons: [{ label: 'Cancel', value: null }, { label: 'Create', value: true, primary: true, validate: function () {
				if (!title.value.trim()) { title.focus(); return false; }
				return true;
			} }],
			enterValue: true
		}).then(function (ok) {
			if (!ok) return;
			var d = date.value || today.toISOString().slice(0, 10);
			var p = d.split('-');
			var slug = D.slugify(title.value);
			var path = '_projects/' + p[0] + '-' + slug + '.md';
			var permalink = link.value.trim() || '/' + slug + '/';
			if (!/^\//.test(permalink)) permalink = '/' + permalink;
			if (!/\/$/.test(permalink)) permalink += '/';
			var fmLines = [
				'title: ' + "'" + title.value.trim().replace(/'/g, "''") + "'",
				'subtitle:',
				'date: ' + (+p[0]) + '-' + (+p[1]) + '-' + (+p[2]) + ' 00:00:00',
				'description:',
				'featured_image:',
				'permalink: ' + permalink,
				'layout: wider',
				'grid_width: auto-medium',
				'grid_crop: cover',
				'grid_crop_position: center',
				'',
				'created_for:',
				'status:',
				'complexity:',
				'highlights:',
				''
			].concat(SITE.tags.map(function (t) { return t.key + ':'; }));
			var text = '---\n' + fmLines.join('\n') + '\n---\n\n<h3> Project Summary </h3>\n\n';
			closePicker();
			return S.backend.read(path).then(function () {
				toast(path + ' already exists — opening it instead.', 'error');
				return openFile(path);
			}, function () {
				loadDoc(path, text, null, true);
				var nb = newParagraph();
				S.doc.blocks.push(nb);
				renderBody();
				focusBlock(nb);
			});
		});
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Picker

	function closePicker() {
		var p = document.querySelector('.ed-picker');
		if (p) p.remove();
	}

	function showPicker() {
		closePicker();
		var grid = h('div', { class: 'ed-picker__grid' }, h('p', { class: 'ed-muted', text: 'Loading…' }));
		var search = h('input', { type: 'search', class: 'ed-input ed-picker__search', placeholder: 'Find a page…' });
		var canClose = !!S.doc;
		var picker = h('div', { class: 'ed-picker' },
			h('div', { class: 'ed-picker__inner' },
				h('div', { class: 'ed-picker__head' },
					h('h2', { text: 'Edit a page' }),
					search,
					h('button', { type: 'button', class: 'ed-btn ed-btn--label ed-btn--primary', onclick: function () { confirmDiscard().then(function (ok) { if (ok) newProject(); }); } }, icon('plus'), h('span', { text: 'New project' })),
					canClose ? btn('Close', 'x', closePicker) : null),
				grid));
		picker.addEventListener('keydown', function (e) { if (e.key === 'Escape' && canClose) closePicker(); });
		document.body.appendChild(picker);
		search.focus();

		Promise.all([S.backend.list('_projects'), S.backend.list('_pages')]).then(function (res) {
			var known = {};
			SITE.files.forEach(function (f) { known[f.path] = f; });
			var items = res[0].concat(res[1]).filter(function (f) { return /\.(md|markdown|html)$/.test(f.name) && !/demo-project/.test(f.name); })
				.map(function (f) {
					var k = known[f.path] || {};
					var dm = /^(\d{4})/.exec(f.name);
					return { path: f.path, title: k.title || f.name.replace(/\.\w+$/, ''), image: k.image, date: k.date || (dm ? dm[1] : ''), page: /^_pages\//.test(f.path) };
				});
			items.sort(function (a, b) { return a.page - b.page || String(b.date).localeCompare(String(a.date)); });
			var draw = function () {
				var q = search.value.trim().toLowerCase();
				grid.innerHTML = '';
				var section = null;
				items.filter(function (it) { return !q || (it.title + ' ' + it.path).toLowerCase().indexOf(q) > -1; }).forEach(function (it) {
					var s = it.page ? 'Pages' : 'Projects';
					if (s !== section) { section = s; grid.appendChild(h('h3', { class: 'ed-picker__section', text: s })); }
					var draft = store('ed.draft:' + S.backend.kind + ':' + it.path);
					grid.appendChild(h('button', { type: 'button', class: 'ed-card' + (S.file && S.file.path === it.path ? ' is-current' : ''), onclick: function () {
						if (S.file && S.file.path === it.path) { closePicker(); return; }
						confirmDiscard().then(function (ok) { if (ok) openFile(it.path); });
					} },
						h('div', { class: 'ed-card__img' }, it.image ? h('img', { src: resolveSrc(it.image), alt: '', loading: 'lazy' }) : icon('text')),
						h('div', { class: 'ed-card__body' },
							h('strong', { text: it.title }),
							h('span', { text: (it.date ? String(it.date).slice(0, 4) + ' · ' : '') + it.path.split('/').pop() }),
							draft ? h('em', { class: 'ed-card__draft', text: 'Unsaved draft' }) : null)));
				});
			};
			search.addEventListener('input', draw);
			draw();
		}).catch(function (err) {
			grid.innerHTML = '';
			grid.appendChild(h('p', { class: 'ed-warn', text: 'Couldn\'t list files: ' + err.message }));
		});
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Connecting

	function connectDialog(localAvailable, errorText) {
		var saved = store('ed.github') || {};
		var repo = SITE.repo;
		var owner = h('input', { type: 'text', class: 'ed-input', value: saved.owner || repo.owner });
		var name = h('input', { type: 'text', class: 'ed-input', value: saved.repo || repo.repo });
		var branch = h('input', { type: 'text', class: 'ed-input', value: saved.branch || repo.branch });
		var token = h('input', { type: 'password', class: 'ed-input', value: saved.token || '', placeholder: 'github_pat_…', autocomplete: 'off' });
		var err = h('p', { class: 'ed-warn', hidden: !errorText, text: errorText || '' });
		var tryConnect = function () {
			var be = new B.GitHubBackend({ owner: owner.value.trim(), repo: name.value.trim(), branch: branch.value.trim() || 'main', token: token.value.trim() });
			var note = toast('Connecting…', null, 30000);
			return be.check().then(function () {
				store('ed.github', { owner: be.owner, repo: be.repo, branch: be.branch, token: be.token });
				return be;
			}, function (e) {
				// Reopen with what was typed and the reason it failed
				store('ed.github', { owner: be.owner, repo: be.repo, branch: be.branch, token: be.token });
				return connectDialog(localAvailable, e.message || 'Couldn\'t connect.');
			}).then(function (res) {
				note.remove();
				return res;
			});
		};
		var body = [
			h('p', { text: 'The editor saves by committing to the site\'s GitHub repository, which redeploys the site. Paste a GitHub access token to connect — it\'s kept only in this browser.' }),
			h('details', { class: 'ed-details' }, h('summary', { text: 'How to make a token' }), h('ol', { class: 'ed-steps' },
				h('li', { html: 'Open <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">GitHub → New fine-grained token</a>.' }),
				h('li', { html: 'Under <b>Repository access</b>, choose <b>Only select repositories</b> and pick <b>' + D.escapeHtml(repo.repo) + '</b>.' }),
				h('li', { html: 'Under <b>Permissions → Repository permissions</b>, set <b>Contents</b> to <b>Read and write</b>.' }),
				h('li', { text: 'Generate it, copy it, and paste it below.' }))),
			field('Access token', token),
			h('div', { class: 'ed-row3' }, field('Owner', owner), field('Repository', name), field('Branch', branch)),
			err
		];
		var buttons = [];
		if (localAvailable) buttons.push({ label: 'Use local files instead', value: 'local' });
		buttons.push({ label: 'Connect', value: 'github', primary: true });
		return dialog({ title: 'Connect to GitHub', body: body, buttons: buttons, dismissable: !!S.backend, enterValue: 'github' }).then(function (v) {
			if (v === 'local') return new B.LocalBackend();
			if (v === 'github') {
				return tryConnect();
			}
			return null;
		});
	}

	function connectionMenu(anchor) {
		B.LocalBackend.detect().then(function (local) {
			menu(anchor, [
				{ label: S.backend.kind === 'github' ? 'Connected to ' + S.backend.label : 'Using local files', icon: S.backend.kind === 'github' ? 'cloud' : 'folder', run: function () {} },
				null,
				local && S.backend.kind !== 'local' ? { label: 'Switch to local files', icon: 'folder', run: function () { switchBackend(new B.LocalBackend()); } } : null,
				{ label: S.backend.kind === 'github' ? 'Change GitHub settings' : 'Connect to GitHub', icon: 'cloud', run: function () {
					connectDialog(false).then(function (be) { if (be) switchBackend(be); });
				} },
				S.backend.kind === 'github' ? { label: 'Forget token on this device', icon: 'x', danger: true, run: function () {
					var saved = store('ed.github') || {};
					delete saved.token;
					store('ed.github', saved);
					location.reload();
				} } : null
			].filter(function (x) { return x !== null; }));
		});
	}

	function switchBackend(be) {
		confirmDiscard().then(function (ok) {
			if (!ok) return;
			S.backend = be;
			S.dirCache = {};
			store('ed.backend', be.kind);
			updateTopBar();
			if (S.file && !S.file.isNew) openFile(S.file.path); else showPicker();
		});
	}

	function chooseBackend() {
		return B.LocalBackend.detect().then(function (local) {
			var pref = store('ed.backend');
			var saved = store('ed.github');
			if (local && pref !== 'github') return new B.LocalBackend();
			if (saved && saved.token) {
				var be = new B.GitHubBackend(saved);
				return be.check().then(function () { return be; }, function (e) {
					return connectDialog(local, e.message);
				});
			}
			return connectDialog(local);
		});
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - App shell

	function updateTopBar() {
		var name = document.querySelector('.ed-bar__file');
		if (name && S.file) {
			name.innerHTML = '';
			append(name, [h('strong', { text: fmGet('title') || S.file.path.split('/').pop() }),
				h('span', { class: 'ed-bar__path', text: S.file.path + (S.file.isNew ? ' · new' : '') })]);
		}
		var conn = document.querySelector('.ed-conn');
		if (conn && S.backend) {
			conn.innerHTML = '';
			append(conn, [icon(S.backend.kind === 'github' ? 'cloud' : 'folder'), h('span', { text: S.backend.kind === 'github' ? S.backend.branch : 'Local' })]);
			conn.title = S.backend.kind === 'github' ? 'Saving to ' + S.backend.label : 'Saving to files on this computer';
		}
		var save = document.querySelector('.ed-save span');
		if (save && S.backend) save.textContent = S.backend.kind === 'github' ? 'Publish' : 'Save';
		var live = document.querySelector('.ed-live');
		if (live && S.doc) live.href = liveUrl();
	}

	function renderApp() {
		var app = document.getElementById('ed-app');
		if (app.querySelector('.ed-bar')) { updateTopBar(); return; }
		app.innerHTML = '';
		app.appendChild(h('header', { class: 'ed-bar' },
			h('button', { type: 'button', class: 'ed-btn ed-btn--label', title: 'All pages', onclick: function () { showPicker(); } }, icon('pages'), h('span', { class: 'ed-hide-sm', text: 'Pages' })),
			h('div', { class: 'ed-bar__file' }),
			h('span', { class: 'ed-bar__dot', title: 'Unsaved changes' }),
			h('span', { class: 'ed-spacer' }),
			btn('Undo (⌘Z)', 'undo', undo, 'ed-undo'),
			btn('Redo (⇧⌘Z)', 'redo', redo, 'ed-redo'),
			h('span', { class: 'ed-bar__sep' }),
			btn('Jump to a section', 'list', function (e) { outlineMenu(e.currentTarget); }, 'ed-jump'),
			h('button', { type: 'button', class: 'ed-btn ed-btn--label', title: 'Thumbnail, address, date and more', onclick: toggleDrawer }, icon('settings'), h('span', { class: 'ed-hide-sm', text: 'Page settings' })),
			h('button', { type: 'button', class: 'ed-btn ed-btn--label ed-source-toggle', title: 'Show the Markdown source', onclick: toggleSource }, icon('code'), h('span', { class: 'ed-hide-sm', text: 'Markdown' })),
			h('a', { class: 'ed-btn ed-live', title: 'Open the live page', target: '_blank', rel: 'noopener', href: '/' }, icon('external')),
			h('button', { type: 'button', class: 'ed-btn ed-conn', onclick: function (e) { connectionMenu(e.currentTarget); } }),
			h('button', { type: 'button', class: 'ed-btn ed-btn--label ed-btn--primary ed-save', disabled: true, onclick: save }, icon('check'), h('span', { text: 'Save' }))));
		app.appendChild(h('div', { class: 'ed-main' },
			h('main', { class: 'ed-canvas page__content' }),
			h('textarea', { class: 'ed-source', spellcheck: 'false', 'aria-label': 'Markdown source' }),
			h('aside', { class: 'ed-drawer', 'aria-label': 'Page settings' })));
		updateTopBar();
	}

	function route() {
		var hash = decodeURIComponent(location.hash.replace(/^#/, ''));
		var m;
		if ((m = /^file=(.+)$/.exec(hash))) return openFile(m[1]);
		if ((m = /^url=(.+)$/.exec(hash))) {
			var url = m[1].replace(/index\.html$/, '');
			var f = SITE.files.filter(function (x) { return x.url === url || x.url === url.replace(/\/$/, '') || x.url + '/' === url; })[0];
			if (f) return openFile(f.path);
		}
		if (hash === 'new') return newProject();
		showPicker();
	}

	function start() {
		var app = document.getElementById('ed-app');
		app.appendChild(h('div', { class: 'ed-splash' }, h('div', { class: 'ed-splash__inner', text: 'Loading the editor…' })));
		document.body.appendChild(h('div', { class: 'ed-toasts', 'aria-live': 'polite' }));
		buildSelBar();
		document.addEventListener('keydown', onKeyDown);
		document.addEventListener('input', onInput);
		document.addEventListener('beforeinput', onBeforeInput, true);
		document.addEventListener('paste', onPaste);
		document.addEventListener('selectionchange', updateSelBar);
		document.addEventListener('focusout', function (e) {
			if (e.target.closest && e.target.closest('.ed-plain') && e.target.getAttribute('data-key') === 'title') updateTopBar();
		});
		window.addEventListener('scroll', function () { if (selBar.classList.contains('is-on')) updateSelBar(); }, { passive: true });
		window.addEventListener('beforeunload', function (e) {
			if (S.dirty) { e.preventDefault(); e.returnValue = ''; }
		});
		try { document.execCommand('styleWithCSS', false, false); } catch (e) { /* not supported */ }

		chooseBackend().then(function (be) {
			S.backend = be;
			app.innerHTML = '';
			renderApp();
			setupDrop();
			route();
		});
	}

	start();
}());
