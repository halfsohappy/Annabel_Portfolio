#!/usr/bin/env node
// Local server for the page editor. Rebuilds the site with Jekyll as files
// change, serves it, and lets the editor read and save files in this repo.
//
//   node editor/server.js              → http://localhost:4001/editor/
//   node editor/server.js --port 5000
//   node editor/server.js --no-jekyll  (you're already running jekyll build --watch)
//
// Only listens on 127.0.0.1, and only writes project/page files and images.
// No dependencies beyond Node itself.
'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var spawn = require('child_process').spawn;

var ROOT = path.resolve(__dirname, '..');
var SITE = path.join(ROOT, '_site');
var args = process.argv.slice(2);
var PORT = +(args[args.indexOf('--port') + 1] || 0) || 4001;
var RUN_JEKYLL = args.indexOf('--no-jekyll') < 0;

var READABLE = /^(_projects|_pages|_data|images)\//;
var WRITABLE = /^(_projects|_pages)\/[^\/]+\.(md|markdown|html)$|^images\/.+\.(webp|jpe?g|png|gif|svg|avif)$/i;
var MAX_BODY = 80 * 1024 * 1024;

var TYPES = {
	'.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
	'.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
	'.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
	'.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
	'.pdf': 'application/pdf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
	'.woff': 'font/woff', '.woff2': 'font/woff2'
};

// Floating "Edit this page" link added to previewed site pages
var EDIT_BUTTON = '<a href="/editor/#url=" id="local-edit-btn" style="position:fixed;right:18px;bottom:18px;z-index:3000;' +
	'padding:10px 16px;border-radius:999px;background:#2b1a2b;color:#fff;font:600 14px system-ui,sans-serif;' +
	'box-shadow:0 4px 16px rgba(0,0,0,.25);border:0;text-decoration:none">✎ Edit this page</a>' +
	'<script>(function(){var a=document.getElementById("local-edit-btn");function u(){a.href="/editor/#url="+' +
	'encodeURIComponent(document.body.getAttribute("data-page-url")||location.pathname);}u();' +
	'new MutationObserver(u).observe(document.body,{attributes:true,attributeFilter:["data-page-url"]});' +
	'a.addEventListener("click",function(e){e.stopImmediatePropagation();},true);})();</script>';

function blobSha(buf) {
	return crypto.createHash('sha1').update('blob ' + buf.length + '\0').update(buf).digest('hex');
}

// Repo-relative path → absolute path, refusing anything outside the repo
function resolveRepoPath(rel) {
	if (typeof rel !== 'string' || !rel || rel.indexOf('\0') > -1) return null;
	var norm = path.posix.normalize(rel.replace(/\\/g, '/')).replace(/^\/+/, '');
	if (norm.indexOf('..') === 0) return null;
	var abs = path.join(ROOT, norm);
	if (abs.indexOf(ROOT + path.sep) !== 0) return null;
	return { rel: norm, abs: abs };
}

function send(res, status, body, type) {
	res.writeHead(status, { 'Content-Type': type || 'application/json', 'Cache-Control': 'no-store' });
	res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function readBody(req, cb) {
	var chunks = [];
	var size = 0;
	req.on('data', function (c) {
		size += c.length;
		if (size > MAX_BODY) { req.destroy(); return; }
		chunks.push(c);
	});
	req.on('end', function () { cb(Buffer.concat(chunks)); });
}

// Blocks other websites (and DNS rebinding) from reaching the API
function trusted(req) {
	var host = (req.headers.host || '').replace(/:\d+$/, '');
	if (host !== 'localhost' && host !== '127.0.0.1') return false;
	var origin = req.headers.origin;
	if (req.method !== 'GET' && origin) {
		return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) && origin.split(':')[2] === String(PORT);
	}
	return true;
}

function api(req, res, url) {
	if (!trusted(req)) return send(res, 403, { error: 'Forbidden' });
	var route = url.pathname.replace('/__editor/api', '');

	if (route === '/ping') return send(res, 200, { ok: true, root: path.basename(ROOT) });

	if (route === '/list' && req.method === 'GET') {
		var dir = resolveRepoPath(url.searchParams.get('dir'));
		if (!dir || !READABLE.test(dir.rel + '/')) return send(res, 400, { error: 'Bad directory' });
		fs.readdir(dir.abs, { withFileTypes: true }, function (err, ents) {
			if (err) return send(res, 200, []);
			send(res, 200, ents.filter(function (e) { return e.isFile() && e.name[0] !== '.'; }).map(function (e) {
				var abs = path.join(dir.abs, e.name);
				return { name: e.name, path: dir.rel + '/' + e.name, sha: blobSha(fs.readFileSync(abs)) };
			}));
		});
		return;
	}

	if (route === '/file' && req.method === 'GET') {
		var f = resolveRepoPath(url.searchParams.get('path'));
		if (!f || !READABLE.test(f.rel)) return send(res, 400, { error: 'Bad path' });
		fs.readFile(f.abs, function (err, buf) {
			if (err) return send(res, 404, { error: 'Not found' });
			send(res, 200, { content: buf.toString('utf8'), sha: blobSha(buf) });
		});
		return;
	}

	if (route === '/commit' && req.method === 'POST') {
		readBody(req, function (raw) {
			var body;
			try { body = JSON.parse(raw.toString('utf8')); } catch (e) { return send(res, 400, { error: 'Bad JSON' }); }
			var files = [];
			for (var i = 0; i < (body.files || []).length; i++) {
				var it = body.files[i];
				var p = resolveRepoPath(it.path);
				if (!p || !WRITABLE.test(p.rel)) return send(res, 400, { error: 'Not allowed to write ' + it.path });
				files.push({
					p: p,
					buf: Buffer.from(it.content || '', it.encoding === 'base64' ? 'base64' : 'utf8'),
					expectSha: it.expectSha
				});
			}
			var conflicts = files.filter(function (f) {
				if (f.expectSha === undefined) return false;
				var cur = fs.existsSync(f.p.abs) ? blobSha(fs.readFileSync(f.p.abs)) : null;
				return cur !== f.expectSha;
			}).map(function (f) { return f.p.rel; });
			if (conflicts.length) return send(res, 409, { error: 'Changed on disk', paths: conflicts });
			var out = {};
			files.forEach(function (f) {
				fs.mkdirSync(path.dirname(f.p.abs), { recursive: true });
				fs.writeFileSync(f.p.abs, f.buf);
				out[f.p.rel] = blobSha(f.buf);
				console.log('  saved ' + f.p.rel);
			});
			send(res, 200, { files: out });
		});
		return;
	}

	send(res, 404, { error: 'Unknown endpoint' });
}

function serveFile(res, abs, inject) {
	fs.readFile(abs, function (err, buf) {
		if (err) return send(res, 404, 'Not found', 'text/plain');
		var type = TYPES[path.extname(abs).toLowerCase()] || 'application/octet-stream';
		if (inject && type.indexOf('text/html') === 0) {
			var html = buf.toString('utf8');
			buf = html.indexOf('</body>') > -1 ? html.replace('</body>', EDIT_BUTTON + '</body>') : html + EDIT_BUTTON;
		}
		send(res, 200, buf, type);
	});
}

function staticFile(req, res, url) {
	var rel;
	try { rel = decodeURIComponent(url.pathname); } catch (e) { return send(res, 400, 'Bad path', 'text/plain'); }
	var p = resolveRepoPath(rel.replace(/^\//, '') || 'index.html') || { rel: '', abs: ROOT };

	// Images come from the source tree, so ones saved a moment ago show up
	// before Jekyll has copied them
	if (/^images\//.test(p.rel) && fs.existsSync(p.abs) && fs.statSync(p.abs).isFile()) {
		return serveFile(res, p.abs);
	}

	var abs = path.join(SITE, p.rel);
	if (abs.indexOf(SITE) !== 0) return send(res, 403, 'Forbidden', 'text/plain');
	var inject = !/^editor(\/|$)/.test(p.rel);
	fs.stat(abs, function (err, st) {
		if (!err && st.isDirectory()) {
			if (!/\/$/.test(url.pathname)) {
				res.writeHead(301, { Location: url.pathname + '/' + url.search });
				return res.end();
			}
			abs = path.join(abs, 'index.html');
		} else if (err && fs.existsSync(abs + '.html')) {
			abs += '.html';
		} else if (err) {
			if (p.rel === 'editor' || p.rel.indexOf('editor/') === 0) {
				return send(res, 503, 'The site is still building — refresh in a few seconds.', 'text/plain; charset=utf-8');
			}
			return fs.readFile(path.join(SITE, '404.html'), function (e2, buf) {
				send(res, 404, e2 ? 'Not found' : buf, 'text/html; charset=utf-8');
			});
		}
		serveFile(res, abs, inject);
	});
}

var server = http.createServer(function (req, res) {
	var url = new URL(req.url, 'http://localhost');
	if (url.pathname.indexOf('/__editor/api/') === 0) return api(req, res, url);
	if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed', 'text/plain');
	staticFile(req, res, url);
});

server.listen(PORT, '127.0.0.1', function () {
	console.log('\n  Page editor:  http://localhost:' + PORT + '/editor/');
	console.log('  Site preview: http://localhost:' + PORT + '/\n');
});

if (RUN_JEKYLL) {
	var jekyll = spawn('bundle', ['exec', 'jekyll', 'build', '--watch'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
	var prefix = function (chunk) {
		chunk.toString().split('\n').forEach(function (l) { if (l.trim()) console.log('  [jekyll] ' + l.trim()); });
	};
	jekyll.stdout.on('data', prefix);
	jekyll.stderr.on('data', prefix);
	jekyll.on('error', function () {
		console.log('  Couldn\'t start Jekyll (`bundle exec jekyll build --watch`). Run it yourself, or `bundle install` first.');
	});
	var stop = function () { jekyll.kill(); process.exit(); };
	process.on('SIGINT', stop);
	process.on('SIGTERM', stop);
}
