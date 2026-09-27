// Splits design tokens for React Native. Generated from tokens.json; do not edit by hand.
// Use these where Tailwind classes can't reach: SVG fills, charts, BlurView tint, Reanimated, navigation themes.

export const palette = {
  "cream-0": "#fffcf5",
  "cream-50": "#fef6e5",
  "cream-100": "#fdf0d5",
  "cream-200": "#e4d8be",
  "cream-300": "#c8bda5",
  "cream-400": "#ada28c",
  "cream-500": "#928873",
  "cream-600": "#786f5c",
  "cream-700": "#5f5746",
  "cream-800": "#484030",
  "cream-900": "#312a1c",
  "navy-50": "#f5f7f9",
  "navy-100": "#e9edf1",
  "navy-200": "#d2dae1",
  "navy-300": "#b2c0ca",
  "navy-400": "#93a6b3",
  "navy-500": "#758d9d",
  "navy-600": "#587487",
  "navy-700": "#3c5c72",
  "navy-800": "#20455d",
  "navy-900": "#003049",
  "navy-950": "#001b2b",
  "red-50": "#fff4f3",
  "red-100": "#fee7e4",
  "red-200": "#fcccc6",
  "red-300": "#f3a79f",
  "red-400": "#e78279",
  "red-500": "#d85c54",
  "red-600": "#c1121f",
  "red-700": "#a70215",
  "red-800": "#7f000c",
  "red-900": "#580006",
  "blue-50": "#f2f8fb",
  "blue-100": "#e4eff6",
  "blue-200": "#c8dcea",
  "blue-300": "#a2c3d9",
  "blue-400": "#7caac7",
  "blue-500": "#669bbc",
  "blue-600": "#477693",
  "blue-700": "#325d77",
  "blue-800": "#1d465d",
  "blue-900": "#082f43",
  "oxblood-50": "#fcf5f4",
  "oxblood-100": "#f8e9e7",
  "oxblood-200": "#edd2cd",
  "oxblood-300": "#ddb2ab",
  "oxblood-400": "#cc9389",
  "oxblood-500": "#b97469",
  "oxblood-600": "#a6554a",
  "oxblood-700": "#91362b",
  "oxblood-800": "#780000",
  "oxblood-900": "#590000",
  "heather-50": "#f7f6fa",
  "heather-100": "#eeebf4",
  "heather-200": "#dbd6e7",
  "heather-300": "#c0b9d5",
  "heather-400": "#a79cc1",
  "heather-500": "#8e80ae",
  "heather-600": "#7a6a9e",
  "heather-700": "#5d4f7c",
  "heather-800": "#463861",
  "heather-900": "#2f2446",
  "pine-50": "#f3f8f5",
  "pine-100": "#e5f0ea",
  "pine-200": "#cadfd4",
  "pine-300": "#a5c7b5",
  "pine-400": "#81af97",
  "pine-500": "#5d987b",
  "pine-600": "#2e7d5b",
  "pine-700": "#1b6748",
  "pine-800": "#014e33",
  "pine-900": "#013521",
  "amber-50": "#fef6ea",
  "amber-100": "#fbead3",
  "amber-200": "#f4d4a5",
  "amber-300": "#e8b363",
  "amber-400": "#e0a030",
  "amber-500": "#b67c02",
  "amber-600": "#956500",
  "amber-700": "#765003",
  "amber-800": "#583a01",
  "amber-900": "#3c2600",
  "stone-50": "#fef6e5",
  "stone-100": "#f3ecdd",
  "stone-200": "#dcd9cd",
  "stone-300": "#bdbfb7",
  "stone-400": "#9fa5a1",
  "stone-500": "#828b8c",
  "stone-600": "#657277",
  "stone-700": "#4b5b63",
  "stone-800": "#304450",
  "stone-900": "#172f3c"
} as const;

export const colors = {
  light: {
    "bg": "#fdf0d5",
    "surfaceCard": "#fffcf5",
    "surfaceInset": "#fef6e5",
    "surfaceRaised": "#fffcf5",
    "surfaceControl": "#f5ead3",
    "surfaceControlPressed": "#e4d8be",
    "text": "#003049",
    "textMuted": "#4b5b63",
    "textSubtle": "#657277",
    "textDisabled": "#9fa5a1",
    "hairline": "#00304914",
    "borderControl": "#828b8c",
    "primaryFill": "#003049",
    "primaryPressed": "#001b2b",
    "onPrimary": "#fdf0d5",
    "anchorCard": "#003049",
    "onAnchor": "#fdf0d5",
    "onAnchorMuted": "#d2dae1",
    "liftFill": "#c1121f",
    "liftPressed": "#780000",
    "onLift": "#fef6e5",
    "liftText": "#c1121f",
    "liftSoft": "#fee7e4",
    "runFill": "#669bbc",
    "runPressed": "#7caac7",
    "onRun": "#003049",
    "runText": "#325d77",
    "runSoft": "#e4eff6",
    "fuelFill": "#780000",
    "fuelPressed": "#590000",
    "onFuel": "#fef6e5",
    "fuelText": "#780000",
    "fuelSoft": "#f8e9e7",
    "bodyFill": "#5d4f7c",
    "onBody": "#fef6e5",
    "bodyText": "#5d4f7c",
    "bodySoft": "#eeebf4",
    "macroProtein": "#c1121f",
    "macroCarbs": "#669bbc",
    "macroFat": "#e0a030",
    "successFill": "#2e7d5b",
    "onSuccess": "#fef6e5",
    "successText": "#1b6748",
    "successSoft": "#e5f0ea",
    "warningFill": "#e0a030",
    "onWarning": "#003049",
    "warningText": "#765003",
    "warningSoft": "#fbead3",
    "infoFill": "#3c5c72",
    "infoText": "#3c5c72",
    "infoSoft": "#e9edf1",
    "dangerFill": "#c1121f",
    "dangerPressed": "#780000",
    "onDanger": "#fef6e5",
    "dangerText": "#a70215",
    "focusRing": "#325d77",
    "glass": "#fffcf5b8",
    "glassEdge": "#ffffff99",
    "scrim": "#00182666",
    "chartGrid": "#0030491a",
    "chartTrend": "#003049",
    "track": "#0030490f"
  },
  dark: {
    "bg": "#001b2b",
    "surfaceCard": "#003049",
    "surfaceInset": "#00263b",
    "surfaceRaised": "#0a3a55",
    "surfaceControl": "#0c3b57",
    "surfaceControlPressed": "#16496a",
    "text": "#fdf0d5",
    "textMuted": "#b2c0ca",
    "textSubtle": "#93a6b3",
    "textDisabled": "#4d6b80",
    "hairline": "#fdf0d51a",
    "borderControl": "#758d9d",
    "primaryFill": "#fdf0d5",
    "primaryPressed": "#e4d8be",
    "onPrimary": "#003049",
    "anchorCard": "#fdf0d5",
    "onAnchor": "#003049",
    "onAnchorMuted": "#4b5b63",
    "liftFill": "#e78279",
    "liftPressed": "#f3a79f",
    "onLift": "#003049",
    "liftText": "#f3a79f",
    "liftSoft": "#4a0d18",
    "runFill": "#669bbc",
    "runPressed": "#7caac7",
    "onRun": "#003049",
    "runText": "#a2c3d9",
    "runSoft": "#0d3d5b",
    "fuelFill": "#edd2cd",
    "fuelPressed": "#ddb2ab",
    "onFuel": "#003049",
    "fuelText": "#edd2cd",
    "fuelSoft": "#3d1822",
    "bodyFill": "#a79cc1",
    "onBody": "#003049",
    "bodyText": "#c0b9d5",
    "bodySoft": "#2a2a4f",
    "macroProtein": "#e78279",
    "macroCarbs": "#7caac7",
    "macroFat": "#e8b363",
    "successFill": "#81af97",
    "onSuccess": "#003049",
    "successText": "#a5c7b5",
    "successSoft": "#0f3a33",
    "warningFill": "#e0a030",
    "onWarning": "#003049",
    "warningText": "#e8b363",
    "warningSoft": "#3a2f1a",
    "infoFill": "#a2c3d9",
    "infoText": "#c8dcea",
    "infoSoft": "#0c3550",
    "dangerFill": "#c1121f",
    "dangerPressed": "#780000",
    "onDanger": "#fef6e5",
    "dangerText": "#f3a79f",
    "focusRing": "#a2c3d9",
    "glass": "#001b2bb8",
    "glassEdge": "#fdf0d51f",
    "scrim": "#00000080",
    "chartGrid": "#fdf0d51a",
    "chartTrend": "#fdf0d5",
    "track": "#fdf0d514"
  },
} as const;

export type ColorScheme = keyof typeof colors;
export type ThemeColors = { [K in keyof typeof colors.light]: string };

export const space = {
  "0": 0,
  "1": 4,
  "2": 8,
  "3": 12,
  "4": 16,
  "5": 20,
  "6": 24,
  "8": 32,
  "10": 40,
  "12": 48,
  "16": 64
} as const;

export const radius = {
  "xs": 8,
  "sm": 12,
  "md": 16,
  "card": 24,
  "sheet": 28,
  "pill": 999
} as const;

export const fonts = {
  "display": "ArchivoExpanded-ExtraBold",
  "displayBold": "ArchivoExpanded-Bold",
  "body": "Archivo-Regular",
  "bodyMedium": "Archivo-Medium",
  "bodySemibold": "Archivo-SemiBold",
  "bodyBold": "Archivo-Bold"
} as const;

export const type = {
  "hero": {
    "fontFamily": "ArchivoExpanded-ExtraBold",
    "fontSize": 88,
    "lineHeight": 80,
    "letterSpacing": -2.6
  },
  "heroSm": {
    "fontFamily": "ArchivoExpanded-ExtraBold",
    "fontSize": 64,
    "lineHeight": 59,
    "letterSpacing": -1.9
  },
  "timer": {
    "fontFamily": "ArchivoExpanded-Bold",
    "fontSize": 56,
    "lineHeight": 56,
    "letterSpacing": -1.1
  },
  "display": {
    "fontFamily": "ArchivoExpanded-ExtraBold",
    "fontSize": 36,
    "lineHeight": 40,
    "letterSpacing": -0.7
  },
  "title": {
    "fontFamily": "ArchivoExpanded-Bold",
    "fontSize": 24,
    "lineHeight": 28,
    "letterSpacing": -0.2
  },
  "stat": {
    "fontFamily": "ArchivoExpanded-ExtraBold",
    "fontSize": 28,
    "lineHeight": 32,
    "letterSpacing": -0.6
  },
  "headline": {
    "fontFamily": "ArchivoExpanded-ExtraBold",
    "fontSize": 18,
    "lineHeight": 22,
    "letterSpacing": 0
  },
  "body": {
    "fontFamily": "Archivo-Regular",
    "fontSize": 17,
    "lineHeight": 24,
    "letterSpacing": 0
  },
  "subhead": {
    "fontFamily": "Archivo-Medium",
    "fontSize": 15,
    "lineHeight": 20,
    "letterSpacing": 0
  },
  "label": {
    "fontFamily": "Archivo-SemiBold",
    "fontSize": 15,
    "lineHeight": 20,
    "letterSpacing": 0
  },
  "caption": {
    "fontFamily": "Archivo-Medium",
    "fontSize": 13,
    "lineHeight": 18,
    "letterSpacing": 0
  },
  "micro": {
    "fontFamily": "Archivo-Bold",
    "fontSize": 11,
    "lineHeight": 14,
    "letterSpacing": 0.9
  }
} as const;

export const shadow = {
  light: {
    "card": "0 1px 2px #0030490a, 0 8px 24px #00304912",
    "raised": "0 2px 6px #00304914, 0 16px 40px #0030491f",
    "float": "0 6px 16px #00304926, 0 20px 40px #0030491f",
    "sheet": "0 -8px 40px #0030491f",
    "none": "none"
  },
  dark: {
    "card": "0 1px 2px #00000033, 0 8px 24px #00000040",
    "raised": "0 2px 6px #0000004d, 0 16px 40px #00000066",
    "float": "0 6px 16px #00000066, 0 20px 40px #00000066",
    "sheet": "0 -8px 40px #00000080",
    "none": "none"
  },
} as const;

export const size = {
  "iconSm": 16,
  "iconMd": 20,
  "iconLg": 24,
  "iconXl": 32,
  "touchMin": 44,
  "controlH": 52,
  "controlHSm": 44,
  "fabSize": 64,
  "tabbarH": 84
} as const;

export const blur = {
  "sm": 12,
  "md": 24,
  "lg": 40
} as const;

/** Milliseconds. */
export const duration = {
  "instant": 100,
  "fast": 180,
  "base": 280,
  "sheet": 420,
  "count": 600,
  "tick": 1000
} as const;

/** cubic-bezier control points; use with Easing.bezier(...) from react-native-reanimated. */
export const easing = {
  "standard": [
    0.2,
    0.0,
    0.0,
    1.0
  ],
  "sheet": [
    0.32,
    0.72,
    0.0,
    1.0
  ],
  "exit": [
    0.3,
    0.0,
    1.0,
    1.0
  ],
  "spring": [
    0.34,
    1.56,
    0.64,
    1.0
  ]
} as const;

export const opacity = { disabled: 0.4, planned: 0.55 } as const;
