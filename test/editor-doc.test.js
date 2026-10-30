// Checks the page editor's source reader/writer (editor/doc.js).
// Run with: node test/editor-doc.test.js
'use strict';
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var D = require('../editor/doc.js');

var ROOT = path.join(__dirname, '..');
var passed = 0;

function test(name, fn) {
	try {
		fn();
		passed++;
	} catch (e) {
		console.error('FAIL ' + name);
		throw e;
	}
}

function types(doc) {
	return doc.blocks.map(function (b) { return b.type; });
}

// - - - - - - - - - - - - - - - - - - - - Untouched files survive byte-for-byte

['_projects', '_pages'].forEach(function (dir) {
	fs.readdirSync(path.join(ROOT, dir)).forEach(function (f) {
		var text = fs.readFileSync(path.join(ROOT, dir, f), 'utf8');
		test('round-trips ' + dir + '/' + f, function () {
			assert.strictEqual(D.serialize(D.parse(text)), text);
		});
		// Rewriting every block in the editor's own style must keep the
		// content: same block types and the same images in the same order
		test('canonical rewrite of ' + dir + '/' + f + ' keeps its content', function () {
			var doc = D.parse(text);
			doc.blocks.forEach(function (b) { b.raw = null; b.capRaw = null; });
			var again = D.parse(D.serialize(doc));
			assert.deepStrictEqual(types(again), types(D.parse(text)));
			var imgs = function (d) {
				return [].concat.apply([], d.blocks.map(function (b) { return (b.data.images || []).map(function (i) { return i.src; }); }));
			};
			assert.deepStrictEqual(imgs(again), imgs(D.parse(text)));
		});
	});
});

// - - - - - - - - - - - - - - - - - - - - Recognising the site's patterns

var SAMPLE = [
	'---',
	"title: 'Demo'",
	'subtitle: "A thing"',
	'highlights:',
	'  - "one"',
	'  - "two"',
	'date: 2024-9-1 00:00:00',
	'personal:',
	'FAB: true',
	'---',
	'',
	'<h3> Project Summary </h3>',
	'',
	'Some *italic* and **bold** text with a [link](/abLED5/).',
	'',
	'* First',
	'* Second <br><br>',
	'',
	'![](/images/x/a.webp){:width="100%" alt="An image"}',
	'',
	'\tA caption',
	'\tover two lines.',
	'',
	'<div class="gallery" data-style="strip">',
	'\t<img src="/images/x/b.webp">',
	'\t<img src="/images/x/c.webp">',
	'</div>',
	'    Gallery caption.',
	'',
	'{% figure %}',
	'<p><img src="/images/x/d.webp" alt="D"></p>',
	'{% endfigure %}',
	'',
	'<iframe width="560" height="315" src="https://www.youtube.com/embed/abc" allowfullscreen></iframe>',
	'',
	'<!-- a hidden note -->',
	'',
	'<div class="story">',
	'\t<div class="story__step">',
	'\t\t<div class="story__dot"></div>',
	'\t\t<div class="story__text">Step one.</div>',
	'\t\t<div class="story__media"><img src="/images/x/e.webp" alt="E"></div>',
	'\t</div>',
	'</div>',
	'',
	'| a | b |',
	''
].join('\n');

test('classifies blocks', function () {
	var doc = D.parse(SAMPLE);
	assert.deepStrictEqual(types(doc), ['heading', 'paragraph', 'list', 'image', 'gallery', 'image', 'embed', 'comment', 'story', 'raw']);
	var img = doc.blocks[3].data;
	assert.strictEqual(img.images[0].alt, 'An image');
	assert.strictEqual(img.caption, 'A caption\nover two lines.');
	assert.strictEqual(doc.blocks[4].data.caption, 'Gallery caption.');
	assert.deepStrictEqual(doc.blocks[4].data.images.map(function (i) { return i.src; }), ['/images/x/b.webp', '/images/x/c.webp']);
	assert.strictEqual(doc.blocks[5].data.form, 'figure');
	assert.strictEqual(doc.blocks[6].data.src, 'https://www.youtube.com/embed/abc');
	assert.strictEqual(doc.blocks[8].data.steps[0].html, 'Step one.');
	assert.deepStrictEqual(doc.blocks[2].data.items, ['First', 'Second <br><br>']);
});

test('only the edited block is rewritten', function () {
	var doc = D.parse(SAMPLE);
	doc.blocks[4].data.images.reverse();
	doc.blocks[4].data.style = 'bento';
	var out = D.serialize(doc);
	assert.ok(out.indexOf('<div class="gallery" data-style="bento">\n\t<img src="/images/x/c.webp">\n\t<img src="/images/x/b.webp">\n</div>') > -1);
	// its caption was untouched, so keeps its 4-space indent
	assert.ok(out.indexOf('</div>\n    Gallery caption.') > -1);
	// everything else is byte-identical
	assert.strictEqual(out.replace(/<div class="gallery"[\s\S]*?<\/div>/, ''), SAMPLE.replace(/<div class="gallery"[\s\S]*?<\/div>/, ''));
});

test('writes new blocks in the site\'s conventions', function () {
	var doc = D.parse('---\ntitle: x\n---\n');
	doc.blocks.push(D.makeBlock('heading', { level: 3, html: 'Design', style: 'html' }));
	doc.blocks.push(D.makeBlock('paragraph', { md: 'Hello.' }));
	doc.blocks.push(D.makeBlock('image', { form: 'md', images: [{ src: '/images/p/a.webp', alt: 'A "quoted" alt' }], altIn: 'ial', ial: [], caption: 'Cap' }));
	doc.blocks.push(D.makeBlock('list', { ordered: true, items: ['one', 'two'] }));
	doc.blocks.push(D.makeBlock('paragraph', { md: '' }));
	assert.strictEqual(D.serialize(doc), '---\ntitle: x\n---\n\n<h3> Design </h3>\n\nHello.\n\n' +
		'![](/images/p/a.webp){:alt="A &quot;quoted&quot; alt"}\n\n\tCap\n\n1. one\n2. two\n');
});

test('moved blocks never run into their new neighbours', function () {
	var doc = D.parse('---\nt: x\n---\n<h3> A </h3>\nFirst para.\n\nSecond para.\n');
	assert.deepStrictEqual(types(doc), ['heading', 'paragraph', 'paragraph']);
	var h = doc.blocks.shift();
	doc.blocks.push(h);
	assert.strictEqual(D.serialize(doc), '---\nt: x\n---\n\nFirst para.\n\nSecond para.\n\n<h3> A </h3>\n');
	var doc2 = D.parse('---\nt: x\n---\n<h3> A </h3>\nFirst para.\n\nSecond para.\n');
	doc2.blocks.splice(0, 0, D.makeBlock('paragraph', { md: 'New.' }));
	doc2.blocks.splice(2, 1);
	assert.strictEqual(D.serialize(doc2), '---\nt: x\n---\n\nNew.\n\n<h3> A </h3>\n\nSecond para.\n');
});

test('removing a caption removes its lines', function () {
	var doc = D.parse(SAMPLE);
	doc.blocks[3].data.caption = '';
	var out = D.serialize(doc);
	assert.ok(out.indexOf('A caption') < 0);
	assert.ok(out.indexOf('{:width="100%" alt="An image"}\n\n<div class="gallery"') > -1);
});

// - - - - - - - - - - - - - - - - - - - - Front matter

test('front matter edits keep everything else', function () {
	var doc = D.parse(SAMPLE);
	var fm = doc.fm;
	assert.strictEqual(fm.get('title'), 'Demo');
	assert.strictEqual(fm.get('personal'), null);
	assert.strictEqual(fm.get('FAB'), true);
	assert.deepStrictEqual(fm.get('highlights'), ['one', 'two']);
	assert.strictEqual(fm.set('title', 'Demo'), false);
	fm.set('title', "Annie's demo");
	fm.set('subtitle', 'Say "hi"');
	fm.set('highlights', ['one', 'two: three']);
	fm.set('FAB', false);
	fm.set('personal', true);
	fm.set('status', 'Done');
	var out = D.serialize(doc);
	var head = out.split('\n---\n')[0];
	assert.strictEqual(head, [
		'---',
		"title: 'Annie''s demo'",
		'subtitle: "Say \\"hi\\""',
		'highlights:',
		'  - "one"',
		'  - "two: three"',
		'date: 2024-9-1 00:00:00',
		'personal: true',
		'FAB:',
		"status: 'Done'"
	].join('\n'));
	assert.ok(out.slice(head.length).indexOf('<h3> Project Summary </h3>') > -1);
	var re = D.parse(out).fm;
	assert.strictEqual(re.get('title'), "Annie's demo");
	assert.strictEqual(re.get('subtitle'), 'Say "hi"');
	assert.deepStrictEqual(re.get('highlights'), ['one', 'two: three']);
});

test('plain values that need quotes get them', function () {
	var fm = new D.FrontMatter('a: x\nb: y\nc: z');
	fm.set('a', 'true');
	fm.set('b', 'Colon: inside');
	fm.set('c', 'Functional (but only just)');
	assert.strictEqual(fm.toString(), "a: 'true'\nb: 'Colon: inside'\nc: Functional (but only just)");
});

// - - - - - - - - - - - - - - - - - - - - Inline markdown

test('renders inline markdown', function () {
	assert.strictEqual(D.mdInlineToHtml('a *b* **c** `d<e` [f](/g/) h_i_j'),
		'a <em>b</em> <strong>c</strong> <code>d&lt;e</code> <a href="/g/">f</a> h_i_j');
	assert.strictEqual(D.mdInlineToHtml('x <br><br> \\*y\\* <script>z</script>'),
		'x <br><br> *y* &lt;script&gt;z&lt;/script&gt;');
	assert.strictEqual(D.mdInlineToHtml('***both*** and _under_'), '<strong><em>both</em></strong> and <em>under</em>');
});

test('turns video links into players', function () {
	assert.strictEqual(D.embedUrl('https://youtu.be/KHjNlPl6cxA?si=x'), 'https://www.youtube.com/embed/KHjNlPl6cxA');
	assert.strictEqual(D.embedUrl('https://www.youtube.com/watch?v=KHjNlPl6cxA&t=3'), 'https://www.youtube.com/embed/KHjNlPl6cxA');
	assert.strictEqual(D.embedUrl('https://drive.google.com/file/d/1bHt_x/view?usp=sharing'), 'https://drive.google.com/file/d/1bHt_x/preview');
	assert.strictEqual(D.embedUrl('https://vimeo.com/12345'), 'https://player.vimeo.com/video/12345');
});

test('diffs lines', function () {
	var ops = D.diffLines('a\nb\nc', 'a\nB\nc\nd').map(function (l) { return l.op + l.text; });
	assert.deepStrictEqual(ops, [' a', '-b', '+B', ' c', '+d']);
});

console.log('editor-doc: ' + passed + ' checks passed');
