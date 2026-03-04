Node.js 의 express 프레임워크를 이용 typescript 로 구현한 백엔드 예제

### 기본 흐름

app => route => controller
controller 에서 필요한 manager 파일의 함수를 호출한 결과 값을 응답

디비 접근은 handler 에서 이루어지며 각 핸들러 실행 시 필수 변수 등을 체크
