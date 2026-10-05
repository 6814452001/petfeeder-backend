async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userText = event.message.text.trim();

  // 1. สั่งให้อาหารทันที
  if (userText === 'ให้อาหาร' || userText.toUpperCase() === 'FEED') {
    triggerFeeding('LINE OA');
    return lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: '🐾 จ่ายอาหารเรียบร้อยแล้วครับ!'
    });
  }

  // 2. สั่งตั้งเวลา เช่น พิมพ์ "ตั้งเวลา 08:00"
  if (userText.startsWith('ตั้งเวลา')) {
    const timeRegex = /^ตั้งเวลา\s+([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    const match = userText.match(timeRegex);

    if (match) {
      const newTime = `${match[1].padStart(2, '0')}:${match[2]}`;
      
      // บันทึกลงช่วงเวลาที่ 1 และเปิดใช้งานทุกวัน
      schedules[0].time = newTime;
      schedules[0].enabled = true;
      schedules[0].days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

      return lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: `⏰ ตั้งเวลาให้อาหารรอบแรกเป็น ${newTime} น. (ทุกวัน) เรียบร้อยแล้วครับ!`
      });
    } else {
      return lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: '⚠️ รูปแบบเวลาไม่ถูกต้อง กรุณาพิมพ์ เช่น "ตั้งเวลา 08:30"'
      });
    }
  }

  // ข้อความช่วยเหลือ
  return lineClient.replyMessage(event.replyToken, {
    type: 'text',
    text: '📌 คำสั่งที่ใช้งานได้:\n- พิมพ์ "ให้อาหาร" เพื่อจ่ายอาหารทันที\n- พิมพ์ "ตั้งเวลา HH:MM" (เช่น ตั้งเวลา 08:00)'
  });
}
