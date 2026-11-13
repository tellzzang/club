/**
 * 2026 운양고등학교 동아리 발표회(청운제)
 * [학생용 1차 투표 폼] + [심사위원용 2차 현장 평가 폼] + [통계 자동 집계 대시보드 시트] 원클릭 생성 스크립트
 *
 * 사용 방법:
 * 1. https://script.new 접속 후 이 코드 전체를 붙여넣습니다.
 * 2. 상단 [저장] 후 [실행] 버튼을 누릅니다 (최초 1회 Google 권한 허용 클릭).
 * 3. 하단 [실행 로그]에 출력된 === 웹앱 연동용 설정값 === JSON을 복사해서 안티그래비티 채팅창에 붙여넣어 주세요!
 */

function setupClubFestivalFormsAndDashboard() {
  var CLUBS = [
    "시퀀스", "밴드부 (UY)", "러쉬온미", "피에스 (P.S)", "베이킹 메이킹",
    "알고리즘", "소나기 (방송부)", "도서관 사람들", "마케팅 허브", "다각도",
    "아트시그널", "유아트", "아스클", "화생방", "스파크",
    "멘날바", "소비의 정석", "경제·경영 위키", "애그부", "소프라테스",
    "프리즘", "또래상담부", "스카이", "교집합", "아뜰리에"
  ];

  var CLUB_TYPES = [
    "공연형", "공연형", "공연형", "체육활동형", "체험/실습형",
    "체험/실습형", "방탈출/추리형", "체험/실습형", "방탈출/추리형", "방탈출/추리형",
    "문화예술형", "방탈출/추리형", "체험/실습형", "체험/실습형", "체험/실습형",
    "체험/실습형", "체험/실습형", "체험/실습형", "문화예술형", "체험/실습형",
    "체험/실습형", "문화예술형", "체험/실습형", "체험/실습형", "체험/실습형"
  ];

  // 1. 통합 통계 대시보드 스프레드시트 생성
  var ss = SpreadsheetApp.create("2026 운양고 동아리 발표회 평가 및 통계 대시보드");
  var ssId = ss.getId();
  var defaultSheet = ss.getSheets()[0];
  defaultSheet.setName("안내");

  // ---------------------------------------------------------
  // 2. [학생용] 1차 온라인 투표 폼 생성
  // ---------------------------------------------------------
  var studentForm = FormApp.create("[학생용] 2026 운양고 동아리 발표회 우수동아리 투표");
  studentForm.setDescription(
    "2026 운양고 동아리 발표회(청운제) 1차 학생 평가 설문입니다.\n" +
    "가장 인상 깊었던 우수 동아리 5개를 선택해 주세요! (학부모회 특별 부스는 투표 대상 제외)"
  );
  studentForm.setAllowResponseEdits(false);
  studentForm.setConfirmationMessage("🎉 소중한 투표가 완료되었습니다! 즐거운 청운제 되세요.");

  var qStudentId = studentForm.addTextItem()
    .setTitle("학번")
    .setHelpText("예: 20101 (5자리 숫자 입력)")
    .setRequired(true);
  var idValidation = FormApp.createTextValidation()
    .requireTextMatchesPattern("^[1-3][0-1][0-9][0-3][0-9]$")
    .setHelpText("5자리 학번을 정확히 입력해 주세요. (예: 10101, 20512)")
    .build();
  qStudentId.setValidation(idValidation);

  var qStudentName = studentForm.addTextItem()
    .setTitle("이름")
    .setRequired(true);

  var qClubs = studentForm.addCheckboxItem()
    .setTitle("가장 인상 깊었던 우수 동아리 5개 선택")
    .setHelpText("정확히 5개의 동아리를 선택해 주세요.")
    .setChoiceValues(CLUBS)
    .setRequired(true);
  var cbValidation = FormApp.createCheckboxValidation()
    .requireSelectExactly(5)
    .setHelpText("우수 동아리는 반드시 5개를 선택해야 합니다.")
    .build();
  qClubs.setValidation(cbValidation);

  studentForm.setDestination(FormApp.DestinationType.SPREADSHEET, ssId);

  // 학생용 entry ID 자동 추출
  var sResp = studentForm.createResponse();
  sResp.withItemResponse(qStudentId.createResponse("20101"));
  sResp.withItemResponse(qStudentName.createResponse("홍길동"));
  sResp.withItemResponse(qClubs.createResponse([CLUBS[0]]));
  var sPrefill = sResp.toPrefilledUrl();
  var sEntries = extractEntries_(sPrefill);

  // ---------------------------------------------------------
  // 3. [심사위원용] 2차 미담당교사 현장 평가 폼 생성
  // ---------------------------------------------------------
  var judgeForm = FormApp.create("[심사위원용] 2026 운양고 동아리 발표회 2차 현장 평가");
  judgeForm.setDescription(
    "동아리 미담당교사 심사위원 전용 2차 현장 평가표입니다.\n" +
    "각 항목당 20점 만점(총 100점)으로 평가해 주세요."
  );
  judgeForm.setConfirmationMessage("✅ 현장 심사 점수가 정상적으로 기록되었습니다. 수고 많으셨습니다!");

  var qJudgeName = judgeForm.addTextItem()
    .setTitle("심사위원 성함")
    .setRequired(true);

  var qJudgeClub = judgeForm.addListItem()
    .setTitle("평가 대상 동아리")
    .setChoiceValues(CLUBS)
    .setRequired(true);

  var scoreValidation = FormApp.createTextValidation()
    .requireWholeNumberBetween(0, 20)
    .setHelpText("0에서 20 사이의 정수를 입력해 주세요.")
    .build();

  var qRel = judgeForm.addTextItem().setTitle("관련성 (20점 만점)").setRequired(true).setValidation(scoreValidation);
  var qCom = judgeForm.addTextItem().setTitle("완성도 (20점 만점)").setRequired(true).setValidation(scoreValidation);
  var qPar = judgeForm.addTextItem().setTitle("참여도 (20점 만점)").setRequired(true).setValidation(scoreValidation);
  var qSus = judgeForm.addTextItem().setTitle("지속성 (20점 만점)").setRequired(true).setValidation(scoreValidation);
  var qRes = judgeForm.addTextItem().setTitle("호응도 (20점 만점)").setRequired(true).setValidation(scoreValidation);
  var qMemo = judgeForm.addParagraphTextItem().setTitle("심사 의견 (선택)").setRequired(false);

  judgeForm.setDestination(FormApp.DestinationType.SPREADSHEET, ssId);

  // 심사위원용 entry ID 자동 추출
  var jResp = judgeForm.createResponse();
  jResp.withItemResponse(qJudgeName.createResponse("김운양"));
  jResp.withItemResponse(qJudgeClub.createResponse(CLUBS[0]));
  jResp.withItemResponse(qRel.createResponse("20"));
  jResp.withItemResponse(qCom.createResponse("20"));
  jResp.withItemResponse(qPar.createResponse("20"));
  jResp.withItemResponse(qSus.createResponse("20"));
  jResp.withItemResponse(qRes.createResponse("20"));
  jResp.withItemResponse(qMemo.createResponse("우수함"));
  var jPrefill = jResp.toPrefilledUrl();
  var jEntries = extractEntries_(jPrefill);

  SpreadsheetApp.flush();
  Utilities.sleep(1500);

  // 연결된 응답 시트 이름 찾기 및 정리
  var sheets = ss.getSheets();
  var studentRawSheetName = "";
  var judgeRawSheetName = "";
  for (var i = 0; i < sheets.length; i++) {
    var sh = sheets[i];
    var header = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0].join("|");
    if (header.indexOf("학번") !== -1 && header.indexOf("우수 동아리") !== -1) {
      sh.setName("학생투표_원본");
      studentRawSheetName = "학생투표_원본";
    } else if (header.indexOf("심사위원 성함") !== -1 && header.indexOf("평가 대상 동아리") !== -1) {
      sh.setName("교사심사_원본");
      judgeRawSheetName = "교사심사_원본";
    }
  }
  if (!studentRawSheetName) studentRawSheetName = "학생투표_원본";
  if (!judgeRawSheetName) judgeRawSheetName = "교사심사_원본";

  // ---------------------------------------------------------
  // 4. [학생투표_중복제거] 시트 생성 (동일 학번 최신 1건만 유효 인정)
  // ---------------------------------------------------------
  var dedupSheet = ss.insertSheet("학생투표_중복제거");
  dedupSheet.getRange("A1:D1").setValues([["타임스탬프", "학번", "이름", "선택 동아리 (5개)"]])
    .setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold");
  dedupSheet.getRange("A2").setFormula(
    '=IFERROR(SORTN(SORT(FILTER(\'' + studentRawSheetName + '\'!A2:D, \'' + studentRawSheetName + '\'!B2:B<>""), 1, FALSE), 9^9, 2, 2, TRUE), {"","","",""})'
  );

  // ---------------------------------------------------------
  // 5. [동아리별_최종통계] 대시보드 시트 생성
  // ---------------------------------------------------------
  var statsSheet = ss.insertSheet("동아리별_최종통계");
  var headers = [[
    "연번", "동아리명", "발표유형",
    "학생 유효득표", "학생 득표율", "학생 순위",
    "심사위원 수", "관련성(20)", "완성도(20)", "참여도(20)", "지속성(20)", "호응도(20)",
    "교사평가 총점(100)", "교사 순위", "최종 참고 순위"
  ]];
  statsSheet.getRange("A1:O1").setValues(headers)
    .setBackground("#312e81").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");

  var rows = [];
  for (var idx = 0; idx < CLUBS.length; idx++) {
    var r = idx + 2;
    var clubName = CLUBS[idx];
    rows.push([
      idx + 1,
      clubName,
      CLUB_TYPES[idx],
      '=ARRAYFORMULA(SUM(IF(ISNUMBER(SEARCH(", "&B' + r + '&", ", ", "&\'학생투표_중복제거\'!$D$2:$D&", ")), 1, 0)))',
      '=IFERROR(D' + r + '/SUM($D$2:$D$26), 0)',
      '=RANK(D' + r + ', $D$2:$D$26, 0)',
      '=COUNTIF(\'' + judgeRawSheetName + '\'!$C$2:$C, B' + r + ')',
      '=IFERROR(AVERAGEIF(\'' + judgeRawSheetName + '\'!$C$2:$C, B' + r + ', \'' + judgeRawSheetName + '\'!$D$2:$D), 0)',
      '=IFERROR(AVERAGEIF(\'' + judgeRawSheetName + '\'!$C$2:$C, B' + r + ', \'' + judgeRawSheetName + '\'!$E$2:$E), 0)',
      '=IFERROR(AVERAGEIF(\'' + judgeRawSheetName + '\'!$C$2:$C, B' + r + ', \'' + judgeRawSheetName + '\'!$F$2:$F), 0)',
      '=IFERROR(AVERAGEIF(\'' + judgeRawSheetName + '\'!$C$2:$C, B' + r + ', \'' + judgeRawSheetName + '\'!$G$2:$G), 0)',
      '=IFERROR(AVERAGEIF(\'' + judgeRawSheetName + '\'!$C$2:$C, B' + r + ', \'' + judgeRawSheetName + '\'!$H$2:$H), 0)',
      '=SUM(H' + r + ':L' + r + ')',
      '=IF(M' + r + '=0, "-", RANK(M' + r + ', $M$2:$M$26, 0))',
      '=IF(F' + r + '<=5, "★ 학생 TOP5 ("&F' + r + '&"위)", "")'
    ]);
  }
  statsSheet.getRange(2, 1, rows.length, 15).setValues(rows);
  statsSheet.getRange("E2:E26").setNumberFormat("0.0%");
  statsSheet.getRange("H2:M26").setNumberFormat("0.0");
  statsSheet.setFrozenRows(1);
  statsSheet.autoResizeColumns(1, 15);

  // ---------------------------------------------------------
  // 6. [학년_반별_참여현황] 시트 생성
  // ---------------------------------------------------------
  var classSheet = ss.insertSheet("학년_반별_참여현황");
  classSheet.getRange("A1:D1").setValues([["학년", "반", "학번코드", "투표 참여 인원"]])
    .setBackground("#065f46").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
  var classRows = [];
  for (var g = 1; g <= 3; g++) {
    for (var c = 1; c <= 10; c++) {
      var code = String(g) + (c < 10 ? "0" + c : String(c));
      var cr = classRows.length + 2;
      classRows.push([
        g + "학년",
        c + "반",
        code,
        '=ARRAYFORMULA(SUM(IF(LEFT(\'학생투표_중복제거\'!$B$2:$B, 3)=TEXT(C' + cr + ', "000"), 1, 0)))'
      ]);
    }
  }
  classSheet.getRange(2, 1, classRows.length, 4).setValues(classRows);
  classSheet.getRange("C2:C31").setNumberFormat("@");
  classSheet.getRange("F1:G4").setValues([
    ["학년별 요약", "참여 인원"],
    ["1학년 총계", '=SUM(D2:D11)'],
    ["2학년 총계", '=SUM(D12:D21)'],
    ["3학년 총계", '=SUM(D22:D31)']
  ]);
  classSheet.getRange("F1:G1").setBackground("#065f46").setFontColor("#ffffff").setFontWeight("bold");
  classSheet.autoResizeColumns(1, 7);

  // 안내 시트 정리
  defaultSheet.getRange("A1:B7").setValues([
    ["항목", "링크 / 설명"],
    ["통계 대시보드 시트", ss.getUrl()],
    ["학생용 구글 폼 (응답용)", studentForm.getPublishedUrl()],
    ["학생용 구글 폼 (편집용)", studentForm.getEditUrl()],
    ["심사위원용 구글 폼 (응답용)", judgeForm.getPublishedUrl()],
    ["심사위원용 구글 폼 (편집용)", judgeForm.getEditUrl()],
    ["팁", "학생용 폼 편집 화면 [설정] > [응답] > [응답 1회로 제한]을 켜시면 구글 계정 기준 중복 투표도 원천 차단됩니다."]
  ]);
  defaultSheet.autoResizeColumns(1, 2);

  // ---------------------------------------------------------
  // 7. 웹앱 연동용 JSON 설정 출력
  // ---------------------------------------------------------
  var configOutput = {
    spreadsheetUrl: ss.getUrl(),
    studentFormUrl: studentForm.getPublishedUrl(),
    studentEntries: {
      studentId: sEntries[0] || "",
      studentName: sEntries[1] || "",
      clubs: sEntries[2] || ""
    },
    judgeFormUrl: judgeForm.getPublishedUrl(),
    judgeEntries: {
      judgeName: jEntries[0] || "",
      clubName: jEntries[1] || "",
      relevance: jEntries[2] || "",
      completeness: jEntries[3] || "",
      participation: jEntries[4] || "",
      sustainability: jEntries[5] || "",
      responsiveness: jEntries[6] || "",
      memo: jEntries[7] || ""
    }
  };

  Logger.log("====================================================");
  Logger.log("✅ 생성 완료! 아래 JSON 전체를 복사해서 안티그래비티에 전달해 주세요:");
  Logger.log(JSON.stringify(configOutput, null, 2));
  Logger.log("====================================================");
}

function extractEntries_(prefilledUrl) {
  var matches = [];
  var re = /entry\.(\d+)/g;
  var m;
  while ((m = re.exec(prefilledUrl)) !== null) {
    var key = "entry." + m[1];
    if (matches.indexOf(key) === -1) {
      matches.push(key);
    }
  }
  return matches;
}
