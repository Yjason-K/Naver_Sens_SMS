const axios = require("axios");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const NodeCache = require("node-cache");
// const crypto = require("crypto-js");
const CryptoJS = require("crypto-js");
const port = 3005;
const { config } = require("./config.js");

// body parser
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// CORS 설정 - 모두 개방
app.use(cors());

// cache 설정
const myCache = new NodeCache({ stdTTL: 30, checkperiod: 600 }); // cache 설정

// 문자 보내기 api 사용을 위한 header 설정 변수
const date = Date.now().toString();
const uri = config.service_ID;
const secretKey = config.secretKey;
const accessKey = config.accessKey;
const method = "POST";
const space = " ";
const newLine = "\n";
const url = `https://sens.apigw.ntruss.com/sms/v2/services/${uri}/messages`;
const url2 = `/sms/v2/services/${uri}/messages`;

// const hmac = crypto.HmacSHA512(
//   `${method}${space}${url2}${newLine}${date}${newLine}${accessKey}`,
//   crypto.enc.Utf8.parse(secretKey)
// );

// const signature = crypto.enc.Base64.stringify(hmac);

const hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, secretKey);

hmac.update(method);
hmac.update(space);
hmac.update(url2);
hmac.update(newLine);
hmac.update(date);
hmac.update(newLine);
hmac.update(accessKey);

const hash = hmac.finalize();
const signature = hash.toString(CryptoJS.enc.Base64);

//문자 보내기
const send = async (req, res) => {
  const phoneNumber = req.body.phoneNumber;

  // 오류 방지
  myCache.del(phoneNumber);

  // 인증번호 생성
  const verifyCode = Math.floor(Math.random() * (999999 - 100000)) + 100000;

  // 캐시 저장
  myCache.set(phoneNumber, verifyCode.toString());

  try {
    const response = await axios({
      method,
      json: true,
      url,
      headers: {
        "Content-Type": "application/json",
        "x-ncp-iam-access-key": accessKey,
        "x-ncp-apigw-timestamp": date,
        "x-ncp-apigw-signature-v2": signature,
      },
      data: {
        type: "SMS",
        contentType: "COMM",
        countryCode: "82",
        from: `${config.from_phone}`,
        content: `[어서와 한국은 처음이지] 인증번호 [${verifyCode}]를 입력해주세요.`,
        messages: [
          {
            to: `${phoneNumber}`,
          },
        ],
      },
    });
    res.send(response(baseResponse.SMS_SEND_SUCCESS));
  } catch (err) {
    // if (err.res === undefined) {
    //   res.send(response(baseResponse.SMS_SEND_SUCCESS));
    // } else
    // res.send(errResponse(baseResponse.SMS_SEND_FAILURE));
    res.status(400).json({ error: `${err}` });
  }
};

const verify = async function (req, res) {
  const phoneNumber = req.body.phoneNumber;
  const verifyCode = req.body.verifyCode;
  console.log(phoneNumber);
  console.log(verifyCode);

  const CacheData = myCache.get(phoneNumber);
  console.log(CacheData);

  if (!CacheData) {
    return res.send(errResponse(baseResponse.FAILURE_SMS_AUTHENTICATION));
  } else if (CacheData !== verifyCode) {
    return res.send(errResponse(baseResponse.FAILURE_SMS_AUTHENTICATION));
  } else {
    myCache.del(phoneNumber);
    console.log("문자 인증 성공!");
    return res.send(response(baseResponse.SMS_VERIFY_SUCCESS));
  }
};

// 인증번호 문자 보내기
app.post("/app/send", send);
// 문자인증(SENS를 통한) 검증 API
app.post("/app/verify", verify);

// 포트 open
app.listen(port, () => {
  console.log(`${port} 포트에서 express 서버 실행`);
});
