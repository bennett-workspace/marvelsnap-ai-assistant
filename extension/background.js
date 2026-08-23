/* อ่านไฟล์ CollectionState.json ของเกม Marvel Snap ตรงๆ จากเครื่อง (file://) แล้วส่งกลับให้
   content script เท่านั้น — ไม่มีการส่งข้อมูลออกจากเครื่องไปที่ไหนเลย

   หมายเหตุสำคัญ: Manifest V3 service worker (ไฟล์นี้) เรียก fetch('file://...') ตรงๆ ไม่ได้เลย —
   เป็นข้อจำกัดของ Chromium เอง (fetch() ไม่รองรับ scheme file: ใน service worker context ไม่ว่า
   จะเปิด permission อะไรก็ตาม ต่างจาก MV2 background page เดิมที่ใช้ XMLHttpRequest อ่านได้)
   ทางแก้คือเปิดไฟล์ในแท็บพื้นหลัง (ไม่ focus) แล้วดึงเนื้อหาผ่าน chrome.scripting.executeScript
   แทน เพราะหน้าเว็บจริงๆ (ไม่ใช่ service worker) ยังอ่าน file:// ได้ตามปกติ
   ต้องเปิด "Allow access to file URLs" ให้ extension นี้ใน chrome://extensions ก่อน ไม่งั้นแท็บจะเปิดไม่ติด
   ต้องตั้งชื่อผู้ใช้ Windows ไว้ในหน้า Options ก่อน (คลิกขวาไอคอน extension > Options) */
function buildPath(username) {
  return (
    'file:///C:/Users/' +
    encodeURIComponent(username) +
    '/AppData/LocalLow/Second%20Dinner/SNAP/Standalone/States/nvprod/CollectionState.json'
  );
}

function readFileViaHiddenTab(url) {
  return new Promise(function (resolve, reject) {
    chrome.tabs.create({ url: url, active: false }, function (tab) {
      if (chrome.runtime.lastError || !tab) {
        reject(new Error((chrome.runtime.lastError && chrome.runtime.lastError.message) || 'เปิดแท็บไม่สำเร็จ'));
        return;
      }
      var done = false;
      var timeoutId = setTimeout(function () {
        if (done) return;
        done = true;
        chrome.tabs.onUpdated.removeListener(onUpdated);
        chrome.tabs.remove(tab.id).catch(function () {});
        reject(new Error('เปิดไฟล์นานเกินไป (timeout) — เช็คว่าไฟล์มีอยู่จริงที่ path นี้ไหม'));
      }, 6000);

      function onUpdated(tabId, info) {
        if (tabId !== tab.id || info.status !== 'complete' || done) return;
        done = true;
        clearTimeout(timeoutId);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        chrome.scripting.executeScript(
          {
            target: { tabId: tab.id },
            func: function () {
              return document.body ? document.body.innerText : '';
            },
          },
          function (results) {
            chrome.tabs.remove(tab.id).catch(function () {});
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            var text = results && results[0] && results[0].result;
            if (!text) {
              reject(new Error('ไฟล์ว่างเปล่าหรือไม่พบไฟล์ — เช็คว่า username ถูกต้องและเคยเปิดเกมบนเครื่องนี้แล้ว'));
              return;
            }
            resolve(text);
          }
        );
      }
      chrome.tabs.onUpdated.addListener(onUpdated);
    });
  });
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!msg || msg.type !== 'GET_COLLECTION') return false;
  chrome.storage.local.get(['winUsername'], function (r) {
    var username = r.winUsername;
    if (!username) {
      sendResponse({ ok: false, error: 'ยังไม่ได้ตั้งค่า Windows username — คลิกขวาไอคอน extension แล้วเลือก Options' });
      return;
    }
    readFileViaHiddenTab(buildPath(username))
      .then(function (text) {
        sendResponse({ ok: true, text: text });
      })
      .catch(function (e) {
        sendResponse({
          ok: false,
          error: 'อ่านไฟล์ไม่สำเร็จ: ' + (e && e.message) + ' — เช็คว่าเปิด "Allow access to file URLs" ให้ extension นี้แล้วหรือยัง',
        });
      });
  });
  return true; /* บอก Chrome ว่าจะ sendResponse แบบ async (ไม่ตอบทันที) */
});
