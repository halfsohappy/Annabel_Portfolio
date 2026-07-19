//
//
// Board JS
//
//
(function ($) {
	'use strict';



	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Navigation

	// Global vars
	var navTarget = $('body').attr('data-page-url');
	var docTitle = document.title;
	var History = window.History;

	// State change event
	History.Adapter.bind(window,'statechange',function(){
		var state = History.getState();
		// console.log(state);

		// Loading state
		$('body').addClass('loading');

		// Fade out any ToC sidebar that was hoisted to <body>
		var _tocOut = document.body.querySelector(':scope > #toc-sidebar');
		if (_tocOut) { _tocOut.classList.remove('is-visible'); }

		// Load the page
		$('.page-loader').load( state.hash + ' .page__content', function() {

			// Scroll to top
			$( 'body, html' ).animate({
				scrollTop: 0
			}, 300);

			// Find transition time
			var transitionTime = 400;

			// After current content fades out
			setTimeout( function() {

				// Remove old content
				$('.page .page__content').remove();

				// Append new content
				$('.page-loader .page__content').appendTo('.page');

				// Set page URL
				$('body').attr('data-page-url', window.location.pathname);

				// Update navTarget
				navTarget = $('body').attr('data-page-url');

				// Set page title
				docTitle = $('.page__content').attr('data-page-title');
				document.title = docTitle;

				// Run page functions
				pageFunctions();

			}, transitionTime);

		});

	});


	// On clicking a link

	if ( $('body').hasClass('ajax-loading') ) {

		$(document).on('click', 'a', function (event){

			// Don't follow link
			event.preventDefault();

			// Get the link target
			var thisTarget = $(this).attr('href');

			// If we don't want to use ajax, or the link is an anchor/mailto/tel
			if ($(this).hasClass('js-no-ajax') || thisTarget.indexOf('#') >= 0 || thisTarget.indexOf('mailto:') >= 0 || thisTarget.indexOf('tel:') >= 0) {

				// Use the given link
				window.location = thisTarget;
			}

			// If link is handled by some JS action – e.g. fluidbox
			else if ( $(this).is('.gallery__item__link') ) {
				
				// Let JS handle it
			}

			// If link is external
			else if ( thisTarget.indexOf('http') >= 0 ) {

				// Go to the external link
				window.open(thisTarget, '_blank');

			}

			// If link is internal
			else {

				// Change navTarget
				navTarget = thisTarget;
				
				// Switch the URL via History
				History.pushState(null, docTitle, thisTarget);
			}

		});
		
	}



	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Page load

	function pageFunctions() {


		// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Show content

		// Show the content immediately (don't wait for images — lazy-loaded images
		// won't load while the page is hidden, causing a deadlock).
		$('body').removeClass('loading');
		$('body').removeClass('menu--open');

		// Wait until first image has loaded for layout-dependent work
		$('.page__content').find('img:first').imagesLoaded( function() {
	
			// Portfolio grid layout - auto-fill algorithm for CSS Grid
			function autoFillGrid() {
				var wrap = document.querySelector('.listing-wrap');
				if (!wrap) return;

				var items = Array.from(wrap.querySelectorAll('.listing-item'));
				if (!items.length) return;

				// Determine current column count from computed grid style
				var style = window.getComputedStyle(wrap);
				var totalCols = style.getPropertyValue('grid-template-columns').split(' ').length || 6;

				// Set row height equal to column width for perfect squares
				var colWidth = wrap.clientWidth / totalCols;
				var rowHeight = Math.round(colWidth);
				wrap.style.gridAutoRows = rowHeight + 'px';

				var currentRow = [];
				var currentRowWidth = 0;

				function finalizeRow(row, cols) {
					var explicitWidth = 0;
					var autoItems = [];

					row.forEach(function(item) {
						if (item.isAuto) {
							autoItems.push(item);
						} else {
							explicitWidth += item.width;
						}
					});

					var remaining = cols - explicitWidth;

					if (autoItems.length > 0 && remaining > 0) {
						var perAuto = Math.floor(remaining / autoItems.length);
						var extra = remaining % autoItems.length;

						autoItems.forEach(function(item) {
							item.width = perAuto + (extra > 0 ? 1 : 0);
							if (extra > 0) extra--;
						});
					} else if (autoItems.length > 0 && remaining <= 0) {
						autoItems.forEach(function(item) {
							item.width = 1;
						});
					}

					row.forEach(function(item) {
						item.el.style.gridColumn = 'span ' + Math.max(1, item.width);
					});
				}

				// Parse an aspect ratio string like "16:9", "4:3", or "1.78" into a number.
				function parseAspectRatio(val) {
					if (!val) return null;
					if (val.indexOf(':') > -1) {
						var parts = val.split(':');
						var a = parseFloat(parts[0]), b = parseFloat(parts[1]);
						if (a > 0 && b > 0) return a / b;
						return null;
					}
					var f = parseFloat(val);
					return (f > 0) ? f : null;
				}

				// Compute preferred width for auto-aspect items.
				// aspectOverride (optional number) lets the caller supply a target ratio
				// instead of reading it from the image's natural dimensions.
				// Clamping ranges scale with cols so the layout stays proportional across
				// different responsive column counts (2-col mobile, 3-col tablet, 12-col desktop).
				function getAspectPreferredWidth(img, mode, cols, rh, aspectOverride) {
					var aspect;
					if (aspectOverride) {
						aspect = aspectOverride;
					} else if (img) {
						var natW = img.naturalWidth;
						var natH = img.naturalHeight;
						if (!natW || !natH) return 1;
						aspect = natW / natH;
					} else {
						return 1;
					}

					var colW = wrap.clientWidth / cols;
					var preferred = Math.round(aspect * rh / colW);

					// Clamp to mode-specific ranges that scale with the total column count
					// so proportions stay consistent across responsive breakpoints.
					var maxSmall = Math.max(2, Math.round(cols / 4));
					if (mode === 'auto-small') {
						preferred = Math.max(1, Math.min(preferred, maxSmall));
					} else if (mode === 'auto-medium') {
						var minMed = maxSmall;
						var maxMed = Math.max(minMed + 1, Math.round(cols / 3));
						preferred = Math.max(minMed, Math.min(preferred, maxMed));
					} else if (mode === 'auto-large') {
						var minLg = Math.max(3, Math.round(cols * 0.4));
						var maxLg = Math.max(minLg + 1, Math.round(cols * 0.7));
						preferred = Math.max(minLg, Math.min(preferred, maxLg));
					}
					// For plain 'auto' with an aspectOverride: no range clamping, just
					// the natural aspect-ratio width (still capped at total cols).
					return Math.min(Math.max(1, preferred), cols);
				}

				// Compute preferred row span for auto-height items.
				// aspectOverride (optional number) overrides the image's natural ratio.
				function getAutoHeight(img, colSpan, cols, rh, aspectOverride) {
					var aspect;
					if (aspectOverride) {
						aspect = aspectOverride;
					} else if (img) {
						var natW = img.naturalWidth;
						var natH = img.naturalHeight;
						if (!natW || !natH) return 1;
						aspect = natW / natH;
					} else {
						return 1;
					}

					var colW = wrap.clientWidth / cols;
					var itemPixelWidth = colSpan * colW;
					var idealPixelHeight = (1 / aspect) * itemPixelWidth;
					var rows = Math.max(1, Math.round(idealPixelHeight / rh));
					return rows;
				}

				for (var i = 0; i < items.length; i++) {
					var item = items[i];
					var rawW = item.getAttribute('data-grid-width');
					var parsedW = parseInt(rawW, 10);
					var isAutoW = !parsedW || parsedW < 1;
					var isAutoAspect = (rawW === 'auto-small' || rawW === 'auto-medium' || rawW === 'auto-large');
					var aspectAttr = item.getAttribute('data-grid-aspect-ratio');
					var aspectOverride = parseAspectRatio(aspectAttr);
					// Plain 'auto' items with a user-specified aspect ratio become aspect-driven
					var isAspectDriven = isAutoAspect || (isAutoW && aspectOverride);
					var width;

					if (isAspectDriven) {
						var img = item.querySelector('img');
						width = getAspectPreferredWidth(img, rawW, totalCols, rowHeight, aspectOverride);
						isAutoW = false;
					} else {
						width = isAutoW ? 1 : Math.min(parsedW, totalCols);
					}

					if (currentRowWidth + width > totalCols && currentRow.length > 0) {
						finalizeRow(currentRow, totalCols);
						currentRow = [];
						currentRowWidth = 0;
					}

					currentRow.push({ el: item, width: width, isAuto: isAutoW });
					currentRowWidth += width;

					if (currentRowWidth === totalCols) {
						finalizeRow(currentRow, totalCols);
						currentRow = [];
						currentRowWidth = 0;
					}
				}

				if (currentRow.length > 0) {
					finalizeRow(currentRow, totalCols);
				}

				// Compute auto heights after all column widths are finalized
				for (var j = 0; j < items.length; j++) {
					var el = items[j];
					var rawH = el.getAttribute('data-grid-height');
					var parsedH = parseInt(rawH, 10);
					var isAutoH = !parsedH || parsedH < 1 || rawH === 'auto';
					if (isAutoH) {
						var imgEl = el.querySelector('img');
						var aspectAttrH = el.getAttribute('data-grid-aspect-ratio');
						var aspectOverrideH = parseAspectRatio(aspectAttrH);
						if (imgEl || aspectOverrideH) {
							var finalWidth = parseInt(el.style.gridColumn.replace('span ', ''), 10) || 1;
							var rowSpan = getAutoHeight(imgEl, finalWidth, totalCols, rowHeight, aspectOverrideH);
							el.style.gridRow = 'span ' + rowSpan;
						}
					}
				}

				// Apply text scaling based on normalised item area.
				// Using (colSpan / totalCols) * rowSpan instead of raw colSpan * rowSpan
				// ensures the same visual thresholds apply regardless of column count
				// (2-col mobile, 3-col tablet, 12-col desktop, or any custom count).
				items.forEach(function(item) {
					var colSpan = parseInt(item.style.gridColumn.replace('span ', ''), 10) || 1;
					var rowStr = item.style.gridRow;
					var rowSpan = rowStr ? (parseInt(rowStr.replace('span ', ''), 10) || 1) : 1;
					// Also check CSS class-based row spans
					if (!rowStr) {
						for (var r = totalCols; r >= 1; r--) {
							if (item.classList.contains('listing-item--h' + r)) {
								rowSpan = r;
								break;
							}
						}
					}
					// Normalise: fraction of grid width × row count
					var normArea = (colSpan / totalCols) * rowSpan;
					item.classList.remove('listing-item--size-sm', 'listing-item--size-md', 'listing-item--size-lg', 'listing-item--size-xl');
					if (normArea >= 1.3) {
						item.classList.add('listing-item--size-xl');
					} else if (normArea >= 0.6) {
						item.classList.add('listing-item--size-lg');
					} else if (normArea >= 0.25) {
						item.classList.add('listing-item--size-md');
					} else {
						item.classList.add('listing-item--size-sm');
					}
				});

				// Build repeating-conic-gradient striped borders from tag colors
				// and compute dynamic border thickness from tile dimensions.
				// Read every rect before writing any styles — interleaving the two
				// forces a reflow per tile.
				var itemRects = [];
				items.forEach(function(item) {
					itemRects.push(item.getBoundingClientRect());
				});
				items.forEach(function(item, itemIndex) {
					var colors = (item.getAttribute('data-tag-colors') || '').split(',').filter(function(c) { return c.trim(); });
					var link = item.querySelector('.listing-item__link');
					if (!link) return;

					// Dynamic border thickness: ~3% of the smaller dimension, clamped 3-8px
					var rect = itemRects[itemIndex];
					var minDim = Math.min(rect.width, rect.height);
					var thickness = Math.max(3, Math.min(8, Math.round(minDim * 0.03)));
					var radius = Math.max(4, Math.round(minDim * 0.04));
					link.style.setProperty('--border-size', thickness + 'px');
					link.style.setProperty('--border-radius', radius + 'px');

					if (colors.length === 0) {
						link.style.setProperty('--tag-gradient', 'transparent');
						return;
					}
					if (colors.length === 1) {
						link.style.setProperty('--tag-gradient', colors[0].trim());
						return;
					}
					// Build repeating stripe pattern — stripe width scales with tile area
					// so stripes appear roughly the same visual size across all tiles
					var area = rect.width * rect.height;
					var stripeWidth = Math.max(3, Math.min(12, Math.round(2400 / Math.sqrt(area))));
					var stops = [];
					for (var c = 0; c < colors.length; c++) {
						var start = stripeWidth * c;
						var end = stripeWidth * (c + 1);
						stops.push(colors[c].trim() + ' ' + start + 'deg ' + end + 'deg');
					}
					link.style.setProperty('--tag-gradient', 'repeating-conic-gradient(' + stops.join(', ') + ')');
				});
			}

			// Short chip labels per tag key; chip colors come from the .badge--*
			// classes generated from _data/settings.yml, so they stay in sync.
			var TAG_LABELS = {
				personal: 'Personal',
				THE: 'Theater',
				EMB: 'Embedded',
				DSP: 'DSP',
				PCBD: 'PCB Design',
				FAB: 'Fabrication',
				CS: 'CS'
			};

			function injectTagChips() {
				document.querySelectorAll('.listing-item[data-tags]').forEach(function(item) {
					var tags = (item.getAttribute('data-tags') || '').trim().split(/\s+/).filter(Boolean);
					if (!tags.length) return;
					var info = item.querySelector('.listing-item__info');
					if (!info) return;
					// Always clear and re-inject so a stale first-run never blocks a correct second run
					var existing = info.querySelector('.listing-item__tags');
					if (existing) existing.remove();
					var row = document.createElement('div');
					row.className = 'listing-item__tags';
					tags.forEach(function(t) {
						var label = TAG_LABELS[t];
						if (!label) return;
						var chip = document.createElement('span');
						chip.className = 'listing-item__tag badge--' + t;
						chip.textContent = label;
						row.appendChild(chip);
					});
					info.appendChild(row);
				});
			}

			// Force eager loading so naturalWidth/naturalHeight are available for aspect-ratio layout
			document.querySelectorAll('.listing-wrap img').forEach(function(img) {
				try { img.loading = 'eager'; } catch(e) {}
				if (!(img.complete && img.naturalWidth)) {
					img.addEventListener('load', function() { autoFillGrid(); }, { once: true });
					img.addEventListener('error', function() { autoFillGrid(); }, { once: true });
				}
			});
			autoFillGrid(); // first pass with already-loaded images + numeric spans
			injectTagChips();

			// Re-run on resize to adapt to responsive column changes
			var resizeTimer;
			$(window).on('resize', function() {
				clearTimeout(resizeTimer);
				resizeTimer = setTimeout(autoFillGrid, 200);
			});

			// Header colorbar hover effect — highlight matching tag sections
			(function() {
				var bars = document.querySelectorAll('.header__colorbar');
				var barSpans = document.querySelectorAll('.header__colorbar span[data-tag]');
				if (!barSpans.length) return;

				var currentItem = null;

				function activateTags(item) {
					if (item === currentItem) return;
					currentItem = item;
					var tags = (item.getAttribute('data-tags') || '').trim().split(/\s+/);
					barSpans.forEach(function(span) {
						span.classList.toggle('active', tags.indexOf(span.getAttribute('data-tag')) !== -1);
					});
					bars.forEach(function(b) { b.classList.add('has-active'); });
				}

				function deactivateAll() {
					currentItem = null;
					barSpans.forEach(function(span) {
						span.classList.remove('active');
					});
					bars.forEach(function(b) { b.classList.remove('has-active'); });
				}

				document.addEventListener('mouseover', function(e) {
					var item = e.target.closest('[data-tags]');
					if (item) {
						activateTags(item);
					} else {
						if (currentItem) deactivateAll();
					}
				});
			})();

			// Stop the attention shake on first hover
			document.querySelectorAll('.shake-attention').forEach(function(el) {
				el.addEventListener('mouseenter', function() {
					el.classList.add('shaken');
				}, { once: true });
			});

			// ToC sidebar — only present on wider-layout project pages
			(function() {
				// Remove any stale sidebar left in <body> from a previous project page
				// (we hoist it there to escape .page's CSS transform; see below)
				var stale = document.body.querySelector(':scope > #toc-sidebar');
				if (stale) stale.remove();

				var sidebar = document.getElementById('toc-sidebar');
				var list    = document.getElementById('toc-list');
				var descBox = document.querySelector('.bento__box--desc');
				if (!sidebar || !list || !descBox) return;

				// Build ToC from page headings — bail if none
				var headings = document.querySelectorAll('.singles h2, .singles h3, .singles h4');
				if (!headings.length) return;
				list.innerHTML = ''; // clear stale items from a prior AJAX load
				headings.forEach(function(h, i) {
					if (!h.id) h.id = 'toc-' + i;
					var li = document.createElement('li');
					if (h.tagName === 'H4') li.className = 'toc-h4';
					var a = document.createElement('a');
					a.href = '#' + h.id;
					a.textContent = h.textContent.trim();
					li.appendChild(a);
					list.appendChild(li);
				});

				// Hoist sidebar to <body> so it is never inside .page when AJAX
				// navigation applies `transform: translate(0,20px)` to .page.
				// A CSS transform on any ancestor breaks position:fixed containment,
				// which is what caused the sidebar to slide down on navigate-away.
				document.body.appendChild(sidebar);

				// Poll every frame until the bento top is stable, then show once
				var prevTop = 0;
				var stableFrames = 0;
				var maxFrames = 90;
				function waitAndPlace() {
					var top = Math.round(descBox.getBoundingClientRect().top + window.scrollY);
					if (top === prevTop && top > 0) { stableFrames++; }
					else { stableFrames = 0; }
					prevTop = top;
					maxFrames--;
					if (stableFrames >= 2 || maxFrames <= 0) {
						sidebar.style.top = top + 'px';
						// Fade in via CSS class — the base .toc-sidebar rule starts at
						// opacity:0/visibility:hidden/translateY(20px) with a transition
						// already defined, so adding .is-visible triggers a smooth fade
						// without any rAF or offsetHeight tricks needed.
						sidebar.classList.add('is-visible');
					} else {
						requestAnimationFrame(waitAndPlace);
					}
				}
				requestAnimationFrame(waitAndPlace);

				// Re-place on window resize
				window.addEventListener('resize', function() {
					sidebar.classList.remove('is-visible');
					prevTop = 0; stableFrames = 0; maxFrames = 60;
					requestAnimationFrame(waitAndPlace);
				});
			})();
		});



		// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Active links

		// Switch active link states
		$('.active-link').removeClass('active-link');

		$('a[href="' + navTarget + '"]').addClass('active-link');



		// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Galleries

		// Destroy all existing waypoints
		Waypoint.destroyAll();

		// Set up count for galleries to give them unique IDs
		var galleryCount = 0;

		// If there's a gallery
		$('.gallery').each( function() {

			// Get gallery element
			var $this = $(this);

			// Add ID via count
			galleryCount++;
			var thisId = 'gallery-' + galleryCount;
			$this.attr('id', thisId);

			// Gallery columns / presentation style
			var galleryCols = $this.attr('data-columns');
			var galleryStyle = $this.attr('data-style');

			// Set up gallery container
			$this.append('<div class="gallery__wrap"></div>');

			// Add images to container
			$this.children('img').each( function() {
				$(this).appendTo('#' + thisId + ' .gallery__wrap');
			});

			// Wrap images
			$this.find('.gallery__wrap img').each( function() {
				var imageSrc = $(this).attr('src');
				$(this).wrapAll('<div class="gallery__item"><a href="' + imageSrc + '" class="gallery__item__link"></div></div>').appendTo();
			});

			// Wait for images to load
			$this.imagesLoaded( function() {

				// Filmstrip: consistent-height scrollable row, no masonry
				if ( galleryStyle === 'strip' ) {

					$this.addClass('gallery--strip');

					// Init fluidbox
					$this.find('.gallery__item__link').fluidbox({
						loader: true
					});
				}

				// Bento: uniform cropped grid inside a slim frame
				else if ( galleryStyle === 'bento' ) {

					$this.addClass('gallery--bento');

					// Assign spans so the 4-column grid packs into a clean
					// rectangle: n%4==1 → first item becomes a 2×2 hero;
					// n%4==2 → last two items span 2 columns; n%4==3 → last one does.
					var $items = $this.find('.gallery__item');
					var bentoRemainder = $items.length % 4;
					if ( bentoRemainder === 1 ) {
						$items.first().addClass('gallery__item--hero');
					} else if ( bentoRemainder === 2 ) {
						$items.slice(-2).addClass('gallery__item--wide');
					} else if ( bentoRemainder === 3 ) {
						$items.last().addClass('gallery__item--wide');
					}

					// Init fluidbox
					$this.find('.gallery__item__link').fluidbox({
						loader: true
					});
				}

				// If it's a single column gallery
				else if ( galleryCols === '1' ) {

					// Add carousel class to gallery
					$this.addClass('gallery--carousel');

					// Add owl styles to gallery wrap
					$this.children('.gallery__wrap').addClass('owl-carousel');

					// Use carousel
					$this.children('.gallery__wrap').owlCarousel({
						items: 1,
						loop: true,
						mouseDrag: false,
						touchDrag: true,
						pullDrag: false,
						dots: true,
						autoplay: false,
						autoplayTimeout: 6000,
						autoHeight: true,
						animateOut: 'fadeOut'
					});

					// When scrolling over the bottom
					var waypoint1 = new Waypoint({
						element: document.getElementById(thisId),
						handler: function(direction) {

							if ( direction === 'down') {

								// console.log('pause');
							
								// Pause this carousel
								$this.children('.gallery__wrap').trigger('stop.owl.autoplay');
							}

							if ( direction === 'up') {

								// console.log('play');
								
								// Play this carousel
								$this.children('.gallery__wrap').trigger('play.owl.autoplay');
							}
						},
						offset: '-100%'
					});

					// When scrolling over the top
					var waypoint2 = new Waypoint({
						element: document.getElementById(thisId),
						handler: function(direction) {

							if ( direction === 'down') {

								// console.log('play');
								
								// Play this carousel
								$this.children('.gallery__wrap').trigger('play.owl.autoplay');
							}

							if ( direction === 'up') {

								// console.log('pause');
							
								// Pause this carousel
								$this.children('.gallery__wrap').trigger('stop.owl.autoplay');
							}
						},
						offset: '100%'
					});

				}

				else {

					$this.addClass('gallery--grid');

					// Use masonry layout
					$this.children('.gallery__wrap').masonry({
						itemSelector: '.gallery__item',
						transitionDuration: 0
					});
							
					// Init fluidbox
					$this.find('.gallery__item__link').fluidbox({
						loader: true
					});

				}

				// Show gallery once initialized
				$this.addClass('gallery--on');
			});

		});



		// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Images

		$('.single p > img, .singles p > img').each( function() {
			var thisP = $(this).parent('p');
			$(this).insertAfter(thisP);
			$(this).wrapAll('<div class="image-wrap"></div>');
			thisP.remove();
		});



		// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Videos

		// For each iframe
		$('.single iframe, .singles iframe').each( function() {

			// If it's YouTube or Vimeo
			if ( $(this).attr('src').indexOf('youtube') >= 0 || $(this).attr('src').indexOf('vimeo') >= 0 ) {

				var width = $(this).attr('width');
				var height = $(this).attr('height');
				var ratio = (height/width)*100;

				// Wrap in video container
				$(this).wrapAll('<div class="video-wrap"><div class="video" style="padding-bottom:' + ratio + '%;"></div></div>');

			}

		});



		// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Tables

		$('.single table, .singles table').each(function () {
			$(this).wrapAll('<div class="table-wrap"></div>');
		});



		// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Figure captions

		// Dock an indented caption (rendered as a plaintext code block) into
		// the media element it follows: inside figure/.image-wrap plates, or
		// into a filmstrip's caption row alongside a photo-count pill.
		$('.single, .singles').find('.language-plaintext.highlighter-rouge').each(function () {
			var $cap = $(this);
			var $prev = $cap.prev();

			// Step over (and drop) empty paragraphs left behind by raw HTML markup
			while ($prev.is('p') && !$prev.text().trim() && $prev.children().length === 0) {
				var $emptyP = $prev;
				$prev = $prev.prev();
				$emptyP.remove();
			}

			if ($prev.is('figure, .image-wrap')) {
				$cap.appendTo($prev);
			}
			else if ($prev.is('.gallery[data-style="strip"]')) {
				var photoCount = $prev.find('img').length;
				var $row = $('<div class="gallery__caption"></div>');
				$row.append('<span class="gallery__count">' + photoCount + ' photos</span>');
				$row.append($cap);
				$prev.append($row);
			}
		});



		// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - List Filter

		var filterBtns = document.querySelectorAll('.filter-btn');

		if (filterBtns.length) {

			var activeFilters = [];
			var activeYear = null;

			function applyListFilters() {
				document.querySelectorAll('.project-list-item').forEach(function(item) {
					var tagMatch = true;
					var yearMatch = true;

					if (activeFilters.length > 0) {
						var itemTags = (item.getAttribute('data-tags') || '').split(' ').filter(function(t) { return t; });
						tagMatch = activeFilters.some(function(f) { return itemTags.indexOf(f) > -1; });
					}

					if (activeYear) {
						yearMatch = item.getAttribute('data-year') === activeYear;
					}

					item.classList.toggle('hidden', !(tagMatch && yearMatch));
				});
			}

			function activateListFilter(filter) {
				activeFilters = filter ? [filter] : [];
				filterBtns.forEach(function(b) {
					if (!b.hasAttribute('data-year')) b.classList.remove('active');
				});
				var target = document.querySelector('.filter-btn[data-filter="' + (filter || 'all') + '"]');
				if (target) { target.classList.add('active'); }
				applyListFilters();
			}

			filterBtns.forEach(function(btn) {
				btn.addEventListener('click', function() {
					var filter = this.getAttribute('data-filter');
					var year = this.getAttribute('data-year');

					if (year) {
						// Year button toggle
						document.querySelectorAll('.filter-btn--year').forEach(function(b) { b.classList.remove('active'); });
						if (activeYear === year) {
							activeYear = null;
						} else {
							activeYear = year;
							this.classList.add('active');
						}
					} else if (filter === 'all') {
						activeFilters = [];
						filterBtns.forEach(function(b) {
							if (!b.hasAttribute('data-year')) b.classList.remove('active');
						});
						document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');
					} else {
						document.querySelector('.filter-btn[data-filter="all"]').classList.remove('active');
						var idx = activeFilters.indexOf(filter);
						if (idx > -1) {
							activeFilters.splice(idx, 1);
							this.classList.remove('active');
						} else {
							activeFilters.push(filter);
							this.classList.add('active');
						}
						if (activeFilters.length === 0) {
							document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');
						}
					}

					applyListFilters();
				});
			});

			// Badge clicks inside list items filter the list without navigating to the project
			document.querySelectorAll('.project-list-tags .badge[data-filter]').forEach(function(badge) {
				badge.addEventListener('click', function(e) {
					e.preventDefault();
					e.stopPropagation();
					activateListFilter(this.getAttribute('data-filter'));
				});
			});

			// Apply URL query param filter on load (e.g. /list/?filter=EMB)
			var urlParams = new URLSearchParams(window.location.search);
			var urlFilter = urlParams.get('filter');
			if (urlFilter) {
				activateListFilter(urlFilter);
			}

		}

	}

	// Run functions on load
	pageFunctions();


	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Menu

	$(document).on('click', '.js-menu-toggle', function (){

		// If already open
		if ( $('body').hasClass('menu--open') ) {
			$('body').removeClass('menu--open');
		}

		// If not open
		else {
			$('body').addClass('menu--open');
		}
	});

	$(document).on('click', '.menu__list__item__link', function (){

		// If menu is open when you click a link on mobile
		if ( $('.menu').hasClass('menu--open') ) {
			$('.menu').removeClass('menu--open');
		}
	});



	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Contact Form

	// Override the submit event
	$(document).on('submit', '#contact-form', function (e) {

		// Clear previous classes
		$('.contact-form__item--error').removeClass('contact-form__item--error');

		// Get form elements
		var emailField = $('.contact-form__input[name="email"]');
		var nameField = $('.contact-form__input[name="name"]');
		var messageField = $('.contact-form__textarea[name="message"]');
		var gotchaField = $('.contact-form__gotcha');

		// Validate email
		if ( emailField.val() === '' ) {
			emailField.closest('.contact-form__item').addClass('contact-form__item--error');
		}

		// Validate name
		if ( nameField.val() === '' ) {
			nameField.closest('.contact-form__item').addClass('contact-form__item--error');
		}

		// Validate message
		if ( messageField.val() === '' ) {
			messageField.closest('.contact-form__item').addClass('contact-form__item--error');
		}

		// If all fields are filled, except gotcha
		if ( emailField.val() !== '' && nameField.val() !== '' && messageField.val() !== '' && gotchaField.val().length === 0 ) {

			// Submit the form!
		}

		else {

			// Stop submission
			e.preventDefault();
		}

	});
	
	
	
}(jQuery));