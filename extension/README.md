# Marvel Snap Collection Auto-Sync (extension)

ติดตั้ง Chrome/Edge extension เล็กๆ นี้ครั้งเดียว แล้วเปิดหน้าเว็บ [Marvel Snap Deck Builder AI](https://bennett-workspace.github.io/marvelsnap-ai-assistant/marvel-snap-deck-builder.html)
ครั้งต่อไปจะ **ซิงค์คอลเลกชันให้อัตโนมัติทุกครั้งที่เปิดหน้า ไม่ต้องกดอะไรเลย**

## มันทำงานยังไง

Extension อ่านไฟล์ `CollectionState.json` ที่ตัวเกม Marvel Snap เขียนไว้ในเครื่องคุณเองอยู่แล้ว
(path: `%AppData%\LocalLow\Second Dinner\SNAP\Standalone\States\nvprod\CollectionState.json`)
แล้วส่งข้อมูลนั้นเข้าไปในหน้าเว็บโดยตรงผ่าน `postMessage` — **ไม่มี network request ออกจากเครื่องเลย**
โค้ดทั้งหมดสั้นมาก ([background.js](background.js), [content.js](content.js)) อ่านเองได้ภายในไม่กี่นาที

## วิธีติดตั้ง

1. โหลด/clone repo นี้มาไว้ในเครื่อง (ถ้ายังไม่มี)
2. เปิด `chrome://extensions` (หรือ `edge://extensions` ถ้าใช้ Edge)
3. เปิด **Developer mode** (มุมขวาบน)
4. กด **Load unpacked** แล้วเลือกโฟลเดอร์ `extension/` นี้
5. กด **Details** ที่ extension ที่เพิ่งขึ้นมา แล้วเปิด toggle **"Allow access to file URLs"** — ขาดขั้นตอนนี้ไม่ได้ ไม่งั้นอ่านไฟล์ไม่ได้เลย
6. คลิกขวาที่ไอคอน extension (หรือกด **Details → Extension options**) → เปิดหน้า Options
7. พิมพ์ **Windows username** ของคุณ (ชื่อโฟลเดอร์ใน `C:\Users\...`) แล้วกดบันทึก

เท่านี้จบ — เปิดหน้าเว็บแอปแล้วรอสักครู่ จะเห็นสถานะที่มุมขวาบนเปลี่ยนเป็น "✓ Synced" เองอัตโนมัติทุกครั้งที่เข้า

## ความปลอดภัย / ความเป็นส่วนตัว

- อ่านไฟล์ในเครื่องคุณเองเท่านั้น ไม่มีการอัปโหลด/ส่งข้อมูลไปที่ไหนทั้งนั้น
- `host_permissions: "file:///*"` เป็น permission ที่กว้าง (Chrome ไม่มีทางให้ขอสิทธิ์เฉพาะไฟล์เดียวได้) —
  โค้ดในนี้อ่านแค่ path ที่ระบุไว้ตายตัวเท่านั้น แต่แนะนำให้อ่านโค้ดเองก่อนติดตั้ง (สั้นมาก ไม่กี่สิบบรรทัด) เพราะ
  extension ที่ขอสิทธิ์นี้โดยหลักการแล้วสามารถเข้าถึงไฟล์อื่นในเครื่องได้ด้วยถ้าโค้ดถูกเปลี่ยน
- นี่คือเหตุผลที่โค้ดทั้งหมดอยู่ใน public repo นี้แบบเปิดเผย ไม่ได้แจกเป็นไฟล์ .crx ที่มองไม่เห็นโค้ดข้างใน
