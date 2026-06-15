import { DestroyRef } from '@angular/core';
import { Chart, ChartConfiguration } from 'chart.js';

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
