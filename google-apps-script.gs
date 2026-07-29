/**
 * 강부장부동산 - 매도/매수 의뢰 저장 스크립트
 *
 * [설정 방법]
 * 1. Google 스프레드시트 새로 만들기
 * 2. 확장 프로그램 > Apps Script
 * 3. 이 파일 내용 전체 붙여넣기
 * 4. 아래 NOTIFY_EMAIL을 본인 메일로 수정
 * 5. 배포 > 새 배포 > 유형: 웹 앱
 *    - 실행 계정: 나
 *    - 액세스: 모든 사용자
 * 6. 생성된 URL을 script.js의 INQUIRY_SHEET_URL에 입력
 */

var NOTIFY_EMAIL = 'jbbb1111@naver.com';

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var p = e.parameter || {};
  var submittedAt = p['접수시간'] || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
  var name = p['이름'] || '';
  var phone = p['연락처'] || '';
  var type = p['의뢰유형'] || '';
  var message = p['문의 내용'] || '';

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['접수시간', '이름', '연락처', '의뢰유형', '문의 내용']);
  }

  sheet.appendRow([submittedAt, name, phone, type, message]);

  if (NOTIFY_EMAIL) {
    var body =
      '접수시간: ' + submittedAt + '\n' +
      '이름: ' + name + '\n' +
      '연락처: ' + phone + '\n' +
      '의뢰유형: ' + type + '\n' +
      '문의 내용: ' + message;

    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: '[강부장부동산] 매도/매수 의뢰 - ' + name,
      body: body
    });
  }

  return ContentService
    .createTextOutput('ok')
    .setMimeType(ContentService.MimeType.TEXT);
}
