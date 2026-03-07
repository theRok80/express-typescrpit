export default {
  user: {
    main: 'user',
  },
  payment: {
    log: {
      webhook: 'logWebhook',
      payment: 'logPayment',
    },
    work: {
      webhook: 'workWebhook', // 웹훅 처리 중 오류 발생 시 재처리를 위한 작업 테이블
    },
    orderIdWarehouse: 'orderIdWarehouse',
    product: 'product',
  },
  sign: {
    log: 'logSign',
  },
};
