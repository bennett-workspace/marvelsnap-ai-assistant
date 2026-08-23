/* อ่านไฟล์ CollectionState.json ของเกม Marvel Snap ตรงๆ จากเครื่อง (file://) แล้วส่งกลับให้
   content script เท่านั้น — ไม่มีการส่งข้อมูลออกจากเครื่องไปที่ไหนเลย ไม่มี network request ใดๆ
   ในไฟล์นี้นอกจาก fetch(file://...) เอง
   ต้องเปิด "Allow access to file URLs" ให้ extension นี้ใน chrome://extensions ก่อน ไม่งั้น fetch จะล้มเหลว
   ต้องตั้งชื่อผู้ใช้ Windows ไว้ในหน้า Options ก่อน (คลิกขวาไอคอน extension > Options) */
function buildPath(username) {
  return (
    'file:///C:/Users/' +
    encodeURIComponent(username) +
    '/AppData/LocalLow/Second%20Dinner/SNAP/Standalone/States/nvprod/CollectionState.json'
  );
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!msg || msg.type !== 'GET_COLLECTION') return false;
  chrome.storage.local.get(['winUsername'], function (r) {
    var username = r.winUsername;
    if (!username) {
      sendResponse({ ok: false, error: 'ยังไม่ได้ตั้งค่า Windows username — คลิกขวาไอคอน extension แล้วเลือก Options' });
      return;
    }
    fetch(buildPath(username))
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (text) {
        sendResponse({ ok: true, text: text });
      })
      .catch(function (e) {
        sendResponse({
          ok: false,
          error:
            'อ่านไฟล์ไม่สำเร็จ (' +
            (e && e.message) +
            ') — เช็คว่า username ถูกต้อง และเปิด "Allow access to file URLs" ให้ extension นี้แล้วหรือยัง',
        });
      });
  });
  return true; /* บอก Chrome ว่าจะ sendResponse แบบ async (ไม่ตอบทันที) */
});
