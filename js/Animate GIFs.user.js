// ==UserScript==
// @name     Animate GIFs
// @version  1.0
// @include  *
// @grant    GM.addStyle
// @grant    GM.getValue
// @grant    GM.notification
// @grant    GM.setValue
// @grant    GM.xmlHttpRequest
// @grant    GM_addValueChangeListener
// @grant    GM_registerMenuCommand
// @require  https://github.com/deanm/omggif/raw/c205bec8d5df181d2f4854494a0fad8be2b7e790/omggif.js
// ==/UserScript==

/* global GM, GM_addValueChangeListener, GM_registerMenuCommand, GifReader */

(async function() {
  'use strict';

  const settings = {
    debug: false,
    play_once: false,
    process_all_images: false,
  };

  function log(...args) {
    if (settings.debug) {
      console.debug(...args);
    }
  }

  for (const key of Object.keys(settings)) {
    settings[key] = await GM.getValue(key, settings[key]);
    if (typeof GM_registerMenuCommand === "function") {
      GM_registerMenuCommand(`Toggle ${key}`, () => {
        GM.setValue(key, settings[key] = !settings[key]);
        GM.notification({
          title: 'Animate GIF',
          text: `settings.${key}: ${settings[key]}`,
        });
      });
    }
  }
  if (typeof GM_addValueChangeListener === "function") {
    const on_setting_changed = (key, _old_value, new_value, remote) => {
        if (remote) {
          settings[key] = new_value;
          log(`settings.${key}: ${settings[key]}`);
        }
    };
    for (const key of Object.keys(settings)) {
      GM_addValueChangeListener(key, on_setting_changed);
    }
  }

  log('Animate GIF using', GM.info.scriptHandler, JSON.stringify(settings));

  // Track already processed images.
  const image_animated_gif = new WeakMap();
  // Keep track of track of last focused image.
  let last_focused_img = null;

  if (typeof GM.addStyle !== "function") {
    log('GM.addStyle is undefined');
    GM.addStyle = (css) => {
      const style = document.createElement('style');
      style.textContent = css;
      (document.head || document.body || document.documentElement || document).appendChild(style);
    };
  }

  function get_element_viewport(element, style) {
    // First get the border and padding values.
    if (!style) {
      style = getComputedStyle(element);
    }
    const border_left = parseFloat(style.borderLeftWidth);
    const border_width = border_left + parseFloat(style.borderRightWidth);
    const border_top = parseFloat(style.borderTopWidth);
    const border_height = border_top + parseFloat(style.borderBottomWidth);
    const padding_left = parseFloat(style.paddingLeft);
    const padding_width = padding_left + parseFloat(style.paddingRight)
    const padding_top = parseFloat(style.paddingTop);
    const padding_height = padding_top + parseFloat(style.paddingBottom);
    // Get the current bounding rect, including the border-box.
    const rect = element.getBoundingClientRect();
    const viewport = {};
    // We need to get the current scale since the computed values don't know about it...
    viewport.xscale = 1 / (element.offsetWidth / rect.width);
    viewport.yscale = 1 / (element.offsetHeight / rect.height);
    viewport.padding_left = padding_left * viewport.xscale;
    viewport.padding_top = padding_top * viewport.xscale;
    viewport.left = rect.left + (border_left + padding_left) * viewport.xscale;
    viewport.top = rect.top + (border_top + padding_top) * viewport.yscale;
    viewport.width = rect.width - (border_width + padding_width) * viewport.xscale;
    viewport.height = rect.height - (border_height + padding_height) * viewport.yscale;
    // The real displayed height and width without border nor padding.
    return viewport;
  }

  const player = {

    body: null,

    img: null,
    gif: null,
    animation: 0,
    loops: 0, frame_number: 0,
    previous_frame: null,
    previous_image: null,
    previous_expiration: null,

    visibility_observer: null,

    // For simulating missed frames when refresh
    // rate is lower than the displayed GIF FPS.
    refresh_rate: 0,
    refresh_timestamp: null,

    init() {
      log('player.init');
      GM.addStyle(`
        /* Hide image while playing. */
        .gifanimate_image.gifanimate_playing {
          opacity: 0 !important;
        }

        /* Prevent image CSS transitions from making a mess. */
        .gifanimate_image {
          transition: none !important;
          animation: none !important;
        }
        `);
      document.body.insertAdjacentHTML('beforeend', `
        <div id="gifanimate">
        </div>
        `);
      this.body = document.querySelector('#gifanimate');
      const shadow = this.body.attachShadow({mode: 'closed'});
      shadow.innerHTML = `
        <style>
          :host(#gifanimate) {
            background-color: rgba(0, 0, 0, 0) !important;
            position: absolute;
            pointer-events: none;
            border: 0;
            margin: 0;
            padding: 0;
            align-items: center;
            justify-content: center;
          }

          :host(.gifanimate_enabled) {
            display: flex;
          }

          :host(:not(.gifanimate_enabled)) {
            display: none;
          }

          canvas {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            border: 0;
            margin: 0;
            padding: 0;
            opacity: 0;
          }

          /* Show canvas when something is drawn. */
          canvas.drawn {
            opacity: 1;
          }

          .control {
            display: flex;
            z-index: 666;
            width: 54px;
            height: 54px;
            cursor: pointer;
            pointer-events: auto;
            align-items: center;
            justify-content: center;
            opacity: 0;
            margin: 0;
            padding: 0;
            background: rgb(29, 161, 242);
            border-color: white;
            border-radius: 50%;
            border-style: solid;
            border-width: 4px;
          }

          /* Show control when hovering over it or over the image. */
          .control:hover, .control.shown {
            opacity: 1;
            background: rgb(29, 141, 242);
          }

          /* Hide control when activated. */
          .control.activated {
            opacity: 0;
          }

          .icon {
            width: calc(50% + 4px);
            height: calc(50% + 4px);
            background-image: url("data:image/svg+xml;utf8,<svg viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg'><path fill='white' stroke='white' stroke-width='1.5' stroke-linejoin='round' d='M 4,2 V 14 L 14,8 Z'/></svg>");
            background-position: right top;
            background-repeat: no-repeat;
            background-size: 100%;
          }

          :host(.gifanimate_playing) .icon {
            background-image: url("data:image/svg+xml;utf8,<svg viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg'><path fill='white' stroke='white' stroke-width='1.5' stroke-linejoin='round' d='M 3,3 H 13 V 13 H 3 Z'/></svg>");
          }
        </style>
        <canvas></canvas>
        <div class="control">
          <span class="icon"></span>
        </div>
        `;
      this.canvas = shadow.querySelector('canvas');
      this.control = shadow.querySelector('.control');
      this.control.addEventListener('click', evt => {
        evt.stopPropagation();
        evt.preventDefault();
        if (this.animation) {
          this.stop();
        } else {
          this.play();
        }
      }, true);
      this.control.addEventListener('mouseleave', evt => {
        evt.stopPropagation();
        this.control.classList.remove('activated');
      });
      // Stop animation if element is out of view.
      this.visibility_observer = new IntersectionObserver(entries => {
        if (entries[0].intersectionRatio <= 0) {
          this.stop();
        }
      });
      this.visibility_observer.observe(this.body);
      // Stop animation if page does not have focus.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.stop();
        }
      });
      this.animate = this.animate.bind(this);
      this.on_image_mouseenter = this.on_image_mouseenter.bind(this);
      this.on_image_mouseleave = this.on_image_mouseleave.bind(this);
    },

    draw_frame() {
      const context = this.canvas.getContext('2d');
      if (!this.frame_number) {
        context.clearRect(0, 0, this.gif.width, this.gif.height);
      }
      if (this.frame_number && this.previous_frame) {
        switch (this.previous_frame.disposal) {
          case 0:
            // "No disposal specified" - do nothing, we draw over the existing canvas.
            break;
          case 1:
            // "Do not dispose" - do nothing, we draw over the existing canvas.
            break;
          case 2:
            // "Restore to background" - browsers ignore background color, so
            // in practice it is always "Restore to transparent".
            context.clearRect(this.previous_frame.x, this.previous_frame.y,
              this.previous_frame.width, this.previous_frame.height);
            break;
          case 3:
            // "Restore to previous" - revert back to most recent frame that was
            // not set to "Restore to previous", or frame 0.
            if (this.previous_image) {
              context.putImageData(this.previous_image, 0, 0);
            }
            break;
          default:
            console.error("unsupported disposal method:", this.previous_frame.disposal);
            break;
        }
      }
      const image = context.getImageData(0, 0, this.gif.width, this.gif.height);
      this.gif.decodeAndBlitFrameRGBA(this.frame_number, image.data);
      const frame = this.gif.frameInfo(this.frame_number);
      context.putImageData(image, 0, 0, frame.x, frame.y, frame.width, frame.height);
      if (!this.frame_number || frame.disposal < 2) {
        // Save this frame in case we need to revert to it later.
        this.previous_image = context.getImageData(0, 0, this.gif.width, this.gif.height);
      }
      this.previous_frame = frame;
      this.canvas.classList.add('drawn');
    },

    animate(timestamp) {
      let elapsed;
      if (this.refresh_rate) {
        if (!this.refresh_timestamp) {
          this.refresh_timestamp = timestamp;
        }
        elapsed = timestamp - this.refresh_timestamp;
        if (elapsed < 1000 / this.refresh_rate) {
          this.animation = window.requestAnimationFrame(this.animate);
          return;
        }
      }
      if (timestamp > this.previous_expiration) {
        if (!this.previous_expiration) {
          this.previous_expiration = timestamp;
        }
        this.draw_frame();
        this.previous_expiration += 10 * (this.previous_frame.delay || 10);
        const expired = timestamp > this.previous_expiration;
        if (expired) {
          log('expired', this.frame_number, Math.round(timestamp - this.previous_expiration));
        }
        if (++this.frame_number === this.gif.numFrames()) {
          this.frame_number = 0;
          if (settings.play_once || --this.loops === 0) {
            // Bail if we're on the last loop.
            this.stop();
            return;
          }
        }
        if (expired) {
          return this.animate(timestamp);
        }
      }
      this.animation = window.requestAnimationFrame(this.animate);
      if (this.refresh_rate) {
        this.refresh_timestamp = timestamp + elapsed - 1000 / this.refresh_rate;
      }
    },

    play() {
      if (this.animation) {
        return;
      }
      log('player.play');
      this.frame_number = 0;
      this.loops = this.gif.loopCount();
      this.refresh_timestamp = this.previous_expiration = 0;
      this.img.classList.add('gifanimate_playing');
      this.body.classList.add('gifanimate_playing');
      this.control.classList.add('activated');
      this.animation = window.requestAnimationFrame(this.animate);
    },

    stop() {
      if (!this.animation) {
        return;
      }
      log('player.stop');
      // N.B.: need to use `unsafeWindow` to support ViolentMonkey...
      this.animation = unsafeWindow.cancelAnimationFrame(this.animation);
      this.img.classList.remove('gifanimate_playing');
      this.body.classList.remove('gifanimate_playing');
      this.control.classList.remove('activated');
      this.canvas.classList.remove('drawn');
    },

    on_image_mouseenter() {
      if (!this.animation) {
        this.control.classList.add('shown');
      }
    },

    on_image_mouseleave() {
      this.control.classList.remove('shown');
    },

    enable(img, gif) {
      if (!this.body) {
        this.init();
      }
      else if (this.img === img) {
        return;
      }
      this.disable();
      log('player.enable', img.currentSrc);
      const style = getComputedStyle(img);
      const viewport = get_element_viewport(img, style);
      let anchor = img.offsetParent;
      for (; anchor; anchor = anchor.offsetParent) {
        const style = getComputedStyle(anchor);
        if (style.position === 'absolute' || style.position === 'relative') {
          break;
        }
      }
      if (anchor) {
        const anchor_viewport = get_element_viewport(anchor);
        this.body.style.left = `${viewport.left - anchor_viewport.left + anchor_viewport.padding_left}px`;
        this.body.style.top = `${viewport.top - anchor_viewport.top + anchor_viewport.padding_top}px`;
      }
      else {
        this.body.style.left = `${window.pageXOffset + viewport.left}px`;
        this.body.style.top = `${window.pageYOffset + viewport.top}px`;
      }
      this.body.classList.remove('gifanimate_playing');
      this.img = img;
      this.gif = gif;
      this.body.style.width = `${viewport.width}px`;
      this.body.style.height = `${viewport.height}px`;
      this.canvas.width = gif.width;
      this.canvas.height = gif.height;
      for (let field of ['attachment', 'scroll', 'blend-mode', 'clip', 'color', 'image',
        'origin', 'position', 'position-x', 'position-y', 'repeat', 'size']) {
        field = 'background-' + field;
        this.canvas.style[field] = style[field];
      }
      img.addEventListener('mouseenter', this.on_image_mouseenter);
      img.addEventListener('mouseleave', this.on_image_mouseleave);
      img.classList.add('gifanimate_image');
      img.parentElement.appendChild(this.body);
      this.body.classList.add('gifanimate_enabled');
      this.control.classList.add('shown');
    },

    disable() {
      if (!this.body.classList.contains('gifanimate_enabled')) {
        return;
      }
      this.stop();
      log('player.disable');
      this.body.classList.remove('gifanimate_enabled');
      this.img.classList.remove('gifanimate_image');
      this.img.removeEventListener('mouseenter', this.on_image_mouseenter);
      this.img.removeEventListener('mouseleave', this.on_image_mouseleave);
      this.img = null;
      this.gif = null;
    },
  };

  function copy_array(src) {
    const dst = new Uint8Array(src.byteLength);
    dst.set(new Uint8Array(src));
    return dst;
  }

  function on_image_fetched(img, href, buffer) {
    let gif;
    try {
      gif = new GifReader(buffer);
    }
    catch (e) {
      console.log(href, e.message);
      image_animated_gif.set(img, [href, null]);
      return;
    }
    log(href, 'has', gif.numFrames(), 'frames');
    if (gif.numFrames() <= 1) {
      gif = null;
    }
    image_animated_gif.set(img, [href, gif]);
    if (gif && img === last_focused_img) {
      player.enable(img, gif);
    }
  }

  function process_image(img) {
    const url = new URL(img.currentSrc);
    if (image_animated_gif.has(img)) {
      const [href, gif] = image_animated_gif.get(img);
      if (url.href === href) {
        if (gif) {
          player.enable(img, gif);
        }
        return;
      }
    }
    if (!settings.process_all_images && (url.protocol === 'data:' &&
      !url.pathname.startsWith('image/gif;') ||
      !url.pathname.endsWith('.gif'))) {
      return;
    }
    log('process', img);
    if (typeof GM.fetch === "function") {
      GM.fetch(img.currentSrc, {
        method: 'GET',
        cache: 'force-cache',
        responseType: 'arrayBuffer',
      })
        .then(r => on_image_fetched(img, url.href, copy_array(r)))
        .catch(e => console.log(img.currentSrc, e.message));
    } else {
      GM.xmlHttpRequest({
        url: url.href,
        method: 'GET',
        responseType: 'arraybuffer',
        onload: r => on_image_fetched(img, url.href, new Uint8Array(r.response)),
        onerror: r => console.log(img.currentSrc, r.statusText),
      });
    }
  }

  function on_image_loaded(evt) {
    const img = evt.target;
    img.removeEventListener('load', on_image_loaded);
    if (img !== last_focused_img) {
      return;
    }
    log('loaded', img.currentSrc);
    process_image(img);
  }

  function on_mouse_over(evt) {
    evt.stopPropagation();
    if (evt.target.nodeName !== 'IMG' || player.img === evt.target) {
      return;
    }
    last_focused_img = evt.target;
    if (last_focused_img.complete) {
      process_image(last_focused_img);
    } else {
      last_focused_img.addEventListener('load', on_image_loaded);
    }
  }

  document.body.onmouseover = on_mouse_over;

})();

// vim: expandtab sw=2
