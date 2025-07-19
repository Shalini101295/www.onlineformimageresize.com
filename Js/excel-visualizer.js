// Enhanced Excel Visualizer with Multi-Column Chart Comparison

// Global variables - accessible to enhanced upload system
window.excelData = [];
let filterableColumns = [];
const colorPreferences = {};
const chartRegistry = {};
window.allColumns = [];


const chartThemes = {
  default: () => randomColor(),
  pastel: () => randomChoice(['#AEC6CF', '#FFB347', '#77DD77', '#FF6961', '#CB99C9', '#FFD700']),
  neon: () => randomChoice(['#FF6EC7', '#39FF14', '#FF3131', '#00FFFF', '#FF00FF', '#FFFF00']),
  dark: () => randomChoice(['#444', '#666', '#888', '#AAA', '#BBB', '#CCC'])
};

$(document).ready(function () {
  // Check if user is logged in and project is selected
  checkProjectAccess();
  
  loadSavedColors();
  
  // Only setup old file upload if enhanced upload is not available
  if (typeof initializeEnhancedUpload !== 'function') {
    setupFileUpload();
  }
  
  setupFilterLoader();
  setupChartGenerator();
  setupChartTypeSwitcher();
  setupPNGDownloader();
  setupSegmentColorUpdater();
  setupFilterListener();
  setupPPTExporter();
  setupMultiColumnToggle();
  setupThemeSelector();
  setupProjectNavigation();
  
  // Load current project if available
  loadCurrentProject();
});

function loadSavedColors() {
  const savedColors = localStorage.getItem('chartColors');
  if (savedColors) Object.assign(colorPreferences, JSON.parse(savedColors));
}

function setupFileUpload() {
  $('#excelFile').on('change', function (e) {
    const file = e.target.files[0];
    const excelFileName = file.name;
    const reader = new FileReader();
    reader.onload = function (event) {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
              window.excelData = XLSX.utils.sheet_to_json(sheet);
        if (window.excelData.length > 0) {
          window.allColumns = Object.keys(window.excelData[0]);
          populateColumnSelectors(window.allColumns);
        loadSettingsForFile(excelFileName); // 👈 Auto-load settings if available
        
        // Show the filter and column sections
        $('.filter-section').show();
        $('#columnsContainer').show();
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

function populateColumnSelectors(columns) {
  $('#filterColumnSelect').html(`<select id="filterColumns" multiple></select>`);
  columns.forEach(col => $('#filterColumns').append(`<option value="${col}">${col}</option>`));
  $('#columnSelect').empty();
  columns.forEach(col => $('#columnSelect').append(`<option value="${col}">${col}</option>`));
  $('#columnsContainer').show();
}

function setupFilterLoader() {
  $('#loadFilters').click(function () {
    filterableColumns = $('#filterColumns').val();
    if (!filterableColumns || filterableColumns.length === 0) return alert('Select at least one column to filter.');

    $('#filterOptions').empty();
    filterableColumns.forEach(col => {
      const values = [...new Set(window.excelData.map(row => row[col]))];
      const filterId = `filter-${col.replace(/\s+/g, '_')}`;

      let html = `<div><strong>${col}</strong><br>`;
      values.forEach(val => html += `<label><input type="checkbox" name="${filterId}" value="${val}" checked> ${val}</label><br>`);
      html += `</div><hr>`;
      $('#filterOptions').append(html);
    });
  });
}

function saveCurrentSettings(excelFileName) {
  const uniqueCharts = {};

  Object.entries(chartRegistry).forEach(([canvasId, chart]) => {
    if (!chart || !chart.config) return;

    uniqueCharts[canvasId] = {
      chartId: canvasId,
      type: chart.config.type,
      dataLabels: chart.data.labels,
      dataset: chart.data.datasets,
      options: chart.config.options
    };
  });

  const settings = {
    fileName: excelFileName,
    charts: Object.values(uniqueCharts)
  };

  localStorage.setItem(`chartConfig_${excelFileName}`, JSON.stringify(settings));
}



function loadSettingsForFile(excelFileName) {
  const saved = localStorage.getItem(`chartConfig_${excelFileName}`);
  if (!saved) return;

  const settings = JSON.parse(saved);
  const chartList = settings.charts;

  const globalChartColumns = new Set(); // For #columnSelect
  const multiColumnConfigs = [];

  // First: collect columns
  chartList.forEach(chartConfig => {
    const datasets = chartConfig.dataset;
    const baseColumn = datasets[0]?.label;
    if (baseColumn) globalChartColumns.add(baseColumn);

    if (datasets.length > 1) {
      const multiCols = datasets.map(d => d.label);
      multiColumnConfigs.push({
        chartId: chartConfig.chartId,
        type: chartConfig.type,
        dataLabels: chartConfig.dataLabels,
        datasets: chartConfig.dataset,
        options: chartConfig.options,
        baseColumn,
        multiCols
      });
    }
  });

  // STEP 1: Select all base chart columns (used in single and multi-column)
  $('#columnSelect').val(Array.from(globalChartColumns)).trigger('change');
  //$('#chartsWrapper').empty();
  $('#generateChart').click();

  // STEP 2: After charts generate, apply chart settings
  setTimeout(() => {
    chartList.forEach(chartConfig => {
      const { chartId, type, dataLabels, dataset, options } = chartConfig;
      if (dataset.length > 1) return; // skip multi-column here

      const canvas = document.getElementById(chartId);
      if (!canvas) return;

      const baseColumn = dataset[0]?.label;
      const chartTypeDropdown = $(`.chart-type[data-target="${chartId}"]`);
      chartTypeDropdown.val(type).trigger('change');
      renderSingleChart(chartId, type, dataLabels, dataset[0].data, baseColumn);
    });
  }, 700);

// STEP 3: After another delay, apply multi-column settings (incl. pie/doughnut)

setTimeout(() => {
  multiColumnConfigs.forEach(cfg => {
    const { chartId, type, multiCols } = cfg;

    const $multiToggle = $(`.multi-column-checkbox[data-target="${chartId}"]`);
    const $multiSelect = $(`.multi-column-select[data-target="${chartId}"]`);
    const $chartType = $(`.chart-type[data-target="${chartId}"]`);

    if (!$multiToggle.length || !$multiSelect.length || !$chartType.length) return;

    // ✅ Enable Multi-Column Mode
    $multiToggle.prop('checked', true);
    const controlsDiv = $(`#${chartId}-canvas-multi-controls`);
    if (controlsDiv) controlsDiv.show();

    // ✅ Set chart type
    $chartType.val(type);

    setTimeout(() => {
      $multiSelect.val(multiCols).trigger('change');

      // ✅ Trigger render directly for pie/doughnut
      const filteredData = applyFilters();
      renderMultiColumnChart(chartId, type, multiCols, filteredData);
    }, 400);
  });
}, 1200);


}








function setupChartGenerator() {
  $('#generateChart').click(function () {
    const selectedColumns = $('#columnSelect').val();
    if (!selectedColumns || selectedColumns.length === 0) return alert('Select at least one column to chart.');

    const filteredData = applyFilters();

    // ✅ Instead of emptying everything, only build missing charts
    selectedColumns.forEach(col => {
      const canvasId = `chart-${col.replace(/\s+/g, '_')}-canvas`;
      if (!document.getElementById(canvasId)) {
        buildChart(col, filteredData);
      }
    });

    // Don't reload settings here — it's for file load only
    // loadSettingsForFile(excelFileName); ❌ Remove this
  });
}


$('#saveSettingsBtn').click(function () {
  const fileInput = document.getElementById("excelFile");
  if (fileInput && fileInput.files.length > 0) {
    const fileName = fileInput.files[0].name;
    saveCurrentSettings(fileName);
    alert("Settings saved for " + fileName);
  }
});



function applyFilters() {
  return window.excelData.filter(row => {
    return filterableColumns.every(col => {
      const filterId = `filter-${col.replace(/\s+/g, '_')}`;
      const checked = $(`input[name="${filterId}"]:checked`).map(function () {
        return $(this).val();
      }).get();
      return checked.includes(String(row[col]));
    });
  });
}

function buildChart(col, filteredData) {
  const chartId = `chart-${col.replace(/\s+/g, '_')}`;
  const canvasId = `${chartId}-canvas`;
  const colData = getColumnCounts(filteredData, col);

  $('#chartsWrapper').append(`
    <div class="chart-box">
      <h4>${col}</h4>
      <div class="chart-controls">
        <label>Chart Type:
          <select class="chart-type" data-target="${canvasId}" data-column="${col}" id="${chartId}-type">
            <option value="bar">Bar</option>
            <option value="horizontal-bar">Horizontal Bar</option>
            <option value="line">Line</option>
            <option value="area">Area</option>
            <option value="stacked">Stacked Bar</option>
            <option value="pie">Pie</option>
            <option value="doughnut">Doughnut</option>
            <option value="radar">Radar</option>
            <option value="scatter">Scatter</option>
            <option value="bubble">Bubble</option>
          </select>
        </label>
        <label class="color-control">Color: 
          <input type="color" class="color-picker" data-target="${canvasId}" value="#4bc0c0">
        </label>
      </div>
      <canvas id="${canvasId}"></canvas>
      <div class="chart-actions">
        <button class="download-png" data-target="${canvasId}">Download PNG</button>
        <label class="multi-column-toggle">
          <input type="checkbox" class="multi-column-checkbox" data-target="${canvasId}" data-column="${col}">
          Multi-Column Mode
        </label>
      </div>
      <div class="multi-column-controls" id="${canvasId}-multi-controls" style="display: none;">
        <label>Select Columns:
          <select class="multi-column-select" data-target="${canvasId}" multiple></select>
        </label>
        <button class="update-multi-chart" data-target="${canvasId}">Update Chart</button>
      </div>
    </div>`);

  // Populate multi-column dropdown
  const multiSelect = $(`.multi-column-select[data-target="${canvasId}"]`);
  allColumns.forEach(column => {
    multiSelect.append(`<option value="${column}">${column}</option>`);
  });

  renderSingleChart(canvasId, 'bar', Object.keys(colData), Object.values(colData), col);
}

function setupChartTypeSwitcher() {
  $(document).on('change', '.chart-type', function () {
    const newType = $(this).val();
    const canvasId = $(this).data('target');
    const col = $(this).data('column');
    
    // Check if multi-column mode is enabled
    const isMultiColumn = $(`.multi-column-checkbox[data-target="${canvasId}"]`).is(':checked');
    
    if (isMultiColumn) {
      updateMultiColumnChart(canvasId);
    } else {
      const colData = getColumnCounts(applyFilters(), col);
      renderSingleChart(canvasId, newType, Object.keys(colData), Object.values(colData), col);
    }
  });
}

function setupPNGDownloader() {
  $(document).on('click', '.download-png', function () {
    const canvas = document.getElementById($(this).data('target'));
    const link = document.createElement('a');
    link.download = `${canvas.id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
}

function setupFilterListener() {
  $(document).on('change', '#filterOptions input[type="checkbox"]', updateChartsFromFilters);
}

function updateChartsFromFilters() {
  const selectedColumns = $('#columnSelect').val();
  if (!selectedColumns || selectedColumns.length === 0) return;

  const filteredData = applyFilters();
  selectedColumns.forEach(col => {
    const canvasId = `chart-${col.replace(/\s+/g, '_')}-canvas`;
    const isMultiColumn = $(`.multi-column-checkbox[data-target="${canvasId}"]`).is(':checked');
    
    if (isMultiColumn) {
      updateMultiColumnChart(canvasId);
    } else {
      const colData = getColumnCounts(filteredData, col);
      const chartType = $(`select.chart-type[data-target="${canvasId}"]`).val();
      renderSingleChart(canvasId, chartType, Object.keys(colData), Object.values(colData), col);
    }
  });
}

function setupSegmentColorUpdater() {
  $(document).on('input', '.segment-color-picker', function () {
    const canvasId = $(this).data('canvas');
    const index = $(this).data('index');
    const newColor = $(this).val();
    const chart = chartRegistry[canvasId];

    if (!chart) return;

    const isStacked = chart.data.datasets.length > 1;
    const label = isStacked
      ? chart.data.datasets[index].label
      : chart.data.labels[index];
    const columnLabel = chart.data.datasets[0].label;

    // Save color
    if (!colorPreferences[columnLabel]) colorPreferences[columnLabel] = {};
    colorPreferences[columnLabel][label] = newColor;

    // Apply color
    if (isStacked) {
      chart.data.datasets[index].backgroundColor = newColor;
    } else {
      chart.data.datasets[0].backgroundColor[index] = newColor;
    }

    chart.update();
    localStorage.setItem('chartColors', JSON.stringify(colorPreferences));
  });
}

function setupMultiColumnToggle() {
  $(document).on('change', '.multi-column-checkbox', function () {
    const canvasId = $(this).data('target');
    const isChecked = $(this).is(':checked');
    const controlsDiv = $(`#${canvasId}-multi-controls`);
    
    if (isChecked) {
      controlsDiv.show();
    } else {
      controlsDiv.hide();
      
      // Restore original canvas and hide multi-pie container
      const originalCanvas = document.getElementById(canvasId);
      const multiPieContainer = document.getElementById(`${canvasId}-multi-pie`);
      
      if (multiPieContainer) {
        multiPieContainer.style.display = 'none';
      }
      
      if (originalCanvas) {
        originalCanvas.style.display = 'block';
      }
      
      // Revert to single column mode
      const originalColumn = $(this).data('column');
      const colData = getColumnCounts(applyFilters(), originalColumn);
      const chartType = $(`select.chart-type[data-target="${canvasId}"]`).val();
      renderSingleChart(canvasId, chartType, Object.keys(colData), Object.values(colData), originalColumn);
    }
  });
  
  $(document).on('click', '.update-multi-chart', function () {
    const canvasId = $(this).data('target');
    updateMultiColumnChart(canvasId);
  });
}

function updateMultiColumnChart(canvasId) {
  const selectedColumns = $(`.multi-column-select[data-target="${canvasId}"]`).val();
  if (!selectedColumns || selectedColumns.length === 0) {
    alert('Please select at least one column for multi-column mode.');
    return;
  }
  
  const chartType = $(`select.chart-type[data-target="${canvasId}"]`).val();
  const filteredData = applyFilters();
  
  renderMultiColumnChart(canvasId, chartType, selectedColumns, filteredData);
}

function renderMultiColumnChart(canvasId, type, columns, data) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  if (chartRegistry[canvasId]) chartRegistry[canvasId].destroy();

  // Show original canvas and hide multi-pie container for non-pie charts
  const originalCanvas = document.getElementById(canvasId);
  const multiPieContainer = document.getElementById(`${canvasId}-multi-pie`);
  
  if (type === 'pie' || type === 'doughnut') {
    // Hide original canvas for pie charts
    originalCanvas.style.display = 'none';
    renderMultiColumnPieCharts(canvasId, type, columns, data);
    return;
  } else {
    // Show original canvas for non-pie charts
    originalCanvas.style.display = 'block';
    if (multiPieContainer) {
      multiPieContainer.style.display = 'none';
    }
  }

  // Get all unique values across all selected columns to create consistent labels
  const allValues = new Set();
  columns.forEach(col => {
    data.forEach(row => {
      if (row[col] !== undefined && row[col] !== null) {
        allValues.add(String(row[col]));
      }
    });
  });
  
  const labels = Array.from(allValues).sort();
  const datasets = [];
  
  columns.forEach((col, index) => {
    const colData = getColumnCounts(data, col);
    const color = getThemeColor(index);
    
    // Map the column data to match the consistent labels
    const mappedData = labels.map(label => colData[label] || 0);
    
    let chartType = type;
    if (type === 'horizontal-bar') chartType = 'bar';
    if (type === 'stacked') chartType = 'bar';
    if (type === 'area') chartType = 'line';
    
    let dataset;
if (type === 'scatter' || type === 'bubble') {
  dataset = {
    label: col,
    data: mappedData.map((val, i) => ({
      x: i,
      y: val,
      ...(type === 'bubble' ? { r: Math.sqrt(val) * 2 } : {})
    })),
    backgroundColor: color,
    borderColor: color
  };
} else {
  dataset = {
    label: col,
    data: mappedData,
    backgroundColor: color,
    borderColor: color,
    borderWidth: 1
  };

  if (type === 'area') {
    dataset.fill = true;
    dataset.backgroundColor = color + '40';
  }

  if (type === 'line' || type === 'area') {
    dataset.tension = 0.4;
  }
}

    
    if (type === 'area') {
      dataset.fill = true;
      dataset.backgroundColor = color + '40'; // Add transparency
    }
    
    if (type === 'line' || type === 'area') {
      dataset.tension = 0.4;
    }
    
    datasets.push(dataset);
  });
  
  const options = buildChartOptions(type, `Multi-Column Comparison`, labels);
  
  if (type === 'stacked') {
    options.scales = {
      x: { stacked: true },
      y: { stacked: true }
    };
  }
  
  if (type === 'horizontal-bar') {
    options.indexAxis = 'y';
  }
  
  let finalChartType = type;
  if (type === 'horizontal-bar') finalChartType = 'bar';
  if (type === 'stacked') finalChartType = 'bar';
  if (type === 'area') finalChartType = 'line';
  
  chartRegistry[canvasId] = new Chart(ctx, {
    type: finalChartType,
    data: {
      labels: labels,
      datasets: datasets
    },
    options: options
  });
  
  renderMultiColumnOverview(canvasId, columns, data);
  const fileInput = document.getElementById("excelFile");
  if (fileInput && fileInput.files.length > 0) {
    const fileName = fileInput.files[0].name;
    saveCurrentSettings(fileName);
  }
}

function renderMultiColumnOverview(canvasId, columns, data) {
  // Get all unique segment labels across all columns
  const allSegments = new Set();
  const columnData = {};
  
  columns.forEach(col => {
    columnData[col] = getColumnCounts(data, col);
    Object.keys(columnData[col]).forEach(segment => allSegments.add(segment));
  });
  
  const segments = Array.from(allSegments).sort();
  
  let html = `<div class="multi-column-overview" style="text-align: left; font-size: 10px; color: #444; margin-top: 5px;">`;
  html += `<strong>Multi-Column Comparison Summary:</strong><br>`;
  
  // Create grid table
  html += `<table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10px;">`;
  
  // Header row
  html += `<tr style="background: #f0f8ff; font-weight: bold;">`;
  html += `<td style="border: 1px solid #ddd; padding: 4px;">Column</td>`;
  segments.forEach(segment => {
    html += `<td style="border: 1px solid #ddd; padding: 4px; text-align: center;">${segment}</td>`;
  });
  html += `<td style="border: 1px solid #ddd; padding: 4px; text-align: center;">Total</td>`;
  html += `</tr>`;
  
  // Data rows
  columns.forEach(col => {
    html += `<tr>`;
    html += `<td style="border: 1px solid #ddd; padding: 4px; font-weight: bold;">${col}</td>`;
    
    let total = 0;
    segments.forEach(segment => {
      const count = columnData[col][segment] || 0;
      total += count;
      html += `<td style="border: 1px solid #ddd; padding: 4px; text-align: center;">${count}</td>`;
    });
    
    html += `<td style="border: 1px solid #ddd; padding: 4px; text-align: center; font-weight: bold;">${total}</td>`;
    html += `</tr>`;
  });
  
  html += `</table>`;
  html += `</div>`;
  
  const chartBox = document.getElementById(canvasId).parentElement;
  const overviewId = `${canvasId}-overview`;
  
  let overview = document.getElementById(overviewId);
  if (!overview) {
    overview = document.createElement('div');
    overview.id = overviewId;
    overview.style.marginTop = '10px';
    chartBox.appendChild(overview);
  }
  
  overview.innerHTML = html;
  
}

function renderMultiColumnPieCharts(canvasId, type, columns, data) {
  // Get all unique segments across all columns to create consistent color mapping
  const allSegments = new Set();
  const columnData = {};
  
  columns.forEach(col => {
    columnData[col] = getColumnCounts(data, col);
    Object.keys(columnData[col]).forEach(segment => allSegments.add(segment));
  });
  
  const segments = Array.from(allSegments).sort();
  
  // Create consistent color mapping for all segments
  const segmentColors = {};
  segments.forEach((segment, index) => {
    segmentColors[segment] = getThemeColor(index);
  });
  
  // Clear the original canvas and create container for multiple charts
  const originalCanvas = document.getElementById(canvasId);
  const chartBox = originalCanvas.parentElement;
  
  // Hide original canvas
  originalCanvas.style.display = 'none';
  
  // Create or update multi-pie container
  let multiPieContainer = document.getElementById(`${canvasId}-multi-pie`);
  if (!multiPieContainer) {
    multiPieContainer = document.createElement('div');
    multiPieContainer.id = `${canvasId}-multi-pie`;
    multiPieContainer.className = 'multi-pie-container';
    chartBox.insertBefore(multiPieContainer, originalCanvas);
  } else {
    multiPieContainer.innerHTML = ''; // Clear existing charts
  }
  
  // Create individual charts for each column
  columns.forEach((col, colIndex) => {
    const colData = columnData[col];
    const chartLabels = Object.keys(colData);
    const chartValues = Object.values(colData);
    
    // Create colors array matching the segments
    const colors = chartLabels.map(label => segmentColors[label]);
    
    // Create container for this chart
    const chartContainer = document.createElement('div');
    chartContainer.className = 'multi-pie-chart';
    
    // Add title
    const title = document.createElement('h5');
    title.textContent = col;
    chartContainer.appendChild(title);
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.id = `${canvasId}-${colIndex}`;

    chartContainer.appendChild(canvas);
    
    multiPieContainer.appendChild(chartContainer);
    
    // Create chart
    const ctx = canvas.getContext('2d');
    const chart = new Chart(ctx, {
      type: type,
      data: {
        labels: chartLabels,
        datasets: [{
          data: chartValues,
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: false
          },
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              fontSize: 10,
              boxWidth: 12
            }
          }
        }
      }
    });
    
    // Store chart reference
    chartRegistry[`${canvasId}-${colIndex}`] = chart;
  });
  
  // Store main chart reference as null since we're using multiple charts
  chartRegistry[canvasId] = null;
  
  // Render the updated overview
  renderMultiColumnOverview(canvasId, columns, data);
}

function setupPPTExporter() {
  $('#exportPPT').click(function () {
    const pptx = new PptxGenJS();
    const selectedColumns = $('#columnSelect').val();
    if (!selectedColumns || selectedColumns.length === 0) return alert("Select columns to export.");

    selectedColumns.forEach(col => {
      const canvasId = `chart-${col.replace(/\s+/g, '_')}-canvas`;
      const isMultiColumn = $(`.multi-column-checkbox[data-target="${canvasId}"]`).is(':checked');
      const filterSummary = getFilterSummary();
      
      const slide = pptx.addSlide();
      slide.addText(col, { x: 0.5, y: 0.3, fontSize: 18, bold: true });
      slide.addText(filterSummary, { x: 0.5, y: 0.6, w: 7, fontSize: 12, color: "666666", italic: true });
      
      if (isMultiColumn) {
        const selectedMultiCols = $(`.multi-column-select[data-target="${canvasId}"]`).val();
        const chartType = $(`select.chart-type[data-target="${canvasId}"]`).val();
        
        if (chartType === 'pie' || chartType === 'doughnut') {
          // Handle multi-pie charts - capture the entire container
          const multiPieContainer = document.getElementById(`${canvasId}-multi-pie`);
          if (multiPieContainer) {
            // Create a temporary canvas to capture the multi-pie layout
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 800;
            tempCanvas.height = 600;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Draw white background
            tempCtx.fillStyle = 'white';
            tempCtx.fillRect(0, 0, 800, 600);
            
            // Draw title
            tempCtx.fillStyle = 'black';
            tempCtx.font = '16px Arial';
            tempCtx.textAlign = 'center';
            tempCtx.fillText(`Multi-Column ${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Charts`, 400, 30);
            
            // Draw individual pie charts
            const pieCharts = multiPieContainer.querySelectorAll('canvas');
            let x = 50, y = 60;
            const chartWidth = 200;
            const chartHeight = 200;
            const cols = Math.min(3, pieCharts.length);
            
            pieCharts.forEach((canvas, index) => {
              if (index > 0 && index % cols === 0) {
                x = 50;
                y += chartHeight + 80;
              }
              
              // Draw column title
              tempCtx.fillStyle = 'black';
              tempCtx.font = '14px Arial';
              tempCtx.textAlign = 'center';
              const columnTitle = selectedMultiCols[index];
              tempCtx.fillText(columnTitle, x + chartWidth/2, y - 10);
              
              // Draw the pie chart
              tempCtx.drawImage(canvas, x, y, chartWidth, chartHeight);
              
              x += chartWidth + 50;
            });
            
            slide.addImage({ data: tempCanvas.toDataURL("image/png"), x: 0.5, y: 1.0, w: 8, h: 6 });
          }
        } else {
          // Handle regular multi-column charts
          const canvas = document.getElementById(canvasId);
          if (canvas) {
            slide.addImage({ data: canvas.toDataURL("image/png"), x: 0.5, y: 1.0, w: 8, h: 4 });
          }
        }
        
        // Add multi-column summary table
        const overviewElement = document.getElementById(`${canvasId}-overview`);
        if (overviewElement) {
          const summaryTable = overviewElement.querySelector('.multi-column-overview table');
          if (summaryTable) {
            const tableRows = Array.from(summaryTable.querySelectorAll('tr'));
            const tableData = tableRows.map(row => {
              return Array.from(row.querySelectorAll('td, th')).map(cell => ({
                text: cell.textContent.trim(),
                options: { 
                  fontSize: 10,
                  bold: cell.tagName === 'TH',
                  color: cell.tagName === 'TH' ? "0c5460" : "000000"
                }
              }));
            });
            
            if (tableData.length > 0) {
              slide.addTable(tableData, { 
                x: 0.5, 
                y: chartType === 'pie' || chartType === 'doughnut' ? 7.2 : 5.2, 
                w: 8, 
                fontSize: 10,
                border: { pt: 1, color: "cccccc" },
                fill: { color: "f8f9fa" }
              });
            }
          }
        }
        
        // Add multi-column details
        const details = `Multi-Column Chart comparing: ${selectedMultiCols.join(', ')}`;
        slide.addText(details, { 
          x: 0.5, 
          y: chartType === 'pie' || chartType === 'doughnut' ? 7.8 : 5.8, 
          w: 8, 
          fontSize: 12, 
          color: "363636", 
          align: "left" 
        });
        
      } else {
        // Handle single column charts
        const canvas = document.getElementById(canvasId);
        const chart = chartRegistry[canvasId];
        
        if (canvas && chart) {
          slide.addImage({ data: canvas.toDataURL("image/png"), x: 0.5, y: 1.0, w: 8, h: 4 });
          
          // Add single chart details
          const labels = chart?.data?.labels || [];
          const data = chart?.data?.datasets[0]?.data || [];
          const total = data.reduce((sum, val) => sum + (typeof val === 'number' ? val : val.y || 0), 0);
          const details = labels.map((label, i) => {
            const val = data[i]?.y ?? data[i];
            const percent = total ? ((val / total) * 100).toFixed(1) : 0;
            return `${label}: ${val} (${percent}%)`;
          }).join("\n");
          
          slide.addText(details, { 
            x: 0.5, 
            y: 5.2, 
            w: 8, 
            h: 2, 
            fontSize: 12, 
            color: "363636", 
            align: "left", 
            lineSpacingMultiple: 1.2 
          });
        }
      }
    });

    pptx.writeFile("Excel_Visualizer_Report.pptx");
  });
}

function setupThemeSelector() {
  $('#themeSelect').on('change', function () {
    // Theme change will be handled by existing color system
    updateAllCharts();
  });
}

function updateAllCharts() {
  const selectedColumns = $('#columnSelect').val();
  if (!selectedColumns || selectedColumns.length === 0) return;

  selectedColumns.forEach(col => {
    const canvasId = `chart-${col.replace(/\s+/g, '_')}-canvas`;
    const isMultiColumn = $(`.multi-column-checkbox[data-target="${canvasId}"]`).is(':checked');
    
    if (isMultiColumn) {
      updateMultiColumnChart(canvasId);
    } else {
      const colData = getColumnCounts(applyFilters(), col);
      const chartType = $(`select.chart-type[data-target="${canvasId}"]`).val();
      renderSingleChart(canvasId, chartType, Object.keys(colData), Object.values(colData), col);
    }
  });
}

function renderSingleChart(canvasId, type, labels, data, columnLabel) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  if (chartRegistry[canvasId]) chartRegistry[canvasId].destroy();

  let chartType = type;
  if (type === 'horizontal-bar') chartType = 'bar';
  if (type === 'stacked') chartType = 'bar';
  if (type === 'area') chartType = 'line';

  const isSegmented = ['pie', 'doughnut', 'radar'].includes(type);
  const isLine = ['line', 'area'].includes(type);
  const isStacked = type === 'stacked';
  const isBubbleOrScatter = ['bubble', 'scatter'].includes(type);
  const userColor = getUserColor(canvasId, labels, columnLabel, isSegmented);

  const finalLabels = isStacked ? ['Total'] : labels;
  const options = buildChartOptions(type, columnLabel, labels);
  const datasets = buildDatasets(type, labels, data, userColor, columnLabel);

  if (['bar', 'stacked', 'horizontal-bar'].includes(type)) {
    document.getElementById(canvasId).height = 300;
    if (type === 'horizontal-bar') options.indexAxis = 'y';
  }

  if (isSegmented || type === 'stacked') {
    renderSegmentLegend(canvasId, labels);
  }

  chartRegistry[canvasId] = new Chart(ctx, {
    type: chartType,
    data: {
      labels: isBubbleOrScatter ? labels : finalLabels,
      datasets
    },
    options
  });
  
  if (!isBubbleOrScatter) renderChartOverview(canvasId, labels, data, columnLabel);
  if (isSegmented) renderSegmentLegend(canvasId, labels);
  const fileInput = document.getElementById("excelFile");
  if (fileInput && fileInput.files.length > 0) {
    const fileName = fileInput.files[0].name;
	
    saveCurrentSettings(fileName);
  }
}

function buildChartOptions(type, label, labels = []) {
  const options = {
    responsive: true,
    plugins: {
      title: { display: true, text: `${type.toUpperCase()} Chart - ${label}` },
      tooltip: {
        callbacks: {
          label: function (ctx) {
            if (['scatter', 'bubble'].includes(type)) {
              const item = ctx.raw;
              const segmentLabel = item.label || `Point ${ctx.dataIndex + 1}`;
              return `${ctx.dataset.label} - ${segmentLabel}: x=${item.x}, y=${item.y}` + (item.r ? `, r=${item.r.toFixed(1)}` : '');
            }
            const datasetLabel = ctx.dataset.label || '';
            const value = ctx.raw;
            return `${datasetLabel}: ${value}`;
          }
        }
      }
    },
    scales: {}
  };

  if (['line', 'area', 'bar', 'horizontal-bar'].includes(type)) {
    options.scales.y = { beginAtZero: true };
  }
  if (type === 'stacked') {
    options.scales = {
      x: { stacked: true },
      y: { stacked: true }
    };
  }
  if (['scatter', 'bubble'].includes(type)) {
    options.scales = {
      x: { type: 'linear', position: 'bottom' },
      y: { beginAtZero: true }
    };
  }

  return options;
}

function renderChartOverview(canvasId, labels, data, columnLabel) {
  const total = data.reduce((sum, val) => sum + (typeof val === 'number' ? val : val.y || 0), 0);
  let html = `<div class="ChartOverview" style="text-align: left; font-size: 10px; color: #444; margin-top: 5px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 12px;">`;

  labels.forEach((label, i) => {
    const val = data[i]?.y ?? data[i];
    const percent = total ? ((val / total) * 100).toFixed(1) : 0;
    html += `<div>${label}: ${val} (${percent}%)</div>`;
  });

  html += `</div>`;

  const chartBox = document.getElementById(canvasId).parentElement;
  const overviewId = `${canvasId}-overview`;

  let overview = document.getElementById(overviewId);
  if (!overview) {
    overview = document.createElement('div');
    overview.id = overviewId;
    overview.style.marginTop = '10px';
    chartBox.appendChild(overview);
  }

  overview.innerHTML = html;
}

function buildDatasets(type, labels, data, color, columnLabel) {
  if (type === 'stacked') {
    return labels.map((label, i) => {
      const bgColor = colorPreferences[columnLabel]?.[label] || color[i];
      return {
        label,
        data: [data[i]],
        backgroundColor: bgColor,
        borderColor: bgColor,
        borderWidth: 1
      };
    });
  }

  if (['bubble', 'scatter'].includes(type)) {
    return [{
      label: columnLabel,
      data: labels.map((label, i) => ({
        x: i,
        y: data[i],
        r: type === 'bubble' ? Math.sqrt(data[i]) * 2 : undefined,
        label: label
      })),
      backgroundColor: color,
      borderColor: color
    }];
  }

  const isSegmented = ['pie', 'doughnut', 'radar'].includes(type);
  const backgroundColor = isSegmented ? 
    labels.map((label, i) => colorPreferences[columnLabel]?.[label] || color[i]) : 
    color;

  const dataset = {
    label: columnLabel,
    data: data,
    backgroundColor: backgroundColor,
    borderColor: color,
    borderWidth: 1
  };

  if (type === 'area') {
    dataset.fill = true;
    dataset.tension = 0.4;
  }

  if (['line', 'area'].includes(type)) {
    dataset.tension = 0.4;
  }

  return [dataset];
}

function renderSegmentLegend(canvasId, labels) {
  const chartBox = document.getElementById(canvasId).parentElement;
  let legendContainer = chartBox.querySelector('.segment-legend');
  
  if (!legendContainer) {
    legendContainer = document.createElement('div');
    legendContainer.className = 'segment-legend';
    legendContainer.style.marginTop = '10px';
    chartBox.appendChild(legendContainer);
  }

  let html = '<div style="font-size: 12px;"><strong>Segment Colors:</strong><br>';
  labels.forEach((label, i) => {
    const currentColor = colorPreferences[canvasId]?.[label] || getThemeColor(i);
    html += `<label style="display: inline-block; margin: 2px 5px;">
      ${label}: 
      <input type="color" class="segment-color-picker" data-canvas="${canvasId}" data-index="${i}" value="${currentColor}" style="width: 20px; height: 20px;">
    </label>`;
  });
  html += '</div>';
  
  legendContainer.innerHTML = html;
}

// Utility functions
function getColumnCounts(data, column) {
  const counts = {};
  data.forEach(row => {
    const value = row[column];
    if (value !== undefined && value !== null) {
      counts[value] = (counts[value] || 0) + 1;
    }
  });
  return counts;
}

function getUserColor(canvasId, labels, columnLabel, isSegmented) {
  const colorPicker = $(`.color-picker[data-target="${canvasId}"]`);
  const baseColor = colorPicker.length ? colorPicker.val() : '#4bc0c0';
  
  if (isSegmented) {
    return labels.map((label, i) => 
      colorPreferences[columnLabel]?.[label] || getThemeColor(i)
    );
  }
  
  return baseColor;
}

function getThemeColor(index) {
  const theme = $('#themeSelect').val() || 'default';
  const themeFunction = chartThemes[theme];
  return themeFunction ? themeFunction() : randomColor();
}

function randomColor() {
  return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
}

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getFilterSummary() {
  const activeFilters = [];
  filterableColumns.forEach(col => {
    const filterId = `filter-${col.replace(/\s+/g, '_')}`;
    const checked = $(`input[name="${filterId}"]:checked`).length;
    const total = $(`input[name="${filterId}"]`).length;
    if (checked < total) {
      activeFilters.push(`${col}: ${checked}/${total} selected`);
    }
  });
  return activeFilters.length > 0 ? `Active filters: ${activeFilters.join(', ')}` : 'No filters applied';
}

// Project Integration Functions
function checkProjectAccess() {
  // Check if user is logged in
  const currentUser = localStorage.getItem('currentUser');
  if (!currentUser) {
    alert('Please log in to access the visualizer');
    window.location.href = 'index.html';
    return;
  }

  // Check if project is selected
  const currentProject = localStorage.getItem('currentProject');
  if (!currentProject) {
    alert('Please select a project to visualize');
    window.location.href = 'index.html';
    return;
  }
}

function setupProjectNavigation() {
  // Back to projects button
  $('#backToProjects').on('click', function() {
    if (confirm('Are you sure you want to go back? Any unsaved changes will be lost.')) {
      window.location.href = 'projects_dashboard.html';
    }
  });

  // Save project button
  $('#saveProjectBtn').on('click', function() {
    saveCurrentProject();
  });

  // Auto-save every 30 seconds
  setInterval(autoSaveProject, 30000);
}

function loadCurrentProject() {
  const projectData = localStorage.getItem('currentProject');
  const userData = localStorage.getItem('currentUser');
  
  if (!projectData || !userData) {
    window.location.href = 'index.html';
    return;
  }

  const project = JSON.parse(projectData);
  const user = JSON.parse(userData);

  // Update UI with project info
  $('#projectTitle').text(project.name);
  $('#projectDescription').text(project.description || 'No description');
  $('#currentUserName').text(user.name);
  $('#currentFileName').text(project.fileName);
  $('#lastSaved').text(project.updatedAt ? `Last saved: ${formatDateTime(project.updatedAt)}` : 'Never saved');

  // Show project status bar
  $('#projectStatus').show();

  // Load Excel file from base64 data
  if (project.fileData) {
    loadProjectExcelFile(project.fileData, project.fileName);
  } else {
    // Show file upload if no data
    $('#fileUploadSection').show();
  }
}

function loadProjectExcelFile(base64Data, fileName) {
  try {
    // Convert base64 to binary data
    const base64 = base64Data.split(',')[1];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Parse Excel file
    const workbook = XLSX.read(bytes, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
          window.excelData = XLSX.utils.sheet_to_json(sheet);
      
      if (window.excelData.length > 0) {
              window.allColumns = Object.keys(window.excelData[0]);
        populateColumnSelectors(window.allColumns);
      
      // Load saved chart settings for this project
      loadProjectSettings();
      
      // Show the filter and column sections
      $('.filter-section').show();
      $('#columnsContainer').show();
      
      // Update status
      $('#currentFileName').text(fileName);
      
      showSuccessMessage(`Project "${fileName}" loaded successfully`);
    }
  } catch (error) {
    console.error('Error loading project file:', error);
    showErrorMessage('Error loading project file. Please try uploading a new file.');
    $('#fileUploadSection').show();
  }
}

function saveCurrentProject() {
  const projectData = localStorage.getItem('currentProject');
  if (!projectData) return;

  const project = JSON.parse(projectData);
  
  // Update project with current chart configurations
  project.chartSettings = saveChartSettings();
  project.updatedAt = new Date().toISOString();

  // Save to localStorage
  localStorage.setItem('currentProject', JSON.stringify(project));

  // Update projects list
  const allProjects = JSON.parse(localStorage.getItem('projects') || '[]');
  const projectIndex = allProjects.findIndex(p => p.id === project.id);
  
  if (projectIndex !== -1) {
    allProjects[projectIndex] = project;
    localStorage.setItem('projects', JSON.stringify(allProjects));
  }

  // Update UI
  $('#lastSaved').text(`Last saved: ${formatDateTime(project.updatedAt)}`);
  
  showSuccessMessage('Project saved successfully!');
}

function autoSaveProject() {
  const projectData = localStorage.getItem('currentProject');
  if (!projectData || Object.keys(chartRegistry).length === 0) return;

  const project = JSON.parse(projectData);
  project.chartSettings = saveChartSettings();
  project.updatedAt = new Date().toISOString();

  localStorage.setItem('currentProject', JSON.stringify(project));

  // Update projects list silently
  const allProjects = JSON.parse(localStorage.getItem('projects') || '[]');
  const projectIndex = allProjects.findIndex(p => p.id === project.id);
  
  if (projectIndex !== -1) {
    allProjects[projectIndex] = project;
    localStorage.setItem('projects', JSON.stringify(allProjects));
  }

  // Update UI quietly
  $('#lastSaved').text(`Auto-saved: ${formatDateTime(project.updatedAt)}`);
}

function saveChartSettings() {
  const chartSettings = {
    filterableColumns: filterableColumns,
    selectedColumns: $('#columnSelect').val() || [],
    theme: $('#themeSelect').val() || 'default',
    charts: {},
    filterSettings: {}
  };

  // Save chart configurations
  Object.entries(chartRegistry).forEach(([canvasId, chart]) => {
    if (chart && chart.config) {
      const isMultiColumn = $(`.multi-column-checkbox[data-target="${canvasId}"]`).is(':checked');
      const selectedMultiCols = isMultiColumn ? $(`.multi-column-select[data-target="${canvasId}"]`).val() : [];
      
      chartSettings.charts[canvasId] = {
        type: chart.config.type,
        isMultiColumn: isMultiColumn,
        selectedColumns: selectedMultiCols,
        dataLabels: chart.data.labels,
        datasets: chart.data.datasets,
        options: chart.config.options
      };
    }
  });

  // Save filter settings
  filterableColumns.forEach(col => {
    const filterId = `filter-${col.replace(/\s+/g, '_')}`;
    const checked = $(`input[name="${filterId}"]:checked`).map(function() {
      return $(this).val();
    }).get();
    chartSettings.filterSettings[col] = checked;
  });

  return chartSettings;
}

function loadProjectSettings() {
  const projectData = localStorage.getItem('currentProject');
  if (!projectData) return;

  const project = JSON.parse(projectData);
  if (!project.chartSettings) return;

  const settings = project.chartSettings;

  // Restore filter columns
  if (settings.filterableColumns && settings.filterableColumns.length > 0) {
    $('#filterColumns').val(settings.filterableColumns);
    $('#loadFilters').click();
    
    // Wait for filters to load, then restore filter states
    setTimeout(() => {
      Object.entries(settings.filterSettings || {}).forEach(([col, checkedValues]) => {
        const filterId = `filter-${col.replace(/\s+/g, '_')}`;
        $(`input[name="${filterId}"]`).prop('checked', false);
        checkedValues.forEach(value => {
          $(`input[name="${filterId}"][value="${value}"]`).prop('checked', true);
        });
      });
    }, 500);
  }

  // Restore theme
  if (settings.theme) {
    $('#themeSelect').val(settings.theme);
  }

  // Restore selected columns and generate charts
  if (settings.selectedColumns && settings.selectedColumns.length > 0) {
    $('#columnSelect').val(settings.selectedColumns);
    $('#generateChart').click();

    // Wait for charts to generate, then restore chart settings
    setTimeout(() => {
      Object.entries(settings.charts || {}).forEach(([canvasId, chartConfig]) => {
        const chartTypeDropdown = $(`.chart-type[data-target="${canvasId}"]`);
        if (chartTypeDropdown.length) {
          chartTypeDropdown.val(chartConfig.type);
          
          if (chartConfig.isMultiColumn && chartConfig.selectedColumns) {
            const multiToggle = $(`.multi-column-checkbox[data-target="${canvasId}"]`);
            const multiSelect = $(`.multi-column-select[data-target="${canvasId}"]`);
            
            multiToggle.prop('checked', true);
            $(`#${canvasId}-multi-controls`).show();
            multiSelect.val(chartConfig.selectedColumns);
            
            // Trigger multi-column chart render
            updateMultiColumnChart(canvasId);
          } else {
            // Trigger single chart render
            chartTypeDropdown.trigger('change');
          }
        }
      });
    }, 1000);
  }
}

// Utility Functions for Project Management
function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function showSuccessMessage(message) {
  // Create or update success message
  let $msg = $('#project-success-msg');
  if (!$msg.length) {
    $msg = $('<div id="project-success-msg" class="project-message success"></div>');
    $('body').append($msg);
  }
  
  $msg.text(message).show();
  setTimeout(() => $msg.hide(), 3000);
}

function showErrorMessage(message) {
  // Create or update error message
  let $msg = $('#project-error-msg');
  if (!$msg.length) {
    $msg = $('<div id="project-error-msg" class="project-message error"></div>');
    $('body').append($msg);
  }
  
  $msg.text(message).show();
  setTimeout(() => $msg.hide(), 4000);
}