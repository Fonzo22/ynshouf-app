
// ── AI ──
function buildPrompt() {
  return 'אתה פקח אכיפה סביבתית ביחידת ינשו"פ. כתוב מהות אירוע לדוח רשמי בעברית תקנית.\n' +
    'פרטים:\n' +
    'פקח: ' + $('inspName').value + ' | מס׳ ' + $('inspNum').value + '\n' +
    'תאריך: ' + $('iDate').value + ' שעה: ' + $('iTime').value + '\n' +
    'סוג: ' + $('iType').value + '\n' +
    'מיקום: ' + $('iLoc').value + '\n' +
    'לוחית: ' + $('vPlate').value + ' | רכב: ' + $('vType').value + '\n' +
    'בעלים: ' + $('vOwner').value + '\n' +
    'פסולת: ' + $('vWaste').value + '\n' +
    'תיאור גולמי: ' + $('iDesc').value + '\n\n' +
    'כתוב 3-5 משפטים רשמיים בגוף ראשון רבים. ללא כותרות.';
}

async function runAI() {
  var btn = $('btnAI');
  var status = $('aiStatus');
  btn.classList.add('loading');
  btn.textContent = '...';
  status.textContent = 'מייצר תיאור...';
  try {
    var resp = await fetch(WORKER + '/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: buildPrompt() })
    });
    var data = await resp.json();
    var text = data.text || data.content || data.result || '';
    if (text) {
      $('iDesc').value = text;
      status.textContent = '✓ נוצר על ידי AI';
      upProg();
    } else {
      status.textContent = 'לא התקבלה תשובה';
    }
  } catch(e) {
    status.textContent = 'שגיאה: ' + e.message;
    toast('שגיאה בחיבור ל-AI', 'err');
  }
  btn.classList.remove('loading');
  btn.textContent = '✦ AI';
}

async function runAIFix() {
  var fix = $('aiFixText').value.trim();
  var current = $('iDesc').value.trim();
  if (!fix || !current) { toast('מלא תיאור והוראת תיקון', 'warn'); return; }
  var status = $('aiStatus');
  status.textContent = 'מתקן...';
  try {
    var prompt = 'להלן מהות אירוע קיים:\n"' + current + '"\n\nהוראת עדכון: ' + fix + '\n\nכתוב מחדש את המהות עם השינוי המבוקש. אותו סגנון רשמי. ללא כותרות.';
    var resp = await fetch(WORKER + '/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt })
    });
    var data = await resp.json();
    var text = data.text || data.content || data.result || '';
    if (text) {
      $('iDesc').value = text;
      $('aiFixText').value = '';
      status.textContent = '✓ תוקן';
      upProg();
    }
  } catch(e) {
    status.textContent = 'שגיאה בתיקון';
  }
}

// סוף קובץ
