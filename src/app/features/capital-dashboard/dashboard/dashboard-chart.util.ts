import { DestroyRef } from '@angular/core';
import { Chart, ChartConfiguration } from 'chart.js';

import { DASHBOARD_CHART_COLORS } from './dashboard-chart-colors';

export const DASHBOARD_CHART_FONT = {
  family: "'Open Sans', Arial, sans-serif",
  size: 10,
} as const;

export const DASHBOARD_CHART_LEGEND_FONT = {
  family: "'Open Sans', Arial, sans-serif",
  size: 11,
} as const;

const GRID_LINE = {
  color: DASHBOARD_CHART_COLORS.grid,
  lineWidth: 0.25,
  drawTicks: false,
};

const AXIS_TICKS = {
  color: DASHBOARD_CHART_COLORS.text,
  font: DASHBOARD_CHART_FONT,
  padding: 6,
};

type ChartScales = NonNullable<ChartConfiguration<'bar' | 'line'>['options']>['scales'];

export function dashboardVerticalChartScales(options: {
  yMax: number;
  yStep?: number;
  yTickCallback?: (value: string | number) => string;
}): ChartScales {
  const yStep = options.yStep ?? options.yMax / 4;

  return {
    x: {
      border: {
        display: true,
        color: DASHBOARD_CHART_COLORS.axis,
        width: 1,
      },
      grid: {
        display: false,
        drawTicks: false,
      },
      ticks: {
        ...AXIS_TICKS,
        display: true,
      },
    },
    y: {
      min: 0,
      max: options.yMax,
      beginAtZero: true,
      border: {
        display: false,
      },
      grid: {
        display: true,
        ...GRID_LINE,
        drawOnChartArea: true,
      },
      ticks: {
        ...AXIS_TICKS,
        stepSize: yStep,
        callback: options.yTickCallback,
      },
    },
  };
}

export function dashboardHorizontalBarChartScales(options: {
  xMax: number;
  xStep?: number;
  xTickCallback?: (value: string | number) => string;
}): ChartScales {
  const xStep = options.xStep ?? options.xMax / 4;

  return {
    x: {
      min: 0,
      max: options.xMax,
      border: {
        display: true,
        color: DASHBOARD_CHART_COLORS.axis,
        width: 1,
      },
      grid: {
        display: false,
        drawTicks: false,
      },
      ticks: {
        ...AXIS_TICKS,
        stepSize: xStep,
        callback: options.xTickCallback,
      },
    },
    y: {
      border: {
        display: false,
      },
      grid: {
        display: false,
        drawTicks: false,
      },
      ticks: {
        ...AXIS_TICKS,
      },
    },
  };
}

export function dashboardLegendLabels() {
  return {
    boxWidth: 10,
    boxHeight: 10,
    usePointStyle: true,
    pointStyle: 'rect' as const,
    padding: 14,
    color: DASHBOARD_CHART_COLORS.text,
    font: DASHBOARD_CHART_LEGEND_FONT,
  };
}

export function runAfterLayout(callback: () => void): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(callback);
  });
}

export function scheduleChartResize(chart: Chart | undefined): void {
  if (!chart) {
    return;
  }

  runAfterLayout(() => {
    chart.resize();
    chart.update();
  });
}

export class DashboardChartLifecycle {
  private chart?: Chart;
  private resizeObserver?: ResizeObserver;

  constructor(private readonly destroyRef: DestroyRef) {
    this.destroyRef.onDestroy(() => this.destroy());
  }

  mount(
    canvas: HTMLCanvasElement,
    container: HTMLElement,
    config: ChartConfiguration,
  ): Chart {
    this.destroy();
    this.chart = new Chart(canvas, config);
    this.resizeObserver = new ResizeObserver(() => this.refresh());
    this.resizeObserver.observe(container);
    scheduleChartResize(this.chart);
    return this.chart;
  }

  refresh(): void {
    this.chart?.resize();
    this.chart?.update();
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.chart?.destroy();
    this.chart = undefined;
  }
}
