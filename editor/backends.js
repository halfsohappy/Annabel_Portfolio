// Where the page editor reads and saves files.
//
//   GitHubBackend — commits straight to the repo through the GitHub API, so
//                   Cloudflare Pages redeploys the site. Works from anywhere,
//                   including the published /editor/ page. Needs a
//                   fine-grained token with Contents read/write on the repo.
//   LocalBackend  — reads and writes the working copy through
//                   editor/server.js (node editor/server.js).
//
// Both expose the same calls:
//   list(dir)              → [{ name, path, sha }]
//   read(path)             → { content, sha }
//   commit(files, message) → { files: { path: sha } }
//     files: [{ path, content: string | Uint8Array, expectSha: sha | null }]
//     expectSha is the sha the file had when it was opened (null for a new
//     file); a mismatch means someone else changed it, and nothing is written.
//
// A file's sha is its git blob id in both backends.
(function (root) {
	'use strict';

	function ConflictError(paths) {
		var e = new Error('Changed since you opened it: ' + paths.join(', '));
		e.name = 'ConflictError';
		e.paths = paths;
		return e;
	}

	function bytesToBase64(bytes) {
		var bin = '';
		for (var i = 0; i < bytes.length; i += 0x8000) {
			bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
		}
		return btoa(bin);
	}

	function base64ToText(b64) {
		var bin = atob(b64.replace(/\s/g, ''));
		var bytes = new Uint8Array(bin.length);
		for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
		return new TextDecoder().decode(bytes);
	}

	function toBytes(content) {
		return typeof content === 'string' ? new TextEncoder().encode(content) : content;
	}

	function encodePath(p) {
		return p.split('/').map(encodeURIComponent).join('/');
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - GitHub

	function GitHubBackend(opts) {
		this.kind = 'github';
		this.owner = opts.owner;
		this.repo = opts.repo;
		this.branch = opts.branch || 'main';
		this.token = opts.token;
		this.label = this.owner + '/' + this.repo + ' · ' + this.branch;
	}

	GitHubBackend.prototype.api = function (method, path, body) {
		var url = 'https://api.github.com/repos/' + this.owner + '/' + this.repo + path;
		return fetch(url, {
			method: method,
			headers: {
				'Accept': 'application/vnd.github+json',
				'Authorization': 'Bearer ' + this.token,
				'X-GitHub-Api-Version': '2022-11-28',
				'Content-Type': 'application/json'
			},
			body: body ? JSON.stringify(body) : undefined,
			cache: 'no-store'
		}).then(function (res) {
			if (res.status === 404) {
				var nf = new Error('Not found');
				nf.status = 404;
				throw nf;
			}
			return res.json().catch(function () { return {}; }).then(function (data) {
				if (!res.ok) {
					var err = new Error('GitHub: ' + (data.message || res.status));
					err.status = res.status;
					throw err;
				}
				return data;
			});
		});
	};

	// Confirms the token can push to the repo
	GitHubBackend.prototype.check = function () {
		var self = this;
		return this.api('GET', '').then(function (repo) {
			if (repo.permissions && !repo.permissions.push) {
				throw new Error('This token can read ' + self.owner + '/' + self.repo + ' but not write to it.');
			}
			return self.api('GET', '/branches/' + encodeURIComponent(self.branch));
		}).catch(function (err) {
			if (err.status === 404) {
				throw new Error('Couldn\'t find ' + self.owner + '/' + self.repo + ' (branch ' + self.branch + '). Check the names and that the token has access to this repository.');
			}
			if (err.status === 401) throw new Error('GitHub rejected the token. It may have expired.');
			throw err;
		});
	};

	GitHubBackend.prototype.list = function (dir) {
		return this.api('GET', '/contents/' + encodePath(dir) + '?ref=' + encodeURIComponent(this.branch))
			.then(function (items) {
				return items.filter(function (it) { return it.type === 'file'; })
					.map(function (it) { return { name: it.name, path: it.path, sha: it.sha }; });
			})
			.catch(function (err) {
				if (err.status === 404) return [];
				throw err;
			});
	};

	GitHubBackend.prototype.read = function (path) {
		var self = this;
		return this.api('GET', '/contents/' + encodePath(path) + '?ref=' + encodeURIComponent(this.branch))
			.then(function (f) {
				if (f.content || f.size === 0) return { content: base64ToText(f.content || ''), sha: f.sha };
				// Over 1 MB the contents API leaves content out; fetch the blob
				return self.api('GET', '/git/blobs/' + f.sha).then(function (blob) {
					return { content: base64ToText(blob.content), sha: f.sha };
				});
			});
	};

	// The sha of each path at a commit (null if absent)
	GitHubBackend.prototype.shasAt = function (treeSha, paths) {
		return this.api('GET', '/git/trees/' + treeSha + '?recursive=1').then(function (tree) {
			var map = {};
			tree.tree.forEach(function (it) { map[it.path] = it.sha; });
			var out = {};
			paths.forEach(function (p) { out[p] = Object.prototype.hasOwnProperty.call(map, p) ? map[p] : null; });
			return out;
		});
	};

	// All files land in a single commit (one Cloudflare build)
	GitHubBackend.prototype.commit = function (files, message) {
		var self = this;
		var ref = '/git/ref/heads/' + encodeURIComponent(this.branch);
		var head;
		var baseTree;
		return this.api('GET', ref).then(function (r) {
			head = r.object.sha;
			return self.api('GET', '/git/commits/' + head);
		}).then(function (c) {
			baseTree = c.tree.sha;
			var guarded = files.filter(function (f) { return f.expectSha !== undefined; });
			if (!guarded.length) return {};
			return self.shasAt(baseTree, guarded.map(function (f) { return f.path; }));
		}).then(function (current) {
			var conflicts = files.filter(function (f) {
				return f.expectSha !== undefined && current[f.path] !== f.expectSha;
			}).map(function (f) { return f.path; });
			if (conflicts.length) throw ConflictError(conflicts);
			return Promise.all(files.map(function (f) {
				return self.api('POST', '/git/blobs', {
					content: bytesToBase64(toBytes(f.content)),
					encoding: 'base64'
				});
			}));
		}).then(function (blobs) {
			return self.api('POST', '/git/trees', {
				base_tree: baseTree,
				tree: files.map(function (f, i) {
					return { path: f.path, mode: '100644', type: 'blob', sha: blobs[i].sha };
				})
			}).then(function (tree) {
				return self.api('POST', '/git/commits', { message: message, tree: tree.sha, parents: [head] });
			}).then(function (commit) {
				return self.api('PATCH', '/git/refs/heads/' + encodeURIComponent(self.branch), { sha: commit.sha })
					.then(function () {
						var out = {};
						files.forEach(function (f, i) { out[f.path] = blobs[i].sha; });
						return { files: out, commit: commit.sha, url: commit.html_url };
					});
			});
		});
	};

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Local

	function LocalBackend() {
		this.kind = 'local';
		this.label = 'Local files';
		this.base = '/__editor/api';
	}

	LocalBackend.prototype.call = function (method, path, body) {
		return fetch(this.base + path, {
			method: method,
			headers: body ? { 'Content-Type': 'application/json' } : {},
			body: body ? JSON.stringify(body) : undefined,
			cache: 'no-store'
		}).then(function (res) {
			return res.json().catch(function () { return {}; }).then(function (data) {
				if (res.status === 409) throw ConflictError(data.paths || []);
				if (!res.ok) {
					var err = new Error(data.error || ('Local server: ' + res.status));
					err.status = res.status;
					throw err;
				}
				return data;
			});
		});
	};

	LocalBackend.detect = function () {
		return fetch('/__editor/api/ping', { cache: 'no-store' })
			.then(function (res) { return res.ok ? res.json() : null; })
			.then(function (d) { return !!(d && d.ok); })
			.catch(function () { return false; });
	};

	LocalBackend.prototype.check = function () {
		return this.call('GET', '/ping');
	};

	LocalBackend.prototype.list = function (dir) {
		return this.call('GET', '/list?dir=' + encodeURIComponent(dir));
	};

	LocalBackend.prototype.read = function (path) {
		return this.call('GET', '/file?path=' + encodeURIComponent(path));
	};

	LocalBackend.prototype.commit = function (files) {
		return this.call('POST', '/commit', {
			files: files.map(function (f) {
				var text = typeof f.content === 'string';
				return {
					path: f.path,
					encoding: text ? 'utf8' : 'base64',
					content: text ? f.content : bytesToBase64(f.content),
					expectSha: f.expectSha
				};
			})
		});
	};

	root.EditorBackends = {
		GitHubBackend: GitHubBackend,
		LocalBackend: LocalBackend
	};
}(self));
