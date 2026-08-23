var input = document.getElementById('username');
var status = document.getElementById('status');

chrome.storage.local.get(['winUsername'], function (r) {
  if (r.winUsername) input.value = r.winUsername;
});

document.getElementById('save').addEventListener('click', function () {
  var v = input.value.trim();
  if (!v) {
    status.textContent = 'กรอก username ก่อนนะ';
    status.style.color = '#ff5a5a';
    return;
  }
  chrome.storage.local.set({ winUsername: v }, function () {
    status.textContent = 'บันทึกแล้ว ✓ — กลับไปที่หน้าเว็บแล้วรีเฟรชได้เลย';
    status.style.color = '#5ef2a4';
    alert('บันทึกสำเร็จ ✓\n\nตั้งค่าเรียบร้อยแล้ว กด OK เพื่อปิดหน้านี้ แล้วไปที่หน้าเว็บ Marvel Snap Deck Builder AI รีเฟรชได้เลย');
    window.close();
  });
});
