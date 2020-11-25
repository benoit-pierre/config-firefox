// Settings. {{{

// Use DuckDuckGo as default search engine.
settings.defaultSearchEngine = 'd';

// Focus last tab on close.
settings.focusAfterClosed = 'last';

// Allign hints on the left.
settings.hintAlign = 'left';

// Wait for explicit input when there's only one hint.
settings.hintExplicit = true;

// Tweak next/previous page regexps to support French.
settings.nextLinkRegex = /\b(>>|next|suivant)\b/i;
settings.prevLinkRegex = /\b(<<|prev(ious)?|précédente?)\b/i;

// Move omnibar to the bottom.
// FIXME: disabled for now, as it screws with up/down selection.
// settings.omnibarPosition = 'bottom';

// Show current mode.
settings.showModeStatus = true;

// Disable smooth scrolling.
settings.smoothScroll = false;

// Don't steal focus on load.
settings.stealFocusOnLoad = false;

// Tweak hints characters for custom keyboard layout.
Hints.characters = 'arstqwfpzxcdgbv';

// }}}

// Key mappings. {{{

// Disable emoji completion.
iunmap(":");

// Miniflux tweaks.
unmap('m', /reader\.miniflux\.app/i);
unmap('v', /reader\.miniflux\.app/i);

// GMail tweaks.
unmap('x', /mail\.google\.com/i);
unmap('e', /mail\.google\.com/i);

// }}}

// Appearance. {{{

// Use a dark theme.
{
  // Colors (Tomorrow-Night).
  let fg = '#C5C8C6';
  let bg = '#282A2E';
  let bg_dark = '#1D1F21';
  let border = '#373B41';
  let main_fg = '#81A2BE';
  let accent_fg = '#52C196';
  let info_fg = '#AC7BBA';
  let select = '#585858';
  let standout_fg = '#E4BB24';

  // Fonts.
  let font = "'Source Code Pro', Ubuntu, sans";
  let font_size = '12';
  let font_weight = 'bold';

  // Dark hints.
  Hints.style(`border: solid 2px ${border}; color: ${standout_fg}; background: initial; background-color: ${bg_dark};`);
  Hints.style(`border: solid 2px ${border} !important; padding: 1px !important; color: ${fg} !important; background: ${bg_dark} !important;`, "text");
  Visual.style('marks', `background-color: ${standout_fg}; mix-blend-mode: hard-light;`);
  Visual.style('cursor', `background-color: ${standout_fg}; mix-blend-mode: hard-light;`);

  settings.theme = `
  /* ---------- Generic ---------- */
  .sk_theme {
  background: ${bg};
  color: ${fg};
    background-color: ${bg};
    border-color: ${border};
    font-family: ${font};
    font-size: ${font_size};
    font-weight: ${font_weight};
  }
  input {
    font-family: ${font};
    font-weight: ${font_weight};
  }
  .sk_theme tbody {
    color: ${fg};
  }
  .sk_theme input {
    color: ${fg};
  }
  /* Hints */
  #sk_hints .begin {
    color: ${accent_fg} !important;
  }
  #sk_tabs .sk_tab {
    background: ${bg_dark};
    border: 1px solid ${border};
    color: ${fg};
  }
  #sk_tabs .sk_tab_hint {
    background: ${bg};
    border: 1px solid ${border};
    color: ${accent_fg};
  }
  .sk_theme #sk_frame {
    background: ${bg};
    opacity: 0.2;
    color: ${accent_fg};
  }
  /* ---------- Omnibar ---------- */
  /* Uncomment this and use settings.omnibarPosition = 'bottom' for Pentadactyl/Tridactyl style bottom bar */
  /* .sk_theme#sk_omnibar {
    width: 100%;
    left: 0;
  } */
  .sk_theme .title {
    color: ${accent_fg};
  }
  .sk_theme .url {
    color: ${main_fg};
  }
  .sk_theme .annotation {
    color: ${accent_fg};
  }
  .sk_theme .omnibar_highlight {
    color: ${accent_fg};
  }
  .sk_theme .omnibar_timestamp {
    color: ${info_fg};
  }
  .sk_theme .omnibar_visitcount {
    color: ${accent_fg};
  }
  .sk_theme #sk_omnibarSearchResult ul li:nth-child(odd) {
    background: ${bg_dark};
  }
  .sk_theme #sk_omnibarSearchResult ul li.focused {
    background: ${border};
  }
  .sk_theme #sk_omnibarSearchArea {
    border-top-color: ${border};
    border-bottom-color: ${border};
  }
  .sk_theme #sk_omnibarSearchArea input,
  .sk_theme #sk_omnibarSearchArea span {
    font-size: ${font_size};
  }
  .sk_theme .separator {
    color: ${accent_fg};
  }
  /* ---------- Popup Notification Banner ---------- */
  #sk_banner {
    font-family: ${font};
    font-size: ${font_size};
    font-weight: ${font_weight};
    background: ${bg};
    border-color: ${border};
    color: ${fg};
    opacity: 0.9;
  }
  /* ---------- Popup Keys ---------- */
  #sk_keystroke {
    background-color: ${bg};
  }
  .sk_theme kbd .candidates {
    color: ${info_fg};
  }
  .sk_theme span.annotation {
    color: ${accent_fg};
  }
  /* ---------- Popup Translation Bubble ---------- */
  #sk_bubble {
    background-color: ${bg} !important;
    color: ${fg} !important;
    border-color: ${border} !important;
  }
  #sk_bubble * {
    color: ${fg} !important;
  }
  #sk_bubble div.sk_arrow div:nth-of-type(1) {
    border-top-color: ${border} !important;
    border-bottom-color: ${border} !important;
  }
  #sk_bubble div.sk_arrow div:nth-of-type(2) {
    border-top-color: ${bg} !important;
    border-bottom-color: ${bg} !important;
  }
  /* ---------- Search ---------- */
  #sk_status,
  #sk_find {
    font-size: ${font_size};
    border-color: ${border};
  }
  .sk_theme kbd {
    background: ${bg_dark};
    border-color: ${border};
    box-shadow: none;
    color: ${fg};
  }
  .sk_theme .feature_name span {
    color: ${main_fg};
  }
  /* ---------- ACE Editor ---------- */
  #sk_editor {
    background: ${bg_dark} !important;
    height: 50% !important;
    /* Remove this to restore the default editor size */
  }
  .ace_dialog-bottom {
    border-top: 1px solid ${bg} !important;
  }
  .ace-chrome .ace_print-margin,
  .ace_gutter,
  .ace_gutter-cell,
  .ace_dialog {
    background: ${bg} !important;
  }
  .ace-chrome {
    color: ${fg} !important;
  }
  .ace_gutter,
  .ace_dialog {
    color: ${fg} !important;
  }
  .ace_cursor {
    color: ${fg} !important;
  }
  .normal-mode .ace_cursor {
    background-color: ${fg} !important;
    border: ${fg} !important;
    opacity: 0.7 !important;
  }
  .ace_marker-layer .ace_selection {
    background: ${select} !important;
  }
  .ace_editor,
  .ace_dialog span,
  .ace_dialog input {
    font-family: ${font};
    font-size: ${font_size};
    font-weight: ${font_weight};
  }
  `;
}

// }}}

// vim: sw=2 foldmethod=marker
