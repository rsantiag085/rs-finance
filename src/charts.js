/**
 * RS Finance — Gráficos Chart.js
 */
import {
  Chart,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { formatBRL } from './data.js';

// Registrar componentes do Chart.js
Chart.register(DoughnutController, ArcElement, Tooltip, Legend, ChartDataLabels);

// Defaults globais
Chart.defaults.color = '#cbd5e1';
Chart.defaults.font.family = "'Inter', sans-serif";

// Store chart instances for cleanup
const chartInstances = {};

/**
 * Destroy all chart instances (for re-rendering)
 */
export function destroyCharts() {
  Object.keys(chartInstances).forEach(key => {
    if (chartInstances[key]) {
      chartInstances[key].destroy();
      delete chartInstances[key];
    }
  });
}

/**
 * Cria um gráfico Doughnut com labels de R$ e %
 */
export function criarGraficoDoughnut(canvasId, dados, titulo) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error(`Canvas #${canvasId} não encontrado`);
    return null;
  }

  // Destroy existing chart on this canvas
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  const ctx = canvas.getContext('2d');
  const total = dados.reduce((s, d) => s + d.valor, 0);

  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: dados.map(d => d.label),
      datasets: [{
        data: dados.map(d => d.valor),
        backgroundColor: dados.map(d => d.cor),
        borderColor: 'rgba(15, 23, 42, 0.8)',
        borderWidth: 2,
        hoverBorderColor: '#fff',
        hoverBorderWidth: 2,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      layout: {
        padding: {
          top: 30,
          bottom: 10,
          left: 10,
          right: 10,
        },
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: '#cbd5e1',
            padding: 10,
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 8,
            font: {
              size: 10,
              family: "'Inter', sans-serif",
            },
            generateLabels: function(chart) {
              const dataset = chart.data.datasets[0];
              return chart.data.labels.map((label, i) => {
                const valor = dataset.data[i];
                const pct = ((valor / total) * 100).toFixed(1);
                return {
                  text: `${label}: ${formatBRL(valor)} (${pct}%)`,
                  fillStyle: dataset.backgroundColor[i],
                  strokeStyle: dataset.backgroundColor[i],
                  hidden: false,
                  index: i,
                  pointStyle: 'circle',
                };
              });
            },
          },
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleFont: { size: 13, weight: '600', family: "'Inter', sans-serif" },
          bodyFont: { size: 12, family: "'Inter', sans-serif" },
          padding: 12,
          cornerRadius: 8,
          borderColor: 'rgba(148, 163, 184, 0.2)',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              const valor = context.parsed;
              const pct = ((valor / total) * 100).toFixed(1);
              return ` ${context.label}: ${formatBRL(valor)} (${pct}%)`;
            },
          },
        },
        datalabels: {
          color: '#fff',
          font: {
            weight: '600',
            size: 11,
            family: "'Inter', sans-serif",
          },
          formatter: (value) => {
            const pct = ((value / total) * 100).toFixed(1);
            if (pct < 5) return '';
            return `${pct}%`;
          },
          anchor: 'center',
          align: 'center',
          textShadowBlur: 4,
          textShadowColor: 'rgba(0,0,0,0.5)',
        },
      },
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1200,
        easing: 'easeOutQuart',
      },
    },
  });

  chartInstances[canvasId] = chart;
  return chart;
}

/**
 * Cria o centro text overlay para o gráfico
 */
export function criarCentroTexto(canvasId, texto, subTexto) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const container = canvas.parentElement;
  const overlay = document.createElement('div');
  overlay.className = 'chart-center-overlay';
  overlay.innerHTML = `
    <span class="chart-center-value">${texto}</span>
    <span class="chart-center-label">${subTexto}</span>
  `;
  container.style.position = 'relative';
  container.appendChild(overlay);
}
