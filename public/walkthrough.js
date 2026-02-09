/**
 * Walkthrough.js — Lightweight Digital Adoption Platform
 * Zero dependencies. Zero external calls. JSON-driven guided tours.
 *
 * Supports two step modes:
 *   - Passive: tooltip with Next/Back buttons (traditional tour)
 *   - Action:  waits for user to perform a real action (click, type, select)
 *              before advancing — like having a colleague guide you through a workflow
 *
 * Usage:
 *   Walkthrough.start('tour-id');
 *   Walkthrough.start({ id: 'inline', name: 'Demo', steps: [...] });
 *   Walkthrough.loadConfig('/walkthroughs.json').then(function() {
 *     Walkthrough.start('tour-id');
 *   });
 */
(function(global) {
  'use strict';

  // ===========================================================
  // Defaults
  // ===========================================================
  var DEFAULTS = {
    overlayColour: 'rgba(0, 0, 0, 0.65)',
    scrollBehaviour: 'smooth',
    showProgress: true,
    showStepNumbers: true,
    allowKeyboardNav: true,
    spotlightPadding: 8,
    spotlightBorderRadius: 8
  };

  var GAP = 12; // px between target and tooltip

  // ===========================================================
  // State
  // ===========================================================
  var state = {
    active: false,
    currentTour: null,
    currentStep: -1,
    previousFocus: null,
    registeredTours: {},
    listeners: {},
    actionWaiting: false // true when an action step is waiting for user input
  };

  // ===========================================================
  // Utilities
  // ===========================================================
  var utils = {
    debounce: function(fn, delay) {
      var timer;
      return function() {
        var ctx = this, args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function() { fn.apply(ctx, args); }, delay);
      };
    },

    throttle: function(fn, delay) {
      var last = 0;
      return function() {
        var now = Date.now();
        if (now - last >= delay) {
          last = now;
          fn.apply(this, arguments);
        }
      };
    },

    merge: function(target, source) {
      var result = {};
      var key;
      for (key in target) {
        if (target.hasOwnProperty(key)) result[key] = target[key];
      }
      for (key in source) {
        if (source.hasOwnProperty(key) && source[key] !== undefined) {
          result[key] = source[key];
        }
      }
      return result;
    },

    isVisible: function(el) {
      if (!el) return false;
      var style = getComputedStyle(el);
      return style.display !== 'none' &&
             style.visibility !== 'hidden' &&
             el.offsetWidth > 0 &&
             el.offsetHeight > 0;
    }
  };

  // ===========================================================
  // Event System (pub/sub)
  // ===========================================================
  var events = {
    on: function(name, fn) {
      if (!state.listeners[name]) state.listeners[name] = [];
      state.listeners[name].push(fn);
    },

    off: function(name, fn) {
      if (!state.listeners[name]) return;
      state.listeners[name] = state.listeners[name].filter(function(f) {
        return f !== fn;
      });
    },

    emit: function(name) {
      var args = Array.prototype.slice.call(arguments, 1);
      var fns = state.listeners[name] || [];
      for (var i = 0; i < fns.length; i++) {
        try { fns[i].apply(null, args); } catch (e) {
          console.warn('[Walkthrough] Event handler error:', e);
        }
      }
    }
  };

  // ===========================================================
  // Storage (localStorage wrapper)
  // ===========================================================
  var storage = {
    KEY: 'wt_completed',

    _get: function() {
      try {
        return JSON.parse(localStorage.getItem(this.KEY)) || {};
      } catch (e) { return {}; }
    },

    _set: function(data) {
      try {
        localStorage.setItem(this.KEY, JSON.stringify(data));
      } catch (e) { /* localStorage unavailable — fail silently */ }
    },

    markCompleted: function(tourId, version) {
      var data = this._get();
      data[tourId] = { completedAt: new Date().toISOString(), version: version || 1 };
      this._set(data);
    },

    isCompleted: function(tourId, version) {
      var data = this._get();
      if (!data[tourId]) return false;
      if (version && data[tourId].version < version) return false;
      return true;
    },

    reset: function(tourId) {
      var data = this._get();
      delete data[tourId];
      this._set(data);
    },

    resetAll: function() {
      try { localStorage.removeItem(this.KEY); } catch (e) { /* */ }
    },
    setPending: function(tourId) {
        try { sessionStorage.setItem('wt_pending_tour', tourId); } catch (e) { /* */ }
    },
    getPending: function() {
        try { return sessionStorage.getItem('wt_pending_tour'); } catch (e) { return null; }
    },
    clearPending: function() {
        try { sessionStorage.removeItem('wt_pending_tour'); } catch (e) { /* */ }
    }
  };

  // ===========================================================
  // SVG Overlay Builder
  // ===========================================================
  var overlayBuilder = {
    buildPath: function(vpW, vpH, cutout) {
      if (!cutout) {
        return 'M 0 0 H ' + vpW + ' V ' + vpH + ' H 0 Z';
      }

      var x = cutout.x;
      var y = cutout.y;
      var w = cutout.width;
      var h = cutout.height;
      var r = Math.min(cutout.radius || 0, w / 2, h / 2);

      var outer = 'M 0 0 H ' + vpW + ' V ' + vpH + ' H 0 Z';

      var inner =
        'M ' + (x + r) + ' ' + y +
        ' H ' + (x + w - r) +
        ' A ' + r + ' ' + r + ' 0 0 1 ' + (x + w) + ' ' + (y + r) +
        ' V ' + (y + h - r) +
        ' A ' + r + ' ' + r + ' 0 0 1 ' + (x + w - r) + ' ' + (y + h) +
        ' H ' + (x + r) +
        ' A ' + r + ' ' + r + ' 0 0 1 ' + x + ' ' + (y + h - r) +
        ' V ' + (y + r) +
        ' A ' + r + ' ' + r + ' 0 0 1 ' + (x + r) + ' ' + y +
        ' Z';

      return outer + ' ' + inner;
    }
  };

  // ===========================================================
  // Positioning Engine
  // ===========================================================
  var positioning = {
    getSpace: function(targetRect) {
      return {
        top: targetRect.top,
        bottom: window.innerHeight - targetRect.bottom,
        left: targetRect.left,
        right: window.innerWidth - targetRect.right
      };
    },

    bestPosition: function(targetRect, tooltipW, tooltipH) {
      var space = this.getSpace(targetRect);
      var prefs = ['bottom', 'top', 'right', 'left'];
      var fits = {
        bottom: space.bottom >= tooltipH + GAP,
        top: space.top >= tooltipH + GAP,
        right: space.right >= tooltipW + GAP,
        left: space.left >= tooltipW + GAP
      };
      for (var i = 0; i < prefs.length; i++) {
        if (fits[prefs[i]]) return prefs[i];
      }
      return 'bottom';
    },

    calculate: function(position, targetRect, tooltipW, tooltipH) {
      var scrollX = window.scrollX || window.pageXOffset;
      var scrollY = window.scrollY || window.pageYOffset;
      var top = 0;
      var left = 0;

      switch (position) {
        case 'top':
          top = targetRect.top - tooltipH - GAP + scrollY;
          left = targetRect.left + (targetRect.width - tooltipW) / 2 + scrollX;
          break;
        case 'bottom':
          top = targetRect.bottom + GAP + scrollY;
          left = targetRect.left + (targetRect.width - tooltipW) / 2 + scrollX;
          break;
        case 'left':
          top = targetRect.top + (targetRect.height - tooltipH) / 2 + scrollY;
          left = targetRect.left - tooltipW - GAP + scrollX;
          break;
        case 'right':
          top = targetRect.top + (targetRect.height - tooltipH) / 2 + scrollY;
          left = targetRect.right + GAP + scrollX;
          break;
      }

      var vpW = window.innerWidth;
      left = Math.max(8 + scrollX, Math.min(left, scrollX + vpW - tooltipW - 8));
      top = Math.max(8 + scrollY, top);

      return { top: top, left: left };
    },

    arrowClass: function(position) {
      var map = { top: 'wt-arrow-top', bottom: 'wt-arrow-bottom', left: 'wt-arrow-left', right: 'wt-arrow-right' };
      return map[position] || 'wt-arrow-bottom';
    }
  };

  // ===========================================================
  // DOM Manager
  // ===========================================================
  var dom = {
    overlay: null,
    overlayPath: null,
    tooltip: null,
    arrow: null,
    created: false,

    create: function() {
      if (this.created) return;

      // SVG overlay
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'wt-overlay');
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'wt-overlay-path');
      path.setAttribute('fill-rule', 'evenodd');
      svg.appendChild(path);
      this.overlay = svg;
      this.overlayPath = path;

      // Tooltip
      var tip = document.createElement('div');
      tip.className = 'wt-tooltip';
      tip.setAttribute('role', 'dialog');
      tip.setAttribute('aria-modal', 'true');
      tip.setAttribute('aria-label', 'Walkthrough step');

      tip.innerHTML =
        '<div class="wt-tooltip-arrow"></div>' +
        '<div class="wt-tooltip-header">' +
          '<span class="wt-step-badge"></span>' +
          '<h3 class="wt-tooltip-title"></h3>' +
          '<button class="wt-btn-close" aria-label="Close walkthrough">&times;</button>' +
        '</div>' +
        '<div class="wt-tooltip-body"><p></p></div>' +
        '<div class="wt-action-hint" style="display:none">' +
          '<span class="wt-action-hint-dot"></span>' +
          '<span class="wt-action-hint-text"></span>' +
        '</div>' +
        '<div class="wt-tooltip-footer">' +
          '<span class="wt-progress"></span>' +
          '<div class="wt-btn-group">' +
            '<button class="wt-btn wt-btn-prev">Back</button>' +
            '<button class="wt-btn wt-btn-primary wt-btn-next">Next</button>' +
          '</div>' +
        '</div>';

      this.tooltip = tip;
      this.arrow = tip.querySelector('.wt-tooltip-arrow');

      // Button handlers
      tip.querySelector('.wt-btn-close').addEventListener('click', function() {
        controller.exit();
      });
      tip.querySelector('.wt-btn-prev').addEventListener('click', function() {
        controller.prev();
      });
      tip.querySelector('.wt-btn-next').addEventListener('click', function() {
        controller.next();
      });

      document.body.appendChild(svg);
      document.body.appendChild(tip);
      this.created = true;
    },

    destroy: function() {
      if (!this.created) return;
      if (this.overlay && this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
      if (this.tooltip && this.tooltip.parentNode) {
        this.tooltip.parentNode.removeChild(this.tooltip);
      }
      this.overlay = null;
      this.overlayPath = null;
      this.tooltip = null;
      this.arrow = null;
      this.created = false;
    },

    updateOverlay: function(targetEl, options) {
      var vpW = window.innerWidth;
      var vpH = window.innerHeight;
      this.overlay.setAttribute('viewBox', '0 0 ' + vpW + ' ' + vpH);

      var cutout = null;
      if (targetEl) {
        var rect = targetEl.getBoundingClientRect();
        var pad = (options && options.spotlightPadding) || DEFAULTS.spotlightPadding;
        var rad = (options && options.spotlightBorderRadius) || DEFAULTS.spotlightBorderRadius;
        cutout = {
          x: rect.left - pad,
          y: rect.top - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          radius: rad
        };
      }

      this.overlayPath.setAttribute('d', overlayBuilder.buildPath(vpW, vpH, cutout));
    },

    /** Enable or disable click-through on the overlay (for action steps). */
    setOverlayPassthrough: function(passthrough) {
      if (!this.overlay) return;
      if (passthrough) {
        this.overlay.classList.add('wt-overlay-passthrough');
      } else {
        this.overlay.classList.remove('wt-overlay-passthrough');
      }
    },

    updateTooltip: function(step, index, total, options) {
      var badge = this.tooltip.querySelector('.wt-step-badge');
      var title = this.tooltip.querySelector('.wt-tooltip-title');
      var body = this.tooltip.querySelector('.wt-tooltip-body p');
      var progress = this.tooltip.querySelector('.wt-progress');
      var prevBtn = this.tooltip.querySelector('.wt-btn-prev');
      var nextBtn = this.tooltip.querySelector('.wt-btn-next');
      var hintRow = this.tooltip.querySelector('.wt-action-hint');
      var hintText = this.tooltip.querySelector('.wt-action-hint-text');

      var isAction = !!(step.action && step.action.type);
      var isLast = (index === total - 1);

      // Step number badge
      if (options.showStepNumbers) {
        badge.textContent = index + 1;
        badge.style.display = '';
      } else {
        badge.style.display = 'none';
      }

      title.textContent = step.title || '';
      body.innerHTML = step.content || '';

      // Progress
      if (options.showProgress) {
        progress.textContent = 'Step ' + (index + 1) + ' of ' + total;
        progress.style.display = '';
      } else {
        progress.style.display = 'none';
      }

      // Navigation buttons — differ by step mode
      prevBtn.disabled = (index === 0);

      if (isAction) {
        // Action step: allow manual advance via "Next" (acts as override)
        nextBtn.textContent = 'Next';
        nextBtn.className = 'wt-btn wt-btn-primary wt-btn-next';

        // Show action hint
        hintRow.style.display = '';
        hintText.textContent = this.getActionHint(step.action);
      } else {
        // Passive step
        nextBtn.textContent = isLast ? 'Finish' : 'Next';
        nextBtn.className = 'wt-btn wt-btn-primary wt-btn-next';

        // Hide action hint
        hintRow.style.display = 'none';
      }
    },

    /** Generate a human-friendly hint based on action type. */
    getActionHint: function(action) {
      switch (action.type) {
        case 'click': return 'Go ahead \u2014 click the highlighted element';
        case 'input':
          return action.value
            ? 'Type \u201C' + action.value + '\u201D in the field above'
            : 'Type something in the field above';
        case 'select':
          return action.value
            ? 'Select \u201C' + action.value + '\u201D from the dropdown'
            : 'Choose an option from the dropdown';
        case 'check': return 'Toggle the checkbox above';
        case 'custom': return 'Complete the action to continue';
        default: return 'Perform the action to continue';
      }
    },

    positionTooltip: function(targetEl, requestedPosition, options) {
      var isMobile = window.innerWidth <= 480;
      if (isMobile) {
        this.tooltip.style.top = '';
        this.tooltip.style.left = '';
        this.arrow.className = 'wt-tooltip-arrow';
        return;
      }

      // Temporarily show off-screen to measure
      this.tooltip.style.visibility = 'hidden';
      this.tooltip.style.top = '0px';
      this.tooltip.style.left = '0px';
      this.tooltip.classList.add('wt-visible');

      var targetRect = targetEl.getBoundingClientRect();
      var tooltipRect = this.tooltip.getBoundingClientRect();
      var tooltipW = tooltipRect.width;
      var tooltipH = tooltipRect.height;

      var pos = requestedPosition;
      if (!pos || pos === 'auto') {
        pos = positioning.bestPosition(targetRect, tooltipW, tooltipH);
      }

      var coords = positioning.calculate(pos, targetRect, tooltipW, tooltipH);

      this.tooltip.style.top = coords.top + 'px';
      this.tooltip.style.left = coords.left + 'px';
      this.tooltip.style.visibility = '';

      this.arrow.className = 'wt-tooltip-arrow ' + positioning.arrowClass(pos);
      this.adjustArrow(pos, targetRect, coords, tooltipW, tooltipH);
    },

    adjustArrow: function(pos, targetRect, tooltipCoords, tooltipW, tooltipH) {
      var scrollX = window.scrollX || window.pageXOffset;
      var scrollY = window.scrollY || window.pageYOffset;
      this.arrow.style.left = '';
      this.arrow.style.top = '';

      if (pos === 'top' || pos === 'bottom') {
        var targetCentreX = targetRect.left + targetRect.width / 2 + scrollX;
        var arrowLeft = targetCentreX - tooltipCoords.left - 8;
        arrowLeft = Math.max(16, Math.min(arrowLeft, tooltipW - 32));
        this.arrow.style.left = arrowLeft + 'px';
      } else {
        var targetCentreY = targetRect.top + targetRect.height / 2 + scrollY;
        var arrowTop = targetCentreY - tooltipCoords.top - 8;
        arrowTop = Math.max(16, Math.min(arrowTop, tooltipH - 32));
        this.arrow.style.top = arrowTop + 'px';
      }
    },

    showTooltip: function() {
      this.tooltip.classList.add('wt-visible');
    },

    hideTooltip: function() {
      this.tooltip.classList.remove('wt-visible');
    },

    /** Show a brief success checkmark animation. */
    showSuccessFlash: function(callback) {
      var flash = document.createElement('div');
      flash.className = 'wt-success-flash';
      document.body.appendChild(flash);

      setTimeout(function() {
        if (flash.parentNode) flash.parentNode.removeChild(flash);
        if (callback) callback();
      }, 600);
    }
  };

  // ===========================================================
  // Action Watcher — listens for user actions on target elements
  // ===========================================================
  var actionWatcher = {
    currentListener: null,
    currentTarget: null,
    currentEvent: null,

    /**
     * Attach a listener to the target element based on action type.
     * When the action is detected, calls onComplete.
     */
    attach: function(targetEl, action, onComplete) {
      this.detach(); // clean up any previous watcher

      this.currentTarget = targetEl;
      var self = this;

      switch (action.type) {
        case 'click':
          this.currentEvent = 'click';
          this.currentListener = function() {
            self.detach();
            onComplete();
          };
          targetEl.addEventListener('click', this.currentListener);
          break;

        case 'input':
          this.currentEvent = 'input';
          this.currentListener = function() {
            if (action.value) {
              // Only advance when input contains the expected value
              if (targetEl.value.toLowerCase().indexOf(action.value.toLowerCase()) !== -1) {
                self.detach();
                onComplete();
              }
            } else {
              // Any input triggers advance
              if (targetEl.value.length > 0) {
                self.detach();
                onComplete();
              }
            }
          };
          targetEl.addEventListener('input', this.currentListener);
          break;

        case 'select':
          this.currentEvent = 'change';
          this.currentListener = function() {
            if (action.value) {
              if (targetEl.value === action.value) {
                self.detach();
                onComplete();
              }
            } else {
              self.detach();
              onComplete();
            }
          };
          targetEl.addEventListener('change', this.currentListener);
          break;

        case 'check':
          this.currentEvent = 'change';
          this.currentListener = function() {
            self.detach();
            onComplete();
          };
          targetEl.addEventListener('change', this.currentListener);
          break;

        case 'custom':
          // No listener — waits for Walkthrough.completeStep() to be called
          this.currentEvent = null;
          this.currentListener = null;
          break;

        default:
          console.warn('[Walkthrough] Unknown action type: ' + action.type);
      }
    },

    /** Remove the current event listener cleanly. */
    detach: function() {
      if (this.currentTarget && this.currentListener && this.currentEvent) {
        this.currentTarget.removeEventListener(this.currentEvent, this.currentListener);
      }
      this.currentTarget = null;
      this.currentListener = null;
      this.currentEvent = null;
    }
  };

  // ===========================================================
  // Event Handlers
  // ===========================================================
  var boundHandlers = {};

  var launcher = {
    el: null,
    menu: null,
    visible: false,
    create: function(tours) {
        if (this.el) return;

        // Button
        var btn = document.createElement('button');
        btn.className = 'wt-launcher';
        btn.innerHTML = '?';
        btn.title = 'Get Help';
        btn.addEventListener('click', function(e) { 
            e.stopPropagation();
            launcher.toggle(); 
        });
        document.body.appendChild(btn);
        this.el = btn;

        // Menu
        var menu = document.createElement('div');
        menu.className = 'wt-menu';
        
        var header = document.createElement('div');
        header.className = 'wt-menu-header';
        header.innerHTML = '<span class="wt-menu-title">Support & Guides</span><span class="wt-menu-subtitle">Select a tour to start</span>';
        menu.appendChild(header);

        var list = document.createElement('div');
        list.className = 'wt-menu-list';
        
        var tourKeys = Object.keys(tours);
        if (tourKeys.length === 0) {
            list.innerHTML = '<div class="wt-menu-empty">No guides available</div>';
        } else {
            tourKeys.forEach(function(key) {
                var t = tours[key];
                var item = document.createElement('button');
                item.className = 'wt-menu-item';
                item.onclick = function() {
                    launcher.toggle();
                    // Reset completion status so manual launches always work
                    if (t.id) storage.reset(t.id);
                    controller.start(t);
                };
                item.innerHTML = '<span class="wt-menu-item-icon">📄</span> ' + (t.name || t.id);
                list.appendChild(item);
            });
        }
        
        menu.appendChild(list);
        document.body.appendChild(menu);
        this.menu = menu;

        // Global click to close
        document.addEventListener('click', function(e) {
            if (launcher.visible && !menu.contains(e.target) && e.target !== btn) {
                launcher.toggle();
            }
        });
    },
    toggle: function() {
        if (!this.menu) return;
        this.visible = !this.visible;
        if (this.visible) {
            this.menu.classList.add('wt-visible');
            this.el.innerHTML = '&times;';
        } else {
            this.menu.classList.remove('wt-visible');
            this.el.innerHTML = '?';
        }
    }
  };

  var handlers = {
    onResize: utils.debounce(function() {
      if (!state.active) return;
      controller.refreshPosition();
    }, 100),

    onScroll: utils.throttle(function() {
      if (!state.active) return;
      controller.refreshPosition();
    }, 50),

    onKeydown: function(e) {
      if (!state.active) return;
      var tour = state.currentTour;
      var opts = utils.merge(DEFAULTS, tour.options || {});
      if (!opts.allowKeyboardNav) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          controller.exit();
          break;
        case 'ArrowRight':
        case 'Enter':
          // On action steps, don't let keyboard skip — user must do the action
          // (the Skip button is the intentional escape hatch)
          if (state.actionWaiting) return;
          e.preventDefault();
          controller.next();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          controller.prev();
          break;
        case 'Tab':
          e.preventDefault();
          trapFocus(e);
          break;
      }
    },

    onOverlayClick: function(e) {
      // Only exit on overlay click during passive steps
      if (state.actionWaiting) return;
      if (e.target === dom.overlay || e.target === dom.overlayPath) {
        controller.exit();
      }
    },

    bind: function() {
      boundHandlers.resize = handlers.onResize;
      boundHandlers.scroll = handlers.onScroll;
      boundHandlers.keydown = handlers.onKeydown;
      boundHandlers.overlayClick = handlers.onOverlayClick;

      window.addEventListener('resize', boundHandlers.resize);
      window.addEventListener('scroll', boundHandlers.scroll, true);
      document.addEventListener('keydown', boundHandlers.keydown);
      dom.overlay.addEventListener('click', boundHandlers.overlayClick);
    },

    unbind: function() {
      window.removeEventListener('resize', boundHandlers.resize);
      window.removeEventListener('scroll', boundHandlers.scroll, true);
      document.removeEventListener('keydown', boundHandlers.keydown);
      if (dom.overlay) {
        dom.overlay.removeEventListener('click', boundHandlers.overlayClick);
      }
    }
  };

  function trapFocus(e) {
    if (!dom.tooltip) return;
    var focusable = dom.tooltip.querySelectorAll('button:not(:disabled)');
    if (focusable.length === 0) return;

    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    var active = document.activeElement;

    if (e.shiftKey) {
      if (active === first || !dom.tooltip.contains(active)) {
        last.focus();
      } else {
        var idx = Array.prototype.indexOf.call(focusable, active);
        if (idx > 0) focusable[idx - 1].focus();
        else last.focus();
      }
    } else {
      if (active === last || !dom.tooltip.contains(active)) {
        first.focus();
      } else {
        var idx2 = Array.prototype.indexOf.call(focusable, active);
        if (idx2 < focusable.length - 1) focusable[idx2 + 1].focus();
        else first.focus();
      }
    }
  }

  // ===========================================================
  // Tour Controller
  // ===========================================================
  var controller = {
    start: function(idOrConfig) {
      if (state.active) controller.exit();

      var tour;
      if (typeof idOrConfig === 'string') {
        tour = state.registeredTours[idOrConfig];
        if (!tour) {
          console.warn('[Walkthrough] Tour not found: ' + idOrConfig);
          return;
        }
      } else if (idOrConfig && typeof idOrConfig === 'object') {
        tour = idOrConfig;
        if (tour.id) state.registeredTours[tour.id] = tour;
      } else {
        console.warn('[Walkthrough] Invalid argument to start()');
        return;
      }

      // Check for startUrl redirect
      if (tour.startUrl) {
        // Compare only origin + pathname (ignore query params and hash)
        var currentBase = window.location.origin + window.location.pathname;
        if (currentBase.slice(-1) === '/') currentBase = currentBase.slice(0, -1);
        
        // Parse target URL to get just origin + pathname
        var targetUrl;
        try {
          targetUrl = new URL(tour.startUrl);
        } catch(e) {
          targetUrl = { origin: '', pathname: tour.startUrl };
        }
        var targetBase = targetUrl.origin + targetUrl.pathname;
        if (targetBase.slice(-1) === '/') targetBase = targetBase.slice(0, -1);
        
        if (currentBase !== targetBase) {
            // Redirect with wt_start param so content.js can auto-start after page load
            var redirectUrl = tour.startUrl + (tour.startUrl.indexOf('?') === -1 ? '?' : '&') + 'wt_start=' + tour.id;
            window.location.href = redirectUrl;
            return;
        }
      }

      if (!tour.steps || tour.steps.length === 0) {
        console.warn('[Walkthrough] Tour has no steps: ' + (tour.id || 'unknown'));
        return;
      }

      if (tour.id && storage.isCompleted(tour.id, tour.version)) {
        events.emit('skip', tour.id, -1);
        return;
      }

      state.previousFocus = document.activeElement;
      state.active = true;
      state.currentTour = tour;
      state.currentStep = -1;
      state.actionWaiting = false;

      dom.create();
      handlers.bind();

      events.emit('start', tour.id);
      controller.next();
    },

    next: function() {
      if (!state.active) return;

      // Clean up any active action watcher
      actionWatcher.detach();
      state.actionWaiting = false;
      dom.setOverlayPassthrough(false);

      var tour = state.currentTour;
      var nextIndex = state.currentStep + 1;

      if (nextIndex >= tour.steps.length) {
        controller.complete();
        return;
      }

      controller.showStep(nextIndex);
    },

    prev: function() {
      if (!state.active) return;
      if (state.currentStep <= 0) return;

      // Clean up any active action watcher
      actionWatcher.detach();
      state.actionWaiting = false;
      dom.setOverlayPassthrough(false);

      controller.showStep(state.currentStep - 1);
    },

    goTo: function(index) {
      if (!state.active) return;
      var tour = state.currentTour;
      if (index < 0 || index >= tour.steps.length) return;

      actionWatcher.detach();
      state.actionWaiting = false;
      dom.setOverlayPassthrough(false);

      controller.showStep(index);
    },

    /** Called when an action step's action is completed by the user. */
    onActionComplete: function() {
      if (!state.active || !state.actionWaiting) return;
      state.actionWaiting = false;
      dom.setOverlayPassthrough(false);

      // Show success flash, then advance
      dom.showSuccessFlash(function() {
        controller.next();
      });
    },

    /** External API for completing a "custom" action step. */
    completeStep: function() {
      controller.onActionComplete();
    },

    showStep: function(index) {
      var tour = state.currentTour;
      var step = tour.steps[index];
      var opts = utils.merge(DEFAULTS, tour.options || {});

      var targetEl = document.querySelector(step.selector);
      if (!targetEl || !utils.isVisible(targetEl)) {
        // console.warn('[Walkthrough] Target not found or hidden: ' + step.selector + ' (step ' + (index + 1) + ')');
        state.currentStep = index;
        if (index < tour.steps.length - 1) {
          controller.next();
        } else {
          controller.complete();
        }
        return;
      }

      state.currentStep = index;

      var inView = controller.isInViewport(targetEl);
      if (!inView) {
        targetEl.scrollIntoView({
          behavior: opts.scrollBehaviour,
          block: 'center'
        });
      }

      var settle = inView ? 0 : 350;
      dom.hideTooltip();

      setTimeout(function() {
        var stepOpts = utils.merge(opts, {
          spotlightPadding: step.highlightPadding !== undefined ? step.highlightPadding : opts.spotlightPadding,
          spotlightBorderRadius: opts.spotlightBorderRadius
        });

        dom.updateOverlay(targetEl, stepOpts);
        dom.updateTooltip(step, index, tour.steps.length, opts);
        dom.positionTooltip(targetEl, step.position, opts);
        dom.showTooltip();

        // Set up action watcher if this is an action step
        var isAction = !!(step.action && step.action.type);
        if (isAction) {
          state.actionWaiting = true;
          dom.setOverlayPassthrough(true);
          actionWatcher.attach(targetEl, step.action, function() {
            controller.onActionComplete();
          });
          // Focus the target element so it's ready for interaction
          if (step.action.type === 'input' || step.action.type === 'select') {
            targetEl.focus();
          }
        } else {
          // Passive step — focus the next/finish button
          var nextBtn = dom.tooltip.querySelector('.wt-btn-next');
          if (nextBtn) nextBtn.focus();
        }

        events.emit('step', index, step);
      }, settle);
    },

    refreshPosition: function() {
      if (!state.active || state.currentStep < 0) return;
      var tour = state.currentTour;
      var step = tour.steps[state.currentStep];
      var opts = utils.merge(DEFAULTS, tour.options || {});
      var targetEl = document.querySelector(step.selector);
      if (!targetEl) return;

      var stepOpts = utils.merge(opts, {
        spotlightPadding: step.highlightPadding !== undefined ? step.highlightPadding : opts.spotlightPadding
      });

      dom.updateOverlay(targetEl, stepOpts);
      dom.positionTooltip(targetEl, step.position, opts);
    },

    isInViewport: function(el) {
      var rect = el.getBoundingClientRect();
      return rect.top >= 0 &&
             rect.left >= 0 &&
             rect.bottom <= window.innerHeight &&
             rect.right <= window.innerWidth;
    },

    complete: function() {
      var tour = state.currentTour;
      if (tour && tour.id) {
        storage.markCompleted(tour.id, tour.version);
      }
      events.emit('complete', tour ? tour.id : null);
      controller.cleanup();
    },

    exit: function() {
      var tour = state.currentTour;
      events.emit('skip', tour ? tour.id : null, state.currentStep);
      controller.cleanup();
    },

    cleanup: function() {
      actionWatcher.detach();
      state.actionWaiting = false;
      handlers.unbind();
      dom.hideTooltip();
      dom.setOverlayPassthrough(false);

      if (dom.overlay) {
        dom.overlay.style.opacity = '0';
      }
      setTimeout(function() {
        dom.destroy();
      }, 300);

      if (state.previousFocus && state.previousFocus.focus) {
        state.previousFocus.focus();
      }

      state.active = false;
      state.currentTour = null;
      state.currentStep = -1;
      state.previousFocus = null;
    }
  };

  // ===========================================================
  // Public API
  // ===========================================================
  var Walkthrough = {
    start: function(idOrConfig) { controller.start(idOrConfig); },
    next: function() { controller.next(); },
    prev: function() { controller.prev(); },
    goTo: function(index) { controller.goTo(index); },
    exit: function() { controller.exit(); },

    /** Manually complete the current action step (for "custom" action type). */
    completeStep: function() { controller.completeStep(); },

    register: function(config) {
      if (config && config.id) {
        state.registeredTours[config.id] = config;
      }
    },

    loadConfig: function(url) {
      return fetch(url)
        .then(function(r) {
          if (!r.ok) throw new Error('Failed to load config: ' + r.status);
          return r.json();
        })
        .then(function(data) {
          var tours = data.walkthroughs || data;
          var keys = Object.keys(tours);
          for (var i = 0; i < keys.length; i++) {
            var tour = tours[keys[i]];
            if (tour && tour.id) {
              state.registeredTours[tour.id] = tour;
            }
          }
        });
    },

    isActive: function() { return state.active; },
    getCurrentStep: function() { return state.currentStep; },

    isCompleted: function(id) { return storage.isCompleted(id); },
    resetCompleted: function(id) { storage.reset(id); },
    resetAllCompleted: function() { storage.resetAll(); },

    on: function(name, fn) { events.on(name, fn); return Walkthrough; },
    off: function(name, fn) { events.off(name, fn); return Walkthrough; },

    createLauncher: function(tours) { launcher.create(tours || state.registeredTours); },
    
    checkPending: function() {
        var pendingId = storage.getPending();
        if (pendingId) {
            // Wait briefly for page settle
            setTimeout(function() {
                var tour = state.registeredTours[pendingId];
                if (tour) {
                    storage.clearPending();
                    controller.start(tour);
                }
            }, 500);
        }
    }
  };

  global.Walkthrough = Walkthrough;

})(typeof window !== 'undefined' ? window : this);
