// Date utility helpers used across the app
export function formatUiDate(date) {
  try {
    const d = new Date(date);
    if (isNaN(d)) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dd = String(d.getDate()).padStart(2, '0');
    const mmm = months[d.getMonth()];
    const yyyy = String(d.getFullYear());
    return `${dd}-${mmm}-${yyyy}`;
  } catch (e) {
    return '';
  }
}

// Convert UI date ("dd-Mmm-yyyy" or Date or parseable string) to API date "yyyy-MM-dd"
export function uiDateToApiDate(uiDate) {
  if (!uiDate && uiDate !== 0) return null;
  // If already a Date object
  if (uiDate instanceof Date && !isNaN(uiDate)) {
    const y = uiDate.getFullYear();
    const m = String(uiDate.getMonth() + 1).padStart(2, '0');
    const d = String(uiDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const s = String(uiDate).trim();
  // Accept 'dd-Mmm-yyyy' (e.g. '18-Nov-2025')
  const parts = s.split('-');
  if (parts.length === 3) {
    const [dd, mmm, yyyy] = parts;
    const months = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
    const mm = months[mmm] || mmm;
    const mmPad = String(mm).padStart(2, '0');
    const ddPad = String(dd).padStart(2, '0');
    let yyyyNorm = yyyy;
    if (yyyy.length === 2) yyyyNorm = '20' + yyyy;
    return `${yyyyNorm}-${mmPad}-${ddPad}`;
  }

  // Fallback: try parsing with Date
  const parsed = new Date(s);
  if (!isNaN(parsed)) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}

export default {
  formatUiDate,
  uiDateToApiDate,
};
