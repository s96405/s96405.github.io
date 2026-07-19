const STORAGE_KEY = 'flowforge_work_reporting_demo_v1';
const SCHEMA_VERSION = 1;
const FIXED_OPERATOR = '測試使用者';
const DEMO_PRODUCT_NAMES = {
  'WO-2026-0018': 'RH-900 排風設備外殼',
  'WO-2026-0019': 'FB-320 風箱總成',
  'WO-2026-0020': 'FT-120 濾網組'
};

function createDefaultData() {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    initializedAt: now,
    lastUpdatedAt: now,
    workOrders: [
      { id: 'WO-2026-0018', productName: DEMO_PRODUCT_NAMES['WO-2026-0018'], plannedQty: 500, status: 'in_progress', processIds: ['P10', 'P20', 'P30'] },
      { id: 'WO-2026-0019', productName: DEMO_PRODUCT_NAMES['WO-2026-0019'], plannedQty: 240, status: 'in_progress', processIds: ['P10', 'P20', 'P30'] },
      { id: 'WO-2026-0020', productName: DEMO_PRODUCT_NAMES['WO-2026-0020'], plannedQty: 120, status: 'not_started', processIds: ['P10', 'P20', 'P30'] }
    ],
    processes: [
      { id: 'P10', name: '第一道製程', sequence: 10 },
      { id: 'P20', name: '第二道製程', sequence: 20 },
      { id: 'P30', name: '品質檢查', sequence: 30 }
    ],
    records: [
      { id: 'WR-SEED-0001', workOrderId: 'WO-2026-0018', processId: 'P10', goodQty: 320, defectQty: 8, remark: '預設示範紀錄', operatorName: FIXED_OPERATOR, reportedAt: '2026-07-18T06:20:00.000Z' },
      { id: 'WR-SEED-0002', workOrderId: 'WO-2026-0018', processId: 'P20', goodQty: 180, defectQty: 3, remark: '預設示範紀錄', operatorName: FIXED_OPERATOR, reportedAt: '2026-07-18T08:35:00.000Z' },
      { id: 'WR-SEED-0003', workOrderId: 'WO-2026-0019', processId: 'P10', goodQty: 80, defectQty: 1, remark: '預設示範紀錄', operatorName: FIXED_OPERATOR, reportedAt: '2026-07-18T09:10:00.000Z' }
    ]
  };
}

function isValidStoredState(value) {
  if (!value || value.schemaVersion !== SCHEMA_VERSION || !Array.isArray(value.workOrders) || !Array.isArray(value.processes) || !Array.isArray(value.records)) return false;
  if (value.workOrders.length !== 3 || value.processes.length !== 3) return false;

  const orderIds = new Set(value.workOrders.map((order) => order.id));
  const processIds = new Set(value.processes.map((process) => process.id));
  const validOrders = value.workOrders.every((order) =>
    typeof order.id === 'string' && typeof order.productName === 'string' && Number.isInteger(order.plannedQty) && order.plannedQty > 0 &&
    Array.isArray(order.processIds) && order.processIds.length > 0 && order.processIds.every((id) => processIds.has(id))
  );
  const validProcesses = value.processes.every((process) =>
    typeof process.id === 'string' && typeof process.name === 'string' && Number.isInteger(process.sequence)
  );
  const validRecords = value.records.every((record) =>
    typeof record.id === 'string' && orderIds.has(record.workOrderId) && processIds.has(record.processId) &&
    Number.isInteger(record.goodQty) && record.goodQty >= 0 && Number.isInteger(record.defectQty) && record.defectQty >= 0 &&
    typeof record.remark === 'string' && record.remark.length <= 200 && record.operatorName === FIXED_OPERATOR &&
    typeof record.reportedAt === 'string' && !Number.isNaN(Date.parse(record.reportedAt))
  );
  return validOrders && validProcesses && validRecords;
}

let storageAvailable = true;
let storageWasRecovered = false;
let demoState;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      demoState = createDefaultData();
      if (!saveState()) storageWasRecovered = true;
      return demoState;
    }
    const parsed = JSON.parse(raw);
    if (!isValidStoredState(parsed)) throw new Error('Invalid stored demo data');
    parsed.workOrders.forEach((order) => {
      if (DEMO_PRODUCT_NAMES[order.id]) order.productName = DEMO_PRODUCT_NAMES[order.id];
    });
    demoState = parsed;
    saveState();
    return demoState;
  } catch (error) {
    storageWasRecovered = true;
    demoState = createDefaultData();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demoState));
    } catch (storageError) {
      storageAvailable = false;
    }
    return demoState;
  }
}

function saveState() {
  demoState.lastUpdatedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demoState));
    storageAvailable = true;
    return true;
  } catch (error) {
    storageAvailable = false;
    return false;
  }
}

function createReport(report) {
  const record = {
    id: `WR-LOCAL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    workOrderId: report.workOrderId,
    processId: report.processId,
    goodQty: report.goodQty,
    defectQty: report.defectQty,
    remark: report.remark,
    operatorName: FIXED_OPERATOR,
    reportedAt: new Date().toISOString()
  };
  demoState.records.push(record);
  if (!saveState()) {
    demoState.records.pop();
    return null;
  }
  return record;
}

function listReports() {
  return [...demoState.records].sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));
}

function getOrderProgress(workOrderId) {
  const order = demoState.workOrders.find((item) => item.id === workOrderId);
  if (!order) return null;
  const orderRecords = demoState.records.filter((record) => record.workOrderId === workOrderId);
  const processes = order.processIds.map((processId) => {
    const process = demoState.processes.find((item) => item.id === processId);
    const records = orderRecords.filter((record) => record.processId === processId);
    const goodQty = records.reduce((total, record) => total + record.goodQty, 0);
    const defectQty = records.reduce((total, record) => total + record.defectQty, 0);
    return {
      id: processId,
      name: process ? process.name : processId,
      goodQty,
      defectQty,
      progress: Math.min(100, Math.round((goodQty / order.plannedQty) * 100))
    };
  });
  const finalProcessId = order.processIds[order.processIds.length - 1];
  const finalProcess = processes.find((process) => process.id === finalProcessId);
  const finalProcessGoodQty = finalProcess ? finalProcess.goodQty : 0;
  const totalDefectQty = processes.reduce((total, process) => total + process.defectQty, 0);
  return {
    order,
    processes,
    finalProcessGoodQty,
    finalProcessName: finalProcess ? finalProcess.name : finalProcessId,
    remainingQty: Math.max(0, order.plannedQty - finalProcessGoodQty),
    totalDefectQty,
    overallProgress: Math.min(100, Math.round((finalProcessGoodQty / order.plannedQty) * 100))
  };
}

function getProcessReportableQty(workOrderId, processId) {
  const progress = getOrderProgress(workOrderId);
  if (!progress) return 0;
  const processIndex = progress.order.processIds.indexOf(processId);
  if (processIndex < 0) return 0;
  const currentProcess = progress.processes.find((process) => process.id === processId);
  if (!currentProcess) return 0;
  const orderRemaining = Math.max(0, progress.order.plannedQty - currentProcess.goodQty);
  if (processIndex === 0) return orderRemaining;
  const previousProcessId = progress.order.processIds[processIndex - 1];
  const previousProcess = progress.processes.find((process) => process.id === previousProcessId);
  const upstreamAvailable = Math.max(0, (previousProcess ? previousProcess.goodQty : 0) - currentProcess.goodQty);
  return Math.min(orderRemaining, upstreamAvailable);
}

function resetDemoData() {
  demoState = createDefaultData();
  saveState();
  return demoState;
}

const reportForm = document.querySelector('#report-form');
const workOrderSelect = document.querySelector('#work-order');
const productNameInput = document.querySelector('#product-name');
const processSelect = document.querySelector('#process');
const goodQtyInput = document.querySelector('#good-qty');
const goodQtyLimit = document.querySelector('#good-qty-limit');
const goodQtyReason = document.querySelector('#good-qty-reason');
const defectQtyInput = document.querySelector('#defect-qty');
const remarkInput = document.querySelector('#remark');
const remarkCount = document.querySelector('#remark-count');
const actionMessage = document.querySelector('#action-message');
const recoveryMessage = document.querySelector('#recovery-message');
const resetDialog = document.querySelector('#reset-dialog');
const resetCheck = document.querySelector('#reset-confirm-check');
const confirmResetButton = document.querySelector('#confirm-reset');
const openResetButton = document.querySelector('#open-reset-dialog');
const cancelResetButton = document.querySelector('#cancel-reset');
const recordOrderFilter = document.querySelector('#record-order-filter');
const recordProcessFilter = document.querySelector('#record-process-filter');
const clearRecordFiltersButton = document.querySelector('#clear-record-filters');

function getOrder(orderId) {
  return demoState.workOrders.find((order) => order.id === orderId);
}

function getProcess(processId) {
  return demoState.processes.find((process) => process.id === processId);
}

function formatStatus(status) {
  return status === 'in_progress' ? '進行中' : '尚未開始';
}

function formatDate(isoDate) {
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
  }).format(new Date(isoDate));
}

function showActionMessage(message, type = 'success') {
  actionMessage.textContent = message;
  actionMessage.className = `action-message is-${type}`;
  actionMessage.hidden = false;
}

function clearActionMessage() {
  actionMessage.hidden = true;
  actionMessage.textContent = '';
  actionMessage.className = 'action-message';
}

function populateWorkOrders() {
  workOrderSelect.replaceChildren(new Option('請選擇生產工單', ''));
  demoState.workOrders.forEach((order) => {
    workOrderSelect.add(new Option(`${order.id}｜${order.productName}`, order.id));
  });
}

function populateRecordFilters() {
  recordOrderFilter.replaceChildren(new Option('全部工單', ''));
  demoState.workOrders.forEach((order) => {
    recordOrderFilter.add(new Option(`${order.id}｜${order.productName}`, order.id));
  });
  recordProcessFilter.replaceChildren(new Option('全部製程', ''));
  demoState.processes.forEach((process) => {
    recordProcessFilter.add(new Option(`${process.id}｜${process.name}`, process.id));
  });
}

function populateProcesses(orderId, selectedProcessId = '') {
  processSelect.replaceChildren();
  const order = getOrder(orderId);
  if (!order) {
    processSelect.add(new Option('請先選擇工單', ''));
    processSelect.disabled = true;
    return;
  }
  processSelect.add(new Option('請選擇作業製程', ''));
  order.processIds.forEach((processId) => {
    const process = getProcess(processId);
    if (process) processSelect.add(new Option(`${process.id}｜${process.name}`, process.id));
  });
  processSelect.disabled = false;
  if (order.processIds.includes(selectedProcessId)) processSelect.value = selectedProcessId;
}

function renderOrderSummary(orderId) {
  const progress = getOrderProgress(orderId);
  const statusElement = document.querySelector('#order-status');
  const progressTrack = document.querySelector('#overall-progress-track');
  const progressBar = progressTrack.querySelector('i');
  if (!progress) {
    document.querySelector('#summary-order-id').textContent = '請先選擇工單';
    document.querySelector('#summary-product').textContent = '—';
    document.querySelector('#summary-planned').textContent = '—';
    document.querySelector('#summary-good').textContent = '—';
    document.querySelector('#summary-remaining').textContent = '—';
    document.querySelector('#summary-defect').textContent = '—';
    document.querySelector('#overall-progress-value').textContent = '0%';
    document.querySelector('#summary-progress-note').textContent = '整體進度依最後一道必要製程的累計良品計算。';
    statusElement.textContent = '—';
    statusElement.classList.remove('is-active');
    progressBar.style.width = '0%';
    progressTrack.setAttribute('aria-valuenow', '0');
    return;
  }
  document.querySelector('#summary-order-id').textContent = progress.order.id;
  document.querySelector('#summary-product').textContent = progress.order.productName;
  document.querySelector('#summary-planned').textContent = String(progress.order.plannedQty);
  document.querySelector('#summary-good').textContent = String(progress.finalProcessGoodQty);
  document.querySelector('#summary-remaining').textContent = String(progress.remainingQty);
  document.querySelector('#summary-defect').textContent = String(progress.totalDefectQty);
  document.querySelector('#overall-progress-value').textContent = `${progress.overallProgress}%`;
  document.querySelector('#summary-progress-note').textContent = `整體進度依最後一道必要製程「${progress.finalProcessName}」的累計良品計算。`;
  statusElement.textContent = formatStatus(progress.order.status);
  statusElement.classList.toggle('is-active', progress.order.status === 'in_progress');
  progressBar.style.width = `${progress.overallProgress}%`;
  progressTrack.setAttribute('aria-valuenow', String(progress.overallProgress));
}

function renderProcessProgress(orderId) {
  const container = document.querySelector('#process-progress-grid');
  container.replaceChildren();
  const progress = getOrderProgress(orderId);
  if (!progress) {
    const message = document.createElement('p');
    message.className = 'empty-state';
    message.textContent = '選擇工單後，這裡會顯示三道製程的進度。';
    container.append(message);
    return;
  }
  progress.processes.forEach((process) => {
    const card = document.createElement('article');
    card.className = 'process-card';
    const isSelected = process.id === processSelect.value;
    card.classList.toggle('is-selected', isSelected);
    const head = document.createElement('div');
    head.className = 'process-card-head';
    const code = document.createElement('span');
    code.textContent = process.id;
    const percentage = document.createElement('strong');
    percentage.textContent = `${process.progress}%`;
    head.append(code, percentage);
    const title = document.createElement('h3');
    title.textContent = process.name;
    const titleRow = document.createElement('div');
    titleRow.className = 'process-title-row';
    titleRow.append(title);
    if (isSelected) {
      const selectedBadge = document.createElement('span');
      selectedBadge.className = 'selected-process-badge';
      selectedBadge.textContent = '目前選擇';
      titleRow.append(selectedBadge);
    }
    const description = document.createElement('p');
    description.textContent = `累計良品 ${process.goodQty}`;
    const track = document.createElement('div');
    track.className = 'app-progress-track';
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-label', `${process.name}進度`);
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '100');
    track.setAttribute('aria-valuenow', String(process.progress));
    const bar = document.createElement('i');
    bar.style.width = `${process.progress}%`;
    track.append(bar);
    const counts = document.createElement('div');
    counts.className = 'process-counts';
    const remaining = document.createElement('span');
    remaining.append('可報 ', Object.assign(document.createElement('strong'), { textContent: String(getProcessReportableQty(progress.order.id, process.id)) }));
    const defect = document.createElement('span');
    defect.append('累計不良 ', Object.assign(document.createElement('strong'), { textContent: String(process.defectQty) }));
    counts.append(remaining, defect);
    card.append(head, titleRow, description, track, counts);
    container.append(card);
  });
}

function updateProcessRemainingHint() {
  const order = getOrder(workOrderSelect.value);
  const process = getProcess(processSelect.value);
  const summaryValue = document.querySelector('#summary-process-remaining');
  if (!order || !process || !order.processIds.includes(process.id)) {
    goodQtyLimit.textContent = '—';
    goodQtyReason.textContent = '選擇工單與製程後顯示可報數量。';
    summaryValue.textContent = '—';
    return;
  }
  const progress = getOrderProgress(order.id);
  const processProgress = progress.processes.find((item) => item.id === process.id);
  const processIndex = order.processIds.indexOf(process.id);
  const reportableQty = getProcessReportableQty(order.id, process.id);
  goodQtyLimit.textContent = String(reportableQty);
  if (processIndex === 0) {
    goodQtyReason.textContent = '第一道製程，可報數量依工單預計數量計算。';
  } else {
    const previousProcess = progress.processes.find((item) => item.id === order.processIds[processIndex - 1]);
    const previousGoodQty = previousProcess ? previousProcess.goodQty : 0;
    const currentGoodQty = processProgress ? processProgress.goodQty : 0;
    if (previousGoodQty === 0) {
      goodQtyReason.textContent = '前一道製程尚未完成可供本製程報工的數量。';
    } else if (reportableQty === 0 && currentGoodQty >= previousGoodQty) {
      goodQtyReason.textContent = '目前製程已完成前一道製程可供報工的全部數量。';
    } else {
      goodQtyReason.textContent = `前站已完成 ${previousGoodQty}，目前製程已完成 ${currentGoodQty}。`;
    }
  }
  summaryValue.textContent = String(reportableQty);
}

function isSameLocalDay(isoDate, comparisonDate) {
  const date = new Date(isoDate);
  return date.getFullYear() === comparisonDate.getFullYear() &&
    date.getMonth() === comparisonDate.getMonth() && date.getDate() === comparisonDate.getDate();
}

function renderOverview() {
  const today = new Date();
  const activeOrders = demoState.workOrders.filter((order) => order.status === 'in_progress').length;
  const todayReports = demoState.records.filter((record) => isSameLocalDay(record.reportedAt, today)).length;
  const totalGood = demoState.records.reduce((total, record) => total + record.goodQty, 0);
  const totalDefect = demoState.records.reduce((total, record) => total + record.defectQty, 0);
  document.querySelector('#metric-active-orders').textContent = String(activeOrders);
  document.querySelector('#metric-today-reports').textContent = String(todayReports);
  document.querySelector('#metric-good-total').textContent = String(totalGood);
  document.querySelector('#metric-defect-total').textContent = String(totalDefect);
}

function createTableCell(text, className = '') {
  const cell = document.createElement('td');
  cell.textContent = text;
  if (className) cell.className = className;
  return cell;
}

function createRecordCard(record, order, process) {
  const card = document.createElement('article');
  card.className = 'record-card';
  const head = document.createElement('div');
  head.className = 'record-card-head';
  const orderId = document.createElement('strong');
  orderId.textContent = record.workOrderId;
  const time = document.createElement('span');
  time.textContent = formatDate(record.reportedAt);
  head.append(orderId, time);
  const product = document.createElement('p');
  product.className = 'record-card-product';
  product.textContent = `${order ? order.productName : '—'} · ${process ? process.name : '—'}`;
  const data = document.createElement('div');
  data.className = 'record-card-data';
  [
    ['良品', record.goodQty], ['不良品', record.defectQty], ['備註', record.remark || '—'], ['操作人員', record.operatorName]
  ].forEach(([label, value]) => {
    const item = document.createElement('div');
    const small = document.createElement('small');
    small.textContent = label;
    const span = document.createElement('span');
    span.textContent = String(value);
    item.append(small, span);
    data.append(item);
  });
  card.append(head, product, data);
  return card;
}

function renderRecords() {
  const allReports = listReports();
  const reports = allReports.filter((record) =>
    (!recordOrderFilter.value || record.workOrderId === recordOrderFilter.value) &&
    (!recordProcessFilter.value || record.processId === recordProcessFilter.value)
  );
  const tableBody = document.querySelector('#records-table-body');
  const cardList = document.querySelector('#records-card-list');
  const emptyState = document.querySelector('#records-empty');
  tableBody.replaceChildren();
  cardList.replaceChildren();
  const filtersActive = recordOrderFilter.value || recordProcessFilter.value;
  document.querySelector('#record-count').textContent = filtersActive ? `顯示 ${reports.length}／${allReports.length} 筆` : `${reports.length} 筆紀錄`;
  emptyState.hidden = reports.length > 0;
  reports.forEach((record) => {
    const order = getOrder(record.workOrderId);
    const process = getProcess(record.processId);
    const row = document.createElement('tr');
    row.append(
      createTableCell(formatDate(record.reportedAt)), createTableCell(record.workOrderId),
      createTableCell(order ? order.productName : '—'), createTableCell(process ? process.name : '—'),
      createTableCell(String(record.goodQty), 'numeric'), createTableCell(String(record.defectQty), 'numeric'),
      createTableCell(record.remark || '—'), createTableCell(record.operatorName)
    );
    tableBody.append(row);
    cardList.append(createRecordCard(record, order, process));
  });
}

function renderSelectedOrder() {
  const orderId = workOrderSelect.value;
  const order = getOrder(orderId);
  productNameInput.value = order ? order.productName : '請先選擇工單';
  renderOrderSummary(orderId);
  renderProcessProgress(orderId);
  updateProcessRemainingHint();
}

function renderAll() {
  renderOverview();
  renderSelectedOrder();
  renderRecords();
}

function clearFieldError(field) {
  field.removeAttribute('aria-invalid');
  const error = document.querySelector(`#${field.id}-error`);
  if (error) error.textContent = '';
}

function setFieldError(field, message) {
  field.setAttribute('aria-invalid', 'true');
  const error = document.querySelector(`#${field.id}-error`);
  if (error) error.textContent = message;
}

function parseNonNegativeInteger(input, emptyAsZero = false) {
  const raw = input.value.trim();
  if (raw === '' && emptyAsZero) return 0;
  if (!/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function validateReportForm() {
  [workOrderSelect, processSelect, goodQtyInput, defectQtyInput, remarkInput].forEach(clearFieldError);
  const errors = [];
  const order = getOrder(workOrderSelect.value);
  if (!order) errors.push([workOrderSelect, '請選擇有效的生產工單。']);
  const process = getProcess(processSelect.value);
  if (!process || !order || !order.processIds.includes(process.id)) errors.push([processSelect, '請選擇此工單可用的製程。']);
  const goodQty = parseNonNegativeInteger(goodQtyInput);
  const defectQty = parseNonNegativeInteger(defectQtyInput, true);
  if (goodQty === null) errors.push([goodQtyInput, '良品數量必須是大於或等於 0 的整數。']);
  if (defectQty === null) errors.push([defectQtyInput, '不良品數量必須是大於或等於 0 的整數。']);
  if (goodQty !== null && defectQty !== null && goodQty === 0 && defectQty === 0) {
    errors.push([goodQtyInput, '良品與不良品至少一項必須大於 0。']);
  }
  if (order && process && goodQty !== null) {
    const reportableQty = getProcessReportableQty(order.id, process.id);
    if (goodQty > reportableQty) {
      errors.push([goodQtyInput, `本次良品超過目前可流入此製程的數量，最多可報 ${reportableQty}。`]);
    }
  }
  if (order && defectQty !== null && defectQty > order.plannedQty) {
    errors.push([defectQtyInput, `本次不良品不得大於預計數量 ${order.plannedQty}。`]);
  }
  if (remarkInput.value.length > 200) errors.push([remarkInput, '備註最多 200 字。']);
  errors.forEach(([field, message]) => setFieldError(field, message));
  return { valid: errors.length === 0, firstInvalidField: errors[0] ? errors[0][0] : null, order, process, goodQty, defectQty };
}

workOrderSelect.addEventListener('change', () => {
  clearFieldError(workOrderSelect);
  populateProcesses(workOrderSelect.value);
  renderSelectedOrder();
  clearActionMessage();
});

processSelect.addEventListener('change', () => {
  clearFieldError(processSelect);
  updateProcessRemainingHint();
  renderProcessProgress(workOrderSelect.value);
});
[goodQtyInput, defectQtyInput].forEach((input) => input.addEventListener('input', () => clearFieldError(input)));
remarkInput.addEventListener('input', () => {
  clearFieldError(remarkInput);
  remarkCount.textContent = `還可輸入 ${Math.max(0, 200 - remarkInput.value.length)} 字`;
});

[recordOrderFilter, recordProcessFilter].forEach((filter) => filter.addEventListener('change', renderRecords));
clearRecordFiltersButton.addEventListener('click', () => {
  recordOrderFilter.value = '';
  recordProcessFilter.value = '';
  renderRecords();
});

reportForm.addEventListener('submit', (event) => {
  event.preventDefault();
  clearActionMessage();
  const result = validateReportForm();
  if (!result.valid) {
    showActionMessage('請檢查表單中標示的欄位。', 'error');
    result.firstInvalidField.focus();
    return;
  }
  const record = createReport({
    workOrderId: result.order.id,
    processId: result.process.id,
    goodQty: result.goodQty,
    defectQty: result.defectQty,
    remark: remarkInput.value.trim()
  });
  if (!record) {
    showActionMessage('瀏覽器無法保存測試資料。請確認未封鎖網站儲存空間後再試一次。', 'error');
    return;
  }
  goodQtyInput.value = '';
  defectQtyInput.value = '0';
  remarkInput.value = '';
  remarkCount.textContent = '還可輸入 200 字';
  recordOrderFilter.value = '';
  recordProcessFilter.value = '';
  renderAll();
  showActionMessage(
    `報工成功\n工單：${result.order.id}\n製程：${result.process.id}｜${result.process.name}\n良品：+${result.goodQty}\n不良品：${result.defectQty}\n\n此筆紀錄已保存在目前瀏覽器。`,
    'success'
  );
  if (!window.matchMedia('(max-width: 980px)').matches) {
    actionMessage.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  }
});

openResetButton.addEventListener('click', () => {
  resetCheck.checked = false;
  confirmResetButton.disabled = true;
  resetDialog.showModal();
});

resetCheck.addEventListener('change', () => {
  confirmResetButton.disabled = !resetCheck.checked;
});

cancelResetButton.addEventListener('click', () => resetDialog.close());

resetDialog.addEventListener('click', (event) => {
  if (event.target === resetDialog) resetDialog.close();
});

confirmResetButton.addEventListener('click', () => {
  if (!resetCheck.checked) return;
  resetDemoData();
  workOrderSelect.value = '';
  populateProcesses('');
  productNameInput.value = '請先選擇工單';
  goodQtyInput.value = '';
  defectQtyInput.value = '0';
  remarkInput.value = '';
  remarkCount.textContent = '還可輸入 200 字';
  renderAll();
  resetDialog.close();
  showActionMessage(storageAvailable ? '示範資料已重設。' : '資料已在目前頁面重設，但瀏覽器無法保存變更。', storageAvailable ? 'success' : 'error');
  openResetButton.focus();
});

loadState();
populateWorkOrders();
populateRecordFilters();
populateProcesses('');
renderAll();

if (storageWasRecovered) {
  recoveryMessage.textContent = storageAvailable
    ? '原有測試資料格式錯誤，已自動恢復預設示範資料。'
    : '瀏覽器無法使用 localStorage，目前只能在本次開啟期間操作。';
  recoveryMessage.hidden = false;
}
