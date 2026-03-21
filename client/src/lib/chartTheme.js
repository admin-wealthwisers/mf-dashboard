const COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#f43f5e', // rose
  '#8b5cf6', // violet
  '#06b6d4', // cyan
];

const DARK_FONT = {
  family: 'JetBrains Mono, ui-monospace, monospace',
  color: '#e5e7eb',
  size: 11,
};

const LIGHT_FONT = {
  family: 'JetBrains Mono, ui-monospace, monospace',
  color: '#1a1a1a',
  size: 11,
};

const darkLayout = {
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent',
  font: DARK_FONT,
  colorway: COLORS,
  margin: { t: 8, r: 16, b: 40, l: 56 },
  xaxis: {
    gridcolor: 'rgba(229, 231, 235, 0.06)',
    linecolor: 'rgba(229, 231, 235, 0.1)',
    tickfont: DARK_FONT,
    zeroline: false,
  },
  yaxis: {
    gridcolor: 'rgba(229, 231, 235, 0.06)',
    linecolor: 'rgba(229, 231, 235, 0.1)',
    tickfont: DARK_FONT,
    zeroline: false,
  },
  legend: {
    orientation: 'h',
    yanchor: 'bottom',
    y: 1.02,
    xanchor: 'left',
    x: 0,
    font: { ...DARK_FONT, size: 10 },
    bgcolor: 'transparent',
  },
  hoverlabel: {
    bgcolor: '#1a1d2e',
    bordercolor: '#2a2d3e',
    font: { ...DARK_FONT, size: 11 },
  },
  hovermode: 'x unified',
};

const lightLayout = {
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent',
  font: LIGHT_FONT,
  colorway: COLORS,
  margin: { t: 8, r: 16, b: 40, l: 56 },
  xaxis: {
    gridcolor: 'rgba(0, 0, 0, 0.06)',
    linecolor: 'rgba(0, 0, 0, 0.1)',
    tickfont: LIGHT_FONT,
    zeroline: false,
  },
  yaxis: {
    gridcolor: 'rgba(0, 0, 0, 0.06)',
    linecolor: 'rgba(0, 0, 0, 0.1)',
    tickfont: LIGHT_FONT,
    zeroline: false,
  },
  legend: {
    orientation: 'h',
    yanchor: 'bottom',
    y: 1.02,
    xanchor: 'left',
    x: 0,
    font: { ...LIGHT_FONT, size: 10 },
    bgcolor: 'transparent',
  },
  hoverlabel: {
    bgcolor: '#ffffff',
    bordercolor: '#e0ddd4',
    font: { ...LIGHT_FONT, size: 11 },
  },
  hovermode: 'x unified',
};

const defaultConfig = {
  displayModeBar: false,
  responsive: true,
};

function getLayout(isDark = true) {
  return isDark ? darkLayout : lightLayout;
}

// Keep FONT as alias for DARK_FONT for backwards compat
export { COLORS, DARK_FONT as FONT, darkLayout, lightLayout, defaultConfig, getLayout };
