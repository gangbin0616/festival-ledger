'use strict';

const storageKey = 'festival-log-v1';
const byId = id => document.getElementById(id);
const won = value => Number(value).toLocaleString('ko-KR') + '원';
const defaultYear = 2026;
// Public event menus: Boseong 5,000 won, Sokcho and Shinhwa World 7,000 won each.
const estimatedBeerPrice = Math.round((5000 + 7000 + 7000) / 3 / 100) * 100;
const expenseKeys = ['price', 'transport', 'lodging', 'beer', 'booking', 'shipping', 'merch', 'food'];
const expenseLabels = [['티켓', 'price', 'ticket'], ['예매수수료', 'booking', 'booking'], ['배송비', 'shipping', 'shipping'], ['교통', 'transport', 'transport'], ['숙박', 'lodging', 'lodging'], ['MD', 'merch', 'merch'], ['식비', 'food', 'food'], ['맥주', 'beer', 'beer']];
let events = [];
let records = {};
let onlyVisited = false;
let shared = false;

function element(tag, content, className) {
  const node = document.createElement(tag);
  if (content !== undefined) node.textContent = content;
  if (className) node.className = className;
  return node;
}

function priceValue(value) {
  const number = Number(value);
  return (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) && Number.isSafeInteger(number) &&
    number >= 0 && number <= 100000000 ? number : '';
}

function normalize(rows) {
  const validIds = new Set(events.map(event => String(event.id)));
  const valid = {};
  if (!Array.isArray(rows) || rows.length > events.length) return valid;
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const [id, year, ticket, price, transport, lodging, beer, cups, booking, shipping, beerEstimate, seller, bookedOn, delivered, merch, food] = row;
    if (!validIds.has(String(id)) || !Number.isInteger(Number(year)) ||
        Number(year) < 1990 || Number(year) > 2100 || typeof ticket !== 'string') continue;
    valid[id] = { year: Number(year), ticket: ticket.slice(0, 100), price: priceValue(price), transport: priceValue(transport), lodging: priceValue(lodging), beer: priceValue(beer), cups: priceValue(cups),
      merch: priceValue(merch), food: priceValue(food),
      beerEstimate: beerEstimate === true, booking: priceValue(booking), shipping: delivered === false ? '' : priceValue(shipping),
      seller: typeof seller === 'string' && Object.hasOwn(bookingPlatforms, seller) ? seller : '',
      bookedOn: typeof bookedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(bookedOn) ? bookedOn : '',
      delivered: delivered === true || (delivered === undefined && priceValue(shipping) !== '') };
  }
  return valid;
}

function setNotice(message) {
  byId('notice').textContent = message;
  byId('notice').hidden = !message;
}

function recordTotal(record) {
  return expenseKeys.reduce((sum, key) => sum + (record[key] || 0), 0);
}

function updateSummary() {
  updateYearOptions();
  const period = shared ? 'all' : byId('summary-year').value;
  const values = Object.values(records).filter(record => period === 'all' || record.year === Number(period));
  const hasAmount = values.some(record => expenseKeys.some(key => typeof record[key] === 'number'));
  byId('count').textContent = values.length + '개';
  byId('visited-count').textContent = values.length;
  byId('total').textContent = shared && !hasAmount ? '비공개' :
    won(values.reduce((sum, record) => sum + recordTotal(record), 0));
  byId('breakdown').hidden = shared && !hasAmount;
  for (const [, key, target] of expenseLabels) {
    byId(target + '-total').textContent = won(values.reduce((sum, record) => sum + (record[key] || 0), 0));
  }
  const cups = values.reduce((sum, record) => sum + (record.cups || 0), 0);
  const pricedBeers = values.filter(record => record.cups > 0 && typeof record.beer === 'number');
  const pricedCups = pricedBeers.reduce((sum, record) => sum + record.cups, 0);
  const beerCost = pricedBeers.reduce((sum, record) => sum + record.beer, 0);
  byId('beer-stats').hidden = !cups;
  byId('beer-stats').textContent = cups + '잔' +
    (pricedCups ? ' · 잔당 ' + won(Math.round(beerCost / pricedCups)) : '') +
    (pricedBeers.some(record => record.beerEstimate) ? ' (추정 포함)' : '');
  byId('share').disabled = !values.length;
}

function updateYearOptions() {
  const select = byId('summary-year');
  const current = select.value || String(defaultYear);
  const years = [...new Set([defaultYear, ...Object.values(records).map(record => record.year)])].sort((a, b) => b - a);
  select.replaceChildren(...years.map(year => new Option(year + '년', String(year))), new Option('전체 기간', 'all'));
  select.value = years.includes(Number(current)) || current === 'all' ? current : String(defaultYear);
}

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(records));
  } catch {
    setNotice('브라우저 저장 공간을 사용할 수 없어 변경 내용이 저장되지 않았습니다.');
  }
  updateSummary();
}

function ticketName(ticket) {
  return ticket === '선택해주세요' || ticket === '직접 입력' ? '' : ticket;
}

function showAmount(node, record) {
  node.textContent = record && expenseKeys.some(key => typeof record[key] === 'number') ? won(recordTotal(record)) : '';
}

function field(title, control) {
  control.setAttribute('aria-label', title);
  const label = element('label');
  label.append(element('span', title, 'field-label'), control);
  return label;
}

function makeFields(event, record, amount) {
  const fields = element('div', undefined, 'fields');
  const year = element('input');
  year.type = 'number';
  year.min = 1990;
  year.max = 2100;
  year.value = record.year;
  const ticket = element('select');
  const price = element('input');
  price.type = 'number';
  price.min = 0;
  price.max = 100000000;
  price.step = 1;
  price.inputMode = 'numeric';
  price.placeholder = '금액 입력';
  price.value = record.price;
  const hint = element('p', undefined, 'hint');
  const hintText = element('span');
  const source = element('a', '가격 출처', 'source');
  source.target = '_blank';
  source.rel = 'noopener noreferrer';
  hint.append(hintText, source);

  function renderTickets() {
    const options = prices[event.id]?.[record.year] ?? [];
    ticket.replaceChildren(new Option('권종 선택', ''));
    for (const [name, value] of options) ticket.add(new Option(name + ' · ' + won(value), name));
    if (ticketName(record.ticket) && !options.some(([name]) => name === record.ticket)) {
      ticket.add(new Option(record.ticket, record.ticket));
    }
    ticket.add(new Option('직접 입력', '직접 입력'));
    ticket.value = record.ticket === '선택해주세요' ? '' : record.ticket;
    const url = priceSources[event.id]?.[record.year];
    source.hidden = !url;
    if (url) source.href = url;
    hintText.textContent = options.length ? '권종을 고르면 티켓값이 입력됩니다. 수수료·배송비는 아래에 따로 기록하세요.' :
      '이 연도의 가격 정보가 없습니다. 실제 결제액을 입력하세요.';
  }

  year.addEventListener('change', () => {
    if (!year.checkValidity() || year.value === '') {
      year.value = record.year;
      return;
    }
    if (record.year === Number(year.value)) return;
    record.year = Number(year.value);
    record.ticket = '';
    record.price = '';
    price.value = '';
    renderTickets();
    renderBooking();
    showAmount(amount, record);
    save();
  });
  ticket.addEventListener('change', () => {
    record.ticket = ticket.value;
    const option = prices[event.id]?.[record.year]?.find(([name]) => name === ticket.value);
    if (option) record.price = option[1];
    if (option) price.value = record.price;
    const policy = bookingPolicy(event.id, record);
    if (option && option[1] > 0 && (record.booking ?? '') === '') {
      const seller = record.seller || (policy?.sellers.length === 1 ? policy.sellers[0] : '');
      const fee = onlineFee(seller, record, policy);
      if (fee !== undefined) {
        record.seller = seller;
        record.booking = fee;
        renderBooking();
      }
    }
    showAmount(amount, record);
    save();
  });
  price.addEventListener('input', () => {
    record.price = priceValue(price.value);
    showAmount(amount, record);
    save();
  });
  price.addEventListener('blur', () => { price.value = record.price; });
  renderTickets();
  fields.append(field('연도', year), field('권종', ticket), field('티켓값 (원)', price));
  const expenses = element('div', undefined, 'fields expenses');
  for (const [key, label] of [['transport', '교통비 (원)'], ['lodging', '숙박비 (원)'], ['merch', 'MD (원)'], ['food', '식비 (원)']]) {
    const input = element('input');
    input.type = 'number';
    input.min = 0;
    input.max = 100000000;
    input.step = 1;
    input.inputMode = 'numeric';
    input.placeholder = '0';
    input.value = record[key] ?? '';
    input.addEventListener('input', () => {
      record[key] = priceValue(input.value);
      showAmount(amount, record);
      save();
    });
    input.addEventListener('blur', () => { input.value = record[key]; });
    expenses.append(field(label, input));
  }
  const cups = element('input');
  cups.type = 'number';
  cups.min = 0;
  cups.max = Math.floor(100000000 / estimatedBeerPrice);
  cups.step = 1;
  cups.inputMode = 'numeric';
  cups.placeholder = '0';
  cups.value = record.cups ?? '';
  const beerSummary = element('div', undefined, 'beer-summary');
  const beerPriceNote = element('span', '한 잔 약 ' + won(estimatedBeerPrice) + ' · 공개 축제 메뉴 평균', 'field-label');
  const beerTotal = element('output', undefined, 'beer-average');
  beerTotal.setAttribute('aria-label', '맥주 지출');
  const useEstimate = element('button', '잔 수로 다시 계산');
  useEstimate.type = 'button';
  function renderBeer() {
    const hasActual = typeof record.beer === 'number' && !record.beerEstimate;
    beerPriceNote.textContent = hasActual ? '기존에 입력한 맥주 지출' :
      '한 잔 약 ' + won(estimatedBeerPrice) + ' · 공개 축제 메뉴 평균';
    beerTotal.textContent = record.beer === '' || record.beer === undefined ? '—' :
      won(record.beer) + (record.beerEstimate ? ' 예상' : '');
    useEstimate.hidden = !hasActual;
  }
  function updateBeer(useExisting = true) {
    record.cups = cups.checkValidity() ? priceValue(cups.value) : '';
    if (!useExisting || record.beerEstimate || typeof record.beer !== 'number') {
      record.beer = record.cups === '' ? '' : record.cups * estimatedBeerPrice;
      record.beerEstimate = true;
    }
    renderBeer();
    showAmount(amount, record);
    save();
  }
  cups.addEventListener('input', () => updateBeer());
  cups.addEventListener('blur', () => { cups.value = record.cups ?? ''; });
  useEstimate.addEventListener('click', () => updateBeer(false));
  beerSummary.append(beerPriceNote, beerTotal, useEstimate);
  expenses.append(field('맥주 잔 수', cups), beerSummary);
  renderBeer();
  const bookingFields = element('details', undefined, 'booking-fields');
  function renderBooking() { makeBookingFields(bookingFields, event, record, () => { showAmount(amount, record); save(); }); }
  renderBooking();
  return [fields, hint, bookingFields, expenses];
}

function makeBookingFields(container, event, record, onEdit) {
  const policy = bookingPolicy(event.id, record);
  const title = element('summary');
  function updateTitle() {
    const extra = (record.booking || 0) + (record.shipping || 0);
    title.textContent = '예매수수료 · 배송비' + (extra ? ' ' + won(extra) : '');
  }
  const controls = element('div', undefined, 'booking-grid');
  const seller = element('select');
  seller.add(new Option('예매처 선택', ''));
  const suggested = policy?.sellers ?? [];
  for (const id of new Set([...suggested, ...Object.keys(bookingPlatforms)])) {
    seller.add(new Option(bookingPlatforms[id].name, id));
  }
  seller.value = record.seller || '';
  const date = element('input');
  date.type = 'date';
  date.value = record.bookedOn || '';
  const fee = element('input');
  const shipping = element('input');
  for (const input of [fee, shipping]) {
    input.type = 'number';
    input.min = 0;
    input.max = 100000000;
    input.step = 1;
    input.inputMode = 'numeric';
    input.placeholder = '금액 입력';
  }
  fee.value = record.booking ?? '';
  shipping.value = record.shipping ?? '';
  const delivered = element('input');
  delivered.type = 'checkbox';
  delivered.checked = Boolean(record.delivered);
  const deliveryLabel = element('label', undefined, 'check-label');
  deliveryLabel.append(delivered, element('span', '실물 티켓 배송받음'));
  const dateField = field('예매일', date);
  const shippingField = field('배송비 (원)', shipping);
  const status = element('p', undefined, 'booking-note');

  function renderOptions() {
    const platform = bookingPlatforms[seller.value];
    const mobile = policy?.mobile && (!seller.value || policy.sellers.includes(seller.value));
    dateField.hidden = seller.value !== 'nol' || record.year !== 2026;
    deliveryLabel.hidden = Boolean(mobile && !delivered.checked);
    shippingField.hidden = !delivered.checked;
    const parts = [];
    if (mobile) parts.push('모바일·현장 수령 안내 상품입니다. 배송비는 기본으로 더하지 않습니다.');
    else if (policy?.delivery && record.ticket?.startsWith('블라인드')) parts.push(policy.delivery);
    if (seller.value === 'nol' && dateField.hidden === false && !date.value) parts.push('예매일을 고르면 당시 기본 수수료를 적용합니다.');
    if (seller.value === 'nol' && date.value === '2026-11-16') parts.push('11월 16일은 오전 9시부터 수수료가 바뀌었습니다. 결제 내역을 확인해 입력하세요.');
    if ((record.booking ?? '') !== '' || delivered.checked) parts.push('이미 티켓값에 포함한 금액은 중복으로 입력하지 마세요.');
    if (delivered.checked && shipping.value === '') parts.push('확인된 배송비가 없으면 결제 내역의 금액을 입력하세요.');
    if (platform && onlineFee(seller.value, record, policy) !== undefined) parts.push('표준 온라인 요금은 1장 기준입니다. 실제 낸 금액으로 수정할 수 있습니다.');
    status.replaceChildren(document.createTextNode(parts.join(' ')));
    for (const [label, url] of [['수수료 안내', platform?.source], ['배송 요금 안내', platform?.shippingSource], ['행사 안내', policy?.source]]) {
      if (!url) continue;
      const link = element('a', label);
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      status.append(' ', link);
    }
    updateTitle();
  }
  function commit() { renderOptions(); onEdit(); }
  function applyFee() {
    record.booking = onlineFee(seller.value, record, policy) ?? '';
    fee.value = record.booking;
  }
  function applyShipping() {
    record.shipping = delivered.checked && record.year === 2026 ? bookingPlatforms[seller.value]?.shipping ?? '' : '';
    shipping.value = record.shipping;
  }
  seller.addEventListener('change', () => {
    record.seller = seller.value;
    applyFee();
    if (policy?.mobile && policy.sellers.includes(seller.value)) {
      delivered.checked = false;
      record.delivered = false;
    }
    applyShipping();
    commit();
  });
  date.addEventListener('change', () => {
    record.bookedOn = date.value;
    applyFee();
    commit();
  });
  delivered.addEventListener('change', () => {
    record.delivered = delivered.checked;
    applyShipping();
    commit();
  });
  for (const [input, key] of [[fee, 'booking'], [shipping, 'shipping']]) {
    input.addEventListener('input', () => {
      record[key] = priceValue(input.value);
      updateTitle();
      onEdit();
    });
    input.addEventListener('blur', () => { input.value = record[key]; });
  }
  controls.append(field('예매처', seller), dateField, field('예매수수료 (원)', fee), deliveryLabel, shippingField);
  container.replaceChildren(title, controls, status);
  renderOptions();
}

function entry(event) {
  const item = element('li', undefined, 'entry');
  const head = element('div', undefined, 'entry-head');
  const name = element('span', event.name, 'entry-name');
  const amount = element('span', undefined, 'entry-price');
  const record = records[event.id];
  showAmount(amount, record);
  if (shared) {
    head.append(name, amount);
    item.append(head, element('div', [record.year + '년', ticketName(record.ticket)].filter(Boolean).join(' · '), 'shared-detail'));
    const details = expenseLabels
      .filter(([, key]) => typeof record[key] === 'number')
      .map(([label, key]) => label + ' ' + won(record[key]) + (key === 'beer' && record.beerEstimate ? ' 예상' : ''));
    if (record.cups > 0) {
      details.push(record.cups + '잔');
      if (typeof record.beer === 'number') details.push('잔당 ' + won(Math.round(record.beer / record.cups)));
    }
    if (details.length) item.append(element('div', details.join(' · '), 'shared-detail'));
    return item;
  }
  if (event.id === 7) {
    head.append(name, amount);
    const split = element('button', '회차별로 배분');
    split.addEventListener('click', () => {
      byId('split-original').textContent = '기존 티켓값 ' + (record.price === '' ? '미입력' : won(record.price));
      byId('split-seoul').value = '';
      byId('split-incheon').value = '';
      byId('split-error').textContent = '';
      byId('split-dialog').showModal();
    });
    item.append(head, split);
    return item;
  }
  const check = element('input');
  check.type = 'checkbox';
  check.checked = Boolean(record);
  check.setAttribute('aria-label', event.name + ' 다녀옴');
  const label = element('label', undefined, 'check-label');
  const info = element('span');
  info.append(name, element('span', event.place, 'entry-place'));
  label.append(check, info);
  head.append(label, amount);
  item.append(head);
  if (record) item.append(...makeFields(event, record, amount));
  check.addEventListener('change', () => {
    if (check.checked) records[event.id] = { year: defaultYear, ticket: '', price: '' };
    else delete records[event.id];
    save();
    if (onlyVisited && !check.checked) {
      render();
      byId('visited').focus();
      return;
    }
    const replacement = entry(event);
    item.replaceWith(replacement);
    replacement.querySelector('input').focus();
  });
  return item;
}

const eventNameOrder = new Intl.Collator('ko-KR', { numeric: true });
const dateOrder = new Map();

function compareEventNames(a, b) {
  const startsInKorean = /^[가-힣ㄱ-ㅎ]/;
  const languageOrder = Number(startsInKorean.test(b.name)) - Number(startsInKorean.test(a.name));
  return languageOrder || eventNameOrder.compare(a.name, b.name);
}

function sortDate(place) {
  const day = /^(\d{1,2})\/(\d{1,2})\b/.exec(place);
  if (day) return Number(day[1]) * 100 + Number(day[2]);
  const month = /^(\d{1,2})월/.exec(place);
  return month ? Number(month[1]) * 100 + 32 : Infinity;
}

function render() {
  const query = byId('search').value.trim().toLowerCase();
  const period = byId('summary-year').value;
  const visible = events.filter(event => (event.id !== 7 || records[7]) &&
    (!(shared || onlyVisited) || records[event.id] && (shared || period === 'all' || records[event.id].year === Number(period))) &&
    (shared || (event.name + ' ' + event.place).toLowerCase().includes(query)));
  const byDate = byId('sort-order').value === 'date';
  if (!shared) visible.sort((a, b) => {
    if (byDate) {
      const dateA = dateOrder.get(a.id);
      const dateB = dateOrder.get(b.id);
      if (dateA !== dateB) return dateA - dateB;
    }
    return compareEventNames(a, b);
  });
  byId('list').replaceChildren(...visible.map(entry));
  if (!visible.length) {
    const message = query ? '검색 결과가 없습니다.' : onlyVisited && period !== 'all' ? period + '년에 기록한 페스티벌이 없습니다.' : '아직 기록한 페스티벌이 없습니다.';
    byId('list').append(element('li', message, 'empty'));
  }
  updateSummary();
}

function readShared() {
  const token = location.hash.slice('#record='.length);
  if (!/^[a-zA-Z0-9_-]{1,50000}$/.test(token)) throw new Error('Invalid link');
  const bytes = Uint8Array.from(atob(token.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0));
  const decoded = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  const result = normalize(decoded);
  if (!Array.isArray(decoded) || !decoded.length || Object.keys(result).length !== decoded.length) throw new Error('Invalid record');
  return result;
}

function openCurrentView() {
  setNotice('');
  shared = location.hash.startsWith('#record=');
  if (shared) {
    try {
      records = readShared();
    } catch {
      records = {};
      setNotice('공유 링크가 올바르지 않습니다. 보낸 사람에게 링크를 다시 받아 주세요.');
    }
  } else {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
      records = normalize(Object.entries(stored).map(([id, record]) => [id, record?.year, record?.ticket, record?.price, record?.transport, record?.lodging, record?.beer, record?.cups, record?.booking, record?.shipping, record?.beerEstimate, record?.seller, record?.bookedOn, record?.delivered, record?.merch, record?.food]));
    } catch {
      records = {};
      setNotice('이 브라우저의 기록을 불러올 수 없습니다.');
    }
  }
  byId('title').textContent = shared ? '공유된 페스티벌 기록' : '내 페스티벌';
  for (const id of ['editor', 'local-footer', 'share']) byId(id).hidden = shared;
  for (const id of ['shared-heading', 'shared-footer']) byId(id).hidden = !shared;
  byId('year-filter-wrap').hidden = shared;
  render();
}

for (const id of ['all', 'visited']) {
  byId(id).addEventListener('click', () => {
    onlyVisited = id === 'visited';
    byId('all').setAttribute('aria-pressed', String(!onlyVisited));
    byId('visited').setAttribute('aria-pressed', String(onlyVisited));
    render();
  });
}
byId('search').addEventListener('input', render);
byId('sort-order').addEventListener('change', render);
byId('summary-year').addEventListener('change', render);
byId('split-cancel').addEventListener('click', () => byId('split-dialog').close());
byId('split-form').addEventListener('submit', event => {
  event.preventDefault();
  const original = records[7];
  if (!original || shared) return;
  const amounts = [byId('split-seoul').value, byId('split-incheon').value];
  const allocation = amounts.map((amount, index) => [78 + index, priceValue(amount)])
    .filter(([, amount]) => amount !== '');
  const error = byId('split-error');
  if (!allocation.length || allocation.reduce((sum, [, amount]) => sum + amount, 0) !== (original.price || 0)) {
    error.textContent = '입력한 티켓값의 합계가 기존 티켓값과 같아야 합니다.';
    return;
  }
  for (const [id, amount] of allocation) {
    if (records[id]?.year && records[id].year !== original.year) {
      error.textContent = '이미 다른 연도로 저장한 회차가 있습니다. 해당 회차를 확인해 주세요.';
      return;
    }
    if ((records[id]?.price || 0) + amount > 100000000) {
      error.textContent = '회차별 티켓값은 1억 원 이하로 입력해 주세요.';
      return;
    }
  }
  for (const [id, amount] of allocation) {
    const current = records[id] ?? { year: original.year, ticket: '', price: '' };
    current.price = original.price === '' && current.price === '' ? '' : (current.price || 0) + amount;
    if (!current.ticket && prices[id]?.[original.year]?.some(([name]) => original.ticket.endsWith(' ' + name))) {
      current.ticket = prices[id][original.year].find(([name]) => original.ticket.endsWith(' ' + name))[0];
    }
    records[id] = current;
  }
  delete records[7];
  save();
  byId('split-dialog').close();
  render();
  setNotice('기존 티켓값을 회차별 기록으로 옮겼습니다.');
});
byId('reset').addEventListener('click', () => {
  if (Object.keys(records).length && confirm('이 브라우저의 기록을 모두 삭제할까요?')) {
    records = {};
    save();
    render();
  }
});
byId('share').addEventListener('click', () => {
  const period = byId('summary-year').value;
  const rows = events.filter(event => records[event.id] && (period === 'all' || records[event.id].year === Number(period))).map(event => {
    const record = records[event.id];
    return { name: event.name, place: record.year === defaultYear ? event.place : "", year: record.year, estimated: record.beerEstimate, amount: recordTotal(record),
      hasAmount: expenseKeys.some(key => typeof record[key] === 'number') };
  });
  if (rows.length) openShareImage(rows, period === 'all' ? '전체 기간' : period + '년');
});

fetch('data.json').then(response => {
  if (!response.ok) throw new Error('Could not load list');
  return response.json();
}).then(data => {
  events = data;
  for (const event of events) dateOrder.set(event.id, sortDate(event.place));
  byId('all-count').textContent = events.length - 1;
  openCurrentView();
  window.addEventListener('hashchange', openCurrentView);
}).catch(() => {
  byId('list').replaceChildren(element('li', '목록을 불러오지 못했습니다. 새로고침해 주세요.', 'empty'));
});
