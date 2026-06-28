// Dungeon-office color palette: warm torch-lit feel
// HUD colors
export const HUD_BG = 0x1a1210; // warm dark brown-black
export const HUD_BG_ALPHA = 0.75;

// Text colors
const TEXT_LIGHT = '#d4c5a9'; // warm parchment
export const TEXT_GOLD = '#c9a84c'; // coin gold

// Phase colors
export const DAY_PROGRESS = 0xd4a843; // amber progress bar (day)
export const NIGHT_PROGRESS = 0x5a5a9c; // purple-blue progress bar (night)
export const PROGRESS_BG = 0x2a1f1a; // dark brown progress track

// Build mode colors
export const BUILD_PANEL_BG = 0x1a1210;
export const BUILD_PANEL_ALPHA = 0.7;

// Button colors
export const BTN_BG = 0x5a4a2a; // warm brown
export const BTN_HOVER = 0x7a6a3a; // lighter warm brown
export const BTN_ACTIVE = 0x4a3a1a; // darker warm brown
export const BTN_TEXT = '#d4c5a9';
export const BTN_BORDER = 0x8a7a4a; // border highlight

// Panel colors
export const PANEL_BG = 0x1a1210;
export const PANEL_BORDER = 0x5a4a2a;
export const PANEL_TITLE_BG = 0x3a2a1a;

export const light = {
  fill: TEXT_LIGHT,
  padding: 4,
  fontSize: '14px',
  fontFamily: '"Press Start 2P", monospace',
};

// Pixel-art small text for HUD (8px since Press Start 2P doesn't go smaller well)
export const small = {
  fill: TEXT_LIGHT,
  padding: 2,
  fontSize: '8px',
  fontFamily: '"Press Start 2P", monospace',
};
