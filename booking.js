const bookingPlatforms = {
  melon: { name: '멜론티켓', fee: 2000, source: 'https://ticket.melon.com/customerservice/noticeInform.htm?noticeNo=353' },
  yes24: { name: 'YES24 티켓', fee: 2000, shipping: 3200, source: 'https://m.ticket.yes24.com/MyPage/UserGuideDetail.aspx?type=commission', shippingSource: 'https://m.ticket.yes24.com/MyPage/UserGuideDetail.aspx?type=etc' },
  link: { name: '티켓링크', fee: 2000, source: 'https://www.ticketlink.co.kr/help/notice/58405' },
  nol: { name: 'NOL 티켓', fee: 2000, source: 'https://board.yanolja.com/info/content/index.html?id=1880' },
  moon: { name: '투더문' },
  cm: { name: '29CM' },
  kream: { name: 'KREAM' },
  naver: { name: '네이버 예약' },
  kakao: { name: '카카오톡 예약하기' },
  tix: { name: '틱스코리아' },
  direct: { name: '현장 구매·기타' }
};

const knownBooking = {
  1: { sellers: ['melon'], mobile: true },
  2: { sellers: ['yes24'], mobile: true },
  3: { sellers: ['nol'] },
  4: { sellers: ['nol', 'yes24', 'link', 'naver'], mobile: true },
  5: { sellers: ['nol', 'yes24', 'link'] },
  6: { sellers: ['nol', 'link', 'cm'] },
  8: { sellers: ['melon', 'link', 'yes24'], mobile: true },
  9: { sellers: ['melon', 'moon'] },
  10: { sellers: ['melon'], delivery: '블라인드권은 실물 티켓 배송으로 안내됐습니다.', source: 'https://ticket.melon.com/performance/index.htm?prodId=212555' },
  11: { sellers: ['nol'] },
  12: { sellers: ['yes24', 'nol'] },
  15: { sellers: ['yes24', 'melon', 'nol'] },
  16: { sellers: ['yes24'] },
  19: { sellers: ['yes24'] },
  25: { sellers: ['nol', 'naver'], source: 'https://pmf.co.kr/main' },
  26: { sellers: ['link'] },
  28: { sellers: ['link'] },
  29: { sellers: ['yes24'], mobile: true, source: 'https://police.jj.ac.kr/jj/community/notice01.do?articleNo=526655&mode=view' },
  33: { sellers: ['link'] },
  35: { sellers: ['cm', 'moon'] },
  36: { sellers: ['melon', 'kream'] },
  41: { sellers: ['link'], fee: 2000, source: 'https://www.ticketlink.co.kr/help/notice/65716' },
  42: { sellers: ['link'] },
  46: { sellers: ['yes24'], mobile: true, source: 'https://xmfestivalofficial.imweb.me/faqs' },
  48: { sellers: ['nol'] },
  51: { sellers: ['link'] },
  55: { sellers: ['nol'] },
  57: { sellers: ['nol'] },
  61: { sellers: ['melon', 'naver'] },
  62: { sellers: ['moon'] },
  64: { sellers: ['nol'] },
  65: { sellers: ['nol', 'yes24', 'naver'], mobile: true, source: 'https://mintpaper.co.kr/posts/4697' },
  66: { sellers: ['melon', 'moon'] },
  68: { sellers: ['tix', 'yes24', 'melon', 'nol', 'kakao'] },
  72: { sellers: ['nol', 'yes24', 'link', 'melon', 'naver', 'kakao'], source: 'https://www.swfestival.com/FAQ' },
  75: { sellers: ['link', 'melon', 'nol', 'naver', 'kream'], mobile: true },
  77: { sellers: ['nol'], mobile: true, source: 'https://nol.yanolja.com/ticket/products/26012621' },
  78: { sellers: ['melon'], mobile: true, source: 'https://ticket.melon.com/performance/index.htm?prodId=212916' },
  79: { sellers: ['melon'] },
  81: { sellers: ['nol'], source: 'https://www.sjac.or.kr/base/nrr/performance/read?menuLevel=2&menuNo=77&performanceNo=663' },
  80: { sellers: ['melon'], mobile: true, source: 'https://www.seouljazz.co.kr/bbs/faq.php?fm_id=2' }
};

function bookingPolicy(eventId, record) {
  if (record.year === 2025 && eventId === 80) return { sellers: ['melon'], mobile: true, source: 'https://ticket.melon.com/performance/index.htm?prodId=211080' };
  return record.year === 2026 ? knownBooking[eventId] : undefined;
}

function onlineFee(seller, record, policy) {
  if (policy?.fee !== undefined && policy.sellers.includes(seller)) return policy.fee;
  if (record.year !== 2026 && !(record.year === 2025 && seller === 'melon' && policy?.sellers.includes('melon'))) return undefined;
  if (seller === 'nol') {
    // The relevant date is the booking date, not the festival date.
    if (!record.bookedOn || record.bookedOn === '2026-11-16') return undefined;
    return record.bookedOn >= '2026-11-16' ? 3000 : 2000;
  }
  return bookingPlatforms[seller]?.fee;
}
