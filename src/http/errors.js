'use strict';

class TronHttpError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class UnauthorizedError extends TronHttpError {
  constructor(message = 'Cookie 已過期或導向登入頁。') {
    super(message);
  }
}

class LoginPageChangedError extends TronHttpError {
  constructor(message = '登入頁面結構已更改。') {
    super(message);
  }
}

class LoginRejectedError extends TronHttpError {
  constructor(message = '登入失敗，請檢查帳號或密碼是否正確。') {
    super(message);
  }
}

class UnexpectedResponseError extends TronHttpError {
  constructor(message = '伺服器回傳了非預期的回應。') {
    super(message);
  }
}

module.exports = {
  TronHttpError,
  UnauthorizedError,
  LoginPageChangedError,
  LoginRejectedError,
  UnexpectedResponseError,
};
