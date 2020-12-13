// ==UserScript==
// @name     Bandcamp Volume
// @version  1.0
// @match    *://*.bandcamp.com/*
// @match    *://listen.20buckspin.com/*
// ==/UserScript==

/* global GM */

(async function() {
  'use strict';

  function add_volume_style(style) {
    let border_color, bg_color, fill_color;
    if (style === 'inline') {
      fill_color = getComputedStyle(document.querySelector('.inline_player .progbar_empty')).color;
      border_color = getComputedStyle(document.querySelector('.inline_player .progbar_empty')).borderTopColor;
      bg_color = getComputedStyle(document.querySelector('.inline_player .progbar_fill')).backgroundColor;
    }
    else if (style === 'embed') {
      fill_color = getComputedStyle(document.querySelector('.progress-bar-handle')).backgroundColor;
      border_color = getComputedStyle(document.querySelector('mplayer')).borderTopColor;
      bg_color = getComputedStyle(document.querySelector('.progress-bar-buffer')).backgroundColor;
    }
    else {
      console.log('invalid volume controls style:', style);
      return;
    }
    GM.addStyle(`
      .volume_controls.volume_disabled {
        opacity: 0;
      }

      .volume_controls.volume_embed {
        width: 55%;
        display: flex;
        flex-direction: row;
        align-items: center;
      }

      .volume_controls .volume_bar {
        height: 9px;
        cursor: pointer;
        position: relative;
        display: flex;
        align-items: center;
      }

      .volume_controls.volume_inline .volume_bar {
        margin: 0 0.83333333333333em 0;
        width: auto;
        top: 5.5px;
      }

      .volume_controls.volume_embed .volume_bar {
        width: 100%;
        margin-left: 5%;
      }

      .volume_controls .volume_bar_shell {
        box-sizing: content-box !important;
        border: 1px solid ${border_color};
        background-color: ${bg_color};
        position: relative;
        width: 100%;
        height: 3px;
        margin: 0;
      }

      .volume_controls .volume_bar_level {
        background-color: ${fill_color};
        position: absolute;
        bottom: 0;
        height: auto;
        pointer-events: none;
        top: 0;
        left: 0;
      }

      .volume_controls .volume_bar_slider {
        border: 1px solid ${border_color};
        background-color: ${fill_color};
        position: absolute;
        bottom: 0;
        width: 9px;
        height: 9px;
        top: -4px;
        margin-left: -4.5px;
        border-radius: 50%;
        opacity: 0;
      }

      .volume_controls .volume_bar:hover .volume_bar_slider,
      .volume_controls .volume_bar.volume_changing .volume_bar_slider {
        opacity: 1;
      }

      .volume_controls .volume_speaker {
        position: relative;
        border-radius: 1px;
        cursor: pointer;
        width: 20px;
        height: 20px;
      }

      mplayer .mpcontrols {
        width: 74%;
      }

      mplayer .mpcontrols .prev, mplayer .mpcontrols .next {
        width: 15%;
      }

      mplayer .mptime {
        width: 24%;
      }
    `);
    // Improve speaker icons color.
    document.getElementById('material-vol-up').firstElementChild.setAttribute('fill', fill_color);
    document.getElementById('material-vol-mute').setAttribute('fill', fill_color);
  }

  function add_volume_controls(parent_element, style, audio) {
    let template;
    if (style === 'inline') {
      template = `
        <tr class="volume_controls volume_disabled">
          <td></td>
          <td class="volume_bar">
            <div class="volume_bar_shell progbar progbar_empty">
              <span class="volume_bar_level thumb"></span>
              <span class="volume_bar_slider thumb"></span>
            </div>
          </td>
          <td>
            <svg class="volume_speaker" class="vol-icon" viewBox="0 0 24 24">
              <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#material-vol-up"></use>
            </svg>
          </td>
        </tr>
        `;
    }
    else if (style === 'embed') {
      template = `
        <span class="volume_controls volume_disabled">
          <svg class="volume_speaker" class="vol-icon" viewBox="0 0 24 24">
            <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#material-vol-up"></use>
          </svg>
          <div class="volume_bar">
            <div class="volume_bar_shell">
              <span class="volume_bar_level"></span>
              <span class="volume_bar_slider"></span>
            </div>
          </div>
        </span>
        `;
    }
    else {
      console.log('invalid volume controls style:', style);
      return;
    }
    parent_element.insertAdjacentHTML('beforeend', template);

    const controls = parent_element.querySelector('.volume_controls');
    const speaker = parent_element.querySelector('.volume_speaker');
    const speaker_icon = parent_element.querySelector('.volume_speaker use');
    const bar = parent_element.querySelector('.volume_bar');
    const bar_shell = parent_element.querySelector('.volume_bar_shell');
    const bar_level = parent_element.querySelector('.volume_bar_level');
    const bar_slider = parent_element.querySelector('.volume_bar_slider');

    controls.classList.add('volume_' + style);
    bar_level.style.width = 0;
    bar_slider.style.left = 0;

    function update_volume(value, apply_volume=true) {
      const percentage = `${Math.round(value * 100)}%`;
      bar_slider.style.left = percentage;
      bar_level.style.width = percentage;
      audio.muted = !value;
      if (apply_volume) {
        audio.volume = value;
      }
      speaker_icon.setAttribute('xlink:href', '#material-vol-' + (value ? 'up' : 'mute'));
    }

    GM.getValue('volume').then(value => {
      if (value === undefined) {
        value = audio.volume;
      }
      update_volume(value);
      controls.classList.remove('volume_disabled');
    });

    speaker.addEventListener('click', () => {
      update_volume(audio.muted ? audio.volume : 0, audio.muted);
    });

    function change(evt) {
      const bbox = bar_shell.getBoundingClientRect();
      let offset = evt.clientX - bbox.left;
      if (offset < 0) {
        offset = 0;
      }
      else if (offset > bbox.width) {
        offset = bbox.width;
      }
      update_volume(offset / bbox.width);
      evt.stopPropagation();
    }

    function change_stop(evt) {
      if (evt.button !== 0) {
        return;
      }
      document.removeEventListener('mouseup', change_stop, true);
      document.removeEventListener('mousemove', change, true);
      bar.classList.remove('volume_changing');
      GM.setValue('volume', audio.volume);
    }

    bar.addEventListener('mousedown', evt => {
      if (evt.button !== 0) {
        return;
      }
      evt.preventDefault();
      change(evt);
      document.addEventListener('mousemove', change, true);
      document.addEventListener('mouseup', change_stop, true);
      bar.classList.add('volume_changing');
    });
  }

  function on_album_page() {
    add_volume_style('inline');
    const audio = document.querySelector('audio');
    const inline_player_tbody = document.querySelector('.inline_player table tbody');
    add_volume_controls(inline_player_tbody, 'inline', audio);
  }

  function on_embeded_players() {
    add_volume_style('embed');
    const audio_list = document.querySelectorAll('audio');
    const player_controls_list = document.querySelectorAll('mplayer .mpcontrols');
    if (audio_list.length !== player_controls_list.length) {
      console.log('# embed players !== # audio streams');
      return;
    }
    for (let n = 0; n < audio_list.length; ++n) {
      add_volume_controls(player_controls_list[n], 'embed', audio_list[n]);
    }
  }

  function on_collection_page() {
    // Increase volume slider width to make it easier to control.
    GM.addStyle(`
      .carousel-player .vol-slider {
        width: 248px;
      }
    `);
    const audio = document.querySelector('audio');
    GM.getValue('volume', audio.volume).then(value => {
      window.eval(`collectionPlayer.player2.volume(${value});`);
    });
    audio.addEventListener('volumechange', () => GM.setValue('volume', audio.volume));
  }

  try
  {
    if (document.querySelector('.inline_player')) {
      on_album_page();
    }
    else if (document.querySelector('mplayer')) {
      on_embeded_players();
    }
    else {
      setTimeout(function() {
        if (window.eval(`collectionPlayer !== undefined`)) {
          on_collection_page();
        }
      }, 1000);
    }
  }
  catch (e) { console.log(`error: ${e}`); }

})();

// vim: expandtab sw=2
