/* สะพานเชื่อมระหว่าง background script (มีสิทธิ์อ่าน file://) กับหน้าเว็บแอป (ไม่มีสิทธิ์นั้น)
   ใช้ window.postMessage เพราะ content script กับ JS ของหน้าเว็บอยู่คนละ "world" กัน
   เข้าถึงตัวแปร JS ของกันและกันตรงๆ ไม่ได้ ต้องส่งผ่านข้อความเท่านั้น */
function requestAndRelay() {
  chrome.runtime.sendMessage({ type: 'GET_COLLECTION' }, function (resp) {
    if (chrome.runtime.lastError) {
      window.postMessage(
        { source: 'marvelsnap-sync-ext', ok: false, error: chrome.runtime.lastError.message },
        '*'
      );
      return;
    }
    if (resp && resp.ok) {
      window.postMessage({ source: 'marvelsnap-sync-ext', ok: true, text: resp.text }, '*');
    } else {
      window.postMessage(
        { source: 'marvelsnap-sync-ext', ok: false, error: resp && resp.error },
        '*'
      );
    }
  });
}

requestAndRelay(); /* ยิงอัตโนมัติทันทีที่โหลดหน้าเว็บ — นี่คือส่วนที่ทำให้ "ไม่ต้องกดอะไรเลย" */

window.addEventListener('message', function (ev) {
  if (ev.source !== window) return;
  if (ev.data && ev.data.type === 'marvelsnap-request-sync') requestAndRelay();
});
