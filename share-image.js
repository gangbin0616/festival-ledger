'use strict';

const imageDialog = document.getElementById('share-dialog');
const shareCanvas = document.getElementById('share-canvas');
const showPrices = document.getElementById('include-prices');
const downloadImage = document.getElementById('download-image');
const nativeShare = document.getElementById('native-share');
const imageStatus = document.getElementById('copy-status');
const pageSize = 10;
let imageRows = [];
let imagePage = 0;
let imageFile;
let imagePeriod = '전체 기간';

const imageFont = '"Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
const imageWon = amount => amount.toLocaleString('ko-KR') + '원';

function wrapImageText(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const char of text) {
    if (line && ctx.measureText(line + char).width > maxWidth) {
      lines.push(line.trimEnd());
      line = '';
    }
    line += char;
  }
  if (line) lines.push(line.trimEnd());
  return lines;
}

function setImageStatus(message) {
  imageStatus.textContent = message;
  imageStatus.hidden = !message;
}

function renderShareImage() {
  const pageCount = Math.ceil(imageRows.length / pageSize);
  const rows = imageRows.slice(imagePage * pageSize, (imagePage + 1) * pageSize);
  const ctx = shareCanvas.getContext('2d');
  const width = 1080;
  const inset = 66;
  const showAmount = showPrices.checked && imageRows.some(row => row.hasAmount);
  const nameWidth = showAmount ? 645 : 810;
  const displayRows = rows.map(row => {
    ctx.font = '700 35px ' + imageFont;
    const names = wrapImageText(ctx, row.name, nameWidth);
    ctx.font = '400 24px ' + imageFont;
    const details = wrapImageText(ctx, [row.year + '년', row.place].filter(Boolean).join(' · '), nameWidth);
    return { row, names, details, height: 29 + names.length * 44 + details.length * 32 };
  });
  const listHeight = displayRows.reduce((sum, row) => sum + row.height, 0);
  const listTop = showAmount ? 399 : 340;
  shareCanvas.width = width;
  shareCanvas.height = listTop + listHeight + 120;
  ctx.fillStyle = '#f3f4f0';
  ctx.fillRect(0, 0, width, shareCanvas.height);
  ctx.fillStyle = '#292722';
  ctx.fillRect(0, 0, width, 246);

  function text(value, x, y, size, color, weight = 400, alignment = 'left') {
    ctx.font = weight + ' ' + size + 'px ' + imageFont;
    ctx.fillStyle = color;
    ctx.textAlign = alignment;
    ctx.fillText(value, x, y);
  }
  function line(y) {
    ctx.fillStyle = '#c9cbc3';
    ctx.fillRect(inset, y, width - 2 * inset, 2);
  }
  text('페스티벌 장부', inset, 69, 27, '#e2a18a', 700);
  text('내가 다녀온 페스티벌', inset, 162, 63, '#fffdf9', 800);
  text(imagePeriod, inset, 210, 24, '#e2a18a', 700);
  text(imageRows.length + '곳', inset, 312, 55, '#292722', 800);
  if (showAmount) {
    const estimated = imageRows.some(row => row.estimated);
    text(estimated ? '총지출 · 추정 포함' : '총지출', width - inset, 284, 23, '#555a53', 400, 'right');
    text(imageWon(imageRows.reduce((sum, row) => sum + row.amount, 0)), width - inset, 332, 43, '#292722', 800, 'right');
  }
  let y = listTop;
  line(y - 10);
  for (const { row, names, details, height } of displayRows) {
    names.forEach((name, index) => text(name, inset, y + 34 + index * 44, 35, '#292722', 700));
    details.forEach((detail, index) => text(detail, inset, y + names.length * 44 + 22 + index * 32, 24, '#555a53'));
    if (showAmount && row.hasAmount) text(imageWon(row.amount), width - inset, y + 34, 29, '#292722', 700, 'right');
    y += height;
    line(y - 10);
  }
  const host = location.hostname.endsWith('.chatgpt.site') ? location.hostname : '페스티벌 장부';
  text(host, inset, y + 62, 23, '#555a53');
  if (pageCount > 1) text((imagePage + 1) + ' / ' + pageCount, width - inset, y + 62, 23, '#555a53', 700, 'right');
  shareCanvas.setAttribute('aria-label', imagePeriod + ' 기록, 다녀온 페스티벌 ' + imageRows.length + '곳, ' + (imagePage + 1) + '쪽. ' + rows.map(row => row.name).join(', '));

  document.getElementById('share-pages').hidden = pageCount <= 1;
  document.getElementById('share-page').textContent = (imagePage + 1) + ' / ' + pageCount;
  document.getElementById('prev-image').disabled = imagePage === 0;
  document.getElementById('next-image').disabled = imagePage + 1 === pageCount;
  downloadImage.disabled = true;
  nativeShare.hidden = true;
  imageFile = undefined;
  const pageAtRender = imagePage;
  const priceAtRender = showPrices.checked;
  const rowsAtRender = imageRows;
  shareCanvas.toBlob(blob => {
    if (pageAtRender !== imagePage || priceAtRender !== showPrices.checked || rowsAtRender !== imageRows) return;
    if (!blob) {
      setImageStatus('이미지를 만들지 못했습니다. 창을 닫고 다시 열어 주세요.');
      return;
    }
    const filename = '페스티벌-장부' + (pageCount > 1 ? '-' + (imagePage + 1) : '') + '.png';
    imageFile = new File([blob], filename, { type: 'image/png' });
    downloadImage.disabled = false;
    nativeShare.hidden = !(navigator.share && navigator.canShare?.({ files: [imageFile] }));
  }, 'image/png');
}

function openShareImage(rows, period) {
  imageRows = rows;
  imagePeriod = period;
  imagePage = 0;
  showPrices.checked = false;
  setImageStatus('');
  imageDialog.showModal();
  renderShareImage();
}
showPrices.addEventListener('change', renderShareImage);
document.getElementById('prev-image').addEventListener('click', () => { imagePage--; renderShareImage(); });
document.getElementById('next-image').addEventListener('click', () => { imagePage++; renderShareImage(); });
downloadImage.addEventListener('click', () => {
  if (!imageFile) return;
  const url = URL.createObjectURL(imageFile);
  const link = document.createElement('a');
  link.href = url;
  link.download = imageFile.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
nativeShare.addEventListener('click', async () => {
  if (!imageFile) return;
  try {
    await navigator.share({ files: [imageFile] });
  } catch (error) {
    if (error.name !== 'AbortError') setImageStatus('앱으로 공유할 수 없습니다. PNG로 저장해 주세요.');
  }
});
